import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, onValue, remove, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let currentAd = null;
let currentAdId = null;
let currentImageIndex = 0;
let adImages = [];

// DOM 요소
const adTitle = document.getElementById('ad-title');
const businessTypeBadge = document.getElementById('business-type-badge');
const locationBadge = document.getElementById('location-badge');
const adMainImage = document.getElementById('ad-main-image');
const adDescription = document.getElementById('ad-description');
const favoriteCount = document.getElementById('favorite-count');
const viewCount = document.getElementById('view-count');
const reviewCount = document.getElementById('review-count');
const approvalStatus = document.getElementById('approval-status');
const emptyState = document.getElementById('empty-state');
const adDetailContent = document.querySelector('.ad-detail-content');
const imageDots = document.getElementById('image-dots');

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 인증 상태 확인
    checkAuth();
    
    // 이벤트 리스너 설정
    setupEventListeners();
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // 사용자 유형 확인
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                // business 또는 administrator만 접근 가능
                if (currentUserData.userType !== 'business' && currentUserData.userType !== 'administrator') {
                    alert('업체회원 또는 관리자만 접근 가능합니다.');
                    window.location.href = '/main/main.html';
                    return;
                }
            }
            // 광고 로드
            loadUserAd();
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
        }
    });
}

// 사용자의 첫 번째 광고 또는 최신 광고 로드
function loadUserAd() {
    const adsRef = ref(rtdb, 'advertisements');
    
    onValue(adsRef, (snapshot) => {
        const data = snapshot.val();
        let userAds = [];
        
        if (data) {
            // 사용자의 광고만 필터링
            Object.entries(data).forEach(([key, value]) => {
                if (currentUserData.userType === 'administrator' || value.authorId === currentUser.uid) {
                    userAds.push({ id: key, ...value });
                }
            });
        }
        
        if (userAds.length > 0) {
            // 최신 광고 선택 (가장 최근에 생성된 것)
            userAds.sort((a, b) => b.createdAt - a.createdAt);
            currentAd = userAds[0];
            currentAdId = currentAd.id;
            
            // UI 업데이트
            displayAdDetail();
            emptyState.style.display = 'none';
        } else {
            // 광고가 없을 때
            adDetailContent.style.display = 'none';
            emptyState.style.display = 'block';
        }
    });
}

// 광고 상세 정보 표시
function displayAdDetail() {
    if (!currentAd) return;
    
    // 제목
    adTitle.textContent = currentAd.title || '제목 없음';
    
    // 업종 배지
    businessTypeBadge.textContent = currentAd.businessType || '업종';
    
    // 지역 배지
    const location = currentAd.city ? 
        `📍 ${currentAd.region} ${currentAd.city}` : 
        `📍 ${currentAd.region || '지역'}`;
    locationBadge.textContent = location;
    
    // 이미지 설정
    setupImages();
    
    // 광고 설명 (HTML 콘텐츠)
    if (currentAd.content) {
        adDescription.innerHTML = currentAd.content;
    } else {
        adDescription.innerHTML = '<p>광고 상세 내용이 없습니다.</p>';
    }
    
    // 통계 정보
    // bookmarks 배열의 길이 체크
    const bookmarkCount = currentAd.bookmarks ? currentAd.bookmarks.length : 0;
    favoriteCount.textContent = `${bookmarkCount} 회`;
    
    // views 표시
    viewCount.textContent = `${currentAd.views || 0} 회`;
    
    // reviews 맵의 개수 체크
    const reviewsCount = currentAd.reviews ? Object.keys(currentAd.reviews).length : 0;
    reviewCount.textContent = `${reviewsCount} 회`;
    
    // 승인 상태
    const statusText = {
        'active': '광고중',
        'pending': '승인대기',
        'inactive': '비활성',
        'rejected': '거절됨'
    };
    approvalStatus.textContent = statusText[currentAd.status] || '알 수 없음';
    approvalStatus.style.color = currentAd.status === 'active' ? '#4CAF50' : 
                                 currentAd.status === 'pending' ? '#FFA500' : '#888';
}

// 이미지 설정
function setupImages() {
    adImages = [];
    
    // 썸네일 추가
    if (currentAd.thumbnail) {
        adImages.push(currentAd.thumbnail);
    }
    
    // 추가 이미지들
    if (currentAd.images && Array.isArray(currentAd.images)) {
        adImages = adImages.concat(currentAd.images);
    }
    
    // 기본 이미지가 없으면
    if (adImages.length === 0) {
        adImages.push('/img/default-ad.jpg');
    }
    
    // 첫 번째 이미지 표시
    currentImageIndex = 0;
    updateImage();
    
    // 이미지 도트 생성
    createImageDots();
    
    // 이미지가 1개면 네비게이션 숨기기
    const navButtons = document.querySelectorAll('.image-nav-btn');
    if (adImages.length <= 1) {
        navButtons.forEach(btn => btn.style.display = 'none');
        imageDots.style.display = 'none';
    } else {
        navButtons.forEach(btn => btn.style.display = 'block');
        imageDots.style.display = 'flex';
    }
}

// 이미지 업데이트
function updateImage() {
    adMainImage.src = adImages[currentImageIndex];
    updateDots();
}

// 이미지 도트 생성
function createImageDots() {
    imageDots.innerHTML = '';
    adImages.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'dot';
        if (index === currentImageIndex) {
            dot.classList.add('active');
        }
        dot.addEventListener('click', () => {
            currentImageIndex = index;
            updateImage();
        });
        imageDots.appendChild(dot);
    });
}

// 도트 업데이트
function updateDots() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index === currentImageIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 이전 이미지
    document.getElementById('prev-image').addEventListener('click', () => {
        if (adImages.length > 1) {
            currentImageIndex = (currentImageIndex - 1 + adImages.length) % adImages.length;
            updateImage();
        }
    });
    
    // 다음 이미지
    document.getElementById('next-image').addEventListener('click', () => {
        if (adImages.length > 1) {
            currentImageIndex = (currentImageIndex + 1) % adImages.length;
            updateImage();
        }
    });
    
    // 수정 버튼
    document.getElementById('btn-edit').addEventListener('click', () => {
        if (currentAdId) {
            window.location.href = `/ad-posting/ad-edit.html?id=${currentAdId}`;
        }
    });
    
    // 삭제 버튼
    document.getElementById('btn-delete').addEventListener('click', async () => {
        if (currentAdId && confirm(`"${currentAd.title}" 광고를 삭제하시겠습니까?`)) {
            try {
                await remove(ref(rtdb, `advertisements/${currentAdId}`));
                alert('광고가 삭제되었습니다.');
                window.location.reload();
            } catch (error) {
                console.error('광고 삭제 실패:', error);
                alert('광고 삭제에 실패했습니다.');
            }
        }
    });
}