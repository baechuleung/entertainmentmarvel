// admin/ads/js/ads-modal.js - HTML 파일 로드 방식으로 수정
import { rtdb } from '/js/firebase-config.js';
import { ref, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
    updateCityOptions,
    setSelectValue,
    setEditorContent,
    showThumbnailFromUrl,
    initializeEventEditor,
    setupTablePriceEvents,
    toggleCategorySpecificFields,
    collectCategoryData,
    startBackgroundUpload
} from '/ad-posting/js/modules/index.js';

// 전역 변수
let currentEditingAd = null;
let quill = null;
let previewImages = new Map();
let thumbnailFile = null;
let existingThumbnail = null;

// 모달 HTML 로드
async function loadModalHTML() {
    try {
        const response = await fetch('/admin/ads/ads-modal.html');
        const html = await response.text();
        
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('ad-detail-modal');
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
export async function openDetailModal(adId) {
    const ad = window.allAds.find(a => a.id === adId);
    if (!ad) {
        console.error('광고를 찾을 수 없습니다:', adId);
        return;
    }
    
    currentEditingAd = ad;
    
    // 모달 HTML 로드
    const loaded = await loadModalHTML();
    if (!loaded) {
        alert('모달을 로드할 수 없습니다.');
        return;
    }
    
    // 모달 초기화
    await initializeModal();
    
    // 폼에 데이터 채우기
    await fillFormData();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 모달 표시
    document.getElementById('ad-detail-modal').classList.add('show');
}

// 모달 초기화
async function initializeModal() {
    // Quill 에디터 초기화
    quill = initializeQuillEditor();
    
    // 이벤트 에디터 초기화 (텍스트 필드만 사용)
    initializeEventEditor();
    
    // 이미지 핸들러 설정
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', createImageHandler(quill, previewImages));
    
    // 주대/코스 추가/삭제 이벤트 설정
    setupTablePriceEvents();
    
    // 데이터 로드
    const categoryData = await loadCategoryData();
    const { regionData } = await loadRegionData();
    
    // UI 요소 생성
    const categoryButtons = document.getElementById('modal-category-buttons');
    const categoryInput = document.getElementById('modal-category');
    
    // 카테고리 버튼 생성
    if (categoryButtons && categoryData) {
        createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
            categoryInput.value = categoryName;
            console.log('선택된 카테고리:', categoryName);
            
            // 카테고리별 필드 표시/숨김
            toggleCategorySpecificFields(categoryName);
            
            // 업종 데이터 로드
            const types = await loadBusinessTypes(categoryName);
            if (types) {
                createBusinessTypeOptions(types);
            }
        });
    }
    
    // 지역 옵션 생성
    createRegionOptions(regionData);
    
    // 커스텀 셀렉트 초기화
    setupCustomSelects();
    
    // 썸네일 업로드 설정
    setupThumbnailUpload((file) => {
        thumbnailFile = file;
        existingThumbnail = null;
    });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 폼 제출 이벤트
    const form = document.getElementById('modal-edit-form');
    form?.addEventListener('submit', handleSubmit);
    
    // 취소 버튼
    const cancelBtn = document.getElementById('modal-cancel');
    cancelBtn?.addEventListener('click', closeModal);
    
    // 모달 닫기 버튼
    const closeBtn = document.getElementById('modal-close');
    closeBtn?.addEventListener('click', closeModal);
}

// 폼에 데이터 채우기 (ad-edit.js와 완전 동일)
async function fillFormData() {
    const authorInput = document.getElementById('modal-author');
    const categoryInput = document.getElementById('modal-category');
    const categoryButtons = document.getElementById('modal-category-buttons');
    const businessTypeInput = document.getElementById('modal-business-type');
    const regionInput = document.getElementById('modal-region');
    const cityInput = document.getElementById('modal-city');
    
    // 작성자
    if (authorInput) {
        authorInput.value = currentEditingAd.author || '';
    }
    
    // 카테고리 선택 및 업종 설정
    if (currentEditingAd.category) {
        categoryInput.value = currentEditingAd.category;
        
        const categoryButton = Array.from(categoryButtons.querySelectorAll('.category-btn'))
            .find(btn => btn.textContent === currentEditingAd.category);
            
        if (categoryButton) {
            await new Promise(async (resolve) => {
                categoryButton.click();
                
                setTimeout(async () => {
                    if (currentEditingAd.businessType) {
                        const businessTypeOptions = document.getElementById('business-type-options');
                        const options = businessTypeOptions?.querySelectorAll('div[data-value]');
                        
                        if (options && options.length > 0) {
                            const targetOption = Array.from(options).find(
                                opt => opt.getAttribute('data-value') === currentEditingAd.businessType || 
                                       opt.textContent === currentEditingAd.businessType
                            );
                            
                            if (targetOption) {
                                targetOption.click();
                            } else {
                                setSelectValue('business-type-wrapper', currentEditingAd.businessType, currentEditingAd.businessType);
                                businessTypeInput.value = currentEditingAd.businessType;
                            }
                        }
                    }
                    resolve();
                }, 500);
            });
        }
    }
    
    // 나머지 필드들
    document.getElementById('modal-ad-id').value = currentEditingAd.id;
    document.getElementById('modal-business-name').value = currentEditingAd.businessName || '';
    document.getElementById('modal-phone').value = currentEditingAd.phone || '';
    document.getElementById('modal-kakao').value = currentEditingAd.kakao || '';
    document.getElementById('modal-telegram').value = currentEditingAd.telegram || '';
    document.getElementById('modal-views').value = currentEditingAd.views || 0;
    document.getElementById('modal-status').value = currentEditingAd.status || 'pending';
    
    // 지역 정보
    if (currentEditingAd.region) {
        setSelectValue('region-wrapper', currentEditingAd.region, currentEditingAd.region);
        regionInput.value = currentEditingAd.region;
        
        await updateCityOptions(currentEditingAd.region);
        
        if (currentEditingAd.city) {
            setTimeout(() => {
                setSelectValue('city-wrapper', currentEditingAd.city, currentEditingAd.city);
                cityInput.value = currentEditingAd.city;
            }, 100);
        }
    }
    
    // 에디터 내용
    if (currentEditingAd.content) {
        setEditorContent(quill, currentEditingAd.content);
    }
    
    // 이벤트 텍스트
    if ((currentEditingAd.category === '유흥주점' || currentEditingAd.category === '건전마사지') && currentEditingAd.eventInfo) {
        const eventTextarea = document.getElementById('modal-event-textarea');
        if (eventTextarea) {
            eventTextarea.value = currentEditingAd.eventInfo;
        }
    }
    
    // 썸네일
    if (currentEditingAd.thumbnail) {
        existingThumbnail = currentEditingAd.thumbnail;
        const thumbnailImage = document.getElementById('thumbnail-image');
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
        showThumbnailFromUrl(currentEditingAd.thumbnail, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
    }
    
    // 카테고리별 추가 데이터
    fillCategorySpecificData();
}

// 카테고리별 추가 데이터 채우기
function fillCategorySpecificData() {
    if (currentEditingAd.category === '유흥주점') {
        const businessHours = document.getElementById('modal-business-hours');
        if (businessHours && currentEditingAd.businessHours) {
            businessHours.value = currentEditingAd.businessHours;
        }
        
        if (currentEditingAd.tablePrice) {
            fillTablePrices(currentEditingAd.tablePrice);
        }
    } else if (currentEditingAd.category === '건전마사지') {
        const massageBusinessHours = document.getElementById('modal-massage-business-hours');
        if (massageBusinessHours && currentEditingAd.businessHours) {
            massageBusinessHours.value = currentEditingAd.businessHours;
        }
        
        const closedDays = document.getElementById('modal-closed-days');
        if (closedDays && currentEditingAd.closedDays) {
            closedDays.value = currentEditingAd.closedDays;
        }
        
        const parkingInfo = document.getElementById('modal-parking-info');
        if (parkingInfo && currentEditingAd.parkingInfo) {
            parkingInfo.value = currentEditingAd.parkingInfo;
        }
        
        const directions = document.getElementById('modal-directions');
        if (directions && currentEditingAd.directions) {
            directions.value = currentEditingAd.directions;
        }
        
        if (currentEditingAd.courses) {
            fillCourses(currentEditingAd.courses);
        }
    }
}

// 주대 정보 채우기
function fillTablePrices(tablePrices) {
    const container = document.getElementById('table-price-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(tablePrices).forEach(([name, price], index) => {
        const item = document.createElement('div');
        item.className = 'table-price-item';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'table-price-name';
        nameInput.placeholder = '예: 1인 일반룸';
        nameInput.value = name || '';
        
        const priceWrapper = document.createElement('div');
        priceWrapper.className = 'price-input-wrapper';
        
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'table-price-value';
        valueInput.placeholder = '예: 300,000';
        valueInput.value = price || '';
        
        const priceUnit = document.createElement('span');
        priceUnit.className = 'price-unit';
        priceUnit.textContent = '원';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-remove-price';
        removeBtn.textContent = '×';
        removeBtn.style.display = index === 0 ? 'none' : '';
        
        priceWrapper.appendChild(valueInput);
        priceWrapper.appendChild(priceUnit);
        
        item.appendChild(nameInput);
        item.appendChild(priceWrapper);
        item.appendChild(removeBtn);
        
        container.appendChild(item);
    });
}

// 코스 정보 채우기
function fillCourses(courses) {
    const container = document.getElementById('course-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(courses).forEach(([name, price], index) => {
        const item = document.createElement('div');
        item.className = 'course-item';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'course-name';
        nameInput.placeholder = '예: 60분 코스';
        nameInput.value = name || '';
        
        const priceWrapper = document.createElement('div');
        priceWrapper.className = 'price-input-wrapper';
        
        const priceInput = document.createElement('input');
        priceInput.type = 'text';
        priceInput.className = 'course-price';
        priceInput.placeholder = '예: 100,000';
        priceInput.value = price || '';
        
        const priceUnit = document.createElement('span');
        priceUnit.className = 'price-unit';
        priceUnit.textContent = '원';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-remove-course';
        removeBtn.textContent = '×';
        removeBtn.style.display = index === 0 ? 'none' : '';
        
        priceWrapper.appendChild(priceInput);
        priceWrapper.appendChild(priceUnit);
        
        item.appendChild(nameInput);
        item.appendChild(priceWrapper);
        item.appendChild(removeBtn);
        
        container.appendChild(item);
    });
}

// 폼 제출 처리 (동일 유지)
async function handleSubmit(e) {
    // 기존 코드와 동일...
}

// 모달 닫기
export function closeModal() {
    const modal = document.getElementById('ad-detail-modal');
    if (modal) {
        modal.remove();
    }
    previewImages.clear();
    thumbnailFile = null;
    existingThumbnail = null;
}