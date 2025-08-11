import { rtdb, auth, db } from '/js/firebase-config.js';
import { ref, get, update, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { setupReviews } from './reviews.js';
import { setupModals } from './modals.js';

// 전역 변수
export let currentAd = null;
export let adId = null;
let currentUser = null;
let isBookmarked = false;

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // URL에서 광고 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    adId = urlParams.get('id');
    
    if (!adId) {
        showError('잘못된 접근입니다.');
        return;
    }
    
    // 인증 상태 확인
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            await checkBookmarkStatus();
        }
    });
    
    // 컴포넌트 로드
    await loadComponents();
    
    // 광고 데이터 로드
    await loadAdDetail(adId);
    
    // 모달 설정
    setupModals();
    
    // 후기 설정
    setupReviews(adId);
    
    // 탭 설정
    setupTabs();
    
    // 즐겨찾기 버튼 설정
    setupBookmarkButton();
});

// 컴포넌트 로드
async function loadComponents() {
    try {
        // 헤더 컴포넌트
        const headerResponse = await fetch('components/business-header.html');
        const headerHtml = await headerResponse.text();
        document.getElementById('business-header-container').innerHTML = headerHtml;
        
        // 탭 컴포넌트
        const tabsResponse = await fetch('components/business-tabs.html');
        const tabsHtml = await tabsResponse.text();
        document.getElementById('business-tabs-container').innerHTML = tabsHtml;
    } catch (error) {
        console.error('컴포넌트 로드 실패:', error);
    }
}

// 광고 상세 정보 로드
async function loadAdDetail(adId) {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            showError('광고를 찾을 수 없습니다.');
            return;
        }
        
        currentAd = snapshot.val();
        
        // 조회수 증가
        await updateViewCount(adId, currentAd.views || 0);
        
        // 페이지 타이틀 업데이트 - businessName 사용
        document.title = `${currentAd.businessName} - 유흥마블`;
        
        // 데이터 표시
        setBusinessHeader(currentAd);
        setDetailContent(currentAd);
        
    } catch (error) {
        console.error('광고 로드 실패:', error);
        showError('광고를 불러오는데 실패했습니다.');
    }
}

// 업체 헤더 설정 - businessName 필드 사용
function setBusinessHeader(data) {
    const thumbnail = document.getElementById('business-thumbnail');
    const businessName = document.getElementById('business-name');
    const businessType = document.getElementById('business-type');
    const businessLocation = document.getElementById('business-location');
    const viewCount = document.getElementById('view-count');
    const reviewCount = document.getElementById('review-count');
    const bookmarkCount = document.getElementById('bookmark-count');
    
    if (thumbnail) {
        const thumbnailSrc = data.thumbnail || 
            (data.businessTypeCode ? `/img/business-type/${data.businessTypeCode}.png` : null);
            
        if (thumbnailSrc) {
            thumbnail.src = thumbnailSrc;
            thumbnail.style.display = 'block';
            thumbnail.onerror = function() {
                this.style.display = 'none';
            };
        }
    }
    
    // businessName과 author를 조합
    if (businessName) businessName.textContent = `${data.businessName || ''} - ${data.author || ''}`;
    if (businessType) businessType.textContent = `${data.businessType || ''}`;
    if (businessLocation) businessLocation.textContent = `${data.region || ''} ${data.city || ''}`;
    
    // 통계 정보 표시 (문의 카운트 제거)
    if (viewCount) viewCount.textContent = data.views || 0;
    if (reviewCount) reviewCount.textContent = data.reviewCount || 0;
    if (bookmarkCount) {
        const bookmarks = data.bookmarks || [];
        bookmarkCount.textContent = Array.isArray(bookmarks) ? bookmarks.length : 0;
    }
}

// 상세내용 설정
function setDetailContent(data) {
    const detailContent = document.getElementById('detail-content');
    
    if (detailContent) {
        detailContent.innerHTML = data.content || '';
    }
}

// 조회수 업데이트
async function updateViewCount(adId, currentViews) {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        await update(adRef, {
            views: (currentViews || 0) + 1
        });
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}

// 탭 설정
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // 모든 탭 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 선택된 탭 활성화
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
    
    // URL 파라미터로 탭 전환
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'reviews') {
        document.querySelector('[data-tab="reviews"]').click();
    }
}

// 즐겨찾기 상태 확인
async function checkBookmarkStatus() {
    if (!currentUser || !adId) return;
    
    try {
        // 광고의 bookmarks 배열에서 현재 사용자 uid 확인
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (snapshot.exists()) {
            const adData = snapshot.val();
            const bookmarks = adData.bookmarks || [];
            isBookmarked = bookmarks.includes(currentUser.uid);
            updateBookmarkButton();
        }
    } catch (error) {
        console.error('즐겨찾기 상태 확인 실패:', error);
    }
}

// 즐겨찾기 버튼 설정
function setupBookmarkButton() {
    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (!bookmarkBtn) return;
    
    bookmarkBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = '/login/login.html';
            return;
        }
        
        try {
            const adRef = ref(rtdb, `advertisements/${adId}`);
            const snapshot = await get(adRef);
            const adData = snapshot.val();
            const bookmarks = adData.bookmarks || [];
            
            if (isBookmarked) {
                // 즐겨찾기 제거 - 광고의 bookmarks 배열에서 uid 제거
                const updatedBookmarks = bookmarks.filter(uid => uid !== currentUser.uid);
                await update(adRef, {
                    bookmarks: updatedBookmarks
                });
                
                // 사용자 문서에서도 제거
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, {
                    bookmarks: arrayRemove(adId)
                });
                
                isBookmarked = false;
                alert('즐겨찾기가 해제되었습니다.');
                
                // 즐겨찾기 수 업데이트
                const bookmarkCount = document.getElementById('bookmark-count');
                if (bookmarkCount) {
                    bookmarkCount.textContent = updatedBookmarks.length;
                }
            } else {
                // 즐겨찾기 추가 - 광고의 bookmarks 배열에 uid 추가
                const updatedBookmarks = [...bookmarks, currentUser.uid];
                await update(adRef, {
                    bookmarks: updatedBookmarks
                });
                
                // 사용자 문서에도 추가
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, {
                    bookmarks: arrayUnion(adId)
                });
                
                isBookmarked = true;
                alert('즐겨찾기에 추가되었습니다.');
                
                // 즐겨찾기 수 업데이트
                const bookmarkCount = document.getElementById('bookmark-count');
                if (bookmarkCount) {
                    bookmarkCount.textContent = updatedBookmarks.length;
                }
            }
            
            updateBookmarkButton();
        } catch (error) {
            console.error('즐겨찾기 처리 실패:', error);
            alert('즐겨찾기 처리 중 오류가 발생했습니다.');
        }
    });
    
    // 전화 문의하기 버튼
    const callBtn = document.getElementById('btn-call');
    if (callBtn && currentAd) {
        callBtn.addEventListener('click', async () => {
            if (currentAd.phone) {
                // 문의 카운트 증가
                try {
                    const adRef = ref(rtdb, `advertisements/${adId}`);
                    const snapshot = await get(adRef);
                    const currentInquiries = snapshot.val().inquiries || 0;
                    
                    await update(adRef, {
                        inquiries: currentInquiries + 1,
                        lastInquiryDate: new Date().toISOString()
                    });
                    
                    console.log('문의 카운트 증가 완료');
                } catch (error) {
                    console.error('문의 카운트 업데이트 실패:', error);
                }
                
                // 전화 걸기
                window.location.href = `tel:${currentAd.phone}`;
            } else {
                alert('전화번호가 등록되지 않았습니다.');
            }
        });
    }
}

// 즐겨찾기 버튼 UI 업데이트
function updateBookmarkButton() {
    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (!bookmarkBtn) return;
    
    const starOutline = bookmarkBtn.querySelector('.star-outline');
    const starFilled = bookmarkBtn.querySelector('.star-filled');
    const bookmarkText = bookmarkBtn.querySelector('.bookmark-text');
    
    if (isBookmarked) {
        bookmarkBtn.classList.add('bookmarked');
        if (starOutline) starOutline.style.display = 'none';
        if (starFilled) starFilled.style.display = 'block';
        if (bookmarkText) bookmarkText.textContent = '즐겨찾기';
    } else {
        bookmarkBtn.classList.remove('bookmarked');
        if (starOutline) starOutline.style.display = 'block';
        if (starFilled) starFilled.style.display = 'none';
        if (bookmarkText) bookmarkText.textContent = '즐겨찾기';
    }
}

// 에러 표시
function showError(message) {
    const container = document.querySelector('.business-detail-container');
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}