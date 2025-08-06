// 컴포넌트 로드 및 관리

// 컴포넌트 로드 함수
export async function loadComponent(containerId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        }
        return true;
    } catch (error) {
        console.error('컴포넌트 로드 실패:', error);
        return false;
    }
}

// 업체 헤더 데이터 설정
export function setBusinessHeader(data) {
    const thumbnail = document.getElementById('business-thumbnail');
    const title = document.getElementById('business-title');
    const typeAuthor = document.getElementById('business-type-author');
    const location = document.getElementById('business-location');
    const views = document.getElementById('business-views');
    
    if (thumbnail && data.thumbnail) {
        thumbnail.src = data.thumbnail;
        thumbnail.style.display = 'block';
        thumbnail.onerror = function() {
            this.style.display = 'none';
        };
    }
    
    if (title) title.textContent = data.title || '';
    if (typeAuthor) typeAuthor.textContent = `${data.businessType} - ${data.author}`;
    if (location) location.textContent = `${data.region} ${data.city}`;
    if (views) views.textContent = `조회 ${data.views || 0}`;
}

// 상세내용 설정
export function setDetailContent(data) {
    const detailContent = document.getElementById('detail-content');
    const contactList = document.getElementById('contact-list');
    
    if (detailContent) {
        detailContent.innerHTML = data.content || '';
    }
    
    if (contactList) {
        let contactHtml = `
            <div class="contact-item">
                <div class="contact-icon">📞</div>
                <span class="contact-label">전화번호</span>
                <span class="contact-value">
                    <a href="tel:${data.phone}">${data.phone}</a>
                </span>
            </div>
        `;
        
        if (data.kakao) {
            contactHtml += `
                <div class="contact-item">
                    <div class="contact-icon">💬</div>
                    <span class="contact-label">카카오톡</span>
                    <span class="contact-value">${data.kakao}</span>
                </div>
            `;
        }
        
        if (data.telegram) {
            contactHtml += `
                <div class="contact-item">
                    <div class="contact-icon">✈️</div>
                    <span class="contact-label">텔레그램</span>
                    <span class="contact-value">${data.telegram}</span>
                </div>
            `;
        }
        
        contactList.innerHTML = contactHtml;
    }
    
    // 전화 버튼 설정
    const btnCall = document.getElementById('btn-call');
    if (btnCall) {
        btnCall.onclick = () => window.location.href = `tel:${data.phone}`;
    }
}

// 탭 이벤트 설정
export function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 모든 탭 버튼과 콘텐츠 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 선택한 탭 활성화
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // 후기 탭 선택 시 이벤트 발생
            if (targetTab === 'reviews') {
                window.dispatchEvent(new CustomEvent('loadReviews'));
            }
        });
    });
}