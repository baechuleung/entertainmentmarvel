import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let currentUser = null;
let userData = null;

// 캐시 키와 만료 시간 (5분)
const CACHE_KEY = 'mypage_user_data';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5분

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

// 캐시 데이터 가져오기
function getCachedData() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            const now = Date.now();
            
            // 캐시가 만료되지 않았고, 같은 사용자인 경우
            if (data.expiry > now && data.uid === currentUser.uid) {
                console.log('캐시된 데이터 사용');
                return data.userData;
            }
        }
    } catch (error) {
        console.error('캐시 읽기 실패:', error);
    }
    return null;
}

// 캐시에 데이터 저장
function setCachedData(data) {
    try {
        const cacheData = {
            userData: data,
            uid: currentUser.uid,
            expiry: Date.now() + CACHE_EXPIRY
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('캐시 저장 실패:', error);
    }
}

// 캐시 무효화
function invalidateCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.error('캐시 삭제 실패:', error);
    }
}

// 사용자 데이터 로드 (forceRefresh: 강제 새로고침 옵션)
async function loadUserData(forceRefresh = false) {
    try {
        // 강제 새로고침이 아닌 경우 캐시 확인
        if (!forceRefresh) {
            const cachedData = getCachedData();
            if (cachedData) {
                userData = cachedData;
                displayUserInfo();
                
                // 백그라운드에서 최신 데이터 확인
                checkForUpdates();
                return;
            }
        }

        // 캐시가 없거나 강제 새로고침인 경우 Firestore에서 로드
        console.log('Firestore에서 데이터 로드');
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            displayUserInfo();
            
            // 캐시에 저장
            setCachedData(userData);
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 백그라운드에서 데이터 업데이트 확인
async function checkForUpdates() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            const latestData = userDoc.data();
            
            // 데이터가 변경되었는지 확인 (주요 필드만 비교)
            const hasChanged = 
                latestData.nickname !== userData.nickname ||
                latestData.level !== userData.level ||
                latestData.points !== userData.points ||
                latestData.reviews_count !== userData.reviews_count ||
                JSON.stringify(latestData.bookmarks) !== JSON.stringify(userData.bookmarks);
            
            if (hasChanged) {
                console.log('데이터 변경 감지 - 업데이트');
                userData = latestData;
                displayUserInfo();
                setCachedData(latestData);
                
                // 통계도 업데이트
                await loadUserStats();
            }
        }
    } catch (error) {
        console.error('업데이트 확인 실패:', error);
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

// 페이지 벗어날 때 캐시 관리 (선택적)
window.addEventListener('beforeunload', () => {
    // 특정 조건에서 캐시 무효화가 필요한 경우
    // invalidateCache();
});

// 페이지가 다시 활성화될 때 데이터 새로고침
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentUser) {
        // 페이지가 다시 보이면 백그라운드에서 업데이트 확인
        checkForUpdates();
    }
});

// 외부에서 캐시 무효화가 필요한 경우를 위한 전역 함수
window.invalidateMypageCache = invalidateCache;

// 데이터 새로고침 함수 (외부에서 호출 가능)
window.refreshMypageData = () => {
    invalidateCache();
    if (currentUser) {
        loadUserData(true);
    }
};