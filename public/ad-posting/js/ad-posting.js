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
    processEditorImages
} from './modules/index.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let quill = null;
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
    
    // 이미지 핸들러 설정
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', createImageHandler(quill, previewImages));
    
    // 인증 상태 확인
    checkAuth();
    
    // 데이터 로드 및 카테고리 버튼 생성 (카테고리 선택 시 처리 포함)
    await loadCategoryData();
    createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
        // 카테고리별 필드 표시/숨김
        toggleCategorySpecificFields(categoryName);
        
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

// 카테고리별 필드 표시/숨김
function toggleCategorySpecificFields(categoryName) {
    const karaokeFields = document.getElementById('karaoke-fields');
    
    // 유흥주점 카테고리인 경우 추가 필드 표시
    if (categoryName === '유흥주점') {
        karaokeFields.style.display = 'block';
    } else {
        karaokeFields.style.display = 'none';
        // 필드 값 초기화
        document.getElementById('business-hours').value = '';
        document.getElementById('table-price').value = '';
        document.getElementById('event-info').value = '';
    }
}

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
        // 에디터 내용 가져오기
        const editorContent = quill.root.innerHTML;
        
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
            businessName: document.getElementById('business-name').value,
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
        
        // 유흥주점 카테고리인 경우 추가 필드 저장
        if (categoryInput.value === '유흥주점') {
            adData.businessHours = document.getElementById('business-hours').value || '';
            adData.tablePrice = document.getElementById('table-price').value || '';
            adData.eventInfo = document.getElementById('event-info').value || '';
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