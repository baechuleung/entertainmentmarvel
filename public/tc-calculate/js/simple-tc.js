// 파일경로: /tc-calculate/js/simple-tc.js
// 파일이름: simple-tc.js

// 간편모드 TC JavaScript (리팩토링)
import { auth } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// 공통 모듈 import
import { 
    setCurrentUser, 
    currentUser, 
    generateId, 
    formatDate,
    resetToDefaults
} from './tc-common.js';
import { initializeTcSettings, loadTcSettings } from './tc-settings.js';
import { initializeTimePickers } from './time-picker.js';
import { calculateTimeDifference, calculateTC, validateTime } from './tc-calculator.js';
import { 
    createResultItem, 
    saveResultsToFirestore, 
    loadResultsFromFirestore,
    renumberResults,
    getMaxResultNumber
} from './result-manager.js';
import { captureAndShare, showShareModalWithText } from './share-manager.js';
import { createTimeEditModal } from './time-edit-modal.js';

// Simple 모드 전용 전역 변수
let simpleResultsList = [];
let resultCounter = 0;

// 메인 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('간편모드 페이지 로드');
    
    // 전역 함수 등록
    window.handleTimeEdit = handleTimeEdit;
    window.deleteResultItem = deleteResultItem;
    
    // UI 초기화
    initializeTcSettings();
    initializeTimeCalculator();
    initializeTimePickers(false); // Simple 모드
    
    // auth 상태 변경 감지
    onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
            console.log('로그인 사용자:', user.uid);
            await loadTcSettings();
            await loadSimpleResults();
        } else {
            console.log('로그아웃 상태');
            resetToDefaults();
        }
    });
});

// 시간 계산기 초기화
function initializeTimeCalculator() {
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateTime);
    }
}

// 시간 계산
async function calculateTime() {
    const storeInfo = document.getElementById('storeInfo').value;
    const startPicker = document.getElementById('startTimePicker');
    const endPicker = document.getElementById('endTimePicker');
    
    const startTime = startPicker.querySelector('.time-display').value;
    const endTime = endPicker.querySelector('.time-display').value;
    
    if (!validateTime(startTime, endTime)) {
        return;
    }
    
    // 시간 차이 계산
    const { hours, minutes, totalMinutes } = calculateTimeDifference(startTime, endTime);
    
    // TC 계산
    const { fullTcCount, halfTcCount } = calculateTC(totalMinutes);
    
    // 결과 표시
    await displayResult({
        storeInfo,
        hours,
        minutes,
        fullTcCount,
        halfTcCount,
        startTime,
        endTime,
        totalMinutes
    });
    
    // 총 개수 업데이트
    updateSummary();
    
    // 입력 필드 초기화
    document.getElementById('storeInfo').value = '';
    startPicker.querySelector('.time-display').value = '00:00';
    endPicker.querySelector('.time-display').value = '00:00';
    
    // 선택된 시간 스타일 초기화
    startPicker.querySelectorAll('.time-option.selected').forEach(opt => {
        opt.classList.remove('selected');
    });
    endPicker.querySelectorAll('.time-option.selected').forEach(opt => {
        opt.classList.remove('selected');
    });
}

// 결과 표시
async function displayResult(data) {
    resultCounter++;
    
    // 날짜 포맷
    const dateStr = formatDate(data.startTime, data.endTime);
    
    // 결과 데이터 생성
    const resultData = {
        id: generateId('simple_result'),
        number: resultCounter,
        date: dateStr,
        storeInfo: data.storeInfo || '미입력',
        startTime: data.startTime,  // 시작 시간 저장
        endTime: data.endTime,      // 마감 시간 저장
        hours: data.hours,
        minutes: data.minutes,
        fullTcCount: data.fullTcCount,
        halfTcCount: data.halfTcCount,
        totalMinutes: data.totalMinutes,
        options: {
            '차비': false,
            '지명': false,
            '팅김': false
        },
        createdAt: new Date()
    };
    
    // 결과 리스트에 추가
    simpleResultsList.push(resultData);
    
    // 결과 카드 컨테이너가 없으면 생성
    let container = document.getElementById('resultCardsContainer');
    if (!container) {
        console.error('결과 카드 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    // 결과 카드가 없으면 생성
    let resultCard = container.querySelector('.result-card');
    if (!resultCard) {
        resultCard = createResultCard();
        container.appendChild(resultCard);
    }
    
    // 아이템 생성
    const item = createResultItem(resultData, {
        isSimpleMode: true,
        onOptionChange: handleOptionChange,
        onCountChange: handleCountChange,
        onDelete: deleteResultItem,
        onTimeEdit: handleTimeEdit
    });
    
    // 아이템 컨테이너에 추가 (최신이 위로)
    const itemsContainer = resultCard.querySelector('.result-items-container');
    
    // 기존 아이템이 있으면 divider 추가
    if (itemsContainer.children.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'result-divider';
        itemsContainer.insertBefore(divider, itemsContainer.firstChild);
    }
    
    itemsContainer.insertBefore(item, itemsContainer.firstChild);
    
    // 결과 카드 표시
    resultCard.style.display = 'block';
    
    // Firestore에 저장
    await saveSimpleResults();
}

// 결과 카드 생성 함수
function createResultCard() {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.style.display = 'none';
    
    // 아이템 컨테이너만 생성
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'result-items-container';
    
    // 총 개수 표시 박스 위 구분선
    const divider = document.createElement('div');
    divider.className = 'result-divider';
    
    // 총 개수 표시 박스
    const summaryBox = document.createElement('div');
    summaryBox.className = 'result-summary-box';
    summaryBox.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">총 완티</span>
            <span class="summary-value" id="totalFullTc">0개</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">총 반티</span>
            <span class="summary-value" id="totalHalfTc">0개</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">차비</span>
            <span class="summary-value" id="totalCar">0개</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">지명</span>
            <span class="summary-value" id="totalNomination">0개</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">팅김</span>
            <span class="summary-value" id="totalTing">0개</span>
        </div>
    `;
    
    // 버튼 컨테이너 추가
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'result-card-buttons';
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'card-btn reset-all-btn';
    resetBtn.textContent = '초기화';
    resetBtn.addEventListener('click', handleResetAll);
    
    const shareBtn = document.createElement('button');
    shareBtn.className = 'card-btn share-all-btn';
    shareBtn.textContent = '공유하기';
    shareBtn.addEventListener('click', handleShare);
    
    buttonContainer.appendChild(resetBtn);
    buttonContainer.appendChild(shareBtn);
    
    card.appendChild(itemsContainer);
    card.appendChild(divider);
    card.appendChild(summaryBox);
    card.appendChild(buttonContainer);
    
    return card;
}

// 초기화 핸들러
async function handleResetAll() {
    if (confirm('모든 계산 결과를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        // 모든 결과 삭제
        simpleResultsList = [];
        resultCounter = 0;
        
        // DOM 초기화
        const itemsContainer = document.querySelector('.result-items-container');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
        }
        
        // 결과 카드 숨기기
        const resultCard = document.querySelector('.result-card');
        if (resultCard) {
            resultCard.style.display = 'none';
        }
        
        // Firestore에서 삭제
        if (currentUser) {
            try {
                await saveSimpleResults();
                alert('모든 계산 결과가 삭제되었습니다.');
            } catch (error) {
                console.error('삭제 실패:', error);
                alert('삭제에 실패했습니다. 다시 시도해주세요.');
            }
        }
    }
}

// 공유 핸들러
async function handleShare() {
    const itemsContainer = document.querySelector('.result-items-container');
    const shareBtn = document.querySelector('.share-all-btn');
    
    if (!itemsContainer || !shareBtn) return;
    
    // 캡쳐 후 텍스트 공유 옵션도 포함된 모달 표시
    await captureAndShare(itemsContainer, shareBtn, {
        includeWatermark: true,
        onComplete: (blob) => {
            showShareModalWithText(blob, simpleResultsList);
        }
    });
}

// 옵션 변경 핸들러
async function handleOptionChange(resultId, optionName, checked) {
    const resultIndex = simpleResultsList.findIndex(r => r.id === resultId);
    if (resultIndex === -1) return;
    
    if (!simpleResultsList[resultIndex].options) {
        simpleResultsList[resultIndex].options = {
            '차비': false,
            '지명': false,
            '팅김': false
        };
    }
    simpleResultsList[resultIndex].options[optionName] = checked;
    
    await saveSimpleResults();
    updateSummary();
}

// 카운트 변경 핸들러
async function handleCountChange(resultId, countType, newValue) {
    const resultIndex = simpleResultsList.findIndex(r => r.id === resultId);
    if (resultIndex !== -1) {
        simpleResultsList[resultIndex][countType] = newValue;
        await saveSimpleResults();
        updateSummary();
    }
}

// 총 개수 업데이트 함수
function updateSummary() {
    let totalFullTc = 0;
    let totalHalfTc = 0;
    let totalCar = 0;
    let totalNomination = 0;
    let totalTing = 0;
    
    simpleResultsList.forEach(result => {
        totalFullTc += result.fullTcCount || 0;
        totalHalfTc += result.halfTcCount || 0;
        
        if (result.options) {
            if (result.options['차비']) totalCar++;
            if (result.options['지명']) totalNomination++;
            if (result.options['팅김']) totalTing++;
        }
    });
    
    // DOM 업데이트
    const totalFullTcEl = document.getElementById('totalFullTc');
    const totalHalfTcEl = document.getElementById('totalHalfTc');
    const totalCarEl = document.getElementById('totalCar');
    const totalNominationEl = document.getElementById('totalNomination');
    const totalTingEl = document.getElementById('totalTing');
    
    if (totalFullTcEl) totalFullTcEl.textContent = totalFullTc + '개';
    if (totalHalfTcEl) totalHalfTcEl.textContent = totalHalfTc + '개';
    if (totalCarEl) totalCarEl.textContent = totalCar + '개';
    if (totalNominationEl) totalNominationEl.textContent = totalNomination + '개';
    if (totalTingEl) totalTingEl.textContent = totalTing + '개';
}

// 결과 삭제
async function deleteResultItem(resultId) {
    if (confirm('이 계산 결과를 삭제하시겠습니까?')) {
        // 리스트에서 제거
        simpleResultsList = simpleResultsList.filter(r => r.id !== resultId);
        
        // 번호 재정렬
        simpleResultsList = renumberResults(simpleResultsList);
        
        // 가장 큰 번호 업데이트
        resultCounter = getMaxResultNumber(simpleResultsList);
        
        // DOM에서 모든 아이템 다시 렌더링
        const itemsContainer = document.querySelector('.result-items-container');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            
            // 다시 렌더링
            simpleResultsList.forEach((result, index) => {
                // divider 추가 (첫 번째 아이템 제외)
                if (index > 0) {
                    const divider = document.createElement('div');
                    divider.className = 'result-divider';
                    itemsContainer.appendChild(divider);
                }
                
                const item = createResultItem(result, {
                    isSimpleMode: true,
                    onOptionChange: handleOptionChange,
                    onCountChange: handleCountChange,
                    onDelete: deleteResultItem,
                    onTimeEdit: handleTimeEdit
                });
                itemsContainer.appendChild(item);
            });
        }
        
        // 결과가 하나도 없으면 카드 숨기기
        if (simpleResultsList.length === 0) {
            const resultCard = document.querySelector('.result-card');
            if (resultCard) {
                resultCard.style.display = 'none';
            }
        }
        
        // Firestore 업데이트
        await saveSimpleResults();
        
        // 총 개수 업데이트
        updateSummary();
    }
}

// 간편모드 결과 저장
async function saveSimpleResults() {
    await saveResultsToFirestore(simpleResultsList, 'results_simple');
}

// 간편모드 결과 불러오기
async function loadSimpleResults() {
    const results = await loadResultsFromFirestore('results_simple');
    if (results) {
        simpleResultsList = results;
        
        // 가장 큰 번호 찾기
        resultCounter = getMaxResultNumber(simpleResultsList);
        
        // 결과 표시
        displayLoadedResults();
        
        // 총 개수 업데이트
        updateSummary();
    }
}

// 불러온 결과 표시
function displayLoadedResults() {
    const container = document.getElementById('resultCardsContainer');
    if (!container) {
        console.error('결과 카드 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    if (simpleResultsList.length > 0) {
        // 결과 카드가 없으면 생성
        let resultCard = container.querySelector('.result-card');
        if (!resultCard) {
            resultCard = createResultCard();
            container.appendChild(resultCard);
        }
        
        // 아이템 컨테이너 초기화
        const itemsContainer = resultCard.querySelector('.result-items-container');
        itemsContainer.innerHTML = '';
        
        // 결과 재정렬
        simpleResultsList = renumberResults(simpleResultsList);
        
        // 가장 큰 번호로 카운터 설정
        resultCounter = simpleResultsList.length;
        
        simpleResultsList.forEach((result, index) => {
            // divider 추가 (첫 번째 아이템 제외)
            if (index > 0) {
                const divider = document.createElement('div');
                divider.className = 'result-divider';
                itemsContainer.appendChild(divider);
            }
            
            const item = createResultItem(result, {
                isSimpleMode: true,
                onOptionChange: handleOptionChange,
                onCountChange: handleCountChange,
                onDelete: deleteResultItem,
                onTimeEdit: handleTimeEdit
            });
            itemsContainer.appendChild(item);
        });
        
        // 결과 카드 표시
        resultCard.style.display = 'block';
        
        // 총 개수 업데이트
        updateSummary();
    }
}

// 전역 함수로 설정 (하위 호환성)
window.deleteResultItem = deleteResultItem;

// 시간 수정 핸들러
async function handleTimeEdit(resultId) {
    console.log('handleTimeEdit 호출됨, resultId:', resultId);
    
    const result = simpleResultsList.find(r => r.id === resultId);
    if (!result) {
        console.error('결과를 찾을 수 없음:', resultId);
        return;
    }
    
    console.log('수정할 결과:', result);
    
    // 기존 시간 수정 모달이 있으면 제거
    const existingModal = document.querySelector('.popup-overlay.time-edit-modal');
    if (existingModal) {
        console.log('기존 모달 제거');
        existingModal.remove();
    }
    
    // 시간 수정 모달 생성
    const modal = createTimeEditModal(result, async (id, updatedData) => {
        console.log('수정 콜백 호출됨, id:', id, 'updatedData:', updatedData);
        
        // 결과 업데이트
        const resultIndex = simpleResultsList.findIndex(r => r.id === id);
        if (resultIndex !== -1) {
            // 기존 데이터 복사본 만들기
            const oldResult = { ...simpleResultsList[resultIndex] };
            console.log('병합 전 기존 데이터:', oldResult);
            console.log('병합할 updatedData:', updatedData);
            
            // 업데이트된 데이터로 교체
            simpleResultsList[resultIndex] = {
                ...oldResult,
                ...updatedData,
                updatedAt: new Date() // 수정 시간 추가
            };
            
            console.log('병합 후 결과:', simpleResultsList[resultIndex]);
            
            // Firestore에 저장
            await saveSimpleResults();
            
            // UI 업데이트
            const itemsContainer = document.querySelector('.result-items-container');
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
                
                // 다시 렌더링
                simpleResultsList.forEach((result, index) => {
                    // divider 추가 (첫 번째 아이템 제외)
                    if (index > 0) {
                        const divider = document.createElement('div');
                        divider.className = 'result-divider';
                        itemsContainer.appendChild(divider);
                    }
                    
                    const item = createResultItem(result, {
                        isSimpleMode: true,
                        onOptionChange: handleOptionChange,
                        onCountChange: handleCountChange,
                        onDelete: deleteResultItem,
                        onTimeEdit: handleTimeEdit
                    });
                    itemsContainer.appendChild(item);
                });
            }
            
            // 총 개수 업데이트
            updateSummary();
            
            console.log('UI 업데이트 완료');
        }
    });
    
    // 모달에 식별 클래스 추가
    modal.popup.classList.add('time-edit-modal');
    
    // DOM에 추가
    document.body.appendChild(modal.popup);
    
    // 타임피커 초기화
    setTimeout(() => {
        modal.initializeTimePickers();
    }, 100);
}