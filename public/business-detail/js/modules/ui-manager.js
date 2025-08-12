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
    const detailContent = document.getElementById('detail-content');
    
    // 상세 내용 표시 (HTML 콘텐츠는 에디터에서 생성된 것이므로 innerHTML 사용)
    if (detailContent && data.content) {
        detailContent.innerHTML = data.content;
    }
    
    // 카테고리별 추가 정보 표시
    displayCategorySpecificInfo(data);
    
    // 연락처 정보 설정
    setContactInfo(data);
}

// 카테고리별 추가 정보 표시
function displayCategorySpecificInfo(data) {
    // 유흥주점 카테고리 정보
    if (data.category === '유흥주점' && data.eventDescription) {
        const eventSection = document.getElementById('event-section');
        const eventContent = document.getElementById('event-content');
        
        if (eventSection && eventContent) {
            eventSection.style.display = 'block';
            // 이벤트 설명은 에디터에서 생성된 HTML이므로 innerHTML 사용
            eventContent.innerHTML = data.eventDescription;
        }
    }
    
    // 건전마사지 카테고리 정보
    if (data.category === '건전마사지') {
        // 코스 정보
        if (data.courses && data.courses.length > 0) {
            const coursesSection = document.getElementById('courses-section');
            const coursesList = document.getElementById('courses-list');
            
            if (coursesSection && coursesList) {
                coursesSection.style.display = 'block';
                
                // 기존 내용 초기화
                coursesList.innerHTML = '';
                
                // 코스 아이템 동적 생성
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
        
        // 이벤트 정보
        if (data.eventDescription) {
            const massageEventSection = document.getElementById('massage-event-section');
            const massageEventContent = document.getElementById('massage-event-content');
            
            if (massageEventSection && massageEventContent) {
                massageEventSection.style.display = 'block';
                // 이벤트 설명은 에디터에서 생성된 HTML이므로 innerHTML 사용
                massageEventContent.innerHTML = data.eventDescription;
            }
        }
    }
}

// 연락처 정보 설정
function setContactInfo(data) {
    const contactSection = document.getElementById('contact-section');
    
    // 연락처 중 하나라도 있으면 섹션 표시
    if (data.phone || data.kakao || data.telegram) {
        if (contactSection) contactSection.style.display = 'block';
        
        // 전화번호 설정
        if (data.phone) {
            const phoneItem = document.getElementById('phone-item');
            const phoneNumber = document.getElementById('phone-number');
            const btnPhoneAction = document.getElementById('btn-phone-action');
            
            if (phoneItem && phoneNumber) {
                phoneItem.style.display = 'flex';
                phoneNumber.textContent = data.phone;
                
                if (btnPhoneAction) {
                    btnPhoneAction.onclick = () => copyToClipboard(data.phone);
                }
            }
        }
        
        // 카카오톡 설정
        if (data.kakao) {
            const kakaoItem = document.getElementById('kakao-item');
            const kakaoId = document.getElementById('kakao-id');
            const btnKakaoAction = document.getElementById('btn-kakao-action');
            
            if (kakaoItem && kakaoId) {
                kakaoItem.style.display = 'flex';
                
                // URL인지 ID인지 확인
                if (data.kakao.startsWith('https://') || data.kakao.startsWith('http://')) {
                    // URL인 경우 - 링크 생성
                    const link = document.createElement('a');
                    link.href = data.kakao;
                    link.target = '_blank';
                    link.style.color = '#FEE500';
                    link.style.textDecoration = 'none';
                    link.textContent = '링크 열기';
                    
                    kakaoId.innerHTML = '';
                    kakaoId.appendChild(link);
                    
                    if (btnKakaoAction) {
                        btnKakaoAction.textContent = '이동';
                        btnKakaoAction.onclick = () => window.open(data.kakao, '_blank');
                    }
                } else {
                    // ID인 경우
                    kakaoId.textContent = data.kakao;
                    
                    if (btnKakaoAction) {
                        btnKakaoAction.textContent = '복사';
                        btnKakaoAction.onclick = () => copyToClipboard(data.kakao);
                    }
                }
            }
        }
        
        // 텔레그램 설정
        if (data.telegram) {
            const telegramItem = document.getElementById('telegram-item');
            const telegramId = document.getElementById('telegram-id');
            const btnTelegramAction = document.getElementById('btn-telegram-action');
            
            if (telegramItem && telegramId) {
                telegramItem.style.display = 'flex';
                
                // URL인지 ID인지 확인
                if (data.telegram.startsWith('https://') || data.telegram.startsWith('http://')) {
                    // URL인 경우 - 링크 생성
                    const link = document.createElement('a');
                    link.href = data.telegram;
                    link.target = '_blank';
                    link.style.color = '#2AABEE';
                    link.style.textDecoration = 'none';
                    link.textContent = '링크 열기';
                    
                    telegramId.innerHTML = '';
                    telegramId.appendChild(link);
                    
                    if (btnTelegramAction) {
                        btnTelegramAction.textContent = '이동';
                        btnTelegramAction.onclick = () => window.open(data.telegram, '_blank');
                    }
                } else {
                    // ID인 경우 - @ 붙여서 표시
                    const telegramValue = data.telegram.startsWith('@') ? 
                        data.telegram : `@${data.telegram}`;
                    telegramId.textContent = telegramValue;
                    
                    if (btnTelegramAction) {
                        btnTelegramAction.textContent = '복사';
                        btnTelegramAction.onclick = () => copyToClipboard(telegramValue);
                    }
                }
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