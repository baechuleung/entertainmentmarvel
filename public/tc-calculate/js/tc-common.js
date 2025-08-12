// 파일경로: /tc-calculate/js/tc-common.js
// 파일이름: tc-common.js

// 공통 전역 변수
export let currentUser = null;
export let tcSettings = {
    fullTc: 60,
    halfTc: { start: 30, end: 59 }
};

// 현재 사용자 설정
export function setCurrentUser(user) {
    currentUser = user;
}

// TC 설정 업데이트
export function setTcSettings(settings) {
    tcSettings = settings;
}

// TC 설정값 가져오기
export function getTcSettings() {
    return tcSettings;
}

// 날짜 포맷팅 함수
export function formatDate(startTime, endTime) {
    const today = new Date();
    const days = ['일','월','화','수','목','금','토'];
    return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]}) ${startTime} - ${endTime}`;
}

// 고유 ID 생성
export function generateId(prefix) {
    return `${prefix}_${Date.now()}`;
}

// 기본값으로 리셋
export function resetToDefaults() {
    // 완티 기준 기본값 설정
    const fullTcButtons = document.querySelectorAll('.setting-btn[data-value]');
    fullTcButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-value') === '60') {
            btn.classList.add('active');
        }
    });
    
    // 반티 기준 기본값 설정
    const startInput = document.getElementById('halfTcStart');
    const endInput = document.getElementById('halfTcEnd');
    
    if (startInput && endInput) {
        startInput.value = '30분';
        endInput.value = '59분';
    }
    
    // 전역 변수에 기본값 저장
    tcSettings = {
        fullTc: 60,
        halfTc: { start: 30, end: 59 }
    };
}

// 옵션 체크박스 생성
export function createOptionCheckbox(label, value, checked, changeHandler) {
    const optionCheckbox = document.createElement('label');
    optionCheckbox.className = 'option-checkbox';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = value;
    input.checked = checked;
    input.addEventListener('change', changeHandler);
    
    const customCheckbox = document.createElement('div');
    customCheckbox.className = 'checkbox-custom';
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    
    optionCheckbox.appendChild(input);
    optionCheckbox.appendChild(customCheckbox);
    optionCheckbox.appendChild(labelText);
    
    return optionCheckbox;
}