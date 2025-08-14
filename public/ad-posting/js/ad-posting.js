import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, push, set, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
    processEditorImages,
    initializeEventEditor,
    setupTablePriceEvents,
    toggleCategorySpecificFields,
    collectCategoryData,
    // 백그라운드 업로드 함수
    startBackgroundUpload,
    uploadSingleDetailImage
} from './modules/index.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let quill = null;
let previewImages = new Map();
let thumbnailFile = null;

// DOM 요소
const form = document.getElementById('ad-posting-form');
const authorInput = document.getElementById('author');
const categoryInput = document.getElementById('category');
const categoryButtons = document.getElementById('category-buttons');
const regionInput = document.getElementById('region');
const cityInput = document.getElementById('city');
const businessTypeInput = document.getElementById('business-type');
const contentInput = document.getElementById('content');

// 이미지 URL 생성 함수
function generateImageUrl(adId, type, index, fileName) {
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
    const imageName = `${type}_${index}_${timestamp}_${cleanFileName}`;
    return `https://ik.imagekit.io/leadproject/entmarvel/advertise/${adId}/${type}/${imageName}`;
}

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // DOM 요소가 제대로 로드되었는지 확인
    console.log('DOM 요소 확인:');
    console.log('폼:', form);
    console.log('작성자 입력:', authorInput);
    console.log('카테고리 입력:', categoryInput);
    console.log('카테고리 버튼 컨테이너:', categoryButtons);
    
    if (!form || !authorInput || !categoryInput || !categoryButtons) {
        console.error('필수 DOM 요소를 찾을 수 없습니다!');
        console.error('form:', form);
        console.error('authorInput:', authorInput);
        console.error('categoryInput:', categoryInput);
        console.error('categoryButtons:', categoryButtons);
        return;
    }
    
    // Quill 에디터 초기화
    quill = initializeQuillEditor();
    
    // 이벤트 에디터 초기화 (텍스트 필드만 사용)
    initializeEventEditor();
    
    // 이미지 핸들러 설정
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', createImageHandler(quill, previewImages));
    
    // 주대 추가/삭제 이벤트 설정
    setupTablePriceEvents();
    
    // 인증 상태 확인
    checkAuth();
    
    // 데이터 로드 및 카테고리 버튼 생성
    const categoryData = await loadCategoryData();
    console.log('로드된 카테고리 데이터:', categoryData);
    
    // 카테고리 버튼 생성
    if (categoryButtons && categoryData) {
        console.log('카테고리 버튼 생성 시작');
        createCategoryButtons(categoryButtons, categoryInput, async (categoryName) => {
            // 카테고리 선택 시 입력 필드에 값 설정
            if (categoryInput) {
                categoryInput.value = categoryName;
                console.log('선택된 카테고리:', categoryName);
            }
            
            // 카테고리별 필드 표시/숨김
            toggleCategorySpecificFields(categoryName);
            
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
        console.log('썸네일 파일 선택:', file);
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
            checkExistingAd();
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
                alert('업체회원만 광고를 등록할 수 있습니다.');
                window.location.href = '/main/main.html';
                return;
            }
            
            // 작성자 필드 설정
            if (authorInput) {
                authorInput.value = currentUserData.nickname || currentUserData.email || '익명';
                console.log('작성자 설정:', authorInput.value);
            }
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 기존 광고 확인 (일반 업체회원만)
function checkExistingAd() {
    if (currentUserData.userType === 'administrator') {
        return; // 관리자는 제한 없음
    }
    
    const adsRef = ref(rtdb, 'advertisements');
    onValue(adsRef, (snapshot) => {
        const ads = snapshot.val();
        if (ads) {
            const userAds = Object.entries(ads).filter(([key, ad]) => {
                return Array.isArray(ad.authorId) 
                    ? ad.authorId.includes(currentUser.uid)
                    : ad.authorId === currentUser.uid;
            });
            
            if (userAds.length > 0) {
                alert('이미 등록된 광고가 있습니다. 기존 광고를 수정해주세요.');
                window.location.href = '/ad-posting/ad-management.html';
            }
        }
    }, { onlyOnce: true });
}

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';
    
    try {
        // ===== 필수 입력 필드 유효성 검증 =====
        
        // 1. 카테고리 확인
        if (!categoryInput.value) {
            alert('카테고리를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 2. 작성자 확인
        if (!authorInput.value.trim()) {
            alert('작성자를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 3. 업소명 검증
        const businessNameValue = document.getElementById('business-name')?.value.trim();
        if (!businessNameValue || businessNameValue === '') {
            alert('업소명을 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 4. 전화번호 검증
        const phoneValue = document.getElementById('phone')?.value.trim();
        if (!phoneValue || phoneValue === '') {
            alert('전화번호를 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 5. 지역 검증
        if (!regionInput.value || regionInput.value === '') {
            alert('지역을 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // 6. 도시 검증
        if (!cityInput.value || cityInput.value === '') {
            alert('도시를 선택해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '광고 등록';
            return;
        }
        
        // ===== 광고 데이터 처리 =====
        
        // 1. 먼저 광고 ID 생성
        const newAdRef = push(ref(rtdb, 'advertisements'));
        const adId = newAdRef.key;
        console.log('생성된 광고 ID:', adId);
        
        // 2. 에디터 콘텐츠 처리 - 정규식으로 모든 base64 이미지 교체
        let contentHtml = quill.root.innerHTML;
        let eventText = ''; // 텍스트로 변경
        
        if (categoryInput.value === '유흥주점' || categoryInput.value === '건전마사지') {
            const eventTextarea = document.getElementById('event-textarea');
            eventText = eventTextarea ? eventTextarea.value : '';
        }
        
        // 3. 이미지 파일 수집
        const detailFiles = [];
        
        // 상세 이미지 처리 - 정규식으로 base64 이미지 찾아서 교체
        const detailImgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/gi;
        let detailMatch;
        let detailIndex = 0;
        
        const detailReplacements = [];
        
        while ((detailMatch = detailImgRegex.exec(contentHtml)) !== null) {
            const fullImgTag = detailMatch[0];
            const base64Src = detailMatch[1];
            
            // previewImages에서 파일 찾기
            const file = previewImages.get(base64Src);
            if (file) {
                detailFiles.push(file);
                // 교체할 내용 저장
                detailReplacements.push({
                    original: fullImgTag,
                    replacement: `<img src="DETAIL_IMAGE_${detailIndex}">`
                });
                detailIndex++;
            }
        }
        
        // 모든 교체 수행
        detailReplacements.forEach(({original, replacement}) => {
            contentHtml = contentHtml.replace(original, replacement);
        });
        
        // 디버깅: placeholder가 제대로 생성되었는지 확인
        console.log('Content HTML (처음 200자):', contentHtml.substring(0, 200));
        console.log('Event Text:', eventText);
        console.log('상세 이미지 파일 수:', detailFiles.length);
        
        // 4. 카테고리별 추가 데이터 수집
        const categoryData = collectCategoryData(categoryInput.value);
        // eventInfo는 텍스트로 설정
        if (categoryInput.value === '유흥주점' || categoryInput.value === '건전마사지') {
            categoryData.eventInfo = eventText;
        }
        
        // 5. 광고 데이터 생성 (placeholder 포함)
        const adData = {
            // 기본 정보
            adId: adId,
            author: authorInput.value,
            authorId: [currentUser.uid],
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
            
            // 콘텐츠 (placeholder 포함)
            content: contentHtml,
            eventInfo: eventText, // HTML이 아닌 텍스트로 저장
            
            // 썸네일 (일단 빈 값)
            thumbnail: '',
            
            // 업로드 상태
            uploadStatus: (thumbnailFile || detailFiles.length > 0) ? 'uploading' : 'completed',
            
            // 카테고리별 추가 데이터
            ...categoryData,
            
            // 메타 정보
            createdAt: Date.now(),
            updatedAt: Date.now(),
            views: 0,
            bookmarks: [],
            reviews: {},
            status: currentUserData.userType === 'administrator' ? 'active' : 'pending'
        };
        
        // 6. DB에 저장
        await set(newAdRef, adData);
        console.log('광고 저장 완료:', adId);
        
        // 7. 이미지 업로드 API 호출
        if (thumbnailFile || detailFiles.length > 0) {
            console.log('이미지 업로드 API 호출 준비...');
            
            // startBackgroundUpload 호출 - await 없이 백그라운드에서 실행
            startBackgroundUpload(
                adId, 
                thumbnailFile, 
                detailFiles, 
                [] // eventFiles는 이제 없음
            ).then(uploadResult => {
                if (uploadResult.success) {
                    console.log('백그라운드 업로드 성공');
                } else {
                    console.error('백그라운드 업로드 실패:', uploadResult.error);
                }
            }).catch(error => {
                console.error('백그라운드 업로드 에러:', error);
            });
            
            console.log('API 호출 시작됨 - 백그라운드에서 진행 중');
        }

        // 8. 페이지 이동 전 1초 대기
        console.log('페이지 이동 전 1초 대기...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 9. 알림 및 페이지 이동
        alert('광고가 성공적으로 등록되었습니다! 이미지는 백그라운드에서 업로드됩니다.');

        if (currentUserData.userType === 'administrator') {
            console.log('관리자 계정 - ad-management.html로 이동');
            window.location.href = '/ad-posting/ad-management.html';
        } else {
            console.log('일반 업체회원 - main.html로 이동');
            window.location.href = '/main/main.html';
        }
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다. 다시 시도해주세요.');
        submitButton.disabled = false;
        submitButton.textContent = '광고 등록';
    }
}