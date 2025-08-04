// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 동적으로 로드되는 요소들을 위한 이벤트 위임
    
    // 카테고리 탭 클릭 이벤트
    document.addEventListener('click', function(e) {
        if (e.target.matches('.category-tabs button')) {
            const categoryTabs = document.querySelectorAll('.category-tabs button');
            categoryTabs.forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            
            const selectedCategory = e.target.textContent;
            console.log('선택된 카테고리:', selectedCategory);
            // TODO: 카테고리별 필터링 로직 구현
        }
    });

    // 검색 버튼 클릭 이벤트
    document.addEventListener('click', function(e) {
        if (e.target.matches('.search-bar button')) {
            const searchInput = document.querySelector('.search-bar input');
            console.log('검색어:', searchInput.value);
            // TODO: 검색 기능 구현
        }
    });

    // 검색 엔터키 이벤트
    document.addEventListener('keypress', function(e) {
        if (e.target.matches('.search-bar input') && e.key === 'Enter') {
            console.log('검색어:', e.target.value);
            // TODO: 검색 기능 구현
        }
    });

    // 상세보기 버튼 클릭 이벤트
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-reservation')) {
            const businessId = e.target.getAttribute('data-id');
            console.log('상세보기 클릭, ID:', businessId);
            // TODO: 상세 페이지로 이동
            // window.location.href = `/detail/detail.html?id=${businessId}`;
        }
    });

    // 찜하기 버튼 클릭 이벤트
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-wishlist')) {
            const businessId = e.target.getAttribute('data-id');
            console.log('찜하기 클릭, ID:', businessId);
            // TODO: 찜하기 기능 구현
            e.target.textContent = e.target.textContent.includes('⭐') ? '💛 찜하기' : '⭐ 찜하기';
        }
    });

    // 지역 선택 변경 이벤트
    document.addEventListener('change', function(e) {
        if (e.target.matches('#region-select')) {
            console.log('선택된 지역:', e.target.value);
            updateCityOptions(e.target.value);
        }
    });

    // 도시 옵션 업데이트 함수
    function updateCityOptions(region) {
        const citySelect = document.querySelector('#city-select');
        if (!citySelect) return;
        
        // 지역별 도시 데이터
        const cities = {
            '서울': ['강남', '강북', '서초', '송파', '마포'],
            '경기': ['수원', '성남', '부천', '안양', '용인'],
            '인천': ['남동구', '부평구', '서구', '연수구', '중구']
        };
        
        // 도시 옵션 초기화
        citySelect.innerHTML = '<option>도시</option>';
        
        // 선택된 지역의 도시 추가
        if (cities[region]) {
            cities[region].forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }
    }
});