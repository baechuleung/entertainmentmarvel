import { loadAdminHeader } from '/admin/js/admin-header.js';

// 페이지 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // 관리자 헤더 로드 (권한 체크 포함)
    await loadAdminHeader();
});