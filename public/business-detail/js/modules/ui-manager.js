// UI 관리 모듈

// 헤더 정보 설정
export function setBusinessHeader(data) {
    // 썸네일
    const thumbnail = document.getElementById('business-thumbnail');
    if (thumbnail) {
        thumbnail.src = data.thumbnail || '/img/default-thumb.jpg';
        thumbnail.alt = data.businessName || '업체 이미지';
        thumbnail.style.display = 'block';
    }
    
    // 업체명
    const businessName = document.getElementById('business-name');
    if (businessName) {
        businessName.textContent = data.businessName || '업체명 없음';
    }
    
    // 업종
    const businessType = document.getElementById('business-type');
    if (businessType) {
        businessType.textContent = data.businessType || '업종 정보 없음';
    }
    
    // 지역
    const businessLocation = document.getElementById('business-location');
    if (businessLocation) {
        const location = data.city ? 
            `${data.region} ${data.city}` : 
            `${data.region || '위치 정보 없음'}`;
        businessLocation.textContent = location;
        
        // 부모 요소 표시
        const locationContainer = businessLocation.parentElement;
        if (locationContainer) {
            locationContainer.style.display = 'flex';
        }
    }
    
    // 조회수
    const viewCount = document.getElementById('view-count');
    if (viewCount) {
        viewCount.textContent = data.views || 0;
    }
    
    // 북마크 수
    const bookmarkCount = document.getElementById('bookmark-count');
    if (bookmarkCount) {
        const bookmarks = data.bookmarks || [];
        bookmarkCount.textContent = Array.isArray(bookmarks) ? bookmarks.length : 0;
    }
    
    // 후기 수
    const reviewCount = document.getElementById('review-count');
    if (reviewCount) {
        const reviews = data.reviews || {};
        reviewCount.textContent = Object.keys(reviews).length;
    }
}

// 상세내용 설정
export function setDetailContent(data) {
    // 기존 detail-content는 숨김 (나중에 제거 예정)
    const detailContent = document.getElementById('detail-content');
    if (detailContent) {
        detailContent.style.display = 'none';
    }
    
    // 카테고리별 추가 정보 표시 (이벤트 정보까지)
    console.log('setDetailContent 호출됨, 카테고리:', data.category);
    displayCategorySpecificInfo(data);
    
    // 상세내용 (content 필드) 표시 - 이벤트 정보 다음에
    if (data.content) {
        const contentSection = document.getElementById('content-section');
        const contentText = document.getElementById('content-text');
        
        console.log('상세내용 표시 시도:', contentSection, contentText);
        
        if (contentSection && contentText) {
            contentSection.style.display = 'block';
            contentText.innerHTML = data.content;
            console.log('상세내용 표시 완료');
        }
    }
    
    // 연락처 정보 설정 (기존 코드 유지)
    setContactInfo(data);
}

// 카테고리별 추가 정보 표시
function displayCategorySpecificInfo(data) {
    // 영업시간 (유흥주점, 건전마사지 공통)
    if (data.businessHours) {
        const businessHoursSection = document.getElementById('business-hours-section');
        const businessHoursContent = document.getElementById('business-hours-content');
        
        if (businessHoursSection && businessHoursContent) {
            businessHoursSection.style.display = 'block';
            businessHoursContent.textContent = data.businessHours;
        }
    }
    
    // 유흥주점 카테고리 정보
    if (data.category === '유흥주점') {
        
        // 주대 안내 (객체 형태로 저장된 경우)
        if (data.tablePrice) {
            const tablePriceSection = document.getElementById('table-price-section');
            const tablePriceList = document.getElementById('table-price-list');
            
            if (tablePriceSection && tablePriceList) {
                tablePriceSection.style.display = 'block';
                
                // 기존 내용 초기화
                tablePriceList.innerHTML = '';
                
                // tablePrice가 객체인 경우 처리
                if (typeof data.tablePrice === 'object') {
                    // 객체를 배열로 변환 (예: {"1인기준": "330,000", "2인기준": "550,000"})
                    Object.entries(data.tablePrice).forEach(([person, price]) => {
                        const priceItem = document.createElement('div');
                        priceItem.className = 'price-item';
                        
                        const priceName = document.createElement('div');
                        priceName.className = 'price-name';
                        priceName.textContent = person;
                        
                        const priceValue = document.createElement('div');
                        priceValue.className = 'price-value';
                        // 가격이 문자열로 저장된 경우 처리
                        const priceText = typeof price === 'string' ? price : price.toString();
                        priceValue.textContent = priceText.includes('원') ? priceText : `${priceText}원`;
                        
                        priceItem.appendChild(priceName);
                        priceItem.appendChild(priceValue);
                        tablePriceList.appendChild(priceItem);
                    });
                }
            }
        }
        
        // 이벤트 정보
        if (data.eventInfo) {
            const eventInfoSection = document.getElementById('event-info-section');
            const eventInfoContent = document.getElementById('event-info-content');
            
            if (eventInfoSection && eventInfoContent) {
                eventInfoSection.style.display = 'block';
                // 이벤트 정보는 에디터에서 생성된 HTML이므로 innerHTML 사용
                eventInfoContent.innerHTML = data.eventInfo;
            }
        }
    }
    
    // 건전마사지 카테고리 정보
    if (data.category === '건전마사지') {
        // 코스 정보 (객체 형태로 저장된 경우)
        if (data.courses && typeof data.courses === 'object') {
            const coursesSection = document.getElementById('courses-section');
            const coursesList = document.getElementById('courses-list');
            
            if (coursesSection && coursesList) {
                coursesSection.style.display = 'block';
                
                // 기존 내용 초기화
                coursesList.innerHTML = '';
                
                // courses가 배열이 아닌 객체인 경우 처리
                if (!Array.isArray(data.courses)) {
                    // 객체를 배열로 변환 (예: {"60분": "13,000,000", "90분": "16,000,000"})
                    Object.entries(data.courses).forEach(([duration, price]) => {
                        const courseItem = document.createElement('div');
                        courseItem.className = 'course-item';
                        
                        const courseName = document.createElement('span');
                        courseName.className = 'course-name';
                        courseName.textContent = duration;
                        
                        const coursePrice = document.createElement('span');
                        coursePrice.className = 'course-price';
                        // 가격이 문자열로 저장된 경우 처리
                        const priceText = typeof price === 'string' ? price : price.toString();
                        coursePrice.textContent = priceText.includes('원') ? priceText : `${priceText}원`;
                        
                        courseItem.appendChild(courseName);
                        courseItem.appendChild(coursePrice);
                        coursesList.appendChild(courseItem);
                    });
                } else {
                    // 배열 형태로 저장된 경우 (기존 코드)
                    data.courses.forEach(course => {
                        const courseItem = document.createElement('div');
                        courseItem.className = 'course-item';
                        
                        const courseName = document.createElement('span');
                        courseName.className = 'course-name';
                        courseName.textContent = course.name;
                        
                        const coursePrice = document.createElement('span');
                        coursePrice.className = 'course-price';
                        coursePrice.textContent = course.price ? 
                            `${course.price.toLocaleString()}원` : '가격 문의';
                        
                        courseItem.appendChild(courseName);
                        courseItem.appendChild(coursePrice);
                        coursesList.appendChild(courseItem);
                    });
                }
            }
        }
        
        // 휴무일
        if (data.closedDays) {
            const closedDaysSection = document.getElementById('closed-days-section');
            const closedDaysContent = document.getElementById('closed-days-content');
            
            if (closedDaysSection && closedDaysContent) {
                closedDaysSection.style.display = 'block';
                closedDaysContent.textContent = data.closedDays;
            }
        }
        
        // 주차 정보
        if (data.parkingInfo) {
            const parkingInfoSection = document.getElementById('parking-info-section');
            const parkingInfoContent = document.getElementById('parking-info-content');
            
            if (parkingInfoSection && parkingInfoContent) {
                parkingInfoSection.style.display = 'block';
                parkingInfoContent.textContent = data.parkingInfo;
            }
        }
        
        // 오시는 길
        if (data.directions) {
            const directionsSection = document.getElementById('directions-section');
            const directionsContent = document.getElementById('directions-content');
            
            if (directionsSection && directionsContent) {
                directionsSection.style.display = 'block';
                directionsContent.textContent = data.directions;
            }
        }
        
        // 이벤트 정보
        if (data.eventInfo) {
            const massageEventSection = document.getElementById('massage-event-section');
            const massageEventContent = document.getElementById('massage-event-content');
            
            if (massageEventSection && massageEventContent) {
                massageEventSection.style.display = 'block';
                // 이벤트 정보는 에디터에서 생성된 HTML이므로 innerHTML 사용
                massageEventContent.innerHTML = data.eventInfo;
            }
        }
    }
}

// 연락처 정보 설정 (기존 코드 그대로 유지)
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
                btnKakaoAction.onclick = () => copyToClipboard(data.kakao);
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
                const telegramValue = data.telegram.startsWith('@') ? data.telegram : `@${data.telegram}`;
                telegramId.textContent = telegramValue;
                btnTelegramAction.textContent = '복사';
                btnTelegramAction.onclick = () => copyToClipboard(telegramValue);
            }
        }
    }
}

// 클립보드에 복사
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('복사 실패:', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

// 클립보드 API를 사용할 수 없을 때의 대체 방법
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('복사 실패:', err);
    }
    
    document.body.removeChild(textArea);
}