import { rtdb } from '/js/firebase-config.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { currentCategory, currentFilters } from '/main/js/business-header.js';

// 전역 변수
let businessItemTemplate = null;
let allAdvertisements = [];
let displayedAds = [];
let preloadedAds = [];
let currentDisplayIndex = 0;
let isLoading = false;
let hasMoreData = true;

const INITIAL_LOAD = 50;  // 처음 로드할 개수
const DISPLAY_BATCH = 25;  // 한번에 보여줄 개수
const PRELOAD_BATCH = 25;  // 미리 로드할 개수

// 업종 리스트 템플릿 로드
export async function loadBusinessItemTemplate() {
    try {
        const response = await fetch('/main/components/business-list.html');
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

// 배열 셔플 함수 (Fisher-Yates 알고리즘)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Firebase에서 광고 데이터 로드 (초기 100개)
export async function loadAdvertisements() {
    console.log('광고 목록 로드 시작');
    
    // 캐시 키와 만료 시간 (10분)
    const CACHE_KEY = 'business_list_ads';
    const CACHE_EXPIRY = 10 * 60 * 1000; // 10분
    
    // 캐시 확인
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            const now = Date.now();
            
            // 캐시가 만료되지 않은 경우
            if (data.expiry > now) {
                console.log('캐시된 데이터 사용');
                allAdvertisements = data.advertisements;
                initializeDisplay();
                return;
            }
        }
    } catch (error) {
        console.error('캐시 읽기 실패:', error);
    }
    
    // Firebase에서 새 데이터 로드
    try {
        const adsRef = ref(rtdb, 'advertisements');
        const snapshot = await get(adsRef);
        
        console.log('Firebase 데이터 수신');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const allAds = Object.entries(data).map(([id, ad]) => ({
                ...ad,
                id
            }));
            
            // 활성 상태인 광고만 필터링
            let activeAds = allAds.filter(ad => ad.status === 'active');
            
            // 랜덤으로 셔플
            activeAds = shuffleArray(activeAds);
            
            // 처음 100개만 가져오기
            allAdvertisements = activeAds.slice(0, INITIAL_LOAD);
            
            // 캐시에 저장
            try {
                const cacheData = {
                    advertisements: allAdvertisements,
                    expiry: Date.now() + CACHE_EXPIRY
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                console.log('데이터 캐시 저장됨');
            } catch (error) {
                console.error('캐시 저장 실패:', error);
            }
            
            console.log(`총 ${allAdvertisements.length}개의 광고 랜덤 로드됨`);
        } else {
            allAdvertisements = [];
            console.log('광고 데이터가 없습니다');
        }
        
        initializeDisplay();
    } catch (error) {
        console.error('광고 로드 실패:', error);
        allAdvertisements = [];
        initializeDisplay();
    }
}

// 초기 디스플레이 설정
function initializeDisplay() {
    // 처음 50개만 표시
    displayedAds = allAdvertisements.slice(0, DISPLAY_BATCH);
    currentDisplayIndex = DISPLAY_BATCH;
    
    // 51-100번째 광고를 preloadedAds에 저장
    if (allAdvertisements.length > DISPLAY_BATCH) {
        preloadedAds = allAdvertisements.slice(DISPLAY_BATCH, INITIAL_LOAD);
    }
    
    displayAdvertisements(displayedAds);
    
    // 스크롤 이벤트 설정
    setupScrollListener();
    
    // 백그라운드에서 추가 50개 로드 (101-150)
    if (allAdvertisements.length === INITIAL_LOAD) {
        preloadNextBatch();
    }
}

// 백그라운드에서 추가 데이터 로드
async function preloadNextBatch() {
    if (isLoading || !hasMoreData) return;
    
    isLoading = true;
    
    try {
        const adsRef = ref(rtdb, 'advertisements');
        const snapshot = await get(adsRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const allAds = Object.entries(data).map(([id, ad]) => ({
                ...ad,
                id
            }));
            
            // 활성 상태인 광고만 필터링
            let activeAds = allAds.filter(ad => ad.status === 'active');
            
            // 이미 로드된 광고 ID 목록
            const loadedIds = new Set(allAdvertisements.map(ad => ad.id));
            
            // 아직 로드되지 않은 광고들만 필터링
            let newAds = activeAds.filter(ad => !loadedIds.has(ad.id));
            
            // 랜덤으로 셔플
            newAds = shuffleArray(newAds);
            
            // 50개만 선택
            const nextBatch = newAds.slice(0, PRELOAD_BATCH);
            
            if (nextBatch.length > 0) {
                preloadedAds = [...preloadedAds, ...nextBatch];
                allAdvertisements = [...allAdvertisements, ...nextBatch];
                console.log(`백그라운드에서 ${nextBatch.length}개 추가 랜덤 로드됨`);
            } else {
                hasMoreData = false;
                console.log('더 이상 로드할 광고가 없습니다');
            }
        }
    } catch (error) {
        console.error('추가 광고 로드 실패:', error);
    } finally {
        isLoading = false;
    }
}

// 스크롤 이벤트 리스너 설정
function setupScrollListener() {
    let ticking = false;
    
    function handleScroll() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                checkScrollPosition();
                ticking = false;
            });
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', handleScroll);
}

// 스크롤 위치 체크
function checkScrollPosition() {
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const clientHeight = window.innerHeight;
    
    // 페이지 하단 200px 전에 도달하면 다음 배치 표시
    if (scrollHeight - scrollTop - clientHeight < 200) {
        showNextBatch();
    }
}

// 다음 배치 표시
function showNextBatch() {
    if (isLoading) return;
    
    // preloadedAds에서 다음 50개 가져오기
    if (preloadedAds.length > 0) {
        const nextBatch = preloadedAds.slice(0, DISPLAY_BATCH);
        preloadedAds = preloadedAds.slice(DISPLAY_BATCH);
        
        displayedAds = [...displayedAds, ...nextBatch];
        appendAdvertisements(nextBatch);
        
        console.log(`${nextBatch.length}개 추가 표시됨`);
        
        // preloadedAds가 부족하면 백그라운드에서 추가 로드
        if (preloadedAds.length < DISPLAY_BATCH && hasMoreData) {
            preloadNextBatch();
        }
    }
}

// 광고 추가 표시 (기존 목록에 추가)
function appendAdvertisements(ads) {
    const businessList = document.querySelector('.business-list');
    if (!businessList || ads.length === 0) return;
    
    // 추가할 광고들의 HTML 생성
    const html = ads.map(ad => {
        const data = {
            id: ad.id,
            thumbnail: ad.thumbnail || '/img/default-thumb.jpg',
            businessName: ad.businessName || '업소명 없음',
            businessType: ad.businessType || '미분류',
            author: ad.author || '작성자 없음',
            region: ad.region || '',
            city: ad.city || '',
            location: [ad.region, ad.city].filter(Boolean).join(' ') || '위치 정보 없음',
            views: ad.views || 0
        };
        
        return replaceTemplate(businessItemTemplate, data);
    }).join('');
    
    // 기존 목록에 추가
    businessList.insertAdjacentHTML('beforeend', html);
    
    // 새로 추가된 아이템들에 이벤트 리스너 추가
    attachEventListeners();
}

// 필터 적용
export function applyFilters() {
    let filteredAds = displayedAds;
    
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
        filteredAds = filteredAds.filter(ad => ad.businessType === currentFilters.businessType);
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
            businessName: ad.businessName || '업소명 없음',
            businessType: ad.businessType || '미분류',
            author: ad.category === '건전마사지' ? '' : (ad.author || '작성자 없음'),
            region: ad.region || '',
            city: ad.city || '',
            location: [ad.region, ad.city].filter(Boolean).join(' ') || '위치 정보 없음',
            views: ad.views || 0
        };
        
        return replaceTemplate(businessItemTemplate, data);
    }).join('');
    
    businessList.innerHTML = html;
    
    // 이벤트 리스너 추가
    attachEventListeners();
}

// 이벤트 리스너 추가 함수
function attachEventListeners() {
    // 상세보기 버튼 이벤트
    document.querySelectorAll('.btn-detail').forEach(btn => {
        if (!btn.hasAttribute('data-listener')) {
            btn.setAttribute('data-listener', 'true');
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const adId = this.dataset.id;
                window.location.href = `/business-detail/business-detail.html?id=${adId}`;
            });
        }
    });
    
    // 후기 버튼 이벤트
    document.querySelectorAll('.btn-review').forEach(btn => {
        if (!btn.hasAttribute('data-listener')) {
            btn.setAttribute('data-listener', 'true');
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const adId = this.dataset.id;
                window.location.href = `/business-detail/business-detail.html?id=${adId}&tab=reviews`;
            });
        }
    });
    
    // 전체 아이템 클릭 이벤트
    document.querySelectorAll('.business-item').forEach(item => {
        if (!item.hasAttribute('data-listener')) {
            item.setAttribute('data-listener', 'true');
            item.addEventListener('click', function(e) {
                if (!e.target.classList.contains('btn-detail') && !e.target.classList.contains('btn-review')) {
                    const adId = this.dataset.id;
                    window.location.href = `/business-detail/business-detail.html?id=${adId}`;
                }
            });
        }
    });
}

// 카테고리 변경 이벤트 리스너
window.addEventListener('categoryChanged', (e) => {
    const { category } = e.detail;
    
    if (category === 'all') {
        displayAdvertisements(displayedAds);
    } else if (category === 'karaoke') {
        const filtered = displayedAds.filter(ad => ad.category === '유흥주점');
        displayAdvertisements(filtered);
    } else if (category === 'gunma') {
        const filtered = displayedAds.filter(ad => ad.category === '건전마사지');
        displayAdvertisements(filtered);
    }
});

// 필터 적용 이벤트 리스너
window.addEventListener('applyFilters', () => {
    applyFilters();
});