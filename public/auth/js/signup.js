import { auth, db } from '/js/firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM 요소
const signupForm = document.getElementById('signup-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('password-confirm');
const nicknameInput = document.getElementById('nickname');
const agreeAllCheckbox = document.getElementById('agree-all');
const agreeItems = document.querySelectorAll('.agree-item');
const submitButton = document.querySelector('.btn-signup-submit');

// 로그인 상태 확인
onAuthStateChanged(auth, (user) => {
    if (user) {
        // 이미 로그인된 경우 메인 페이지로 이동
        window.location.href = '/main/main.html';
    }
});

// 에러 메시지 표시
function showError(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message show';
    errorDiv.textContent = message;
    
    signupForm.insertBefore(errorDiv, signupForm.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// 성공 메시지 표시
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message show';
    successDiv.textContent = message;
    
    signupForm.insertBefore(successDiv, signupForm.firstChild);
}

// 로딩 상태 설정
function setLoading(isLoading) {
    if (isLoading) {
        submitButton.disabled = true;
        submitButton.innerHTML = '가입 중<span class="loading-spinner"></span>';
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = '회원가입';
    }
}

// 입력 검증
function validateForm() {
    let isValid = true;
    
    // 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value)) {
        document.getElementById('email-error').textContent = '유효한 이메일을 입력해주세요.';
        emailInput.classList.add('error');
        isValid = false;
    } else {
        document.getElementById('email-error').textContent = '';
        emailInput.classList.remove('error');
    }
    
    // 비밀번호 검증
    if (passwordInput.value.length < 6) {
        document.getElementById('password-error').textContent = '비밀번호는 6자 이상이어야 합니다.';
        passwordInput.classList.add('error');
        isValid = false;
    } else {
        document.getElementById('password-error').textContent = '';
        passwordInput.classList.remove('error');
    }
    
    // 비밀번호 확인 검증
    if (passwordInput.value !== passwordConfirmInput.value) {
        document.getElementById('password-confirm-error').textContent = '비밀번호가 일치하지 않습니다.';
        passwordConfirmInput.classList.add('error');
        isValid = false;
    } else {
        document.getElementById('password-confirm-error').textContent = '';
        passwordConfirmInput.classList.remove('error');
    }
    
    // 닉네임 검증
    if (nicknameInput.value.trim().length < 2) {
        document.getElementById('nickname-error').textContent = '닉네임은 2자 이상이어야 합니다.';
        nicknameInput.classList.add('error');
        isValid = false;
    } else {
        document.getElementById('nickname-error').textContent = '';
        nicknameInput.classList.remove('error');
    }
    
    // 필수 약관 동의 확인
    const termsChecked = document.getElementById('agree-terms').checked;
    const privacyChecked = document.getElementById('agree-privacy').checked;
    
    if (!termsChecked || !privacyChecked) {
        showError('필수 약관에 동의해주세요.');
        isValid = false;
    }
    
    return isValid;
}

// 전체 동의 체크박스
agreeAllCheckbox.addEventListener('change', (e) => {
    agreeItems.forEach(item => {
        item.checked = e.target.checked;
    });
});

// 개별 약관 체크 시 전체 동의 체크박스 업데이트
agreeItems.forEach(item => {
    item.addEventListener('change', () => {
        const allChecked = Array.from(agreeItems).every(item => item.checked);
        agreeAllCheckbox.checked = allChecked;
    });
});

// 회원가입 처리
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    setLoading(true);
    
    try {
        // 선택된 회원 유형 가져오기
        const memberType = document.querySelector('input[name="member-type"]:checked').value;
        
        // Firebase Auth 회원가입
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            emailInput.value,
            passwordInput.value
        );
        
        const user = userCredential.user;
        
        // 프로필 업데이트 (닉네임을 displayName으로 사용)
        await updateProfile(user, {
            displayName: nicknameInput.value
        });
        
        // Firestore에 사용자 정보 저장
        const userDataToSave = {
            uid: user.uid,
            email: emailInput.value,
            nickname: nicknameInput.value,
            userType: memberType, // 'member' 또는 'business'
            marketingAgreed: document.getElementById('agree-marketing').checked,
            createdAt: new Date(),
            lastLogin: new Date()
        };
        
        // 일반회원인 경우 레벨 추가
        if (memberType === 'member') {
            userDataToSave.level = 1;
        }
        
        await setDoc(doc(db, 'users', user.uid), userDataToSave);
        
        // 회원가입 성공 - 자동으로 로그인된 상태이므로 메인 페이지로 이동
        window.location.href = '/main/main.html';
        
    } catch (error) {
        setLoading(false);
        
        console.error('회원가입 에러:', error);
        console.error('에러 코드:', error.code);
        console.error('에러 메시지:', error.message);
        
        // Firebase 에러 메시지 한글화
        let errorMessage = '회원가입에 실패했습니다.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '이미 사용 중인 이메일입니다.';
                break;
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일 형식입니다.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = '이메일/비밀번호 계정이 비활성화되어 있습니다. Firebase Console에서 활성화해주세요.';
                break;
            case 'auth/weak-password':
                errorMessage = '비밀번호가 너무 약합니다.';
                break;
            default:
                errorMessage = `회원가입 실패: ${error.message}`;
        }
        
        showError(errorMessage);
    }
});