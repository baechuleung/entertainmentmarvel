// /ad-posting/js/modules/custom-select.js
import { closeAllSelect } from './ui-components.js';

// 커스텀 셀렉트 초기화
export function setupCustomSelects() {
    // 모든 커스텀 셀렉트 요소에 대해 이벤트 설정
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
            // 다른 셀렉트 닫기
            closeAllSelect(this);
            // 현재 셀렉트 토글
            optionsList.classList.toggle('select-hide');
            this.classList.toggle('select-arrow-active');
        });
    });
    
    // 외부 클릭 시 모든 셀렉트 닫기
    document.removeEventListener('click', closeAllSelect);
    document.addEventListener('click', closeAllSelect);
}

// 특정 셀렉트 값 설정
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

// 셀렉트 초기화
export function resetSelect(selectId) {
    const selectWrapper = document.getElementById(selectId);
    if (!selectWrapper) return;
    
    const selected = selectWrapper.querySelector('.select-selected');
    const hiddenInput = document.getElementById(selectId.replace('-wrapper', ''));
    const defaultText = selectWrapper.dataset.placeholder || '선택하세요';
    
    if (selected) {
        selected.textContent = defaultText;
        selected.setAttribute('data-value', '');
        selected.classList.remove('has-value');
    }
    
    if (hiddenInput) {
        hiddenInput.value = '';
    }
}