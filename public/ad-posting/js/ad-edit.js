// /ad-posting/js/ad-edit.js
import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
    processEditorImages,
    showThumbnailFromUrl,
    initializeEventEditor,
    setupTablePriceEvents,
    toggleCategorySpecificFields,
    collectCategoryData,
    // 광고 전용 ImageKit 업로드 함수들
    uploadAdThumbnail,
    uploadSingleDetailImage,
    uploadSingleEventImage
} from './modules/index.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let adId = null;
let currentAd = null;
let quill = null;
let eventQuill = null;
let previewImages = new Map();
let thumbnailFile = null;
let existingThumbnail = null;

// DOM 요소
const form = document.getElementById('ad-edit-form');
const authorInput = document.getElementById('author');
const categoryInput = document.getElementById('category');
const categoryButtons = document.getElementById('category-buttons');
const regionInput = document.getElementById('region');
const cityInput = document.getElementById('city');
const businessTypeInput = document.getElementById('business-type');
const contentInput = document.getElementById('content');

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // URL에서 광고 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    adId = urlParams.get('id');
    
    if (!adId) {
        alert('잘못된 접근입니다.');
        window.location.href = '/ad-posting/ad-management.html';
        return;
    }
    
    // DOM 요소가 제대로 로드되었는지 확인
    console.log('DOM 요소 확인:');
    console.log('폼:', form);
    console.log('작성자 입력:', authorInput);
    console.log('카테고리 입력:', categoryInput);
    console.log('카테고리 버튼 컨테이너:', categoryButtons);
    
    if (!form || !authorInput || !categoryInput || !categoryButtons) {
        console.error('필수 DOM 요소를 찾을 수 없습니다!');
        return;
    }
    
    // Quill 에디터 초기화
    quill = initializeQuillEditor();
    
    // 이벤트 에디터 초기화
    eventQuill = initializeEventEditor(previewImages);
    
    // 이미지 핸들러 설정
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', createImageHandler(quill, previewImages));
    
    const eventToolbar = eventQuill.getModule('toolbar');
    eventToolbar.addHandler('image', createImageHandler(eventQuill, previewImages));
    
    // 주대/코스 추가/삭제 이벤트 설정
    setupTablePriceEvents();
    
    // 인증 상태 확인
    checkAuth();
    
    // 데이터 로드
    const categoryData = await loadCategoryData();
    console.log('로드된 카테고리 데이터:', categoryData);
    
    // 카테고리 버튼 생성 및 이벤트 처리
    if (categoryButtons && categoryData) {
        console.log('카테고리 버튼 생성 시작');
        createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
            // 카테고리 선택 시 입력 필드에 값 설정
            if (categoryInput) {
                categoryInput.value = categoryName;
                console.log('선택된 카테고리:', categoryName);
            }
            
            // 카테고리별 필드 표시/숨김
            toggleCategorySpecificFields(categoryName, eventQuill);
            
            // 업종 데이터 로드
            const types = await loadBusinessTypes(categoryName);
            if (types) {
                createBusinessTypeOptions(types);
            }
        });
        
        // 카테고리 버튼이 생성되었는지 확인
        const generatedButtons = categoryButtons.querySelectorAll('.category-btn');
        console.log('생성된 카테고리 버튼 수:', generatedButtons.length);
    }
    
    const { regionData } = await loadRegionData();
    createRegionOptions(regionData);
    
    // 커스텀 셀렉트 초기화
    setupCustomSelects();
    
    // 썸네일 업로드 설정
    setupThumbnailUpload((file) => {
        thumbnailFile = file;
        existingThumbnail = null; // 새 파일 선택 시 기존 썸네일 무효화
    });
    
    // 폼 제출 이벤트
    form.addEventListener('submit', handleSubmit);
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadAdData();
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
        }
    });
}

// 사용자 데이터 로드
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            currentUserData = userDoc.data();
            
            // 업체회원이 아닌 경우 접근 제한
            if (currentUserData.userType !== 'business' && currentUserData.userType !== 'administrator') {
                alert('업체회원만 광고를 수정할 수 있습니다.');
                window.location.href = '/main/main.html';
                return;
            }
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 광고 데이터 로드
async function loadAdData() {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            alert('광고를 찾을 수 없습니다.');
            window.location.href = '/ad-posting/ad-management.html';
            return;
        }
        
        currentAd = snapshot.val();
        
        // 권한 확인
        const hasPermission = Array.isArray(currentAd.authorId) 
            ? currentAd.authorId.includes(currentUser.uid)
            : currentAd.authorId === currentUser.uid;
            
        if (!hasPermission && currentUserData.userType !== 'administrator') {
            alert('수정 권한이 없습니다.');
            window.location.href = '/ad-posting/ad-management.html';
            return;
        }
        
        // 폼에 데이터 채우기
        await fillFormData();
        
    } catch (error) {
        console.error('광고 데이터 로드 실패:', error);
        alert('광고 데이터를 불러오는데 실패했습니다.');
        window.location.href = '/ad-posting/ad-management.html';
    }
}

// 폼에 데이터 채우기
async function fillFormData() {
    // 작성자
    if (authorInput) {
        authorInput.value = currentAd.author || '';
        console.log('작성자 설정:', authorInput.value);
    }
    
    // 카테고리 선택
    if (currentAd.category) {
        categoryInput.value = currentAd.category;
        
        // 카테고리 버튼 활성화
        const categoryButton = Array.from(categoryButtons.querySelectorAll('.category-btn'))
            .find(btn => btn.textContent === currentAd.category);
        if (categoryButton) {
            categoryButton.click();
        }
    }
    
    // 업소명
    document.getElementById('business-name').value = currentAd.businessName || '';
    
    // 연락처 정보
    document.getElementById('phone').value = currentAd.phone || '';
    document.getElementById('kakao').value = currentAd.kakao || '';
    document.getElementById('telegram').value = currentAd.telegram || '';
    
    // 지역 정보
    if (currentAd.region) {
        setSelectValue('region-wrapper', currentAd.region, currentAd.region);
        regionInput.value = currentAd.region;
        
        // 도시 옵션 업데이트
        await updateCityOptions(currentAd.region);
        
        // 도시 선택
        if (currentAd.city) {
            setTimeout(() => {
                setSelectValue('city-wrapper', currentAd.city, currentAd.city);
                cityInput.value = currentAd.city;
            }, 100);
        }
    }
    
    // 에디터 내용
    if (currentAd.content) {
        setEditorContent(quill, currentAd.content);
    }
    
    // 이벤트 에디터 내용 (유흥주점/건전마사지)
    if ((currentAd.category === '유흥주점' || currentAd.category === '건전마사지') && currentAd.eventInfo) {
        setEditorContent(eventQuill, currentAd.eventInfo);
    }
    
    // 썸네일
    if (currentAd.thumbnail) {
        existingThumbnail = currentAd.thumbnail;
        const thumbnailImage = document.getElementById('thumbnail-image');
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
        showThumbnailFromUrl(currentAd.thumbnail, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
    }
    
    // 카테고리별 추가 데이터
    fillCategorySpecificData();
}

// 카테고리별 추가 데이터 채우기
function fillCategorySpecificData() {
    if (currentAd.category === '유흥주점') {
        // 영업시간
        const businessHours = document.getElementById('business-hours');
        if (businessHours && currentAd.businessHours) {
            businessHours.value = currentAd.businessHours;
        }
        
        // 주대 정보
        if (currentAd.tablePrice) {
            fillTablePrices(currentAd.tablePrice);
        }
    } else if (currentAd.category === '건전마사지') {
        // 영업시간
        const massageBusinessHours = document.getElementById('massage-business-hours');
        if (massageBusinessHours && currentAd.businessHours) {
            massageBusinessHours.value = currentAd.businessHours;
        }
        
        // 휴무일
        const closedDays = document.getElementById('closed-days');
        if (closedDays && currentAd.closedDays) {
            closedDays.value = currentAd.closedDays;
        }
        
        // 주차안내
        const parkingInfo = document.getElementById('parking-info');
        if (parkingInfo && currentAd.parkingInfo) {
            parkingInfo.value = currentAd.parkingInfo;
        }
        
        // 오시는 길
        const directions = document.getElementById('directions');
        if (directions && currentAd.directions) {
            directions.value = currentAd.directions;
        }
        
        // 코스 정보
        if (currentAd.courses) {
            fillCourses(currentAd.courses);
        }
    }
}

// 주대 정보 채우기
function fillTablePrices(tablePrices) {
    const container = document.getElementById('table-price-list');
    if (!container) return;
    
    // 기존 항목 초기화
    container.innerHTML = '';
    
    Object.entries(tablePrices).forEach(([name, price], index) => {
        const item = document.createElement('div');
        item.className = 'table-price-item';
        item.innerHTML = `
            <input type="text" class="table-price-name" placeholder="예: 1인 일반룸" value="${name || ''}">
            <div class="price-input-wrapper">
                <input type="text" class="table-price-value" placeholder="예: 300,000" value="${price || ''}">
                <span class="price-unit">원</span>
            </div>
            <button type="button" class="btn-remove-price" style="${index === 0 ? 'display: none;' : ''}">×</button>
        `;
        container.appendChild(item);
    });
}

// 코스 정보 채우기
function fillCourses(courses) {
    const container = document.getElementById('course-list');
    if (!container) return;
    
    // 기존 항목 초기화
    container.innerHTML = '';
    
    Object.entries(courses).forEach(([name, price], index) => {
        const item = document.createElement('div');
        item.className = 'course-item';
        item.innerHTML = `
            <input type="text" class="course-name" placeholder="예: 60분 코스" value="${name || ''}">
            <div class="price-input-wrapper">
                <input type="text" class="course-price" placeholder="예: 100,000" value="${price || ''}">
                <span class="price-unit">원</span>
            </div>
            <button type="button" class="btn-remove-course" style="${index === 0 ? 'display: none;' : ''}">×</button>
        `;
        container.appendChild(item);
    });
}

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '수정 중...';
    
    try {
        // 필수 입력 필드 유효성 검증
        
        // 1. 카테고리 확인
        if (!categoryInput.value) {
            alert('카테고리를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '수정 완료';
            return;
        }
        
        // 2. 작성자 확인
        if (!authorInput.value.trim()) {
            alert('작성자를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '수정 완료';
            return;
        }
        
        // 3. 나머지 필수 필드 검증
        const businessNameValue = document.getElementById('business-name')?.value.trim();
        const phoneValue = document.getElementById('phone')?.value.trim();
        
        // 업소명 검증
        if (!businessNameValue || businessNameValue === '') {
            alert('업소명을 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '수정 완료';
            return;
        }
        
        // 전화번호 검증
        if (!phoneValue || phoneValue === '') {
            alert('전화번호를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '수정 완료';
            return;
        }
        
        // 4. 지역 검증
        if (!regionInput.value || regionInput.value === '') {
            alert('지역을 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '수정 완료';
            return;
        }
        
        // 5. 도시 검증
        if (!cityInput.value || cityInput.value === '') {
            alert('도시를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '수정 완료';
            return;
        }
        
        // 6. 상세 내용은 검증하지 않음 (이미지만 있어도 가능)
        const editorContent = quill.root.innerHTML;
        
        // 썸네일 처리 (광고 ID 사용)
        let thumbnailUrl = existingThumbnail;
        if (thumbnailFile) {
            thumbnailUrl = await uploadAdThumbnail(thumbnailFile, adId);
        }
        
        // 에디터 이미지 처리 (광고 ID 사용)
        const processedImages = await processEditorImages(
            quill, 
            previewImages, 
            async (file) => {
                if (file instanceof File) {
                    return await uploadSingleDetailImage(file, adId);
                }
                console.error('Invalid file type:', file);
                return null;
            },
            adId,
            'detail'
        );
        
        // 이벤트 에디터 이미지 처리 (유흥주점/건전마사지 카테고리)
        let eventInfo = '';
        if ((categoryInput.value === '유흥주점' || categoryInput.value === '건전마사지') && eventQuill) {
            // 이벤트 에디터의 이미지만 처리
            await processEditorImages(
                eventQuill, 
                previewImages, 
                async (file) => {
                    if (file instanceof File) {
                        return await uploadSingleEventImage(file, adId);
                    }
                    return null;
                },
                adId,
                'event'
            );
            eventInfo = eventQuill.root.innerHTML;
        }
        
        // 카테고리별 추가 데이터 수집
        const categoryData = collectCategoryData(categoryInput.value, eventQuill);
        
        // 업데이트할 광고 데이터
        const updatedData = {
            // 기본 정보
            adId: adId,  // 광고 ID 유지
            author: authorInput.value,
            authorId: currentAd.authorId,  // 기존 authorId 유지
            category: categoryInput.value,
            businessName: businessNameValue,
            businessType: businessTypeInput.value || '',
            
            // 위치 정보
            region: regionInput.value,
            city: cityInput.value || '',
            
            // 연락처 정보
            phone: phoneValue,
            kakao: document.getElementById('kakao')?.value || '',
            telegram: document.getElementById('telegram')?.value || '',
            
            // 콘텐츠
            content: editorContent,
            eventInfo: eventInfo,  // eventContent가 아니라 eventInfo
            thumbnail: thumbnailUrl,
            // images 필드 제거
            
            // 카테고리별 추가 데이터
            ...categoryData,
            
            // 메타 정보 (기존 값 유지 및 업데이트)
            createdAt: currentAd.createdAt,  // 생성일은 유지
            updatedAt: Date.now(),  // 수정일만 업데이트
            views: currentAd.views || 0,
            bookmarks: currentAd.bookmarks || [],
            reviews: currentAd.reviews || {},
            status: currentAd.status || 'pending'
        };
        
        // Firebase 업데이트
        await update(ref(rtdb, `advertisements/${adId}`), updatedData);
        
        alert('광고가 성공적으로 수정되었습니다.');
        window.location.href = '/ad-posting/ad-management.html';
        
    } catch (error) {
        console.error('광고 수정 실패:', error);
        alert('광고 수정에 실패했습니다. 다시 시도해주세요.');
        submitButton.disabled = false;
        submitButton.textContent = '수정 완료';
    }
}