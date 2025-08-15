// admin/ads/js/ads.js - 광고 관리 메인 파일 (최종본)
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
                            ad.paymentStatus === '입금대기' ? 'waiting' : '';
        
        return `
            <tr>
                <td>${ad.category || '-'}</td>
                <td>${ad.businessType || '-'}</td>
                <td>${ad.businessName || '-'}</td>
                <td>${ad.author || '-'}</td>
                <td>${ad.phone || '-'}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td><span class="payment-status ${paymentClass}">${ad.paymentStatus || '-'}</span></td>
                <td>${ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('ko-KR') : '-'}</td>
                <td>${ad.views || 0}</td>
                <td>${ad.calls || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" data-id="${ad.id}">수정</button>
                        <button class="btn-action btn-delete" data-id="${ad.id}">삭제</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // 수정/삭제 버튼 이벤트
    setupTableActions();
}

// 테이블 액션 버튼 이벤트 설정
function setupTableActions() {
    // 수정 버튼
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const adId = e.target.dataset.id;
            openEditModal(adId);
        });
    });
    
    // 삭제 버튼
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const adId = e.target.dataset.id;
            handleDelete(adId);
        });
    });
}

// ImageKit에서 이미지들 삭제 (ad-management.js와 동일)
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

// 광고 폴더 전체 삭제 시도
async function deleteAdFolder(adId, userId) {
    if (!adId) {
        console.log('광고 ID가 없어 폴더 삭제를 건너뜁니다.');
        return { error: 'No ad ID' };
    }
    
    try {
        console.log(`광고 폴더 삭제 시작: /entmarvel/advertise/${adId}/`);
        
        const response = await fetch('https://imagekit-delete-txjekregmq-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                adId: adId,
                userId: userId
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('폴더 삭제 실패 응답:', errorText);
            throw new Error('광고 이미지 폴더 삭제 실패');
        }
        
        const result = await response.json();
        console.log('광고 폴더 삭제 결과:', result);
        return result;
        
    } catch (error) {
        console.error('광고 폴더 삭제 오류:', error);
        return { error: error.message };
    }
}

// 삭제 처리 (ad-management.js와 동일한 로직)
async function handleDelete(adId) {
    const ad = window.allAds.find(a => a.id === adId);
    if (!ad) {
        alert('광고를 찾을 수 없습니다.');
        return;
    }
    
    const adName = ad.businessName || '이 광고';
    if (!confirm(`"${adName}"를 삭제하시겠습니까?\n\n삭제된 광고와 이미지는 복구할 수 없습니다.`)) {
        return;
    }
    
    // 삭제 버튼 찾기 및 상태 변경
    const deleteBtn = document.querySelector(`.btn-delete[data-id="${adId}"]`);
    const originalText = deleteBtn ? deleteBtn.textContent : '삭제';
    
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = '삭제 중...';
    }
    
    try {
        // 1. 먼저 ImageKit 이미지 삭제 시도
        const adIdToDelete = ad.adId || adId; // 광고 ID 확인
        
        if (adIdToDelete) {
            console.log(`광고 ID ${adIdToDelete}의 폴더 삭제 시작`);
            
            try {
                // 폴더 전체 삭제 시도
                const deleteResult = await deleteAdFolder(adIdToDelete, currentUser.uid);
                
                if (deleteResult && !deleteResult.error) {
                    console.log('광고 폴더 삭제 성공:', deleteResult);
                } else if (deleteResult && deleteResult.error) {
                    console.warn('폴더 삭제 실패, 개별 파일 삭제 시도:', deleteResult.error);
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
        
        // 2. Firebase에서 광고 삭제
        await remove(ref(rtdb, `advertisements/${adId}`));
        
        alert('광고가 삭제되었습니다.');
        
        // 목록 새로고침 (페이지 새로고침 대신 데이터만 다시 로드)
        loadAds();
        
    } catch (error) {
        console.error('광고 삭제 실패:', error);
        alert('광고 삭제에 실패했습니다.');
        
        // 버튼 원래대로 복구
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText;
        }
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 새 광고 추가 버튼
    document.getElementById('btn-add-ad')?.addEventListener('click', () => {
        openAddModal();
    });
    
    // 카테고리 필터
    document.getElementById('filter-category')?.addEventListener('change', filterAds);
    
    // 상태 필터
    document.getElementById('filter-status')?.addEventListener('change', filterAds);
    
    // 검색 버튼
    document.getElementById('btn-search')?.addEventListener('click', searchAds);
    
    // 검색 입력 엔터키
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchAds();
    });
}

// 광고 필터링
function filterAds() {
    const category = document.getElementById('filter-category').value;
    const status = document.getElementById('filter-status').value;
    
    let filtered = window.allAds;
    
    if (category) {
        filtered = filtered.filter(ad => ad.category === category);
    }
    
    if (status) {
        filtered = filtered.filter(ad => ad.status === status);
    }
    
    displayAds(filtered);
}

// 광고 검색
function searchAds() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    if (!searchTerm) {
        displayAds(window.allAds);
        return;
    }
    
    const filtered = window.allAds.filter(ad => 
        (ad.businessName && ad.businessName.toLowerCase().includes(searchTerm)) ||
        (ad.author && ad.author.toLowerCase().includes(searchTerm)) ||
        (ad.phone && ad.phone.includes(searchTerm))
    );
    
    displayAds(filtered);
}

// 에러 메시지 표시
function showErrorMessage(message) {
    const content = document.querySelector('.admin-content');
    if (content) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2 style="color: #dc3545;">${message}</h2>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                    새로고침
                </button>
            </div>
        `;
    }
}