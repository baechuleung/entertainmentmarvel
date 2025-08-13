// admin/ads/js/ads-add-modal.js - 광고 추가 모달 (ad-posting 완벽 복제)
import { rtdb } from '/js/firebase-config.js';
import { ref, push, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { uploadBusinessAdImages, uploadSingleImage } from '/js/imagekit-upload.js';

// 전역 변수
let regionData = {};
let cityData = {};
let businessTypes = {};
let contentQuill = null;
let eventQuill = null;
let previewImages = new Map();
let thumbnailFile = null;

// 지역 데이터 로드
async function loadLocationData() {
    try {
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        const region2Response = await fetch('/data/region2.json');
        cityData = await region2Response.json();
        
        regionData = {};
        region1Data.regions.forEach(region => {
            regionData[region.name] = region.code;
        });
        
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 카테고리 데이터 로드
async function loadCategoryData() {
    try {
        const response = await fetch('/data/category.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('카테고리 데이터 로드 실패:', error);
        return null;
    }
}

// 업종 데이터 로드
async function loadBusinessTypes(category) {
    try {
        let fileName = '';
        if (category === '유흥주점') {
            fileName = '/data/karaoke.json';
        } else if (category === '건전마사지') {
            fileName = '/data/gunma.json';
        } else {
            return null;
        }
        
        const response = await fetch(fileName);
        const data = await response.json();
        
        businessTypes = {};
        data.businessTypes.forEach(type => {
            businessTypes[type.name] = type.code;
        });
        
        // 전역으로 사용
        window.businessTypes = businessTypes;
        
        return businessTypes;
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
        return null;
    }
}

// 초기 로드
loadLocationData();

// 추가 모달 HTML 생성 (ad-posting.html 구조 완벽 복제)
function createAddModalHTML() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'ad-add-modal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <h2>새 광고 등록</h2>
                <button class="modal-close" id="add-modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="ad-add-form">
                    <div style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
                        
                        <!-- 1. 기본정보 섹션 -->
                        <div class="form-section">
                            <h2 class="section-title">1. 기본정보 입력</h2>
                            
                            <!-- 작성자 -->
                            <div class="form-group">
                                <label for="add-author">작성자</label>
                                <input type="text" id="add-author" name="author" placeholder="작성자명을 입력하세요">
                            </div>
                            
                            <!-- 카테고리 선택 -->
                            <div class="form-group">
                                <label>카테고리 *</label>
                                <div class="category-buttons" id="add-category-buttons">
                                    <!-- 카테고리 버튼들이 동적으로 추가됩니다 -->
                                </div>
                                <input type="hidden" id="add-category" name="category" required>
                            </div>
                            
                            <!-- 업종 선택 (커스텀 셀렉트) -->
                            <div class="form-group">
                                <label for="add-business-type">업종 *</label>
                                <div class="custom-select" id="add-business-type-wrapper">
                                    <div class="select-selected" data-value="">먼저 카테고리를 선택하세요</div>
                                    <div class="select-items select-hide" id="add-business-type-options"></div>
                                </div>
                                <input type="hidden" id="add-business-type" name="business-type" required>
                            </div>
                            
                            <!-- 업소명 -->
                            <div class="form-group">
                                <label for="add-business-name">업소명 *</label>
                                <input type="text" id="add-business-name" name="business-name" 
                                    placeholder="예) 도파민 제니상무 (15자 이내로 작성해주세요)" 
                                    maxlength="15" required>
                            </div>
                            
                            <!-- 지역과 도시 선택 (한 줄에 표시) -->
                            <div class="form-group-row">
                                <div class="form-group">
                                    <label for="add-region">지역 *</label>
                                    <div class="custom-select" id="add-region-wrapper">
                                        <div class="select-selected" data-value="">지역을 선택하세요</div>
                                        <div class="select-items select-hide" id="add-region-options"></div>
                                    </div>
                                    <input type="hidden" id="add-region" name="region" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="add-city">도시 *</label>
                                    <div class="custom-select" id="add-city-wrapper">
                                        <div class="select-selected" data-value="">먼저 지역을 선택하세요</div>
                                        <div class="select-items select-hide" id="add-city-options"></div>
                                    </div>
                                    <input type="hidden" id="add-city" name="city" required>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 2. 연락처 정보 섹션 -->
                        <div class="form-section">
                            <h2 class="section-title">2. 연락처 정보 입력</h2>
                            
                            <div class="form-group">
                                <label for="add-phone">전화번호 *</label>
                                <input type="tel" id="add-phone" name="phone" placeholder="010-0000-0000" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="add-kakao">카카오톡 ID</label>
                                <input type="text" id="add-kakao" name="kakao" placeholder="선택사항">
                            </div>
                            
                            <div class="form-group">
                                <label for="add-telegram">텔레그램 ID</label>
                                <input type="text" id="add-telegram" name="telegram" placeholder="선택사항">
                            </div>
                        </div>
                        
                        <!-- 3. 광고 정보 입력 섹션 -->
                        <div class="form-section">
                            <h2 class="section-title">3. 광고 정보 입력</h2>
                            
                            <!-- 유흥주점 카테고리 전용 필드 -->
                            <div class="form-group karaoke-field" style="display: none;">
                                <label for="add-business-hours">영업시간</label>
                                <input type="text" id="add-business-hours" name="business-hours" 
                                    placeholder="예: 오후 7시 ~ 새벽 5시">
                            </div>
                            
                            <div class="form-group karaoke-field" style="display: none;">
                                <label>주대설정</label>
                                <div id="add-table-price-list">
                                    <div class="table-price-item">
                                        <input type="text" class="table-price-name" placeholder="예: 1인 일반룸">
                                        <div class="price-input-wrapper">
                                            <input type="text" class="table-price-value" placeholder="예: 300,000">
                                            <span class="price-unit">원</span>
                                        </div>
                                        <button type="button" class="btn-remove-price" style="display: none;">×</button>
                                    </div>
                                </div>
                                <button type="button" id="add-btn-add-price" class="btn-add-price">+ 주대 추가</button>
                            </div>
                            
                            <!-- 건전마사지 카테고리 전용 필드 -->
                            <div class="form-group massage-field" style="display: none;">
                                <label for="add-massage-business-hours">영업시간</label>
                                <input type="text" id="add-massage-business-hours" name="massage-business-hours" 
                                    placeholder="예: 오전 10시 ~ 오후 10시">
                            </div>
                            
                            <div class="form-group massage-field" style="display: none;">
                                <label for="add-closed-days">휴무일</label>
                                <input type="text" id="add-closed-days" name="closed-days" 
                                    placeholder="예: 매주 일요일">
                            </div>
                            
                            <div class="form-group massage-field" style="display: none;">
                                <label for="add-parking-info">주차안내</label>
                                <input type="text" id="add-parking-info" name="parking-info" 
                                    placeholder="예: 건물 지하 1~2층 무료주차 가능">
                            </div>
                            
                            <div class="form-group massage-field" style="display: none;">
                                <label for="add-directions">오시는 길</label>
                                <input type="text" id="add-directions" name="directions" 
                                    placeholder="예: 강남역 3번 출구에서 도보 5분">
                            </div>
                            
                            <div class="form-group massage-field" style="display: none;">
                                <label>코스설정</label>
                                <div id="add-course-list">
                                    <div class="course-item">
                                        <input type="text" class="course-name" placeholder="예: 전신관리">
                                        <div class="price-input-wrapper">
                                            <input type="text" class="course-price" placeholder="예: 100,000">
                                            <span class="price-unit">원</span>
                                        </div>
                                        <button type="button" class="btn-remove-course" style="display: none;">×</button>
                                    </div>
                                </div>
                                <button type="button" id="add-btn-add-course" class="btn-add-course">+ 코스 추가</button>
                            </div>
                            
                            <!-- 대표이미지 업로드 -->
                            <div class="form-group">
                                <label>대표이미지</label>
                                <div class="thumbnail-upload-area">
                                    <button type="button" class="thumbnail-upload-btn" id="add-thumbnail-upload-btn">
                                        <span class="upload-icon">📷</span>
                                        <span class="upload-text">대표이미지 업로드</span>
                                    </button>
                                    <div class="thumbnail-preview" id="add-thumbnail-preview" style="display: none;">
                                        <img id="add-thumbnail-image" src="" alt="대표이미지 미리보기">
                                        <button type="button" class="delete-thumbnail" id="add-delete-thumbnail">×</button>
                                    </div>
                                    <input type="file" id="add-thumbnail-input" accept="image/*" style="display: none;">
                                </div>
                            </div>
                            
                            <!-- 상세 내용 에디터 -->
                            <div class="form-group">
                                <label for="content">상세 내용 *</label>
                                <div id="add-editor-container">
                                    <div id="add-editor"></div>
                                </div>
                                <input type="hidden" id="add-content" name="content" required>
                            </div>
                            
                            <!-- 이벤트 (카테고리 전용) -->
                            <div class="form-group karaoke-field massage-field" style="display: none;">
                                <label for="event-info">이벤트</label>
                                <div id="add-event-editor-container">
                                    <div id="add-event-editor"></div>
                                </div>
                                <input type="hidden" id="add-event-info" name="event-info">
                            </div>
                        </div>
                        
                        <!-- 광고 설정 -->
                        <div class="form-section">
                            <h2 class="section-title">광고 설정</h2>
                            
                            <div class="form-group">
                                <label for="add-status">상태</label>
                                <select id="add-status">
                                    <option value="active">활성</option>
                                    <option value="inactive">비활성</option>
                                    <option value="pending">승인대기</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="add-end-date">마감일</label>
                                <input type="date" id="add-end-date">
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="add-payment-status">
                                    입금 완료
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="btn-add-cancel">취소</button>
                        <button type="submit" class="btn btn-primary">광고 등록</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 스타일 추가
    addModalStyles();
}

// 모달 스타일 추가
function addModalStyles() {
    if (document.getElementById('add-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'add-modal-styles';
    style.textContent = `
        /* 섹션 스타일 */
        .form-section {
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        
        /* 카테고리 버튼 */
        .category-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .category-btn {
            flex: 1;
            padding: 12px;
            background-color: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 6px;
            color: #495057;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .category-btn:hover {
            background-color: #e9ecef;
            border-color: #adb5bd;
        }
        
        .category-btn.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: transparent;
        }
        
        /* 커스텀 셀렉트 */
        .custom-select {
            position: relative;
            width: 100%;
        }
        
        .select-selected {
            background-color: white;
            padding: 10px 14px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            cursor: pointer;
            user-select: none;
            position: relative;
            padding-right: 35px;
        }
        
        .select-selected::after {
            content: '';
            position: absolute;
            top: 50%;
            right: 12px;
            width: 0;
            height: 0;
            margin-top: -3px;
            border: 6px solid transparent;
            border-color: #999 transparent transparent transparent;
        }
        
        .select-selected.select-arrow-active::after {
            border-color: transparent transparent #999 transparent;
            margin-top: -9px;
        }
        
        .select-selected.has-value {
            color: #212529;
        }
        
        .select-items {
            position: absolute;
            background-color: white;
            top: 100%;
            left: 0;
            right: 0;
            z-index: 99;
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #ced4da;
            border-top: none;
            border-radius: 0 0 6px 6px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .select-items div {
            padding: 10px 14px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .select-items div:hover {
            background-color: #f8f9fa;
        }
        
        .select-hide {
            display: none;
        }
        
        /* 한 줄에 표시 */
        .form-group-row {
            display: flex;
            gap: 15px;
        }
        
        .form-group-row .form-group {
            flex: 1;
        }
        
        /* 주대/코스 설정 */
        .table-price-item,
        .course-item {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .table-price-name,
        .course-name {
            flex: 1.5;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
        }
        
        .price-input-wrapper {
            flex: 1;
            display: flex;
            align-items: center;
            position: relative;
        }
        
        .table-price-value,
        .course-price {
            width: 100%;
            padding: 8px 40px 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
        }
        
        .price-unit {
            position: absolute;
            right: 12px;
            color: #6c757d;
            pointer-events: none;
        }
        
        .btn-remove-price,
        .btn-remove-course {
            width: 32px;
            height: 32px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .btn-add-price,
        .btn-add-course {
            margin-top: 10px;
            padding: 8px 16px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        /* Quill 에디터 */
        #add-editor,
        #add-event-editor {
            background-color: white;
            min-height: 200px;
        }
        
        #add-event-editor {
            min-height: 150px;
        }
    `;
    document.head.appendChild(style);
}

// 카테고리 버튼 생성
async function createCategoryButtons() {
    const categories = await loadCategoryData();
    if (!categories) return;
    
    const container = document.getElementById('add-category-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    categories.categories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'category-btn';
        button.textContent = category.name;
        button.dataset.category = category.name;
        
        button.addEventListener('click', async function() {
            // 모든 버튼의 active 클래스 제거
            document.querySelectorAll('#add-category-buttons .category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 클릭된 버튼에 active 클래스 추가
            this.classList.add('active');
            
            // hidden input에 값 설정
            document.getElementById('add-category').value = category.name;
            
            // 카테고리별 필드 표시/숨김
            toggleCategoryFields(category.name);
            
            // 업종 로드
            await loadBusinessTypesForCategory(category.name);
        });
        
        container.appendChild(button);
    });
}

// 카테고리별 필드 표시/숨김
function toggleCategoryFields(category) {
    // 모든 카테고리 필드 숨기기
    document.querySelectorAll('.karaoke-field').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll('.massage-field').forEach(el => {
        el.style.display = 'none';
    });
    
    // 선택된 카테고리 필드만 표시
    if (category === '유흥주점') {
        document.querySelectorAll('.karaoke-field').forEach(el => {
            el.style.display = 'block';
        });
    } else if (category === '건전마사지') {
        document.querySelectorAll('.massage-field').forEach(el => {
            el.style.display = 'block';
        });
    }
    
    // 이벤트 에디터 초기화
    if (category === '유흥주점' || category === '건전마사지') {
        setTimeout(() => initEventEditor(), 100);
    }
}

// 업종 로드 및 옵션 생성
async function loadBusinessTypesForCategory(category) {
    const types = await loadBusinessTypes(category);
    if (!types) return;
    
    const optionsContainer = document.getElementById('add-business-type-options');
    const selected = document.querySelector('#add-business-type-wrapper .select-selected');
    
    if (!optionsContainer || !selected) return;
    
    // 옵션 초기화
    optionsContainer.innerHTML = '';
    selected.textContent = '업종을 선택하세요';
    selected.setAttribute('data-value', '');
    
    // 업종 옵션 추가
    Object.keys(types).forEach(typeName => {
        const option = document.createElement('div');
        option.setAttribute('data-value', typeName);
        option.textContent = typeName;
        option.addEventListener('click', function() {
            selectOption(this, 'business-type');
        });
        optionsContainer.appendChild(option);
    });
}

// 지역 옵션 설정
function setupRegionOptions() {
    const optionsContainer = document.getElementById('add-region-options');
    if (!optionsContainer) return;
    
    optionsContainer.innerHTML = '';
    Object.keys(regionData).forEach(regionName => {
        const option = document.createElement('div');
        option.setAttribute('data-value', regionName);
        option.textContent = regionName;
        option.addEventListener('click', function() {
            selectOption(this, 'region');
            updateCityOptions(regionName);
        });
        optionsContainer.appendChild(option);
    });
}

// 도시 옵션 업데이트
function updateCityOptions(regionName) {
    const optionsContainer = document.getElementById('add-city-options');
    const selected = document.querySelector('#add-city-wrapper .select-selected');
    
    if (!optionsContainer || !selected) return;
    
    // 옵션 초기화
    optionsContainer.innerHTML = '';
    selected.textContent = '도시를 선택하세요';
    selected.setAttribute('data-value', '');
    document.getElementById('add-city').value = '';
    
    if (!regionName) return;
    
    const regionCode = regionData[regionName];
    if (regionCode && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const option = document.createElement('div');
            const cityName = typeof city === 'string' ? city : city.name;
            option.setAttribute('data-value', cityName);
            option.textContent = cityName;
            option.addEventListener('click', function() {
                selectOption(this, 'city');
            });
            optionsContainer.appendChild(option);
        });
    }
}

// 커스텀 셀렉트 옵션 선택
function selectOption(element, type) {
    const selectWrapper = element.closest('.custom-select');
    const selected = selectWrapper.querySelector('.select-selected');
    const hiddenInput = document.getElementById(`add-${type}`);
    
    // 선택된 값 설정
    const value = element.getAttribute('data-value');
    selected.textContent = element.textContent;
    selected.setAttribute('data-value', value);
    selected.classList.add('has-value');
    if (hiddenInput) hiddenInput.value = value;
    
    // 드롭다운 닫기
    selectWrapper.querySelector('.select-items').classList.add('select-hide');
    selected.classList.remove('select-arrow-active');
}

// 커스텀 셀렉트 이벤트 설정
function setupCustomSelects() {
    document.querySelectorAll('.custom-select .select-selected').forEach(selected => {
        selected.addEventListener('click', function() {
            const items = this.nextElementSibling;
            items.classList.toggle('select-hide');
            this.classList.toggle('select-arrow-active');
            
            // 다른 셀렉트 닫기
            document.querySelectorAll('.custom-select .select-selected').forEach(other => {
                if (other !== this) {
                    other.classList.remove('select-arrow-active');
                    other.nextElementSibling.classList.add('select-hide');
                }
            });
        });
    });
    
    // 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.select-items').forEach(items => {
                items.classList.add('select-hide');
            });
            document.querySelectorAll('.select-selected').forEach(selected => {
                selected.classList.remove('select-arrow-active');
            });
        }
    });
}

// Quill 에디터 초기화
function initContentEditor() {
    if (!window.Quill) return;
    
    contentQuill = new Quill('#add-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': [] }],
                ['link', 'image']
            ]
        },
        placeholder: '광고 상세 내용을 입력하세요...'
    });
    
    // 이미지 핸들러
    const toolbar = contentQuill.getModule('toolbar');
    toolbar.addHandler('image', () => selectLocalImage(contentQuill));
    
    // hidden input 업데이트
    contentQuill.on('text-change', function() {
        document.getElementById('add-content').value = contentQuill.root.innerHTML;
    });
}

// 이벤트 에디터 초기화
function initEventEditor() {
    if (!window.Quill || eventQuill) return;
    
    const container = document.getElementById('add-event-editor');
    if (!container) return;
    
    eventQuill = new Quill('#add-event-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': [] }],
                ['link', 'image']
            ]
        },
        placeholder: '이벤트 내용을 입력하세요...'
    });
    
    // 이미지 핸들러
    const toolbar = eventQuill.getModule('toolbar');
    toolbar.addHandler('image', () => selectLocalImage(eventQuill));
    
    // hidden input 업데이트
    eventQuill.on('text-change', function() {
        document.getElementById('add-event-info').value = eventQuill.root.innerHTML;
    });
}

// 로컬 이미지 선택
function selectLocalImage(quill) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.setAttribute('multiple', 'multiple');
    input.click();
    
    input.addEventListener('change', async function() {
        const files = Array.from(input.files);
        
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                const range = quill.getSelection() || { index: 0 };
                quill.insertEmbed(range.index, 'image', base64);
                previewImages.set(base64, file);
            };
            reader.readAsDataURL(file);
        }
    });
}

// 썸네일 업로드 설정
function setupThumbnailUpload() {
    const input = document.getElementById('add-thumbnail-input');
    const uploadBtn = document.getElementById('add-thumbnail-upload-btn');
    const preview = document.getElementById('add-thumbnail-preview');
    const image = document.getElementById('add-thumbnail-image');
    const deleteBtn = document.getElementById('add-delete-thumbnail');
    
    uploadBtn?.addEventListener('click', () => input.click());
    
    input?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            thumbnailFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                image.src = e.target.result;
                preview.style.display = 'block';
                uploadBtn.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });
    
    deleteBtn?.addEventListener('click', function() {
        thumbnailFile = null;
        input.value = '';
        image.src = '';
        preview.style.display = 'none';
        uploadBtn.style.display = 'block';
    });
}

// 주대 추가
function addTablePriceItem() {
    const list = document.getElementById('add-table-price-list');
    const items = list.querySelectorAll('.table-price-item');
    
    // 첫 번째 아이템의 삭제 버튼 표시
    if (items.length === 1) {
        items[0].querySelector('.btn-remove-price').style.display = 'flex';
    }
    
    const item = document.createElement('div');
    item.className = 'table-price-item';
    item.innerHTML = `
        <input type="text" class="table-price-name" placeholder="예: VIP룸">
        <div class="price-input-wrapper">
            <input type="text" class="table-price-value" placeholder="예: 500,000">
            <span class="price-unit">원</span>
        </div>
        <button type="button" class="btn-remove-price">×</button>
    `;
    
    item.querySelector('.btn-remove-price').addEventListener('click', function() {
        item.remove();
        const remainingItems = list.querySelectorAll('.table-price-item');
        if (remainingItems.length === 1) {
            remainingItems[0].querySelector('.btn-remove-price').style.display = 'none';
        }
    });
    
    list.appendChild(item);
}

// 코스 추가
function addCourseItem() {
    const list = document.getElementById('add-course-list');
    const items = list.querySelectorAll('.course-item');
    
    // 첫 번째 아이템의 삭제 버튼 표시
    if (items.length === 1) {
        items[0].querySelector('.btn-remove-course').style.display = 'flex';
    }
    
    const item = document.createElement('div');
    item.className = 'course-item';
    item.innerHTML = `
        <input type="text" class="course-name" placeholder="예: 스페셜케어">
        <div class="price-input-wrapper">
            <input type="text" class="course-price" placeholder="예: 150,000">
            <span class="price-unit">원</span>
        </div>
        <button type="button" class="btn-remove-course">×</button>
    `;
    
    item.querySelector('.btn-remove-course').addEventListener('click', function() {
        item.remove();
        const remainingItems = list.querySelectorAll('.course-item');
        if (remainingItems.length === 1) {
            remainingItems[0].querySelector('.btn-remove-course').style.display = 'none';
        }
    });
    
    list.appendChild(item);
}

// 모달 열기
export async function openAddModal() {
    // 모달이 없으면 생성
    if (!document.getElementById('ad-add-modal')) {
        createAddModalHTML();
    }
    
    // 폼 초기화
    const form = document.getElementById('ad-add-form');
    if (form) form.reset();
    
    // 카테고리 버튼 생성
    await createCategoryButtons();
    
    // 지역 옵션 설정
    setupRegionOptions();
    
    // 커스텀 셀렉트 설정
    setupCustomSelects();
    
    // 에디터 초기화
    setTimeout(() => {
        initContentEditor();
    }, 100);
    
    // 썸네일 업로드 설정
    setupThumbnailUpload();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 모달 표시
    document.getElementById('ad-add-modal').classList.add('show');
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 주대 추가
    document.getElementById('add-btn-add-price')?.addEventListener('click', addTablePriceItem);
    
    // 코스 추가
    document.getElementById('add-btn-add-course')?.addEventListener('click', addCourseItem);
    
    // 폼 제출
    document.getElementById('ad-add-form')?.addEventListener('submit', handleSubmit);
    
    // 취소 버튼
    document.getElementById('btn-add-cancel')?.addEventListener('click', closeModal);
    
    // 모달 닫기 버튼
    document.getElementById('add-modal-close')?.addEventListener('click', closeModal);
}

// 에디터 이미지 처리
async function processEditorImages(quill) {
    const uploadedImages = [];
    const imgElements = quill.root.querySelectorAll('img');
    
    for (const img of imgElements) {
        const src = img.src;
        if (src.startsWith('data:')) {
            const file = previewImages.get(src);
            if (file) {
                const uploadedUrl = await uploadSingleImage(file, '/entmarvel/admin', 'admin');
                if (uploadedUrl) {
                    uploadedImages.push(uploadedUrl);
                    img.src = uploadedUrl;
                }
            }
        } else if (src.includes('ik.imagekit.io')) {
            uploadedImages.push(src);
        }
    }
    
    return uploadedImages;
}

// 주대 데이터 수집
function collectTablePrices() {
    const items = document.querySelectorAll('#add-table-price-list .table-price-item');
    const prices = {};
    
    items.forEach(item => {
        const name = item.querySelector('.table-price-name').value;
        const value = item.querySelector('.table-price-value').value;
        if (name && value) {
            prices[name] = value;
        }
    });
    
    return prices;
}

// 코스 데이터 수집
function collectCourses() {
    const items = document.querySelectorAll('#add-course-list .course-item');
    const courses = {};
    
    items.forEach(item => {
        const name = item.querySelector('.course-name').value;
        const price = item.querySelector('.course-price').value;
        if (name && price) {
            courses[name] = price;
        }
    });
    
    return courses;
}

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';
    
    try {
        // 에디터 내용 가져오기
        const editorContent = contentQuill.root.innerHTML;
        
        // 에디터 이미지 업로드
        const uploadedImages = await processEditorImages(contentQuill);
        
        // 썸네일 업로드
        let thumbnailUrl = null;
        if (thumbnailFile) {
            thumbnailUrl = await uploadSingleImage(thumbnailFile, '/entmarvel/admin/thumbnails', 'admin');
        }
        
        // 업종 코드 가져오기
        const selectedBusinessType = document.getElementById('add-business-type').value;
        const businessTypeCode = window.businessTypes && window.businessTypes[selectedBusinessType] 
            ? window.businessTypes[selectedBusinessType] : null;
        
        // 기본 광고 데이터
        const adData = {
            author: document.getElementById('add-author').value,
            authorId: ['admin'],
            category: document.getElementById('add-category').value,
            businessType: selectedBusinessType,
            businessTypeCode: businessTypeCode,
            businessName: document.getElementById('add-business-name').value,
            region: document.getElementById('add-region').value,
            city: document.getElementById('add-city').value,
            content: editorContent,
            phone: document.getElementById('add-phone').value,
            kakao: document.getElementById('add-kakao').value || '',
            telegram: document.getElementById('add-telegram').value || '',
            thumbnail: thumbnailUrl || (businessTypeCode ? `/img/business-type/${businessTypeCode}.png` : uploadedImages[0] || null),
            images: uploadedImages,
            views: 0,
            inquiries: 0,
            bookmarks: [],
            reviews: {},
            status: document.getElementById('add-status').value,
            endDate: document.getElementById('add-end-date').value || null,
            paymentStatus: document.getElementById('add-payment-status').checked,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        // 카테고리별 추가 데이터
        const category = adData.category;
        if (category === '유흥주점') {
            adData.businessHours = document.getElementById('add-business-hours')?.value || '';
            adData.tablePrice = collectTablePrices();
            adData.eventInfo = eventQuill ? eventQuill.root.innerHTML : '';
        } else if (category === '건전마사지') {
            adData.businessHours = document.getElementById('add-massage-business-hours')?.value || '';
            adData.closedDays = document.getElementById('add-closed-days')?.value || '';
            adData.parkingInfo = document.getElementById('add-parking-info')?.value || '';
            adData.directions = document.getElementById('add-directions')?.value || '';
            adData.courses = collectCourses();
            adData.eventInfo = eventQuill ? eventQuill.root.innerHTML : '';
        }
        
        // Firebase에 저장
        const newAdRef = push(ref(rtdb, 'advertisements'));
        await set(newAdRef, adData);
        
        alert('광고가 성공적으로 등록되었습니다.');
        closeModal();
        
        // 목록 새로고침
        if (window.loadAds) {
            window.loadAds();
        }
        
    } catch (error) {
        console.error('광고 등록 실패:', error);
        alert('광고 등록에 실패했습니다.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '광고 등록';
    }
}

// 모달 닫기
function closeModal() {
    document.getElementById('ad-add-modal')?.classList.remove('show');
    
    // 에디터 정리
    contentQuill = null;
    eventQuill = null;
    previewImages.clear();
    thumbnailFile = null;
}