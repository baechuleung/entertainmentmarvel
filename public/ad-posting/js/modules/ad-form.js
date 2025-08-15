// /ad-posting/js/modules/ad-form.js
// 폼 관련 모든 기능을 담당하는 모듈

/**
 * 필수 필드 검증
 * @param {HTMLFormElement} form - 검증할 폼 요소
 * @returns {Object} 검증 결과 {isValid: boolean, errors: string[]}
 */
export function validateRequiredFields(form) {
    const errors = [];
    
    // 카테고리 검증
    const categoryInput = form.querySelector('#category');
    if (!categoryInput?.value) {
        errors.push('카테고리를 선택해주세요.');
    }
    
    // 작성자 검증
    const authorInput = form.querySelector('#author');
    if (!authorInput?.value.trim()) {
        errors.push('작성자를 입력해주세요.');
    }
    
    // 업소명 검증
    const businessNameInput = form.querySelector('#business-name');
    if (!businessNameInput?.value.trim()) {
        errors.push('업소명을 입력해주세요.');
    }
    
    // 전화번호 검증
    const phoneInput = form.querySelector('#phone');
    if (!phoneInput?.value.trim()) {
        errors.push('전화번호를 입력해주세요.');
    }
    
    // 지역 검증
    const regionInput = form.querySelector('#region');
    if (!regionInput?.value) {
        errors.push('지역을 선택해주세요.');
    }
    
    // 도시 검증
    const cityInput = form.querySelector('#city');
    if (!cityInput?.value) {
        errors.push('도시를 선택해주세요.');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * 폼 데이터 수집
 * @param {HTMLFormElement} form - 데이터를 수집할 폼 요소
 * @returns {Object} 수집된 폼 데이터
 */
export function collectFormData(form) {
    const formData = {
        // 기본 정보
        author: form.querySelector('#author')?.value || '',
        category: form.querySelector('#category')?.value || '',
        businessName: form.querySelector('#business-name')?.value || '',
        businessType: form.querySelector('#business-type')?.value || '',
        
        // 위치 정보
        region: form.querySelector('#region')?.value || '',
        city: form.querySelector('#city')?.value || '',
        
        // 연락처 정보
        phone: form.querySelector('#phone')?.value || '',
        kakao: form.querySelector('#kakao')?.value || '',
        telegram: form.querySelector('#telegram')?.value || ''
    };
    
    return formData;
}

/**
 * 폼에 데이터 채우기 (수정 시 사용)
 * @param {HTMLFormElement} form - 데이터를 채울 폼 요소
 * @param {Object} adData - 광고 데이터
 */
export function fillFormData(form, adData) {
    // 작성자
    const authorInput = form.querySelector('#author');
    if (authorInput) {
        authorInput.value = adData.author || '';
    }
    
    // 카테고리 (hidden input)
    const categoryInput = form.querySelector('#category');
    if (categoryInput) {
        categoryInput.value = adData.category || '';
    }
    
    // 업소명
    const businessNameInput = form.querySelector('#business-name');
    if (businessNameInput) {
        businessNameInput.value = adData.businessName || '';
    }
    
    // 업종 (hidden input)
    const businessTypeInput = form.querySelector('#business-type');
    if (businessTypeInput) {
        businessTypeInput.value = adData.businessType || '';
    }
    
    // 연락처 정보
    const phoneInput = form.querySelector('#phone');
    if (phoneInput) {
        phoneInput.value = adData.phone || '';
    }
    
    const kakaoInput = form.querySelector('#kakao');
    if (kakaoInput) {
        kakaoInput.value = adData.kakao || '';
    }
    
    const telegramInput = form.querySelector('#telegram');
    if (telegramInput) {
        telegramInput.value = adData.telegram || '';
    }
    
    // 지역 정보 (hidden inputs)
    const regionInput = form.querySelector('#region');
    if (regionInput) {
        regionInput.value = adData.region || '';
    }
    
    const cityInput = form.querySelector('#city');
    if (cityInput) {
        cityInput.value = adData.city || '';
    }
}

/**
 * 폼 초기화
 * @param {HTMLFormElement} form - 초기화할 폼 요소
 */
export function resetForm(form) {
    form.reset();
    
    // hidden input들도 초기화
    const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
    hiddenInputs.forEach(input => {
        input.value = '';
    });
    
    // 커스텀 셀렉트 초기화
    const selectWrappers = form.querySelectorAll('.custom-select');
    selectWrappers.forEach(wrapper => {
        const selected = wrapper.querySelector('.select-selected');
        if (selected) {
            const placeholder = wrapper.dataset.placeholder || '선택하세요';
            selected.textContent = placeholder;
            selected.setAttribute('data-value', '');
            selected.classList.remove('has-value');
        }
    });
    
    // 카테고리 버튼 초기화
    const categoryButtons = form.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.classList.remove('active');
    });
}

/**
 * 제출 버튼 활성화
 * @param {HTMLButtonElement} button - 활성화할 버튼
 * @param {string} text - 버튼 텍스트
 */
export function enableSubmitButton(button, text = '제출') {
    if (button) {
        button.disabled = false;
        button.textContent = text;
    }
}

/**
 * 제출 버튼 비활성화
 * @param {HTMLButtonElement} button - 비활성화할 버튼
 * @param {string} text - 버튼 텍스트
 */
export function disableSubmitButton(button, text = '처리 중...') {
    if (button) {
        button.disabled = true;
        button.textContent = text;
    }
}

/**
 * 폼 제출 에러 처리
 * @param {string[]} errors - 에러 메시지 배열
 */
export function showFormErrors(errors) {
    if (errors && errors.length > 0) {
        alert(errors.join('\n'));
    }
}

/**
 * 폼 필드 활성화/비활성화
 * @param {HTMLFormElement} form - 폼 요소
 * @param {boolean} enabled - 활성화 여부
 */
export function setFormEnabled(form, enabled) {
    const inputs = form.querySelectorAll('input, textarea, select, button');
    inputs.forEach(input => {
        input.disabled = !enabled;
    });
}