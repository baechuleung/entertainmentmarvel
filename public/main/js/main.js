import { loadMainHeader } from '/main/js/business-header.js';
import { loadBusinessItemTemplate, loadAdvertisements } from '/main/js/business-list.js';

// 초기화 - DOMContentLoaded 이벤트
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded 이벤트 발생');
    
    // 메인 헤더 로드
    await loadMainHeader();
    
    // 업종 리스트 템플릿 로드
    await loadBusinessItemTemplate();
    
    // Firebase에서 광고 목록 로드
    loadAdvertisements();
});