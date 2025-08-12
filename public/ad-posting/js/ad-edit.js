// /ad-posting/js/ad-edit.js
import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { uploadBusinessAdImages, uploadSingleImage } from '/js/imagekit-upload.js';
import { 
    loadCategoryData, 
    createCategoryButtons,
    loadRegionData, 
    loadBusinessTypes,
    createRegionOptions,
    createBusinessTypeOptions,
    setupCustomSelects,
    initializeQuillEditor,
    createImageHandler,
    setupThumbnailUpload,
    updateCityOptions,
    setSelectValue,
    setEditorContent,
    processEditorImages,
    showThumbnailFromUrl,
    initializeEventEditor,
    setupTablePriceEvents,
    toggleCategorySpecificFields,
    collectCategoryData
} from './modules/index.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let adId = null;
let currentAd = null;
let quill = null;
let eventQuill = null;
let previewImages = new Map();
let thumbnailFile = null;
let existingThumbnail = null;

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
    quill = initializeQuillEditor();
    
    // 이벤트 에디터 초기화
    eventQuill = initializeEventEditor(previewImages);
    
    // 이미지 핸들러 설정
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', createImageHandler(quill, previewImages));
    
    const eventToolbar = eventQuill.getModule('toolbar');
    eventToolbar.addHandler('image', createImageHandler(eventQuill, previewImages));
    
    // 주대/코스 추가/삭제 이벤트 설정
    setupTablePriceEvents();
    
    // 인증 상태 확인
    checkAuth();
    
    // 데이터 로드
    await loadCategoryData();
    createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
        toggleCategorySpecificFields(categoryName, eventQuill);
        const types = await loadBusinessTypes(categoryName);
        if (types) {
            createBusinessTypeOptions(types);
        }
    });
    
    const { regionData } = await loadRegionData();
    createRegionOptions(regionData);
    
    // 커스텀 셀렉트 초기화
    setupCustomSelects();
    
    // 썸네일 업로드 설정
    setupThumbnailUpload((file) => {
        thumbnailFile = file;
        existingThumbnail = null; // 새 파일 선택 시 기존 썸네일 무효화
    });
    
    // 폼 제출 이벤트
    form.addEventListener('submit', handleSubmit);
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadAdData();
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
        }
    });
}

// 사용자 데이터 로드
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            currentUserData = userDoc.data();
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
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
        
        // 카테고리별 필드 표시
        toggleCategorySpecificFields(currentAd.category, eventQuill);
        
        // 해당 카테고리의 업종 로드
        const types = await loadBusinessTypes(currentAd.category);
        if (types) {
            createBusinessTypeOptions(types);
        }
    }
    
    // 업종 선택
    if (currentAd.businessType) {
        setSelectValue('business-type-wrapper', currentAd.businessType, currentAd.businessType);
        businessTypeInput.value = currentAd.businessType;
    }
    
    // 업소명
    if (currentAd.businessName) {
        document.getElementById('business-name').value = currentAd.businessName;
    }
    
    // 지역 선택
    if (currentAd.region) {
        setSelectValue('region-wrapper', currentAd.region, currentAd.region);
        regionInput.value = currentAd.region;
        
        // 도시 옵션 업데이트
        await updateCityOptions(currentAd.region);
        
        // 도시 선택
        if (currentAd.city) {
            setSelectValue('city-wrapper', currentAd.city, currentAd.city);
            cityInput.value = currentAd.city;
        }
    }
    
    // 연락처 정보
    document.getElementById('phone').value = currentAd.phone || '';
    document.getElementById('kakao').value = currentAd.kakao || '';
    document.getElementById('telegram').value = currentAd.telegram || '';
    
    // 카테고리별 추가 필드 채우기
    if (currentAd.category === '유흥주점') {
        fillKaraokeFields();
    } else if (currentAd.category === '건전마사지') {
        fillMassageFields();
    }
    
    // Quill 에디터에 내용 설정
    if (currentAd.content) {
        setEditorContent(quill, currentAd.content);
    }
    
    // 이벤트 에디터에 내용 설정
    if (currentAd.eventInfo && eventQuill) {
        setEditorContent(eventQuill, currentAd.eventInfo);
    }
    
    // 기존 썸네일 표시
    if (currentAd.thumbnail) {
        existingThumbnail = currentAd.thumbnail;
        showThumbnailFromUrl(
            currentAd.thumbnail,
            document.getElementById('thumbnail-image'),
            document.getElementById('thumbnail-preview'),
            document.getElementById('thumbnail-upload-btn')
        );
    }
}

// 유흥주점 필드 채우기
function fillKaraokeFields() {
    // 영업시간
    if (currentAd.businessHours) {
        document.getElementById('business-hours').value = currentAd.businessHours;
    }
    
    // 주대설정
    if (currentAd.tablePrice && typeof currentAd.tablePrice === 'object') {
        const priceList = document.getElementById('table-price-list');
        priceList.innerHTML = ''; // 기존 내용 초기화
        
        Object.entries(currentAd.tablePrice).forEach(([name, price], index) => {
            const item = document.createElement('div');
            item.className = 'table-price-item';
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'table-price-name';
            nameInput.value = name;
            nameInput.placeholder = '예: 일반룸';
            
            const priceWrapper = document.createElement('div');
            priceWrapper.className = 'price-input-wrapper';
            
            const valueInput = document.createElement('input');
            valueInput.type = 'text';
            valueInput.className = 'table-price-value';
            valueInput.value = price;
            valueInput.placeholder = '예: 30만';
            
            const priceUnit = document.createElement('span');
            priceUnit.className = 'price-unit';
            priceUnit.textContent = '원';
            
            priceWrapper.appendChild(valueInput);
            priceWrapper.appendChild(priceUnit);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-remove-price';
            removeBtn.textContent = '×';
            removeBtn.style.display = Object.keys(currentAd.tablePrice).length > 1 ? 'flex' : 'none';
            
            item.appendChild(nameInput);
            item.appendChild(priceWrapper);
            item.appendChild(removeBtn);
            priceList.appendChild(item);
        });
    }
}

// 건전마사지 필드 채우기
function fillMassageFields() {
    // 영업시간
    if (currentAd.businessHours) {
        document.getElementById('massage-business-hours').value = currentAd.businessHours;
    }
    
    // 휴무일
    if (currentAd.closedDays) {
        document.getElementById('closed-days').value = currentAd.closedDays;
    }
    
    // 주차안내
    if (currentAd.parkingInfo) {
        document.getElementById('parking-info').value = currentAd.parkingInfo;
    }
    
    // 오시는 길
    if (currentAd.directions) {
        document.getElementById('directions').value = currentAd.directions;
    }
    
    // 코스설정
    if (currentAd.courses && typeof currentAd.courses === 'object') {
        const courseList = document.getElementById('course-list');
        courseList.innerHTML = ''; // 기존 내용 초기화
        
        Object.entries(currentAd.courses).forEach(([name, price], index) => {
            const item = document.createElement('div');
            item.className = 'course-item';
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'course-name';
            nameInput.value = name;
            nameInput.placeholder = '예: 전신관리';
            
            const priceWrapper = document.createElement('div');
            priceWrapper.className = 'price-input-wrapper';
            
            const priceInput = document.createElement('input');
            priceInput.type = 'text';
            priceInput.className = 'course-price';
            priceInput.value = price;
            priceInput.placeholder = '예: 10만';
            
            const priceUnit = document.createElement('span');
            priceUnit.className = 'price-unit';
            priceUnit.textContent = '원';
            
            priceWrapper.appendChild(priceInput);
            priceWrapper.appendChild(priceUnit);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-remove-course';
            removeBtn.textContent = '×';
            removeBtn.style.display = Object.keys(currentAd.courses).length > 1 ? 'flex' : 'none';
            
            item.appendChild(nameInput);
            item.appendChild(priceWrapper);
            item.appendChild(removeBtn);
            courseList.appendChild(item);
        });
    }
}

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '수정 중...';
    
    try {
        // 에디터 내용 가져오기
        const editorContent = quill.root.innerHTML;
        
        // 에디터에서 이미지 추출 및 업로드
        const uploadedImages = await processEditorImages(quill, previewImages, uploadBusinessAdImages);
        
        // 썸네일 업로드 (새 파일이 선택된 경우에만)
        let thumbnailUrl = existingThumbnail;
        if (thumbnailFile) {
            thumbnailUrl = await uploadSingleImage(thumbnailFile);
        }
        
        // 업종 코드 가져오기
        const selectedBusinessType = businessTypeInput.value;
        const businessTypeCode = window.businessTypes && window.businessTypes[selectedBusinessType] 
            ? window.businessTypes[selectedBusinessType] : null;
        
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
        
        // 카테고리별 추가 필드 저장
        if (categoryInput.value === '유흥주점' || categoryInput.value === '건전마사지') {
            const categoryData = collectCategoryData(categoryInput.value, eventQuill);
            Object.assign(adData, categoryData);
        }
        
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