import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let currentUser = null;
let userData = null;

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadUserStats();
        } else {
            // 로그인되지 않은 경우 로그인 페이지로
            window.location.href = '/auth/login.html';
        }
    });
}

// 사용자 데이터 로드
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            displayUserInfo();
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 사용자 정보 표시
function displayUserInfo() {
    // 닉네임
    const nicknameEl = document.getElementById('user-nickname');
    if (nicknameEl) {
        nicknameEl.textContent = userData.nickname || '회원';
    }
    
    // 회원 타입
    const memberTypeEl = document.getElementById('member-type');
    if (memberTypeEl) {
        if (userData.userType === 'business') {
            memberTypeEl.textContent = '업체';
        } else if (userData.userType === 'administrator') {
            memberTypeEl.textContent = '관리자';
        } else {
            memberTypeEl.textContent = '일반';
        }
    }
    
    // 레벨 (일반회원만)
    const levelEl = document.getElementById('user-level');
    if (levelEl) {
        if (userData.userType === 'member') {
            const level = userData.level || 1;
            levelEl.textContent = `Lv.${level}`;
            levelEl.style.display = 'inline-block';
        } else {
            levelEl.style.display = 'none';
        }
    }
    
    // 프로필 이미지
    const profileImg = document.getElementById('profile-img');
    if (profileImg) {
        if (userData.userType === 'member' && userData.level) {
            profileImg.src = `/img/level/lv${userData.level}.png`;
        } else if (userData.userType === 'business') {
            profileImg.src = '/img/business.png';
        } else {
            profileImg.src = '/img/user-icon.png';
        }
    }
    
    // 포인트 그리드 표시/숨김 (일반회원만 표시)
    const pointGrid = document.querySelector('.point-grid');
    if (pointGrid) {
        if (userData.userType === 'member') {
            pointGrid.style.display = 'grid';
            
            // 포인트 표시
            const pointValueEl = document.querySelector('.point-item:first-child .point-value');
            if (pointValueEl) {
                const points = userData.points || 0;
                pointValueEl.textContent = `${points.toLocaleString()} P`;
            }
        } else {
            // 업체회원이나 관리자는 포인트 그리드 숨김
            pointGrid.style.display = 'none';
        }
    }
    
    // 프로필 섹션 표시
    const profileSection = document.querySelector('.profile-section');
    if (profileSection) {
        profileSection.style.display = 'block';
    }
}

// 사용자 통계 로드
async function loadUserStats() {
    // 일반회원이 아닌 경우 통계 로드 건너뛰기
    if (userData.userType !== 'member') {
        return;
    }
    
    try {
        // 후기 개수 표시 (Firestore에서 직접 가져오기)
        const reviewCountEl = document.getElementById('review-count');
        if (reviewCountEl) {
            const reviewCount = userData.reviews_count || 0;
            reviewCountEl.textContent = `${reviewCount}개`;
        }
        
        // 즐겨찾기 개수 표시
        const bookmarkCountEl = document.getElementById('bookmark-count');
        if (bookmarkCountEl) {
            const bookmarks = userData.bookmarks || [];
            bookmarkCountEl.textContent = `${bookmarks.length}개`;
        }
        
    } catch (error) {
        console.error('통계 로드 실패:', error);
    }
}