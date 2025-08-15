// /ad-posting/js/modules/ad-firebase.js
// Firebase CRUD 작업을 담당하는 모듈

import { rtdb } from '/js/firebase-config.js';
import { ref, push, set, update, get, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/**
 * 새 광고 생성
 * @param {Object} adData - 광고 데이터
 * @returns {Promise<string>} 생성된 광고 ID
 */
export async function createAd(adData) {
    try {
        // 새 광고 참조 생성
        const newAdRef = push(ref(rtdb, 'advertisements'));
        const adId = newAdRef.key;
        
        // adId 추가하여 저장
        const finalData = {
            ...adData,
            adId: adId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            views: 0,
            bookmarks: [],
            reviews: {},
            status: adData.status || 'pending'
        };
        
        await set(newAdRef, finalData);
        console.log('광고 생성 완료:', adId);
        
        return adId;
    } catch (error) {
        console.error('광고 생성 실패:', error);
        throw error;
    }
}

/**
 * 광고 수정
 * @param {string} adId - 광고 ID
 * @param {Object} updateData - 수정할 데이터
 * @returns {Promise<void>}
 */
export async function updateAd(adId, updateData) {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        
        // updatedAt 추가
        const finalData = {
            ...updateData,
            updatedAt: Date.now()
        };
        
        await update(adRef, finalData);
        console.log('광고 수정 완료:', adId);
    } catch (error) {
        console.error('광고 수정 실패:', error);
        throw error;
    }
}

/**
 * 광고 삭제
 * @param {string} adId - 광고 ID
 * @returns {Promise<void>}
 */
export async function deleteAd(adId) {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        await remove(adRef);
        console.log('광고 삭제 완료:', adId);
    } catch (error) {
        console.error('광고 삭제 실패:', error);
        throw error;
    }
}

/**
 * 광고 조회
 * @param {string} adId - 광고 ID
 * @returns {Promise<Object|null>} 광고 데이터
 */
export async function getAd(adId) {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log('광고를 찾을 수 없습니다:', adId);
            return null;
        }
    } catch (error) {
        console.error('광고 조회 실패:', error);
        throw error;
    }
}

/**
 * 사용자의 광고 목록 조회
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Array>} 광고 목록
 */
export async function getUserAds(userId) {
    try {
        const adsRef = ref(rtdb, 'advertisements');
        const snapshot = await get(adsRef);
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const allAds = snapshot.val();
        const userAds = [];
        
        Object.entries(allAds).forEach(([key, ad]) => {
            // authorId가 배열인 경우와 문자열인 경우 모두 처리
            const hasPermission = Array.isArray(ad.authorId) 
                ? ad.authorId.includes(userId)
                : ad.authorId === userId;
                
            if (hasPermission) {
                userAds.push({ id: key, ...ad });
            }
        });
        
        // 최신순 정렬
        userAds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        return userAds;
    } catch (error) {
        console.error('사용자 광고 목록 조회 실패:', error);
        throw error;
    }
}

/**
 * 사용자의 기존 광고 확인 (중복 방지)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<boolean>} 기존 광고 존재 여부
 */
export async function checkExistingAd(userId) {
    try {
        const userAds = await getUserAds(userId);
        return userAds.length > 0;
    } catch (error) {
        console.error('기존 광고 확인 실패:', error);
        return false;
    }
}

/**
 * 광고 실시간 모니터링
 * @param {string} adId - 광고 ID
 * @param {Function} callback - 데이터 변경 시 호출될 콜백
 * @returns {Function} 구독 해제 함수
 */
export function watchAd(adId, callback) {
    const adRef = ref(rtdb, `advertisements/${adId}`);
    
    const unsubscribe = onValue(adRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            callback(null);
        }
    });
    
    return unsubscribe;
}

/**
 * 모든 광고 조회 (관리자용)
 * @returns {Promise<Array>} 모든 광고 목록
 */
export async function getAllAds() {
    try {
        const adsRef = ref(rtdb, 'advertisements');
        const snapshot = await get(adsRef);
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const allAds = snapshot.val();
        const adsList = Object.entries(allAds).map(([key, ad]) => ({
            id: key,
            ...ad
        }));
        
        // 최신순 정렬
        adsList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        return adsList;
    } catch (error) {
        console.error('전체 광고 조회 실패:', error);
        throw error;
    }
}

/**
 * 광고 상태 변경
 * @param {string} adId - 광고 ID
 * @param {string} status - 새 상태 (pending, active, inactive)
 * @returns {Promise<void>}
 */
export async function updateAdStatus(adId, status) {
    try {
        await updateAd(adId, { status });
        console.log('광고 상태 변경 완료:', adId, status);
    } catch (error) {
        console.error('광고 상태 변경 실패:', error);
        throw error;
    }
}

/**
 * 광고 조회수 증가
 * @param {string} adId - 광고 ID
 * @returns {Promise<void>}
 */
export async function incrementAdViews(adId) {
    try {
        const ad = await getAd(adId);
        if (ad) {
            await updateAd(adId, { views: (ad.views || 0) + 1 });
        }
    } catch (error) {
        console.error('조회수 증가 실패:', error);
    }
}