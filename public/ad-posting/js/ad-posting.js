import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { uploadBusinessAdImages } from '/js/imagekit-upload.js';

// 전역 변수
let currentUser = null;
let regionData = {};
let cityData = {};
let businessTypes = {}; // 업종 코드 매핑 저장
let quill = null;
let previewImages = new Map();

// DOM 요소
const form = document.getElementById('ad-posting-form');
const authorInput = document.getElementById('author');
const regionSelect = document.getElementById('region');
const citySelect = document.getElementById('city');
const businessTypeSelect = document.getElementById('business-type');
const contentInput = document.getElementById('content');

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
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
            // 사용자 닉네임 가져오기
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.userType !== 'business') {
                    alert('업체회원만 접근 가능합니다.');
                    window.location.href = '/main/main.html';
                    return;
                }
                authorInput.value = userData.nickname || '작성자';
            }
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
        }
    });
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
            option.value = region.name;
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
        data.businessTypes.forEach(type => {
            businessTypes[type.name] = type.code;
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            businessTypeSelect.appendChild(option);
        });
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
        if (confirm('작성을 취소하시겠습니까?')) {
            window.location.href = '/main/main.html';
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
    submitButton.textContent = '등록 중...';
    
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
            }
        });
        
        // 이미지들을 ImageKit에 업로드
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
        const businessTypeCode = businessTypes[selectedBusinessType];
        
        // 광고 데이터 준비
        const adPostingData = {
            title: document.getElementById('title').value,
            author: authorInput.value,
            authorId: currentUser.uid,
            businessType: selectedBusinessType,
            businessTypeCode: businessTypeCode, // 업종 코드 추가
            region: regionSelect.value,
            city: citySelect.value,
            content: editorContent,
            phone: document.getElementById('phone').value,
            kakao: document.getElementById('kakao').value || '',
            telegram: document.getElementById('telegram').value || '',
            thumbnail: `/img/business-type/${businessTypeCode}.png`, // 업종별 썸네일
            images: uploadedImages,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'active',
            views: 0
        };
        
        // 리얼타임 데이터베이스에 저장
        const dbRef = ref(rtdb, 'advertisements');
        const newPostRef = push(dbRef);
        await set(newPostRef, adPostingData);
        
        alert('광고가 성공적으로 등록되었습니다.');
        window.location.href = '/main/main.html';
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다. 다시 시도해주세요.');
        submitButton.disabled = false;
        submitButton.textContent = '광고 등록';
    }
}