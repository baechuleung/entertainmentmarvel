import { auth, db } from '/js/firebase-config.js';
import { 
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM 요소
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember-me');
const submitButton = document.querySelector('.btn-login-submit');

// 페이지 로드 시 즉시 실행
(function checkAuthImmediate() {
    // 먼저 페이지를 숨김
    document.body.style.display = 'none';
    
    // 로그인 상태 확인
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 이미 로그인된 경우
            console.log('이미 로그인됨, 리다이렉트 처리');
            const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
            
            if (returnUrl) {
                // returnUrl이 있으면 해당 페이지로
                window.location.replace(returnUrl);
            } else {
                // returnUrl이 없으면 메인으로
                window.location.replace('/main/main.html');
            }
        } else {
            // 로그인되지 않은 경우 페이지 표시
            document.body.style.display = '';
        }
    });
})();

// 에러 메시지 표시
function showError(message) {
    // 기존 에러 메시지 제거
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 새 에러 메시지 생성
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message show';
    errorDiv.textContent = message;
    
    // 폼 상단에 추가
    loginForm.insertBefore(errorDiv, loginForm.firstChild);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// 로딩 상태 설정
function setLoading(isLoading) {
    if (isLoading) {
        submitButton.disabled = true;
        submitButton.innerHTML = '로그인 중<span class="loading-spinner"></span>';
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = '로그인';
    }
}

// 사용자 정보 업데이트
async function updateUserInfo(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            lastLogin: new Date()
        }, { merge: true });
    } catch (error) {
        console.error('사용자 정보 업데이트 실패:', error);
        // 권한 오류가 나도 로그인은 계속 진행
    }
}

// 이메일/비밀번호 로그인
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            showError('이메일과 비밀번호를 입력해주세요.');
            return;
        }
        
        setLoading(true);
        
        try {
            // 브라우저를 닫아도 로그인 상태 유지 (로컬 스토리지)
            await setPersistence(auth, browserLocalPersistence);
            
            // 로그인 시도
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // 마지막 로그인 시간 업데이트 (실패해도 계속 진행)
            await updateUserInfo(user);
            
            // 이전 페이지로 이동 또는 메인 페이지로
            const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
            window.location.replace(returnUrl || '/main/main.html');
            
        } catch (error) {
            setLoading(false);
            
            // Firebase 에러 메시지 한글화
            let errorMessage = '로그인에 실패했습니다.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = '존재하지 않는 이메일입니다.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = '비밀번호가 올바르지 않습니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '유효하지 않은 이메일 형식입니다.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = '비활성화된 계정입니다.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
                    break;
            }
            
            showError(errorMessage);
        }
    });

    // 엔터키로 로그인
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }
}