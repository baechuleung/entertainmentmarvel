import { db } from '/js/firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수
let allNotices = [];

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadNotices();
    setupEventListeners();
});

// 공지사항 목록 로드
async function loadNotices() {
    try {
        // boards 컬렉션에서 category가 notice인 문서만 가져오기
        const noticesQuery = query(
            collection(db, 'boards'),
            where('category', '==', 'notice'),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(noticesQuery);
        
        allNotices = [];
        querySnapshot.forEach((doc) => {
            allNotices.push({ id: doc.id, ...doc.data() });
        });
        
        displayNotices();
        
    } catch (error) {
        console.error('공지사항 로드 실패:', error);
        showError();
    }
}

// 공지사항 목록 표시
function displayNotices() {
    const noticeList = document.getElementById('notice-list');
    const emptyState = document.getElementById('empty-state');
    
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
            <div class="notice-item" data-id="${notice.id}">
                <span class="notice-badge">공지</span>
                <h3 class="notice-title">${notice.title}</h3>
                <div class="notice-meta">
                    <span class="notice-date">${createdDate}</span>
                    <span class="notice-views">조회 ${notice.views || 0}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // 클릭 이벤트 추가
    document.querySelectorAll('.notice-item').forEach(item => {
        item.addEventListener('click', handleNoticeClick);
    });
}

// 공지사항 클릭 처리
async function handleNoticeClick(e) {
    const noticeId = e.currentTarget.getAttribute('data-id');
    const notice = allNotices.find(n => n.id === noticeId);
    
    if (!notice) return;
    
    // 조회수 증가
    await updateViewCount(noticeId, notice.views || 0);
    
    // 모달에 내용 표시
    showNoticeModal(notice);
}

// 조회수 업데이트
async function updateViewCount(noticeId, currentViews) {
    try {
        await updateDoc(doc(db, 'boards', noticeId), {
            views: currentViews + 1
        });
        
        // 로컬 데이터도 업데이트
        const notice = allNotices.find(n => n.id === noticeId);
        if (notice) {
            notice.views = currentViews + 1;
        }
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}

// 공지사항 모달 표시
function showNoticeModal(notice) {
    const modal = document.getElementById('notice-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalViews = document.getElementById('modal-views');
    const modalContent = document.getElementById('modal-content');
    
    // 날짜 포맷
    const createdDate = notice.createdAt ? 
        new Date(notice.createdAt.toMillis()).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '-';
    
    // 모달 내용 설정
    modalTitle.textContent = notice.title;
    modalDate.textContent = createdDate;
    modalViews.textContent = `조회 ${notice.views || 0}`;
    modalContent.innerHTML = notice.content || '';
    
    // 모달 표시
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// 모달 닫기
function closeModal() {
    const modal = document.getElementById('notice-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 목록 새로고침 (조회수 업데이트 반영)
    displayNotices();
}

// 에러 표시
function showError() {
    const noticeList = document.getElementById('notice-list');
    const emptyState = document.getElementById('empty-state');
    
    noticeList.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.innerHTML = '<p>공지사항을 불러오는데 실패했습니다.</p>';
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 모달 닫기 버튼
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    // 모달 외부 클릭
    const modal = document.getElementById('notice-modal');
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