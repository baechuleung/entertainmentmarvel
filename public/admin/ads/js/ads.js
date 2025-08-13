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
        
        // 전역으로 사용자 정보 저장
        window.currentUser = user;
        
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
        if (searchText) {
            const searchableText = `${ad.businessName || ''} ${ad.author || ''}`.toLowerCase();
            if (!searchableText.includes(searchText)) return false;
        }
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
        
        // 상태 뱃지 클래스
        const statusClass = ad.status || 'pending';
        const statusText = {
            'active': '활성',
            'inactive': '비활성',
            'pending': '승인대기',
            'rejected': '거절됨'
        }[ad.status] || '알 수 없음';
        
        return `
            <tr>
                <td title="${ad.id}">${ad.id.substring(0, 8)}...</td>
                <td>${ad.category || '-'}</td>
                <td>${ad.businessType || '-'}</td>
                <td>${ad.author || '-'}</td>
                <td>${ad.region || ''} ${ad.city || ''}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td class="end-date ${endDateClass}">${endDateHtml}</td>
                <td>
                    <span class="payment-badge ${paymentStatus}">${paymentText}</span>
                </td>
                <td>${ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('ko-KR') : '-'}</td>
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
    const statusText = newStatus === 'active' ? '활성화' : '비활성화';
    
    if (!confirm(`이 광고를 ${statusText}하시겠습니까?`)) {
        return;
    }
    
    try {
        await update(ref(rtdb, `advertisements/${adId}`), {
            status: newStatus,
            updatedAt: Date.now()
        });
        
        alert(`광고가 ${statusText}되었습니다.`);
        loadAds();
        
    } catch (error) {
        console.error('상태 변경 실패:', error);
        alert('상태 변경에 실패했습니다.');
    }
}

// 광고 삭제
window.deleteAd = async function(adId) {
    const ad = window.allAds.find(a => a.id === adId);
    const adName = ad?.businessName || '이 광고';
    
    if (!confirm(`"${adName}"를 삭제하시겠습니까?\n\n삭제된 광고는 복구할 수 없습니다.`)) {
        return;
    }
    
    try {
        // ImageKit 이미지 삭제 (있는 경우)
        if (ad) {
            await deleteAllAdImages(ad);
        }
        
        // Firebase에서 광고 삭제
        await remove(ref(rtdb, `advertisements/${adId}`));
        
        alert('광고가 삭제되었습니다.');
        loadAds();
        
    } catch (error) {
        console.error('광고 삭제 실패:', error);
        alert('광고 삭제에 실패했습니다.');
    }
}

// ImageKit 이미지 삭제
async function deleteAllAdImages(ad) {
    const imageUrls = [];
    
    // 썸네일 수집
    if (ad.thumbnail && ad.thumbnail.includes('ik.imagekit.io')) {
        imageUrls.push(ad.thumbnail);
    }
    
    // 상세 이미지들 수집
    if (ad.images && Array.isArray(ad.images)) {
        ad.images.forEach(imageUrl => {
            if (imageUrl && imageUrl.includes('ik.imagekit.io')) {
                imageUrls.push(imageUrl);
            }
        });
    }
    
    // 에디터 내용에서 이미지 URL 추출
    if (ad.content) {
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(ad.content)) !== null) {
            const imageUrl = match[1];
            if (imageUrl && imageUrl.includes('ik.imagekit.io')) {
                imageUrls.push(imageUrl);
            }
        }
    }
    
    if (imageUrls.length === 0) {
        return;
    }
    
    try {
        // Firebase Function 호출하여 이미지 삭제
        const response = await fetch('https://imagekit-delete-enujtcasca-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrls: imageUrls,
                userId: ad.authorId?.[0] || 'admin'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('이미지 삭제 결과:', result);
        }
    } catch (error) {
        console.error('ImageKit 이미지 삭제 오류:', error);
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