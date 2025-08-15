// admin/ads/js/ads-add-modal.js - 광고 추가 모달 (최종본)
// ad-posting.js와 완전히 동일한 구조와 로직 + 관리자 전용 기능

import { rtdb, db, auth } from '/js/firebase-config.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ad-posting 모듈에서 필요한 기능들 import
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
    setupCourseEvents,
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
} from '/ad-posting/js/modules/index.js';

// 전역 변수
let addModal = null;
let currentUser = null;
let currentUserData = null;
let quill = null;
let previewImages = new Map();
let thumbnailFile = null;
let allUsers = []; // 모든 회원 목록
let selectedUserIds = []; // 선택된 회원 ID 목록

// DOM 요소
let form = null;
let authorInput = null;
let categoryInput = null;
let categoryButtons = null;

// 모달 HTML 로드
async function loadModalHTML() {
    try {
        const response = await fetch('/admin/ads/ads-add-modal.html');
        const html = await response.text();
        
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('ad-add-modal');
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
export async function openAddModal() {
    // 모달 HTML 로드
    const loaded = await loadModalHTML();
    if (!loaded) {
        alert('모달을 로드할 수 없습니다.');
        return;
    }
    
    addModal = document.getElementById('ad-add-modal');
    
    // DOM 요소 재설정
    form = document.getElementById('ad-posting-form');
    authorInput = document.getElementById('author');
    categoryInput = document.getElementById('category');
    categoryButtons = document.getElementById('category-buttons');
    
    // 모달 초기화
    await initialize();
    
    // 모달 표시
    addModal.style.display = 'block';
}

/**
 * 페이지 초기화 (ad-posting.js와 동일)
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
            
            // 관리자인 경우 회원 검색 기능 활성화
            if (isAdminUser(currentUserData)) {
                setupUserSearchFeature();
                await loadAllUsers();
                
                // 현재 사용자를 기본 선택
                selectedUserIds = [currentUser.uid];
                displayAuthorIds();
            } else {
                // 일반 사용자는 자신의 ID만 설정
                selectedUserIds = [currentUser.uid];
            }
            
            await handleAuthenticated();
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
    const closeBtn = document.getElementById('add-modal-close');
    const cancelBtn = document.getElementById('add-cancel-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // 모달 외부 클릭
    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            closeModal();
        }
    });
}

/**
 * UI 설정 (ad-posting.js와 동일)
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
 * 인증 성공 처리 (ad-posting.js와 동일)
 */
async function handleAuthenticated() {
    // 권한 확인
    if (!isBusinessUser(currentUserData) && !isAdminUser(currentUserData)) {
        handleNoPermission('업체회원만 광고를 등록할 수 있습니다.');
        closeModal();
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
            closeModal();
            window.location.href = '/ad-posting/ad-management.html';
        }
    }
}

/**
 * 폼 제출 처리 (ad-posting.js와 완전히 동일)
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
        
        // 6. 광고 데이터 생성 (authorId 배열로 저장)
        const adData = {
            ...formData,
            authorId: selectedUserIds.length > 0 ? selectedUserIds : [currentUser.uid], // 배열로 저장
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
        closeModal();
        if (isAdminUser(currentUserData)) {
            window.location.href = '/admin/ads/ads.html';
        } else {
            window.location.href = '/main/main.html';
        }
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다. 다시 시도해주세요.');
        enableSubmitButton(submitButton, '광고 등록');
    }
}

// 모달 닫기
function closeModal() {
    if (addModal) {
        // 에디터 정리
        if (quill) {
            quill.setText('');
        }
        
        // 이미지 초기화
        previewImages.clear();
        thumbnailFile = null;
        allUsers = [];
        selectedUserIds = [];
        
        // DOM 요소 초기화
        form = null;
        authorInput = null;
        categoryInput = null;
        categoryButtons = null;
        
        // 모달 제거
        addModal.remove();
        addModal = null;
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