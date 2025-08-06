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

// 로그인 상태 확인 - 회원가입 중에는 리다이렉트 막기
let isSigningUp = false;

onAuthStateChanged(auth, (user) => {
    if (user && !isSigningUp) {
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
    
    // 비밀번호 검증 - 특수문자, 영어, 숫자 포함 8자리 이상
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(passwordInput.value)) {
        document.getElementById('password-error').textContent = '비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다.';
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
    
    // 회원가입 시작 플래그
    isSigningUp = true;
    setLoading(true);
    
    // 선택된 회원 유형 가져오기
    const memberType = document.querySelector('input[name="member-type"]:checked').value;
    
    console.log('=== 회원가입 시작 ===');
    console.log('이메일:', emailInput.value);
    console.log('회원 유형:', memberType);
    
    try {
        // 1단계: Firebase Auth 회원가입
        console.log('1단계: Authentication 시작...');
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            emailInput.value,
            passwordInput.value
        );
        
        const user = userCredential.user;
        console.log('Auth 회원가입 성공, UID:', user.uid);
        
        // 2단계: 프로필 업데이트
        console.log('2단계: 프로필 업데이트...');
        await updateProfile(user, {
            displayName: nicknameInput.value
        });
        console.log('프로필 업데이트 완료');
        
        // 3단계: Firestore에 저장
        console.log('3단계: Firestore 저장 시작...');
        
        const userDataToSave = {
            uid: user.uid,
            email: emailInput.value,
            nickname: nicknameInput.value,
            userType: memberType,
            marketingAgreed: document.getElementById('agree-marketing').checked,
            createdAt: new Date(),
            lastLogin: new Date()
        };
        
        // 일반회원인 경우 레벨 추가
        if (memberType === 'member') {
            userDataToSave.level = 1;
        }
        
        console.log('저장할 데이터:', JSON.stringify(userDataToSave, null, 2));
        console.log('문서 경로:', `users/${user.uid}`);
        
        // Firestore 저장 시도
        await setDoc(doc(db, 'users', user.uid), userDataToSave);
        
        console.log('✅ Firestore 저장 성공!');
        
        // 바로 리다이렉트
        window.location.href = '/main/main.html';
        
    } catch (error) {
        console.error('❌ 회원가입 에러 발생!');
        console.error('에러 전체:', error);
        console.error('에러 코드:', error.code);
        console.error('에러 메시지:', error.message);
        console.error('에러 스택:', error.stack);
        
        // 에러 타입별 처리
        if (error.code && error.code.startsWith('auth/')) {
            // Authentication 에러
            let errorMessage = '회원가입에 실패했습니다.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = '이미 사용 중인 이메일입니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '유효하지 않은 이메일 형식입니다.';
                    break;
                case 'auth/weak-password':
                    errorMessage = '비밀번호가 너무 약합니다.';
                    break;
                default:
                    errorMessage = `인증 실패: ${error.message}`;
            }
            
            showError(errorMessage);
            
        } else {
            // Firestore 에러
            console.error('Firestore 저장 에러!');
            
            // Firestore 에러지만 Auth는 성공한 경우
            if (auth.currentUser) {
                console.log('Auth 사용자는 생성됨:', auth.currentUser.uid);
                showError('데이터베이스 저장에 실패했습니다. 관리자에게 문의하세요.');
            }
        }
        
        setLoading(false);
        isSigningUp = false;
    }
});