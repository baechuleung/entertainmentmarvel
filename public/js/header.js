// 헤더 로드 함수
async function loadHeader() {
    try {
        const response = await fetch('/header.html');
        const headerHtml = await response.text();
        
        // 헤더를 body 최상단에 추가
        document.body.insertAdjacentHTML('afterbegin', headerHtml);
        
        // 헤더 이벤트 초기화
        initHeaderEvents();
        
        // 뒤로가기 버튼 표시 여부 확인
        checkBackButton();
        
        // DOM이 완전히 로드된 후 sidemenu.js 로드
        setTimeout(() => {
            // sidemenu.js 스크립트 동적 로드 (module로 로드)
            const sidemenuScript = document.createElement('script');
            sidemenuScript.type = 'module';
            sidemenuScript.src = '/js/sidemenu.js';
            document.body.appendChild(sidemenuScript);
            console.log('sidemenu.js 로드 시작');
        }, 100);
        
    } catch (error) {
        console.error('헤더 로드 실패:', error);
    }
}

// 뒤로가기 버튼 표시 여부 확인
function checkBackButton() {
    const currentPath = window.location.pathname;
    const backButton = document.querySelector('.back-button');
    const logo = document.querySelector('#common-header .logo');
    const pageTitle = document.querySelector('.page-title');
    
    if (currentPath !== '/main/main.html' && currentPath !== '/main/main' && currentPath !== '/') {
        // 메인 페이지가 아닌 경우 뒤로가기 버튼 표시
        if (backButton) {
            backButton.style.display = 'flex';
        }
        if (logo) {
            logo.style.display = 'none';
        }
        if (pageTitle) {
            pageTitle.style.display = 'block';
            // 현재 페이지의 title 태그에서 타이틀 가져오기
            const documentTitle = document.title;
            // " - 유흥마블" 부분 제거
            pageTitle.textContent = documentTitle.replace(' - 유흥마블', '');
        }
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
    
    // 뒤로가기 버튼 클릭
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.history.back();
        });
    }
    
    // 햄버거 메뉴는 sidemenu.js에서 처리
}

// 페이지 로드 시 헤더 로드
document.addEventListener('DOMContentLoaded', loadHeader);