// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 동적으로 로드되는 요소들을 위한 이벤트 위임
    
    // 업종 아이템 클릭 이벤트 (전체 아이템 클릭)
    document.addEventListener('click', function(e) {
        const businessItem = e.target.closest('.business-item');
        if (businessItem) {
            const businessId = businessItem.getAttribute('data-id');
            console.log('업종 아이템 클릭, ID:', businessId);
            // TODO: 상세 페이지로 이동
            // window.location.href = `/detail/detail.html?id=${businessId}`;
        }
    });
});