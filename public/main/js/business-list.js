import { rtdb } from '/js/firebase-config.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { currentCategory, currentFilters } from './business-header.js';

// 전역 변수
let businessItemTemplate = null;
let allAdvertisements = [];

// 업종 리스트 템플릿 로드
export async function loadBusinessItemTemplate() {
    try {
        const response = await fetch('components/business-list.html');
        const html = await response.text();
        businessItemTemplate = html;
    } catch (error) {
        console.error('업종 리스트 템플릿 로드 실패:', error);
    }
}

// 템플릿 데이터 바인딩
function replaceTemplate(template, data) {
    let html = template;
    for (const key in data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, data[key]);
    }
    return html;
}

// Firebase에서 광고 데이터 로드 (캐싱 포함)
export async function loadAdvertisements() {
    console.log('광고 목록 로드 시작');
    
    // 캐시 확인
    const cacheKey = 'mainPageAds';
    const cacheTime = 2 * 60 * 60 * 1000; // 2시간
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > cacheTime;
        
        if (!isExpired) {
            console.log('캐시된 데이터 사용');
            allAdvertisements = data;
            displayAdvertisements(allAdvertisements);
            return;
        }
    }
    
    // Firebase에서 새 데이터 로드
    try {
        const adsRef = ref(rtdb, 'advertisements');
        const snapshot = await get(adsRef);
        
        console.log('Firebase 데이터 수신');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            allAdvertisements = Object.entries(data).map(([id, ad]) => ({
                ...ad,
                id
            }));
            
            // 활성 상태인 광고만 필터링
            allAdvertisements = allAdvertisements.filter(ad => ad.status === 'active');
            
            // 최신순 정렬
            allAdvertisements.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            console.log(`총 ${allAdvertisements.length}개의 광고 로드됨`);
        } else {
            allAdvertisements = [];
            console.log('광고 데이터가 없습니다');
        }
        
        // 캐시에 저장
        const dataToCache = {
            data: allAdvertisements,
            timestamp: Date.now()
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
        console.log('데이터 캐시 저장 완료');
        
        displayAdvertisements(allAdvertisements);
    } catch (error) {
        console.error('광고 로드 실패:', error);
        allAdvertisements = [];
        displayAdvertisements(allAdvertisements);
    }
}

// 필터 적용
export function applyFilters() {
    let filteredAds = allAdvertisements;
    
    // 카테고리 필터 우선 적용 (name 값으로 비교)
    if (currentCategory === 'karaoke') {
        filteredAds = filteredAds.filter(ad => ad.category === '유흥주점');
    } else if (currentCategory === 'gunma') {
        filteredAds = filteredAds.filter(ad => ad.category === '건전마사지');
    }
    
    // 지역 필터
    if (currentFilters.region) {
        filteredAds = filteredAds.filter(ad => ad.region === currentFilters.region);
    }
    
    // 도시 필터
    if (currentFilters.city) {
        filteredAds = filteredAds.filter(ad => ad.city === currentFilters.city);
    }
    
    // 업종 필터
    if (currentFilters.businessType) {
        filteredAds = filteredAds.filter(ad => ad.businessTypeCode === currentFilters.businessType);
    }
    
    displayAdvertisements(filteredAds);
}

// 광고 목록 표시
export async function displayAdvertisements(ads) {
    // 템플릿이 로드되지 않았으면 먼저 로드
    if (!businessItemTemplate) {
        await loadBusinessItemTemplate();
    }
    
    const businessList = document.querySelector('.business-list');
    if (!businessList) {
        console.error('business-list 요소를 찾을 수 없습니다');
        return;
    }
    
    if (ads.length === 0) {
        businessList.innerHTML = '<div class="no-results">등록된 업체가 없습니다.</div>';
        return;
    }
    
    // 광고 목록 HTML 생성
    const html = ads.map(ad => {
        // 템플릿에 데이터 바인딩
        const data = {
            id: ad.id,
            thumbnail: ad.thumbnail || '/img/default-thumb.jpg',
            businessName: ad.businessName || '업소명 없음',  // businessName 필드 사용
            businessType: ad.businessType || '미분류',
            author: ad.author || '작성자 없음',
            region: ad.region || '',
            city: ad.city || '',
            location: [ad.region, ad.city].filter(Boolean).join(' ') || '위치 정보 없음',
            views: ad.views || 0
        };
        
        return replaceTemplate(businessItemTemplate, data);
    }).join('');
    
    businessList.innerHTML = html;
    
    // 상세보기 버튼 이벤트
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const adId = this.dataset.id;
            window.location.href = `/business-detail/business-detail.html?id=${adId}`;
        });
    });
    
    // 후기 버튼 이벤트
    document.querySelectorAll('.btn-review').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const adId = this.dataset.id;
            // 후기 탭으로 바로 이동
            window.location.href = `/business-detail/business-detail.html?id=${adId}&tab=reviews`;
        });
    });
    
    // 전체 아이템 클릭 이벤트 (이미지나 제목 클릭 시)
    document.querySelectorAll('.business-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // 버튼 클릭이 아닌 경우에만 동작
            if (!e.target.classList.contains('btn-detail') && !e.target.classList.contains('btn-review')) {
                const adId = this.dataset.id;
                window.location.href = `/business-detail/business-detail.html?id=${adId}`;
            }
        });
    });
}

// 카테고리 변경 이벤트 리스너
window.addEventListener('categoryChanged', (e) => {
    const { category } = e.detail;
    
    if (category === 'all') {
        displayAdvertisements(allAdvertisements);
    } else if (category === 'karaoke') {
        const filtered = allAdvertisements.filter(ad => ad.category === '유흥주점');
        displayAdvertisements(filtered);
    } else if (category === 'gunma') {
        const filtered = allAdvertisements.filter(ad => ad.category === '건전마사지');
        displayAdvertisements(filtered);
    }
});

// 필터 적용 이벤트 리스너
window.addEventListener('applyFilters', () => {
    applyFilters();
});