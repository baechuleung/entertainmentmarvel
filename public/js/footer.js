// footer.js - 푸터 동적 로드
(function() {
    function loadFooter() {
        fetch('/footer.html')
            .then(response => response.text())
            .then(html => {
                // main 태그 다음에 footer 추가
                const mainElement = document.querySelector('main');
                if (mainElement) {
                    mainElement.insertAdjacentHTML('afterend', html);
                } else {
                    document.body.insertAdjacentHTML('beforeend', html);
                }
                
                // footer 표시
                const footer = document.getElementById('info-footer');
                if (footer) {
                    footer.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Footer 로드 실패:', error);
            });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadFooter);
    } else {
        loadFooter();
    }
})();