// 카테고리 슬라이더 드래그 기능
export function setupCategorySlider() {
    const container = document.getElementById('category-slide-container');
    if (!container) return;
    
    // PC에서만 드래그 기능 활성화
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (!isMobile) {
        let isDown = false;
        let startX;
        let scrollLeft;
        
        // 마우스 이벤트 (PC에서만)
        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });
        
        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mouseup', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });
        
        // 기본 커서 스타일 (PC에서만)
        container.style.cursor = 'grab';
    }
    
    // 모바일에서는 기본 터치 스크롤 사용 (별도 처리 불필요)
}