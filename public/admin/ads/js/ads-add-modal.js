// admin/ads/js/ads-add-modal.js - 광고 추가 모달
// ad-posting/js/modules/index.js를 완전히 동일하게 사용

import { rtdb, db, auth } from '/js/firebase-config.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ad-posting 모듈에서 필요한 기능들 import (완전히 동일한 구조)
import {
    // 데이터 관련
    loadCategoryData,
    loadRegionData,
    loadBusinessTypes,
    
    // UI 관련
    createCategoryButtons,
    createRegionOptions,
    createBusinessTypeOptions,
    setupCustomSelects,
    updateCityByRegion,
    
    // 카테고리 관련
    toggleCategorySpecificFields,
    setupTablePriceEvents,
    setupCourseEvents,
    collectCategoryData,
    
    // 폼 관련
    validateRequiredFields,
    collectFormData,
    
    // 이미지 관련
    setupThumbnailUpload,
    processBase64Images,
    startBackgroundUpload,
    
    // 에디터 관련
    initializeQuillEditor,
    createImageHandler,
    getEditorContent
} from '/ad-posting/js/modules/index.js';

// 전역 변수
let addModal = null;
let quillEditor = null;
let eventEditor = null;
let previewImages = new Map();
let thumbnailFile = null;

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
    
    // 모달 초기화
    await initializeModal();
    
    // 모달 표시
    addModal.style.display = 'block';
}

// 모달 초기화
async function initializeModal() {
    try {
        // 0. 작성자 필드에 현재 사용자 nickname 설정
        const authorInput = document.getElementById('author');
        if (authorInput) {
            // Firestore에서 사용자 데이터 가져오기
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    authorInput.value = userData.nickname || userData.name || auth.currentUser.email?.split('@')[0] || '관리자';
                } else {
                    authorInput.value = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || '관리자';
                }
            }
            authorInput.readOnly = true; // 수정 불가능하게 설정
        }
        
        // 1. 데이터 로드
        const [categoryData, regionData] = await Promise.all([
            loadCategoryData(),
            loadRegionData()
        ]);
        
        // 2. 카테고리 버튼 생성
        const categoryButtons = document.getElementById('category-buttons');
        const categoryInput = document.getElementById('category');
        
        if (categoryButtons && categoryData) {
            createCategoryButtons(
                categoryButtons,
                categoryInput,
                categoryData,
                async (categoryName) => {
                    // 카테고리별 필드 표시/숨김
                    toggleCategorySpecificFields(categoryName);
                    
                    // 업종 로드
                    const types = await loadBusinessTypes(categoryName);
                    if (types) {
                        createBusinessTypeOptions(types);
                    }
                }
            );
        }
        
        // 3. 지역 옵션 생성
        createRegionOptions(regionData);
        
        // 4. 커스텀 셀렉트 초기화
        setupCustomSelects();
        
        // 5. Quill 에디터 초기화
        quillEditor = initializeQuillEditor();
        if (quillEditor) {
            const toolbar = quillEditor.getModule('toolbar');
            toolbar.addHandler('image', createImageHandler(quillEditor, previewImages));
        }
        
        // 6. 이벤트 에디터 초기화 (건전마사지용)
        const eventEditorContainer = document.getElementById('event-editor');
        if (eventEditorContainer) {
            eventEditor = new Quill('#event-editor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'color': [] }],
                        ['link', 'image'],
                        ['clean']
                    ]
                },
                placeholder: '이벤트 내용을 입력하세요...'
            });
            
            const eventToolbar = eventEditor.getModule('toolbar');
            eventToolbar.addHandler('image', createImageHandler(eventEditor, previewImages));
        }
        
        // 7. 썸네일 업로드 설정
        setupThumbnailUpload((file) => {
            thumbnailFile = file;
        });
        
        // 8. 카테고리별 이벤트 설정
        setupTablePriceEvents();
        setupCourseEvents();
        
        // 9. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        console.error('모달 초기화 실패:', error);
        alert('모달 초기화에 실패했습니다.');
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    const form = document.getElementById('ad-posting-form');
    const closeBtn = document.getElementById('add-modal-close');
    const cancelBtn = document.getElementById('add-cancel-btn');
    
    // 폼 제출
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // 모달 닫기
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

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    
    // 필수 필드 검증
    const validation = validateRequiredFields(form);
    if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
    }
    
    // 에디터 내용 확인
    const content = getEditorContent(quillEditor);
    if (!content || content.trim() === '<p><br></p>' || content.trim() === '') {
        alert('상세 내용을 입력해주세요.');
        return;
    }
    
    const submitBtn = document.getElementById('add-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';
    
    try {
        // 폼 데이터 수집
        const formData = collectFormData(form);
        
        // 카테고리별 데이터 수집
        const categoryData = collectCategoryData(formData.category);
        
        // 이미지 처리 (placeholder 사용)
        const processedContent = processBase64Images(content, previewImages);
        
        // 이벤트 에디터 내용 처리 (건전마사지인 경우)
        let eventInfo = '';
        if (formData.category === '건전마사지' && eventEditor) {
            eventInfo = eventEditor.root.innerHTML;
        }
        
        // 종료일 설정 (시작일 제거)
        const expiryDate = formData.expiryDate || ''; // 종료일이 없으면 무제한
        
        // 입금 상태
        const paymentStatus = formData.paymentStatus || '입금대기';
        const paymentAmount = formData.paymentAmount || '';
        
        // Firebase에 저장할 데이터
        const adData = {
            ...formData,
            content: processedContent.processedContent,
            eventInfo: eventInfo,
            status: paymentStatus === '입금완료' ? 'active' : 'pending',
            paymentStatus: paymentStatus,
            paymentAmount: paymentAmount,
            expiryDate: expiryDate,
            views: 0,
            calls: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            authorId: auth.currentUser?.uid || '',
            thumbnail: thumbnailFile ? 'uploading' : '',
            ...categoryData
        };
        
        // undefined 값 제거
        Object.keys(adData).forEach(key => {
            if (adData[key] === undefined) {
                delete adData[key];
            }
        });
        
        // Firebase에 저장
        const adsRef = ref(rtdb, 'advertisements');
        const newAdRef = push(adsRef);
        const adId = newAdRef.key;
        
        await set(newAdRef, {
            ...adData,
            id: adId
        });
        
        // 백그라운드 이미지 업로드 (placeholder 교체)
        if (thumbnailFile || processedContent.detailFiles.length > 0) {
            await startBackgroundUpload(
                adId,
                thumbnailFile,
                processedContent.detailFiles,
                [] // eventFiles는 빈 배열
            );
        }
        
        alert('광고가 등록되었습니다.');
        closeModal();
        
        // 페이지 새로고침하여 목록 업데이트
        window.location.reload();
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '광고 등록';
    }
}

// 모달 닫기
function closeModal() {
    if (addModal) {
        // 에디터 정리
        if (quillEditor) {
            quillEditor.setText('');
        }
        if (eventEditor) {
            eventEditor.setText('');
        }
        
        // 이미지 초기화
        previewImages.clear();
        thumbnailFile = null;
        
        // 모달 제거
        addModal.remove();
        addModal = null;
    }
}