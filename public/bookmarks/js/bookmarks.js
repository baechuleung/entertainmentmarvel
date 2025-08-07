import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let currentUser = null;
let userData = null;
let bookmarkedAds = [];
let allBookmarks = [];
let regionData = {};
let cityData = {};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadRegionData();
    loadBusinessTypes();
    setupEventListeners();
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadBookmarkedAds();
        } else {
            window.location.href = '/auth/login.html';
        }
    });
}

// 사용자 데이터 로드
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 즐겨찾기한 광고 로드
async function loadBookmarkedAds() {
    try {
        // 사용자의 bookmarks 배열 가져오기
        const bookmarks = userData?.bookmarks || [];
        
        if (bookmarks.length === 0) {
            displayBookmarks([]);
            return;
        }
        
        // 각 북마크 ID로 광고 정보 가져오기
        const adsRef = ref(rtdb, 'advertisements');
        const snapshot = await get(adsRef);
        
        bookmarkedAds = [];
        
        if (snapshot.exists()) {
            const allAds = snapshot.val();
            
            // 북마크된 광고만 필터링
            bookmarks.forEach(bookmarkId => {
                if (allAds[bookmarkId]) {
                    bookmarkedAds.push({
                        id: bookmarkId,
                        ...allAds[bookmarkId]
                    });
                }
            });
        }
        
        // 최신순 정렬
        bookmarkedAds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        // 전체 북마크 저장
        allBookmarks = [...bookmarkedAds];
        
        displayBookmarks(bookmarkedAds);
        
    } catch (error) {
        console.error('즐겨찾기 로드 실패:', error);
    }
}

// 즐겨찾기 표시
function displayBookmarks(bookmarks) {
    const bookmarkList = document.getElementById('bookmark-list');
    const emptyState = document.getElementById('empty-state');
    
    if (bookmarks.length === 0) {
        bookmarkList.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    bookmarkList.style.display = 'block';
    emptyState.style.display = 'none';
    
    bookmarkList.innerHTML = bookmarks.map(ad => {
        // 썸네일 처리
        const thumbnailSrc = ad.businessTypeCode ? 
            `/img/business-type/${ad.businessTypeCode}.png` : 
            (ad.thumbnail || '/img/default-thumb.png');
        
        return `
            <div class="bookmark-item" data-id="${ad.id}">
                <div class="bookmark-thumbnail">
                    <img src="${thumbnailSrc}" alt="${ad.title}" onerror="this.src='/img/default-thumb.png'">
                    <div class="business-type-badge">${ad.businessType || '기타'}</div>
                </div>
                <div class="bookmark-info">
                    <div class="bookmark-title">${ad.title || '제목 없음'}</div>
                    <div class="bookmark-meta">
                        <span class="business-type">${ad.author || '작성자'}</span>
                    </div>
                </div>
                <div class="location-info">
                    <div class="location-icon"></div>
                    <span>${ad.region || '서울'} ${ad.city || '강남'}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // 클릭 이벤트 추가
    addBookmarkEventListeners();
}

// 북마크 이벤트 리스너 추가
function addBookmarkEventListeners() {
    document.querySelectorAll('.bookmark-item').forEach(item => {
        item.addEventListener('click', function() {
            const adId = this.getAttribute('data-id');
            window.location.href = `/business-detail/business-detail.html?id=${adId}`;
        });
    });
}

// 지역 데이터 로드
async function loadRegionData() {
    try {
        // region1.json 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        // region2.json 로드
        const region2Response = await fetch('/data/region2.json');
        cityData = await region2Response.json();
        
        // 지역 선택 옵션 추가
        const regionSelect = document.getElementById('region-select');
        regionSelect.innerHTML = '<option value="">전체 지역</option>';
        
        region1Data.regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.name;
            option.textContent = region.name;
            regionSelect.appendChild(option);
            
            // 지역 코드 매핑
            regionData[region.name] = region.code;
        });
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        const typeSelect = document.getElementById('type-select');
        typeSelect.innerHTML = '<option value="">전체 업종</option>';
        
        data.businessTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            typeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 도시 옵션 업데이트
function updateCityOptions(regionName) {
    const citySelect = document.getElementById('city-select');
    citySelect.innerHTML = '<option value="">전체 도시</option>';
    
    if (!regionName) return;
    
    const regionCode = regionData[regionName];
    if (regionCode && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    }
}

// 필터링
function applyFilters() {
    const region = document.getElementById('region-select').value;
    const city = document.getElementById('city-select').value;
    const type = document.getElementById('type-select').value;
    const searchText = document.getElementById('search-input').value.toLowerCase();
    
    let filtered = allBookmarks.filter(ad => {
        // 지역 필터
        if (region && ad.region !== region) return false;
        
        // 도시 필터
        if (city && ad.city !== city) return false;
        
        // 업종 필터
        if (type && ad.businessType !== type) return false;
        
        // 검색어 필터
        if (searchText) {
            const title = (ad.title || '').toLowerCase();
            const author = (ad.author || '').toLowerCase();
            if (!title.includes(searchText) && !author.includes(searchText)) {
                return false;
            }
        }
        
        return true;
    });
    
    displayBookmarks(filtered);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 지역 선택 변경
    document.getElementById('region-select')?.addEventListener('change', function() {
        updateCityOptions(this.value);
        applyFilters();
    });
    
    // 도시 선택 변경
    document.getElementById('city-select')?.addEventListener('change', applyFilters);
    
    // 업종 선택 변경
    document.getElementById('type-select')?.addEventListener('change', applyFilters);
    
    // 검색 입력
    document.getElementById('search-input')?.addEventListener('input', applyFilters);
    
    // 검색 버튼
    document.querySelector('.search-btn')?.addEventListener('click', applyFilters);
    
    // 엔터키로 검색
    document.getElementById('search-input')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
}