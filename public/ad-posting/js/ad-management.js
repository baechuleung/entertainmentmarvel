import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, onValue, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let currentAd = null;
let currentAdId = null;
let adImages = [];
let currentImageIndex = 0;

// DOM 요소
const adTitle = document.getElementById('ad-title');
const businessTypeBadge = document.getElementById('business-type-badge');
const locationBadge = document.getElementById('location-badge');
const adMainImage = document.getElementById('ad-main-image');
const imageDots = document.getElementById('image-dots');
const adDescription = document.getElementById('ad-description');
const favoriteCount = document.getElementById('favorite-count');
const viewCount = document.getElementById('view-count');
const reviewCount = document.getElementById('review-count');
const approvalStatus = document.getElementById('approval-status');
const emptyState = document.getElementById('empty-state');
const adDetailContent = document.querySelector('.ad-detail-content');

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            
            // Firestore에서 사용자 정보 가져오기
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                
                // 일반 유저가 접근한 경우 리다이렉트
                if (currentUserData.userType !== 'business' && currentUserData.userType !== 'administrator') {
                    alert('업체회원만 접근 가능합니다.');
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
                // authorId가 배열인 경우와 문자열인 경우 모두 처리
                const hasPermission = Array.isArray(value.authorId) 
                    ? value.authorId.includes(currentUser.uid)
                    : value.authorId === currentUser.uid;
                    
                if (currentUserData.userType === 'administrator' || hasPermission) {
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
    
    // 제목 또는 업소명 표시 (title이 없으면 businessName 사용)
    adTitle.textContent = currentAd.title || currentAd.businessName || '제목 없음';
    
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

// ImageKit에서 이미지들 삭제
async function deleteAllAdImages(ad) {
    const imageUrls = [];
    
    // 썸네일 수집
    if (ad.thumbnail && ad.thumbnail.includes('ik.imagekit.io')) {
        imageUrls.push(ad.thumbnail);
    }
    
    // 상세 이미지들 수집
    if (ad.images && Array.isArray(ad.images)) {
        ad.images.forEach(imageUrl => {
            if (imageUrl && imageUrl.includes('ik.imagekit.io')) {
                imageUrls.push(imageUrl);
            }
        });
    }
    
    // 에디터 내용에서 이미지 URL 추출
    if (ad.content) {
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(ad.content)) !== null) {
            const imageUrl = match[1];
            if (imageUrl && imageUrl.includes('ik.imagekit.io')) {
                imageUrls.push(imageUrl);
            }
        }
    }
    
    if (imageUrls.length === 0) {
        console.log('삭제할 ImageKit 이미지가 없습니다.');
        return;
    }
    
    try {
        // 배포된 Firebase Function 호출
        const response = await fetch('https://imagekit-delete-enujtcasca-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrls: imageUrls,
                userId: currentUser.uid
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('이미지 삭제 결과:', result);
            
            // 삭제 결과 확인
            if (result.summary) {
                console.log(`총 ${result.summary.total}개 중 ${result.summary.deleted}개 삭제 성공`);
            }
            
            // 실패한 파일이 있으면 로그
            if (result.failed && result.failed.length > 0) {
                console.warn('삭제 실패한 파일들:', result.failed);
            }
        } else {
            const errorText = await response.text();
            console.error('이미지 삭제 요청 실패:', errorText);
        }
    } catch (error) {
        console.error('ImageKit 이미지 삭제 오류:', error);
        // 실패해도 광고 삭제는 계속 진행
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 이전 이미지
    document.getElementById('prev-image')?.addEventListener('click', () => {
        if (adImages.length > 1) {
            currentImageIndex = (currentImageIndex - 1 + adImages.length) % adImages.length;
            updateImage();
        }
    });
    
    // 다음 이미지
    document.getElementById('next-image')?.addEventListener('click', () => {
        if (adImages.length > 1) {
            currentImageIndex = (currentImageIndex + 1) % adImages.length;
            updateImage();
        }
    });
    
    // 수정 버튼
    document.getElementById('btn-edit')?.addEventListener('click', () => {
        if (currentAdId) {
            window.location.href = `/ad-posting/ad-edit.html?id=${currentAdId}`;
        }
    });
    
    // 삭제 버튼
    document.getElementById('btn-delete')?.addEventListener('click', async () => {
        const adName = currentAd.businessName || '이 광고';
        if (currentAdId && confirm(`"${adName}"를 삭제하시겠습니까?\n\n삭제된 광고와 이미지는 복구할 수 없습니다.`)) {
            try {
                // 삭제 중 표시
                const deleteBtn = document.getElementById('btn-delete');
                const originalText = deleteBtn.textContent;
                deleteBtn.disabled = true;
                deleteBtn.textContent = '삭제 중...';
                
                // ImageKit에서 이미지들 삭제 (실패해도 계속 진행)
                await deleteAllAdImages(currentAd);
                
                // Firebase에서 광고 삭제
                await remove(ref(rtdb, `advertisements/${currentAdId}`));
                
                alert('광고가 삭제되었습니다.');
                window.location.reload();
                
            } catch (error) {
                console.error('광고 삭제 실패:', error);
                alert('광고 삭제에 실패했습니다.');
                
                // 버튼 원래대로 복구
                const deleteBtn = document.getElementById('btn-delete');
                deleteBtn.disabled = false;
                deleteBtn.textContent = originalText || '광고삭제';
            }
        }
    });
}