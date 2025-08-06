import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
        // Firestore에서 포인트 내역 가져오기
        // point_history 컬렉션이 있다고 가정
        const historyRef = collection(db, 'point_history');
        const q = query(
            historyRef, 
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        pointHistory = [];
        
        querySnapshot.forEach((doc) => {
            pointHistory.push({ id: doc.id, ...doc.data() });
        });
        
        // 임시 데이터 (실제 데이터가 없을 경우)
        if (pointHistory.length === 0) {
            pointHistory = [
                {
                    title: '출석보상',
                    amount: 500,
                    type: 'earned',
                    createdAt: new Date('2025-07-31 01:38:46'),
                    status: '적립'
                },
                {
                    title: '출석보상',
                    amount: 500,
                    type: 'earned',
                    createdAt: new Date('2025-07-31 01:38:46'),
                    status: '적립'
                },
                {
                    title: '첫 회원가입 보상',
                    amount: 1000,
                    type: 'earned',
                    createdAt: new Date('2025-07-31 01:38:46'),
                    status: '적립'
                }
            ];
        }
        
        displayPointHistory();
        
    } catch (error) {
        console.error('포인트 내역 로드 실패:', error);
        // 에러 시 임시 데이터 표시
        pointHistory = [
            {
                title: '출석보상',
                amount: 500,
                type: 'earned',
                createdAt: new Date('2025-07-31 01:38:46'),
                status: '적립'
            },
            {
                title: '출석보상',
                amount: 500,
                type: 'earned',
                createdAt: new Date('2025-07-31 01:38:46'),
                status: '적립'
            },
            {
                title: '첫 회원가입 보상',
                amount: 1000,
                type: 'earned',
                createdAt: new Date('2025-07-31 01:38:46'),
                status: '적립'
            }
        ];
        displayPointHistory();
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
        return;
    }
    
    historyContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    historyContainer.innerHTML = filteredHistory.map(item => {
        const date = item.createdAt instanceof Date ? item.createdAt : item.createdAt.toDate();
        const dateStr = formatDate(date);
        const isPlus = item.type === 'earned';
        const sign = isPlus ? '+' : '-';
        const changeClass = isPlus ? 'plus' : 'minus';
        
        return `
            <div class="point-item">
                <div class="point-item-header">
                    <div>
                        <div class="point-title">${item.title}</div>
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

// 날짜 포맷팅
function formatDate(date) {
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
    
    // 포인트 아이템 클릭 시 마이페이지의 포인트 페이지로 이동
    const pointItems = document.querySelectorAll('.point-item:first-child');
    pointItems.forEach(item => {
        item.addEventListener('click', function() {
            window.location.href = '/point/point.html';
        });
    });
}