import { rtdb } from '/js/firebase-config.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { showError } from '/business-detail/js/business-detail.js';

// 광고 상세 정보 로드
export async function loadAdDetail(adId) {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            showError('광고를 찾을 수 없습니다.');
            return null;
        }
        
        return snapshot.val();
        
    } catch (error) {
        console.error('광고 로드 실패:', error);
        showError('광고를 불러오는데 실패했습니다.');
        return null;
    }
}

// 조회수 업데이트
export async function updateViewCount(adId, currentViews) {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        await update(adRef, {
            views: (currentViews || 0) + 1
        });
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}