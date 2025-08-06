import { checkAuthFirst, loadAdminHeader } from '/admin/js/admin-header.js';
import { rtdb } from '/js/firebase-config.js';
import { ref, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let allAds = [];

// 페이지 초기화 - 권한 체크 먼저!
(async function init() {
    try {
        // 1. 권한 체크 먼저 (페이지 표시 전)
        const user = await checkAuthFirst();
        
        // 2. 권한 확인 후 헤더 로드
        await loadAdminHeader(user);
        
        // 3. 데이터 로드
        loadBusinessTypes();
        loadAds();
        
        // 4. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        // 권한 없음 - checkAuthFirst에서 이미 리다이렉트 처리됨
        console.error('권한 체크 실패:', error);
    }
})();

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        const filterType = document.getElementById('filter-type');
        data.businessTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            filterType.appendChild(option);
        });
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 광고 목록 로드
function loadAds() {
    const adsRef = ref(rtdb, 'advertisements');
    
    onValue(adsRef, (snapshot) => {
        allAds = [];
        const data = snapshot.val();
        
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                allAds.push({ id: key, ...value });
            });
            
            // 최신순 정렬
            allAds.sort((a, b) => b.createdAt - a.createdAt);
        }
        
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
    let filteredAds = allAds.filter(ad => {
        if (filterStatus && ad.status !== filterStatus) return false;
        if (filterType && ad.businessType !== filterType) return false;
        if (searchText && !ad.title.toLowerCase().includes(searchText) && 
            !ad.author.toLowerCase().includes(searchText)) return false;
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
                <td>${ad.title}</td>
                <td>${ad.author}</td>
                <td>${ad.businessType}</td>
                <td>${ad.region} ${ad.city}</td>
                <td>
                    <span class="status-badge ${ad.status}">${ad.status === 'active' ? '활성' : '비활성'}</span>
                </td>
                <td class="end-date ${endDateClass}">${endDateHtml}</td>
                <td>
                    <span class="payment-badge ${paymentStatus}">${paymentText}</span>
                </td>
                <td>${new Date(ad.createdAt).toLocaleDateString('ko-KR')}</td>
                <td>${ad.views || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="openDetailModal('${ad.id}')">상세</button>
                        <button class="btn btn-warning" onclick="toggleStatus('${ad.id}', '${ad.status}')">
                            ${ad.status === 'active' ? '비활성화' : '활성화'}
                        </button>
                        <button class="btn btn-danger" onclick="deleteAd('${ad.id}')">삭제</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 상세 관리 모달 열기
window.openDetailModal = (adId) => {
    const ad = allAds.find(a => a.id === adId);
    if (!ad) return;
    
    document.getElementById('ad-id').value = adId;
    document.getElementById('ad-title').value = ad.title;
    document.getElementById('ad-author').value = ad.author;
    document.getElementById('ad-end-date').value = ad.endDate || '';
    document.getElementById('ad-payment-status').checked = ad.paymentStatus || false;
    
    document.getElementById('ad-detail-modal').classList.add('show');
};

// 상세 정보 저장
async function saveAdDetail(e) {
    e.preventDefault();
    
    const adId = document.getElementById('ad-id').value;
    const endDate = document.getElementById('ad-end-date').value;
    const paymentStatus = document.getElementById('ad-payment-status').checked;
    
    try {
        await update(ref(rtdb, `advertisements/${adId}`), {
            endDate: endDate || null,
            paymentStatus: paymentStatus,
            updatedAt: Date.now()
        });
        
        alert('저장되었습니다.');
        document.getElementById('ad-detail-modal').classList.remove('show');
        loadAds(); // 목록 새로고침
        
    } catch (error) {
        alert('저장에 실패했습니다.');
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 기존 검색 이벤트
    document.getElementById('btn-search').addEventListener('click', displayAds);
    document.getElementById('filter-status').addEventListener('change', displayAds);
    document.getElementById('filter-type').addEventListener('change', displayAds);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') displayAds();
    });
    
    // 모달 관련 이벤트
    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('ad-detail-modal').classList.remove('show');
    });
    
    document.getElementById('btn-cancel').addEventListener('click', () => {
        document.getElementById('ad-detail-modal').classList.remove('show');
    });
    
    document.getElementById('ad-detail-form').addEventListener('submit', saveAdDetail);
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}