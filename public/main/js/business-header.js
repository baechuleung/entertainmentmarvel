// 전역 변수
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
        const response = await fetch('components/business-header.html');
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
            }, 100);
        }
    } catch (error) {
        console.error('메인 헤더 로드 실패:', error);
    }
}

// 배너 슬라이더 초기화
function initBannerSlider() {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    
    if (slides.length === 0) return;
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        slides[index].classList.add('active');
        if (dots[index]) {
            dots[index].classList.add('active');
        }
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }
    
    // 도트 클릭 이벤트
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });
    
    // 자동 슬라이드
    setInterval(nextSlide, 5000);
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
            
            // 각 지역 옵션 추가
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

// 옵션 선택
function selectOption(element, type) {
    const value = element.getAttribute('data-value');
    const text = element.textContent;
    
    if (type === 'region') {
        const selected = document.querySelector('#region-select-wrapper .select-selected');
        selected.textContent = text;
        selected.setAttribute('data-value', value);
        currentFilters.region = (value === '전체') ? '' : value;
        updateCityOptions(value === '전체' ? '' : value);
    } else if (type === 'city') {
        const selected = document.querySelector('#city-select-wrapper .select-selected');
        selected.textContent = text;
        selected.setAttribute('data-value', value);
        currentFilters.city = (value === '전체') ? '' : value;
    }
    
    // 드롭다운 닫기
    element.parentElement.classList.add('select-hide');
    
    // 필터 적용 이벤트 발생
    window.dispatchEvent(new CustomEvent('applyFilters'));
}

// 도시 옵션 업데이트
function updateCityOptions(regionName) {
    const cityOptions = document.getElementById('city-options');
    const citySelected = document.querySelector('#city-select-wrapper .select-selected');
    
    if (!cityOptions) return;
    
    // 기존 옵션 제거
    cityOptions.innerHTML = '';
    citySelected.textContent = '도시';
    citySelected.setAttribute('data-value', '');
    
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

// 업종 데이터 로드 - 기본적으로 카라오케 데이터 로드
async function loadBusinessTypes() {
    try {
        // 기본적으로 karaoke.json 로드
        const response = await fetch('/data/karaoke.json');
        const data = await response.json();
        
        const categoryContainer = document.getElementById('category-slide-container');
        if (categoryContainer) {
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
                btn.setAttribute('data-value', type.code);
                btn.addEventListener('click', function() {
                    selectCategory(this);
                });
                categoryContainer.appendChild(btn);
            });
        }
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
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
            currentCategory = category;
            
            if (category === 'all') {
                // 전체 선택 시 기본 업종 로드
                await loadBusinessTypes();
            } else if (category === 'karaoke') {
                // 유흥주점 선택 시
                await loadCategoryBusinessTypes('karaoke');
            } else if (category === 'gunma') {
                // 건전마사지 선택 시
                await loadCategoryBusinessTypes('gunma');
            }
            
            // 카테고리 변경 이벤트 발생
            window.dispatchEvent(new CustomEvent('categoryChanged', { detail: { category } }));
        });
    });
}

// 카테고리별 업종 데이터 로드
async function loadCategoryBusinessTypes(categoryType) {
    try {
        let jsonPath = '';
        
        if (categoryType === 'karaoke') {
            jsonPath = '/data/karaoke.json';
        } else if (categoryType === 'gunma') {
            jsonPath = '/data/gunma.json';
        }
        
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
                btn.setAttribute('data-value', type.code);
                btn.addEventListener('click', function() {
                    selectCategory(this);
                });
                categoryContainer.appendChild(btn);
            });
        }
    } catch (error) {
        console.error('카테고리 업종 데이터 로드 실패:', error);
    }
}

// 카테고리 선택
function selectCategory(element) {
    // 모든 버튼의 active 클래스 제거
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택한 버튼에 active 클래스 추가
    element.classList.add('active');
    
    // 선택한 업종으로 필터링
    const selectedType = element.getAttribute('data-value');
    currentFilters.businessType = selectedType;
    
    // 필터 적용 이벤트 발생
    window.dispatchEvent(new CustomEvent('applyFilters'));
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

// 카테고리 슬라이더 드래그 기능
function setupCategorySlider() {
    const container = document.getElementById('category-slide-container');
    if (!container) return;
    
    let isDown = false;
    let startX;
    let scrollLeft;
    
    // 마우스 이벤트
    container.addEventListener('mousedown', (e) => {
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    
    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mouseup', () => {
        isDown = false;
        container.style.cursor = 'grab';
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2;
        container.scrollLeft = scrollLeft - walk;
    });
    
    // 터치 이벤트 (모바일)
    let touchStartX = 0;
    let touchScrollLeft = 0;
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].pageX;
        touchScrollLeft = container.scrollLeft;
    });
    
    container.addEventListener('touchmove', (e) => {
        const touchDelta = touchStartX - e.touches[0].pageX;
        container.scrollLeft = touchScrollLeft + touchDelta;
    });
    
    // 기본 커서 스타일
    container.style.cursor = 'grab';
}