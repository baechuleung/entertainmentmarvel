import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, push, set, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { uploadBusinessAdImages, uploadSingleImage } from '/js/imagekit-upload.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let regionData = {};
let cityData = {};
let businessTypes = {}; // 업종 코드 매핑 저장
let quill = null;
let previewImages = new Map();
let categories = {}; // 카테고리 데이터 저장
let thumbnailFile = null; // 썸네일 파일 저장

// DOM 요소
const form = document.getElementById('ad-posting-form');
const authorInput = document.getElementById('author');
const categoryInput = document.getElementById('category');
const categoryButtons = document.getElementById('category-buttons');
const regionInput = document.getElementById('region');
const cityInput = document.getElementById('city');
const businessTypeInput = document.getElementById('business-type');
const contentInput = document.getElementById('content');

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
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
                
                // 작성자 이름 자동 입력 (닉네임 우선, 없으면 이메일)
                authorInput.value = currentUserData.nickname || currentUserData.email || '익명';
                
                // 일반 유저가 접근한 경우 리다이렉트
                if (currentUserData.userType !== 'business' && currentUserData.userType !== 'administrator') {
                    alert('업체회원만 광고를 등록할 수 있습니다.');
                    window.location.href = '/main/main.html';
                    return;
                }
                
                // 이미 광고가 있는지 확인 (administrator 제외)
                if (currentUserData.userType !== 'administrator') {
                    checkExistingAd(user.uid);
                }
            }
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
        }
    });
}

// 기존 광고 확인
function checkExistingAd(userId) {
    const adsRef = ref(rtdb, 'advertisements');
    onValue(adsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // authorId 배열에 현재 사용자 ID가 포함되어 있는지 확인
            const userHasAd = Object.values(data).some(ad => {
                if (Array.isArray(ad.authorId)) {
                    return ad.authorId.includes(userId);
                }
                // 이전 버전 호환성 (authorId가 문자열인 경우)
                return ad.authorId === userId;
            });
            if (userHasAd) {
                alert('이미 등록된 광고가 있습니다. 기존 광고를 수정해주세요.');
                window.location.href = '/ad-posting/ad-management.html';
            }
        }
    }, { onlyOnce: true });
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

// 업종 데이터 로드 (카테고리에 따라 다른 파일 로드)
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
    submitButton.textContent = '등록 중...';
    
    try {
        // 에디터 내용 가져오기
        let editorContent = quill.root.innerHTML;
        
        // 미리보기 이미지들을 실제 URL로 교체
        const uploadedImages = [];
        
        // 썸네일 업로드 처리
        let thumbnailUrl = null;
        if (thumbnailFile) {
            // uploadSingleImage 함수를 사용하여 썸네일 폴더에 업로드
            const { uploadSingleImage } = await import('/js/imagekit-upload.js');
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
        const selectedBusinessType = businessTypeInput.value;
        const businessTypeCode = window.businessTypes ? window.businessTypes[selectedBusinessType] : null;
        
        // 광고 데이터 준비
        const adData = {
            author: authorInput.value,
            authorId: [currentUser.uid], // 배열 형태로 저장
            category: categoryInput.value,
            businessType: businessTypeInput.value,
            businessTypeCode: businessTypeCode, // 업종 코드 추가
            businessName: document.getElementById('business-name').value, // 업소명 추가
            region: regionInput.value,
            city: cityInput.value,
            content: editorContent,
            phone: document.getElementById('phone').value,
            kakao: document.getElementById('kakao').value || '',
            telegram: document.getElementById('telegram').value || '',
            thumbnail: thumbnailUrl || (businessTypeCode ? `/img/business-type/${businessTypeCode}.png` : uploadedImages[0] || null),
            images: uploadedImages,
            views: 0,
            bookmarks: [],
            reviews: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: currentUserData.userType === 'administrator' ? 'active' : 'pending'
        };
        
        // 리얼타임 데이터베이스에 저장
        const newAdRef = push(ref(rtdb, 'advertisements'));
        await set(newAdRef, adData);
        
        alert('광고가 성공적으로 등록되었습니다.');
        
        // administrator는 광고 관리 페이지로, 일반 업체는 메인으로
        if (currentUserData.userType === 'administrator') {
            window.location.href = '/ad-posting/ad-management.html';
        } else {
            window.location.href = '/main/main.html';
        }
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다. 다시 시도해주세요.');
        submitButton.disabled = false;
        submitButton.textContent = '광고 등록';
    }
}