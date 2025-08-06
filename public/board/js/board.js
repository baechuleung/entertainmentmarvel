import { db } from '/js/firebase-config.js';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수
let allNotices = [];
let allEvents = [];
let currentTab = 'notice';

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    // URL 파라미터에서 tab 값 확인
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    // 탭 파라미터가 있으면 해당 탭으로 설정
    if (tabParam === 'event') {
        currentTab = 'event';
        // 탭 버튼 활성화 변경
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === 'event') {
                btn.classList.add('active');
            }
        });
        // 탭 콘텐츠 활성화 변경
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById('event-tab').classList.add('active');
    }
    
    // 페이지 타이틀 업데이트
    updatePageTitle();
    
    loadBoardData();
    setupTabs();
    setupEventListeners();
});

// 게시판 데이터 로드
async function loadBoardData() {
    try {
        // 공지사항 로드
        const noticesQuery = query(
            collection(db, 'boards'),
            where('category', '==', 'notice'),
            orderBy('createdAt', 'desc')
        );
        
        const noticesSnapshot = await getDocs(noticesQuery);
        allNotices = [];
        noticesSnapshot.forEach((doc) => {
            allNotices.push({ id: doc.id, ...doc.data() });
        });
        
        // 이벤트 로드
        const eventsQuery = query(
            collection(db, 'boards'),
            where('category', '==', 'event'),
            orderBy('createdAt', 'desc')
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        allEvents = [];
        eventsSnapshot.forEach((doc) => {
            allEvents.push({ id: doc.id, ...doc.data() });
        });
        
        // 현재 탭 표시
        displayCurrentTab();
        
    } catch (error) {
        console.error('게시판 데이터 로드 실패:', error);
        showError();
    }
}

// 페이지 타이틀 업데이트
function updatePageTitle() {
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = currentTab === 'notice' ? '공지사항' : '이벤트';
    }
    
    // HTML title 태그도 업데이트
    document.title = currentTab === 'notice' ? '공지사항 - 유흥마블' : '이벤트 - 유흥마블';
}

// 탭 설정
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 모든 탭 버튼과 콘텐츠 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 선택한 탭 활성화
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // 현재 탭 업데이트
            currentTab = targetTab;
            displayCurrentTab();
            
            // 페이지 타이틀 업데이트
            updatePageTitle();
        });
    });
}

// 현재 탭 표시
function displayCurrentTab() {
    if (currentTab === 'notice') {
        displayNotices();
    } else if (currentTab === 'event') {
        displayEvents();
    }
}

// 공지사항 표시
function displayNotices() {
    const noticeList = document.getElementById('notice-list');
    const emptyState = document.getElementById('notice-empty');
    
    if (allNotices.length === 0) {
        noticeList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    noticeList.style.display = 'flex';
    emptyState.style.display = 'none';
    
    noticeList.innerHTML = allNotices.map(notice => {
        const createdDate = notice.createdAt ? 
            new Date(notice.createdAt.toMillis()).toLocaleDateString('ko-KR') : '-';
        
        return `
            <div class="board-item" data-id="${notice.id}" data-category="notice">
                <span class="board-badge notice">공지</span>
                <h3 class="board-title">${notice.title}</h3>
                <div class="board-meta">
                    <span class="board-date">${createdDate}</span>
                    <span class="board-views">조회 ${notice.views || 0}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // 클릭 이벤트 추가
    document.querySelectorAll('#notice-list .board-item').forEach(item => {
        item.addEventListener('click', handleBoardClick);
    });
}

// 이벤트 표시
function displayEvents() {
    const eventList = document.getElementById('event-list');
    const emptyState = document.getElementById('event-empty');
    
    if (allEvents.length === 0) {
        eventList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    eventList.style.display = 'flex';
    emptyState.style.display = 'none';
    
    eventList.innerHTML = allEvents.map(event => {
        const createdDate = event.createdAt ? 
            new Date(event.createdAt.toMillis()).toLocaleDateString('ko-KR') : '-';
        
        return `
            <div class="board-item" data-id="${event.id}" data-category="event">
                <span class="board-badge event">이벤트</span>
                <h3 class="board-title">${event.title}</h3>
                <div class="board-meta">
                    <span class="board-date">${createdDate}</span>
                    <span class="board-views">조회 ${event.views || 0}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // 클릭 이벤트 추가
    document.querySelectorAll('#event-list .board-item').forEach(item => {
        item.addEventListener('click', handleBoardClick);
    });
}

// 게시글 클릭 처리
async function handleBoardClick(e) {
    const boardId = e.currentTarget.getAttribute('data-id');
    const category = e.currentTarget.getAttribute('data-category');
    
    const boardData = category === 'notice' ? 
        allNotices.find(n => n.id === boardId) : 
        allEvents.find(ev => ev.id === boardId);
    
    if (!boardData) return;
    
    // 조회수 증가
    await updateViewCount(boardId, boardData.views || 0, category);
    
    // 모달에 내용 표시
    showBoardModal(boardData);
}

// 조회수 업데이트
async function updateViewCount(boardId, currentViews, category) {
    try {
        await updateDoc(doc(db, 'boards', boardId), {
            views: currentViews + 1
        });
        
        // 로컬 데이터도 업데이트
        if (category === 'notice') {
            const notice = allNotices.find(n => n.id === boardId);
            if (notice) notice.views = currentViews + 1;
        } else {
            const event = allEvents.find(ev => ev.id === boardId);
            if (event) event.views = currentViews + 1;
        }
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}

// 게시글 모달 표시
function showBoardModal(boardData) {
    const modal = document.getElementById('board-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalViews = document.getElementById('modal-views');
    const modalContent = document.getElementById('modal-content');
    
    // 날짜 포맷
    const createdDate = boardData.createdAt ? 
        new Date(boardData.createdAt.toMillis()).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '-';
    
    // 모달 내용 설정
    modalTitle.textContent = boardData.title;
    modalDate.textContent = createdDate;
    modalViews.textContent = `조회 ${boardData.views || 0}`;
    modalContent.innerHTML = boardData.content || '';
    
    // 모달 표시
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// 모달 닫기
function closeModal() {
    const modal = document.getElementById('board-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 목록 새로고침 (조회수 업데이트 반영)
    displayCurrentTab();
}

// 에러 표시
function showError() {
    const noticeList = document.getElementById('notice-list');
    const eventList = document.getElementById('event-list');
    const noticeEmpty = document.getElementById('notice-empty');
    const eventEmpty = document.getElementById('event-empty');
    
    noticeList.style.display = 'none';
    eventList.style.display = 'none';
    noticeEmpty.style.display = 'block';
    eventEmpty.style.display = 'block';
    noticeEmpty.innerHTML = '<p>게시판을 불러오는데 실패했습니다.</p>';
    eventEmpty.innerHTML = '<p>게시판을 불러오는데 실패했습니다.</p>';
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 모달 닫기 버튼
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    // 모달 외부 클릭
    const modal = document.getElementById('board-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
}