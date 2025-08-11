import { currentCategory, currentFilters, setCurrentCategory, updateFilters } from '/main/js/business-header.js';
import { updateCityOptions } from '/main/js/modules/region-manager.js';
import { updateSEOTags } from '/main/js/modules/seo-manager.js';

// URL 파라미터 업데이트 함수
export function updateURLWithFilters() {
    const params = new URLSearchParams();
    
    // 카테고리 한글로 변경
    if (currentCategory && currentCategory !== 'all') {
        const categoryName = currentCategory === 'karaoke' ? '유흥주점' : 
                           currentCategory === 'gunma' ? '건전마사지' : currentCategory;
        params.set('category', categoryName);
    }
    if (currentFilters.region) {
        params.set('region', currentFilters.region);
    }
    if (currentFilters.city) {
        params.set('city', currentFilters.city);
    }
    if (currentFilters.businessType) {
        // businessType 코드를 한글 이름으로 변환
        const activeBtn = document.querySelector('.category-btn.active');
        const typeName = activeBtn && activeBtn.textContent !== '전체' ? activeBtn.textContent : '';
        if (typeName) {
            params.set('type', typeName);
        }
    }
    
    // URL 변경 (페이지 리로드 없이)
    const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.pushState({ filters: currentFilters, category: currentCategory }, '', newURL);
    
    // SEO 태그 업데이트
    updateSEOTags();
}

// 페이지 로드 시 URL 파라미터 읽기
export function loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    // 카테고리 파라미터 처리 (한글을 영어로 변환)
    const categoryParam = params.get('category');
    if (categoryParam) {
        if (categoryParam === '유흥주점') {
            setCurrentCategory('karaoke');
        } else if (categoryParam === '건전마사지') {
            setCurrentCategory('gunma');
        } else {
            setCurrentCategory(categoryParam);
        }
        
        // 카테고리 버튼 활성화
        document.querySelectorAll('.category-select-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === currentCategory) {
                btn.classList.add('active');
            }
        });
    }
    
    // 지역 파라미터 처리
    const regionParam = params.get('region');
    if (regionParam) {
        updateFilters('region', regionParam);
        const regionSelected = document.querySelector('#region-select-wrapper .select-selected');
        if (regionSelected) {
            regionSelected.textContent = regionParam;
            regionSelected.setAttribute('data-value', regionParam);
            regionSelected.classList.add('has-value');
        }
    }
    
    // 도시 파라미터 처리
    const cityParam = params.get('city');
    if (cityParam) {
        updateFilters('city', cityParam);
        // 먼저 지역에 따른 도시 옵션 업데이트
        if (regionParam) {
            updateCityOptions(regionParam);
        }
        const citySelected = document.querySelector('#city-select-wrapper .select-selected');
        if (citySelected) {
            citySelected.textContent = cityParam;
            citySelected.setAttribute('data-value', cityParam);
            citySelected.classList.add('has-value');
        }
    }
    
    // 업종 타입 파라미터 처리 (한글 이름으로 받아서 코드로 변환)
    const typeParam = params.get('type');
    if (typeParam) {
        // 업종 버튼 중에서 해당 텍스트를 가진 버튼 찾아서 활성화
        setTimeout(() => {
            document.querySelectorAll('.category-btn').forEach(btn => {
                if (btn.textContent === typeParam) {
                    btn.click(); // 클릭 이벤트 발생시켜 필터 적용
                }
            });
        }, 200); // 업종 버튼이 로드된 후 실행
    }
    
    // SEO 태그 업데이트
    if (categoryParam || regionParam || cityParam || typeParam) {
        updateSEOTags();
    }
}