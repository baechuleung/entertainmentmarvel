import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
    // 닉네임
    const nicknameInput = document.getElementById('nickname');
    if (nicknameInput) {
        nicknameInput.value = userData.nickname || '';
    }
    
    // 이메일
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = currentUser.email || '';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 폼 제출
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleFormSubmit);
    }
    
    // 비밀번호 확인
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            validatePasswordMatch();
        });
    }
}

// 비밀번호 일치 확인
function validatePasswordMatch() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const passwordError = document.getElementById('password-error');
    
    if (confirmPassword && newPassword !== confirmPassword) {
        passwordError.textContent = '비밀번호가 일치하지 않습니다.';
        passwordError.classList.add('show');
        return false;
    } else {
        passwordError.classList.remove('show');
        return true;
    }
}

// 폼 제출 처리
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const saveBtn = e.target.querySelector('.save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    
    try {
        // 닉네임 업데이트
        const nickname = document.getElementById('nickname').value;
        
        const updateData = {
            nickname: nickname,
            updatedAt: new Date()
        };
        
        // Firestore 업데이트
        await updateDoc(doc(db, 'users', currentUser.uid), updateData);
        
        // 비밀번호 변경 처리
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        
        if (currentPassword && newPassword) {
            if (!validatePasswordMatch()) {
                throw new Error('비밀번호가 일치하지 않습니다.');
            }
            
            // 재인증
            const credential = EmailAuthProvider.credential(
                currentUser.email,
                currentPassword
            );
            
            await reauthenticateWithCredential(currentUser, credential);
            
            // 비밀번호 업데이트
            await updatePassword(currentUser, newPassword);
        }
        
        alert('회원정보가 수정되었습니다.');
        window.location.href = '/mypage/mypage.html';
        
    } catch (error) {
        console.error('정보 수정 실패:', error);
        
        if (error.code === 'auth/wrong-password') {
            alert('현재 비밀번호가 올바르지 않습니다.');
        } else if (error.code === 'auth/weak-password') {
            alert('새 비밀번호가 너무 약합니다. 6자 이상 입력해주세요.');
        } else {
            alert('정보 수정에 실패했습니다. ' + error.message);
        }
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '저장하기';
    }
}