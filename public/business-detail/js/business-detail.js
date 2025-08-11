import { rtdb, auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { setupReviews } from './reviews.js';
import { setupModals } from './modals.js';
import { updateSEOTags } from './modules/seo-manager.js';
import { loadAdDetail, updateViewCount } from './modules/data-manager.js';
import { setBusinessHeader, setDetailContent } from './modules/ui-manager.js';
import { setupBookmarkButton, checkBookmarkStatus } from './modules/bookmark-manager.js';
import { setupTabs } from './modules/tab-manager.js';

// 전역 변수
export let currentAd = null;
export let adId = null;
export let currentUser = null;
export let isBookmarked = false;

// 전역 변수 setter 함수들
export function setCurrentAd(ad) {
    currentAd = ad;
}

export function setCurrentUser(user) {
    currentUser = user;
}

export function setIsBookmarked(status) {
    isBookmarked = status;
}

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
        setCurrentUser(user);
        if (user) {
            await checkBookmarkStatus();
        }
    });
    
    // 컴포넌트 로드
    await loadComponents();
    
    // 광고 데이터 로드
    const adData = await loadAdDetail(adId);
    if (adData) {
        setCurrentAd(adData);
        
        // 조회수 증가
        await updateViewCount(adId, adData.views || 0);
        
        // SEO 태그 업데이트
        updateSEOTags(adData, adId);
        
        // UI 렌더링
        setBusinessHeader(adData);
        setDetailContent(adData);
        
        // 기능 초기화
        setupModals();
        setupReviews(adId);
        setupTabs();
        setupBookmarkButton();
    }
});

// 컴포넌트 로드
async function loadComponents() {
    try {
        // 헤더 컴포넌트
        const headerResponse = await fetch('/business-detail/components/business-header.html');
        const headerHtml = await headerResponse.text();
        document.getElementById('business-header-container').innerHTML = headerHtml;
        
        // 탭 컴포넌트
        const tabsResponse = await fetch('/business-detail/components/business-tabs.html');
        const tabsHtml = await tabsResponse.text();
        document.getElementById('business-tabs-container').innerHTML = tabsHtml;
    } catch (error) {
        console.error('컴포넌트 로드 실패:', error);
    }
}

// 에러 표시
export function showError(message) {
    const container = document.querySelector('.business-detail-container');
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}