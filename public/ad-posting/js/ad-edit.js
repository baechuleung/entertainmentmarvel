import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { uploadBusinessAdImages, uploadSingleImage } from '/js/imagekit-upload.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let adId = null;
let currentAd = null;
let regionData = {};
let cityData = {};
let businessTypes = {}; // 업종 코드 매핑 저장
let quill = null;
let previewImages = new Map(); // base64 -> File 객체 매핑
let categories = {}; // 카테고리 데이터 저장
let thumbnailFile = null; // 썸네일 파일 저장
let existingThumbnail = null; // 기존 썸네일 URL 저장

// DOM 요소
const form = document.getElementById('ad-edit-form');
const authorInput = document.getElementById('author');
const categoryInput = document.getElementById('category');
const categoryButtons = document.getElementById('category-buttons');
const regionInput = document.getElementById('region');
const cityInput = document.getElementById('city');
const businessTypeInput = document.getElementById('business-type');
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
    await loadCategoryData();
    await loadRegionData();
    
    // 커스텀 셀렉트 초기화
    setupCustomSelects();
    
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
    
    // 에디터 최소 높이 보장
    const editorElement = document.querySelector('.ql-editor');
    if (editorElement) {
        editorElement.style.minHeight = '300px';
    }
    
    // 에디터 컨테이너 클릭 시 에디터에 포커스
    const editorContainer = document.getElementById('editor-container');
    editorContainer.addEventListener('click', function(e) {
        if (e.target === editorContainer || e.target.closest('#editor')) {
            quill.focus();
        }
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
                quill.insertEmbed(range.index, 'image', base64);
                
                // 파일 객체 저장 (나중에 업로드용)
                previewImages.set(base64, file);
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
            
            // Firestore에서 사용자 정보 가져오기
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                
                // 광고 데이터 로드
                await loadAdData();
            }
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
        
        // 권한 확인 (authorId가 배열인 경우와 문자열인 경우 모두 처리)
        const hasPermission = Array.isArray(currentAd.authorId) 
            ? currentAd.authorId.includes(currentUser.uid)
            : currentAd.authorId === currentUser.uid;
            
        if (!hasPermission && currentUserData.userType !== 'administrator') {
            alert('수정 권한이 없습니다.');
            window.location.href = '/ad-posting/ad-management.html';
            return;
        }
        
        // 폼에 데이터 채우기
        await fillFormData();
        
    } catch (error) {
        console.error('광고 데이터 로드 실패:', error);
        alert('광고 데이터를 불러오는데 실패했습니다.');
    }
}

// 폼에 데이터 채우기
async function fillFormData() {
    // 기본 정보
    authorInput.value = currentAd.author || currentUserData.nickname || currentUserData.email || '익명';
    
    // 카테고리 선택
    if (currentAd.category) {
        categoryInput.value = currentAd.category;
        // 카테고리 버튼 활성화
        document.querySelectorAll('.category-btn').forEach(btn => {
            if (btn.dataset.category === currentAd.category) {
                btn.classList.add('active');
            }
        });
        // 해당 카테고리의 업종 로드
        await loadBusinessTypes(currentAd.category);
    }
    
    // 업종 선택
    if (currentAd.businessType) {
        businessTypeInput.value = currentAd.businessType;
        const businessTypeSelected = document.querySelector('#business-type-wrapper .select-selected');
        businessTypeSelected.textContent = currentAd.businessType;
        businessTypeSelected.classList.add('has-value');
        businessTypeSelected.setAttribute('data-value', currentAd.businessType);
    }
    
    // 업소명
    if (currentAd.businessName) {
        document.getElementById('business-name').value = currentAd.businessName;
    }
    
    // 지역 선택
    if (currentAd.region) {
        regionInput.value = currentAd.region;
        const regionSelected = document.querySelector('#region-wrapper .select-selected');
        regionSelected.textContent = currentAd.region;
        regionSelected.classList.add('has-value');
        regionSelected.setAttribute('data-value', currentAd.region);
        
        // 도시 옵션 업데이트
        await updateCityOptions(currentAd.region);
        
        // 도시 선택
        if (currentAd.city) {
            cityInput.value = currentAd.city;
            const citySelected = document.querySelector('#city-wrapper .select-selected');
            citySelected.textContent = currentAd.city;
            citySelected.classList.add('has-value');
            citySelected.setAttribute('data-value', currentAd.city);
        }
    }
    
    // 연락처 정보
    document.getElementById('phone').value = currentAd.phone || '';
    document.getElementById('kakao').value = currentAd.kakao || '';
    document.getElementById('telegram').value = currentAd.telegram || '';
    
    // Quill 에디터에 내용 설정
    if (currentAd.content) {
        quill.root.innerHTML = currentAd.content;
        contentInput.value = currentAd.content;
    }
    
    // 기존 썸네일 표시
    if (currentAd.thumbnail) {
        existingThumbnail = currentAd.thumbnail;
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const thumbnailImage = document.getElementById('thumbnail-image');
        
        thumbnailImage.src = currentAd.thumbnail;
        thumbnailPreview.style.display = 'block';
        document.getElementById('thumbnail-upload-btn').style.display = 'none';
    }
}

// 카테고리 데이터 로드
async function loadCategoryData() {
    try {
        const response = await fetch('/data/category.json');
        const data = await response.json();
        categories = data;
        
        // 카테고리 버튼 생성
        categoryButtons.innerHTML = '';
        data.categories.forEach(category => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'category-btn';
            button.textContent = category.name;
            button.dataset.category = category.name;
            
            // 버튼 클릭 이벤트
            button.addEventListener('click', async function() {
                // 모든 버튼의 active 클래스 제거
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // 클릭된 버튼에 active 클래스 추가
                this.classList.add('active');
                
                // hidden input에 값 설정
                categoryInput.value = category.name;
                
                // 해당 카테고리의 업종 로드
                await loadBusinessTypes(category.name);
            });
            
            categoryButtons.appendChild(button);
        });
    } catch (error) {
        console.error('카테고리 데이터 로드 실패:', error);
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
        
        // 지역 옵션 추가
        const regionOptions = document.getElementById('region-options');
        if (regionOptions) {
            region1Data.regions.forEach(region => {
                regionData[region.name] = region.code; // 매핑 저장
                const option = document.createElement('div');
                option.setAttribute('data-value', region.name);
                option.textContent = region.name;
                option.addEventListener('click', function() {
                    selectOption(this, 'region');
                });
                regionOptions.appendChild(option);
            });
        }
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 업종 데이터 로드
async function loadBusinessTypes(categoryName) {
    try {
        // 카테고리에 따라 파일 결정
        let fileName = '';
        if (categoryName === '유흥주점') {
            fileName = '/data/karaoke.json';
        } else if (categoryName === '건전마사지') {
            fileName = '/data/gunma.json';
        } else {
            console.error('알 수 없는 카테고리:', categoryName);
            return;
        }
        
        const response = await fetch(fileName);
        const data = await response.json();
        
        // 업종 옵션 초기화
        const businessTypeOptions = document.getElementById('business-type-options');
        const businessTypeSelected = document.querySelector('#business-type-wrapper .select-selected');
        
        businessTypeOptions.innerHTML = '';
        businessTypeSelected.textContent = '업종을 선택하세요';
        businessTypeSelected.classList.remove('has-value');
        businessTypeSelected.setAttribute('data-value', '');
        
        // 업종 코드 매핑 저장 및 옵션 추가
        businessTypes = {};
        data.businessTypes.forEach(type => {
            businessTypes[type.name] = type.code;
            const option = document.createElement('div');
            option.setAttribute('data-value', type.name);
            option.textContent = type.name;
            option.addEventListener('click', function() {
                selectOption(this, 'businessType');
            });
            businessTypeOptions.appendChild(option);
        });
        
        // 전역으로 사용할 수 있도록 window 객체에 저장
        window.businessTypes = businessTypes;
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 커스텀 셀렉트 초기화
function setupCustomSelects() {
    // 모든 커스텀 셀렉트 요소에 대해 이벤트 설정
    document.querySelectorAll('.custom-select').forEach(selectWrapper => {
        const selected = selectWrapper.querySelector('.select-selected');
        const optionsList = selectWrapper.querySelector('.select-items');
        
        // 셀렉트 클릭 이벤트
        selected.addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllSelect(this);
            optionsList.classList.toggle('select-hide');
            this.classList.toggle('select-arrow-active');
        });
    });
    
    // 외부 클릭 시 모든 드롭다운 닫기
    document.addEventListener('click', closeAllSelect);
}

// 모든 셀렉트 닫기
function closeAllSelect(elmnt) {
    const selectItems = document.getElementsByClassName('select-items');
    const selectSelected = document.getElementsByClassName('select-selected');
    
    for (let i = 0; i < selectSelected.length; i++) {
        if (elmnt !== selectSelected[i]) {
            selectSelected[i].classList.remove('select-arrow-active');
        }
    }
    
    for (let i = 0; i < selectItems.length; i++) {
        if (elmnt && elmnt.parentNode && elmnt.parentNode.querySelector('.select-items') === selectItems[i]) {
            continue;
        }
        selectItems[i].classList.add('select-hide');
    }
}

// 옵션 선택 처리
function selectOption(element, type) {
    const selectWrapper = element.closest('.custom-select');
    const selected = selectWrapper.querySelector('.select-selected');
    const value = element.getAttribute('data-value');
    
    // 선택된 값 표시
    selected.textContent = element.textContent;
    selected.setAttribute('data-value', value);
    selected.classList.add('has-value');
    
    // hidden input 업데이트
    if (type === 'region') {
        regionInput.value = value;
        updateCityOptions(value);
    } else if (type === 'city') {
        cityInput.value = value;
    } else if (type === 'businessType') {
        businessTypeInput.value = value;
    }
    
    // 선택된 옵션 표시
    const options = element.parentNode.querySelectorAll('div');
    options.forEach(opt => opt.classList.remove('same-as-selected'));
    element.classList.add('same-as-selected');
    
    // 드롭다운 닫기
    element.parentNode.classList.add('select-hide');
    selected.classList.remove('select-arrow-active');
}

// 도시 옵션 업데이트
function updateCityOptions(regionName) {
    const cityOptions = document.getElementById('city-options');
    const citySelected = document.querySelector('#city-wrapper .select-selected');
    
    // 도시 선택 초기화
    cityOptions.innerHTML = '';
    citySelected.textContent = '도시를 선택하세요';
    citySelected.classList.remove('has-value');
    citySelected.setAttribute('data-value', '');
    cityInput.value = '';
    
    if (regionName && regionData[regionName]) {
        const regionCode = regionData[regionName];
        if (cityData[regionCode]) {
            cityData[regionCode].forEach(city => {
                const option = document.createElement('div');
                option.setAttribute('data-value', city);
                option.textContent = city;
                option.addEventListener('click', function() {
                    selectOption(this, 'city');
                });
                cityOptions.appendChild(option);
            });
        }
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 폼 제출
    form.addEventListener('submit', handleSubmit);
    
    // 썸네일 업로드 버튼
    const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
    const thumbnailInput = document.getElementById('thumbnail-input');
    const thumbnailDeleteBtn = document.getElementById('thumbnail-delete-btn');
    
    thumbnailUploadBtn.addEventListener('click', () => {
        thumbnailInput.click();
    });
    
    thumbnailInput.addEventListener('change', handleThumbnailSelect);
    thumbnailDeleteBtn.addEventListener('click', removeThumbnail);
}

// 썸네일 선택 처리
function handleThumbnailSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        thumbnailFile = file;
        
        // 미리보기 표시
        const reader = new FileReader();
        reader.onload = function(e) {
            const thumbnailPreview = document.getElementById('thumbnail-preview');
            const thumbnailImage = document.getElementById('thumbnail-image');
            
            thumbnailImage.src = e.target.result;
            thumbnailPreview.style.display = 'block';
            
            // 업로드 버튼 숨기기
            document.getElementById('thumbnail-upload-btn').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// 썸네일 제거
function removeThumbnail() {
    thumbnailFile = null;
    existingThumbnail = null;
    
    // 미리보기 숨기기
    document.getElementById('thumbnail-preview').style.display = 'none';
    document.getElementById('thumbnail-image').src = '';
    
    // 업로드 버튼 다시 표시
    document.getElementById('thumbnail-upload-btn').style.display = 'block';
    
    // input 초기화
    document.getElementById('thumbnail-input').value = '';
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
        
        // 썸네일 업로드 처리
        let thumbnailUrl = existingThumbnail; // 기존 썸네일 유지
        if (thumbnailFile) {
            // 새 썸네일 업로드
            thumbnailUrl = await uploadSingleImage(
                thumbnailFile, 
                `/entmarvel/advertise/${currentUser.uid}/thumbnail`,
                currentUser.uid
            );
        }
        
        // 에디터 내 이미지들 처리
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
        const selectedBusinessType = businessTypeInput.value;
        const businessTypeCode = window.businessTypes ? window.businessTypes[selectedBusinessType] : null;
        
        // 광고 데이터 준비 (title 제외)
        const adData = {
            author: authorInput.value,
            category: categoryInput.value,
            businessType: businessTypeInput.value,
            businessTypeCode: businessTypeCode,
            businessName: document.getElementById('business-name').value,
            region: regionInput.value,
            city: cityInput.value,
            content: editorContent,
            phone: document.getElementById('phone').value,
            kakao: document.getElementById('kakao').value || '',
            telegram: document.getElementById('telegram').value || '',
            thumbnail: thumbnailUrl || (businessTypeCode ? `/img/business-type/${businessTypeCode}.png` : uploadedImages[0] || null),
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