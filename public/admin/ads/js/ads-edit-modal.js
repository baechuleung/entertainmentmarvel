// admin/ads/js/ads-edit-modal.js - 광고 수정 모달

import { rtdb } from '/js/firebase-config.js';
import { ref, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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
    setSelectValue,
    activateCategoryButton,
    updateCityByRegion,
    
    // 카테고리 관련
    toggleCategorySpecificFields,
    setupTablePriceEvents,
    setupCourseEvents,
    collectCategoryData,
    fillCategoryFields,
    
    // 폼 관련
    validateRequiredFields,
    collectFormData,
    fillFormData,
    
    // 이미지 관련
    setupThumbnailUpload,
    showThumbnailFromUrl,
    processBase64Images,
    startBackgroundUpload,
    deleteAdImages,
    
    // 에디터 관련
    initializeQuillEditor,
    createImageHandler,
    setEditorContent,
    getEditorContent
} from '/ad-posting/js/modules/index.js';

// 전역 변수
let editModal = null;
let currentEditingAd = null;
let quillEditor = null;
let eventEditor = null;
let previewImages = new Map();
let thumbnailFile = null;
let existingThumbnail = null;
let existingDetailImages = [];

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
export async function openEditModal(adId) {
    const ad = window.allAds.find(a => a.id === adId);
    if (!ad) {
        alert('광고를 찾을 수 없습니다.');
        return;
    }
    
    currentEditingAd = ad;
    
    // 모달 HTML 로드
    const loaded = await loadModalHTML();
    if (!loaded) {
        alert('모달을 로드할 수 없습니다.');
        return;
    }
    
    editModal = document.getElementById('ad-edit-modal');
    
    // 모달 초기화 및 데이터 로드
    await initializeModal();
    await loadAdData();
    
    // 모달 표시
    editModal.style.display = 'block';
}

// 모달 초기화
async function initializeModal() {
    try {
        // 0. 작성자 필드 설정 (수정 시에는 기존 작성자 유지)
        const authorInput = document.getElementById('author');
        if (authorInput && currentEditingAd) {
            authorInput.value = currentEditingAd.author || '';
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
        
        // 6. 썸네일 업로드 설정
        setupThumbnailUpload((file) => {
            thumbnailFile = file;
        });
        
        // 7. 카테고리별 이벤트 설정
        setupTablePriceEvents();
        setupCourseEvents();
        
        // 8. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        console.error('모달 초기화 실패:', error);
        alert('모달 초기화에 실패했습니다.');
    }
}

// 삭제 - initializeEditors 함수 완전히 제거 (index.js의 함수 사용)

// 광고 데이터 로드
async function loadAdData() {
    if (!currentEditingAd) return;
    
    const form = document.getElementById('ad-edit-form');
    
    // 기본 정보 채우기
    fillFormData(form, currentEditingAd);
    
    // 카테고리 활성화
    activateCategoryButton(currentEditingAd.category);
    
    // 업종 로드 및 선택
    if (currentEditingAd.category) {
        const businessTypes = await loadBusinessTypes(currentEditingAd.category);
        createBusinessTypeOptions(businessTypes);
        
        if (currentEditingAd.businessType) {
            setSelectValue('business-type', currentEditingAd.businessType);
        }
    }
    
    // 지역/도시 설정
    if (currentEditingAd.region) {
        setSelectValue('region', currentEditingAd.region);
        await updateCityByRegion(currentEditingAd.region);
        
        if (currentEditingAd.city) {
            setSelectValue('city', currentEditingAd.city);
        }
    }
    
    // 광고 기간 설정
    const startDateInput = document.getElementById('start-date');
    if (startDateInput && currentEditingAd.startDate) {
        startDateInput.value = currentEditingAd.startDate;
    }
    
    const expiryDateInput = document.getElementById('expiry-date');
    if (expiryDateInput && currentEditingAd.expiryDate) {
        expiryDateInput.value = currentEditingAd.expiryDate;
    }
    
    // 입금 정보 설정
    const paymentAmountInput = document.getElementById('payment-amount');
    if (paymentAmountInput && currentEditingAd.paymentAmount) {
        paymentAmountInput.value = currentEditingAd.paymentAmount;
    }
    
    const paymentDateInput = document.getElementById('payment-date');
    if (paymentDateInput && currentEditingAd.paymentDate) {
        paymentDateInput.value = currentEditingAd.paymentDate;
    }
    
    // 카테고리별 필드 표시
    toggleCategorySpecificFields(currentEditingAd.category);
    
    // 카테고리별 데이터 채우기
    fillCategoryFields(currentEditingAd.category, currentEditingAd);
    
    // 썸네일 표시
    if (currentEditingAd.thumbnail) {
        existingThumbnail = currentEditingAd.thumbnail;
        const thumbnailImage = document.getElementById('thumbnail-image');
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
        
        showThumbnailFromUrl(currentEditingAd.thumbnail, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
    }
    
    // 에디터 내용 설정
    if (currentEditingAd.content && quillEditor) {
        setEditorContent(quillEditor, currentEditingAd.content);
        
        // 기존 이미지 URL 추출
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        existingDetailImages = [];
        while ((match = imgRegex.exec(currentEditingAd.content)) !== null) {
            if (match[1].includes('imagekit.io')) {
                existingDetailImages.push(match[1]);
            }
        }
    }
    
    // 이벤트 에디터 내용 설정 (건전마사지)
    if (currentEditingAd.category === '건전마사지' && currentEditingAd.eventInfo && eventEditor) {
        setEditorContent(eventEditor, currentEditingAd.eventInfo);
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    const form = document.getElementById('ad-edit-form');
    const closeBtn = document.getElementById('edit-modal-close');
    const cancelBtn = document.getElementById('edit-cancel-btn');
    
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
        if (e.target === editModal) {
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
    if (!content || content.trim() === '<p><br></p>') {
        alert('상세 내용을 입력해주세요.');
        return;
    }
    
    // 버튼 비활성화
    const submitBtn = document.getElementById('edit-submit-btn');
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
        
        // 상태 정보 수집
        const statusSelect = document.getElementById('status');
        const paymentSelect = document.getElementById('payment-status');
        
        // 광고 기간 정보
        const startDate = form.querySelector('#start-date')?.value || currentEditingAd.startDate || '';
        const expiryDate = form.querySelector('#expiry-date')?.value || currentEditingAd.expiryDate || '';
        
        // 입금 정보
        const paymentAmount = form.querySelector('#payment-amount')?.value || currentEditingAd.paymentAmount || '';
        const paymentDate = form.querySelector('#payment-date')?.value || currentEditingAd.paymentDate || '';
        
        // 이미지 처리
        const processedContent = await processBase64Images(content, previewImages);
        
        // 변경된 이미지 확인
        const deletedImages = existingDetailImages.filter(img => 
            !processedContent.content.includes(img)
        );
        
        // 광고 데이터 구성
        const updatedData = {
            ...formData,
            ...categoryData,
            content: processedContent.content,
            eventInfo: eventContent,
            status: statusSelect?.value || currentEditingAd.status,
            paymentStatus: paymentSelect?.value || currentEditingAd.paymentStatus,
            startDate: startDate,
            expiryDate: expiryDate,
            paymentAmount: paymentAmount,
            paymentDate: paymentDate,
            updatedAt: Date.now()
        };
        
        // 썸네일 변경 확인
        if (thumbnailFile) {
            updatedData.thumbnailToUpdate = true;
        } else if (existingThumbnail) {
            updatedData.thumbnail = existingThumbnail;
        }
        
        // Firebase 업데이트
        const adRef = ref(rtdb, `advertisements/${currentEditingAd.id}`);
        await update(adRef, updatedData);
        
        // 삭제된 이미지 처리
        if (deletedImages.length > 0) {
            await deleteAdImages(deletedImages);
        }
        
        // 백그라운드 이미지 업로드
        if (processedContent.base64Images.length > 0 || thumbnailFile) {
            await startBackgroundUpload(
                currentEditingAd.id,
                thumbnailFile,
                processedContent.base64Images,
                processedContent.content
            );
        }
        
        alert('광고가 수정되었습니다.');
        closeModal();
        
    } catch (error) {
        console.error('광고 수정 실패:', error);
        alert('광고 수정에 실패했습니다.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '수정';
    }
}

// 모달 닫기
function closeModal() {
    if (editModal) {
        // 에디터 정리
        if (quillEditor) {
            quillEditor.setText('');
        }
        if (eventEditor) {
            eventEditor.setText('');
        }
        
        // 변수 초기화
        currentEditingAd = null;
        previewImages.clear();
        thumbnailFile = null;
        existingThumbnail = null;
        existingDetailImages = [];
        
        // 모달 제거
        editModal.remove();
        editModal = null;
    }
}