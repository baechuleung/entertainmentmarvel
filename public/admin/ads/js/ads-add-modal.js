// admin/ads/js/ads-add-modal.js - HTML 파일 로드 방식으로 수정
import { auth, db, rtdb } from '/js/firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
    initializeEventEditor,
    setupTablePriceEvents,
    toggleCategorySpecificFields,
    collectCategoryData,
    startBackgroundUpload
} from '/ad-posting/js/modules/index.js';

// 전역 변수
let currentUserData = null;
let quill = null;
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
    // 사용자 정보 로드
    const user = auth.currentUser;
    if (!user) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    // 사용자 데이터 로드
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
        currentUserData = userDoc.data();
    } else {
        alert('사용자 정보를 불러올 수 없습니다.');
        return;
    }
    
    // 모달 HTML 로드
    const loaded = await loadModalHTML();
    if (!loaded) {
        alert('모달을 로드할 수 없습니다.');
        return;
    }
    
    // 모달 초기화
    await initializeModal();
    
    // 작성자 설정
    const authorInput = document.getElementById('add-author');
    if (authorInput) {
        authorInput.value = currentUserData.nickname || currentUserData.email || '익명';
    }
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 모달 표시
    document.getElementById('ad-add-modal').classList.add('show');
}

// 모달 초기화
async function initializeModal() {
    // Quill 에디터 초기화 - add-editor를 찾아서 초기화
    const editorElement = document.getElementById('add-editor');
    if (editorElement) {
        quill = new Quill('#add-editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link', 'image'],
                    ['clean']
                ]
            },
            placeholder: '광고 상세 내용을 입력하세요...'
        });
        
        // 에디터 스타일 적용
        applyQuillStyles();
        
        // 에디터 내용 변경 시 hidden input 업데이트
        const contentInput = document.getElementById('add-content');
        if (contentInput) {
            quill.on('text-change', function() {
                contentInput.value = quill.root.innerHTML;
            });
        }
        
        // 이미지 핸들러 설정
        const toolbar = quill.getModule('toolbar');
        toolbar.addHandler('image', createImageHandler(quill, previewImages));
    }
    
    // 이벤트 에디터 초기화 (텍스트 필드만 사용)
    initializeEventEditor();
    
    // 주대/코스 추가/삭제 이벤트 설정
    setupTablePriceEvents();
    
    // 데이터 로드
    const categoryData = await loadCategoryData();
    const { regionData } = await loadRegionData();
    
    // UI 요소 생성
    const categoryButtons = document.getElementById('add-category-buttons');
    const categoryInput = document.getElementById('add-category');
    
    // 카테고리 버튼 생성
    if (categoryButtons && categoryData) {
        createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
            categoryInput.value = categoryName;
            console.log('선택된 카테고리:', categoryName);
            
            // 카테고리별 필드 표시/숨김
            toggleCategorySpecificFields(categoryName);
            
            // 업종 데이터 로드 - 업종 옵션 컨테이너 ID 수정
            const types = await loadBusinessTypes(categoryName);
            if (types) {
                // add-business-type-options ID 사용
                const optionsContainer = document.getElementById('add-business-type-options');
                const selectedElement = document.querySelector('#add-business-type-wrapper .select-selected');
                
                if (optionsContainer && selectedElement) {
                    optionsContainer.innerHTML = '';
                    selectedElement.textContent = '업종을 선택하세요';
                    selectedElement.setAttribute('data-value', '');
                    
                    Object.keys(types).forEach(typeName => {
                        const option = document.createElement('div');
                        option.setAttribute('data-value', typeName);
                        option.textContent = typeName;
                        option.addEventListener('click', function() {
                            selectAddOption(this, 'business-type');
                        });
                        optionsContainer.appendChild(option);
                    });
                }
            }
        });
    }
    
    // 지역 옵션 생성 - add-region-options ID 사용
    const regionOptions = document.getElementById('add-region-options');
    if (regionOptions) {
        regionOptions.innerHTML = '';
        Object.keys(regionData).forEach(regionName => {
            const option = document.createElement('div');
            option.setAttribute('data-value', regionName);
            option.textContent = regionName;
            option.addEventListener('click', function() {
                selectAddOption(this, 'region');
            });
            regionOptions.appendChild(option);
        });
    }
    
    // 커스텀 셀렉트 초기화
    setupAddCustomSelects();
    
    // ads-add-modal.js의 initializeModal 함수 내 썸네일 업로드 부분 수정

    // 썸네일 업로드 설정 - 수정된 버전
    const thumbnailInput = document.getElementById('add-thumbnail-input');
    const thumbnailPreview = document.getElementById('add-thumbnail-preview');
    const thumbnailImage = document.getElementById('add-thumbnail-image');
    const deleteThumbnailBtn = document.getElementById('add-delete-thumbnail');

    if (thumbnailInput && thumbnailPreview) {
        // 썸네일 프리뷰 영역 클릭 시 파일 선택
        thumbnailPreview.addEventListener('click', () => {
            thumbnailInput.click();
        });
        
        // 파일 선택 시 미리보기
        thumbnailInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                thumbnailFile = file;
                showThumbnailPreview(file);
            }
        });
        
        // 삭제 버튼
        if (deleteThumbnailBtn) {
            deleteThumbnailBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // 프리뷰 클릭 이벤트 방지
                clearThumbnail();
            });
        }
    }

    // showThumbnailPreview 함수 수정
    function showThumbnailPreview(file) {
        const thumbnailPreview = document.getElementById('add-thumbnail-preview');
        const deleteThumbnailBtn = document.getElementById('add-delete-thumbnail');
        
        if (!file || !thumbnailPreview) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // 배경 이미지로 설정
            thumbnailPreview.style.backgroundImage = `url(${e.target.result})`;
            thumbnailPreview.style.backgroundSize = 'cover';
            thumbnailPreview.style.backgroundPosition = 'center';
            
            // 업로드 텍스트 숨기기
            const uploadText = thumbnailPreview.querySelector('.upload-text');
            if (uploadText) {
                uploadText.style.display = 'none';
            }
            
            // 삭제 버튼 표시
            if (deleteThumbnailBtn) {
                deleteThumbnailBtn.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    // clearThumbnail 함수 수정
    function clearThumbnail() {
        const thumbnailInput = document.getElementById('add-thumbnail-input');
        const thumbnailPreview = document.getElementById('add-thumbnail-preview');
        const deleteThumbnailBtn = document.getElementById('add-delete-thumbnail');
        
        if (thumbnailInput) thumbnailInput.value = '';
        
        if (thumbnailPreview) {
            thumbnailPreview.style.backgroundImage = '';
            
            // 업로드 텍스트 다시 표시
            const uploadText = thumbnailPreview.querySelector('.upload-text');
            if (uploadText) {
                uploadText.style.display = 'block';
            }
        }
        
        if (deleteThumbnailBtn) {
            deleteThumbnailBtn.style.display = 'none';
        }
        
        thumbnailFile = null;
    }
}

// Quill 에디터 스타일 적용
function applyQuillStyles() {
    const editorContainer = document.getElementById('add-editor-container');
    if (editorContainer) {
        editorContainer.style.backgroundColor = '#3a3a3a';
        editorContainer.style.border = 'none';
        editorContainer.style.borderRadius = '12px';
        editorContainer.style.overflow = 'hidden';
        editorContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    }
    
    const toolbar = document.querySelector('#add-editor-container .ql-toolbar.ql-snow');
    if (toolbar) {
        toolbar.style.backgroundColor = '#2a2a2a';
        toolbar.style.border = 'none';
        toolbar.style.borderRadius = '12px 12px 0 0';
        toolbar.style.padding = '8px';
    }
    
    const qlContainer = document.querySelector('#add-editor-container .ql-container.ql-snow');
    if (qlContainer) {
        qlContainer.style.border = 'none';
        qlContainer.style.backgroundColor = '#3a3a3a';
        qlContainer.style.borderRadius = '0 0 12px 12px';
    }
    
    const qlEditor = document.querySelector('#add-editor-container .ql-editor');
    if (qlEditor) {
        qlEditor.style.backgroundColor = '#3a3a3a';
        qlEditor.style.color = '#ffffff';
        qlEditor.style.padding = '15px';
        qlEditor.style.borderRadius = '0 0 12px 12px';
        qlEditor.style.minHeight = '300px';
    }
}

// 추가 모달용 커스텀 셀렉트 설정
function setupAddCustomSelects() {
    const selectWrappers = document.querySelectorAll('#ad-add-modal .custom-select');
    
    selectWrappers.forEach(selectWrapper => {
        const selected = selectWrapper.querySelector('.select-selected');
        const optionsList = selectWrapper.querySelector('.select-items');
        
        if (!selected || !optionsList) return;
        
        selected.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // 다른 셀렉트 모두 닫기
            document.querySelectorAll('#ad-add-modal .select-items').forEach(items => {
                if (items !== optionsList) {
                    items.classList.add('select-hide');
                }
            });
            document.querySelectorAll('#ad-add-modal .select-selected').forEach(sel => {
                if (sel !== selected) {
                    sel.classList.remove('select-arrow-active');
                }
            });
            
            // 현재 셀렉트 토글
            optionsList.classList.toggle('select-hide');
            this.classList.toggle('select-arrow-active');
        });
    });
}

// 추가 모달용 옵션 선택
function selectAddOption(element, type) {
    const selectWrapper = element.closest('.custom-select');
    const selected = selectWrapper.querySelector('.select-selected');
    let hiddenInput;
    
    if (type === 'business-type') {
        hiddenInput = document.getElementById('add-business-type');
    } else if (type === 'region') {
        hiddenInput = document.getElementById('add-region');
    } else if (type === 'city') {
        hiddenInput = document.getElementById('add-city');
    }
    
    const value = element.getAttribute('data-value');
    selected.textContent = element.textContent;
    selected.setAttribute('data-value', value);
    selected.classList.add('has-value');
    
    if (hiddenInput) {
        hiddenInput.value = value;
    }
    
    // 드롭다운 닫기
    selectWrapper.querySelector('.select-items').classList.add('select-hide');
    selected.classList.remove('select-arrow-active');
    
    // 지역 선택 시 도시 옵션 업데이트
    if (type === 'region') {
        updateAddCityOptions(value);
    }
}

// 추가 모달용 도시 옵션 업데이트
async function updateAddCityOptions(regionName) {
    const cityOptions = document.getElementById('add-city-options');
    const citySelected = document.querySelector('#add-city-wrapper .select-selected');
    const cityInput = document.getElementById('add-city');
    
    if (!cityOptions || !citySelected) return;
    
    // 도시 옵션 초기화
    cityOptions.innerHTML = '';
    citySelected.textContent = '도시를 선택하세요';
    citySelected.classList.remove('has-value');
    if (cityInput) cityInput.value = '';
    
    // 도시 데이터 가져오기
    const { cityData } = await loadRegionData();
    const regionCode = window.regionData ? window.regionData[regionName] : null;
    
    if (regionCode && cityData && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const option = document.createElement('div');
            const cityName = typeof city === 'string' ? city : city.name;
            option.setAttribute('data-value', cityName);
            option.textContent = cityName;
            option.addEventListener('click', function() {
                selectAddOption(this, 'city');
            });
            cityOptions.appendChild(option);
        });
    }
}

// 썸네일 미리보기 표시
function showThumbnailPreview(file) {
    const thumbnailImage = document.getElementById('add-thumbnail-image');
    const thumbnailPreview = document.getElementById('add-thumbnail-preview');
    const thumbnailUploadBtn = document.getElementById('add-thumbnail-upload-btn');
    
    if (!file || !thumbnailImage || !thumbnailPreview) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        thumbnailImage.src = e.target.result;
        thumbnailPreview.style.display = 'block';
        if (thumbnailUploadBtn) {
            thumbnailUploadBtn.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// 썸네일 초기화
function clearThumbnail() {
    const thumbnailInput = document.getElementById('add-thumbnail-input');
    const thumbnailImage = document.getElementById('add-thumbnail-image');
    const thumbnailPreview = document.getElementById('add-thumbnail-preview');
    const thumbnailUploadBtn = document.getElementById('add-thumbnail-upload-btn');
    
    if (thumbnailInput) thumbnailInput.value = '';
    if (thumbnailImage) thumbnailImage.src = '';
    if (thumbnailPreview) thumbnailPreview.style.display = 'none';
    if (thumbnailUploadBtn) thumbnailUploadBtn.style.display = 'block';
    
    thumbnailFile = null;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 폼 제출 이벤트
    const form = document.getElementById('ad-add-form');
    form?.addEventListener('submit', handleSubmit);
    
    // 취소 버튼
    const cancelBtn = document.getElementById('add-cancel');
    cancelBtn?.addEventListener('click', closeAddModal);
    
    // 모달 닫기 버튼
    const closeBtn = document.getElementById('add-modal-close');
    closeBtn?.addEventListener('click', closeAddModal);
    
    // 외부 클릭 시 셀렉트 닫기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('#ad-add-modal .select-items').forEach(items => {
                items.classList.add('select-hide');
            });
            document.querySelectorAll('#ad-add-modal .select-selected').forEach(sel => {
                sel.classList.remove('select-arrow-active');
            });
        }
    });
}

// 폼 제출 처리 (ad-posting.js와 완전 동일)
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';
    
    try {
        // 필드 값 가져오기
        const categoryInput = document.getElementById('add-category');
        const authorInput = document.getElementById('add-author');
        const businessTypeInput = document.getElementById('add-business-type');
        const regionInput = document.getElementById('add-region');
        const cityInput = document.getElementById('add-city');
        
        // 유효성 검증
        if (!categoryInput.value) {
            alert('카테고리를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        if (!authorInput.value.trim()) {
            alert('작성자를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        const businessNameValue = document.getElementById('add-business-name')?.value.trim();
        const phoneValue = document.getElementById('add-phone')?.value.trim();
        
        if (!businessNameValue) {
            alert('업소명을 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        if (!phoneValue) {
            alert('전화번호를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        if (!regionInput.value) {
            alert('지역을 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        if (!cityInput.value) {
            alert('도시를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 광고 ID 생성
        const newAdRef = push(ref(rtdb, 'advertisements'));
        const adId = newAdRef.key;
        
        // 콘텐츠 처리
        let contentHtml = quill.root.innerHTML;
        let eventText = '';
        
        if (categoryInput.value === '유흥주점' || categoryInput.value === '건전마사지') {
            const eventTextarea = document.getElementById('add-event-textarea');
            eventText = eventTextarea ? eventTextarea.value : '';
        }
        
        // 이미지 파일 수집
        const detailFiles = [];
        const detailImgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/gi;
        let detailMatch;
        let detailIndex = 0;
        const detailReplacements = [];
        
        while ((detailMatch = detailImgRegex.exec(contentHtml)) !== null) {
            const fullImgTag = detailMatch[0];
            const base64Src = detailMatch[1];
            
            const file = previewImages.get(base64Src);
            if (file) {
                detailFiles.push(file);
                detailReplacements.push({
                    original: fullImgTag,
                    replacement: `<img src="DETAIL_IMAGE_${detailIndex}">`
                });
                detailIndex++;
            }
        }
        
        detailReplacements.forEach(({original, replacement}) => {
            contentHtml = contentHtml.replace(original, replacement);
        });
        
        // 카테고리별 추가 데이터 수집
        const categoryData = collectCategoryData(categoryInput.value);
        if (categoryInput.value === '유흥주점' || categoryInput.value === '건전마사지') {
            categoryData.eventInfo = eventText;
        }
        
        // 광고 데이터 생성
        const adData = {
            adId: adId,
            author: authorInput.value,
            authorId: [auth.currentUser.uid],
            category: categoryInput.value,
            businessName: businessNameValue,
            businessType: businessTypeInput.value || '',
            region: regionInput.value,
            city: cityInput.value || '',
            phone: phoneValue,
            kakao: document.getElementById('add-kakao')?.value || '',
            telegram: document.getElementById('add-telegram')?.value || '',
            content: contentHtml,
            eventInfo: eventText,
            thumbnail: '',
            uploadStatus: (thumbnailFile || detailFiles.length > 0) ? 'uploading' : 'completed',
            ...categoryData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            views: 0,
            bookmarks: [],
            reviews: {},
            status: currentUserData.userType === 'administrator' ? 'active' : 'pending'
        };
        
        // DB에 저장
        await set(newAdRef, adData);
        console.log('광고 저장 완료:', adId);
        
        // 백그라운드 이미지 업로드
        if (thumbnailFile || detailFiles.length > 0) {
            startBackgroundUpload(
                adId,
                thumbnailFile,
                detailFiles,
                []
            ).then(uploadResult => {
                if (uploadResult.success) {
                    console.log('백그라운드 업로드 성공');
                }
            }).catch(error => {
                console.error('백그라운드 업로드 에러:', error);
            });
        }
        
        // 5초 대기
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        alert('광고가 성공적으로 등록되었습니다!');
        closeAddModal();
        
        // 목록 새로고침
        if (window.loadAds) {
            window.loadAds();
        }
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다.');
        submitButton.disabled = false;
        submitButton.textContent = '광고 등록';
    }
}

// 모달 닫기
function closeAddModal() {
    const modal = document.getElementById('ad-add-modal');
    if (modal) {
        modal.remove();
    }
    previewImages.clear();
    thumbnailFile = null;
    quill = null;
}

// 전역 함수로 등록
window.closeAddModal = closeAddModal;