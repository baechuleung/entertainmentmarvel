// admin/ads/js/ads-add-modal.js - 광고 추가 모달

import { rtdb, db, auth } from '/js/firebase-config.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ad-posting 모듈에서 필요한 기능들 import
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
        const categoryContainer = document.getElementById('category-buttons');
        const categoryInput = document.getElementById('category');
        
        createCategoryButtons(categoryContainer, categoryInput, categoryData, async (categoryName) => {
            // 업종 데이터 로드
            const businessTypes = await loadBusinessTypes(categoryName);
            createBusinessTypeOptions(businessTypes);
            
            // 카테고리별 필드 토글
            toggleCategorySpecificFields(categoryName);
        });
        
        // 3. 지역 옵션 생성
        createRegionOptions(regionData);
        
        // 4. 커스텀 셀렉트 설정 및 지역 선택 이벤트 추가
        setupCustomSelects();
        
        // 지역 선택 시 도시 업데이트를 위한 이벤트 추가
        const regionOptions = document.querySelectorAll('#region-options div');
        regionOptions.forEach(option => {
            option.addEventListener('click', async function() {
                const regionName = this.getAttribute('data-value');
                
                // selectOption 함수 호출
                const wrapper = this.closest('.custom-select');
                const selected = wrapper.querySelector('.select-selected');
                const input = document.getElementById('region');
                
                if (selected) {
                    selected.textContent = this.textContent;
                    selected.setAttribute('data-value', regionName);
                }
                
                if (input) {
                    input.value = regionName;
                }
                
                // 드롭다운 닫기
                const items = wrapper.querySelector('.select-items');
                if (items) {
                    items.classList.add('select-hide');
                }
                
                // 도시 옵션 업데이트
                await updateCityByRegion(regionName);
            });
        });
        
        // 5. Quill 에디터 초기화
        quillEditor = initializeQuillEditor();
        if (quillEditor) {
            const toolbar = quillEditor.getModule('toolbar');
            toolbar.addHandler('image', createImageHandler(quillEditor, previewImages));
        }
        
        // 6. 이벤트 에디터 초기화
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
    
    // 버튼 비활성화
    const submitBtn = document.getElementById('add-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '처리 중...';
    
    try {
        // 폼 데이터 수집
        const formData = collectFormData(form);
        
        // 카테고리별 데이터 수집
        const categoryData = collectCategoryData(formData.category);
        
        // 이벤트 내용 수집
        let eventContent = '';
        if (eventEditor) {
            eventContent = getEditorContent(eventEditor) || '';
        }
        
        // 이미지 처리 - processBase64Images가 없으면 직접 처리
        let processedContent = { content: content, base64Images: [] };
        try {
            processedContent = await processBase64Images(content, previewImages);
        } catch (error) {
            console.log('이미지 처리 스킵:', error);
            processedContent = { content: content, base64Images: [] };
        }
        
        // 광고 기간 설정 (기본값: 오늘부터 30일)
        const startDate = form.querySelector('#start-date')?.value || new Date().toISOString().split('T')[0];
        const expiryDate = form.querySelector('#expiry-date')?.value || '';
        
        // 종료일이 없으면 시작일로부터 30일 후로 설정
        let calculatedExpiryDate = expiryDate;
        if (!expiryDate && startDate) {
            const start = new Date(startDate);
            start.setDate(start.getDate() + 30);
            calculatedExpiryDate = start.toISOString().split('T')[0];
        }
        
        // 입금 정보
        const paymentAmount = form.querySelector('#payment-amount')?.value || '';
        const paymentStatus = form.querySelector('#payment-status')?.value || '입금대기';
        
        // 광고 데이터 구성 - undefined 값 방지
        const adData = {
            author: formData.author || '',
            category: formData.category || '',
            businessName: formData.businessName || '',
            businessType: formData.businessType || '',
            region: formData.region || '',
            city: formData.city || '',
            phone: formData.phone || '',
            kakao: formData.kakao || '',
            telegram: formData.telegram || '',
            content: processedContent.content || content || '',
            eventInfo: eventContent || '',
            status: paymentStatus === '입금완료' ? 'active' : 'pending',  // 입금완료시 자동 활성화
            paymentStatus: paymentStatus,
            paymentAmount: paymentAmount,
            startDate: startDate,
            expiryDate: calculatedExpiryDate,
            views: 0,
            calls: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            authorId: auth.currentUser?.uid || '',
            thumbnail: thumbnailFile ? 'uploading' : '',
            ...categoryData  // 카테고리별 추가 데이터
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
        
        // 백그라운드 이미지 업로드 시도
        try {
            if (processedContent.base64Images.length > 0 || thumbnailFile) {
                await startBackgroundUpload(
                    adId,
                    thumbnailFile,
                    processedContent.base64Images,
                    processedContent.content
                );
            }
        } catch (error) {
            console.log('백그라운드 업로드 스킵:', error);
        }
        
        alert('광고가 등록되었습니다.');
        closeModal();
        
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