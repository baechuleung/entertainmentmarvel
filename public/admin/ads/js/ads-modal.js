// admin/ads/js/ads-modal.js
import { rtdb } from '/js/firebase-config.js';
import { ref, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { 
    initializeEditors, 
    setEditorContent, 
    getEditorContent, 
    processEditorImages,
    clearEditors,
    applyEditorStyles
} from './ads-editor.js';
import { 
    createThumbnailUploader, 
    showExistingThumbnail, 
    uploadThumbnail,
    deleteThumbnailFromImageKit,
    addThumbnailStyles
} from './ads-thumbnail.js';

// 모달 관련 전역 변수
let currentEditingAd = null;
let regionData = {};
let cityData = {};

// 지역 데이터 로드
async function loadLocationData() {
    try {
        // region1.json 로드 (지역 목록)
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        // region2.json 로드 (도시 목록)
        const region2Response = await fetch('/data/region2.json');
        cityData = await region2Response.json();
        
        // 지역 데이터 매핑
        regionData = {};
        region1Data.regions.forEach(region => {
            regionData[region.name] = region.code;
        });
        
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 초기 로드
loadLocationData().then(() => {
    // 스타일 적용
    applyEditorStyles();
    addThumbnailStyles();
});

// 모달 HTML 생성
function updateModalHTML(ad) {
    const modalBody = document.querySelector('#ad-detail-modal .modal-body');
    if (!modalBody) return;
    
    let categorySpecificFields = '';
    
    // 카테고리별 추가 필드
    if (ad.category === '유흥주점') {
        categorySpecificFields = `
            <div class="form-group">
                <label for="ad-business-hours">영업시간</label>
                <input type="text" id="ad-business-hours" placeholder="예: PM 6:00 ~ AM 5:00">
            </div>
            
            <div class="form-group">
                <label>주대설정</label>
                <div id="table-price-container"></div>
            </div>
            
            <div class="form-group">
                <label for="ad-event-editor">이벤트 정보</label>
                <div id="ad-event-editor"></div>
            </div>
        `;
    } else if (ad.category === '건전마사지') {
        categorySpecificFields = `
            <div class="form-group">
                <label for="ad-business-hours">영업시간</label>
                <input type="text" id="ad-business-hours" placeholder="예: AM 10:00 ~ PM 10:00">
            </div>
            
            <div class="form-group">
                <label for="ad-closed-days">휴무일</label>
                <input type="text" id="ad-closed-days" placeholder="예: 연중무휴">
            </div>
            
            <div class="form-group">
                <label for="ad-parking-info">주차안내</label>
                <input type="text" id="ad-parking-info" placeholder="예: 건물 내 주차장 이용 가능">
            </div>
            
            <div class="form-group">
                <label for="ad-directions">오시는 길</label>
                <textarea id="ad-directions" rows="3" placeholder="찾아오시는 방법을 입력하세요"></textarea>
            </div>
            
            <div class="form-group">
                <label>코스설정</label>
                <div id="course-container"></div>
            </div>
            
            <div class="form-group">
                <label for="ad-event-info">이벤트 정보</label>
                <textarea id="ad-event-info" rows="4" placeholder="이벤트 내용을 입력하세요"></textarea>
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <form id="ad-detail-form">
            <input type="hidden" id="ad-id">
            
            <div style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
                <!-- 기본 정보 -->
                <h3 style="margin-top: 0; margin-bottom: 15px; color: #2c3e50;">기본 정보</h3>
                
                <div class="form-group">
                    <label for="ad-author">작성자</label>
                    <input type="text" id="ad-author" required>
                </div>
                
                <div class="form-group">
                    <label for="ad-category">카테고리</label>
                    <select id="ad-category" required>
                        <option value="">선택하세요</option>
                        <option value="유흥주점">유흥주점</option>
                        <option value="건전마사지">건전마사지</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="ad-business-type">업종</label>
                    <input type="text" id="ad-business-type" required>
                </div>
                
                <div class="form-group">
                    <label for="ad-business-name">업소명</label>
                    <input type="text" id="ad-business-name" maxlength="15" required>
                </div>
                
                <!-- 지역 정보 -->
                <h3 style="margin-top: 20px; margin-bottom: 15px; color: #2c3e50;">지역 정보</h3>
                
                <div class="form-group">
                    <label for="ad-region">지역</label>
                    <select id="ad-region" required>
                        <option value="">선택하세요</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="ad-city">도시</label>
                    <select id="ad-city" required>
                        <option value="">먼저 지역을 선택하세요</option>
                    </select>
                </div>
                
                <!-- 연락처 정보 -->
                <h3 style="margin-top: 20px; margin-bottom: 15px; color: #2c3e50;">연락처 정보</h3>
                
                <div class="form-group">
                    <label for="ad-phone">전화번호</label>
                    <input type="tel" id="ad-phone" placeholder="010-0000-0000">
                </div>
                
                <div class="form-group">
                    <label for="ad-kakao">카카오톡 ID</label>
                    <input type="text" id="ad-kakao">
                </div>
                
                <div class="form-group">
                    <label for="ad-telegram">텔레그램 ID</label>
                    <input type="text" id="ad-telegram">
                </div>
                
                <!-- 카테고리별 추가 필드 -->
                ${categorySpecificFields}
                
                <!-- 광고 내용 -->
                <h3 style="margin-top: 20px; margin-bottom: 15px; color: #2c3e50;">광고 내용</h3>
                
                <div class="form-group">
                    <label for="ad-content-editor">상세 내용</label>
                    <div id="ad-content-editor"></div>
                </div>
                
                <div class="form-group">
                    <label for="ad-thumbnail">썸네일</label>
                    <div id="thumbnail-container"></div>
                </div>
                
                <!-- 통계 및 상태 -->
                <h3 style="margin-top: 20px; margin-bottom: 15px; color: #2c3e50;">통계 및 상태</h3>
                
                <div class="form-group">
                    <label for="ad-views">조회수</label>
                    <input type="number" id="ad-views" min="0">
                </div>
                
                <div class="form-group">
                    <label for="ad-inquiries">콜수</label>
                    <input type="number" id="ad-inquiries" min="0">
                </div>
                
                <div class="form-group">
                    <label for="ad-status">상태</label>
                    <select id="ad-status" required>
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                        <option value="pending">승인대기</option>
                        <option value="rejected">거절됨</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="ad-end-date">마감일</label>
                    <input type="date" id="ad-end-date">
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="ad-payment-status">
                        입금 완료
                    </label>
                </div>
            </div>
            
            <div class="form-actions" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <button type="button" class="btn btn-secondary" id="btn-cancel">취소</button>
                <button type="submit" class="btn btn-primary">저장</button>
            </div>
        </form>
    `;
}

// 지역 옵션 설정
function setupRegionOptions() {
    const regionSelect = document.getElementById('ad-region');
    if (!regionSelect) return;
    
    regionSelect.innerHTML = '<option value="">선택하세요</option>';
    
    Object.keys(regionData).forEach(regionName => {
        const option = document.createElement('option');
        option.value = regionName;
        option.textContent = regionName;
        regionSelect.appendChild(option);
    });
}

// 도시 옵션 업데이트
function updateCityOptions(regionName) {
    const citySelect = document.getElementById('ad-city');
    if (!citySelect) return;
    
    citySelect.innerHTML = '<option value="">선택하세요</option>';
    
    if (!regionName) {
        citySelect.innerHTML = '<option value="">먼저 지역을 선택하세요</option>';
        return;
    }
    
    const regionCode = regionData[regionName];
    if (regionCode && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const option = document.createElement('option');
            const cityName = typeof city === 'string' ? city : city.name;
            option.value = cityName;
            option.textContent = cityName;
            citySelect.appendChild(option);
        });
    }
}

// 모달 열기
export async function openDetailModal(adId) {
    // window.allAds에서 광고 찾기
    const ad = window.allAds.find(a => a.id === adId);
    if (!ad) {
        console.error('광고를 찾을 수 없습니다:', adId);
        return;
    }
    
    currentEditingAd = ad;
    
    // 모달 HTML 업데이트
    updateModalHTML(ad);
    
    // 지역 옵션 설정
    setupRegionOptions();
    
    // 에디터 초기화
    initializeEditors();
    
    // 썸네일 업로더 생성
    createThumbnailUploader();
    
    // 폼에 데이터 채우기
    fillFormData(ad);
    
    // 모달 이벤트 리스너 설정
    setupModalEventListeners();
    
    // 모달 표시
    document.getElementById('ad-detail-modal').classList.add('show');
}

// 폼에 데이터 채우기
async function fillFormData(ad) {
    document.getElementById('ad-id').value = ad.id;
    document.getElementById('ad-author').value = ad.author || '';
    document.getElementById('ad-category').value = ad.category || '';
    document.getElementById('ad-business-type').value = ad.businessType || '';
    document.getElementById('ad-business-name').value = ad.businessName || '';
    document.getElementById('ad-region').value = ad.region || '';
    
    // 지역 선택 후 도시 옵션 업데이트
    if (ad.region) {
        await updateCityOptions(ad.region);
        document.getElementById('ad-city').value = ad.city || '';
    }
    
    document.getElementById('ad-phone').value = ad.phone || '';
    document.getElementById('ad-kakao').value = ad.kakao || '';
    document.getElementById('ad-telegram').value = ad.telegram || '';
    document.getElementById('ad-views').value = ad.views || 0;
    document.getElementById('ad-inquiries').value = ad.inquiries || 0;
    document.getElementById('ad-status').value = ad.status || 'pending';
    document.getElementById('ad-end-date').value = ad.endDate || '';
    document.getElementById('ad-payment-status').checked = ad.paymentStatus || false;
    
    // 광고 내용 (에디터에 설정)
    if (ad.content) {
        setEditorContent('content', ad.content);
    }
    
    // 썸네일 표시
    if (ad.thumbnail) {
        showExistingThumbnail(ad.thumbnail);
    }
    
    // 카테고리별 추가 필드 데이터 채우기
    fillCategorySpecificData(ad);
}

// 카테고리별 필드 채우기
function fillCategorySpecificData(ad) {
    if (ad.category === '유흥주점') {
        if (document.getElementById('ad-business-hours')) {
            document.getElementById('ad-business-hours').value = ad.businessHours || '';
        }
        
        // 주대설정 표시
        if (ad.tablePrice && document.getElementById('table-price-container')) {
            let tablePriceHtml = '';
            Object.entries(ad.tablePrice).forEach(([name, price]) => {
                tablePriceHtml += `
                    <div style="margin-bottom: 5px;">
                        <strong>${name}:</strong> ${price}원
                    </div>
                `;
            });
            document.getElementById('table-price-container').innerHTML = tablePriceHtml || '주대 정보 없음';
        }
        
        // 이벤트 정보 (에디터에 설정)
        if (ad.eventInfo) {
            setEditorContent('event', ad.eventInfo);
        }
    } else if (ad.category === '건전마사지') {
        if (document.getElementById('ad-business-hours')) {
            document.getElementById('ad-business-hours').value = ad.businessHours || '';
        }
        if (document.getElementById('ad-closed-days')) {
            document.getElementById('ad-closed-days').value = ad.closedDays || '';
        }
        if (document.getElementById('ad-parking-info')) {
            document.getElementById('ad-parking-info').value = ad.parkingInfo || '';
        }
        if (document.getElementById('ad-directions')) {
            document.getElementById('ad-directions').value = ad.directions || '';
        }
        
        // 코스설정 표시
        if (ad.courses && document.getElementById('course-container')) {
            let courseHtml = '';
            Object.entries(ad.courses).forEach(([name, price]) => {
                courseHtml += `
                    <div style="margin-bottom: 5px;">
                        <strong>${name}:</strong> ${price}원
                    </div>
                `;
            });
            document.getElementById('course-container').innerHTML = courseHtml || '코스 정보 없음';
        }
        
        if (document.getElementById('ad-event-info')) {
            document.getElementById('ad-event-info').value = ad.eventInfo ? 
                ad.eventInfo.replace(/<[^>]*>/g, '') : '';
        }
    }
}

// 모달 이벤트 리스너 설정
export function setupModalEventListeners() {
    // 지역 선택 변경 시 도시 옵션 업데이트
    document.getElementById('ad-region')?.addEventListener('change', function() {
        updateCityOptions(this.value);
    });
    
    // 폼 제출
    document.getElementById('ad-detail-form')?.addEventListener('submit', saveAdDetail);
    
    // 취소 버튼
    document.getElementById('btn-cancel')?.addEventListener('click', closeModal);
    
    // 모달 닫기 버튼
    document.querySelector('#modal-close')?.addEventListener('click', closeModal);
}

// 광고 상세 정보 저장
async function saveAdDetail(e) {
    e.preventDefault();
    
    const adId = document.getElementById('ad-id').value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // 버튼 비활성화
    submitButton.disabled = true;
    submitButton.textContent = '저장 중...';
    
    try {
        // 에디터 이미지 처리
        const userId = currentEditingAd.authorId || 'admin';
        await processEditorImages('content', userId);
        await processEditorImages('event', userId);
        
        // 썸네일 업로드
        const thumbnailUrl = await uploadThumbnail(userId);
        
        // 업데이트할 데이터 수집
        const updateData = collectFormData();
        
        // 에디터 내용 추가
        updateData.content = getEditorContent('content');
        updateData.thumbnail = thumbnailUrl;
        
        // 카테고리별 이벤트 정보
        if (updateData.category === '유흥주점' || updateData.category === '건전마사지') {
            updateData.eventInfo = getEditorContent('event');
        }
        
        // Firebase 업데이트
        await update(ref(rtdb, `advertisements/${adId}`), updateData);
        
        alert('광고 정보가 성공적으로 수정되었습니다.');
        closeModal();
        
        // 목록 새로고침
        if (window.loadAds) {
            window.loadAds();
        }
        
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다.');
    } finally {
        // 버튼 활성화
        submitButton.disabled = false;
        submitButton.textContent = '저장';
    }
}

// 폼 데이터 수집
function collectFormData() {
    const updateData = {
        author: document.getElementById('ad-author').value,
        category: document.getElementById('ad-category').value,
        businessType: document.getElementById('ad-business-type').value,
        businessName: document.getElementById('ad-business-name').value,
        region: document.getElementById('ad-region').value,
        city: document.getElementById('ad-city').value,
        phone: document.getElementById('ad-phone').value,
        kakao: document.getElementById('ad-kakao').value || '',
        telegram: document.getElementById('ad-telegram').value || '',
        views: parseInt(document.getElementById('ad-views').value) || 0,
        inquiries: parseInt(document.getElementById('ad-inquiries').value) || 0,
        status: document.getElementById('ad-status').value,
        endDate: document.getElementById('ad-end-date').value || null,
        paymentStatus: document.getElementById('ad-payment-status').checked,
        updatedAt: Date.now()
    };
    
    // 광고 내용 저장
    if (document.getElementById('ad-content')) {
        const contentValue = document.getElementById('ad-content').value;
        if (contentValue) {
            updateData.content = contentValue.replace(/\n/g, '<br>');
        }
    }
    
    if (document.getElementById('ad-thumbnail')) {
        updateData.thumbnail = document.getElementById('ad-thumbnail').value || null;
    }
    
    // 카테고리별 추가 필드 저장
    const category = document.getElementById('ad-category').value;
    
    if (category === '유흥주점') {
        collectKaraokeData(updateData);
    } else if (category === '건전마사지') {
        collectMassageData(updateData);
    }
    
    return updateData;
}

// 유흥주점 데이터 수집
function collectKaraokeData(updateData) {
    if (document.getElementById('ad-business-hours')) {
        updateData.businessHours = document.getElementById('ad-business-hours').value || '';
    }
    
    if (document.getElementById('ad-event-info')) {
        const eventValue = document.getElementById('ad-event-info').value;
        if (eventValue) {
            updateData.eventInfo = eventValue.replace(/\n/g, '<br>');
        }
    }
    
    // 주대설정은 기존 값 유지
    if (currentEditingAd.tablePrice) {
        updateData.tablePrice = currentEditingAd.tablePrice;
    }
}

// 건전마사지 데이터 수집
function collectMassageData(updateData) {
    if (document.getElementById('ad-business-hours')) {
        updateData.businessHours = document.getElementById('ad-business-hours').value || '';
    }
    if (document.getElementById('ad-closed-days')) {
        updateData.closedDays = document.getElementById('ad-closed-days').value || '';
    }
    if (document.getElementById('ad-parking-info')) {
        updateData.parkingInfo = document.getElementById('ad-parking-info').value || '';
    }
    if (document.getElementById('ad-directions')) {
        updateData.directions = document.getElementById('ad-directions').value || '';
    }
    
    if (document.getElementById('ad-event-info')) {
        const eventValue = document.getElementById('ad-event-info').value;
        if (eventValue) {
            updateData.eventInfo = eventValue.replace(/\n/g, '<br>');
        }
    }
    
    // 코스설정은 기존 값 유지
    if (currentEditingAd.courses) {
        updateData.courses = currentEditingAd.courses;
    }
}

// 모달 닫기
function closeModal() {
    document.getElementById('ad-detail-modal').classList.remove('show');
    currentEditingAd = null;
    clearEditors();  // 에디터 초기화
}