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
const emailIdInput = document.getElementById('email-id');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember-me');
const submitButton = document.querySelector('.btn-login-submit');

// 커스텀 드롭다운 요소
const dropdown = document.querySelector('.custom-dropdown');
const dropdownSelected = dropdown.querySelector('.dropdown-selected');
const dropdownOptions = dropdown.querySelector('.dropdown-options');
const dropdownArrow = dropdown.querySelector('.dropdown-arrow');
const selectedValue = dropdown.querySelector('.selected-value');
const options = dropdown.querySelectorAll('.dropdown-option');

let selectedDomain = 'gmail.com'; // 기본값

// 커스텀 드롭다운 기능
function toggleDropdown() {
    const isOpen = dropdownOptions.classList.contains('open');
    if (isOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

function openDropdown() {
    dropdownOptions.classList.add('open');
    dropdownArrow.classList.add('open');
    dropdownSelected.classList.add('open');
}

function closeDropdown() {
    dropdownOptions.classList.remove('open');
    dropdownArrow.classList.remove('open');
    dropdownSelected.classList.remove('open');
}

function selectOption(value, text) {
    selectedDomain = value;
    selectedValue.textContent = text;
    
    // 기존 selected 클래스 제거
    options.forEach(opt => opt.classList.remove('selected'));
    
    // 새로 선택된 옵션에 selected 클래스 추가
    const selectedOption = dropdown.querySelector(`[data-value="${value}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    closeDropdown();
}

// 드롭다운 이벤트 리스너
dropdownSelected.addEventListener('click', toggleDropdown);
dropdownSelected.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
    }
});

// 옵션 클릭 이벤트
options.forEach(option => {
    option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        const text = option.textContent;
        selectOption(value, text);
    });
});

// 외부 클릭 시 드롭다운 닫기
document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
        closeDropdown();
    }
});

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
                window.location.replace('/');
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
        
        // 이메일 조합
        const email = emailIdInput.value.trim() + '@' + selectedDomain;
        const password = passwordInput.value;
        
        if (!emailIdInput.value.trim() || !password) {
            showError('이메일과 비밀번호를 입력해주세요.');
            return;
        }
        
        setLoading(true);
        
        try {
            // 로그인 상태 유지 설정
            const persistence = rememberCheckbox.checked ? 
                browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);
            
            // 로그인
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            console.log('로그인 성공:', userCredential.user.email);
            
            // 사용자 정보 업데이트
            await updateUserInfo(userCredential.user);
            
            // 리다이렉트 처리
            const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
            
            if (returnUrl) {
                console.log('returnUrl로 리다이렉트:', returnUrl);
                window.location.replace(returnUrl);
            } else {
                console.log('메인 페이지로 리다이렉트');
                window.location.replace('/');
            }
            
        } catch (error) {
            console.error('로그인 실패:', error);
            setLoading(false);
            
            // 에러 메시지 처리
            let errorMessage = '로그인에 실패했습니다.';
            
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage = '등록되지 않은 이메일입니다.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = '비밀번호가 올바르지 않습니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '올바른 이메일 형식이 아닙니다.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = '네트워크 연결을 확인해주세요.';
                    break;
                default:
                    errorMessage = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
            }
            
            showError(errorMessage);
        }
    });
}