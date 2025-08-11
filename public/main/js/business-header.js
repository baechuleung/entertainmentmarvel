// 모듈 임포트
import { initBannerSlider } from '/main/js/modules/banner-slider.js';
import { loadRegionData, updateCityOptions } from '/main/js/modules/region-manager.js';
import { loadBusinessTypes, loadCategoryBusinessTypes, setupCategoryButtons } from '/main/js/modules/category-manager.js';
import { setupCustomSelects, selectOption, selectCategory } from '/main/js/modules/select-manager.js';
import { setupCategorySlider } from '/main/js/modules/category-slider.js';
import { updateURLWithFilters, loadFiltersFromURL } from '/main/js/modules/url-manager.js';
import { setDefaultSEOTags } from '/main/js/modules/seo-manager.js';

// 전역 변수 export
export let currentCategory = 'all';
export let regionData = {};
export let cityData = {};
export let currentFilters = {
    region: '',
    city: '',
    businessType: ''
};

// 메인 헤더 로드
export async function loadMainHeader() {
    try {
        const response = await fetch('/main/components/business-header.html');
        const html = await response.text();
        
        const headerContainer = document.getElementById('main-header-container');
        if (headerContainer) {
            headerContainer.innerHTML = html;
            
            // 헤더 로드 후 초기화
            setTimeout(async () => {
                initBannerSlider();
                await loadRegionData();
                await loadBusinessTypes();
                setupCategoryButtons();
                setupCustomSelects();
                setupCategorySlider();
                
                // URL 파라미터에서 필터 로드
                loadFiltersFromURL();
                
                // URL 파라미터가 없으면 기본 SEO 태그 설정
                if (!window.location.search) {
                    setDefaultSEOTags();
                }
            }, 100);
        }
    } catch (error) {
        console.error('메인 헤더 로드 실패:', error);
    }
}

// 전역 변수 setter 함수들 (다른 모듈에서 사용)
export function setCurrentCategory(category) {
    currentCategory = category;
}

export function setRegionData(data) {
    regionData = data;
}

export function setCityData(data) {
    cityData = data;
}

export function updateFilters(type, value) {
    currentFilters[type] = value;
}