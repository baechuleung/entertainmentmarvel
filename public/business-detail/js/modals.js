// 모달 관리 모듈

// 모달 설정
export function setupModals() {
    // 모달 닫기 버튼들
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            if (modalId) {
                closeModal(modalId);
            }
        });
    });
    
    // 취소 버튼들
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            if (modalId) {
                closeModal(modalId);
            }
        });
    });
    
    // 모달 외부 클릭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('review-modal')) {
            closeModal(e.target.id);
        }
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.review-modal.show');
            openModals.forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
}

// 모달 열기
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 스크롤 방지
    }
}

// 모달 닫기
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // 스크롤 복원
    }
}

// 모든 모달 닫기
export function closeAllModals() {
    document.querySelectorAll('.review-modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.body.style.overflow = '';
}