// /ad-posting/js/ad-edit.js  
// 광고 수정 페이지 메인 스크립트 (리팩토링 완료)

import {
    // 폼 관련
    validateRequiredFields,
    collectFormData,
    fillFormData,
    enableSubmitButton,
    disableSubmitButton,
    
    // Firebase
    getAd,
    updateAd,
    
    // 이미지
    setupThumbnailUpload,
    showThumbnailFromUrl,
    deleteThumbnail,
    processBase64Images,
    startBackgroundUpload,
    deleteAdImages,
    
    // UI
    createCategoryButtons,
    createRegionOptions,
    createBusinessTypeOptions,
    setupCustomSelects,
    setSelectValue,
    activateCategoryButton,
    updateCityByRegion,
    
    // 에디터
    initializeQuillEditor,
    createImageHandler,
    setEditorContent,
    getEditorContent,
    
    // 카테고리
    toggleCategorySpecificFields,
    collectCategoryData,
    fillCategoryFields,
    setupTablePriceEvents,
    setupCourseEvents,
    initializeEventEditor,
    
    // 데이터
    loadCategoryData,
    loadRegionData,
    loadBusinessTypes,
    
    // 인증
    checkAuth,
    canEditAd,
    redirectToLogin,
    handleNoPermission
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
let originalContent = null; // 원본 content 저장
let existingDetailImages = []; // 기존 상세 이미지 URL 저장

// DOM 요소
const form = document.getElementById('ad-edit-form');
const authorInput = document.getElementById('author');
const categoryInput = document.getElementById('category');
const categoryButtons = document.getElementById('category-buttons');
const businessTypeInput = document.getElementById('business-type');

/**
 * 페이지 초기화
 */
async function initialize() {
    // URL에서 광고 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    adId = urlParams.get('id');
    
    if (!adId) {
        alert('잘못된 접근입니다.');
        window.location.href = '/ad-posting/ad-management.html';
        return;
    }
    
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
    setupCourseEvents();
    
    // 썸네일 업로드 설정
    setupThumbnailUpload((file) => {
        if (file === null) {
            // 삭제 요청
            thumbnailFile = null;
            if (existingThumbnail) {
                handleThumbnailDelete();
            }
        } else {
            // 새 파일 선택
            thumbnailFile = file;
            existingThumbnail = null;
        }
    });
    
    // UI 초기화
    await setupUI();
    
    // 인증 확인
    checkAuth(
        async (user, userData) => {
            currentUser = user;
            currentUserData = userData;
            await loadAdData();
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
 * 광고 데이터 로드
 */
async function loadAdData() {
    try {
        // 광고 데이터 가져오기
        currentAd = await getAd(adId);
        
        if (!currentAd) {
            alert('광고를 찾을 수 없습니다.');
            window.location.href = '/ad-posting/ad-management.html';
            return;
        }
        
        // 권한 확인
        if (!canEditAd(currentAd, currentUser, currentUserData)) {
            handleNoPermission('수정 권한이 없습니다.', '/ad-posting/ad-management.html');
            return;
        }
        
        // 원본 content 저장
        originalContent = currentAd.content || '';
        
        // 기존 상세 이미지 URL 추출 및 저장
        extractExistingDetailImages(originalContent);
        
        // 폼에 데이터 채우기
        await fillAdFormData();
        
    } catch (error) {
        console.error('광고 데이터 로드 실패:', error);
        alert('광고 데이터를 불러오는데 실패했습니다.');
        window.location.href = '/ad-posting/ad-management.html';
    }
}

/**
 * 기존 상세 이미지 URL 추출
 */
function extractExistingDetailImages(content) {
    existingDetailImages = [];
    
    if (!content) return;
    
    // ImageKit URL 패턴 매칭
    const imgRegex = /<img[^>]+src="(https:\/\/ik\.imagekit\.io[^"]+)"[^>]*>/gi;
    let match;
    
    while ((match = imgRegex.exec(content)) !== null) {
        const imageUrl = match[1];
        // 썸네일이 아닌 상세 이미지만 수집
        if (imageUrl.includes('/detail/')) {
            existingDetailImages.push(imageUrl);
            console.log('기존 상세 이미지 발견:', imageUrl);
        }
    }
    
    console.log('총 기존 상세 이미지 개수:', existingDetailImages.length);
}

/**
 * content 변경 여부 확인
 */
function hasContentChanged() {
    const currentContent = getEditorContent(quill);
    
    // base64 이미지가 있으면 새로운 이미지가 추가된 것
    if (currentContent.includes('data:image')) {
        console.log('새로운 이미지가 추가됨');
        return true;
    }
    
    // 기존 이미지 개수와 현재 이미지 개수 비교
    const currentImageCount = (currentContent.match(/<img/gi) || []).length;
    const originalImageCount = (originalContent.match(/<img/gi) || []).length;
    
    if (currentImageCount !== originalImageCount) {
        console.log('이미지 개수가 변경됨:', originalImageCount, '->', currentImageCount);
        return true;
    }
    
    // HTML 구조가 크게 변경되었는지 체크 (간단한 비교)
    const cleanOriginal = originalContent.replace(/\s+/g, '').toLowerCase();
    const cleanCurrent = currentContent.replace(/\s+/g, '').toLowerCase();
    
    if (cleanOriginal !== cleanCurrent) {
        console.log('content 내용이 변경됨');
        return true;
    }
    
    return false;
}

/**
 * 폼에 광고 데이터 채우기
 */
async function fillAdFormData() {
    // 기본 정보 채우기
    fillFormData(form, currentAd);
    
    // 카테고리 선택 및 UI 업데이트
    if (currentAd.category) {
        // 카테고리 버튼 활성화
        activateCategoryButton(currentAd.category);
        
        // 카테고리별 필드 표시
        toggleCategorySpecificFields(currentAd.category);
        
        // 업종 로드 및 설정
        const types = await loadBusinessTypes(currentAd.category);
        if (types) {
            createBusinessTypeOptions(types);
            
            // 업종 값 설정
            setTimeout(() => {
                if (currentAd.businessType) {
                    setSelectValue('business-type-wrapper', currentAd.businessType, currentAd.businessType);
                    businessTypeInput.value = currentAd.businessType;
                }
            }, 100);
        }
    }
    
    // 지역/도시 설정
    if (currentAd.region) {
        setSelectValue('region-wrapper', currentAd.region, currentAd.region);
        
        // 도시 옵션 업데이트
        await updateCityByRegion(currentAd.region);
        
        // 도시 선택
        if (currentAd.city) {
            setTimeout(() => {
                setSelectValue('city-wrapper', currentAd.city, currentAd.city);
            }, 100);
        }
    }
    
    // 에디터 콘텐츠 설정
    if (currentAd.content) {
        setEditorContent(quill, currentAd.content);
    }
    
    // 이벤트 텍스트 설정
    if ((currentAd.category === '유흥주점' || currentAd.category === '건전마사지') && currentAd.eventInfo) {
        const eventTextarea = document.getElementById('event-textarea');
        if (eventTextarea) {
            eventTextarea.value = currentAd.eventInfo;
        }
    }
    
    // 썸네일 표시
    if (currentAd.thumbnail && !currentAd.thumbnail.includes('THUMBNAIL_')) {
        existingThumbnail = currentAd.thumbnail;
        const thumbnailImage = document.getElementById('thumbnail-image');
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
        showThumbnailFromUrl(currentAd.thumbnail, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
    }
    
    // 카테고리별 특수 필드 채우기
    fillCategoryFields(currentAd.category, currentAd);
}

/**
 * 썸네일 삭제 처리
 */
async function handleThumbnailDelete() {
    const deleteThumbnailBtn = document.getElementById('delete-thumbnail');
    
    try {
        if (deleteThumbnailBtn) {
            deleteThumbnailBtn.disabled = true;
            deleteThumbnailBtn.textContent = '삭제 중...';
        }
        
        console.log('썸네일 삭제 시작:', existingThumbnail);
        
        // ImageKit에서 삭제
        await deleteThumbnail(existingThumbnail, currentUser.uid);
        
        // 성공 시 초기화
        existingThumbnail = null;
        console.log('썸네일이 성공적으로 삭제되었습니다.');
        
    } catch (error) {
        console.error('썸네일 삭제 실패:', error);
        alert('썸네일 삭제에 실패했습니다. 다시 시도해주세요.');
        
        // 실패 시 UI 복구
        const thumbnailImage = document.getElementById('thumbnail-image');
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
        
        if (existingThumbnail) {
            showThumbnailFromUrl(existingThumbnail, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
        }
    } finally {
        if (deleteThumbnailBtn) {
            deleteThumbnailBtn.disabled = false;
            deleteThumbnailBtn.textContent = '×';
        }
    }
}

/**
 * 폼 제출 처리
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = form.querySelector('button[type="submit"]');
    disableSubmitButton(submitButton, '수정 중...');
    
    try {
        // 1. 폼 검증
        const validation = validateRequiredFields(form);
        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            enableSubmitButton(submitButton, '수정 완료');
            return;
        }
        
        // 2. 폼 데이터 수집
        const formData = collectFormData(form);
        
        // 3. 에디터 콘텐츠 처리
        const editorContent = getEditorContent(quill);
        const { processedContent, detailFiles } = processBase64Images(editorContent, previewImages);
        
        // 4. content 변경 여부 확인
        const contentChanged = hasContentChanged();
        let shouldDeleteOldImages = false;
        
        if (contentChanged && detailFiles.length > 0) {
            // 새로운 이미지가 있고 content가 변경된 경우
            console.log('Content가 변경되어 기존 상세 이미지를 삭제합니다.');
            shouldDeleteOldImages = true;
        }
        
        // 5. 이벤트 텍스트 수집
        let eventText = '';
        if (formData.category === '유흥주점' || formData.category === '건전마사지') {
            const eventTextarea = document.getElementById('event-textarea');
            eventText = eventTextarea ? eventTextarea.value : '';
        }
        
        // 6. 카테고리별 데이터 수집
        const categoryData = collectCategoryData(formData.category);
        
        // 7. 썸네일 URL 결정
        let finalThumbnailUrl = '';
        if (thumbnailFile) {
            // 새 썸네일 업로드 필요
            finalThumbnailUrl = '';
        } else if (existingThumbnail) {
            // 기존 썸네일 유지
            finalThumbnailUrl = existingThumbnail;
        } else {
            // 썸네일 삭제됨
            finalThumbnailUrl = '';
        }
        
        // 8. 업데이트 데이터 생성 (기존 데이터 병합)
        const updateData = {
            ...currentAd,
            ...formData,
            content: processedContent,
            eventInfo: eventText,
            thumbnail: finalThumbnailUrl,
            uploadStatus: (thumbnailFile || detailFiles.length > 0) ? 'uploading' : currentAd.uploadStatus || 'completed',
            ...categoryData
        };
        
        // 9. Firebase 업데이트
        await updateAd(adId, updateData);
        console.log('광고 수정 완료:', adId);
        
        // 10. 기존 상세 이미지 삭제 (필요한 경우)
        if (shouldDeleteOldImages && existingDetailImages.length > 0) {
            console.log('기존 상세 이미지 삭제 시작:', existingDetailImages.length + '개');
            deleteAdImages(existingDetailImages, currentUser.uid)
                .then(result => {
                    console.log('기존 상세 이미지 삭제 완료:', result);
                })
                .catch(error => {
                    console.error('기존 상세 이미지 삭제 실패:', error);
                });
        }
        
        // 11. 새 이미지 백그라운드 업로드
        if (thumbnailFile || detailFiles.length > 0) {
            startBackgroundUpload(adId, thumbnailFile, detailFiles, [])
                .then(result => {
                    console.log('백그라운드 업로드 결과:', result);
                })
                .catch(error => {
                    console.error('백그라운드 업로드 실패:', error);
                });
        }
        
        // 12. 완료 처리
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기
        
        alert('광고가 성공적으로 수정되었습니다! 이미지는 백그라운드에서 업로드됩니다.');
        window.location.href = '/ad-posting/ad-management.html';
        
    } catch (error) {
        console.error('광고 수정 실패:', error);
        alert('광고 수정에 실패했습니다. 다시 시도해주세요.');
        enableSubmitButton(submitButton, '수정 완료');
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initialize);