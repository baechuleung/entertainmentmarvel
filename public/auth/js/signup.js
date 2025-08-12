import { auth, db } from '/js/firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM 요소
const signupForm = document.getElementById('signup-form');
const emailIdInput = document.getElementById('email-id');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('password-confirm');
const nicknameInput = document.getElementById('nickname');
const agreeAllCheckbox = document.getElementById('agree-all');
const agreeItems = document.querySelectorAll('.agree-item');
const submitButton = document.querySelector('.btn-signup-submit');

// 커스텀 드롭다운 요소
const dropdown = document.querySelector('.custom-dropdown');
const dropdownSelected = dropdown.querySelector('.dropdown-selected');
const dropdownOptions = dropdown.querySelector('.dropdown-options');
const dropdownArrow = dropdown.querySelector('.dropdown-arrow');
const selectedValue = dropdown.querySelector('.selected-value');
const options = dropdown.querySelectorAll('.dropdown-option');

let selectedDomain = 'gmail.com'; // 기본값

// 로그인 상태 확인 - 회원가입 중에는 리다이렉트 막기
let isSigningUp = false;

onAuthStateChanged(auth, (user) => {
    if (user && !isSigningUp) {
        // 이미 로그인된 경우 메인 페이지로 이동
        window.location.href = '/';
    }
});

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

// 드롭다운 이벤트 리스너
dropdownSelected.addEventListener('click', toggleDropdown);

options.forEach(option => {
    option.addEventListener('click', function() {
        options.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedValue.textContent = this.dataset.value;
        selectedDomain = this.dataset.value;
        closeDropdown();
    });
});

// 외부 클릭시 드롭다운 닫기
document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target)) {
        closeDropdown();
    }
});

// 전체 동의 체크박스 기능
agreeAllCheckbox.addEventListener('change', function() {
    agreeItems.forEach(item => {
        item.checked = this.checked;
    });
});

agreeItems.forEach(item => {
    item.addEventListener('change', function() {
        const allChecked = Array.from(agreeItems).every(item => item.checked);
        agreeAllCheckbox.checked = allChecked;
    });
});

// 정책 모달 기능
async function loadPolicies() {
    const response = await fetch('/policy/js/policy.js');
    const scriptText = await response.text();
    
    // policies 객체 추출
    const policiesMatch = scriptText.match(/const policies = ({[\s\S]*?});/);
    if (policiesMatch) {
        const policiesCode = policiesMatch[1];
        return new Function('return ' + policiesCode)();
    }
    return null;
}

// 레이어 팝업 표시
async function showPolicyModal(type) {
    const policies = await loadPolicies();
    if (!policies || !policies[type]) return;
    
    const policy = policies[type];
    document.getElementById('policy-modal-title').textContent = policy.title;
    document.getElementById('policy-modal-content').innerHTML = policy.content;
    document.getElementById('signup-policy-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

// 모달 닫기
function closeModal() {
    document.getElementById('signup-policy-modal').classList.remove('show');
    document.body.style.overflow = '';
}

// 정책 링크 클릭 이벤트
document.querySelectorAll('.policy-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const type = this.getAttribute('data-policy');
        showPolicyModal(type);
    });
});

// 모달 닫기 버튼
document.getElementById('policy-modal-close').addEventListener('click', closeModal);

// 모달 외부 클릭
document.getElementById('signup-policy-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
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
    
    // 이메일 조합
    const fullEmail = emailIdInput.value + '@' + selectedDomain;
    
    // 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fullEmail)) {
        showError('유효한 이메일을 입력해주세요.');
        emailIdInput.classList.add('error');
        isValid = false;
    } else {
        emailIdInput.classList.remove('error');
    }
    
    // 비밀번호 검증 - 특수문자, 영어, 숫자 포함 8자리 이상
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(passwordInput.value)) {
        showError('비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다.');
        passwordInput.classList.add('error');
        isValid = false;
    } else {
        passwordInput.classList.remove('error');
    }
    
    // 비밀번호 확인 검증
    if (passwordInput.value !== passwordConfirmInput.value) {
        showError('비밀번호가 일치하지 않습니다.');
        passwordConfirmInput.classList.add('error');
        isValid = false;
    } else {
        passwordConfirmInput.classList.remove('error');
    }
    
    // 닉네임 검증
    if (nicknameInput.value.trim().length < 2) {
        showError('닉네임은 2자 이상이어야 합니다.');
        nicknameInput.classList.add('error');
        isValid = false;
    } else {
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

// 회원가입 처리
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    setLoading(true);
    isSigningUp = true;
    
    try {
        // 이메일 조합
        const fullEmail = emailIdInput.value + '@' + selectedDomain;
        
        // 회원 유형 확인
        const memberType = document.querySelector('input[name="member-type"]:checked').value;
        
        // Firebase Auth로 사용자 생성
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            fullEmail,
            passwordInput.value
        );
        
        // 사용자 프로필 업데이트
        await updateProfile(userCredential.user, {
            displayName: nicknameInput.value
        });
        
        // 현재 시간 (타임스탬프)
        const now = new Date();
        
        // Firestore에 사용자 정보 저장 - 요구사항에 맞는 필드만
        const userData = {
            createdAt: now,
            email: fullEmail,
            lastLogin: now,
            marketingAgreed: document.getElementById('agree-marketing').checked,
            nickname: nicknameInput.value,
            uid: userCredential.user.uid,
            userType: memberType
        };
        
        // member로 가입하는 경우 level과 points 필드 추가
        if (memberType === 'member') {
            userData.level = 1;
            userData.points = 0;
        }
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
        
        showSuccess('회원가입이 완료되었습니다!');
        
        // 2초 후 메인 페이지로 이동
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        
    } catch (error) {
        console.error('회원가입 오류:', error);
        
        // 에러 메시지 처리
        let errorMessage = '회원가입 중 오류가 발생했습니다.';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = '이미 사용 중인 이메일입니다.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = '비밀번호가 너무 약합니다.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = '유효하지 않은 이메일 형식입니다.';
        }
        
        showError(errorMessage);
        setLoading(false);
        isSigningUp = false;
    }
});