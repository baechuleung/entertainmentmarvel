import { rtdb } from '/js/firebase-config.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 전역 변수
let currentAd = null;
let currentSlide = 0;

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // URL에서 광고 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const adId = urlParams.get('id');
    
    if (!adId) {
        showError('잘못된 접근입니다.');
        return;
    }
    
    // 광고 데이터 로드
    await loadAdDetail(adId);
});

// 광고 상세 정보 로드
async function loadAdDetail(adId) {
    const container = document.querySelector('.business-detail-container');
    
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            showError('광고를 찾을 수 없습니다.');
            return;
        }
        
        currentAd = snapshot.val();
        
        // 조회수 증가
        await updateViewCount(adId, currentAd.views || 0);
        
        // 페이지 타이틀 업데이트
        document.title = `${currentAd.title} - 유흥마블`;
        
        // 상세 페이지 렌더링
        renderDetailPage();
        
    } catch (error) {
        console.error('광고 로드 실패:', error);
        showError('광고를 불러오는데 실패했습니다.');
    }
}

// 조회수 업데이트
async function updateViewCount(adId, currentViews) {
    try {
        await update(ref(rtdb, `advertisements/${adId}`), {
            views: currentViews + 1
        });
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}

// 상세 페이지 렌더링
function renderDetailPage() {
    const container = document.querySelector('.business-detail-container');
    
    // 이미지 슬라이더 HTML
    const imagesHtml = currentAd.images && currentAd.images.length > 0 ? `
        <div class="image-slider">
            <div class="slider-wrapper">
                ${currentAd.images.map(img => `
                    <div class="slide">
                        <img src="${img}" alt="${currentAd.title}">
                    </div>
                `).join('')}
            </div>
            ${currentAd.images.length > 1 ? `
                <div class="slider-dots">
                    ${currentAd.images.map((_, index) => `
                        <div class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    ` : '';
    
    container.innerHTML = `
        ${imagesHtml}
        
        <div class="business-info-section">
            <h1 class="business-title">${currentAd.title}</h1>
            <div class="business-meta">
                <span class="business-type-badge">${currentAd.businessType}</span>
                <span class="meta-item">${currentAd.author}</span>
                <span class="meta-item">${currentAd.region} ${currentAd.city}</span>
                <span class="meta-item">조회 ${currentAd.views || 0}</span>
            </div>
        </div>
        
        <div class="detail-content-section">
            <div class="detail-content">
                ${currentAd.content}
            </div>
        </div>
        
        <div class="contact-section">
            <h3 class="contact-title">연락처 정보</h3>
            <div class="contact-list">
                <div class="contact-item">
                    <div class="contact-icon">📞</div>
                    <span class="contact-label">전화번호</span>
                    <span class="contact-value">
                        <a href="tel:${currentAd.phone}">${currentAd.phone}</a>
                    </span>
                </div>
                ${currentAd.kakao ? `
                    <div class="contact-item">
                        <div class="contact-icon">💬</div>
                        <span class="contact-label">카카오톡</span>
                        <span class="contact-value">${currentAd.kakao}</span>
                    </div>
                ` : ''}
                ${currentAd.telegram ? `
                    <div class="contact-item">
                        <div class="contact-icon">✈️</div>
                        <span class="contact-label">텔레그램</span>
                        <span class="contact-value">${currentAd.telegram}</span>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="bottom-actions">
            <button class="btn-call" onclick="window.location.href='tel:${currentAd.phone}'">
                전화 문의하기
            </button>
        </div>
    `;
    
    // 이미지 슬라이더 이벤트 설정
    if (currentAd.images && currentAd.images.length > 1) {
        setupSlider();
    }
}

// 이미지 슬라이더 설정
function setupSlider() {
    const dots = document.querySelectorAll('.dot');
    const sliderWrapper = document.querySelector('.slider-wrapper');
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            updateSlider();
        });
    });
    
    // 터치 이벤트 (간단한 스와이프)
    let startX = 0;
    let endX = 0;
    
    sliderWrapper.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });
    
    sliderWrapper.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        handleSwipe();
    });
    
    function handleSwipe() {
        if (startX - endX > 50 && currentSlide < currentAd.images.length - 1) {
            currentSlide++;
            updateSlider();
        } else if (endX - startX > 50 && currentSlide > 0) {
            currentSlide--;
            updateSlider();
        }
    }
}

// 슬라이더 업데이트
function updateSlider() {
    const sliderWrapper = document.querySelector('.slider-wrapper');
    const dots = document.querySelectorAll('.dot');
    
    sliderWrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

// 에러 표시
function showError(message) {
    const container = document.querySelector('.business-detail-container');
    container.innerHTML = `<div class="error">${message}</div>`;
}