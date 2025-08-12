// 파일경로: /tc-calculate/js/time-edit-modal.js
// 파일이름: time-edit-modal.js

import { calculateTimeDifference, calculateTC } from './tc-calculator.js';
import { formatDate } from './tc-common.js';

// 시간 수정 모달 생성
export function createTimeEditModal(result, onSave) {
    console.log('시간 수정 모달 생성 시작, result:', result); // 디버깅용
    
    // 시간 수정 팝업 생성
    const popup = document.createElement('div');
    popup.className = 'popup-overlay active';
    popup.style.zIndex = '1500'; // 타임피커보다 낮은 z-index
    
    const content = document.createElement('div');
    content.className = 'popup-content time-edit-popup';
    
    // 헤더
    const header = createModalHeader();
    
    // 바디
    const body = document.createElement('div');
    body.className = 'popup-body';
    
    // 매장 정보 입력
    const storeInputGroup = createStoreInputGroup(result.storeInfo);
    
    // 시간 입력 섹션 - startTime과 endTime이 없으면 date에서 추출 시도
    let startTime = result.startTime;
    let endTime = result.endTime;
    
    // startTime과 endTime이 없는 경우 date 문자열에서 추출
    if (!startTime || !endTime) {
        console.log('시간 정보가 없음, date에서 추출 시도:', result.date);
        const timeMatch = result.date.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        if (timeMatch) {
            startTime = timeMatch[1];
            endTime = timeMatch[2];
            console.log('추출된 시간:', startTime, endTime);
        }
    }
    
    const timeSection = createTimeSection(startTime, endTime);
    
    body.appendChild(storeInputGroup.element);
    body.appendChild(timeSection.element);
    
    // 저장 버튼
    const saveBtn = createSaveButton(
        result,
        storeInputGroup.input,
        timeSection.startPicker,
        timeSection.endPicker,
        popup,
        onSave
    );
    
    body.appendChild(saveBtn);
    
    content.appendChild(header);
    content.appendChild(body);
    popup.appendChild(content);
    
    // 팝업 외부 클릭 시 닫기
    popup.onclick = (e) => {
        if (e.target === popup) {
            console.log('팝업 외부 클릭으로 닫기');
            popup.remove();
        }
    };
    
    console.log('모달 생성 완료');
    
    return {
        popup,
        initializeTimePickers: () => {
            console.log('타임피커 초기화 호출');
            initializeEditTimePickers(startTime, endTime);
        }
    };
}

// 모달 헤더 생성
function createModalHeader() {
    const header = document.createElement('div');
    header.className = 'popup-header';
    
    const title = document.createElement('h3');
    title.textContent = '시간 수정';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = function() {
        this.closest('.popup-overlay').remove();
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    return header;
}

// 매장 정보 입력 그룹 생성
function createStoreInputGroup(storeInfo) {
    const storeGroup = document.createElement('div');
    storeGroup.className = 'popup-input-group';
    
    const storeLabel = document.createElement('label');
    storeLabel.textContent = '매장정보';
    
    const storeInput = document.createElement('input');
    storeInput.type = 'text';
    storeInput.className = 'popup-input';
    storeInput.value = storeInfo || '';
    storeInput.placeholder = '매장 정보 입력';
    
    storeGroup.appendChild(storeLabel);
    storeGroup.appendChild(storeInput);
    
    return { element: storeGroup, input: storeInput };
}

// 시간 섹션 생성
function createTimeSection(startTime, endTime) {
    const timeSection = document.createElement('div');
    timeSection.className = 'time-edit-section';
    
    // 시작 시간 - 커스텀 타임 피커
    const startTimeGroup = createTimePicker('editStartTimePicker', '시작 시간', startTime);
    
    // 마감 시간 - 커스텀 타임 피커
    const endTimeGroup = createTimePicker('editEndTimePicker', '마감 시간', endTime);
    
    timeSection.appendChild(startTimeGroup.element);
    timeSection.appendChild(endTimeGroup.element);
    
    return {
        element: timeSection,
        startPicker: startTimeGroup.element,
        endPicker: endTimeGroup.element
    };
}

// 타임 피커 생성
function createTimePicker(id, label, initialTime) {
    const timeGroup = document.createElement('div');
    timeGroup.className = 'custom-time-picker edit-time-picker';
    timeGroup.id = id;
    
    const timeLabel = document.createElement('label');
    timeLabel.textContent = label;
    timeLabel.style.display = 'block';
    timeLabel.style.marginBottom = '8px';
    
    const display = document.createElement('input');
    display.type = 'text';
    display.className = 'time-display';
    display.value = initialTime || '00:00';
    display.readOnly = true;
    
    timeGroup.appendChild(timeLabel);
    timeGroup.appendChild(display);
    
    return { element: timeGroup, display };
}

// 저장 버튼 생성
function createSaveButton(result, storeInput, startPicker, endPicker, popup, onSave) {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'popup-submit';
    saveBtn.textContent = '수정하기';
    
    saveBtn.onclick = async () => {
        console.log('저장 버튼 클릭됨');
        
        const newStoreInfo = storeInput.value;
        const newStartTime = startPicker.querySelector('.time-display').value;
        const newEndTime = endPicker.querySelector('.time-display').value;
        
        console.log('새로운 값들:', { newStoreInfo, newStartTime, newEndTime });
        console.log('기존 값들:', { 
            oldStoreInfo: result.storeInfo, 
            oldStartTime: result.startTime, 
            oldEndTime: result.endTime 
        });
        console.log('값이 변경되었나?', {
            storeInfo: newStoreInfo !== result.storeInfo,
            startTime: newStartTime !== result.startTime,
            endTime: newEndTime !== result.endTime
        });
        
        if (!newStartTime || !newEndTime) {
            alert('시작 시간과 마감 시간을 모두 입력해주세요.');
            return;
        }
        
        try {
            // 시간 차이 계산
            const { hours, minutes, totalMinutes } = calculateTimeDifference(newStartTime, newEndTime);
            console.log('시간 계산 결과:', { hours, minutes, totalMinutes });
            
            // TC 계산
            const { fullTcCount, halfTcCount } = calculateTC(totalMinutes);
            console.log('TC 계산 결과:', { fullTcCount, halfTcCount });
            
            // 날짜 포맷
            const dateStr = formatDate(newStartTime, newEndTime);
            
            // 업데이트된 결과 데이터 - 새로운 계산값만 전달
            const updatedData = {
                storeInfo: newStoreInfo,
                startTime: newStartTime,
                endTime: newEndTime,
                date: dateStr,
                hours: hours,
                minutes: minutes,
                fullTcCount: fullTcCount,
                halfTcCount: halfTcCount,
                totalMinutes: totalMinutes
            };
            
            console.log('업데이트된 데이터:', updatedData);
            console.log('기존 결과 ID:', result.id);
            console.log('startTime 타입:', typeof newStartTime, 'value:', newStartTime);
            console.log('endTime 타입:', typeof newEndTime, 'value:', newEndTime);
            
            // 콜백 실행
            if (onSave) {
                await onSave(result.id, updatedData);
            }
            
            // 팝업 닫기
            popup.remove();
        } catch (error) {
            console.error('저장 중 오류:', error);
            alert('저장 중 오류가 발생했습니다.');
        }
    };
    
    return saveBtn;
}

// 수정 팝업용 타임피커 초기화
export function initializeEditTimePickers(startTime, endTime) {
    const timePickers = ['editStartTimePicker', 'editEndTimePicker'];
    const initialTimes = [startTime || '00:00', endTime || '00:00'];
    
    timePickers.forEach((pickerId, index) => {
        const picker = document.getElementById(pickerId);
        if (!picker) return;
        
        const display = picker.querySelector('.time-display');
        
        // 기존 드롭다운과 오버레이가 있으면 제거
        const existingDropdown = picker.querySelector('.time-picker-dropdown');
        const existingOverlay = picker.querySelector('.time-picker-overlay');
        if (existingDropdown) existingDropdown.remove();
        if (existingOverlay) existingOverlay.remove();
        
        // 타임피커 드롭다운 생성
        const dropdown = createTimePickerDropdown();
        
        // 오버레이 추가
        const overlay = createTimePickerOverlay();
        
        picker.appendChild(dropdown);
        picker.appendChild(overlay);
        
        // 초기 시간 파싱
        const [initHour, initMin] = initialTimes[index].split(':').map(Number);
        
        // 시간/분 옵션 생성 및 초기값 설정
        populateTimeOptions(dropdown, initHour, initMin);
        
        // 기존 이벤트 리스너 제거를 위해 새로운 display 요소로 교체
        const newDisplay = display.cloneNode(true);
        display.parentNode.replaceChild(newDisplay, display);
        
        // 이벤트 리스너 설정
        setupTimePickerEvents(picker, newDisplay, overlay);
        
        // 초기 스크롤 위치 설정
        scrollToSelectedTime(picker);
    });
}

// 타임피커 드롭다운 생성
function createTimePickerDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'time-picker-dropdown';
    dropdown.style.zIndex = '2000';
    
    const pickerHeader = document.createElement('div');
    pickerHeader.className = 'time-picker-header';
    pickerHeader.textContent = '시간 선택';
    
    const pickerContent = document.createElement('div');
    pickerContent.className = 'time-picker-content';
    
    // 시간 컬럼
    const hoursColumn = createTimeColumn('시', 'hours');
    
    // 분 컬럼
    const minutesColumn = createTimeColumn('분', 'minutes');
    
    pickerContent.appendChild(hoursColumn);
    pickerContent.appendChild(minutesColumn);
    
    dropdown.appendChild(pickerHeader);
    dropdown.appendChild(pickerContent);
    
    return dropdown;
}

// 시간 컬럼 생성
function createTimeColumn(headerText, className) {
    const column = document.createElement('div');
    column.className = 'time-column';
    
    const header = document.createElement('div');
    header.className = 'column-header';
    header.textContent = headerText;
    
    const container = document.createElement('div');
    container.className = `time-options ${className}`;
    
    column.appendChild(header);
    column.appendChild(container);
    
    return column;
}

// 타임피커 오버레이 생성
function createTimePickerOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'time-picker-overlay';
    overlay.style.zIndex = '1999';
    return overlay;
}

// 시간/분 옵션 채우기
function populateTimeOptions(dropdown, initHour, initMin) {
    const hoursContainer = dropdown.querySelector('.hours');
    const minutesContainer = dropdown.querySelector('.minutes');
    
    // 시간 옵션 생성
    for (let i = 0; i < 24; i++) {
        const hourOption = document.createElement('div');
        hourOption.className = 'time-option';
        hourOption.textContent = i.toString().padStart(2, '0');
        hourOption.dataset.value = i;
        
        if (i === initHour) {
            hourOption.classList.add('selected');
        }
        
        hoursContainer.appendChild(hourOption);
    }
    
    // 분 옵션 생성
    for (let i = 0; i < 60; i++) {
        const minuteOption = document.createElement('div');
        minuteOption.className = 'time-option';
        minuteOption.textContent = i.toString().padStart(2, '0');
        minuteOption.dataset.value = i;
        
        if (i === initMin) {
            minuteOption.classList.add('selected');
        }
        
        minutesContainer.appendChild(minuteOption);
    }
}

// 타임피커 이벤트 설정
function setupTimePickerEvents(picker, display, overlay) {
    const hoursContainer = picker.querySelector('.hours');
    const minutesContainer = picker.querySelector('.minutes');
    
    // 디스플레이 클릭 시 팝업 열기 - 이벤트 위임 사용
    const displayClickHandler = function(e) {
        e.stopPropagation();
        console.log('타임피커 디스플레이 클릭됨');
        
        // 다른 피커 닫기
        document.querySelectorAll('.edit-time-picker').forEach(p => {
            if (p !== picker) p.classList.remove('active');
        });
        picker.classList.toggle('active');
        
        // 팝업이 열릴 때 선택된 시간으로 스크롤
        if (picker.classList.contains('active')) {
            scrollToSelectedTime(picker);
        }
    };
    
    display.removeEventListener('click', displayClickHandler);
    display.addEventListener('click', displayClickHandler);
    
    // 오버레이 클릭 시 닫기
    overlay.onclick = function(e) {
        e.stopPropagation();
        picker.classList.remove('active');
    };
    
    // 시간 선택 - 이벤트 위임
    hoursContainer.onclick = function(e) {
        if (e.target.classList.contains('time-option')) {
            hoursContainer.querySelectorAll('.time-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.removeAttribute('data-user-selected');
            });
            e.target.classList.add('selected');
            e.target.setAttribute('data-user-selected', 'true');
            updateEditTimeDisplay(picker);
            checkAndCloseEditPicker(picker);
        }
    };
    
    // 분 선택 - 이벤트 위임
    minutesContainer.onclick = function(e) {
        if (e.target.classList.contains('time-option')) {
            minutesContainer.querySelectorAll('.time-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.removeAttribute('data-user-selected');
            });
            e.target.classList.add('selected');
            e.target.setAttribute('data-user-selected', 'true');
            updateEditTimeDisplay(picker);
            checkAndCloseEditPicker(picker);
        }
    };
}

// 선택된 시간으로 스크롤
function scrollToSelectedTime(picker) {
    const hoursContainer = picker.querySelector('.hours');
    const minutesContainer = picker.querySelector('.minutes');
    
    const selectedHour = hoursContainer.querySelector('.selected');
    const selectedMinute = minutesContainer.querySelector('.selected');
    
    if (selectedHour) {
        const hourIndex = Array.from(hoursContainer.children).indexOf(selectedHour);
        const itemHeight = selectedHour.offsetHeight;
        hoursContainer.scrollTop = itemHeight * (hourIndex - 2);
    }
    
    if (selectedMinute) {
        const minuteIndex = Array.from(minutesContainer.children).indexOf(selectedMinute);
        const itemHeight = selectedMinute.offsetHeight;
        minutesContainer.scrollTop = itemHeight * (minuteIndex - 2);
    }
}

// 수정용 시간 표시 업데이트
function updateEditTimeDisplay(picker) {
    const display = picker.querySelector('.time-display');
    const selectedHour = picker.querySelector('.hours .selected');
    const selectedMinute = picker.querySelector('.minutes .selected');
    
    if (selectedHour && selectedMinute) {
        const hour = selectedHour.textContent;
        const minute = selectedMinute.textContent;
        display.value = `${hour}:${minute}`;
        console.log('시간 업데이트됨:', display.value);
    }
}

// 시간 수정용 체크 함수
function checkAndCloseEditPicker(picker) {
    const selectedHour = picker.querySelector('.hours .selected');
    const selectedMinute = picker.querySelector('.minutes .selected');
    
    // 시간과 분이 모두 선택되었을 때만 닫기
    if (selectedHour && selectedMinute) {
        // 사용자가 방금 선택한 것인지 확인
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
    }
}