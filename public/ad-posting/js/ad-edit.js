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
    await loadCategoryData();
    
    // 카테고리 버튼 생성 및 이벤트 처리
    if (categoryButtons) {
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
    } else {
        console.error('카테고리 버튼 컨테이너를 찾을 수 없습니다.');
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
    // 기본 정보
    authorInput.value = currentAd.author || '';
    document.getElementById('title').value = currentAd.title || '';
    document.getElementById('business-name').value = currentAd.businessName || '';
    document.getElementById('contact').value = currentAd.contact || '';
    document.getElementById('business-hours').value = currentAd.businessHours || '';
    document.getElementById('description').value = currentAd.description || '';
    
    // 카테고리 선택
    const categoryButton = Array.from(categoryButtons.querySelectorAll('.category-button'))
        .find(btn => btn.textContent === currentAd.category);
    if (categoryButton) {
        categoryButton.click();
        
        // 업종 데이터 로드 후 선택
        const types = await loadBusinessTypes(currentAd.category);
        if (types) {
            createBusinessTypeOptions(types);
            setTimeout(() => {
                setSelectValue('business-type', currentAd.businessType);
            }, 100);
        }
    }
    
    // 지역 정보
    setSelectValue('region', currentAd.region);
    if (currentAd.region) {
        await updateCityOptions(currentAd.region);
        setTimeout(() => {
            setSelectValue('city', currentAd.city);
        }, 100);
    }
    
    // 주소
    document.getElementById('address').value = currentAd.address || '';
    document.getElementById('detail-address').value = currentAd.detailAddress || '';
    
    // 에디터 내용
    if (currentAd.content) {
        setEditorContent(quill, currentAd.content);
    }
    
    // 이벤트 에디터 내용 (유흥주점)
    if (currentAd.category === '유흥주점' && currentAd.eventContent) {
        setEditorContent(eventQuill, currentAd.eventContent);
    }
    
    // 썸네일
    if (currentAd.thumbnail) {
        existingThumbnail = currentAd.thumbnail;
        const thumbnailImage = document.getElementById('thumbnail-image');
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
        showThumbnailFromUrl(currentAd.thumbnail, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
    }
    
    // 카테고리별 추가 데이터 (주대, 코스 등)
    if (currentAd.tablePrices && currentAd.tablePrices.length > 0) {
        fillTablePrices(currentAd.tablePrices);
    }
    
    if (currentAd.courses && currentAd.courses.length > 0) {
        fillCourses(currentAd.courses);
    }
}

// 주대 정보 채우기
function fillTablePrices(tablePrices) {
    const container = document.getElementById('table-price-items');
    if (!container) return;
    
    container.innerHTML = '';
    tablePrices.forEach(item => {
        const div = document.createElement('div');
        div.className = 'table-price-item';
        div.innerHTML = `
            <input type="text" placeholder="주대 이름" value="${item.name || ''}" class="table-name">
            <input type="text" placeholder="가격" value="${item.price || ''}" class="table-price">
            <button type="button" class="delete-table-btn">삭제</button>
        `;
        container.appendChild(div);
    });
}

// 코스 정보 채우기
function fillCourses(courses) {
    const container = document.getElementById('course-items');
    if (!container) return;
    
    container.innerHTML = '';
    courses.forEach(item => {
        const div = document.createElement('div');
        div.className = 'course-item';
        div.innerHTML = `
            <input type="text" placeholder="코스 이름" value="${item.name || ''}" class="course-name">
            <input type="text" placeholder="가격" value="${item.price || ''}" class="course-price">
            <button type="button" class="delete-course-btn">삭제</button>
        `;
        container.appendChild(div);
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
            submitButton.textContent = '광고 수정';
            return;
        }
        
        // 2. 작성자 확인
        if (!authorInput.value.trim()) {
            alert('작성자를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 수정';
            return;
        }
        
        // 3. 나머지 필수 필드 검증
        const title = document.getElementById('title').value.trim();
        const businessName = document.getElementById('business-name').value.trim();
        const contact = document.getElementById('contact').value.trim();
        const address = document.getElementById('address').value.trim();
        
        if (!title || !businessName || !contact || !address) {
            alert('필수 입력 항목을 모두 작성해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 수정';
            return;
        }
        
        // 썸네일 처리 (광고 ID 사용)
        let thumbnailUrl = existingThumbnail;
        if (thumbnailFile) {
            thumbnailUrl = await uploadAdThumbnail(thumbnailFile, adId);
        }
        
        // 에디터 이미지 처리 (광고 ID 사용)
        const processedImages = await processEditorImages(
            quill, 
            previewImages, 
            async (file) => await uploadSingleDetailImage(file, adId),
            adId,
            'detail'
        );
        
        // 이벤트 에디터 이미지 처리 (유흥주점 카테고리)
        let eventContent = '';
        let eventImages = [];
        if (categoryInput.value === '유흥주점' && eventQuill) {
            eventImages = await processEditorImages(
                eventQuill, 
                previewImages, 
                async (file) => await uploadSingleEventImage(file, adId),
                adId,
                'event'
            );
            eventContent = eventQuill.root.innerHTML;
        }
        
        // 카테고리별 추가 데이터 수집
        const categoryData = collectCategoryData(categoryInput.value, eventQuill);
        
        // 업데이트할 광고 데이터
        const updatedData = {
            // 기본 정보
            adId: adId,  // 광고 ID 유지
            author: authorInput.value,
            authorId: currentAd.authorId,  // 기존 authorId 유지
            title: title,
            category: categoryInput.value,
            businessName: businessName,
            businessType: businessTypeInput.value || '',
            
            // 위치 정보
            region: regionInput.value,
            city: cityInput.value || '',
            address: address,
            detailAddress: document.getElementById('detail-address').value || '',
            
            // 연락처 정보
            contact: contact,
            businessHours: document.getElementById('business-hours').value || '',
            
            // 콘텐츠
            content: quill.root.innerHTML,
            eventContent: eventContent,
            description: document.getElementById('description').value || '',
            thumbnail: thumbnailUrl,
            images: [...processedImages, ...eventImages],
            
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
        submitButton.textContent = '광고 수정';
    }
}