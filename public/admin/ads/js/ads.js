// admin/ads/js/ads.js
import { checkAuthFirst, loadAdminHeader } from '/admin/js/admin-header.js';
import { rtdb } from '/js/firebase-config.js';
import { ref, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { openDetailModal, closeModal } from './ads-modal.js';  // setupModalEventListeners 제거
import { openAddModal } from './ads-add-modal.js';

// 전역 변수
window.allAds = [];
let currentUser = null;

// 페이지 초기화
(async function init() {
    try {
        // 1. 권한 체크 먼저
        currentUser = await checkAuthFirst();
        
        // 전역으로 사용자 정보 저장
        window.currentUser = currentUser;
        
        // 2. 권한 확인 후 헤더 로드
        await loadAdminHeader(currentUser);
        
        // 3. 데이터 로드
        loadAds();
        
        // 4. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        console.error('페이지 초기화 실패:', error);
    }
})();

// 광고 데이터 로드
function loadAds() {
    const adsRef = ref(rtdb, 'advertisements');
    
    onValue(adsRef, (snapshot) => {
        const data = snapshot.val();
        window.allAds = [];
        
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                window.allAds.push({
                    id: key,
                    ...value
                });
            });
            
            // 최신순 정렬
            window.allAds.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        displayAds(window.allAds);
    });
}

// 광고 목록 표시
function displayAds(ads) {
    const tbody = document.getElementById('ads-tbody');
    if (!tbody) return;
    
    if (ads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    등록된 광고가 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    // displayAds 함수의 tbody.innerHTML 부분 수정
    tbody.innerHTML = ads.map(ad => {
        const statusClass = ad.status === 'active' ? 'status-active' : 
                        ad.status === 'inactive' ? 'status-inactive' : 'status-pending';
        const statusText = ad.status === 'active' ? '활성' : 
                        ad.status === 'inactive' ? '비활성' : '승인대기';
        
        // 입금 상태 처리
        const paymentClass = ad.paymentStatus === '입금완료' ? 'paid' : 
                            ad.paymentStatus === '입금대기' ? 'pending' : 'unpaid';
        const paymentText = ad.paymentStatus || '미입금';
        
        return `
            <tr>
                <td>${ad.category || '-'}</td>
                <td>${ad.businessType || '-'}</td>
                <td>${ad.businessName || '-'}</td>
                <td>${ad.author || '-'}</td>
                <td>${ad.phone || '-'}</td>
                <td>
                    <span class="status ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <span class="payment-status ${paymentClass}">${paymentText}</span>
                </td>
                <td>${formatDate(ad.createdAt)}</td>
                <td>${ad.views || 0}</td>
                <td>${ad.inquiries || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="editAd('${ad.id}')">수정</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteAd('${ad.id}')">삭제</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 날짜 포맷
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 새 광고 추가 버튼
    const addButton = document.getElementById('btn-add-ad');
    if (addButton) {
        addButton.addEventListener('click', () => {
            openAddModal();
        });
    }
    
    // 필터 이벤트
    const categoryFilter = document.getElementById('filter-category');
    const statusFilter = document.getElementById('filter-status');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('btn-search');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', applyFilters);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
}

// 필터 적용
function applyFilters() {
    const categoryFilter = document.getElementById('filter-category').value;
    const statusFilter = document.getElementById('filter-status').value;
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    
    let filteredAds = window.allAds;
    
    // 카테고리 필터
    if (categoryFilter) {
        filteredAds = filteredAds.filter(ad => ad.category === categoryFilter);
    }
    
    // 상태 필터
    if (statusFilter) {
        filteredAds = filteredAds.filter(ad => ad.status === statusFilter);
    }
    
    // 검색 필터
    if (searchInput) {
        filteredAds = filteredAds.filter(ad => {
            return (ad.businessName && ad.businessName.toLowerCase().includes(searchInput)) ||
                   (ad.author && ad.author.toLowerCase().includes(searchInput)) ||
                   (ad.phone && ad.phone.includes(searchInput));
        });
    }
    
    displayAds(filteredAds);
}

// 광고 수정
window.editAd = function(adId) {
    openDetailModal(adId);
}

// 광고 삭제
window.deleteAd = async function(adId) {
    if (!confirm('정말로 이 광고를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        // 광고 삭제
        await remove(ref(rtdb, `advertisements/${adId}`));
        
        alert('광고가 삭제되었습니다.');
        
        // 목록 새로고침
        loadAds();
        
    } catch (error) {
        console.error('광고 삭제 실패:', error);
        alert('광고 삭제에 실패했습니다.');
    }
}

// 전역 함수로 loadAds 등록 (모달에서 사용)
window.loadAds = loadAds;