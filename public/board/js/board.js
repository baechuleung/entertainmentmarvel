import { db } from '/js/firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc,
    updateDoc,
    query,
    where,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수
let allNotices = [];
let allEvents = [];
let currentTab = 'notice';

// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', async () => {
    await loadBoards();
    setupTabs();
    setupEventListeners();
    displayCurrentTab();
    updatePageTitle();
});

// 게시판 데이터 로드
async function loadBoards() {
    try {
        // 공지사항 로드
        const noticeQuery = query(
            collection(db, 'boards'),
            where('category', '==', 'notice'),
            orderBy('createdAt', 'desc')
        );
        const noticeSnapshot = await getDocs(noticeQuery);
        allNotices = noticeSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // 이벤트 로드
        const eventQuery = query(
            collection(db, 'boards'),
            where('category', '==', 'event'),
            orderBy('createdAt', 'desc')
        );
        const eventSnapshot = await getDocs(eventQuery);
        allEvents = eventSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
    } catch (error) {
        console.error('게시판 로드 실패:', error);
        showError();
    }
}

// 페이지 타이틀 업데이트
function updatePageTitle() {
    const pageTitle = document.querySelector('title');
    if (pageTitle) {
        pageTitle.textContent = currentTab === 'notice' ? 
            '공지사항 - 유흥마블' : '이벤트 - 유흥마블';
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
                <div class="board-badge notice">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                </div>
                <div class="board-content">
                    <h3 class="board-title">${notice.title}</h3>
                    <div class="board-meta">
                        <span class="board-author">${notice.author || '관리자'}</span>
                        <span class="board-divider">|</span>
                        <span class="board-date">${createdDate}</span>
                    </div>
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
                <div class="board-badge event">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                </div>
                <div class="board-content">
                    <h3 class="board-title">${event.title}</h3>
                    <div class="board-meta">
                        <span class="board-author">${event.author || '관리자'}</span>
                        <span class="board-divider">|</span>
                        <span class="board-date">${createdDate}</span>
                    </div>
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