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
    showThumbnailFromUrl
} from './modules/index.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let adId = null;
let currentAd = null;
let quill = null;
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
    
    // 이미지 핸들러 설정
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', createImageHandler(quill, previewImages));
    
    // 인증 상태 확인
    checkAuth();
    
    // 데이터 로드
    await loadCategoryData();
    createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
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
        // 해당 카테고리의 업종 로드
        await loadBusinessTypes(currentAd.category);
    }
    
    // 업종 선택
    if (currentAd.businessType) {
        await loadBusinessTypes(currentAd.category);
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
    
    // Quill 에디터에 내용 설정
    if (currentAd.content) {
        setEditorContent(quill, currentAd.content);
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