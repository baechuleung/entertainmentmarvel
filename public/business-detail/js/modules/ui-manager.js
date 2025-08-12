// 업체 헤더 설정
export function setBusinessHeader(data) {
    const thumbnail = document.getElementById('business-thumbnail');
    const businessName = document.getElementById('business-name');
    const businessType = document.getElementById('business-type');
    const businessLocation = document.getElementById('business-location');
    const viewCount = document.getElementById('view-count');
    const reviewCount = document.getElementById('review-count');
    const bookmarkCount = document.getElementById('bookmark-count');
    
    if (thumbnail) {
        const thumbnailSrc = data.thumbnail || 
            (data.businessTypeCode ? `/img/business-type/${data.businessTypeCode}.png` : null);
            
        if (thumbnailSrc) {
            thumbnail.src = thumbnailSrc;
            thumbnail.style.display = 'block';
            thumbnail.onerror = function() {
                this.style.display = 'none';
            };
        }
    }
    
    // businessName과 author를 조합 (건전마사지는 author 제외)
    if (businessName) {
        if (data.category === '건전마사지') {
            businessName.textContent = data.businessName || '';
        } else {
            businessName.textContent = `${data.businessName || ''} - ${data.author || ''}`;
        }
    }
    if (businessType) businessType.textContent = `${data.businessType || ''}`;
    if (businessLocation) businessLocation.textContent = `${data.region || ''} ${data.city || ''}`;
    
    // 통계 정보 표시
    if (viewCount) viewCount.textContent = data.views || 0;
    if (reviewCount) reviewCount.textContent = data.reviewCount || 0;
    if (bookmarkCount) {
        const bookmarks = data.bookmarks || [];
        bookmarkCount.textContent = Array.isArray(bookmarks) ? bookmarks.length : 0;
    }
}

// 상세내용 설정
export function setDetailContent(data) {
    const detailContent = document.getElementById('detail-content');
    
    // 상세 내용 표시
    if (detailContent) {
        detailContent.innerHTML = data.content || '';
    }
    
    // 연락처 정보 설정
    setContactInfo(data);
}

// 연락처 정보 설정
function setContactInfo(data) {
    const contactSection = document.getElementById('contact-section');
    const kakaoItem = document.getElementById('kakao-item');
    const telegramItem = document.getElementById('telegram-item');
    const kakaoId = document.getElementById('kakao-id');
    const telegramId = document.getElementById('telegram-id');
    
    // 카카오톡이나 텔레그램 중 하나라도 있으면 섹션 표시
    if (data.kakao || data.telegram) {
        contactSection.style.display = 'block';
        
        // 카카오톡 설정
        if (data.kakao) {
            kakaoItem.style.display = 'flex';
            const btnKakaoAction = document.getElementById('btn-kakao-action');
            
            // URL인지 ID인지 확인
            if (data.kakao.startsWith('https://') || data.kakao.startsWith('http://')) {
                // URL인 경우 - 링크로 표시
                kakaoId.innerHTML = `<a href="${data.kakao}" target="_blank" style="color: #FEE500; text-decoration: none;">링크 열기</a>`;
                btnKakaoAction.textContent = '이동';
                btnKakaoAction.onclick = () => window.open(data.kakao, '_blank');
            } else {
                // ID인 경우 - 복사 기능
                kakaoId.textContent = data.kakao;
                btnKakaoAction.textContent = '복사';
                btnKakaoAction.onclick = () => copyToClipboard(data.kakao, '카카오톡');
            }
        }
        
        // 텔레그램 설정
        if (data.telegram) {
            telegramItem.style.display = 'flex';
            const btnTelegramAction = document.getElementById('btn-telegram-action');
            
            // URL인지 ID인지 확인
            if (data.telegram.startsWith('https://') || data.telegram.startsWith('http://')) {
                // URL인 경우 - 링크로 표시
                telegramId.innerHTML = `<a href="${data.telegram}" target="_blank" style="color: #2AABEE; text-decoration: none;">링크 열기</a>`;
                btnTelegramAction.textContent = '이동';
                btnTelegramAction.onclick = () => window.open(data.telegram, '_blank');
            } else {
                // ID인 경우 - @ 붙여서 표시하고 복사 기능
                const telegramValue = data.telegram.startsWith('@') ? data.telegram : '@' + data.telegram;
                telegramId.textContent = telegramValue;
                btnTelegramAction.textContent = '복사';
                btnTelegramAction.onclick = () => copyToClipboard(telegramValue, '텔레그램');
            }
        }
    }
}

// 클립보드 복사 함수
function copyToClipboard(text, type) {
    navigator.clipboard.writeText(text).then(function() {
        // 임시 알림 표시
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = `${type} ID가 복사되었습니다!`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }).catch(function(err) {
        console.error('복사 실패:', err);
        alert('복사에 실패했습니다. 수동으로 복사해주세요.');
    });
}