import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, onValue, remove, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let currentUser = null;
let currentUserData = null;
let userAds = [];

// DOM 요소
const adList = document.getElementById('ad-list');
const totalAdsSpan = document.getElementById('total-ads');
const emptyState = document.getElementById('empty-state');

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 인증 상태 확인
    checkAuth();
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // 사용자 유형 확인
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                // business 또는 administrator만 접근 가능
                if (currentUserData.userType !== 'business' && currentUserData.userType !== 'administrator') {
                    alert('업체회원 또는 관리자만 접근 가능합니다.');
                    window.location.href = '/main/main.html';
                    return;
                }
            }
            // 광고 목록 로드
            loadUserAds();
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
        }
    });
}

// 사용자 광고 목록 로드
function loadUserAds() {
    const adsRef = ref(rtdb, 'advertisements');
    
    onValue(adsRef, (snapshot) => {
        userAds = [];
        const data = snapshot.val();
        
        if (data) {
            // administrator는 모든 광고 보기, 일반 업체는 자신의 광고만 보기
            Object.entries(data).forEach(([key, value]) => {
                if (currentUserData.userType === 'administrator' || value.authorId === currentUser.uid) {
                    userAds.push({ id: key, ...value });
                }
            });
        }
        
        // 최신순으로 정렬
        userAds.sort((a, b) => b.createdAt - a.createdAt);
        
        // UI 업데이트
        updateAdList();
    });
}

// 광고 목록 UI 업데이트
function updateAdList() {
    // 총 개수 업데이트
    totalAdsSpan.textContent = userAds.length;
    
    if (userAds.length === 0) {
        // 광고가 없을 때
        adList.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        // 광고가 있을 때
        adList.style.display = 'flex';
        emptyState.style.display = 'none';
        
        // 광고 목록 렌더링
        adList.innerHTML = userAds.map(ad => createAdItem(ad)).join('');
        
        // 이벤트 리스너 추가
        addEventListeners();
    }
}

// 광고 아이템 HTML 생성
function createAdItem(ad) {
    const createdDate = new Date(ad.createdAt).toLocaleDateString('ko-KR');
    const status = ad.status === 'active' ? '활성' : '비활성';
    const statusClass = ad.status === 'active' ? 'active' : 'inactive';
    
    // administrator인 경우 작성자 정보 추가 표시
    const authorInfo = currentUserData.userType === 'administrator' ? 
        `<span style="color: #1a5490;">작성자: ${ad.author}</span>` : '';
    
    return `
        <div class="ad-item" data-id="${ad.id}">
            ${ad.thumbnail ? 
                `<img src="${ad.thumbnail}" alt="${ad.title}" class="ad-thumbnail">` :
                `<div class="ad-thumbnail" style="background-color: #3a3a3a; display: flex; align-items: center; justify-content: center; color: #666;">
                    <span>No Image</span>
                </div>`
            }
            <div class="ad-info">
                <h3 class="ad-title">${ad.title}</h3>
                <div class="ad-meta">
                    ${authorInfo}
                    <span>조회수: ${ad.views || 0}</span>
                    <span>등록일: ${createdDate}</span>
                    <span class="ad-status ${statusClass}">${status}</span>
                </div>
                <div class="ad-actions">
                    <button class="btn-edit" data-id="${ad.id}">수정</button>
                    <button class="btn-delete" data-id="${ad.id}">삭제</button>
                    <button class="btn-toggle-status" data-id="${ad.id}" data-status="${ad.status}">
                        ${ad.status === 'active' ? '비활성화' : '활성화'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 이벤트 리스너 추가
function addEventListeners() {
    // 수정 버튼
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', handleEdit);
    });
    
    // 삭제 버튼
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
    
    // 상태 토글 버튼
    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
        btn.addEventListener('click', handleToggleStatus);
    });
}

// 광고 수정
function handleEdit(e) {
    const adId = e.target.getAttribute('data-id');
    // 수정 페이지로 이동
    window.location.href = `/ad-posting/ad-edit.html?id=${adId}`;
}

// 광고 삭제
async function handleDelete(e) {
    const adId = e.target.getAttribute('data-id');
    const ad = userAds.find(a => a.id === adId);
    
    if (confirm(`"${ad.title}" 광고를 삭제하시겠습니까?`)) {
        try {
            // 리얼타임 데이터베이스에서 삭제
            await remove(ref(rtdb, `advertisements/${adId}`));
            
            // TODO: ImageKit에서 이미지도 삭제해야 함
            
            alert('광고가 삭제되었습니다.');
        } catch (error) {
            console.error('광고 삭제 실패:', error);
            alert('광고 삭제에 실패했습니다.');
        }
    }
}

// 광고 상태 토글
async function handleToggleStatus(e) {
    const adId = e.target.getAttribute('data-id');
    const currentStatus = e.target.getAttribute('data-status');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
        // 상태 업데이트
        await update(ref(rtdb, `advertisements/${adId}`), {
            status: newStatus,
            updatedAt: Date.now()
        });
        
        alert(`광고가 ${newStatus === 'active' ? '활성화' : '비활성화'}되었습니다.`);
    } catch (error) {
        console.error('상태 변경 실패:', error);
        alert('상태 변경에 실패했습니다.');
    }
}