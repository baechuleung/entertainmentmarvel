// /ad-posting/js/modules/ad-ui.js
// UI 생성 및 이벤트 처리를 담당하는 모듈

/**
 * 카테고리 버튼 생성
 * @param {HTMLElement} container - 버튼 컨테이너
 * @param {HTMLInputElement} inputElement - 카테고리 input
 * @param {Object} categories - 카테고리 데이터
 * @param {Function} onSelect - 선택 콜백
 */
export function createCategoryButtons(container, inputElement, categories, onSelect) {
    if (!container || !categories?.categories) return;
    
    container.innerHTML = '';
    
    categories.categories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'category-btn';
        button.textContent = category.name;
        button.dataset.category = category.name;
        
        button.addEventListener('click', async function() {
            // 모든 버튼의 active 클래스 제거
            container.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 클릭된 버튼에 active 클래스 추가
            this.classList.add('active');
            
            // input에 값 설정
            if (inputElement) {
                inputElement.value = category.name;
            }
            
            // 콜백 실행
            if (onSelect) {
                await onSelect(category.name);
            }
        });
        
        container.appendChild(button);
    });
}

/**
 * 지역 옵션 생성
 * @param {Object} regionData - 지역 데이터
 */
export function createRegionOptions(regionData) {
    const regionOptions = document.getElementById('region-options');
    if (!regionOptions) return;
    
    regionOptions.innerHTML = '';
    
    // regionData가 {regionData: {...}, cityData: {...}} 형태인 경우 처리
    const regions = regionData.regionData || regionData;
    
    Object.keys(regions).forEach(regionName => {
        const option = document.createElement('div');
        option.setAttribute('data-value', regionName);
        option.textContent = regionName;
        option.addEventListener('click', function() {
            selectOption(this, 'region');
        });
        regionOptions.appendChild(option);
    });
}

/**
 * 도시 옵션 생성
 * @param {Array} cities - 도시 배열
 */
export function createCityOptions(cities) {
    const cityOptions = document.getElementById('city-options');
    const citySelected = document.querySelector('#city-wrapper .select-selected');
    
    if (!cityOptions || !citySelected) return;
    
    cityOptions.innerHTML = '';
    citySelected.textContent = '도시를 선택하세요';
    citySelected.setAttribute('data-value', '');
    
    if (!cities || cities.length === 0) {
        const emptyOption = document.createElement('div');
        emptyOption.textContent = '지역을 먼저 선택하세요';
        emptyOption.style.color = '#999';
        cityOptions.appendChild(emptyOption);
        return;
    }
    
    cities.forEach(city => {
        const option = document.createElement('div');
        const cityName = typeof city === 'object' ? city.name : city;
        option.setAttribute('data-value', cityName);
        option.textContent = cityName;
        option.addEventListener('click', function() {
            selectOption(this, 'city');
        });
        cityOptions.appendChild(option);
    });
}

/**
 * 업종 옵션 생성
 * @param {Object} businessTypes - 업종 데이터
 */
export function createBusinessTypeOptions(businessTypes) {
    const businessTypeOptions = document.getElementById('business-type-options');
    const businessTypeSelected = document.querySelector('#business-type-wrapper .select-selected');
    
    if (!businessTypeOptions || !businessTypeSelected) return;
    
    businessTypeOptions.innerHTML = '';
    businessTypeSelected.textContent = '업종을 선택하세요';
    businessTypeSelected.setAttribute('data-value', '');
    
    if (!businessTypes) {
        const emptyOption = document.createElement('div');
        emptyOption.textContent = '카테고리를 먼저 선택하세요';
        emptyOption.style.color = '#999';
        businessTypeOptions.appendChild(emptyOption);
        return;
    }
    
    Object.keys(businessTypes).forEach(typeName => {
        const option = document.createElement('div');
        option.setAttribute('data-value', typeName);
        option.textContent = typeName;
        option.addEventListener('click', function() {
            selectOption(this, 'businessType');
        });
        businessTypeOptions.appendChild(option);
    });
}

/**
 * 커스텀 셀렉트 설정
 */
export function setupCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(selectWrapper => {
        const selected = selectWrapper.querySelector('.select-selected');
        const optionsList = selectWrapper.querySelector('.select-items');
        
        if (!selected || !optionsList) return;
        
        // 기존 이벤트 리스너 제거 (중복 방지)
        const newSelected = selected.cloneNode(true);
        selected.parentNode.replaceChild(newSelected, selected);
        
        // 셀렉트 클릭 이벤트
        newSelected.addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllSelect(this);
            optionsList.classList.toggle('select-hide');
            this.classList.toggle('select-arrow-active');
        });
    });
    
    // 외부 클릭 시 모든 셀렉트 닫기
    document.removeEventListener('click', closeAllSelect);
    document.addEventListener('click', closeAllSelect);
}

/**
 * 옵션 선택
 * @param {HTMLElement} element - 선택된 옵션 요소
 * @param {string} type - 선택 타입
 */
export function selectOption(element, type) {
    const selectWrapper = element.closest('.custom-select');
    const selected = selectWrapper.querySelector('.select-selected');
    const hiddenInput = document.getElementById(type === 'businessType' ? 'business-type' : type);
    
    // 선택된 값 설정
    const value = element.getAttribute('data-value');
    selected.textContent = element.textContent;
    selected.setAttribute('data-value', value);
    selected.classList.add('has-value');
    
    if (hiddenInput) {
        hiddenInput.value = value;
    }
    
    // 드롭다운 닫기
    selectWrapper.querySelector('.select-items').classList.add('select-hide');
    selected.classList.remove('select-arrow-active');
    
    // 지역 선택 시 도시 옵션 업데이트
    if (type === 'region') {
        updateCityByRegion(value);
    }
}

/**
 * 지역별 도시 업데이트
 * @param {string} regionName - 지역명
 */
export async function updateCityByRegion(regionName) {
    // ad-region.js의 getCitiesByRegion 함수 import 필요
    const { getCitiesByRegion } = await import('./ad-region.js');
    const cities = await getCitiesByRegion(regionName);
    createCityOptions(cities);
}

/**
 * 셀렉트 값 설정
 * @param {string} selectId - 셀렉트 wrapper ID
 * @param {string} value - 설정할 값
 * @param {string} text - 표시할 텍스트
 */
export function setSelectValue(selectId, value, text) {
    const selectWrapper = document.getElementById(selectId);
    if (!selectWrapper) return;
    
    const selected = selectWrapper.querySelector('.select-selected');
    const hiddenInput = document.getElementById(selectId.replace('-wrapper', ''));
    
    if (selected) {
        selected.textContent = text || value;
        selected.setAttribute('data-value', value);
        selected.classList.add('has-value');
    }
    
    if (hiddenInput) {
        hiddenInput.value = value;
    }
}

/**
 * 모든 셀렉트 닫기
 * @param {HTMLElement} elmnt - 제외할 요소
 */
export function closeAllSelect(elmnt) {
    const selectItems = document.getElementsByClassName('select-items');
    const selectSelected = document.getElementsByClassName('select-selected');
    
    for (let i = 0; i < selectSelected.length; i++) {
        if (elmnt && elmnt !== selectSelected[i]) {
            selectSelected[i].classList.remove('select-arrow-active');
        }
    }
    
    for (let i = 0; i < selectItems.length; i++) {
        if (!elmnt || (elmnt !== selectSelected[i] && !selectItems[i].contains(elmnt.target || elmnt))) {
            selectItems[i].classList.add('select-hide');
        }
    }
}

/**
 * 카테고리 버튼 활성화
 * @param {string} categoryName - 카테고리명
 */
export function activateCategoryButton(categoryName) {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        if (btn.textContent === categoryName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * UI 로딩 상태 표시
 * @param {boolean} isLoading - 로딩 여부
 */
export function showLoadingState(isLoading) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }
}

/**
 * 에러 메시지 표시
 * @param {string} message - 에러 메시지
 */
export function showErrorMessage(message) {
    // 기존 에러 메시지 제거
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 새 에러 메시지 생성
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

/**
 * 성공 메시지 표시
 * @param {string} message - 성공 메시지
 */
export function showSuccessMessage(message) {
    // 기존 성공 메시지 제거
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    // 새 성공 메시지 생성
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00DD59;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}