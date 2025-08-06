import { rtdb } from '/js/firebase-config.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let regionData = {};
let cityData = {};
let allAdvertisements = [];
let currentFilters = {
    region: '',
    city: '',
    businessType: '',
    searchText: ''
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
        setupHeaderEventListeners();
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
    });
    
    // 외부 클릭 시 모든 드롭다운 닫기
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
        if (elmnt && elmnt.parentNode && elmnt.parentNode.querySelector('.select-items') === selectItems[i]) {
            continue;
        }
        selectItems[i].classList.add('select-hide');
    }
}

// 지역 데이터 로드
async function loadRegionData() {
    try {
        // region1.json 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        // region2.json 로드
        const region2Response = await fetch('/data/region2.json');
        cityData = await region2Response.json();
        
        // 지역 옵션 추가
        const regionOptions = document.getElementById('region-options');
        if (regionOptions) {
            // 전체 옵션 추가
            const allOption = document.createElement('div');
            allOption.setAttribute('data-value', '전체');
            allOption.textContent = '전체';
            allOption.addEventListener('click', function() {
                selectOption(this, 'region');
            });
            regionOptions.appendChild(allOption);
            
            // 지역별 옵션 추가
            region1Data.regions.forEach(region => {
                const option = document.createElement('div');
                option.setAttribute('data-value', region.name);
                option.textContent = region.name;
                option.addEventListener('click', function() {
                    selectOption(this, 'region');
                });
                regionOptions.appendChild(option);
            });
        }
        
        // regionData에 저장 (name -> code 매핑)
        region1Data.regions.forEach(region => {
            regionData[region.name] = region.code;
        });
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        // 업종 옵션 추가
        const categoryOptions = document.getElementById('category-options');
        if (categoryOptions) {
            // 전체 옵션 추가
            const allOption = document.createElement('div');
            allOption.setAttribute('data-value', '전체');
            allOption.textContent = '전체';
            allOption.addEventListener('click', function() {
                selectOption(this, 'category');
            });
            categoryOptions.appendChild(allOption);
            
            // 업종별 옵션 추가
            data.businessTypes.forEach(type => {
                const option = document.createElement('div');
                option.setAttribute('data-value', type.name);
                option.textContent = type.name;
                option.addEventListener('click', function() {
                    selectOption(this, 'category');
                });
                categoryOptions.appendChild(option);
            });
        }
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 옵션 선택 처리
function selectOption(element, type) {
    const selectWrapper = element.parentNode.parentNode;
    const selected = selectWrapper.querySelector('.select-selected');
    const value = element.getAttribute('data-value');
    
    // 선택된 값 표시
    selected.textContent = element.textContent;
    selected.setAttribute('data-value', value);
    
    // 값이 있으면 색상 변경
    if (value && value !== '지역' && value !== '도시' && value !== '업종') {
        selected.classList.add('has-value');
    } else {
        selected.classList.remove('has-value');
    }
    
    // 이전 선택 제거
    const sameAsSelected = element.parentNode.querySelector('.same-as-selected');
    if (sameAsSelected) {
        sameAsSelected.classList.remove('same-as-selected');
    }
    element.classList.add('same-as-selected');
    
    // 드롭다운 닫기
    element.parentNode.classList.add('select-hide');
    selected.classList.remove('select-arrow-active');
    
    // 필터 업데이트
    if (type === 'region') {
        currentFilters.region = (value === '지역' || value === '전체') ? '' : value;
        currentFilters.city = '';
        
        if (value !== '전체' && value !== '지역') {
            updateCityOptions(value);
        }
        
        // 도시 초기화
        const citySelected = document.querySelector('#city-select-wrapper .select-selected');
        if (citySelected) {
            citySelected.textContent = '도시';
            citySelected.setAttribute('data-value', '');
            citySelected.classList.remove('has-value');
        }
    } else if (type === 'city') {
        currentFilters.city = (value === '도시' || value === '전체') ? '' : value;
    } else if (type === 'category') {
        currentFilters.businessType = (value === '업종' || value === '전체') ? '' : value;
    }
    
    applyFilters();
}

// 도시 옵션 업데이트
function updateCityOptions(regionName) {
    const cityOptions = document.getElementById('city-options');
    if (!cityOptions) return;
    
    // 기존 옵션 제거
    cityOptions.innerHTML = '';
    
    // 전체 옵션 추가
    const allOption = document.createElement('div');
    allOption.setAttribute('data-value', '전체');
    allOption.textContent = '전체';
    allOption.addEventListener('click', function() {
        selectOption(this, 'city');
    });
    cityOptions.appendChild(allOption);
    
    // 선택된 지역의 code 찾기
    const regionCode = regionData[regionName];
    
    if (regionCode && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const option = document.createElement('div');
            option.setAttribute('data-value', city);
            option.textContent = city;
            option.addEventListener('click', function() {
                selectOption(this, 'city');
            });
            cityOptions.appendChild(option);
        });
    }
}

// 헤더 이벤트 리스너 설정
function setupHeaderEventListeners() {
    // 검색 버튼 클릭 이벤트
    const searchButton = document.querySelector('.search-bar button');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchInput = document.querySelector('.search-bar input');
            currentFilters.searchText = searchInput.value.trim();
            applyFilters();
        });
    }
    
    // 검색 엔터키 이벤트
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                currentFilters.searchText = this.value.trim();
                applyFilters();
            }
        });
    }
}

// 필터 적용 함수
function applyFilters() {
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
        
        // 검색어 필터
        if (currentFilters.searchText) {
            const searchLower = currentFilters.searchText.toLowerCase();
            return ad.title.toLowerCase().includes(searchLower) || 
                   ad.author.toLowerCase().includes(searchLower);
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

// 광고 목록 로드
function loadAdvertisements() {
    console.log('광고 목록 로드 시작');
    
    const adsRef = ref(rtdb, 'advertisements');
    
    onValue(adsRef, (snapshot) => {
        console.log('Firebase 데이터 수신');
        const data = snapshot.val();
        console.log('받은 데이터:', data);
        
        allAdvertisements = []; // 전역 변수에 저장
        
        if (data) {
            // 객체를 배열로 변환
            Object.entries(data).forEach(([key, value]) => {
                if (value.status === 'active') {
                    allAdvertisements.push({ id: key, ...value });
                }
            });
            
            console.log('활성 광고 수:', allAdvertisements.length);
            
            // 최신순으로 정렬
            allAdvertisements.sort((a, b) => b.createdAt - a.createdAt);
            
            // 필터 적용하여 표시
            applyFilters();
        } else {
            console.log('데이터가 없습니다');
            displayAdvertisements([]);
        }
    }, (error) => {
        console.error('Firebase 데이터 로드 오류:', error);
    });
}

// 광고 표시
function displayAdvertisements(advertisements) {
    console.log('광고 표시 시작, 개수:', advertisements.length);
    
    const listContainer = document.querySelector('.business-list');
    if (listContainer) {
        if (advertisements.length === 0) {
            listContainer.innerHTML = '<div class="no-results">등록된 광고가 없습니다.</div>';
            return;
        }
        
        listContainer.innerHTML = advertisements.map(ad => createAdvertisementItem(ad)).join('');
    } else {
        console.error('business-list 컨테이너를 찾을 수 없습니다');
    }
}

// 광고 아이템 생성
function createAdvertisementItem(ad) {
    if (!businessItemTemplate) {
        // 템플릿이 로드되지 않은 경우 기본 HTML 반환
        const defaultImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23ddd' width='100' height='100'/><text x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='14'>No Image</text></svg>";
        
        // 업종 코드가 있으면 업종별 썸네일 사용, 없으면 기존 썸네일 또는 기본 이미지
        const thumbnailSrc = ad.businessTypeCode ? 
            `/img/business-type/${ad.businessTypeCode}.png` : 
            (ad.thumbnail || defaultImage);
        
        return `
            <div class="business-item" data-id="${ad.id}">
                <img src="${thumbnailSrc}" alt="${ad.title}" onerror="this.src='${defaultImage}'">
                <div class="business-info">
                    <div class="ad-title">${ad.title}</div>
                    <div class="ad-meta">
                        <span class="ad-type-author">${ad.businessType} - ${ad.author}</span>
                        <span class="ad-location">${ad.region} ${ad.city}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 템플릿 사용
    const defaultImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23ddd' width='100' height='100'/><text x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='14'>No Image</text></svg>";
    
    // 업종 코드가 있으면 업종별 썸네일 사용
    const thumbnailSrc = ad.businessTypeCode ? 
        `/img/business-type/${ad.businessTypeCode}.png` : 
        (ad.thumbnail || defaultImage);
    
    return replaceTemplate(businessItemTemplate, {
        id: ad.id,
        thumbnail: thumbnailSrc,
        title: ad.title,
        businessType: ad.businessType,
        author: ad.author,
        region: ad.region,
        city: ad.city
    });
}

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded 이벤트 발생');
    
    // 메인 헤더 로드
    await loadMainHeader();
    
    // 업종 리스트 템플릿 로드
    await loadBusinessItemTemplate();
    
    // 광고 목록 로드
    loadAdvertisements();
});