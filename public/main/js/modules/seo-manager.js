import { currentCategory, currentFilters } from '/main/js/business-header.js';

// 기본 SEO 태그 설정 함수
export function setDefaultSEOTags() {
    document.title = '유흥마블 - 유흥주점 건전마시지 모든 정보를 한눈에 즐기세요!';
    
    // description 메타 태그
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
    }
    metaDescription.content = '유흥마블에서 다양한 업종의 프리미엄 서비스를 만나보세요. 강남, 홍대, 이태원 등 전국 각지의 엄선된 업체들을 소개합니다.';
    
    // keywords 메타 태그
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = '유흥, 룸, 가라오케, 하이퍼블릭, 퍼블릭, 텐프로, 텐카페, 강남, 홍대, 이태원';
}

// SEO 태그 동적 업데이트
export function updateSEOTags() {
    let title = '유흥마블';
    let description = '유흥마블에서 다양한 업종의 프리미엄 서비스를 만나보세요';
    let keywords = '유흥, 룸, 가라오케, 하이퍼블릭, 퍼블릭, 텐프로, 텐카페';
    
    const parts = []; // 타이틀 조합용 배열
    const descParts = []; // 설명 조합용 배열
    
    // 지역 필터
    if (currentFilters.region) {
        parts.push(currentFilters.region);
        descParts.push(currentFilters.region);
        keywords = currentFilters.region + ', ' + keywords;
        
        // 도시 필터
        if (currentFilters.city) {
            parts.push(currentFilters.city);
            descParts.push(currentFilters.city);
            keywords = currentFilters.city + ', ' + keywords;
        }
    }
    
    // 카테고리 처리 (한글로)
    if (currentCategory === 'karaoke') {
        parts.push('유흥주점');
        descParts.push('유흥주점');
    } else if (currentCategory === 'gunma') {
        parts.push('건전마사지');
        descParts.push('건전마사지');
    }
    
    // 업종 타입 처리 (한글 이름으로)
    if (currentFilters.businessType) {
        const activeBtn = document.querySelector('.category-btn.active');
        const typeName = activeBtn && activeBtn.textContent !== '전체' ? activeBtn.textContent : '';
        if (typeName) {
            parts.push(typeName);
            descParts.push(typeName);
            keywords = typeName + ', ' + keywords;
        }
    }
    
    // 타이틀 조합
    if (parts.length > 0) {
        title = parts.join(' ') + ' - 유흥마블';
        description = descParts.join(' ') + ' 정보를 확인하세요.';
    } else {
        title = '유흥마블 - 유흥주점 건전마시지 모든 정보를 한눈에 즐기세요!';
    }
    
    // 메타 태그 업데이트
    document.title = title;
    
    // description 메타 태그
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
    }
    metaDescription.content = description;
    
    // keywords 메타 태그
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = keywords;
    
    // Canonical URL 업데이트
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname + window.location.search;
    
    // Open Graph 태그 업데이트
    updateOpenGraphTags(title, description);
}

// Open Graph 태그 업데이트
function updateOpenGraphTags(title, description) {
    // og:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
    }
    ogTitle.content = title;
    
    // og:description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
    }
    ogDescription.content = description;
    
    // og:url
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
        ogUrl = document.createElement('meta');
        ogUrl.setAttribute('property', 'og:url');
        document.head.appendChild(ogUrl);
    }
    ogUrl.content = window.location.href;
}