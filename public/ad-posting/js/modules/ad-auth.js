// /ad-posting/js/modules/ad-auth.js
// 인증 및 권한 관리 기능을 담당하는 모듈

import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * 인증 상태 확인
 * @param {Function} onAuthenticated - 인증 성공 콜백
 * @param {Function} onUnauthenticated - 인증 실패 콜백
 */
export function checkAuth(onAuthenticated, onUnauthenticated) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 사용자 정보 로드
            const userData = await getUserData(user.uid);
            if (onAuthenticated) {
                onAuthenticated(user, userData);
            }
        } else {
            if (onUnauthenticated) {
                onUnauthenticated();
            } else {
                // 기본 동작: 로그인 페이지로 리다이렉트
                redirectToLogin();
            }
        }
    });
}

/**
 * 사용자 데이터 가져오기
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 데이터
 */
export async function getUserData(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
        return null;
    }
}

/**
 * 현재 사용자 정보 가져오기
 * @returns {Object} 현재 사용자 정보
 */
export function getCurrentUser() {
    return auth.currentUser;
}

/**
 * 사용자 권한 확인
 * @param {Object} user - 사용자 객체
 * @param {Object} userData - 사용자 데이터
 * @param {string} requiredType - 필요한 사용자 타입
 * @returns {boolean} 권한 여부
 */
export function checkUserPermission(user, userData, requiredType) {
    if (!user || !userData) return false;
    
    // 관리자는 모든 권한 가짐
    if (userData.userType === 'administrator') {
        return true;
    }
    
    // 특정 타입 체크
    if (requiredType && userData.userType !== requiredType) {
        return false;
    }
    
    return true;
}

/**
 * 업체회원 확인
 * @param {Object} userData - 사용자 데이터
 * @returns {boolean} 업체회원 여부
 */
export function isBusinessUser(userData) {
    return userData?.userType === 'business';
}

/**
 * 관리자 확인
 * @param {Object} userData - 사용자 데이터
 * @returns {boolean} 관리자 여부
 */
export function isAdminUser(userData) {
    return userData?.userType === 'administrator';
}

/**
 * 로그인 페이지로 리다이렉트
 * @param {string} returnUrl - 로그인 후 돌아올 URL
 */
export function redirectToLogin(returnUrl) {
    const currentUrl = returnUrl || window.location.href;
    const loginUrl = `/auth/login.html?returnUrl=${encodeURIComponent(currentUrl)}`;
    
    alert('로그인이 필요합니다.');
    window.location.href = loginUrl;
}

/**
 * 권한 없음 처리
 * @param {string} message - 메시지
 * @param {string} redirectUrl - 리다이렉트 URL
 */
export function handleNoPermission(message = '권한이 없습니다.', redirectUrl = '/main/main.html') {
    alert(message);
    window.location.href = redirectUrl;
}

/**
 * 광고 소유자 확인
 * @param {Object} adData - 광고 데이터
 * @param {string} userId - 사용자 ID
 * @returns {boolean} 소유자 여부
 */
export function isAdOwner(adData, userId) {
    if (!adData || !userId) return false;
    
    // authorId가 배열인 경우
    if (Array.isArray(adData.authorId)) {
        return adData.authorId.includes(userId);
    }
    
    // authorId가 문자열인 경우
    return adData.authorId === userId;
}

/**
 * 광고 수정 권한 확인
 * @param {Object} adData - 광고 데이터
 * @param {Object} user - 사용자 객체
 * @param {Object} userData - 사용자 데이터
 * @returns {boolean} 수정 권한 여부
 */
export function canEditAd(adData, user, userData) {
    if (!adData || !user || !userData) return false;
    
    // 관리자는 모든 광고 수정 가능
    if (isAdminUser(userData)) {
        return true;
    }
    
    // 소유자만 수정 가능
    return isAdOwner(adData, user.uid);
}

/**
 * 광고 삭제 권한 확인
 * @param {Object} adData - 광고 데이터
 * @param {Object} user - 사용자 객체
 * @param {Object} userData - 사용자 데이터
 * @returns {boolean} 삭제 권한 여부
 */
export function canDeleteAd(adData, user, userData) {
    // 수정 권한과 동일
    return canEditAd(adData, user, userData);
}

/**
 * 로그아웃
 * @returns {Promise<void>}
 */
export async function logout() {
    try {
        await auth.signOut();
        console.log('로그아웃 완료');
        window.location.href = '/main/main.html';
    } catch (error) {
        console.error('로그아웃 실패:', error);
        alert('로그아웃에 실패했습니다.');
    }
}

/**
 * 사용자 타입별 리다이렉트
 * @param {Object} userData - 사용자 데이터
 * @param {string} action - 액션 타입 (create, update, delete 등)
 */
export function redirectByUserType(userData, action = '') {
    if (!userData) {
        window.location.href = '/main/main.html';
        return;
    }
    
    if (isAdminUser(userData)) {
        // 관리자는 관리 페이지로
        window.location.href = '/ad-posting/ad-management.html';
    } else if (isBusinessUser(userData)) {
        // 업체회원은 액션에 따라 다르게
        if (action === 'create' || action === 'update') {
            window.location.href = '/ad-posting/ad-management.html';
        } else {
            window.location.href = '/main/main.html';
        }
    } else {
        // 일반 사용자는 메인으로
        window.location.href = '/main/main.html';
    }
}