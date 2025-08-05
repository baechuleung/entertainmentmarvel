import { loadAdminHeader } from '/admin/js/admin-header.js';
import { rtdb } from '/js/firebase-config.js';
import { ref, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let allAds = [];

// 페이지 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // 관리자 헤더 로드 (권한 체크 포함)
    await loadAdminHeader();
    
    // 데이터 로드
    loadBusinessTypes();
    loadAds();
    
    // 이벤트 리스너 설정
    setupEventListeners();
});

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
    
    tbody.innerHTML = filteredAds.map(ad => `
        <tr>
            <td>${ad.id.substring(0, 8)}...</td>
            <td>${ad.title}</td>
            <td>${ad.author}</td>
            <td>${ad.businessType}</td>
            <td>${ad.region} ${ad.city}</td>
            <td>
                <span class="status-badge ${ad.status}">${ad.status === 'active' ? '활성' : '비활성'}</span>
            </td>
            <td>${new Date(ad.createdAt).toLocaleDateString('ko-KR')}</td>
            <td>${ad.views || 0}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-warning" onclick="toggleStatus('${ad.id}', '${ad.status}')">
                        ${ad.status === 'active' ? '비활성화' : '활성화'}
                    </button>
                    <button class="btn btn-danger" onclick="deleteAd('${ad.id}')">삭제</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 상태 토글
window.toggleStatus = async (adId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
        await update(ref(rtdb, `advertisements/${adId}`), {
            status: newStatus,
            updatedAt: Date.now()
        });
    } catch (error) {
        alert('상태 변경 실패');
    }
};

// 광고 삭제
window.deleteAd = async (adId) => {
    if (confirm('정말 삭제하시겠습니까?')) {
        try {
            await remove(ref(rtdb, `advertisements/${adId}`));
        } catch (error) {
            alert('삭제 실패');
        }
    }
};

// 검색 이벤트
function setupEventListeners() {
    document.getElementById('btn-search').addEventListener('click', displayAds);
    document.getElementById('filter-status').addEventListener('change', displayAds);
    document.getElementById('filter-type').addEventListener('change', displayAds);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') displayAds();
    });
}