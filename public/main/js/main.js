import { auth } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    
    // 인증 상태 확인
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
    });
    
    // 동적으로 로드되는 요소들을 위한 이벤트 위임
    
    // 업종 아이템 클릭 이벤트 (전체 아이템 클릭)
    document.addEventListener('click', function(e) {
        const businessItem = e.target.closest('.business-item');
        if (businessItem) {
            const businessId = businessItem.getAttribute('data-id');
            console.log('업종 아이템 클릭, ID:', businessId);
            
            // 로그인 체크
            if (currentUser) {
                // 로그인된 경우 상세 페이지로 이동
                window.location.href = `/business-detail/business-detail.html?id=${businessId}`;
            } else {
                // 로그인되지 않은 경우 로그인 페이지로 이동
                const targetUrl = `/business-detail/business-detail.html?id=${businessId}`;
                window.location.href = `/auth/login.html?returnUrl=${encodeURIComponent(targetUrl)}`;
            }
        }
    });
});