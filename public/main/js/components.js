import { rtdb } from '/js/firebase-config.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let regionData = {};
let cityData = {};

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
        setupHeaderEventListeners();
    }, 100);
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
        
        // 지역 선택 옵션 추가
        const regionSelect = document.getElementById('region-select');
        if (regionSelect) {
            region1Data.regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.name;  // name을 value로 사용
                option.textContent = region.name;
                regionSelect.appendChild(option);
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
        
        // 업종 선택 옵션 추가
        const categorySelect = document.getElementById('category-select');
        if (categorySelect) {
            // 전체 옵션 추가
            const allOption = document.createElement('option');
            allOption.value = '전체';
            allOption.textContent = '전체';
            categorySelect.appendChild(allOption);
            
            // 업종별 옵션 추가
            data.businessTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.name;
                option.textContent = type.name;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 도시 옵션 업데이트 함수
function updateCityOptions(regionName) {
    const citySelect = document.querySelector('#city-select');
    if (!citySelect) return;
    
    // 도시 옵션 초기화
    citySelect.innerHTML = '<option>도시</option>';
    
    // 선택된 지역의 code 찾기
    const regionCode = regionData[regionName];
    
    if (regionCode && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    }
}

// 헤더 이벤트 리스너 설정
function setupHeaderEventListeners() {
    // 지역 선택 변경 이벤트
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            console.log('선택된 지역:', this.value);
            updateCityOptions(this.value);
        });
    }
    
    // 업종 선택 변경 이벤트
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            console.log('선택된 업종:', this.value);
            // TODO: 업종별 필터링 로직 구현
        });
    }
    
    // 검색 버튼 클릭 이벤트
    const searchButton = document.querySelector('.search-bar button');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchInput = document.querySelector('.search-bar input');
            console.log('검색어:', searchInput.value);
            // TODO: 검색 기능 구현
        });
    }
    
    // 검색 엔터키 이벤트
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('검색어:', this.value);
                // TODO: 검색 기능 구현
            }
        });
    }
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
        
        const advertisements = [];
        
        if (data) {
            // 객체를 배열로 변환
            Object.entries(data).forEach(([key, value]) => {
                if (value.status === 'active') {
                    advertisements.push({ id: key, ...value });
                }
            });
            
            console.log('활성 광고 수:', advertisements.length);
            
            // 최신순으로 정렬
            advertisements.sort((a, b) => b.createdAt - a.createdAt);
            
            // 광고 리스트 표시
            displayAdvertisements(advertisements);
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
        const defaultImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect fill='%23ddd' width='120' height='120'/><text x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='16'>No Image</text></svg>";
        
        return `
            <div class="business-item" data-id="${ad.id}">
                <img src="${ad.thumbnail || defaultImage}" alt="${ad.title}" onerror="this.src='${defaultImage}'">
                <div class="business-info">
                    <div>
                        <h3 class="ad-title">${ad.title}</h3>
                        <div class="ad-meta">
                            <span class="ad-type-author">${ad.businessType} - ${ad.author}</span>
                            <span class="ad-location">${ad.region} ${ad.city}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 템플릿 사용
    return replaceTemplate(businessItemTemplate, {
        id: ad.id,
        thumbnail: ad.thumbnail || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect fill='%23ddd' width='120' height='120'/><text x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='16'>No Image</text></svg>",
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