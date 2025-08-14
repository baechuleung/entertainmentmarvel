// admin/ads/js/ads.js - 수정된 부분
import { checkAuthFirst, loadAdminHeader } from '/admin/js/admin-header.js';
import { rtdb } from '/js/firebase-config.js';
import { ref, onValue, update, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { openDetailModal, closeModal } from './ads-modal.js';
import { openAddModal } from './ads-add-modal.js';

// deleteAdFolder import 추가
import { deleteAdFolder } from '/ad-posting/js/modules/index.js';

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

// 광고 수정
window.editAd = function(adId) {
    openDetailModal(adId);
}

// 광고 삭제 - 이미지 삭제 기능 추가
window.deleteAd = async function(adId) {
    const ad = window.allAds.find(a => a.id === adId);
    const adName = ad ? ad.businessName : '이 광고';
    
    if (!confirm(`"${adName}"를 삭제하시겠습니까?\n\n삭제된 광고와 이미지는 복구할 수 없습니다.`)) {
        return;
    }
    
    // 삭제 버튼 찾기
    const deleteButtons = document.querySelectorAll('.btn-danger');
    let deleteBtn = null;
    deleteButtons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(adId)) {
            deleteBtn = btn;
        }
    });
    
    try {
        // 삭제 중 표시
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.textContent = '삭제 중...';
        }
        
        // 이미지 삭제 처리
        if (ad) {
            // 광고 ID가 있으면 폴더 전체 삭제 시도
            const adIdToDelete = ad.adId || adId;
            
            if (adIdToDelete) {
                console.log(`광고 ID ${adIdToDelete}의 폴더 삭제 시작`);
                
                try {
                    // 폴더 전체 삭제 시도
                    const deleteResult = await deleteAdFolder(adIdToDelete, currentUser.uid);
                    
                    if (deleteResult && !deleteResult.error) {
                        console.log('광고 폴더 삭제 성공:', deleteResult);
                    } else if (deleteResult && deleteResult.error) {
                        console.warn('폴더 삭제 실패:', deleteResult.error);
                        // 폴더 삭제 실패 시 개별 파일 삭제 시도
                        await deleteAllAdImages(ad);
                    }
                } catch (folderError) {
                    console.warn('폴더 삭제 오류, 개별 파일 삭제 시도:', folderError);
                    // 폴더 삭제 실패 시 개별 파일 삭제 시도
                    await deleteAllAdImages(ad);
                }
            } else {
                // adId가 없는 경우 기존 방식으로 삭제
                console.log('광고 ID가 없어 개별 파일 삭제 시도');
                await deleteAllAdImages(ad);
            }
        }
        
        // Firebase에서 광고 삭제
        await remove(ref(rtdb, `advertisements/${adId}`));
        
        alert('광고가 삭제되었습니다.');
        
        // 목록 새로고침
        loadAds();
        
    } catch (error) {
        console.error('광고 삭제 실패:', error);
        alert('광고 삭제에 실패했습니다.');
        
        // 버튼 원래대로 복구
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = '삭제';
        }
    }
}

// ImageKit에서 이미지들 삭제 (개별 파일 삭제 - fallback)
async function deleteAllAdImages(ad) {
    const imageUrls = [];
    
    // 썸네일 수집 (placeholder가 아닌 경우만)
    if (ad.thumbnail && 
        ad.thumbnail.includes('ik.imagekit.io') && 
        !ad.thumbnail.includes('THUMBNAIL_')) {
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
    
    // 에디터 내용에서 이미지 URL 추출 (placeholder 제외)
    if (ad.content) {
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(ad.content)) !== null) {
            const imageUrl = match[1];
            if (imageUrl && 
                imageUrl.includes('ik.imagekit.io') && 
                !imageUrl.includes('DETAIL_IMAGE_')) {
                imageUrls.push(imageUrl);
            }
        }
    }
    
    // 이벤트 내용에서 이미지 URL 추출 (placeholder 제외)
    if (ad.eventInfo) {
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(ad.eventInfo)) !== null) {
            const imageUrl = match[1];
            if (imageUrl && 
                imageUrl.includes('ik.imagekit.io') && 
                !imageUrl.includes('EVENT_IMAGE_')) {
                imageUrls.push(imageUrl);
            }
        }
    }
    
    if (imageUrls.length === 0) {
        console.log('삭제할 ImageKit 이미지가 없습니다.');
        return;
    }
    
    try {
        // 배포된 Firebase Function 호출
        const response = await fetch('https://imagekit-delete-txjekregmq-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrls: imageUrls,
                userId: currentUser.uid
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('이미지 삭제 결과:', result);
            
            // 삭제 결과 확인
            if (result.summary) {
                console.log(`총 ${result.summary.total}개 중 ${result.summary.deleted}개 삭제 성공`);
            }
            
            // 실패한 파일이 있으면 로그
            if (result.failed && result.failed.length > 0) {
                console.warn('삭제 실패한 파일들:', result.failed);
            }
        } else {
            const errorText = await response.text();
            console.error('이미지 삭제 요청 실패:', errorText);
        }
    } catch (error) {
        console.error('ImageKit 이미지 삭제 오류:', error);
        // 실패해도 광고 삭제는 계속 진행
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

// 전역 함수로 loadAds 등록 (모달에서 사용)
window.loadAds = loadAds;