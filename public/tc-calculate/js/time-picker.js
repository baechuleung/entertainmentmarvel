// 파일경로: /tc-calculate/js/time-picker.js
// 파일이름: time-picker.js

// 커스텀 타임 피커 초기화
export function initializeTimePickers(isProMode = false) {
    const timePickers = ['startTimePicker', 'endTimePicker'];
    
    timePickers.forEach(pickerId => {
        const picker = document.getElementById(pickerId);
        if (!picker) return;
        
        const display = picker.querySelector('.time-display');
        const hoursContainer = picker.querySelector('.hours');
        const minutesContainer = picker.querySelector('.minutes');
        
        // 오버레이 추가
        const overlay = document.createElement('div');
        overlay.className = 'time-picker-overlay';
        picker.appendChild(overlay);
        
        if (isProMode) {
            // Pro 모드: 무한 스크롤
            initializeProModeTimePicker(picker, display, hoursContainer, minutesContainer, overlay);
        } else {
            // Simple 모드: 기본 타임 피커
            initializeSimpleModeTimePicker(picker, display, hoursContainer, minutesContainer, overlay);
        }
    });
}

// Pro 모드 타임 피커 초기화
function initializeProModeTimePicker(picker, display, hoursContainer, minutesContainer, overlay) {
    // 시간 옵션 생성 (0-23을 5번 반복 - 초기 로드)
    for (let repeat = 0; repeat < 5; repeat++) {
        for (let i = 0; i < 24; i++) {
            const hourOption = document.createElement('div');
            hourOption.className = 'time-option';
            hourOption.textContent = i.toString().padStart(2, '0');
            hourOption.dataset.value = i;
            hoursContainer.appendChild(hourOption);
        }
    }
    
    // 분 옵션 생성 (0-59를 5번 반복 - 초기 로드)
    for (let repeat = 0; repeat < 5; repeat++) {
        for (let i = 0; i < 60; i++) {
            const minuteOption = document.createElement('div');
            minuteOption.className = 'time-option';
            minuteOption.textContent = i.toString().padStart(2, '0');
            minuteOption.dataset.value = i;
            minutesContainer.appendChild(minuteOption);
        }
    }
    
    // 초기값 00:00으로 선택 상태 설정
    hoursContainer.querySelectorAll('[data-value="0"]').forEach(opt => {
        opt.classList.add('selected');
    });
    minutesContainer.querySelectorAll('[data-value="0"]').forEach(opt => {
        opt.classList.add('selected');
    });
    
    // 무한 스크롤 구현
    setupInfiniteScroll(hoursContainer, 24, display, 0);
    setupInfiniteScroll(minutesContainer, 60, display, 1);
    
    // 디스플레이 클릭 시 팝업 열기
    display.addEventListener('click', function(e) {
        e.stopPropagation();
        // 다른 피커 닫기
        document.querySelectorAll('.custom-time-picker').forEach(p => {
            if (p !== picker) p.classList.remove('active');
        });
        picker.classList.toggle('active');
        
        // 팝업이 열렸을 때 선택된 값으로 스크롤
        if (picker.classList.contains('active')) {
            // 사용자 선택 플래그 초기화
            picker.querySelectorAll('[data-user-selected]').forEach(opt => {
                opt.removeAttribute('data-user-selected');
            });
            scrollToSelected(picker);
        }
    });
    
    // 오버레이 클릭 시 닫기
    overlay.addEventListener('click', function() {
        picker.classList.remove('active');
    });
    
    // 시간 선택
    hoursContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('time-option')) {
            // 같은 값을 가진 모든 옵션의 selected 제거
            const value = e.target.dataset.value;
            hoursContainer.querySelectorAll('.time-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            // 같은 값을 가진 모든 옵션에 selected 추가
            hoursContainer.querySelectorAll(`[data-value="${value}"]`).forEach(opt => {
                opt.classList.add('selected');
                opt.setAttribute('data-user-selected', 'true'); // 사용자 선택 플래그
            });
            updateTimeDisplay(picker);
            checkAndCloseIfComplete(picker);
        }
    });
    
    // 분 선택
    minutesContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('time-option')) {
            // 같은 값을 가진 모든 옵션의 selected 제거
            const value = e.target.dataset.value;
            minutesContainer.querySelectorAll('.time-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            // 같은 값을 가진 모든 옵션에 selected 추가
            minutesContainer.querySelectorAll(`[data-value="${value}"]`).forEach(opt => {
                opt.classList.add('selected');
                opt.setAttribute('data-user-selected', 'true'); // 사용자 선택 플래그
            });
            updateTimeDisplay(picker);
            checkAndCloseIfComplete(picker);
        }
    });
    
    // 초기 스크롤 위치 설정 (중간으로)
    const hourItemHeight = hoursContainer.querySelector('.time-option').offsetHeight;
    const minuteItemHeight = minutesContainer.querySelector('.time-option').offsetHeight;
    hoursContainer.scrollTop = hourItemHeight * 24 * 2; // 3번째 사이클의 시작
    minutesContainer.scrollTop = minuteItemHeight * 60 * 2; // 3번째 사이클의 시작
}

// Simple 모드 타임 피커 초기화
function initializeSimpleModeTimePicker(picker, display, hoursContainer, minutesContainer, overlay) {
    // 시간 옵션 생성 (0-23)
    for (let i = 0; i < 24; i++) {
        const hourOption = document.createElement('div');
        hourOption.className = 'time-option';
        hourOption.textContent = i.toString().padStart(2, '0');
        hourOption.dataset.value = i;
        hoursContainer.appendChild(hourOption);
    }
    
    // 분 옵션 생성 (0-59, 1분 단위)
    for (let i = 0; i < 60; i++) {
        const minuteOption = document.createElement('div');
        minuteOption.className = 'time-option';
        minuteOption.textContent = i.toString().padStart(2, '0');
        minuteOption.dataset.value = i;
        minutesContainer.appendChild(minuteOption);
    }
    
    // 디스플레이 클릭 시 팝업 열기
    display.addEventListener('click', function(e) {
        e.stopPropagation();
        // 다른 피커 닫기
        document.querySelectorAll('.custom-time-picker').forEach(p => {
            if (p !== picker) p.classList.remove('active');
        });
        picker.classList.toggle('active');
    });
    
    // 오버레이 클릭 시 닫기
    overlay.addEventListener('click', function() {
        picker.classList.remove('active');
    });
    
    // 시간 선택
    hoursContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('time-option')) {
            hoursContainer.querySelectorAll('.time-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            e.target.classList.add('selected');
            updateTimeDisplay(picker);
            checkAndCloseIfComplete(picker);
        }
    });
    
    // 분 선택
    minutesContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('time-option')) {
            minutesContainer.querySelectorAll('.time-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            e.target.classList.add('selected');
            updateTimeDisplay(picker);
            checkAndCloseIfComplete(picker);
        }
    });
}

// 무한 스크롤 설정
function setupInfiniteScroll(container, itemCount, display, timeIndex) {
    container.addEventListener('scroll', function() {
        const scrollTop = this.scrollTop;
        const scrollHeight = this.scrollHeight;
        const clientHeight = this.clientHeight;
        const itemHeight = this.querySelector('.time-option').offsetHeight;
        const cycleHeight = itemHeight * itemCount; // 한 사이클의 높이
        
        // 위쪽에 추가
        if (scrollTop < cycleHeight) {
            // 위에 한 사이클 추가
            for (let i = itemCount - 1; i >= 0; i--) {
                const option = document.createElement('div');
                option.className = 'time-option';
                option.textContent = i.toString().padStart(2, '0');
                option.dataset.value = i;
                if (i === parseInt(display.value.split(':')[timeIndex])) {
                    option.classList.add('selected');
                }
                this.insertBefore(option, this.firstChild);
            }
            this.scrollTop = scrollTop + cycleHeight;
        }
        
        // 아래쪽에 추가
        if (scrollTop + clientHeight > scrollHeight - cycleHeight) {
            // 아래에 한 사이클 추가
            for (let i = 0; i < itemCount; i++) {
                const option = document.createElement('div');
                option.className = 'time-option';
                option.textContent = i.toString().padStart(2, '0');
                option.dataset.value = i;
                if (i === parseInt(display.value.split(':')[timeIndex])) {
                    option.classList.add('selected');
                }
                this.appendChild(option);
            }
        }
        
        // 너무 많은 요소 제거 (메모리 관리)
        const maxCycles = 10;
        while (this.children.length > itemCount * maxCycles) {
            if (scrollTop > scrollHeight / 2) {
                // 위쪽 제거
                for (let i = 0; i < itemCount; i++) {
                    this.removeChild(this.firstChild);
                }
                this.scrollTop = scrollTop - cycleHeight;
            } else {
                // 아래쪽 제거
                for (let i = 0; i < itemCount; i++) {
                    this.removeChild(this.lastChild);
                }
            }
        }
    });
}

// 선택된 값으로 스크롤하는 함수
function scrollToSelected(picker) {
    const hoursContainer = picker.querySelector('.hours');
    const minutesContainer = picker.querySelector('.minutes');
    
    const selectedHour = hoursContainer.querySelector('.time-option.selected');
    const selectedMinute = minutesContainer.querySelector('.time-option.selected');
    
    if (selectedHour) {
        // 중간에 있는 selected 요소 찾기
        const allSelectedHours = hoursContainer.querySelectorAll('.time-option.selected');
        const middleIndex = Math.floor(allSelectedHours.length / 2);
        const middleSelectedHour = allSelectedHours[middleIndex];
        
        const hourIndex = Array.from(hoursContainer.children).indexOf(middleSelectedHour);
        const itemHeight = middleSelectedHour.offsetHeight;
        hoursContainer.scrollTop = itemHeight * (hourIndex - 2); // 선택된 항목을 약간 위에 표시
    }
    
    if (selectedMinute) {
        // 중간에 있는 selected 요소 찾기
        const allSelectedMinutes = minutesContainer.querySelectorAll('.time-option.selected');
        const middleIndex = Math.floor(allSelectedMinutes.length / 2);
        const middleSelectedMinute = allSelectedMinutes[middleIndex];
        
        const minuteIndex = Array.from(minutesContainer.children).indexOf(middleSelectedMinute);
        const itemHeight = middleSelectedMinute.offsetHeight;
        minutesContainer.scrollTop = itemHeight * (minuteIndex - 2); // 선택된 항목을 약간 위에 표시
    }
}

// 시간과 분이 모두 선택되었는지 확인하고 닫기
function checkAndCloseIfComplete(picker) {
    const selectedHour = picker.querySelector('.hours .selected');
    const selectedMinute = picker.querySelector('.minutes .selected');
    
    // Pro 모드인 경우
    if (picker.querySelector('.hours [data-user-selected="true"]')) {
        // 사용자가 실제로 선택했는지 확인
        const userSelectedHour = picker.querySelector('.hours [data-user-selected="true"]');
        const userSelectedMinute = picker.querySelector('.minutes [data-user-selected="true"]');
        
        if (userSelectedHour && userSelectedMinute) {
            setTimeout(() => {
                picker.classList.remove('active');
                // 선택 완료 후 플래그 초기화
                picker.querySelectorAll('[data-user-selected]').forEach(opt => {
                    opt.removeAttribute('data-user-selected');
                });
            }, 100);
        }
    } else {
        // Simple 모드 - 둘 다 선택되었을 때만 닫기
        if (selectedHour && selectedMinute) {
            setTimeout(() => {
                picker.classList.remove('active');
            }, 100);
        }
    }
}

// 시간 표시 업데이트
function updateTimeDisplay(picker) {
    const display = picker.querySelector('.time-display');
    const selectedHour = picker.querySelector('.hours .selected');
    const selectedMinute = picker.querySelector('.minutes .selected');
    
    if (selectedHour && selectedMinute) {
        const hour = selectedHour.textContent;
        const minute = selectedMinute.textContent;
        display.value = `${hour}:${minute}`;
    }
}

// 시간 피커 초기화 (Pro 모드용)
export function resetTimePicker(pickerId) {
    const picker = document.getElementById(pickerId);
    if (!picker) return;
    
    const startHours = picker.querySelector('.hours');
    const startMinutes = picker.querySelector('.minutes');
    
    // 모든 선택 제거
    picker.querySelectorAll('.time-option.selected').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // 00:00으로 다시 선택
    startHours.querySelectorAll('[data-value="0"]').forEach(opt => {
        opt.classList.add('selected');
    });
    startMinutes.querySelectorAll('[data-value="0"]').forEach(opt => {
        opt.classList.add('selected');
    });
    
    // 디스플레이 업데이트
    picker.querySelector('.time-display').value = '00:00';
}