import { db } from '/js/firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수
let allEvents = [];

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    setupEventListeners();
});

// 이벤트 목록 로드
async function loadEvents() {
    try {
        // boards 컬렉션에서 category가 event인 문서만 가져오기
        const eventsQuery = query(
            collection(db, 'boards'),
            where('category', '==', 'event'),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(eventsQuery);
        
        allEvents = [];
        querySnapshot.forEach((doc) => {
            allEvents.push({ id: doc.id, ...doc.data() });
        });
        
        displayEvents();
        
    } catch (error) {
        console.error('이벤트 로드 실패:', error);
        showError();
    }
}

// 이벤트 목록 표시
function displayEvents() {
    const eventList = document.getElementById('event-list');
    const emptyState = document.getElementById('empty-state');
    
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
            <div class="event-item" data-id="${event.id}">
                <span class="event-badge">이벤트</span>
                <h3 class="event-title">${event.title}</h3>
                <div class="event-meta">
                    <span class="event-date">${createdDate}</span>
                    <span class="event-views">조회 ${event.views || 0}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // 클릭 이벤트 추가
    document.querySelectorAll('.event-item').forEach(item => {
        item.addEventListener('click', handleEventClick);
    });
}

// 이벤트 클릭 처리
async function handleEventClick(e) {
    const eventId = e.currentTarget.getAttribute('data-id');
    const event = allEvents.find(ev => ev.id === eventId);
    
    if (!event) return;
    
    // 조회수 증가
    await updateViewCount(eventId, event.views || 0);
    
    // 모달에 내용 표시
    showEventModal(event);
}

// 조회수 업데이트
async function updateViewCount(eventId, currentViews) {
    try {
        await updateDoc(doc(db, 'boards', eventId), {
            views: currentViews + 1
        });
        
        // 로컬 데이터도 업데이트
        const event = allEvents.find(ev => ev.id === eventId);
        if (event) {
            event.views = currentViews + 1;
        }
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}

// 이벤트 모달 표시
function showEventModal(event) {
    const modal = document.getElementById('event-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalViews = document.getElementById('modal-views');
    const modalContent = document.getElementById('modal-content');
    
    // 날짜 포맷
    const createdDate = event.createdAt ? 
        new Date(event.createdAt.toMillis()).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '-';
    
    // 모달 내용 설정
    modalTitle.textContent = event.title;
    modalDate.textContent = createdDate;
    modalViews.textContent = `조회 ${event.views || 0}`;
    modalContent.innerHTML = event.content || '';
    
    // 모달 표시
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// 모달 닫기
function closeModal() {
    const modal = document.getElementById('event-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 목록 새로고침 (조회수 업데이트 반영)
    displayEvents();
}

// 에러 표시
function showError() {
    const eventList = document.getElementById('event-list');
    const emptyState = document.getElementById('empty-state');
    
    eventList.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.innerHTML = '<p>이벤트를 불러오는데 실패했습니다.</p>';
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 모달 닫기 버튼
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    // 모달 외부 클릭
    const modal = document.getElementById('event-modal');
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