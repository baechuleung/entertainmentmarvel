// /ad-posting/js/modules/ui-components.js
import { categories, loadBusinessTypes, getCitiesByRegion } from './data-loader.js';

// 카테고리 버튼 생성
export function createCategoryButtons(containerElement, inputElement, onCategorySelect) {
    if (!categories.categories) return;
    
    containerElement.innerHTML = '';
    categories.categories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'category-btn';
        button.textContent = category.name;
        button.dataset.category = category.name;
        
        button.addEventListener('click', async function() {
            // 모든 버튼의 active 클래스 제거
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 클릭된 버튼에 active 클래스 추가
            this.classList.add('active');
            
            // hidden input에 값 설정
            inputElement.value = category.name;
            
            // 콜백 실행
            if (onCategorySelect) {
                await onCategorySelect(category.name);
            }
        });
        
        containerElement.appendChild(button);
    });
}

// 지역 옵션 생성
export function createRegionOptions(regionData) {
    const regionOptions = document.getElementById('region-options');
    if (!regionOptions) return;
    
    regionOptions.innerHTML = '';
    Object.keys(regionData).forEach(regionName => {
        const option = document.createElement('div');
        option.setAttribute('data-value', regionName);
        option.textContent = regionName;
        option.addEventListener('click', function() {
            selectOption(this, 'region');
        });
        regionOptions.appendChild(option);
    });
}

// 업종 옵션 생성
export function createBusinessTypeOptions(businessTypes) {
    const businessTypeOptions = document.getElementById('business-type-options');
    const businessTypeSelected = document.querySelector('#business-type-wrapper .select-selected');
    
    if (!businessTypeOptions || !businessTypeSelected) return;
    
    businessTypeOptions.innerHTML = '';
    businessTypeSelected.textContent = '업종을 선택하세요';
    businessTypeSelected.classList.remove('has-value');
    businessTypeSelected.setAttribute('data-value', '');
    
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

// 도시 옵션 업데이트
export function updateCityOptions(regionName) {
    const cityOptions = document.getElementById('city-options');
    const citySelected = document.querySelector('#city-wrapper .select-selected');
    const cityInput = document.getElementById('city');
    
    if (!cityOptions || !citySelected) return;
    
    // 도시 옵션 초기화
    cityOptions.innerHTML = '';
    citySelected.textContent = '도시를 선택하세요';
    citySelected.classList.remove('has-value');
    if (cityInput) cityInput.value = '';
    
    // regionData와 cityData를 window에서 가져오기
    const regionCode = window.regionData ? window.regionData[regionName] : null;
    
    if (regionCode && window.cityData && window.cityData[regionCode]) {
        window.cityData[regionCode].forEach(city => {
            const option = document.createElement('div');
            // city가 객체인지 문자열인지 확인
            const cityName = typeof city === 'string' ? city : city.name;
            option.setAttribute('data-value', cityName);
            option.textContent = cityName;
            option.addEventListener('click', function() {
                selectOption(this, 'city');
            });
            cityOptions.appendChild(option);
        });
    }
}

// 커스텀 셀렉트 옵션 선택
export function selectOption(element, type) {
    const selectWrapper = element.closest('.custom-select');
    const selected = selectWrapper.querySelector('.select-selected');
    const hiddenInput = document.getElementById(type === 'businessType' ? 'business-type' : type);
    
    // 선택된 값 설정
    const value = element.getAttribute('data-value');
    selected.textContent = element.textContent;
    selected.setAttribute('data-value', value);
    selected.classList.add('has-value');
    if (hiddenInput) hiddenInput.value = value;
    
    // 드롭다운 닫기
    selectWrapper.querySelector('.select-items').classList.add('select-hide');
    selected.classList.remove('select-arrow-active');
    
    // 지역 선택 시 도시 옵션 업데이트
    if (type === 'region') {
        updateCityOptions(value);
    }
}

// 모든 셀렉트 닫기
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

// window 객체에 필요한 함수들 등록
window.selectOption = selectOption;
window.closeAllSelect = closeAllSelect;