// Firebase 모듈 import
import { auth, db } from '/js/firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 사이드 메뉴 관리
const SideMenu = {
    menu: null,
    overlay: null,
    isOpen: false,

    // 초기화
    init: async function() {
        console.log('SideMenu.init() 시작');
        
        // 사이드 메뉴 HTML 로드
        await this.loadSideMenu();
        
        // DOM 요소 저장
        this.menu = document.getElementById('side-menu');
        this.overlay = document.getElementById('menu-overlay');
        
        console.log('menu:', this.menu);
        console.log('overlay:', this.overlay);
        
        // Firebase Auth 상태 체크 및 UI 업데이트
        this.checkAuthStatus();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
    },

    // Firebase Auth 상태 체크
    checkAuthStatus: function() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // 로그인 상태
                await this.loadUserData(user.uid);
            } else {
                // 비로그인 상태
                this.updateUserStatus(false);
            }
        });
    },

    // Firestore에서 사용자 데이터 로드
    loadUserData: async function(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                this.updateUserStatus(true, userData);
            }
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
        }
    },

    // 로그인 상태에 따른 UI 업데이트
    updateUserStatus: function(isLoggedIn, userData = null) {
        const guestInfo = document.querySelector('.user-info.guest');
        const memberInfo = document.querySelector('.user-info.member');
        const logoutBtn = document.querySelector('.footer-link');
        const logoutArrow = document.querySelector('.menu-footer .arrow');
        const businessOnlyMenu = document.querySelector('.business-only');
        const businessOnlyDivider = document.querySelector('.business-only-divider');
        
        if (isLoggedIn && userData) {
            // 회원인 경우
            if (guestInfo) guestInfo.style.display = 'none';
            if (memberInfo) {
                memberInfo.style.display = 'flex';
                
                // 닉네임 표시
                const usernameEl = memberInfo.querySelector('.username');
                if (usernameEl) usernameEl.textContent = userData.nickname || '회원';
                
                // 회원 타입 표시
                const memberTypeEl = memberInfo.querySelector('.member-type');
                const levelTextEl = memberInfo.querySelector('.level-text');
                
                if (memberTypeEl) {
                    memberTypeEl.textContent = userData.userType === 'business' ? '업체회원' : '일반회원';
                }
                
                // 업체회원인 경우 공고 관리 메뉴 표시
                if (userData.userType === 'business') {
                    if (businessOnlyMenu) businessOnlyMenu.style.display = 'block';
                    if (businessOnlyDivider) businessOnlyDivider.style.display = 'block';
                }
                
                if (levelTextEl) {
                    if (userData.userType === 'member') {
                        const level = userData.level || 1;
                        levelTextEl.textContent = `Lv.${level}`;
                        levelTextEl.style.display = 'block';
                    } else {
                        levelTextEl.style.display = 'none';
                    }
                }
                
                // 프로필 이미지 - 레벨에 따라 표시
                const userIconImg = memberInfo.querySelector('.user-icon img');
                if (userIconImg) {
                    if (userData.userType === 'member' && userData.level) {
                        // 일반회원인 경우 레벨 이미지
                        userIconImg.src = `/img/level/lv${userData.level}.png`;
                        userIconImg.alt = `레벨 ${userData.level}`;
                    } else if (userData.userType === 'business') {
                        // 업체회원인 경우 기본 업체 이미지
                        userIconImg.src = '/img/business-icon.png';
                        userIconImg.alt = '업체회원';
                    } else {
                        // 기본 이미지
                        userIconImg.src = '/img/user-icon.png';
                        userIconImg.alt = '회원아이콘';
                    }
                }
            }
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (logoutArrow) logoutArrow.style.display = 'block';
        } else {
            // 비회원인 경우
            if (guestInfo) guestInfo.style.display = 'flex';
            if (memberInfo) memberInfo.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (logoutArrow) logoutArrow.style.display = 'none';
            if (businessOnlyMenu) businessOnlyMenu.style.display = 'none';
            if (businessOnlyDivider) businessOnlyDivider.style.display = 'none';
        }
    },

    // 사이드 메뉴 HTML 로드
    loadSideMenu: async function() {
        try {
            const response = await fetch('/sidemenu.html');
            const html = await response.text();
            
            // body에 사이드 메뉴 추가
            document.body.insertAdjacentHTML('beforeend', html);
            console.log('사이드 메뉴 로드 완료');
        } catch (error) {
            console.error('사이드 메뉴 로드 실패:', error);
        }
    },

    // 이벤트 리스너 설정
    setupEventListeners: function() {
        console.log('setupEventListeners 실행');
        
        // 햄버거 메뉴 클릭
        document.addEventListener('click', (e) => {
            if (e.target.closest('#common-header .hamburger')) {
                console.log('햄버거 메뉴 클릭됨');
                e.preventDefault();
                this.open();
            }
        });

        // 닫기 버튼 클릭
        document.addEventListener('click', (e) => {
            if (e.target.closest('.close-menu')) {
                this.close();
            }
        });

        // 오버레이 클릭
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.close();
            });
        }

        // 메뉴 아이템 클릭
        document.addEventListener('click', (e) => {
            if (e.target.closest('.menu-item')) {
                const menuItem = e.target.closest('.menu-item');
                this.handleMenuClick(menuItem);
            }
        });

        // 마이페이지 버튼 클릭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-mypage')) {
                window.location.href = '/mypage/mypage.html';
            }
        });
        
        // 로그인 버튼 클릭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-login')) {
                window.location.href = '/auth/login.html';
            }
        });

        // 로그아웃 클릭
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('footer-link') && e.target.textContent === '로그아웃') {
                e.preventDefault();
                this.handleLogout();
            }
        });
    },

    // 메뉴 열기
    open: function() {
        if (!this.menu || !this.overlay) {
            console.error('메뉴 또는 오버레이가 없습니다');
            return;
        }
        
        console.log('메뉴 열기');
        
        // 즉시 active 클래스 추가
        this.menu.classList.add('active');
        this.overlay.classList.add('active');
        
        this.isOpen = true;
        
        // body 스크롤 방지
        document.body.style.overflow = 'hidden';
    },

    // 메뉴 닫기
    close: function() {
        if (!this.menu || !this.overlay) return;
        
        this.menu.classList.remove('active');
        this.overlay.classList.remove('active');
        
        this.isOpen = false;
        
        // body 스크롤 복원
        document.body.style.overflow = '';
    },

    // 메뉴 토글
    toggle: function() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    // 메뉴 클릭 처리
    handleMenuClick: function(menuItem) {
        const menuText = menuItem.querySelector('span').textContent;
        
        // 페이지 이동 매핑
        const pageMap = {
            '홈으로 가기': '/main/main.html',
            '광고 관리': '/ad-posting/ad-management.html',
            '1:1 고객센터': '/support/support.html',
            'FAQ': '/faq/faq.html',
            '공지사항': '/notice/notice.html',
            '이벤트': '/event/event.html',
            '약관 및 정책': '/policy/policy.html'
        };

        const targetPage = pageMap[menuText];
        if (targetPage) {
            window.location.href = targetPage;
        }
    },

    // 로그아웃 처리
    handleLogout: async function() {
        if (confirm('로그아웃 하시겠습니까?')) {
            try {
                await signOut(auth);
                console.log('로그아웃 완료');
                
                // 메인 페이지로 이동
                window.location.href = '/main/main.html';
            } catch (error) {
                console.error('로그아웃 실패:', error);
                alert('로그아웃에 실패했습니다.');
            }
        }
    }
};

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        SideMenu.init();
    });
} else {
    // 이미 DOM이 로드된 경우 바로 실행
    SideMenu.init();
}