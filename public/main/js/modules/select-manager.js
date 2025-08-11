import { currentFilters, updateFilters } from '/main/js/business-header.js';
import { updateCityOptions } from '/main/js/modules/region-manager.js';
import { updateURLWithFilters } from '/main/js/modules/url-manager.js';

// 옵션 선택
export function selectOption(element, type) {
    const value = element.getAttribute('data-value');
    const text = element.textContent;
    
    if (type === 'region') {
        const selected = document.querySelector('#region-select-wrapper .select-selected');
        selected.textContent = text;
        selected.setAttribute('data-value', value);
        updateFilters('region', (value === '전체') ? '' : value);
        updateCityOptions(value === '전체' ? '' : value);
    } else if (type === 'city') {
        const selected = document.querySelector('#city-select-wrapper .select-selected');
        selected.textContent = text;
        selected.setAttribute('data-value', value);
        updateFilters('city', (value === '전체') ? '' : value);
    }
    
    // 드롭다운 닫기
    element.parentElement.classList.add('select-hide');
    
    // URL 파라미터 업데이트
    updateURLWithFilters();
    
    // 필터 적용 이벤트 발생
    window.dispatchEvent(new CustomEvent('applyFilters'));
}

// 카테고리 선택
export function selectCategory(element) {
    // 모든 버튼의 active 클래스 제거
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택한 버튼에 active 클래스 추가
    element.classList.add('active');
    
    // 선택한 업종으로 필터링
    const selectedType = element.getAttribute('data-value');
    updateFilters('businessType', selectedType);
    
    // URL 파라미터 업데이트
    updateURLWithFilters();
    
    // 필터 적용 이벤트 발생
    window.dispatchEvent(new CustomEvent('applyFilters'));
}

// 커스텀 셀렉트 초기화
export function setupCustomSelects() {
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