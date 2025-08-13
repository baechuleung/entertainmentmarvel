// admin/ads/js/ads-add-modal.js - 광고 추가 모달 기능
import { rtdb, auth, db } from '/js/firebase-config.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { uploadBusinessAdImages, uploadSingleImage } from '/js/imagekit-upload.js';

// 전역 변수
let regionData = {};
let cityData = {};
let businessTypes = {};
let contentQuill = null;
let eventQuill = null;
let previewImages = new Map();
let thumbnailFile = null;
let currentUserData = null;

// ==================== 데이터 로드 함수 ====================

// 지역 데이터 로드
async function loadLocationData() {
    try {
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        const region2Response = await fetch('/data/region2.json');
        cityData = await region2Response.json();
        
        regionData = {};
        region1Data.regions.forEach(region => {
            regionData[region.name] = region.code;
        });
        
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 카테고리 데이터 로드
async function loadCategoryData() {
    try {
        const response = await fetch('/data/category.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('카테고리 데이터 로드 실패:', error);
        return null;
    }
}

// 업종 데이터 로드
async function loadBusinessTypes(category) {
    try {
        let fileName = '';
        if (category === '유흥주점') {
            fileName = '/data/karaoke.json';
        } else if (category === '건전마사지') {
            fileName = '/data/gunma.json';
        } else {
            return null;
        }
        
        const response = await fetch(fileName);
        const data = await response.json();
        
        businessTypes = {};
        data.businessTypes.forEach(type => {
            businessTypes[type.name] = type.code;
        });
        
        window.businessTypes = businessTypes;
        
        return businessTypes;
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
        return null;
    }
}

// ==================== 사용자 정보 로드 ====================

// 현재 로그인한 사용자 정보 가져오기
async function getCurrentUserData() {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error('로그인된 사용자가 없습니다.');
            return null;
        }
        
        // Firestore에서 사용자 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('현재 사용자 정보:', userData);
            return userData;
        } else {
            console.error('사용자 문서를 찾을 수 없습니다.');
            return null;
        }
    } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
        return null;
    }
}

// ==================== UI 설정 함수 ====================

// 카테고리 버튼 생성
async function createCategoryButtons() {
    const categoryData = await loadCategoryData();
    if (!categoryData) return;
    
    const container = document.getElementById('add-category-buttons');
    container.innerHTML = '';
    
    categoryData.categories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'category-btn';
        button.dataset.category = category.name;
        button.textContent = category.name;
        
        button.addEventListener('click', async function() {
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            document.getElementById('add-category').value = category.name;
            
            await loadBusinessTypes(category.name);
            updateBusinessTypeOptions(category.name);
            showCategoryFields(category.name);
        });
        
        container.appendChild(button);
    });
}

// 업종 옵션 업데이트
function updateBusinessTypeOptions(category) {
    const wrapper = document.getElementById('add-business-type-wrapper');
    const selected = wrapper.querySelector('.select-selected');
    const optionsContainer = document.getElementById('add-business-type-options');
    
    selected.textContent = '업종을 선택하세요';
    selected.dataset.value = '';
    document.getElementById('add-business-type').value = '';
    
    optionsContainer.innerHTML = '';
    
    if (businessTypes && Object.keys(businessTypes).length > 0) {
        Object.keys(businessTypes).forEach(typeName => {
            const option = document.createElement('div');
            option.textContent = typeName;
            option.dataset.value = typeName;
            option.addEventListener('click', function() {
                selected.textContent = typeName;
                selected.dataset.value = typeName;
                document.getElementById('add-business-type').value = typeName;
                optionsContainer.classList.add('select-hide');
            });
            optionsContainer.appendChild(option);
        });
    }
}

// 카테고리별 필드 표시/숨김
function showCategoryFields(category) {
    const karaokeFields = document.querySelectorAll('.karaoke-field');
    const massageFields = document.querySelectorAll('.massage-field');
    
    karaokeFields.forEach(field => {
        field.style.display = category === '유흥주점' ? 'block' : 'none';
    });
    
    massageFields.forEach(field => {
        field.style.display = category === '건전마사지' ? 'block' : 'none';
    });
    
    if (category === '유흥주점' || category === '건전마사지') {
        if (!eventQuill) {
            initEventEditor();
        }
    }
}

// 지역 옵션 설정
function setupRegionOptions() {
    const wrapper = document.getElementById('add-region-wrapper');
    const selected = wrapper.querySelector('.select-selected');
    const optionsContainer = document.getElementById('add-region-options');
    
    optionsContainer.innerHTML = '';
    
    Object.keys(regionData).forEach(regionName => {
        const option = document.createElement('div');
        option.textContent = regionName;
        option.dataset.value = regionName;
        option.addEventListener('click', function() {
            selected.textContent = regionName;
            selected.dataset.value = regionName;
            document.getElementById('add-region').value = regionName;
            optionsContainer.classList.add('select-hide');
            updateCityOptions(regionName);
        });
        optionsContainer.appendChild(option);
    });
}

// 도시 옵션 업데이트
function updateCityOptions(regionName) {
    const wrapper = document.getElementById('add-city-wrapper');
    const selected = wrapper.querySelector('.select-selected');
    const optionsContainer = document.getElementById('add-city-options');
    
    selected.textContent = '도시를 선택하세요';
    selected.dataset.value = '';
    document.getElementById('add-city').value = '';
    
    optionsContainer.innerHTML = '';
    
    const regionCode = regionData[regionName];
    if (regionCode && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const option = document.createElement('div');
            const cityName = typeof city === 'string' ? city : city.name;
            option.textContent = cityName;
            option.dataset.value = cityName;
            option.addEventListener('click', function() {
                selected.textContent = cityName;
                selected.dataset.value = cityName;
                document.getElementById('add-city').value = cityName;
                optionsContainer.classList.add('select-hide');
            });
            optionsContainer.appendChild(option);
        });
    }
}

// 커스텀 셀렉트 설정
function setupCustomSelects() {
    const customSelects = document.querySelectorAll('.custom-select');
    
    customSelects.forEach(customSelect => {
        const selected = customSelect.querySelector('.select-selected');
        const optionsContainer = customSelect.querySelector('.select-items');
        
        selected.addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllSelect(this);
            optionsContainer.classList.toggle('select-hide');
            this.classList.toggle('select-arrow-active');
        });
    });
    
    document.addEventListener('click', closeAllSelect);
}

function closeAllSelect(elmnt) {
    const optionsContainers = document.querySelectorAll('.select-items');
    const selecteds = document.querySelectorAll('.select-selected');
    
    optionsContainers.forEach((container, index) => {
        if (elmnt !== selecteds[index]) {
            container.classList.add('select-hide');
            selecteds[index].classList.remove('select-arrow-active');
        }
    });
}

// ==================== 에디터 함수 ====================

// 에디터 초기화 전 기존 에디터 제거
function destroyEditors() {
    // 콘텐츠 에디터 제거
    if (contentQuill) {
        contentQuill = null;
        const contentContainer = document.getElementById('add-editor-container');
        if (contentContainer) {
            contentContainer.innerHTML = '<div id="add-editor"></div>';
        }
    }
    
    // 이벤트 에디터 제거
    if (eventQuill) {
        eventQuill = null;
        const eventContainer = document.getElementById('add-event-editor-container');
        if (eventContainer) {
            eventContainer.innerHTML = '<div id="add-event-editor"></div>';
        }
    }
}

// 콘텐츠 에디터 초기화
function initContentEditor() {
    const editorElement = document.getElementById('add-editor');
    if (!editorElement) return;
    
    // 기존 에디터가 있으면 제거
    if (contentQuill) {
        contentQuill = null;
    }
    
    contentQuill = new Quill('#add-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'header': 1 }, { 'header': 2 }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'font': [] }],
                [{ 'align': [] }],
                ['clean'],
                ['image', 'link', 'video']
            ]
        }
    });
    
    contentQuill.on('text-change', function() {
        document.getElementById('add-content').value = contentQuill.root.innerHTML;
    });
}

// 이벤트 에디터 초기화
function initEventEditor() {
    const editorElement = document.getElementById('add-event-editor');
    if (!editorElement) return;
    
    // 기존 에디터가 있으면 제거
    if (eventQuill) {
        eventQuill = null;
    }
    
    eventQuill = new Quill('#add-event-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['clean']
            ]
        }
    });
    
    eventQuill.on('text-change', function() {
        document.getElementById('add-event-info').value = eventQuill.root.innerHTML;
    });
}

// ==================== 썸네일 관련 함수 ====================

// 썸네일 업로드 설정
function setupThumbnailUpload() {
    const preview = document.getElementById('add-thumbnail-preview');
    const input = document.getElementById('add-thumbnail-input');
    const deleteBtn = document.getElementById('add-delete-thumbnail');
    
    preview.addEventListener('click', () => input.click());
    
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            thumbnailFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="썸네일">`;
                deleteBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        thumbnailFile = null;
        preview.innerHTML = '<span class="upload-text">클릭하여 이미지 업로드</span>';
        deleteBtn.style.display = 'none';
        input.value = '';
    });
}

// ==================== 동적 필드 추가 함수 ====================

// 주대 아이템 추가
function addTablePriceItem() {
    const list = document.getElementById('add-table-price-list');
    const items = list.querySelectorAll('.table-price-item');
    
    if (items.length === 1) {
        items[0].querySelector('.btn-remove-price').style.display = 'flex';
    }
    
    const item = document.createElement('div');
    item.className = 'table-price-item';
    item.innerHTML = `
        <input type="text" class="table-price-name" placeholder="예: 1인 일반룸">
        <div class="price-input-wrapper">
            <input type="text" class="table-price-value" placeholder="예: 300,000">
            <span class="price-unit">원</span>
        </div>
        <button type="button" class="btn-remove-price">×</button>
    `;
    
    item.querySelector('.btn-remove-price').addEventListener('click', function() {
        item.remove();
        const remainingItems = list.querySelectorAll('.table-price-item');
        if (remainingItems.length === 1) {
            remainingItems[0].querySelector('.btn-remove-price').style.display = 'none';
        }
    });
    
    list.appendChild(item);
}

// 코스 아이템 추가
function addCourseItem() {
    const list = document.getElementById('add-course-list');
    const items = list.querySelectorAll('.course-item');
    
    if (items.length === 1) {
        items[0].querySelector('.btn-remove-course').style.display = 'flex';
    }
    
    const item = document.createElement('div');
    item.className = 'course-item';
    item.innerHTML = `
        <input type="text" class="course-name" placeholder="예: 스페셜케어">
        <div class="price-input-wrapper">
            <input type="text" class="course-price" placeholder="예: 150,000">
            <span class="price-unit">원</span>
        </div>
        <button type="button" class="btn-remove-course">×</button>
    `;
    
    item.querySelector('.btn-remove-course').addEventListener('click', function() {
        item.remove();
        const remainingItems = list.querySelectorAll('.course-item');
        if (remainingItems.length === 1) {
            remainingItems[0].querySelector('.btn-remove-course').style.display = 'none';
        }
    });
    
    list.appendChild(item);
}

// ==================== 이미지 처리 함수 ====================

// 에디터 이미지 처리
async function processEditorImages(quill) {
    const uploadedImages = [];
    const imgElements = quill.root.querySelectorAll('img');
    
    for (const img of imgElements) {
        if (img.src.startsWith('data:')) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const file = new File([blob], `image-${Date.now()}.jpg`, { type: blob.type });
                
                // 현재 사용자 ID 가져오기
                const currentUser = auth.currentUser;
                const userId = currentUser ? currentUser.uid : 'anonymous';
                
                // /ad-posting/과 동일한 경로 사용
                const uploadedUrl = await uploadSingleImage(
                    file, 
                    `/entmarvel/advertise/${userId}`,
                    userId
                );
                img.src = uploadedUrl;
                uploadedImages.push(uploadedUrl);
            } catch (error) {
                console.error('이미지 업로드 실패:', error);
            }
        }
    }
    
    return uploadedImages;
}

// ==================== 폼 제출 처리 ====================

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';
    
    try {
        // 현재 사용자 정보 확인
        if (!currentUserData || !currentUserData.nickname) {
            // 다시 한번 시도
            currentUserData = await getCurrentUserData();
            if (!currentUserData || !currentUserData.nickname) {
                alert('사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
                submitButton.disabled = false;
                submitButton.textContent = '광고 등록';
                return;
            }
        }
        
        const endDate = document.getElementById('add-end-date').value;
        const createdAt = Date.now();
        
        // 광고 데이터 생성
        const adData = {
            category: document.querySelector('.category-btn.active')?.dataset.category || '',
            businessType: document.getElementById('add-business-type')?.value || '',
            businessName: document.getElementById('add-business-name').value,
            region: document.getElementById('add-region').value,
            city: document.getElementById('add-city').value,
            phone: document.getElementById('add-phone').value,
            kakao: document.getElementById('add-kakao').value,
            telegram: document.getElementById('add-telegram').value,
            author: currentUserData.nickname,
            authorId: currentUserData.uid || auth.currentUser?.uid,
            views: 0,
            inquiries: 0,
            status: document.getElementById('add-status').value || 'pending',
            endDate: endDate,
            paymentStatus: document.getElementById('add-payment-status')?.checked || false,
            createdAt: createdAt,
            updatedAt: createdAt
        };
        
        // 카테고리별 추가 데이터 수집
        if (adData.category === '유흥주점') {
            adData.businessHours = document.getElementById('add-business-hours')?.value || '';
            
            // 주대설정 수집
            const tablePriceItems = document.querySelectorAll('#add-table-price-list .table-price-item');
            if (tablePriceItems.length > 0) {
                adData.tablePrice = {};
                tablePriceItems.forEach(item => {
                    const name = item.querySelector('.table-price-name')?.value;
                    const price = item.querySelector('.table-price-value')?.value;
                    if (name && price) {
                        adData.tablePrice[name] = price;
                    }
                });
            }
        } else if (adData.category === '건전마사지') {
            adData.businessHours = document.getElementById('add-massage-business-hours')?.value || '';
            adData.closedDays = document.getElementById('add-closed-days')?.value || '';
            adData.parkingInfo = document.getElementById('add-parking-info')?.value || '';
            adData.directions = document.getElementById('add-directions')?.value || '';
            
            // 코스설정 수집
            const courseItems = document.querySelectorAll('#add-course-list .course-item');
            if (courseItems.length > 0) {
                adData.courses = {};
                courseItems.forEach(item => {
                    const name = item.querySelector('.course-name')?.value;
                    const price = item.querySelector('.course-price')?.value;
                    if (name && price) {
                        adData.courses[name] = price;
                    }
                });
            }
        }
        
        // 썸네일 업로드
        if (thumbnailFile) {
            const currentUser = auth.currentUser;
            const userId = currentUser ? currentUser.uid : 'anonymous';
            // /ad-posting/과 동일한 경로 사용
            const thumbnailUrl = await uploadSingleImage(
                thumbnailFile, 
                `/entmarvel/advertise/${userId}`,
                userId
            );
            adData.thumbnail = thumbnailUrl;
        }
        
        // 에디터 이미지 처리 및 컨텐츠 저장
        if (contentQuill) {
            await processEditorImages(contentQuill);
            adData.content = contentQuill.root.innerHTML;
        }
        
        // 이벤트 정보 저장
        if (eventQuill && eventQuill.root.innerHTML.trim() !== '<p><br></p>') {
            adData.eventInfo = eventQuill.root.innerHTML;
        } else {
            adData.eventInfo = '';
        }
        
        // Firebase에 저장
        const newAdRef = push(ref(rtdb, 'advertisements'));
        await set(newAdRef, adData);
        
        alert('광고가 성공적으로 등록되었습니다.');
        closeModal();
        
        // 목록 새로고침
        if (window.loadAds) {
            window.loadAds();
        }
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '광고 등록';
    }
}

// ==================== 모달 제어 함수 ====================

// 모달 열기
export async function openAddModal() {
    // HTML 파일 로드 (필요한 경우)
    if (!document.getElementById('ad-add-modal')) {
        try {
            const response = await fetch('/admin/ads/ads-add-modal.html');
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            console.error('모달 HTML 로드 실패:', error);
            return;
        }
    }
    
    // 기존 에디터 완전 제거
    destroyEditors();
    
    // 폼 초기화
    const form = document.getElementById('ad-add-form');
    if (form) {
        form.reset();
        
        // 모든 동적 추가 필드 초기화
        const tablePriceList = document.getElementById('add-table-price-list');
        if (tablePriceList) {
            tablePriceList.innerHTML = `
                <div class="table-price-item">
                    <input type="text" class="table-price-name" placeholder="예: 1인 일반룸">
                    <div class="price-input-wrapper">
                        <input type="text" class="table-price-value" placeholder="예: 300,000">
                        <span class="price-unit">원</span>
                    </div>
                    <button type="button" class="btn-remove-price" style="display: none;">×</button>
                </div>
            `;
        }
        
        const courseList = document.getElementById('add-course-list');
        if (courseList) {
            courseList.innerHTML = `
                <div class="course-item">
                    <input type="text" class="course-name" placeholder="예: 스페셜케어">
                    <div class="price-input-wrapper">
                        <input type="text" class="course-price" placeholder="예: 150,000">
                        <span class="price-unit">원</span>
                    </div>
                    <button type="button" class="btn-remove-course" style="display: none;">×</button>
                </div>
            `;
        }
        
        // 썸네일 초기화
        const thumbnailPreview = document.getElementById('add-thumbnail-preview');
        if (thumbnailPreview) {
            thumbnailPreview.innerHTML = '<span class="upload-text">클릭하여 이미지 업로드</span>';
        }
        const deleteBtn = document.getElementById('add-delete-thumbnail');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
        const thumbnailInput = document.getElementById('add-thumbnail-input');
        if (thumbnailInput) {
            thumbnailInput.value = '';
        }
        thumbnailFile = null;
    }
    
    // 현재 로그인한 사용자 정보 가져와서 작성자 필드 설정
    currentUserData = await getCurrentUserData();
    if (currentUserData && currentUserData.nickname) {
        const authorInput = document.getElementById('add-author');
        if (authorInput) {
            authorInput.value = currentUserData.nickname;
            console.log('작성자 설정됨:', currentUserData.nickname);
        }
    } else {
        console.error('사용자 닉네임을 가져올 수 없습니다.');
        alert('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
        return;
    }
    
    // 카테고리 버튼 생성
    await createCategoryButtons();
    
    // 지역 옵션 설정
    setupRegionOptions();
    
    // 커스텀 셀렉트 설정
    setupCustomSelects();
    
    // 에디터 초기화 (새로 생성)
    setTimeout(() => {
        initContentEditor();
    }, 100);
    
    // 썸네일 업로드 설정
    setupThumbnailUpload();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 모달 표시
    document.getElementById('ad-add-modal').classList.add('show');
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 주대 추가
    document.getElementById('add-btn-add-price')?.addEventListener('click', addTablePriceItem);
    
    // 코스 추가
    document.getElementById('add-btn-add-course')?.addEventListener('click', addCourseItem);
    
    // 폼 제출
    document.getElementById('ad-add-form')?.addEventListener('submit', handleSubmit);
    
    // 취소 버튼
    document.getElementById('btn-add-cancel')?.addEventListener('click', closeModal);
    
    // 모달 닫기 버튼
    document.getElementById('add-modal-close')?.addEventListener('click', closeModal);
}

// 모달 닫기
function closeModal() {
    const modal = document.getElementById('ad-add-modal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    // 에디터 완전 제거
    destroyEditors();
    
    // 전역 변수 초기화
    previewImages.clear();
    thumbnailFile = null;
    
    // 폼 초기화
    const form = document.getElementById('ad-add-form');
    if (form) {
        form.reset();
    }
}

// ==================== 스타일 제거 ====================
// CSS는 HTML에서 직접 로드하므로 JS에서 스타일 추가 함수 제거

// ==================== 초기화 ====================

// 지역 데이터 초기 로드
loadLocationData();