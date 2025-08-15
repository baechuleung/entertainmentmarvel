// admin/ads/js/ads.js - 광고 관리 메인 파일
import { checkAuthFirst, loadAdminHeader } from '/admin/js/admin-header.js';
import { rtdb } from '/js/firebase-config.js';
import { ref, onValue, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { openAddModal } from './ads-add-modal.js';
import { openEditModal } from './ads-edit-modal.js';

// 전역 변수
window.allAds = [];
let currentUser = null;

// 페이지 초기화
(async function init() {
    try {
        // 1. 권한 체크
        currentUser = await checkAuthFirst();
        window.currentUser = currentUser;
        
        // 2. 헤더 로드
        await loadAdminHeader(currentUser);
        
        // 3. 데이터 로드
        loadAds();
        
        // 4. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        console.error('페이지 초기화 실패:', error);
        showErrorMessage('페이지 초기화에 실패했습니다.');
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
                <td colspan="11" style="text-align: center; padding: 40px;">
                    등록된 광고가 없습니다.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = ads.map(ad => {
        const statusClass = ad.status === 'active' ? 'status-active' : 
                          ad.status === 'inactive' ? 'status-inactive' : 'status-pending';
        const statusText = ad.status === 'active' ? '활성' : 
                         ad.status === 'inactive' ? '비활성' : '승인대기';
        
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
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td><span class="payment-status ${paymentClass}">${paymentText}</span></td>
                <td>${formatDate(ad.createdAt)}</td>
                <td>${ad.views || 0}</td>
                <td>${ad.calls || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editAd('${ad.id}')">수정</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAdWithConfirm('${ad.id}')">삭제</button>
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

// 광고 수정
window.editAd = function(adId) {
    openEditModal(adId);
};

// 광고 삭제
window.deleteAdWithConfirm = async function(adId) {
    if (!confirm('정말 이 광고를 삭제하시겠습니까?\n삭제된 광고는 복구할 수 없습니다.')) {
        return;
    }
    
    const ad = window.allAds.find(a => a.id === adId);
    if (!ad) {
        alert('광고를 찾을 수 없습니다.');
        return;
    }
    
    try {
        // Firebase에서 광고 삭제
        const adRef = ref(rtdb, `advertisements/${adId}`);
        await remove(adRef);
        
        alert('광고가 삭제되었습니다.');
    } catch (error) {
        console.error('광고 삭제 실패:', error);
        alert('광고 삭제에 실패했습니다.');
    }
};

// 이벤트 리스너 설정
function setupEventListeners() {
    // 새 광고 추가 버튼
    const addBtn = document.getElementById('btn-add-ad');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openAddModal();
        });
    }
    
    // 검색 기능
    const searchBtn = document.getElementById('btn-search');
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    const filterStatus = document.getElementById('filter-status');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', filterAds);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                filterAds();
            }
        });
    }
    
    if (filterCategory) {
        filterCategory.addEventListener('change', filterAds);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', filterAds);
    }
}

// 광고 필터링
function filterAds() {
    const searchText = document.getElementById('search-input')?.value.toLowerCase() || '';
    const category = document.getElementById('filter-category')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    
    let filteredAds = [...window.allAds];
    
    // 카테고리 필터
    if (category) {
        filteredAds = filteredAds.filter(ad => ad.category === category);
    }
    
    // 상태 필터
    if (status) {
        filteredAds = filteredAds.filter(ad => ad.status === status);
    }
    
    // 텍스트 검색
    if (searchText) {
        filteredAds = filteredAds.filter(ad => {
            return (ad.businessName && ad.businessName.toLowerCase().includes(searchText)) ||
                   (ad.author && ad.author.toLowerCase().includes(searchText)) ||
                   (ad.phone && ad.phone.includes(searchText));
        });
    }
    
    displayAds(filteredAds);
}