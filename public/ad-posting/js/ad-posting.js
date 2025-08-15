// /ad-posting/js/ad-posting.js
// 광고 등록 페이지 메인 스크립트 (리팩토링 완료)

import {
    // 폼 관련
    validateRequiredFields,
    collectFormData,
    enableSubmitButton,
    disableSubmitButton,
    
    // Firebase
    createAd,
    checkExistingAd,
    
    // 이미지
    setupThumbnailUpload,
    processBase64Images,
    startBackgroundUpload,
    
    // UI
    createCategoryButtons,
    createRegionOptions,
    createBusinessTypeOptions,
    setupCustomSelects,
    
    // 에디터
    initializeQuillEditor,
    createImageHandler,
    getEditorContent,
    
    // 카테고리
    toggleCategorySpecificFields,
    collectCategoryData,
    setupTablePriceEvents,
    setupCourseEvents,  // import 추가
    initializeEventEditor,
    
    // 데이터
    loadCategoryData,
    loadRegionData,
    loadBusinessTypes,
    
    // 인증
    checkAuth,
    isBusinessUser,
    isAdminUser,
    redirectToLogin,
    handleNoPermission
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

/**
 * 페이지 초기화
 */
async function initialize() {
    // 에디터 초기화
    quill = initializeQuillEditor();
    if (quill) {
        const toolbar = quill.getModule('toolbar');
        toolbar.addHandler('image', createImageHandler(quill, previewImages));
    }
    
    // 이벤트 에디터 초기화
    initializeEventEditor();
    
    // 카테고리별 이벤트 설정
    setupTablePriceEvents();
    setupCourseEvents();  // 코스 이벤트도 초기화 추가
    
    // 썸네일 업로드 설정
    setupThumbnailUpload((file) => {
        thumbnailFile = file;
        console.log('썸네일 선택:', file ? file.name : '삭제');
    });
    
    // UI 초기화
    await setupUI();
    
    // 인증 확인
    checkAuth(
        async (user, userData) => {
            currentUser = user;
            currentUserData = userData;
            await handleAuthenticated();
        },
        () => {
            redirectToLogin();
        }
    );
    
    // 폼 제출 이벤트
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

/**
 * UI 설정
 */
async function setupUI() {
    // 카테고리 데이터 로드
    const categoryData = await loadCategoryData();
    
    // 카테고리 버튼 생성
    if (categoryButtons && categoryData) {
        createCategoryButtons(
            categoryButtons,
            categoryInput,
            categoryData,
            async (categoryName) => {
                console.log('카테고리 선택:', categoryName);
                
                // 카테고리별 필드 표시/숨김
                toggleCategorySpecificFields(categoryName);
                
                // 업종 데이터 로드
                const types = await loadBusinessTypes(categoryName);
                if (types) {
                    createBusinessTypeOptions(types);
                }
            }
        );
    }
    
    // 지역 데이터 로드
    const regionData = await loadRegionData();
    createRegionOptions(regionData);
    
    // 커스텀 셀렉트 초기화
    setupCustomSelects();
}

/**
 * 인증 성공 처리
 */
async function handleAuthenticated() {
    // 권한 확인
    if (!isBusinessUser(currentUserData) && !isAdminUser(currentUserData)) {
        handleNoPermission('업체회원만 광고를 등록할 수 있습니다.');
        return;
    }
    
    // 작성자 설정
    if (authorInput) {
        authorInput.value = currentUserData.nickname || currentUserData.email || '익명';
    }
    
    // 일반 업체회원 중복 체크 (관리자 제외)
    if (!isAdminUser(currentUserData)) {
        const hasExisting = await checkExistingAd(currentUser.uid);
        if (hasExisting) {
            alert('이미 등록된 광고가 있습니다. 기존 광고를 수정해주세요.');
            window.location.href = '/ad-posting/ad-management.html';
        }
    }
}

/**
 * 폼 제출 처리
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = form.querySelector('button[type="submit"]');
    disableSubmitButton(submitButton, '등록 중...');
    
    try {
        // 1. 폼 검증
        const validation = validateRequiredFields(form);
        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            enableSubmitButton(submitButton, '광고 등록');
            return;
        }
        
        // 2. 폼 데이터 수집
        const formData = collectFormData(form);
        
        // 3. 에디터 콘텐츠 처리
        const editorContent = getEditorContent(quill);
        const { processedContent, detailFiles } = processBase64Images(editorContent, previewImages);
        
        // 4. 이벤트 텍스트 수집
        let eventText = '';
        if (formData.category === '유흥주점' || formData.category === '건전마사지') {
            const eventTextarea = document.getElementById('event-textarea');
            eventText = eventTextarea ? eventTextarea.value : '';
        }
        
        // 5. 카테고리별 데이터 수집
        const categoryData = collectCategoryData(formData.category);
        
        // 6. 광고 데이터 생성
        const adData = {
            ...formData,
            authorId: [currentUser.uid],
            content: processedContent,
            eventInfo: eventText,
            thumbnail: '', // 백그라운드 업로드에서 처리
            uploadStatus: (thumbnailFile || detailFiles.length > 0) ? 'uploading' : 'completed',
            ...categoryData,
            status: isAdminUser(currentUserData) ? 'active' : 'pending'
        };
        
        // 7. Firebase에 저장
        const adId = await createAd(adData);
        console.log('광고 생성 완료:', adId);
        
        // 8. 이미지 백그라운드 업로드
        if (thumbnailFile || detailFiles.length > 0) {
            startBackgroundUpload(adId, thumbnailFile, detailFiles, [])
                .then(result => {
                    console.log('백그라운드 업로드 결과:', result);
                })
                .catch(error => {
                    console.error('백그라운드 업로드 실패:', error);
                });
        }
        
        // 9. 완료 처리
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기
        
        alert('광고가 성공적으로 등록되었습니다! 이미지는 백그라운드에서 업로드됩니다.');
        
        // 10. 페이지 이동
        if (isAdminUser(currentUserData)) {
            window.location.href = '/ad-posting/ad-management.html';
        } else {
            window.location.href = '/main/main.html';
        }
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다. 다시 시도해주세요.');
        enableSubmitButton(submitButton, '광고 등록');
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initialize);