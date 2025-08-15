// /ad-posting/js/modules/category-fields.js

// 이벤트 에디터 초기화 - 텍스트만 입력 가능하도록 수정
export function initializeEventEditor(previewImages) {
    // Quill 에디터 대신 일반 textarea 사용
    const eventTextarea = document.getElementById('event-textarea');
    const eventInput = document.getElementById('event-info');
    
    if (eventTextarea && eventInput) {
        // textarea 내용 변경 시 hidden input 업데이트
        eventTextarea.addEventListener('input', function() {
            eventInput.value = eventTextarea.value;
        });
    }
    
    return null; // Quill 에디터 반환하지 않음
}

// 주대 추가/삭제 이벤트 설정
export function setupTablePriceEvents() {
    // 주대 추가 버튼 (유흥주점)
    const addPriceBtn = document.getElementById('btn-add-price');
    if (addPriceBtn) {
        addPriceBtn.addEventListener('click', function() {
            addTablePriceItem();
        });
    }
    
    // 코스 추가 버튼 (건전마사지)
    const addCourseBtn = document.getElementById('btn-add-course');
    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', function() {
            addCourseItem();
        });
    }
    
    // 삭제 버튼 이벤트 (이벤트 위임)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-remove-price')) {
            e.target.parentElement.remove();
            updateRemoveButtons('table-price');
        } else if (e.target.classList.contains('btn-remove-course')) {
            e.target.parentElement.remove();
            updateRemoveButtons('course');
        }
    });
}

// 주대 항목 추가
function addTablePriceItem() {
    const priceList = document.getElementById('table-price-list');
    if (!priceList) return;
    
    const newItem = document.createElement('div');
    newItem.className = 'table-price-item';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'table-price-name';
    nameInput.placeholder = '예: VIP룸';
    
    const priceWrapper = document.createElement('div');
    priceWrapper.className = 'price-input-wrapper';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'table-price-value';
    valueInput.placeholder = '예: 50만';
    
    const priceUnit = document.createElement('span');
    priceUnit.className = 'price-unit';
    priceUnit.textContent = '원';
    
    priceWrapper.appendChild(valueInput);
    priceWrapper.appendChild(priceUnit);
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-price';
    removeBtn.textContent = '×';
    
    newItem.appendChild(nameInput);
    newItem.appendChild(priceWrapper);
    newItem.appendChild(removeBtn);
    priceList.appendChild(newItem);
    
    updateRemoveButtons('table-price');
}

// 코스 항목 추가
function addCourseItem() {
    const courseList = document.getElementById('course-list');
    if (!courseList) return;
    
    const newItem = document.createElement('div');
    newItem.className = 'course-item';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'course-name';
    nameInput.placeholder = '예: 스페셜케어';
    
    const priceWrapper = document.createElement('div');
    priceWrapper.className = 'price-input-wrapper';
    
    const priceInput = document.createElement('input');
    priceInput.type = 'text';
    priceInput.className = 'course-price';
    priceInput.placeholder = '예: 15만';
    
    const priceUnit = document.createElement('span');
    priceUnit.className = 'price-unit';
    priceUnit.textContent = '원';
    
    priceWrapper.appendChild(priceInput);
    priceWrapper.appendChild(priceUnit);
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-course';
    removeBtn.textContent = '×';
    
    newItem.appendChild(nameInput);
    newItem.appendChild(priceWrapper);
    newItem.appendChild(removeBtn);
    courseList.appendChild(newItem);
    
    updateRemoveButtons('course');
}

// 삭제 버튼 표시/숨김 업데이트
function updateRemoveButtons(type) {
    const selector = type === 'table-price' ? '.table-price-item' : '.course-item';
    const btnClass = type === 'table-price' ? '.btn-remove-price' : '.btn-remove-course';
    
    const items = document.querySelectorAll(selector);
    items.forEach((item, index) => {
        const removeBtn = item.querySelector(btnClass);
        if (removeBtn) {
            removeBtn.style.display = items.length > 1 ? 'flex' : 'none';
        }
    });
}

// 카테고리별 필드 표시/숨김
export function toggleCategorySpecificFields(categoryName, eventQuill) {
    const karaokeFields = document.querySelectorAll('.karaoke-field:not(.massage-field)');
    const massageFields = document.querySelectorAll('.massage-field:not(.karaoke-field)');
    const commonFields = document.querySelectorAll('.karaoke-field.massage-field'); // 이벤트 필드
    
    // 유흥주점 카테고리
    if (categoryName === '유흥주점') {
        karaokeFields.forEach(field => field.style.display = 'block');
        massageFields.forEach(field => field.style.display = 'none');
        commonFields.forEach(field => field.style.display = 'block');
        resetMassageFields();
    } 
    // 건전마사지 카테고리
    else if (categoryName === '건전마사지') {
        massageFields.forEach(field => field.style.display = 'block');
        karaokeFields.forEach(field => field.style.display = 'none');
        commonFields.forEach(field => field.style.display = 'block');
        resetKaraokeFields();
    } 
    // 그 외 카테고리
    else {
        karaokeFields.forEach(field => field.style.display = 'none');
        massageFields.forEach(field => field.style.display = 'none');
        commonFields.forEach(field => field.style.display = 'none');
        resetKaraokeFields();
        resetMassageFields();
    }
}

// 유흥주점 필드 초기화
function resetKaraokeFields() {
    // 영업시간 초기화
    const businessHours = document.getElementById('business-hours');
    if (businessHours) businessHours.value = '';
    
    // 이벤트 텍스트 초기화
    const eventTextarea = document.getElementById('event-textarea');
    if (eventTextarea) eventTextarea.value = '';
    
    // 주대설정 초기화 - 첫 번째 항목만 남기고 나머지 제거
    const priceItems = document.querySelectorAll('.table-price-item');
    priceItems.forEach((item, index) => {
        if (index === 0) {
            // 첫 번째 항목의 값만 초기화
            item.querySelector('.table-price-name').value = '';
            item.querySelector('.table-price-value').value = '';
            const removeBtn = item.querySelector('.btn-remove-price');
            if (removeBtn) removeBtn.style.display = 'none';
        } else {
            // 나머지 항목들 제거
            item.remove();
        }
    });
}

// 건전마사지 필드 초기화  
function resetMassageFields() {
    // 각 필드 초기화
    const fields = ['massage-business-hours', 'closed-days', 'parking-info', 'directions'];
    fields.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
    
    // 코스설정 초기화 - 첫 번째 항목만 남기고 나머지 제거
    const courseItems = document.querySelectorAll('.course-item');
    courseItems.forEach((item, index) => {
        if (index === 0) {
            // 첫 번째 항목의 값만 초기화
            item.querySelector('.course-name').value = '';
            item.querySelector('.course-price').value = '';
            const removeBtn = item.querySelector('.btn-remove-course');
            if (removeBtn) removeBtn.style.display = 'none';
        } else {
            // 나머지 항목들 제거
            item.remove();
        }
    });
}

// 주대 데이터 수집
export function collectTablePrices() {
    const priceItems = document.querySelectorAll('.table-price-item');
    const tablePrices = {};
    
    priceItems.forEach(item => {
        const name = item.querySelector('.table-price-name').value;
        const value = item.querySelector('.table-price-value').value;
        if (name && value) {
            tablePrices[name] = value;
        }
    });
    
    return tablePrices;
}

// 코스 데이터 수집 (건전마사지용)
export function collectCourses() {
    const courseItems = document.querySelectorAll('.course-item');
    const courses = {};
    
    courseItems.forEach(item => {
        const name = item.querySelector('.course-name').value;
        const price = item.querySelector('.course-price').value;
        if (name && price) {
            courses[name] = price;
        }
    });
    
    return courses;
}

// 카테고리별 추가 데이터 수집
export function collectCategoryData(categoryName, eventQuill) {
    const data = {};
    
    if (categoryName === '유흥주점') {
        // 영업시간
        const businessHours = document.getElementById('business-hours');
        data.businessHours = businessHours ? businessHours.value : '';
        
        // 주대설정
        data.tablePrice = collectTablePrices();
        
        // 이벤트 내용 - textarea에서 가져오기
        const eventTextarea = document.getElementById('event-textarea');
        data.eventInfo = eventTextarea ? eventTextarea.value : '';
    } 
    else if (categoryName === '건전마사지') {
        // 영업시간
        const massageBusinessHours = document.getElementById('massage-business-hours');
        data.businessHours = massageBusinessHours ? massageBusinessHours.value : '';
        
        // 휴무일
        const closedDays = document.getElementById('closed-days');
        data.closedDays = closedDays ? closedDays.value : '';
        
        // 주차안내
        const parkingInfo = document.getElementById('parking-info');
        data.parkingInfo = parkingInfo ? parkingInfo.value : '';
        
        // 오시는 길
        const directions = document.getElementById('directions');
        data.directions = directions ? directions.value : '';
        
        // 코스설정
        data.courses = collectCourses();
        
        // 이벤트 내용 - textarea에서 가져오기
        const eventTextarea = document.getElementById('event-textarea');
        data.eventInfo = eventTextarea ? eventTextarea.value : '';
    }
    
    return data;
}