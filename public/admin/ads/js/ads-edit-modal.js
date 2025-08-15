// admin/ads/js/ads-edit-modal.js - 광고 수정 모달 (최종본)
// ad-edit.js와 완전히 동일한 구조와 로직 + 관리자 전용 기능

import { rtdb, db } from '/js/firebase-config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ad-posting 모듈에서 필요한 기능들 import
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
    isAdminUser,
    redirectToLogin,
    handleNoPermission
} from '/ad-posting/js/modules/index.js';

// 전역 변수
let editModal = null;
let currentUser = null;
let currentUserData = null;
let adId = null;
let currentAd = null;
let quill = null;
let previewImages = new Map();
let thumbnailFile = null;
let existingThumbnail = null;
let originalContent = null;
let existingDetailImages = [];
let allUsers = []; // 모든 회원 목록
let selectedUserIds = []; // 선택된 회원 ID 목록

// DOM 요소
let form = null;
let authorInput = null;
let categoryInput = null;
let categoryButtons = null;
let businessTypeInput = null;

// 모달 HTML 로드
async function loadModalHTML() {
    try {
        const response = await fetch('/admin/ads/ads-edit-modal.html');
        const html = await response.text();
        
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('ad-edit-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 새 모달 추가
        document.body.insertAdjacentHTML('beforeend', html);
        return true;
    } catch (error) {
        console.error('모달 HTML 로드 실패:', error);
        return false;
    }
}

// 모달 열기
export async function openEditModal(adIdParam) {
    adId = adIdParam;
    
    if (!adId) {
        alert('잘못된 접근입니다.');
        return;
    }
    
    // 모달 HTML 로드
    const loaded = await loadModalHTML();
    if (!loaded) {
        alert('모달을 로드할 수 없습니다.');
        return;
    }
    
    editModal = document.getElementById('ad-edit-modal');
    
    // DOM 요소 재설정
    form = document.getElementById('ad-edit-form');
    authorInput = document.getElementById('author');
    categoryInput = document.getElementById('category');
    categoryButtons = document.getElementById('category-buttons');
    businessTypeInput = document.getElementById('business-type');
    
    // 모달 초기화
    await initialize();
    
    // 모달 표시
    editModal.style.display = 'block';
}

/**
 * 페이지 초기화 (ad-edit.js와 동일 + 관리자 기능)
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
            
            // 관리자인 경우 회원 검색 기능 활성화
            if (isAdminUser(currentUserData)) {
                setupUserSearchFeature();
                await loadAllUsers();
            }
            
            await loadAdData();
        },
        () => {
            alert('로그인이 필요합니다.');
            closeModal();
        }
    );
    
    // 폼 제출 이벤트
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // 모달 닫기 이벤트
    const closeBtn = document.getElementById('edit-modal-close');
    const cancelBtn = document.getElementById('edit-cancel-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // 모달 외부 클릭
    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeModal();
        }
    });
}

/**
 * UI 설정 (ad-edit.js와 동일)
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
 * 광고 데이터 로드 (ad-edit.js와 동일 + authorId 처리)
 */
async function loadAdData() {
    try {
        // 광고 데이터 가져오기
        currentAd = await getAd(adId);
        
        if (!currentAd) {
            alert('광고를 찾을 수 없습니다.');
            closeModal();
            return;
        }
        
        // 권한 확인 (관리자는 모든 광고 수정 가능)
        if (!isAdminUser(currentUserData) && !canEditAd(currentAd, currentUser, currentUserData)) {
            handleNoPermission('수정 권한이 없습니다.', '/ad-posting/ad-management.html');
            closeModal();
            return;
        }
        
        // authorId 초기화 (배열로 저장)
        if (currentAd.authorId) {
            selectedUserIds = Array.isArray(currentAd.authorId) ? [...currentAd.authorId] : [currentAd.authorId];
            displayAuthorIds();
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
        closeModal();
    }
}

/**
 * 기존 상세 이미지 추출 (ad-edit.js와 동일)
 */
function extractExistingDetailImages(content) {
    existingDetailImages = [];
    if (!content) return;
    
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
        if (match[1].includes('imagekit.io') && !match[1].includes('DETAIL_IMAGE_')) {
            existingDetailImages.push(match[1]);
        }
    }
}

/**
 * content 변경 여부 확인 (ad-edit.js와 동일)
 */
function hasContentChanged() {
    const currentContent = getEditorContent(quill);
    
    if (!originalContent && !currentContent) return false;
    if (!originalContent || !currentContent) return true;
    
    const cleanOriginal = originalContent.replace(/<[^>]*>/g, '').replace(/\s+/g, '').toLowerCase();
    const cleanCurrent = currentContent.replace(/<[^>]*>/g, '').replace(/\s+/g, '').toLowerCase();
    
    if (cleanOriginal !== cleanCurrent) {
        console.log('content 내용이 변경됨');
        return true;
    }
    
    return false;
}

/**
 * 폼에 광고 데이터 채우기 (ad-edit.js와 동일)
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
 * 썸네일 삭제 처리 (ad-edit.js와 동일)
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
 * 폼 제출 처리 (ad-edit.js와 완전히 동일)
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
        
        // 8. 업데이트 데이터 생성 (기존 데이터 병합 + authorId 처리)
        const updateData = {
            ...currentAd,
            ...formData,
            content: processedContent,
            eventInfo: eventText,
            thumbnail: finalThumbnailUrl,
            uploadStatus: (thumbnailFile || detailFiles.length > 0) ? 'uploading' : currentAd.uploadStatus || 'completed',
            authorId: selectedUserIds.length > 0 ? selectedUserIds : currentAd.authorId, // authorId 배열로 저장
            ...categoryData
        };
        
        // 9. Firebase 업데이트
        await updateAd(adId, updateData);
        console.log('광고 업데이트 완료:', adId);
        
        // 10. 기존 이미지 삭제 처리
        if (shouldDeleteOldImages && existingDetailImages.length > 0) {
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
        
        // 13. 페이지 이동
        closeModal();
        window.location.reload();
        
    } catch (error) {
        console.error('광고 수정 실패:', error);
        alert('광고 수정에 실패했습니다. 다시 시도해주세요.');
        enableSubmitButton(submitButton, '수정 완료');
    }
}

// 모달 닫기
function closeModal() {
    if (editModal) {
        // 에디터 정리
        if (quill) {
            quill.setText('');
        }
        
        // 변수 초기화
        currentUser = null;
        currentUserData = null;
        adId = null;
        currentAd = null;
        previewImages.clear();
        thumbnailFile = null;
        existingThumbnail = null;
        originalContent = null;
        existingDetailImages = [];
        allUsers = [];
        selectedUserIds = [];
        
        // DOM 요소 초기화
        form = null;
        authorInput = null;
        categoryInput = null;
        categoryButtons = null;
        businessTypeInput = null;
        
        // 모달 제거
        editModal.remove();
        editModal = null;
    }
}

/**
 * 관리자 전용 - 회원 검색 기능 설정
 */
function setupUserSearchFeature() {
    const btnSearchUser = document.getElementById('btn-search-user');
    const userSearchModal = document.getElementById('user-search-modal');
    const closeUserSearch = document.getElementById('close-user-search');
    const userSearchInput = document.getElementById('user-search-input');
    const btnAddSelectedUsers = document.getElementById('btn-add-selected-users');
    
    if (btnSearchUser) {
        btnSearchUser.style.display = 'inline-block';
        btnSearchUser.addEventListener('click', () => {
            userSearchModal.style.display = 'flex';
            displayUsers(allUsers);
        });
    }
    
    if (closeUserSearch) {
        closeUserSearch.addEventListener('click', () => {
            userSearchModal.style.display = 'none';
        });
    }
    
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredUsers = allUsers.filter(user => 
                user.email.toLowerCase().includes(searchTerm) ||
                (user.nickname && user.nickname.toLowerCase().includes(searchTerm)) ||
                (user.name && user.name.toLowerCase().includes(searchTerm))
            );
            displayUsers(filteredUsers);
        });
    }
    
    if (btnAddSelectedUsers) {
        btnAddSelectedUsers.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.user-checkbox:checked');
            checkboxes.forEach(checkbox => {
                const userId = checkbox.value;
                if (!selectedUserIds.includes(userId)) {
                    selectedUserIds.push(userId);
                }
            });
            displayAuthorIds();
            userSearchModal.style.display = 'none';
        });
    }
}

/**
 * 관리자 전용 - 모든 회원 로드
 */
async function loadAllUsers() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        allUsers = [];
        usersSnapshot.forEach(doc => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log('회원 목록 로드 완료:', allUsers.length);
    } catch (error) {
        console.error('회원 목록 로드 실패:', error);
    }
}

/**
 * 관리자 전용 - 회원 목록 표시
 */
function displayUsers(users) {
    const userList = document.getElementById('user-list');
    if (!userList) return;
    
    if (users.length === 0) {
        userList.innerHTML = '<div class="no-users">검색 결과가 없습니다.</div>';
        return;
    }
    
    userList.innerHTML = users.map(user => `
        <div class="user-item">
            <input type="checkbox" class="user-checkbox" value="${user.id}" 
                ${selectedUserIds.includes(user.id) ? 'checked' : ''}>
            <div class="user-info">
                <div class="user-email">${user.email}</div>
                <div class="user-name">${user.nickname || user.name || '이름 없음'}</div>
                <div class="user-type">${user.userType || 'general'}</div>
            </div>
        </div>
    `).join('');
}

/**
 * 관리자 전용 - 선택된 작성자 ID 표시
 */
function displayAuthorIds() {
    const authorIdList = document.getElementById('author-id-list');
    const authorIds = document.getElementById('author-ids');
    
    if (!authorIdList || !authorIds) return;
    
    if (selectedUserIds.length === 0) {
        authorIdList.style.display = 'none';
        return;
    }
    
    authorIdList.style.display = 'block';
    authorIds.innerHTML = selectedUserIds.map(userId => {
        const user = allUsers.find(u => u.id === userId);
        return `
            <div class="author-id-item">
                <span>${user ? user.email : userId}</span>
                <button type="button" class="btn-remove-author" data-id="${userId}">&times;</button>
            </div>
        `;
    }).join('');
    
    // 삭제 버튼 이벤트
    document.querySelectorAll('.btn-remove-author').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.target.dataset.id;
            selectedUserIds = selectedUserIds.filter(id => id !== userId);
            displayAuthorIds();
        });
    });
}