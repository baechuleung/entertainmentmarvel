import { rtdb } from '/js/firebase-config.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

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
            
            // 각 지역 옵션 추가 - regions 배열 순회
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
        
        // regionData 저장 - name을 key로, code를 value로
        region1Data.regions.forEach(region => {
            regionData[region.name] = region.code;
        });
        
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 업종 데이터 로드 - 가로 슬라이드로 변경
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        // 가로 슬라이드 컨테이너 찾기
        const categoryContainer = document.getElementById('category-slide-container');
        if (categoryContainer) {
            // 전체 버튼 추가
            const allBtn = document.createElement('button');
            allBtn.className = 'category-btn active';
            allBtn.textContent = '전체';
            allBtn.setAttribute('data-value', '');
            allBtn.addEventListener('click', function() {
                selectCategory(this);
            });
            categoryContainer.appendChild(allBtn);
            
            // 각 업종 버튼 추가
            data.businessTypes.forEach(type => {
                const btn = document.createElement('button');
                btn.className = 'category-btn';
                btn.textContent = type.name;
                btn.setAttribute('data-value', type.name);
                btn.addEventListener('click', function() {
                    selectCategory(this);
                });
                categoryContainer.appendChild(btn);
            });
            
            // PC 마우스 드래그 기능 추가
            setupMouseDrag();
        }
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// PC 마우스 드래그 설정
function setupMouseDrag() {
    const wrapper = document.querySelector('.category-slide-wrapper');
    if (!wrapper) return;
    
    let isDown = false;
    let startX;
    let scrollLeft;
    
    wrapper.addEventListener('mousedown', (e) => {
        isDown = true;
        wrapper.style.cursor = 'grabbing';
        startX = e.pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
    });
    
    wrapper.addEventListener('mouseleave', () => {
        isDown = false;
        wrapper.style.cursor = 'grab';
    });
    
    wrapper.addEventListener('mouseup', () => {
        isDown = false;
        wrapper.style.cursor = 'grab';
    });
    
    wrapper.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const walk = (x - startX) * 2;
        wrapper.scrollLeft = scrollLeft - walk;
    });
    
    // 기본 커서 스타일
    wrapper.style.cursor = 'grab';
}

// 업종 선택 처리
function selectCategory(button) {
    // 모든 버튼에서 active 클래스 제거
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택된 버튼에 active 클래스 추가
    button.classList.add('active');
    
    // 필터 업데이트
    const value = button.getAttribute('data-value');
    currentFilters.businessType = value;
    
    // 필터 적용
    applyFilters();
}

// 옵션 선택 처리
function selectOption(element, type) {
    const selectWrapper = element.closest('.custom-select');
    const selected = selectWrapper.querySelector('.select-selected');
    const value = element.getAttribute('data-value');
    
    // 선택된 값 표시
    selected.textContent = element.textContent;
    selected.setAttribute('data-value', value);
    
    // 값이 있으면 색상 변경
    if (value && value !== '전체') {
        selected.classList.add('has-value');
    } else {
        selected.classList.remove('has-value');
    }
    
    // 선택된 옵션 표시
    const options = element.parentNode.querySelectorAll('div');
    options.forEach(opt => opt.classList.remove('same-as-selected'));
    element.classList.add('same-as-selected');
    
    // 드롭다운 닫기
    element.parentNode.classList.add('select-hide');
    selected.classList.remove('select-arrow-active');
    
    // 필터 업데이트
    if (type === 'region') {
        currentFilters.region = (value === '지역' || value === '전체') ? '' : value;
        updateCityOptions(value === '전체' ? '' : value);
    } else if (type === 'city') {
        currentFilters.city = (value === '도시' || value === '전체') ? '' : value;
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
async function loadAdvertisements() {
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
    
    // Firebase에서 새 데이터 로드 - get 사용으로 변경
    const adsRef = ref(rtdb, 'advertisements');
    
    try {
        const snapshot = await get(adsRef);
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
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        allAdvertisements = [];
        displayAdvertisements(allAdvertisements);
    }
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