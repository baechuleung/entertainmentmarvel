// 파일경로: /tc-calculate/js/pro-tc.js
// 파일이름: pro-tc.js

// Pro TC JavaScript (리팩토링)
import { auth, db } from '/js/firebase-config.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// 공통 모듈 import
import { 
    setCurrentUser, 
    currentUser, 
    generateId, 
    formatDate 
} from './tc-common.js';
import { initializeTcSettings, loadTcSettings } from './tc-settings.js';
import { initializeTimePickers, resetTimePicker } from './time-picker.js';
import { calculateTimeDifference, calculateTC, validateTimeProMode } from './tc-calculator.js';
import { 
    createResultItem, 
    saveResultsToFirestore, 
    loadResultsFromFirestore,
    renumberResults,
    getMaxResultNumber
} from './result-manager.js';
import { captureAndShare } from './share-manager.js';
import { createTimeEditModal, initializeEditTimePickers } from './time-edit-modal.js';

// Pro 모드 전용 전역 변수
let sisterList = {};
let resultsList = [];
let resultCounter = 0;
window.selectedSisterId = null;

// 메인 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('Pro TC 페이지 로드');
    
    // 카카오 SDK 초기화
    if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init('13219d20b45f24998aeac3ac293e1dd8');
        console.log('Kakao SDK 초기화됨');
    }
    
    // 전역 함수 등록 (중요!)
    window.handleTimeEdit = handleTimeEdit;
    window.deleteResultItem = deleteResultItem;
    window.selectSister = selectSister;
    
    // UI 초기화
    initializeTcSettings();
    initializeSisterList();
    initializeTimeCalculator();
    initializeResultCard();
    initializeTimePickers(true); // Pro 모드
    
    // auth 상태 변경 감지
    onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
            console.log('로그인 사용자:', user.uid);
            await loadTcSettings();
            await loadSisterList();
            await loadResults();
        } else {
            console.log('로그아웃 상태');
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
    
    if (!validateTimeProMode(startTime, endTime)) {
        return;
    }
    
    // 시간 차이 계산
    const { hours, minutes, totalMinutes } = calculateTimeDifference(startTime, endTime);
    
    // TC 계산
    const { fullTcCount, halfTcCount } = calculateTC(totalMinutes);
    
    // 결과 표시
    await displayResult({
        storeInfo,
        startTime,
        endTime,
        hours,
        minutes,
        fullTcCount,
        halfTcCount,
        totalMinutes
    });
    
    // 입력 필드 초기화
    document.getElementById('storeInfo').value = '';
    resetTimePicker('startTimePicker');
    resetTimePicker('endTimePicker');
}

// 결과 표시
async function displayResult(data) {
    resultCounter++;
    const selectedSister = window.selectedSisterId ? sisterList[window.selectedSisterId] : null;
    
    // 날짜 포맷
    const dateStr = formatDate(data.startTime, data.endTime);
    
    // 결과 데이터 생성
    const resultData = {
        id: generateId('result'),
        number: resultCounter,
        date: dateStr,
        storeInfo: data.storeInfo || '미입력',
        sister: selectedSister,
        sisterId: window.selectedSisterId || null,
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
    resultsList.push(resultData);
    
    // 결과 카드와 컨테이너 가져오기
    const resultCard = document.getElementById('resultCard');
    const itemsContainer = document.getElementById('resultItemsContainer');
    
    if (!resultCard || !itemsContainer) {
        console.error('결과 카드 또는 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    // 아이템 생성
    const item = createResultItem(resultData, {
        isSimpleMode: false,
        onOptionChange: handleOptionChange,
        onCountChange: handleCountChange,
        onDelete: deleteResultItem,
        onTimeEdit: handleTimeEdit
    });
    
    // 현재 선택된 언니가 있고, 새로 추가되는 결과가 해당 언니의 것이 아니면 표시하지 않음
    if (window.selectedSisterId && window.selectedSisterId !== '' && window.selectedSisterId !== resultData.sisterId) {
        await saveResults();
        return;
    }
    
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
    await saveResults();
    
    // 총 개수 업데이트
    updateSummary();
}

// 옵션 변경 핸들러
async function handleOptionChange(resultId, optionName, checked) {
    const resultIndex = resultsList.findIndex(r => r.id === resultId);
    if (resultIndex === -1) return;
    
    if (!resultsList[resultIndex].options) {
        resultsList[resultIndex].options = {
            '차비': false,
            '지명': false,
            '팅김': false
        };
    }
    resultsList[resultIndex].options[optionName] = checked;
    
    await saveResults();
    updateSummary();
}

// 카운트 변경 핸들러
async function handleCountChange(resultId, countType, newValue) {
    const resultIndex = resultsList.findIndex(r => r.id === resultId);
    if (resultIndex !== -1) {
        resultsList[resultIndex][countType] = newValue;
        await saveResults();
        updateSummary();
    }
}

// 결과 저장
async function saveResults() {
    await saveResultsToFirestore(resultsList, 'results');
}

// 결과 불러오기
async function loadResults() {
    const results = await loadResultsFromFirestore('results');
    if (results) {
        resultsList = results;
        
        // 가장 큰 번호 찾기
        resultCounter = getMaxResultNumber(resultsList);
        
        // 결과 표시
        displayLoadedResults();
    }
}

// 불러온 결과 표시
function displayLoadedResults() {
    const container = document.getElementById('resultItemsContainer');
    const resultCard = document.getElementById('resultCard');
    
    if (!container || !resultCard) {
        console.error('결과 카드 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    if (resultsList.length > 0) {
        // 아이템 컨테이너 초기화
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        // 결과 재정렬
        resultsList = renumberResults(resultsList);
        
        // 가장 큰 번호로 카운터 설정
        resultCounter = resultsList.length;
        
        // 언니가 선택되어 있지 않으면 결과 카드 숨기고 종료
        if (!window.selectedSisterId || window.selectedSisterId === '') {
            resultCard.style.display = 'none';
            return;
        }
        
        // 선택된 언니의 결과만 필터링
        const filteredResults = resultsList.filter(result => result.sisterId === window.selectedSisterId);
        
        if (filteredResults.length === 0) {
            resultCard.style.display = 'none';
            return;
        }
        
        // 번호 역순으로 정렬 (큰 번호가 위로)
        filteredResults.sort((a, b) => b.number - a.number);
        
        filteredResults.forEach((result, index) => {
            // divider 추가 (첫 번째 아이템 제외)
            if (index > 0) {
                const divider = document.createElement('div');
                divider.className = 'result-divider';
                container.appendChild(divider);
            }
            
            const item = createResultItem(result, {
                isSimpleMode: false,
                onOptionChange: handleOptionChange,
                onCountChange: handleCountChange,
                onDelete: deleteResultItem,
                onTimeEdit: handleTimeEdit
            });
            container.appendChild(item);
        });
        
        // 결과 카드 표시
        resultCard.style.display = 'block';
        
        // 총 개수 업데이트
        updateSummary();
    }
}

// 결과 삭제
async function deleteResultItem(resultId) {
    if (confirm('이 계산 결과를 삭제하시겠습니까?')) {
        // 리스트에서 제거
        resultsList = resultsList.filter(r => r.id !== resultId);
        
        // 번호 재정렬
        resultsList = renumberResults(resultsList);
        
        // 가장 큰 번호 업데이트
        resultCounter = getMaxResultNumber(resultsList);
        
        // DOM에서 모든 아이템 다시 렌더링
        const itemsContainer = document.getElementById('resultItemsContainer');
        if (itemsContainer) {
            // 컨테이너 초기화
            while (itemsContainer.firstChild) {
                itemsContainer.removeChild(itemsContainer.firstChild);
            }
            
            // 선택된 언니의 결과만 필터링
            const filteredResults = resultsList.filter(result => 
                result.sisterId === window.selectedSisterId
            );
            
            // 다시 렌더링
            filteredResults.forEach((result, index) => {
                // divider 추가 (첫 번째 아이템 제외)
                if (index > 0) {
                    const divider = document.createElement('div');
                    divider.className = 'result-divider';
                    itemsContainer.appendChild(divider);
                }
                
                const item = createResultItem(result, {
                    isSimpleMode: false,
                    onOptionChange: handleOptionChange,
                    onCountChange: handleCountChange,
                    onDelete: deleteResultItem,
                    onTimeEdit: handleTimeEdit
                });
                itemsContainer.appendChild(item);
            });
        }
        
        // 결과가 하나도 없으면 카드 숨기기
        if (resultsList.filter(r => r.sisterId === window.selectedSisterId).length === 0) {
            const resultCard = document.getElementById('resultCard');
            if (resultCard) {
                resultCard.style.display = 'none';
            }
        }
        
        // Firestore 업데이트
        await saveResults();
        
        // 총 개수 업데이트
        updateSummary();
    }
}

// 총 개수 업데이트 함수
function updateSummary() {
    // 현재 선택된 언니의 결과만 필터링
    const filteredResults = resultsList.filter(result => 
        result.sisterId === window.selectedSisterId
    );
    
    let totalFullTc = 0;
    let totalHalfTc = 0;
    let totalCar = 0;
    let totalNomination = 0;
    let totalTing = 0;
    
    filteredResults.forEach(result => {
        totalFullTc += result.fullTcCount || 0;
        totalHalfTc += result.halfTcCount || 0;
        
        if (result.options) {
            if (result.options['차비']) totalCar++;
            if (result.options['지명']) totalNomination++;
            if (result.options['팅김']) totalTing++;
        }
    });
    
    // DOM 업데이트
    document.getElementById('totalFullTc').textContent = totalFullTc + '개';
    document.getElementById('totalHalfTc').textContent = totalHalfTc + '개';
    document.getElementById('totalCar').textContent = totalCar + '개';
    document.getElementById('totalNomination').textContent = totalNomination + '개';
    document.getElementById('totalTing').textContent = totalTing + '개';
}

// 언니별 결과 필터링 함수
function filterResultsBySister(sisterId) {
    const container = document.getElementById('resultItemsContainer');
    const resultCard = document.getElementById('resultCard');
    
    if (!container || !resultCard) return;
    
    // 컨테이너 초기화
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // 필터링된 결과
    let filteredResults = [];
    
    if (!sisterId || sisterId === '') {
        // 언니가 선택되지 않은 경우 카드 숨기고 종료
        resultCard.style.display = 'none';
        return;
    } else {
        // 특정 언니 결과만 필터링
        filteredResults = resultsList.filter(result => result.sisterId === sisterId);
    }
    
    // 필터링된 결과가 없으면 카드 숨기기
    if (filteredResults.length === 0) {
        resultCard.style.display = 'none';
        return;
    }
    
    // 번호 역순으로 정렬 (큰 번호가 위로)
    filteredResults.sort((a, b) => b.number - a.number);
    
    // 필터링된 결과 표시
    filteredResults.forEach((result, index) => {
        // divider 추가 (첫 번째 아이템 제외)
        if (index > 0) {
            const divider = document.createElement('div');
            divider.className = 'result-divider';
            container.appendChild(divider);
        }
        
        const item = createResultItem(result, {
            isSimpleMode: false,
            onOptionChange: handleOptionChange,
            onCountChange: handleCountChange,
            onDelete: deleteResultItem,
            onTimeEdit: handleTimeEdit
        });
        container.appendChild(item);
    });
    
    // 결과 카드 표시
    resultCard.style.display = 'block';
    
    // 총 개수 업데이트
    updateSummary();
}

// 결과 카드 초기화
function initializeResultCard() {
    const resetBtn = document.getElementById('resetAllBtn');
    const shareBtn = document.getElementById('shareAllBtn');
    
    if (resetBtn) {
        resetBtn.addEventListener('click', handleResetAll);
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShare);
    }
}

// 초기화 핸들러
async function handleResetAll() {
    if (confirm('모든 계산 결과를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        // 모든 결과 삭제
        resultsList = [];
        resultCounter = 0;
        
        // DOM 초기화
        const itemsContainer = document.getElementById('resultItemsContainer');
        while (itemsContainer.firstChild) {
            itemsContainer.removeChild(itemsContainer.firstChild);
        }
        
        // 결과 카드 숨기기
        document.getElementById('resultCard').style.display = 'none';
        
        // Firestore에서 삭제
        if (currentUser) {
            try {
                await saveResults();
                alert('모든 계산 결과가 삭제되었습니다.');
                
                // 총 개수 초기화
                updateSummary();
            } catch (error) {
                console.error('삭제 실패:', error);
                alert('삭제에 실패했습니다. 다시 시도해주세요.');
            }
        }
    }
}

// 공유 핸들러
async function handleShare() {
    const shareBtn = document.getElementById('shareAllBtn');
    
    if (!shareBtn) return;
    
    // 캡쳐할 컨테이너 생성
    const captureContainer = document.createElement('div');
    captureContainer.style.background = '#1E1E1E';
    captureContainer.style.position = 'absolute';
    captureContainer.style.left = '-9999px';
    captureContainer.style.width = document.getElementById('resultCard').offsetWidth + 'px';
    
    // 결과 아이템 컨테이너 복사
    const itemsClone = document.getElementById('resultItemsContainer').cloneNode(true);
    captureContainer.appendChild(itemsClone);
    
    // 총 개수 박스 복사
    const summaryClone = document.getElementById('resultSummaryBox').cloneNode(true);
    captureContainer.appendChild(summaryClone);
    
    document.body.appendChild(captureContainer);
    
    // 캡쳐 실행
    await captureAndShare(captureContainer, shareBtn, {
        includeWatermark: true,
        captureElement: captureContainer
    });
    
    // 임시 컨테이너 제거
    document.body.removeChild(captureContainer);
}

// 시간 수정 핸들러
async function handleTimeEdit(resultId) {
    console.log('handleTimeEdit 호출됨, resultId:', resultId);
    
    const result = resultsList.find(r => r.id === resultId);
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
        const resultIndex = resultsList.findIndex(r => r.id === id);
        if (resultIndex !== -1) {
            // 기존 데이터 복사본 만들기
            const oldResult = { ...resultsList[resultIndex] };
            console.log('병합 전 기존 데이터:', oldResult);
            console.log('병합할 updatedData:', updatedData);
            
            // 업데이트된 데이터로 교체
            resultsList[resultIndex] = {
                ...oldResult,
                ...updatedData,
                updatedAt: new Date() // 수정 시간 추가
            };
            
            console.log('병합 후 결과:', resultsList[resultIndex]);
            console.log('병합 후 startTime:', resultsList[resultIndex].startTime);
            console.log('병합 후 endTime:', resultsList[resultIndex].endTime);
            
            // 저장 전 전체 resultsList 확인
            console.log('저장 전 전체 resultsList:', JSON.parse(JSON.stringify(resultsList)));
            
            // Firestore에 저장
            await saveResults();
            
            // UI 업데이트 - 현재 선택된 언니 기준으로 필터링
            const container = document.getElementById('resultItemsContainer');
            if (container) {
                // 컨테이너 초기화
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
                
                // 선택된 언니의 결과만 필터링
                const filteredResults = resultsList.filter(result => 
                    result.sisterId === window.selectedSisterId
                );
                
                // 번호 역순으로 정렬 (큰 번호가 위로)
                filteredResults.sort((a, b) => b.number - a.number);
                
                // 다시 렌더링
                filteredResults.forEach((result, index) => {
                    // divider 추가 (첫 번째 아이템 제외)
                    if (index > 0) {
                        const divider = document.createElement('div');
                        divider.className = 'result-divider';
                        container.appendChild(divider);
                    }
                    
                    const item = createResultItem(result, {
                        isSimpleMode: false,
                        onOptionChange: handleOptionChange,
                        onCountChange: handleCountChange,
                        onDelete: deleteResultItem,
                        onTimeEdit: handleTimeEdit
                    });
                    container.appendChild(item);
                });
                
                // 총 개수 업데이트
                updateSummary();
            }
            
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

// 언니 리스트 관리 섹션
// ================================

// 언니리스트 초기화
function initializeSisterList() {
    // 언니 선택 버튼
    const sisterSelectBtn = document.getElementById('sisterSelectBtn');
    if (sisterSelectBtn) {
        sisterSelectBtn.addEventListener('click', showSisterSelectPopup);
    }
    
    // 추가 버튼
    const addSisterBtn = document.getElementById('addSisterBtn');
    if (addSisterBtn) {
        addSisterBtn.addEventListener('click', showPopup);
    }

    // 삭제 버튼
    const deleteSisterBtn = document.getElementById('deleteSisterBtn');
    if (deleteSisterBtn) {
        deleteSisterBtn.addEventListener('click', deleteSister);
    }

    // 팝업 닫기 버튼들
    const popupClose = document.getElementById('popupClose');
    if (popupClose) {
        popupClose.addEventListener('click', hidePopup);
    }
    
    const sisterSelectClose = document.getElementById('sisterSelectClose');
    if (sisterSelectClose) {
        sisterSelectClose.addEventListener('click', hideSisterSelectPopup);
    }

    // 팝업 오버레이 클릭 시 닫기
    const addSisterPopup = document.getElementById('addSisterPopup');
    if (addSisterPopup) {
        addSisterPopup.addEventListener('click', function(e) {
            if (e.target === addSisterPopup) {
                hidePopup();
            }
        });
    }
    
    const sisterSelectPopup = document.getElementById('sisterSelectPopup');
    if (sisterSelectPopup) {
        sisterSelectPopup.addEventListener('click', function(e) {
            if (e.target === sisterSelectPopup) {
                hideSisterSelectPopup();
            }
        });
    }

    // 저장 버튼
    const submitSister = document.getElementById('submitSister');
    if (submitSister) {
        submitSister.addEventListener('click', saveSister);
    }
    
    // 검색 입력 필드
    const sisterSearchInput = document.getElementById('sisterSearchInput');
    if (sisterSearchInput) {
        sisterSearchInput.addEventListener('input', filterSisterList);
    }
}

// 언니 선택 팝업 표시
function showSisterSelectPopup() {
    const popup = document.getElementById('sisterSelectPopup');
    if (popup) {
        popup.classList.add('active');
        updateSisterListPopup();
        
        // 검색 필드 초기화 및 포커스
        const searchInput = document.getElementById('sisterSearchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
    }
}

// 언니 선택 팝업 숨기기
function hideSisterSelectPopup() {
    const popup = document.getElementById('sisterSelectPopup');
    if (popup) {
        popup.classList.remove('active');
    }
}

// 언니 리스트 팝업 업데이트
function updateSisterListPopup() {
    const container = document.getElementById('sisterListContainer');
    if (!container) return;
    
    // 기존 내용 초기화
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // 언니 리스트가 없으면 메시지 표시
    if (Object.keys(sisterList).length === 0) {
        document.getElementById('noResultMessage').style.display = 'block';
        document.getElementById('noResultMessage').textContent = '등록된 언니가 없습니다.';
        return;
    }
    
    document.getElementById('noResultMessage').style.display = 'none';
    
    // 언니 리스트 추가
    Object.entries(sisterList).forEach(([id, sister]) => {
        const item = document.createElement('div');
        item.className = 'sister-list-item';
        item.dataset.value = id;
        if (window.selectedSisterId === id) {
            item.classList.add('selected');
        }
        
        const name = document.createElement('span');
        name.className = 'sister-name';
        name.textContent = sister.name;
        
        const company = document.createElement('span');
        company.className = 'sister-company';
        company.textContent = sister.company;
        
        item.appendChild(name);
        item.appendChild(company);
        item.addEventListener('click', function() {
            window.selectSister(id, `${sister.name} (${sister.company})`);
        });
        container.appendChild(item);
    });
}

// 언니 리스트 검색 필터
function filterSisterList() {
    const searchValue = document.getElementById('sisterSearchInput').value.toLowerCase();
    const items = document.querySelectorAll('.sister-list-item');
    let visibleCount = 0;
    
    items.forEach(item => {
        const name = item.querySelector('.sister-name').textContent.toLowerCase();
        const company = item.querySelector('.sister-company').textContent.toLowerCase();
        
        if (name.includes(searchValue) || company.includes(searchValue)) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // 검색 결과가 없으면 메시지 표시
    const noResultMessage = document.getElementById('noResultMessage');
    if (visibleCount === 0 && items.length > 0) {
        noResultMessage.style.display = 'block';
        noResultMessage.textContent = '검색 결과가 없습니다.';
    } else {
        noResultMessage.style.display = 'none';
    }
}

// 팝업 표시
function showPopup() {
    const popupOverlay = document.getElementById('addSisterPopup');
    if (popupOverlay) {
        popupOverlay.classList.add('active');
        // 입력 필드 초기화
        document.getElementById('sisterName').value = '';
        document.getElementById('sisterCompany').value = '';
    }
}

// 팝업 숨기기
function hidePopup() {
    const popupOverlay = document.getElementById('addSisterPopup');
    if (popupOverlay) {
        popupOverlay.classList.remove('active');
    }
}

// 언니 정보 저장
async function saveSister() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    const sisterName = document.getElementById('sisterName').value.trim();
    const sisterCompany = document.getElementById('sisterCompany').value.trim();

    if (!sisterName || !sisterCompany) {
        alert('언니이름과 소속업체를 모두 입력해주세요.');
        return;
    }

    try {
        // 고유 ID 생성
        const sisterId = generateId('sister');
        
        // 현재 리스트에 추가
        sisterList[sisterId] = {
            name: sisterName,
            company: sisterCompany
        };

        // Firestore에 저장
        const sisterDocRef = doc(db, 'users', currentUser.uid, 'tc-calculate', 'sisterList');
        await setDoc(sisterDocRef, sisterList, { merge: true });

        // 언니 리스트 팝업 업데이트
        updateSisterListPopup();

        // 팝업 닫기
        hidePopup();

        alert('언니 정보가 저장되었습니다.');
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
}

// 언니 리스트 불러오기
async function loadSisterList() {
    if (!currentUser) {
        console.log('로그인이 필요합니다.');
        return;
    }

    try {
        const sisterDocRef = doc(db, 'users', currentUser.uid, 'tc-calculate', 'sisterList');
        const docSnap = await getDoc(sisterDocRef);

        if (docSnap.exists()) {
            sisterList = docSnap.data();
            console.log('언니 리스트 로드:', sisterList);
            updateSisterListPopup();
        } else {
            console.log('저장된 언니 리스트가 없습니다.');
            sisterList = {};
        }
    } catch (error) {
        console.error('언니 리스트 불러오기 실패:', error);
        sisterList = {};
    }
}

// 언니 삭제
async function deleteSister() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    if (!window.selectedSisterId || window.selectedSisterId === '') {
        alert('삭제할 언니를 선택해주세요.');
        return;
    }
    
    const selectedSister = sisterList[window.selectedSisterId];
    if (!selectedSister) {
        alert('선택한 언니 정보를 찾을 수 없습니다.');
        return;
    }
    
    if (confirm(`${selectedSister.name} (${selectedSister.company})님을 삭제하시겠습니까?`)) {
        try {
            // 리스트에서 제거
            delete sisterList[window.selectedSisterId];
            
            // Firestore에 업데이트
            const sisterDocRef = doc(db, 'users', currentUser.uid, 'tc-calculate', 'sisterList');
            await setDoc(sisterDocRef, sisterList, { merge: false });
            
            // UI 업데이트
            updateSisterListPopup();
            
            // 선택 초기화
            const selectedText = document.getElementById('selectedSisterText');
            if (selectedText) {
                selectedText.textContent = '언니리스트 및 선택';
            }
            document.getElementById('deleteSisterBtn').style.display = 'none';
            window.selectedSisterId = null;
            
            // 언니가 선택되지 않았으므로 결과 카드 숨기기
            const resultCard = document.querySelector('.result-card');
            if (resultCard) {
                resultCard.style.display = 'none';
            }
            
            alert('삭제되었습니다.');
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다. 다시 시도해주세요.');
        }
    }
}

// 언니 선택 함수를 전역에 정의
function selectSister(sisterId, sisterText) {
    window.selectedSisterId = sisterId;
    
    // 선택된 텍스트 업데이트
    const selectedText = document.getElementById('selectedSisterText');
    if (selectedText) {
        selectedText.textContent = sisterText;
    }
    
    // 삭제 버튼 표시
    const deleteBtn = document.getElementById('deleteSisterBtn');
    if (deleteBtn) {
        deleteBtn.style.display = 'inline-block';
    }
    
    // 팝업 닫기
    hideSisterSelectPopup();
    
    // 해당 언니의 결과만 필터링해서 표시
    filterResultsBySister(sisterId);
}

// 전역에 등록
window.selectSister = selectSister;