import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { uploadBusinessAdImages } from '/js/imagekit-upload.js';

// 전역 변수
let currentUser = null;
let adId = null;
let currentAd = null;
let regionData = {};
let cityData = {};
let quill = null;
let previewImages = new Map(); // base64 -> File 객체 매핑

// DOM 요소
const form = document.getElementById('ad-edit-form');
const authorInput = document.getElementById('author');
const regionSelect = document.getElementById('region');
const citySelect = document.getElementById('city');
const businessTypeSelect = document.getElementById('business-type');
const contentInput = document.getElementById('content');

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // URL에서 광고 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    adId = urlParams.get('id');
    
    if (!adId) {
        alert('잘못된 접근입니다.');
        window.location.href = '/ad-posting/ad-management.html';
        return;
    }
    
    // Quill 에디터 초기화
    initializeQuillEditor();
    
    // 인증 상태 확인
    checkAuth();
    
    // 데이터 로드
    await loadRegionData();
    await loadBusinessTypes();
    
    // 이벤트 리스너 설정
    setupEventListeners();
});

// Quill 에디터 초기화
function initializeQuillEditor() {
    quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean']
            ]
        },
        placeholder: '광고 상세 내용을 입력하세요...'
    });
    
    // 에디터 내용 변경 시 hidden input 업데이트
    quill.on('text-change', function() {
        contentInput.value = quill.root.innerHTML;
    });
    
    // 이미지 핸들러 커스터마이징
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', selectLocalImage);
}

// 로컬 이미지 선택
function selectLocalImage() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    
    input.onchange = () => {
        const file = input.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                const range = quill.getSelection();
                
                // 에디터에 미리보기 이미지 삽입
                quill.insertEmbed(range.index, 'image', base64);
                
                // base64와 파일 객체 매핑 저장
                previewImages.set(base64, file);
                
                // 미리보기 표시를 위한 data 속성 추가
                setTimeout(() => {
                    const img = quill.root.querySelector(`img[src="${base64}"]`);
                    if (img) {
                        img.setAttribute('data-preview', 'true');
                    }
                }, 100);
            };
            reader.readAsDataURL(file);
        }
    };
}

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // 광고 데이터 로드
            await loadAdData();
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
        }
    });
}

// 광고 데이터 로드
async function loadAdData() {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            alert('광고를 찾을 수 없습니다.');
            window.location.href = '/ad-posting/ad-management.html';
            return;
        }
        
        currentAd = snapshot.val();
        
        // 권한 확인
        if (currentAd.authorId !== currentUser.uid) {
            alert('수정 권한이 없습니다.');
            window.location.href = '/ad-posting/ad-management.html';
            return;
        }
        
        // 폼에 데이터 채우기
        fillFormData();
        
    } catch (error) {
        console.error('광고 데이터 로드 실패:', error);
        alert('광고 데이터를 불러오는데 실패했습니다.');
    }
}

// 폼에 데이터 채우기
function fillFormData() {
    // 기본 정보
    document.getElementById('title').value = currentAd.title || '';
    authorInput.value = currentAd.author || '';
    
    // Quill 에디터에 내용 설정
    if (currentAd.content) {
        quill.root.innerHTML = currentAd.content;
        contentInput.value = currentAd.content;
    }
    
    // 연락처 정보
    document.getElementById('phone').value = currentAd.phone || '';
    document.getElementById('kakao').value = currentAd.kakao || '';
    document.getElementById('telegram').value = currentAd.telegram || '';
    
    // 업종 선택
    if (currentAd.businessType) {
        businessTypeSelect.value = currentAd.businessType;
    }
    
    // 지역 선택
    if (currentAd.region) {
        regionSelect.value = currentAd.region;
        updateCityOptions();
        
        // 도시 선택
        setTimeout(() => {
            if (currentAd.city) {
                citySelect.value = currentAd.city;
            }
        }, 100);
    }
}

// 지역 데이터 로드
async function loadRegionData() {
    try {
        // region1.json 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        // region2.json 로드
        const region2Response = await fetch('/data/region2.json');
        cityData = await region2Response.json();
        
        // 지역 선택 옵션 추가
        region1Data.regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.name;  // code 대신 name을 value로 사용
            option.textContent = region.name;
            regionSelect.appendChild(option);
        });
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        // 업종 코드 매핑 저장
        const businessTypes = {};
        data.businessTypes.forEach(type => {
            businessTypes[type.name] = type.code;
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            businessTypeSelect.appendChild(option);
        });
        
        // 전역으로 사용할 수 있도록 window 객체에 저장
        window.businessTypes = businessTypes;
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 지역 선택 변경
    regionSelect.addEventListener('change', updateCityOptions);
    
    // 폼 제출
    form.addEventListener('submit', handleSubmit);
    
    // 취소 버튼
    document.querySelector('.btn-cancel').addEventListener('click', () => {
        if (confirm('수정을 취소하시겠습니까?')) {
            window.location.href = '/ad-posting/ad-management.html';
        }
    });
}

// 도시 옵션 업데이트
function updateCityOptions() {
    const selectedRegion = regionSelect.value;
    
    // 도시 선택 초기화
    citySelect.innerHTML = '<option value="">도시를 선택하세요</option>';
    
    if (selectedRegion) {
        // region1.json에서 선택된 지역의 code 찾기
        fetch('/data/region1.json')
            .then(response => response.json())
            .then(data => {
                const region = data.regions.find(r => r.name === selectedRegion);
                if (region && cityData[region.code]) {
                    cityData[region.code].forEach(city => {
                        const option = document.createElement('option');
                        option.value = city;
                        option.textContent = city;
                        citySelect.appendChild(option);
                    });
                }
            });
    }
}

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = document.querySelector('.btn-submit');
    submitButton.disabled = true;
    submitButton.textContent = '수정 중...';
    
    try {
        // 에디터 내용 가져오기
        let editorContent = quill.root.innerHTML;
        
        // 미리보기 이미지들을 실제 URL로 교체
        const uploadedImages = [];
        
        // 모든 이미지 태그 찾기
        const imgElements = quill.root.querySelectorAll('img');
        const imagesToUpload = [];
        
        imgElements.forEach(img => {
            const src = img.src;
            if (src.startsWith('data:') && previewImages.has(src)) {
                imagesToUpload.push({
                    element: img,
                    file: previewImages.get(src),
                    base64: src
                });
            } else if (src.startsWith('http')) {
                // 기존 이미지는 그대로 유지
                uploadedImages.push(src);
            }
        });
        
        // 새 이미지들을 ImageKit에 업로드
        if (imagesToUpload.length > 0) {
            const files = imagesToUpload.map(item => item.file);
            const imageData = await uploadBusinessAdImages(files, currentUser.uid);
            
            // 업로드된 URL들
            const urls = [imageData.thumbnail, ...imageData.details].filter(url => url);
            
            // 에디터 내용에서 base64를 실제 URL로 교체
            imagesToUpload.forEach((item, index) => {
                if (urls[index]) {
                    editorContent = editorContent.replace(item.base64, urls[index]);
                    uploadedImages.push(urls[index]);
                }
            });
        }
        
        // 선택된 업종의 코드 가져오기
        const selectedBusinessType = businessTypeSelect.value;
        const businessTypeCode = window.businessTypes ? window.businessTypes[selectedBusinessType] : null;
        
        // 광고 데이터 준비
        const adData = {
            title: document.getElementById('title').value,
            businessType: businessTypeSelect.value,
            businessTypeCode: businessTypeCode, // 업종 코드 추가
            region: regionSelect.value,
            city: citySelect.value,
            content: editorContent,
            phone: document.getElementById('phone').value,
            kakao: document.getElementById('kakao').value || '',
            telegram: document.getElementById('telegram').value || '',
            thumbnail: businessTypeCode ? `/img/business-type/${businessTypeCode}.png` : uploadedImages[0] || null, // 업종별 썸네일
            images: uploadedImages,
            updatedAt: Date.now()
        };
        
        // 리얼타임 데이터베이스 업데이트
        await update(ref(rtdb, `advertisements/${adId}`), adData);
        
        alert('광고가 성공적으로 수정되었습니다.');
        window.location.href = '/ad-posting/ad-management.html';
        
    } catch (error) {
        console.error('광고 수정 실패:', error);
        alert('광고 수정에 실패했습니다. 다시 시도해주세요.');
        submitButton.disabled = false;
        submitButton.textContent = '수정 완료';
    }
}