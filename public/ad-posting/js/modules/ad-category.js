// /ad-posting/js/modules/ad-category.js
// 카테고리별 특수 필드 및 기능을 담당하는 모듈

/**
 * 카테고리별 필드 표시/숨김
 * @param {string} categoryName - 카테고리명
 */
export function toggleCategorySpecificFields(categoryName) {
    // ID로 섹션 찾기 (HTML 구조에 맞춤)
    const entertainmentFields = document.getElementById('entertainment-fields');
    const massageFields = document.getElementById('massage-fields');
    
    // 클래스로 개별 필드 찾기 (호환성)
    const karaokeFields = document.querySelectorAll('.karaoke-field');
    const massageFieldItems = document.querySelectorAll('.massage-field');
    
    // 먼저 모든 필드 숨기기
    if (entertainmentFields) {
        entertainmentFields.style.display = 'none';
    }
    if (massageFields) {
        massageFields.style.display = 'none';
    }
    
    // 클래스 기반 필드도 숨기기
    karaokeFields.forEach(field => field.style.display = 'none');
    massageFieldItems.forEach(field => field.style.display = 'none');
    
    // 선택된 카테고리에 따라 필드 표시
    if (categoryName === '유흥주점') {
        // ID 기반 섹션 표시
        if (entertainmentFields) {
            entertainmentFields.style.display = 'block';
            console.log('유흥주점 필드 표시');
        }
        // 클래스 기반 필드 표시
        karaokeFields.forEach(field => field.style.display = 'block');
        
    } else if (categoryName === '건전마사지') {
        // ID 기반 섹션 표시
        if (massageFields) {
            massageFields.style.display = 'block';
            console.log('건전마사지 필드 표시');
        }
        // 클래스 기반 필드 표시
        massageFieldItems.forEach(field => field.style.display = 'block');
    }
}

/**
 * 카테고리별 데이터 수집
 * @param {string} categoryName - 카테고리명
 * @returns {Object} 카테고리별 데이터
 */
export function collectCategoryData(categoryName) {
    const categoryData = {};
    
    if (categoryName === '유흥주점') {
        // 영업시간
        const businessHours = document.getElementById('business-hours');
        if (businessHours) {
            categoryData.businessHours = businessHours.value;
        }
        
        // 주대 정보 수집
        categoryData.tablePrice = collectTablePrices();
        
    } else if (categoryName === '건전마사지') {
        // 영업시간
        const massageBusinessHours = document.getElementById('massage-business-hours');
        if (massageBusinessHours) {
            categoryData.businessHours = massageBusinessHours.value;
        }
        
        // 휴무일
        const closedDays = document.getElementById('closed-days');
        if (closedDays) {
            categoryData.closedDays = closedDays.value;
        }
        
        // 주차안내
        const parkingInfo = document.getElementById('parking-info');
        if (parkingInfo) {
            categoryData.parkingInfo = parkingInfo.value;
        }
        
        // 오시는 길
        const directions = document.getElementById('directions');
        if (directions) {
            categoryData.directions = directions.value;
        }
        
        // 코스 정보 수집
        categoryData.courses = collectCourses();
    }
    
    return categoryData;
}

/**
 * 주대 정보 수집
 * @returns {Object} 주대 정보
 */
export function collectTablePrices() {
    const tablePrices = {};
    const items = document.querySelectorAll('#table-price-list .table-price-item');
    
    items.forEach(item => {
        const nameInput = item.querySelector('.table-price-name');
        const priceInput = item.querySelector('.table-price-value');
        
        if (nameInput && priceInput && nameInput.value && priceInput.value) {
            tablePrices[nameInput.value] = priceInput.value.replace(/[^0-9]/g, '');
        }
    });
    
    return tablePrices;
}

/**
 * 코스 정보 수집
 * @returns {Object} 코스 정보
 */
export function collectCourses() {
    const courses = {};
    const items = document.querySelectorAll('#course-list .course-item');
    
    items.forEach(item => {
        const nameInput = item.querySelector('.course-name');
        const priceInput = item.querySelector('.course-price');
        
        if (nameInput && priceInput && nameInput.value && priceInput.value) {
            courses[nameInput.value] = priceInput.value.replace(/[^0-9]/g, '');
        }
    });
    
    return courses;
}

/**
 * 주대 이벤트 설정
 */
export function setupTablePriceEvents() {
    const container = document.getElementById('table-price-list');
    if (!container) return;
    
    // 추가 버튼 이벤트 - 실제 HTML의 ID 사용
    const addButton = document.getElementById('btn-add-price');
    if (addButton) {
        addButton.addEventListener('click', () => {
            addTablePriceItem();  // 함수명 통일
        });
    }
    
    // 삭제 버튼 이벤트 (이벤트 위임)
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-price')) {
            e.target.closest('.table-price-item').remove();
        }
    });
}

/**
 * 주대 행 추가 - 함수명 변경
 */
function addTablePriceItem() {  // addTablePriceRow → addTablePriceItem으로 변경
    const container = document.getElementById('table-price-list');
    if (!container) return;
    
    const item = document.createElement('div');
    item.className = 'table-price-item';
    item.innerHTML = `
        <input type="text" class="table-price-name" placeholder="예: 1인 일반룸">
        <div class="price-input-wrapper">
            <input type="text" class="table-price-value" placeholder="예: 300,000">
            <span class="price-unit">원</span>
        </div>
        <button type="button" class="btn-remove-price">×</button>
    `;
    
    container.appendChild(item);
}

/**
 * 코스 이벤트 설정
 */
export function setupCourseEvents() {
    const container = document.getElementById('course-list');
    if (!container) return;
    
    // 추가 버튼 이벤트 - 실제 HTML의 ID 사용
    const addButton = document.getElementById('btn-add-course');
    if (addButton) {
        addButton.addEventListener('click', () => {
            addCourseItem();  // 함수명 통일
        });
    }
    
    // 삭제 버튼 이벤트 (이벤트 위임)
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-course')) {
            e.target.closest('.course-item').remove();
        }
    });
}

/**
 * 코스 행 추가 - 함수명 변경
 */
function addCourseItem() {  // addCourseRow → addCourseItem으로 변경
    const container = document.getElementById('course-list');
    if (!container) return;
    
    const item = document.createElement('div');
    item.className = 'course-item';
    item.innerHTML = `
        <input type="text" class="course-name" placeholder="예: 60분 코스">
        <div class="price-input-wrapper">
            <input type="text" class="course-price" placeholder="예: 100,000">
            <span class="price-unit">원</span>
        </div>
        <button type="button" class="btn-remove-course">×</button>
    `;
    
    container.appendChild(item);
}

/**
 * 주대 정보 채우기 (수정 시)
 * @param {Object} tablePrices - 주대 정보 객체
 */
export function fillTablePrices(tablePrices) {
    const container = document.getElementById('table-price-list');
    if (!container || !tablePrices) return;
    
    // 기존 항목 초기화
    container.innerHTML = '';
    
    Object.entries(tablePrices).forEach(([name, price], index) => {
        const item = document.createElement('div');
        item.className = 'table-price-item';
        item.innerHTML = `
            <input type="text" class="table-price-name" placeholder="예: 1인 일반룸" value="${name || ''}">
            <div class="price-input-wrapper">
                <input type="text" class="table-price-value" placeholder="예: 300,000" value="${price || ''}">
                <span class="price-unit">원</span>
            </div>
            <button type="button" class="btn-remove-price" style="${index === 0 ? 'display: none;' : ''}">×</button>
        `;
        container.appendChild(item);
    });
}

/**
 * 코스 정보 채우기 (수정 시)
 * @param {Object} courses - 코스 정보 객체
 */
export function fillCourses(courses) {
    const container = document.getElementById('course-list');
    if (!container || !courses) return;
    
    // 기존 항목 초기화
    container.innerHTML = '';
    
    Object.entries(courses).forEach(([name, price], index) => {
        const item = document.createElement('div');
        item.className = 'course-item';
        item.innerHTML = `
            <input type="text" class="course-name" placeholder="예: 60분 코스" value="${name || ''}">
            <div class="price-input-wrapper">
                <input type="text" class="course-price" placeholder="예: 100,000" value="${price || ''}">
                <span class="price-unit">원</span>
            </div>
            <button type="button" class="btn-remove-course" style="${index === 0 ? 'display: none;' : ''}">×</button>
        `;
        container.appendChild(item);
    });
}

/**
 * 이벤트 에디터 초기화
 */
export function initializeEventEditor() {
    const eventTextarea = document.getElementById('event-textarea');
    if (!eventTextarea) return;
    
    // 텍스트 영역 자동 높이 조절
    eventTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    console.log('이벤트 에디터 초기화 완료');
}

/**
 * 카테고리별 필드 채우기 (수정 시)
 * @param {string} categoryName - 카테고리명
 * @param {Object} categoryData - 카테고리 데이터
 */
export function fillCategoryFields(categoryName, categoryData) {
    if (!categoryData) return;
    
    if (categoryName === '유흥주점') {
        // 영업시간
        const businessHours = document.getElementById('business-hours');
        if (businessHours && categoryData.businessHours) {
            businessHours.value = categoryData.businessHours;
        }
        
        // 주대 정보
        if (categoryData.tablePrice) {
            fillTablePrices(categoryData.tablePrice);
        }
        
    } else if (categoryName === '건전마사지') {
        // 영업시간
        const massageBusinessHours = document.getElementById('massage-business-hours');
        if (massageBusinessHours && categoryData.businessHours) {
            massageBusinessHours.value = categoryData.businessHours;
        }
        
        // 휴무일
        const closedDays = document.getElementById('closed-days');
        if (closedDays && categoryData.closedDays) {
            closedDays.value = categoryData.closedDays;
        }
        
        // 주차안내
        const parkingInfo = document.getElementById('parking-info');
        if (parkingInfo && categoryData.parkingInfo) {
            parkingInfo.value = categoryData.parkingInfo;
        }
        
        // 오시는 길
        const directions = document.getElementById('directions');
        if (directions && categoryData.directions) {
            directions.value = categoryData.directions;
        }
        
        // 코스 정보
        if (categoryData.courses) {
            fillCourses(categoryData.courses);
        }
    }
    
    // 이벤트 정보 (텍스트)
    const eventTextarea = document.getElementById('event-textarea');
    if (eventTextarea && categoryData.eventInfo) {
        eventTextarea.value = categoryData.eventInfo;
    }
}