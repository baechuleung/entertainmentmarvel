// 헤더 로드 함수
async function loadHeader() {
    try {
        const response = await fetch('/header.html');
        const headerHtml = await response.text();
        
        // 헤더를 body 최상단에 추가
        document.body.insertAdjacentHTML('afterbegin', headerHtml);
        
        // 헤더 이벤트 초기화
        initHeaderEvents();
    } catch (error) {
        console.error('헤더 로드 실패:', error);
    }
}

// 헤더 이벤트 초기화
function initHeaderEvents() {
    // 로고 클릭 시 메인으로 이동
    const logo = document.querySelector('#common-header .logo');
    if (logo) {
        logo.addEventListener('click', function() {
            window.location.href = '/main/main.html';
        });
    }
    

}

// 페이지 로드 시 헤더 로드
document.addEventListener('DOMContentLoaded', loadHeader);