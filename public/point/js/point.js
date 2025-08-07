import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수
let currentUser = null;
let userData = null;
let pointHistory = [];
let currentTab = 'all';

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadPointHistory();
        } else {
            // 로그인되지 않은 경우 로그인 페이지로
            window.location.href = '/auth/login.html';
        }
    });
}

// 사용자 데이터 로드
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            displayTotalPoints();
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 총 포인트 표시
function displayTotalPoints() {
    const totalPointsEl = document.getElementById('total-points');
    if (totalPointsEl) {
        const points = userData.points || 0;
        totalPointsEl.textContent = `${points.toLocaleString()} P`;
    }
}

// 포인트 내역 로드
async function loadPointHistory() {
    try {
        // userData에서 point_history 맵 가져오기
        const pointHistoryMap = userData.point_history || {};
        
        // 맵을 배열로 변환하고 정렬
        pointHistory = [];
        
        for (const [key, value] of Object.entries(pointHistoryMap)) {
            // createdAt을 Date 객체로 변환
            const historyItem = {
                ...value,
                id: key,
                createdAt: value.createdAt ? value.createdAt.toDate() : new Date(parseInt(key))
            };
            pointHistory.push(historyItem);
        }
        
        // 최신순으로 정렬
        pointHistory.sort((a, b) => b.createdAt - a.createdAt);
        
        // 포인트 내역이 없을 경우 기본 데이터 표시
        if (pointHistory.length === 0) {
            // 회원가입 보너스가 있는지 확인
            if (userData.createdAt) {
                pointHistory.push({
                    title: '회원가입 보너스',
                    amount: 1000,
                    type: 'earned',
                    createdAt: userData.createdAt.toDate(),
                    status: '적립'
                });
            }
        }
        
        displayPointHistory();
        updatePeriodText();
        
    } catch (error) {
        console.error('포인트 내역 로드 실패:', error);
        
        // 에러 시 빈 상태 표시
        pointHistory = [];
        displayPointHistory();
    }
}

// 기간 텍스트 업데이트
function updatePeriodText() {
    const periodText = document.getElementById('period-text');
    if (periodText && pointHistory.length > 0) {
        // 가장 오래된 날짜와 가장 최근 날짜 찾기
        const dates = pointHistory.map(item => item.createdAt);
        const oldestDate = new Date(Math.min(...dates));
        const newestDate = new Date(Math.max(...dates));
        
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}.${month}.${day}`;
        };
        
        periodText.textContent = `${formatDate(oldestDate)} ~ ${formatDate(newestDate)}`;
    }
}

// 포인트 내역 표시
function displayPointHistory() {
    const historyContainer = document.getElementById('point-history');
    const emptyState = document.getElementById('empty-state');
    
    // 탭에 따라 필터링
    let filteredHistory = pointHistory;
    if (currentTab === 'earned') {
        filteredHistory = pointHistory.filter(item => item.type === 'earned');
    } else if (currentTab === 'used') {
        filteredHistory = pointHistory.filter(item => item.type === 'used');
    }
    
    if (filteredHistory.length === 0) {
        historyContainer.style.display = 'none';
        emptyState.style.display = 'block';
        
        // 탭에 따른 빈 상태 메시지
        if (currentTab === 'earned') {
            emptyState.innerHTML = '<p>적립 내역이 없습니다.</p>';
        } else if (currentTab === 'used') {
            emptyState.innerHTML = '<p>사용 내역이 없습니다.</p>';
        } else {
            emptyState.innerHTML = '<p>포인트 내역이 없습니다.</p>';
        }
        return;
    }
    
    historyContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    historyContainer.innerHTML = filteredHistory.map(item => {
        const dateStr = formatDateTime(item.createdAt);
        const isPlus = item.type === 'earned';
        const sign = isPlus ? '+' : '-';
        const changeClass = isPlus ? 'plus' : 'minus';
        
        // 상세 정보 추가 (후기 제목 등)
        let titleText = item.title;
        if (item.reviewTitle) {
            titleText += ` - ${item.reviewTitle}`;
        }
        
        return `
            <div class="point-item">
                <div class="point-item-header">
                    <div>
                        <div class="point-title">${titleText}</div>
                        <div class="point-date">${dateStr}</div>
                    </div>
                    <div>
                        <div class="point-change ${changeClass}">${sign} ${item.amount.toLocaleString()}P</div>
                        <div class="point-status">${item.status || (isPlus ? '적립' : '사용')}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 날짜 시간 포맷팅
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 탭 버튼 클릭
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 모든 탭 버튼에서 active 제거
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            
            // 클릭한 버튼에 active 추가
            this.classList.add('active');
            
            // 현재 탭 업데이트
            currentTab = this.getAttribute('data-tab');
            
            // 내역 다시 표시
            displayPointHistory();
        });
    });
    
    // 기간 버튼 클릭 (추후 기능 추가 가능)
    const periodBtn = document.querySelector('.period-btn');
    if (periodBtn) {
        periodBtn.addEventListener('click', function() {
            // 추후 날짜 선택 기능 추가 가능
            console.log('기간 설정 버튼 클릭');
        });
    }
}