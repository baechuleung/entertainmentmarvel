import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 권한 체크 먼저 실행
export async function checkAuthFirst() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // 한 번만 실행하고 구독 해제
            
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        // administrator가 아니면 즉시 리다이렉트
                        if (userData.userType !== 'administrator') {
                            alert('관리자 권한이 없습니다.');
                            window.location.replace('/');
                            reject('Not administrator');
                            return;
                        }
                        
                        // 권한 확인 완료
                        resolve(user);
                    } else {
                        alert('사용자 정보를 찾을 수 없습니다.');
                        window.location.replace('/');
                        reject('User not found');
                    }
                } catch (error) {
                    console.error('사용자 정보 조회 실패:', error);
                    window.location.replace('/');
                    reject(error);
                }
            } else {
                alert('로그인이 필요합니다.');
                window.location.replace('/auth/login.html');
                reject('Not logged in');
            }
        });
    });
}

// 관리자 헤더 로드
export async function loadAdminHeader(user) {
    try {
        // 헤더 HTML 로드
        const response = await fetch('/admin/admin-header.html');
        const headerHtml = await response.text();
        
        // admin-container 내부 최상단에 헤더 추가
        const adminContainer = document.querySelector('.admin-container');
        if (adminContainer) {
            adminContainer.insertAdjacentHTML('afterbegin', headerHtml);
        }
        
        // 이메일 표시
        const emailElement = document.getElementById('admin-email');
        if (emailElement) {
            emailElement.textContent = user.email;
        }
        
        // 로그아웃 버튼 이벤트
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // 현재 페이지에 따라 네비게이션 active 설정
        setActiveNav();
        
        // 페이지 표시
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');
        
    } catch (error) {
        console.error('관리자 헤더 로드 실패:', error);
    }
}

// 로그아웃 처리
async function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        try {
            await signOut(auth);
            window.location.replace('/auth/login.html');
        } catch (error) {
            console.error('로그아웃 실패:', error);
            alert('로그아웃에 실패했습니다.');
        }
    }
}

// 현재 페이지에 따라 네비게이션 active 설정
function setActiveNav() {
    const currentPath = window.location.pathname;
    
    // 모든 nav-link에서 active 제거
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 현재 페이지에 맞는 링크에 active 추가
    if (currentPath.includes('/admin/ads/')) {
        document.getElementById('nav-ads')?.classList.add('active');
    } else if (currentPath.includes('/admin/board/')) {
        document.getElementById('nav-board')?.classList.add('active');
    } else if (currentPath.includes('/admin/faq/')) {
        document.getElementById('nav-faq')?.classList.add('active');
    } else if (currentPath.includes('/admin/members/')) {
        document.getElementById('nav-members')?.classList.add('active');
    }
}