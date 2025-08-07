import { rtdb } from '/js/firebase-config.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let regionData = {};
let cityData = {};
let allAdvertisements = [];
let currentFilters = {
    region: '',
    city: '',
    businessType: ''
};

// 컴포넌트 로더
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    } catch (error) {
        console.error('컴포넌트 로드 실패:', error);
    }
}

// 메인 헤더 로드
async function loadMainHeader() {
    await loadComponent('main-header-container', 'components/business-header.html');
    
    // 헤더가 로드된 후 데이터 초기화
    setTimeout(async () => {
        await loadRegionData();
        await loadBusinessTypes();
        setupCustomSelects();
    }, 100);
}

// 커스텀 셀렉트 초기화
function setupCustomSelects() {
    // 모든 커스텀 셀렉트 요소에 대해 이벤트 설정
    document.querySelectorAll('.custom-select').forEach(selectWrapper => {
        const selected = selectWrapper.querySelector('.select-selected');
        const optionsList = selectWrapper.querySelector('.select-items');
        
        // 셀렉트 클릭 이벤트
        selected.addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllSelect(this);
            optionsList.classList.toggle('select-hide');
            this.classList.toggle('select-arrow-active');
        });
        
        // 옵션 클릭 이벤트는 동적으로 추가됨
    });
    
    // 외부 클릭 시 모든 셀렉트 닫기
    document.addEventListener('click', closeAllSelect);
}

// 모든 셀렉트 닫기
function closeAllSelect(elmnt) {
    const selectItems = document.getElementsByClassName('select-items');
    const selectSelected = document.getElementsByClassName('select-selected');
    
    for (let i = 0; i < selectSelected.length; i++) {
        if (elmnt !== selectSelected[i]) {
            selectSelected[i].classList.remove('select-arrow-active');
        }
    }
    
    for (let i = 0; i < selectItems.length; i++) {
        if (elmnt !== selectSelected[i]) {
            selectItems[i].classList.add('select-hide');
        }
    }
}

// 지역 데이터 로드
async function loadRegionData() {
    try {
        const response = await fetch('/data/regions.json');
        const data = await response.json();
        regionData = data.regions;
        cityData = data.cities;
        
        updateRegionOptions();
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 지역 옵션 업데이트
function updateRegionOptions() {
    const regionOptions = document.getElementById('region-options');
    if (!regionOptions) return;
    
    regionOptions.innerHTML = '<div data-value="">전체 지역</div>';
    
    Object.keys(regionData).forEach(regionCode => {
        const div = document.createElement('div');
        div.dataset.value = regionCode;
        div.textContent = regionData[regionCode];
        div.addEventListener('click', function() {
            selectRegion(regionCode, regionData[regionCode]);
        });
        regionOptions.appendChild(div);
    });
}

// 지역 선택
function selectRegion(regionCode, regionName) {
    const regionSelected = document.querySelector('#region-select-wrapper .select-selected');
    regionSelected.textContent = regionName || '지역';
    regionSelected.dataset.value = regionCode;
    
    // 필터 업데이트
    currentFilters.region = regionCode;
    
    // 도시 옵션 업데이트
    updateCityOptions(regionCode);
    
    // 도시 선택 초기화
    const citySelected = document.querySelector('#city-select-wrapper .select-selected');
    citySelected.textContent = '도시';
    citySelected.dataset.value = '';
    currentFilters.city = '';
    
    // 필터링
    filterAdvertisements();
    
    // 셀렉트 닫기
    closeAllSelect();
}

// 도시 옵션 업데이트
function updateCityOptions(regionCode) {
    const cityOptions = document.getElementById('city-options');
    if (!cityOptions) return;
    
    cityOptions.innerHTML = '<div data-value="">전체 도시</div>';
    
    if (regionCode && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const div = document.createElement('div');
            div.dataset.value = city;
            div.textContent = city;
            div.addEventListener('click', function() {
                selectCity(city);
            });
            cityOptions.appendChild(div);
        });
    }
}

// 도시 선택
function selectCity(cityName) {
    const citySelected = document.querySelector('#city-select-wrapper .select-selected');
    citySelected.textContent = cityName || '도시';
    citySelected.dataset.value = cityName;
    
    // 필터 업데이트
    currentFilters.city = cityName;
    
    // 필터링
    filterAdvertisements();
    
    // 셀렉트 닫기
    closeAllSelect();
}

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        const categoryOptions = document.getElementById('category-options');
        if (!categoryOptions) return;
        
        categoryOptions.innerHTML = '<div data-value="">전체 업종</div>';
        
        data.businessTypes.forEach(type => {
            const div = document.createElement('div');
            div.dataset.value = type.name;
            div.textContent = type.name;
            div.addEventListener('click', function() {
                selectCategory(type.name);
            });
            categoryOptions.appendChild(div);
        });
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 업종 선택
function selectCategory(categoryName) {
    const categorySelected = document.querySelector('#category-select-wrapper .select-selected');
    categorySelected.textContent = categoryName || '업종';
    categorySelected.dataset.value = categoryName;
    
    // 필터 업데이트
    currentFilters.businessType = categoryName;
    
    // 필터링
    filterAdvertisements();
    
    // 셀렉트 닫기
    closeAllSelect();
}

// 광고 필터링
function filterAdvertisements() {
    const filteredAds = allAdvertisements.filter(ad => {
        // 지역 필터
        if (currentFilters.region && ad.region !== currentFilters.region) {
            return false;
        }
        
        // 도시 필터
        if (currentFilters.city && ad.city !== currentFilters.city) {
            return false;
        }
        
        // 업종 필터
        if (currentFilters.businessType && ad.businessType !== currentFilters.businessType) {
            return false;
        }
        
        return true;
    });
    
    displayAdvertisements(filteredAds);
}

// 템플릿 문자열 치환
function replaceTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || '';
    });
}

// 업종 리스트 템플릿 로드 및 캐싱
let businessItemTemplate = '';

async function loadBusinessItemTemplate() {
    try {
        const response = await fetch('components/business-list.html');
        businessItemTemplate = await response.text();
    } catch (error) {
        console.error('업종 리스트 템플릿 로드 실패:', error);
    }
}

// 광고 목록 로드 (캐시 적용)
function loadAdvertisements() {
    console.log('광고 목록 로드 시작');
    
    // 캐시 확인
    const cacheKey = 'mainPageAds';
    const cacheTime = 2 * 60 * 60 * 1000; // 2시간
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > cacheTime;
        
        if (!isExpired) {
            console.log('캐시된 데이터 사용');
            allAdvertisements = data;
            displayAdvertisements(allAdvertisements);
            return;
        }
    }
    
    // Firebase에서 새 데이터 로드
    const adsRef = ref(rtdb, 'advertisements');
    
    onValue(adsRef, (snapshot) => {
        console.log('Firebase 데이터 수신');
        const data = snapshot.val();
        console.log('받은 데이터:', data);
        
        allAdvertisements = []; // 전역 변수에 저장
        
        if (data) {
            Object.keys(data).forEach(key => {
                const ad = { id: key, ...data[key] };
                
                // active 상태인 광고만 추가
                if (ad.status === 'active') {
                    allAdvertisements.push(ad);
                }
            });
        }
        
        // 캐시에 저장
        const dataToCache = {
            data: allAdvertisements,
            timestamp: Date.now()
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
        console.log('데이터 캐시 저장 완료');
        
        // 초기 표시
        displayAdvertisements(allAdvertisements);
    }, { onlyOnce: true }); // 한 번만 데이터 가져오기
}

// 광고 목록 표시
async function displayAdvertisements(ads) {
    // 템플릿이 로드되지 않았으면 먼저 로드
    if (!businessItemTemplate) {
        await loadBusinessItemTemplate();
    }
    
    const businessList = document.querySelector('.business-list');
    if (!businessList) {
        console.error('business-list 요소를 찾을 수 없습니다');
        return;
    }
    
    if (ads.length === 0) {
        businessList.innerHTML = '<div class="no-results">등록된 업체가 없습니다.</div>';
        return;
    }
    
    // 광고 목록 HTML 생성
    const html = ads.map(ad => {
        // 템플릿에 데이터 바인딩
        const data = {
            id: ad.id,
            thumbnail: ad.thumbnail || '/img/default-thumb.jpg',
            title: ad.title || '제목 없음',
            businessType: ad.businessType || '미분류',
            author: ad.author || '작성자 없음',
            region: ad.region || '',
            city: ad.city || '',
            location: [ad.region, ad.city].filter(Boolean).join(' ') || '위치 정보 없음',
            views: ad.views || 0
        };
        
        return replaceTemplate(businessItemTemplate, data);
    }).join('');
    
    businessList.innerHTML = html;
    
    // 클릭 이벤트 추가
    document.querySelectorAll('.business-item').forEach(item => {
        item.addEventListener('click', function() {
            const adId = this.dataset.id;
            window.location.href = `/business-detail/business-detail.html?id=${adId}`;
        });
    });
}

// 모듈 초기화
export function initComponents() {
    loadMainHeader();
    loadAdvertisements();
}

// 초기화 - DOMContentLoaded 이벤트 추가
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded 이벤트 발생');
    
    // 메인 헤더 로드
    await loadMainHeader();
    
    // 업종 리스트 템플릿 로드
    await loadBusinessItemTemplate();
    
    // 광고 목록 로드
    loadAdvertisements();
});