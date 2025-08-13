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
    
    // businessName만 표시 (작성자 제외, 업종도 제외)
    if (businessName) {
        let fullName = data.businessName || '';
        
        // 텍스트 길이 제한
        if (fullName.length > 40) {
            fullName = fullName.substring(0, 37) + '...';
        }
        
        businessName.textContent = fullName;
    }
    
    // businessType 별도 표시 (두번째 줄)
    if (businessType) {
        businessType.textContent = data.businessType || '';
    }
    
    // 위치 정보 설정 및 표시
    if (businessLocation) {
        businessLocation.textContent = `${data.region || ''} ${data.city || ''}`;
        // 위치 정보가 있으면 부모 요소 표시
        if (data.region || data.city) {
            const locationContainer = businessLocation.closest('.ad-location');
            if (locationContainer) {
                locationContainer.style.display = 'flex';
            }
        }
    }
    
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
    // 카테고리에 따라 다른 필드 표시
    if (data.category === '유흥주점') {
        // 유흥주점 관련 필드들
        setKaraokeFields(data);
    } else if (data.category === '건전마사지') {
        // 건전마사지 관련 필드들
        setMassageFields(data);
    }
    
    // content 필드 표시 (상세내용) - content-text에 표시
    const contentText = document.getElementById('content-text');
    const contentSection = document.getElementById('content-section');
    
    if (contentText && data.content) {
        contentText.innerHTML = data.content;
        if (contentSection) contentSection.style.display = 'block';
    }
    
    // 연락처 정보 설정
    setContactInfo(data);
}

// 유흥주점 필드 설정
function setKaraokeFields(data) {
    // 영업시간
    const businessHoursContent = document.getElementById('business-hours-content');
    const businessHoursSection = document.getElementById('business-hours-section');
    if (businessHoursContent && data.businessHours) {
        businessHoursContent.textContent = data.businessHours;
        if (businessHoursSection) businessHoursSection.style.display = 'block';
    }
    
    // 주대안내
    const tablePriceList = document.getElementById('table-price-list');
    const tablePriceSection = document.getElementById('table-price-section');
    if (tablePriceList && data.tablePrice && typeof data.tablePrice === 'object') {
        tablePriceList.innerHTML = '';
        Object.entries(data.tablePrice).forEach(([name, price]) => {
            const item = document.createElement('div');
            item.className = 'price-item';
            item.innerHTML = `
                <span class="price-name">${name}</span>
                <span class="price-value">${price}원</span>
            `;
            tablePriceList.appendChild(item);
        });
        if (tablePriceSection) tablePriceSection.style.display = 'block';
    }
    
    // 이벤트 정보
    const eventInfoContent = document.getElementById('event-info-content');
    const eventInfoSection = document.getElementById('event-info-section');
    if (eventInfoContent && data.eventInfo) {
        eventInfoContent.innerHTML = data.eventInfo;
        if (eventInfoSection) eventInfoSection.style.display = 'block';
    }
}

// 건전마사지 필드 설정
function setMassageFields(data) {
    // 영업시간
    const businessHoursContent = document.getElementById('business-hours-content');
    const businessHoursSection = document.getElementById('business-hours-section');
    if (businessHoursContent && data.businessHours) {
        businessHoursContent.textContent = data.businessHours;
        if (businessHoursSection) businessHoursSection.style.display = 'block';
    }
    
    // 휴무일
    const closedDaysContent = document.getElementById('closed-days-content');
    const closedDaysSection = document.getElementById('closed-days-section');
    if (closedDaysContent && data.closedDays) {
        closedDaysContent.textContent = data.closedDays;
        if (closedDaysSection) closedDaysSection.style.display = 'block';
    }
    
    // 주차 정보
    const parkingInfoContent = document.getElementById('parking-info-content');
    const parkingInfoSection = document.getElementById('parking-info-section');
    if (parkingInfoContent && data.parkingInfo) {
        parkingInfoContent.textContent = data.parkingInfo;
        if (parkingInfoSection) parkingInfoSection.style.display = 'block';
    }
    
    // 오시는 길
    const directionsContent = document.getElementById('directions-content');
    const directionsSection = document.getElementById('directions-section');
    if (directionsContent && data.directions) {
        directionsContent.textContent = data.directions;
        if (directionsSection) directionsSection.style.display = 'block';
    }
    
    // 코스 안내 (오시는 길 다음에 위치)
    const coursesList = document.getElementById('courses-list');
    const coursesSection = document.getElementById('courses-section');
    if (coursesList && data.courses && typeof data.courses === 'object') {
        coursesList.innerHTML = '';
        Object.entries(data.courses).forEach(([name, price]) => {
            const item = document.createElement('div');
            item.className = 'course-item';  // 코스 전용 클래스 사용
            item.innerHTML = `
                <span class="price-name">${name}</span>
                <span class="price-value">${price}원</span>
            `;
            coursesList.appendChild(item);
        });
        if (coursesSection) coursesSection.style.display = 'block';
    }
    
    // 이벤트 정보 (건전마사지용)
    const massageEventContent = document.getElementById('massage-event-content');
    const massageEventSection = document.getElementById('massage-event-section');
    if (massageEventContent && data.eventInfo) {
        massageEventContent.innerHTML = data.eventInfo;
        if (massageEventSection) massageEventSection.style.display = 'block';
    }
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
        if (contactSection) contactSection.style.display = 'block';
        
        // 카카오톡 설정
        if (data.kakao) {
            if (kakaoItem) kakaoItem.style.display = 'flex';
            const btnKakaoAction = document.getElementById('btn-kakao-action');
            
            // URL인지 ID인지 확인
            if (data.kakao.startsWith('https://') || data.kakao.startsWith('http://')) {
                // URL인 경우 - 링크로 표시
                if (kakaoId) kakaoId.innerHTML = `<a href="${data.kakao}" target="_blank" style="color: #FEE500; text-decoration: none;">링크 열기</a>`;
                if (btnKakaoAction) {
                    btnKakaoAction.textContent = '이동';
                    btnKakaoAction.onclick = () => window.open(data.kakao, '_blank');
                }
            } else {
                // ID인 경우 - 복사 기능
                if (kakaoId) kakaoId.textContent = data.kakao;
                if (btnKakaoAction) {
                    btnKakaoAction.textContent = '복사';
                    btnKakaoAction.onclick = () => copyToClipboard(data.kakao, '카카오톡');
                }
            }
        }
        
        // 텔레그램 설정
        if (data.telegram) {
            if (telegramItem) telegramItem.style.display = 'flex';
            const btnTelegramAction = document.getElementById('btn-telegram-action');
            
            // URL인지 ID인지 확인
            if (data.telegram.startsWith('https://') || data.telegram.startsWith('http://')) {
                // URL인 경우 - 링크로 표시
                if (telegramId) telegramId.innerHTML = `<a href="${data.telegram}" target="_blank" style="color: #2AABEE; text-decoration: none;">링크 열기</a>`;
                if (btnTelegramAction) {
                    btnTelegramAction.textContent = '이동';
                    btnTelegramAction.onclick = () => window.open(data.telegram, '_blank');
                }
            } else {
                // ID인 경우 - @ 붙여서 표시하고 복사 기능
                const telegramValue = data.telegram.startsWith('@') ? 
                    data.telegram : '@' + data.telegram;
                if (telegramId) telegramId.textContent = telegramValue;
                if (btnTelegramAction) {
                    btnTelegramAction.textContent = '복사';
                    btnTelegramAction.onclick = () => copyToClipboard(telegramValue, '텔레그램');
                }
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