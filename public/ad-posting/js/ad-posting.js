// /ad-posting/js/ad-posting.js
import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, push, set, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
    collectCategoryData,
    // 광고 전용 ImageKit 업로드 함수들
    uploadAdThumbnail,
    uploadSingleDetailImage,
    uploadSingleEventImage
} from './modules/index.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let quill = null;
let eventQuill = null;
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
    // DOM 요소가 제대로 로드되었는지 확인
    console.log('DOM 요소 확인:');
    console.log('폼:', form);
    console.log('작성자 입력:', authorInput);
    console.log('카테고리 입력:', categoryInput);
    console.log('카테고리 버튼 컨테이너:', categoryButtons);
    
    if (!form || !authorInput || !categoryInput || !categoryButtons) {
        console.error('필수 DOM 요소를 찾을 수 없습니다!');
        console.error('form:', form);
        console.error('authorInput:', authorInput);
        console.error('categoryInput:', categoryInput);
        console.error('categoryButtons:', categoryButtons);
        return;
    }
    
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
    const categoryData = await loadCategoryData();
    console.log('로드된 카테고리 데이터:', categoryData);
    
    // 카테고리 버튼이 제대로 생성되는지 확인
    if (categoryButtons && categoryData) {
        console.log('카테고리 버튼 생성 시작');
        createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
            // 카테고리 선택 시 입력 필드에 값 설정
            if (categoryInput) {
                categoryInput.value = categoryName;
                console.log('선택된 카테고리:', categoryName);
            }
            
            // 카테고리별 필드 표시/숨김
            toggleCategorySpecificFields(categoryName, eventQuill);
            
            // 업종 데이터 로드
            const types = await loadBusinessTypes(categoryName);
            if (types) {
                createBusinessTypeOptions(types);
            }
        });
        
        // 카테고리 버튼이 생성되었는지 확인
        const generatedButtons = categoryButtons.querySelectorAll('.category-btn');
        console.log('생성된 카테고리 버튼 수:', generatedButtons.length);
        if (generatedButtons.length === 0) {
            console.error('카테고리 버튼이 생성되지 않았습니다!');
            console.error('categories 객체:', categories);
        }
    } else {
        console.error('카테고리 버튼 컨테이너 또는 데이터가 없습니다.');
        console.error('categoryButtons:', categoryButtons);
        console.error('categoryData:', categoryData);
    }
    
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
            
            // 작성자 필드 설정 - authorInput이 존재하는지 확인
            if (authorInput) {
                authorInput.value = currentUserData.nickname || currentUserData.email || '익명';
                console.log('작성자 설정:', authorInput.value);
            } else {
                console.error('작성자 입력 필드를 찾을 수 없습니다.');
            }
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
        // 필수 입력 필드 유효성 검증
        
        // 1. 카테고리 확인
        if (!categoryInput.value) {
            alert('카테고리를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 2. 작성자 확인
        if (!authorInput.value.trim()) {
            alert('작성자를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 3. 나머지 필수 필드 검증
        const businessNameValue = document.getElementById('business-name')?.value.trim();
        const phoneValue = document.getElementById('phone')?.value.trim();
        
        // 업소명 검증
        if (!businessNameValue || businessNameValue === '') {
            alert('업소명을 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 전화번호 검증
        if (!phoneValue || phoneValue === '') {
            alert('전화번호를 입력해주세요.');
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
        
        // 6. 상세 내용 검증 제거 - 이미지만 있어도 등록 가능
        const editorContent = quill.root.innerHTML;
        
        // 먼저 Firebase에 광고 데이터 저장하여 ID 생성
        const newAdRef = push(ref(rtdb, 'advertisements'));
        const adId = newAdRef.key;  // 생성된 광고 ID
        
        console.log('생성된 광고 ID:', adId);
        
        // 썸네일 업로드 (광고 ID 사용)
        let thumbnailUrl = null;
        if (thumbnailFile) {
            thumbnailUrl = await uploadAdThumbnail(thumbnailFile, adId);
        }
        
        // 에디터 이미지 처리 (광고 ID 사용)
        const processedImages = await processEditorImages(
            quill, 
            previewImages, 
            async (file) => {
                // file이 배열이 아닌 단일 파일 객체인지 확인
                if (file instanceof File) {
                    return await uploadSingleDetailImage(file, adId);
                }
                console.error('Invalid file type:', file);
                return null;
            },
            adId,
            'detail'
        );
        
        // 이벤트 에디터 이미지 처리 (유흥주점 카테고리)
        let eventInfo = '';  // eventContent가 아니라 eventInfo
        if (categoryInput.value === '유흥주점' && eventQuill) {
            // 이벤트 에디터의 이미지만 처리 (별도 배열 필요 없음)
            await processEditorImages(
                eventQuill, 
                previewImages, 
                async (file) => {
                    if (file instanceof File) {
                        return await uploadSingleEventImage(file, adId);
                    }
                    return null;
                },
                adId,
                'event'
            );
            eventInfo = eventQuill.root.innerHTML;
        }
        
        // 카테고리별 추가 데이터 수집
        const categoryData = collectCategoryData(categoryInput.value, eventQuill);
        
        // 최종 광고 데이터
        const adData = {
            // 기본 정보
            adId: adId,  // 광고 ID 추가
            author: authorInput.value,
            authorId: [currentUser.uid],
            category: categoryInput.value,
            businessName: businessNameValue,
            businessType: businessTypeInput.value || '',
            
            // 위치 정보
            region: regionInput.value,
            city: cityInput.value || '',
            
            // 연락처 정보
            phone: phoneValue,
            kakao: document.getElementById('kakao')?.value || '',
            telegram: document.getElementById('telegram')?.value || '',
            
            // 콘텐츠
            content: editorContent,
            eventInfo: eventInfo, 
            thumbnail: thumbnailUrl,
            
            // 카테고리별 추가 데이터
            ...categoryData,
            
            // 메타 정보
            createdAt: Date.now(),
            updatedAt: Date.now(),
            views: 0,
            bookmarks: [],
            reviews: {},
            status: currentUserData.userType === 'administrator' ? 'active' : 'pending'
        };
        
        // Firebase에 최종 데이터 저장
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