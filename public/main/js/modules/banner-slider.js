// 배너 슬라이더 초기화
export function initBannerSlider() {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    
    if (slides.length === 0) return;
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        slides[index].classList.add('active');
        if (dots[index]) {
            dots[index].classList.add('active');
        }
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }
    
    // 도트 클릭 이벤트
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });
    
    // 자동 슬라이드
    setInterval(nextSlide, 5000);
}