// 탭 설정
export function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // 모든 탭 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 선택된 탭 활성화
            button.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    // URL 파라미터로 탭 전환
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'reviews') {
        const reviewTab = document.querySelector('[data-tab="reviews"]');
        if (reviewTab) {
            reviewTab.click();
        }
    }
}