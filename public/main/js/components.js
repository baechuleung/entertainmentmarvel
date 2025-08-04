// 컴포넌트 로더
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    } catch (error) {
        console.error('컴포넌트 로드 실패:', error);
    }
}

// 메인 헤더 로드
async function loadMainHeader() {
    await loadComponent('main-header-container', 'components/business-header.html');
}

// 템플릿 문자열 치환
function replaceTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || '';
    });
}

// 업종 리스트 템플릿 로드 및 캐싱
let businessItemTemplate = '';

async function loadBusinessItemTemplate() {
    try {
        const response = await fetch('components/business-list.html');
        businessItemTemplate = await response.text();
    } catch (error) {
        console.error('업종 리스트 템플릿 로드 실패:', error);
    }
}

// 업종 리스트 아이템 생성
function createBusinessItem(business) {
    if (!businessItemTemplate) {
        // 템플릿이 로드되지 않은 경우 기본 HTML 반환
        return `
            <div class="business-item">
                <img src="${business.image}" alt="${business.name}">
                <div class="business-info">
                    <div>
                        <div class="business-header">
                            <span class="business-badge">${business.category}</span>
                            <span class="business-name">${business.name}</span>
                        </div>
                        <div class="business-location">📍 ${business.location}</div>
                        <div class="business-phone">📞 ${business.phone}</div>
                    </div>
                    <div class="business-actions">
                        <button class="btn-reservation" data-id="${business.id}">상세보기</button>
                        <button class="btn-wishlist" data-id="${business.id}">⭐ 찜하기</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    return replaceTemplate(businessItemTemplate, business);
}

// 업종 리스트 로드
function loadBusinessList(businesses) {
    const listContainer = document.querySelector('.business-list');
    if (listContainer) {
        listContainer.innerHTML = businesses.map(business => createBusinessItem(business)).join('');
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // 메인 헤더 로드
    await loadMainHeader();
    
    // 업종 리스트 템플릿 로드
    await loadBusinessItemTemplate();
    
    // 샘플 데이터로 리스트 생성
    const sampleBusinesses = [
        {
            id: 1,
            name: '도파민',
            category: '유흥주점',
            location: '서울 강남',
            phone: '010-1234-5678',
            image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect fill='%2387CEEB' width='120' height='120'/></svg>"
        },
        {
            id: 2,
            name: '사라있네',
            category: '유흥주점',
            location: '서울 강남',
            phone: '010-1234-5678',
            image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect fill='%2390EE90' width='120' height='120'/></svg>"
        }
    ];
    
    loadBusinessList(sampleBusinesses);
});