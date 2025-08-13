// /ad-posting/js/ad-posting.js
import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, push, set, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
    processEditorImages,
    initializeEventEditor,
    setupTablePriceEvents,
    toggleCategorySpecificFields,
    collectCategoryData
} from './modules/index.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let quill = null;
let eventQuill = null; // 이벤트 에디터 추가
let previewImages = new Map();
let thumbnailFile = null;

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
    quill = initializeQuillEditor();
    
    // 이벤트 에디터 초기화 (유흥주점용)
    eventQuill = initializeEventEditor(previewImages);
    
    // 이미지 핸들러 설정
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', createImageHandler(quill, previewImages));
    
    const eventToolbar = eventQuill.getModule('toolbar');
    eventToolbar.addHandler('image', createImageHandler(eventQuill, previewImages));
    
    // 주대 추가/삭제 이벤트 설정
    setupTablePriceEvents();
    
    // 인증 상태 확인
    checkAuth();
    
    // 데이터 로드 및 카테고리 버튼 생성 (카테고리 선택 시 처리 포함)
    await loadCategoryData();
    createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
        // 카테고리별 필드 표시/숨김
        toggleCategorySpecificFields(categoryName, eventQuill);
        
        // 업종 데이터 로드
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
            checkExistingAd();
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
            
            // 업체회원이 아닌 경우 접근 제한
            if (currentUserData.userType !== 'business' && currentUserData.userType !== 'administrator') {
                alert('업체회원만 광고를 등록할 수 있습니다.');
                window.location.href = '/main/main.html';
                return;
            }
            
            // 작성자 필드 설정
            authorInput.value = currentUserData.nickname || currentUserData.email || '익명';
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 기존 광고 확인 (일반 업체회원만)
function checkExistingAd() {
    if (currentUserData.userType === 'administrator') {
        return; // 관리자는 제한 없음
    }
    
    const adsRef = ref(rtdb, 'advertisements');
    onValue(adsRef, (snapshot) => {
        const ads = snapshot.val();
        if (ads) {
            const userAds = Object.entries(ads).filter(([key, ad]) => {
                return Array.isArray(ad.authorId) 
                    ? ad.authorId.includes(currentUser.uid)
                    : ad.authorId === currentUser.uid;
            });
            
            if (userAds.length > 0) {
                alert('이미 등록된 광고가 있습니다. 기존 광고를 수정해주세요.');
                window.location.href = '/ad-posting/ad-management.html';
            }
        }
    }, { onlyOnce: true });
}

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';
    
    try {
        // === 필수 입력 필드 유효성 검증 시작 ===
        
        // 1. 카테고리 검증
        if (!categoryInput.value || categoryInput.value === '') {
            alert('카테고리를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 2. 업종 검증
        if (!businessTypeInput.value || businessTypeInput.value === '') {
            alert('업종을 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 3. 업소명 검증
        const businessNameValue = document.getElementById('business-name').value.trim();
        if (!businessNameValue || businessNameValue === '') {
            alert('업소명을 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 4. 지역 검증
        if (!regionInput.value || regionInput.value === '') {
            alert('지역을 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 5. 도시 검증
        if (!cityInput.value || cityInput.value === '') {
            alert('도시를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 6. 전화번호 검증
        const phoneValue = document.getElementById('phone').value.trim();
        if (!phoneValue || phoneValue === '') {
            alert('전화번호를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 7. 상세 내용 검증 (에디터)
        const editorContent = quill.root.innerHTML;
        const textContent = quill.root.innerText.trim();
        
        // 빈 에디터 체크 (기본 HTML 태그만 있는 경우도 체크)
        if (!textContent || textContent === '' || textContent.length < 10) {
            alert('상세 내용을 10자 이상 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // === 필수 입력 필드 유효성 검증 완료 ===
        
        // 에디터에서 이미지 추출 및 업로드
        const uploadedImages = await processEditorImages(quill, previewImages, uploadBusinessAdImages);
        
        // 썸네일 업로드
        let thumbnailUrl = null;
        if (thumbnailFile) {
            thumbnailUrl = await uploadSingleImage(thumbnailFile);
        }
        
        // 업종 코드 가져오기
        const selectedBusinessType = businessTypeInput.value;
        const businessTypeCode = window.businessTypes && window.businessTypes[selectedBusinessType] 
            ? window.businessTypes[selectedBusinessType] : null;
        
        // 기본 광고 데이터
        const adData = {
            author: authorInput.value,
            authorId: [currentUser.uid],
            category: categoryInput.value,
            businessType: businessTypeInput.value,
            businessTypeCode: businessTypeCode,
            businessName: businessNameValue, // trim된 값 사용
            region: regionInput.value,
            city: cityInput.value,
            content: editorContent,
            phone: phoneValue, // trim된 값 사용
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
        
        // 카테고리별 추가 필드 저장
        if (categoryInput.value === '유흥주점' || categoryInput.value === '건전마사지') {
            const categoryData = collectCategoryData(categoryInput.value, eventQuill);
            Object.assign(adData, categoryData);
        }
        
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