// admin/ads/js/ads.js
import { checkAuthFirst, loadAdminHeader } from '/admin/js/admin-header.js';
import { rtdb } from '/js/firebase-config.js';
import { ref, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { openDetailModal, setupModalEventListeners } from './ads-modal.js';
import { openAddModal } from './ads-add-modal.js';

// 전역 변수
window.allAds = [];

// 페이지 초기화
(async function init() {
    try {
        // 1. 권한 체크 먼저
        const user = await checkAuthFirst();
        
        // 2. 권한 확인 후 헤더 로드
        await loadAdminHeader(user);
        
        // 3. 데이터 로드
        loadAds();
        
        // 4. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        console.error('권한 체크 실패:', error);
    }
})();

// 업종 필터 옵션 설정
function setupFilterOptions() {
    const uniqueBusinessTypes = [...new Set(window.allAds.map(ad => ad.businessType).filter(Boolean))];
    const filterType = document.getElementById('filter-type');
    
    filterType.innerHTML = '<option value="">전체 업종</option>';
    
    uniqueBusinessTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        filterType.appendChild(option);
    });
}

// 광고 목록 로드
function loadAds() {
    const adsRef = ref(rtdb, 'advertisements');
    
    onValue(adsRef, (snapshot) => {
        window.allAds = [];
        const data = snapshot.val();
        
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                window.allAds.push({ id: key, ...value });
            });
            
            window.allAds.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        setupFilterOptions();
        displayAds();
    });
}

// 광고 표시
function displayAds() {
    const tbody = document.getElementById('ads-tbody');
    const filterStatus = document.getElementById('filter-status').value;
    const filterType = document.getElementById('filter-type').value;
    const searchText = document.getElementById('search-input').value.toLowerCase();
    
    // 필터링
    let filteredAds = window.allAds.filter(ad => {
        if (filterStatus && ad.status !== filterStatus) return false;
        if (filterType && ad.businessType !== filterType) return false;
        if (searchText && !ad.title?.toLowerCase().includes(searchText) && 
            !ad.author?.toLowerCase().includes(searchText)) return false;
        return true;
    });
    
    tbody.innerHTML = filteredAds.map(ad => {
        // 마감일 체크
        let endDateHtml = '-';
        let endDateClass = '';
        if (ad.endDate) {
            const endDate = new Date(ad.endDate);
            const today = new Date();
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            
            endDateHtml = endDate.toLocaleDateString('ko-KR');
            if (daysLeft < 0) {
                endDateClass = 'expired';
                endDateHtml += '<br>(만료)';
            } else if (daysLeft <= 7) {
                endDateClass = 'soon';
                endDateHtml += `<br>(${daysLeft}일)`;
            }
        }
        
        // 입금 상태
        const paymentStatus = ad.paymentStatus ? 'paid' : 'unpaid';
        const paymentText = ad.paymentStatus ? '완료' : '미납';
        
        return `
            <tr>
                <td>${ad.id.substring(0, 8)}...</td>
                <td>${ad.category || '-'}</td>
                <td>${ad.businessType || '-'}</td>
                <td>${ad.author || '-'}</td>
                <td>${ad.region || ''} ${ad.city || ''}</td>
                <td>
                    <span class="status-badge ${ad.status}">${ad.status === 'active' ? '활성' : '비활성'}</span>
                </td>
                <td class="end-date ${endDateClass}">${endDateHtml}</td>
                <td>
                    <span class="payment-badge ${paymentStatus}">${paymentText}</span>
                </td>
                <td>${new Date(ad.createdAt).toLocaleDateString('ko-KR')}</td>
                <td>${ad.views || 0}</td>
                <td>${ad.inquiries || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="window.openDetailModal('${ad.id}')">상세</button>
                        <button class="btn btn-warning" onclick="window.toggleStatus('${ad.id}', '${ad.status}')">
                            ${ad.status === 'active' ? '비활성화' : '활성화'}
                        </button>
                        <button class="btn btn-danger" onclick="window.deleteAd('${ad.id}')">삭제</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 상태 토글
window.toggleStatus = async function(adId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
        await update(ref(rtdb, `advertisements/${adId}`), {
            status: newStatus,
            updatedAt: Date.now()
        });
        
        alert(`광고가 ${newStatus === 'active' ? '활성화' : '비활성화'}되었습니다.`);
        loadAds();
        
    } catch (error) {
        console.error('상태 변경 실패:', error);
        alert('상태 변경에 실패했습니다.');
    }
}

// 광고 삭제
window.deleteAd = async function(adId) {
    if (!confirm('정말로 이 광고를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    try {
        await remove(ref(rtdb, `advertisements/${adId}`));
        
        alert('광고가 삭제되었습니다.');
        loadAds();
        
    } catch (error) {
        console.error('광고 삭제 실패:', error);
        alert('광고 삭제에 실패했습니다.');
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 새 광고 추가 버튼
    const addButton = document.getElementById('btn-add-ad');
    if (addButton) {
        addButton.addEventListener('click', openAddModal);
    }
    
    // 필터 및 검색 이벤트
    document.getElementById('btn-search')?.addEventListener('click', displayAds);
    document.getElementById('filter-status')?.addEventListener('change', displayAds);
    document.getElementById('filter-type')?.addEventListener('change', displayAds);
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') displayAds();
    });
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

// 전역 함수로 노출 (onclick에서 사용하기 위해)
window.openDetailModal = openDetailModal;
window.loadAds = loadAds;