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
        
        // 페이지 타이틀 업데이트
        document.title = `${currentAd.title} - 유흥마블`;
        
        // 데이터 표시
        setBusinessHeader(currentAd);
        setDetailContent(currentAd);
        
    } catch (error) {
        console.error('광고 로드 실패:', error);
        showError('광고를 불러오는데 실패했습니다.');
    }
}

// 조회수 업데이트
async function updateViewCount(adId, currentViews) {
    try {
        await update(ref(rtdb, `advertisements/${adId}`), {
            views: currentViews + 1
        });
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}

// 업체 헤더 데이터 설정
function setBusinessHeader(data) {
    const thumbnail = document.getElementById('business-thumbnail');
    const title = document.getElementById('business-title');
    const typeAuthor = document.getElementById('business-type-author');
    const location = document.getElementById('business-location');
    const views = document.getElementById('business-views');
    
    if (thumbnail) {
        // 업종 코드가 있으면 업종별 썸네일 사용
        const thumbnailSrc = data.businessTypeCode ? 
            `/img/business-type/${data.businessTypeCode}.png` : 
            data.thumbnail;
            
        if (thumbnailSrc) {
            thumbnail.src = thumbnailSrc;
            thumbnail.style.display = 'block';
            thumbnail.onerror = function() {
                this.style.display = 'none';
            };
        }
    }
    
    if (title) title.textContent = data.title || '';
    if (typeAuthor) typeAuthor.textContent = `${data.businessType} - ${data.author}`;
    if (location) location.textContent = `${data.region} ${data.city}`;
    if (views) views.textContent = `조회 ${data.views || 0}`;
}

// 상세내용 설정
function setDetailContent(data) {
    const detailContent = document.getElementById('detail-content');
    const contactList = document.getElementById('contact-list');
    
    if (detailContent) {
        detailContent.innerHTML = data.content || '';
    }
    
    if (contactList) {
        let contactHtml = `
            <div class="contact-item">
                <div class="contact-icon">📞</div>
                <span class="contact-label">전화번호</span>
                <span class="contact-value">
                    <a href="tel:${data.phone}">${data.phone}</a>
                </span>
            </div>
        `;
        
        if (data.kakao) {
            contactHtml += `
                <div class="contact-item">
                    <div class="contact-icon">💬</div>
                    <span class="contact-label">카카오톡</span>
                    <span class="contact-value">${data.kakao}</span>
                </div>
            `;
        }
        
        if (data.telegram) {
            contactHtml += `
                <div class="contact-item">
                    <div class="contact-icon">✈️</div>
                    <span class="contact-label">텔레그램</span>
                    <span class="contact-value">${data.telegram}</span>
                </div>
            `;
        }
        
        contactList.innerHTML = contactHtml;
    }
    
    // 전화 버튼 설정
    const btnCall = document.getElementById('btn-call');
    if (btnCall) {
        btnCall.onclick = () => window.location.href = `tel:${data.phone}`;
    }
}

// 탭 설정
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 모든 탭 버튼과 콘텐츠 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 선택한 탭 활성화
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // 후기 탭 선택 시 이벤트 발생
            if (targetTab === 'reviews') {
                window.dispatchEvent(new CustomEvent('loadReviews'));
            }
        });
    });
}

// 에러 표시
function showError(message) {
    const container = document.querySelector('.business-detail-container');
    container.innerHTML = `<div class="error">${message}</div>`;
}

// 즐겨찾기 상태 확인
async function checkBookmarkStatus() {
    if (!currentUser || !adId) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const bookmarks = userData.bookmarks || [];
            isBookmarked = bookmarks.includes(adId);
            updateBookmarkButton();
        }
    } catch (error) {
        console.error('즐겨찾기 상태 확인 실패:', error);
    }
}

// 즐겨찾기 버튼 업데이트
function updateBookmarkButton() {
    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (bookmarkBtn) {
        if (isBookmarked) {
            bookmarkBtn.classList.add('active');
            bookmarkBtn.innerHTML = '⭐';
        } else {
            bookmarkBtn.classList.remove('active');
            bookmarkBtn.innerHTML = '⭐';
        }
    }
}

// 즐겨찾기 버튼 설정
function setupBookmarkButton() {
    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', handleBookmark);
    }
}

// 즐겨찾기 처리
async function handleBookmark() {
    if (!currentUser) {
        if (confirm('즐겨찾기는 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
            const currentUrl = window.location.href;
            window.location.href = `/auth/login.html?returnUrl=${encodeURIComponent(currentUrl)}`;
        }
        return;
    }
    
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const advertiseRef = ref(rtdb, `advertisements/${adId}/bookmarks`);
        
        if (isBookmarked) {
            // 즐겨찾기 제거 - users 컬렉션
            await updateDoc(userRef, {
                bookmarks: arrayRemove(adId)
            });
            
            // advertisements에서 해당 uid 제거
            const snapshot = await get(advertiseRef);
            if (snapshot.exists()) {
                const bookmarks = snapshot.val() || [];
                const updatedBookmarks = bookmarks.filter(uid => uid !== currentUser.uid);
                await set(advertiseRef, updatedBookmarks);
            }
            
            isBookmarked = false;
            alert('즐겨찾기가 해제되었습니다.');
        } else {
            // 즐겨찾기 추가 - users 컬렉션
            await updateDoc(userRef, {
                bookmarks: arrayUnion(adId)
            });
            
            // advertisements에 uid 추가
            const snapshot = await get(advertiseRef);
            const bookmarks = snapshot.exists() ? (snapshot.val() || []) : [];
            if (!bookmarks.includes(currentUser.uid)) {
                bookmarks.push(currentUser.uid);
                await set(advertiseRef, bookmarks);
            }
            
            isBookmarked = true;
            alert('즐겨찾기에 추가되었습니다.');
        }
        
        updateBookmarkButton();
        
    } catch (error) {
        console.error('즐겨찾기 처리 실패:', error);
        alert('즐겨찾기 처리에 실패했습니다.');
    }
}