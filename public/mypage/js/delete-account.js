import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수
let currentUser = null;
let userData = null;

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
            displayUserInfo();
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 사용자 정보 표시
function displayUserInfo() {
    // 포인트
    const pointsEl = document.getElementById('user-points');
    if (pointsEl) {
        pointsEl.textContent = `${userData.points || 0} P`;
    }
    
    // 리뷰 개수
    const reviewCountEl = document.getElementById('review-count');
    if (reviewCountEl) {
        reviewCountEl.textContent = `${userData.reviews_count || 0}개`;
    }
    
    // 북마크 개수
    const bookmarkCountEl = document.getElementById('bookmark-count');
    if (bookmarkCountEl) {
        const bookmarks = userData.bookmarks || [];
        bookmarkCountEl.textContent = `${bookmarks.length}개`;
    }
    
    // 업체회원인 경우 추가 정보 표시
    if (userData.userType === 'business') {
        const businessOnly = document.querySelector('.business-only');
        if (businessOnly) {
            businessOnly.style.display = 'flex';
        }
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 동의 체크박스
    const agreementCheckbox = document.getElementById('agreement');
    const deleteBtn = document.getElementById('delete-btn');
    
    if (agreementCheckbox && deleteBtn) {
        agreementCheckbox.addEventListener('change', (e) => {
            deleteBtn.disabled = !e.target.checked;
        });
    }
    
    // 탈퇴 버튼
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteAccount);
    }
    
    // 기타 사유 선택 시 텍스트 영역 포커스
    const reasonRadios = document.querySelectorAll('input[name="reason"]');
    const reasonText = document.getElementById('reason-text');
    
    reasonRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'other' && reasonText) {
                reasonText.focus();
            }
        });
    });
}

// 회원 탈퇴 처리
async function handleDeleteAccount() {
    const password = document.getElementById('password').value;
    const passwordError = document.getElementById('password-error');
    const deleteBtn = document.getElementById('delete-btn');
    
    // 비밀번호 확인
    if (!password) {
        passwordError.textContent = '비밀번호를 입력해주세요.';
        passwordError.classList.add('show');
        return;
    }
    
    // 최종 확인
    const finalConfirm = confirm(
        '정말로 탈퇴하시겠습니까?\n\n' +
        '탈퇴 후에는 모든 데이터가 삭제되며 복구할 수 없습니다.'
    );
    
    if (!finalConfirm) return;
    
    deleteBtn.disabled = true;
    deleteBtn.textContent = '탈퇴 처리 중...';
    
    try {
        // 재인증
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            password
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        
        // 탈퇴 사유 수집 (선택사항)
        const selectedReason = document.querySelector('input[name="reason"]:checked');
        const reasonText = document.getElementById('reason-text').value;
        
        if (selectedReason || reasonText) {
            // 탈퇴 사유 저장 (통계용)
            console.log('탈퇴 사유:', {
                reason: selectedReason?.value,
                text: reasonText,
                userId: currentUser.uid,
                date: new Date()
            });
        }
        
        // Firestore에서 사용자 데이터 삭제
        await deleteDoc(doc(db, 'users', currentUser.uid));
        
        // Firebase Auth에서 사용자 삭제
        await deleteUser(currentUser);
        
        // 로컬 스토리지 정리
        localStorage.clear();
        
        alert('회원 탈퇴가 완료되었습니다.\n그동안 이용해주셔서 감사합니다.');
        window.location.href = '/';
        
    } catch (error) {
        console.error('회원 탈퇴 실패:', error);
        
        if (error.code === 'auth/wrong-password') {
            passwordError.textContent = '비밀번호가 올바르지 않습니다.';
            passwordError.classList.add('show');
        } else if (error.code === 'auth/requires-recent-login') {
            alert('보안을 위해 다시 로그인한 후 탈퇴를 진행해주세요.');
            await auth.signOut();
            window.location.href = '/auth/login.html';
        } else {
            alert('회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
        
        deleteBtn.disabled = false;
        deleteBtn.textContent = '탈퇴하기';
    }
}