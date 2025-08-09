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
        setupCategoryButtons();
        setupBannerSlider();
    }, 100);
}

// 배너 슬라이더 설정
function setupBannerSlider() {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.banner-dots .dot');
    let currentSlide = 0;
    
    if (slides.length === 0) return;
    
    // 슬라이드 변경 함수
    function changeSlide(index) {
        // 모든 슬라이드와 점 비활성화
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // 선택된 슬라이드와 점 활성화
        slides[index].classList.add('active');
        if (dots[index]) {
            dots[index].classList.add('active');
        }
        
        currentSlide = index;
    }
    
    // 다음 슬라이드로 이동
    function nextSlide() {
        const nextIndex = (currentSlide + 1) % slides.length;
        changeSlide(nextIndex);
    }
    
    // 자동 슬라이드 (5초마다)
    setInterval(nextSlide, 5000);
    
    // 인디케이터 클릭 이벤트
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            changeSlide(index);
        });
    });
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

// 카테고리 버튼 설정
function setupCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category-select-btn');
    
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            // 모든 버튼에서 active 제거
            categoryButtons.forEach(b => b.classList.remove('active'));
            // 클릭한 버튼에 active 추가
            this.classList.add('active');
            
            const category = this.dataset.category;
            
            if (category === 'all') {
                // 전체 선택 시 기본 업종 로드
                await loadBusinessTypes();
            } else if (category === 'karaoke') {
                // 유흥주점 선택 시
                await loadCategoryBusinessTypes('/data/karaoke.json');
            } else if (category === 'gunma') {
                // 건전마사지 선택 시
                await loadCategoryBusinessTypes('/data/gunma.json');
            }
        });
    });
}

// 카테고리별 업종 데이터 로드
async function loadCategoryBusinessTypes(jsonPath) {
    try {
        const response = await fetch(jsonPath);
        const data = await response.json();
        
        // 가로 슬라이드 컨테이너 찾기
        const categoryContainer = document.getElementById('category-slide-container');
        if (categoryContainer) {
            // 기존 버튼들 제거
            categoryContainer.innerHTML = '';
            
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
            
            // PC 마우스 드래그 기능 재설정
            setupMouseDrag();
        }
    } catch (error) {
        console.error('카테고리 업종 데이터 로드 실패:', error);
    }
}

// 업종 데이터 로드 - 전체 카테고리 시 두 파일 모두 로드
async function loadBusinessTypes() {
    try {
        // karaoke.json과 gunma.json의 데이터를 모두 로드하여 합침
        const [karaokeResponse, gunmaResponse] = await Promise.all([
            fetch('/data/karaoke.json'),
            fetch('/data/gunma.json')
        ]);
        
        const karaokeData = await karaokeResponse.json();
        const gunmaData = await gunmaResponse.json();
        
        // 두 카테고리의 업종을 합침
        const allBusinessTypes = [
            ...karaokeData.businessTypes,
            ...gunmaData.businessTypes
        ];
        
        // 가로 슬라이드 컨테이너 찾기
        const categoryContainer = document.getElementById('category-slide-container');
        if (categoryContainer) {
            // 기존 버튼들 제거
            categoryContainer.innerHTML = '';
            
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
            allBusinessTypes.forEach(type => {
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
        console.error('템플릿 로드 실패:', error);
    }
}

// 광고 데이터 로드
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
    
    // Firebase에서 새 데이터 로드
    try {
        const adsRef = ref(rtdb, 'advertisements');
        const snapshot = await get(adsRef);
        
        console.log('Firebase 데이터 수신');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            allAdvertisements = Object.entries(data).map(([id, ad]) => ({
                ...ad,
                id
            }));
            
            // 활성 상태인 광고만 필터링
            allAdvertisements = allAdvertisements.filter(ad => ad.status === 'active');
            
            // 최신순 정렬
            allAdvertisements.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else {
            allAdvertisements = [];
        }
        
        // 캐시에 저장
        const dataToCache = {
            data: allAdvertisements,
            timestamp: Date.now()
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
        console.log('데이터 캐시 저장 완료');
        
        displayAdvertisements(allAdvertisements);
    } catch (error) {
        console.error('광고 로드 실패:', error);
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