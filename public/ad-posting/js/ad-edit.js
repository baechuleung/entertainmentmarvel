import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { uploadBusinessAdImages } from '/js/imagekit-upload.js';

// 전역 변수
let currentUser = null;
let adId = null;
let currentAd = null;
let selectedFiles = [];
let deletedExistingImages = [];
let regionData = {};
let cityData = {};

// DOM 요소
const form = document.getElementById('ad-edit-form');
const authorInput = document.getElementById('author');
const regionSelect = document.getElementById('region');
const citySelect = document.getElementById('city');
const businessTypeSelect = document.getElementById('business-type');
const fileInput = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');
const existingImagesDiv = document.getElementById('existing-images');

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // URL에서 광고 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    adId = urlParams.get('id');
    
    if (!adId) {
        alert('잘못된 접근입니다.');
        window.location.href = '/ad-posting/ad-management.html';
        return;
    }
    
    // 인증 상태 확인
    checkAuth();
    
    // 데이터 로드
    await loadRegionData();
    await loadBusinessTypes();
    
    // 이벤트 리스너 설정
    setupEventListeners();
});

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // 광고 데이터 로드
            await loadAdData();
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/login.html';
        }
    });
}

// 광고 데이터 로드
async function loadAdData() {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            alert('광고를 찾을 수 없습니다.');
            window.location.href = '/ad-posting/ad-management.html';
            return;
        }
        
        currentAd = snapshot.val();
        
        // 권한 확인
        if (currentAd.authorId !== currentUser.uid) {
            alert('수정 권한이 없습니다.');
            window.location.href = '/ad-posting/ad-management.html';
            return;
        }
        
        // 폼에 데이터 채우기
        fillFormData();
        
    } catch (error) {
        console.error('광고 데이터 로드 실패:', error);
        alert('광고 데이터를 불러오는데 실패했습니다.');
    }
}

// 폼에 데이터 채우기
function fillFormData() {
    // 기본 정보
    document.getElementById('title').value = currentAd.title || '';
    authorInput.value = currentAd.author || '';
    document.getElementById('content').value = currentAd.content || '';
    
    // 연락처 정보
    document.getElementById('phone').value = currentAd.phone || '';
    document.getElementById('kakao').value = currentAd.kakao || '';
    document.getElementById('telegram').value = currentAd.telegram || '';
    
    // 업종 선택
    if (currentAd.businessType) {
        businessTypeSelect.value = currentAd.businessType;
    }
    
    // 지역 선택
    if (currentAd.region) {
        regionSelect.value = currentAd.region;
        updateCityOptions();
        
        // 도시 선택
        setTimeout(() => {
            if (currentAd.city) {
                citySelect.value = currentAd.city;
            }
        }, 100);
    }
    
    // 기존 이미지 표시
    displayExistingImages();
}

// 기존 이미지 표시
function displayExistingImages() {
    const images = [];
    
    // 썸네일 추가
    if (currentAd.thumbnail) {
        images.push({ url: currentAd.thumbnail, type: 'thumbnail' });
    }
    
    // 상세 이미지 추가
    if (currentAd.images && currentAd.images.length > 0) {
        currentAd.images.forEach((url, index) => {
            images.push({ url, type: 'detail', index });
        });
    }
    
    existingImagesDiv.innerHTML = images.map((img, index) => `
        <div class="existing-image-item" data-index="${index}" data-type="${img.type}">
            <img src="${img.url}" alt="기존 이미지 ${index + 1}">
            <button class="delete-btn" onclick="deleteExistingImage(${index})">&times;</button>
        </div>
    `).join('');
}

// 기존 이미지 삭제 표시
window.deleteExistingImage = function(index) {
    const item = existingImagesDiv.querySelector(`[data-index="${index}"]`);
    const type = item.getAttribute('data-type');
    
    if (item.classList.contains('deleted')) {
        // 삭제 취소
        item.classList.remove('deleted');
        deletedExistingImages = deletedExistingImages.filter(i => i !== index);
    } else {
        // 삭제 표시
        item.classList.add('deleted');
        deletedExistingImages.push(index);
    }
    
    // 전체 이미지 개수 체크
    checkTotalImageCount();
};

// 지역 데이터 로드
async function loadRegionData() {
    try {
        // region1.json 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        // region2.json 로드
        const region2Response = await fetch('/data/region2.json');
        cityData = await region2Response.json();
        
        // 지역 선택 옵션 추가
        region1Data.regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.name;  // code 대신 name을 value로 사용
            option.textContent = region.name;
            regionSelect.appendChild(option);
        });
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        data.businessTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;  // code 대신 name을 value로 사용
            option.textContent = type.name;
            businessTypeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 지역 선택 변경
    regionSelect.addEventListener('change', updateCityOptions);
    
    // 파일 선택
    fileInput.addEventListener('change', handleFileSelect);
    
    // 폼 제출
    form.addEventListener('submit', handleSubmit);
    
    // 취소 버튼
    document.querySelector('.btn-cancel').addEventListener('click', () => {
        if (confirm('수정을 취소하시겠습니까?')) {
            window.location.href = '/ad-posting/ad-management.html';
        }
    });
}

// 도시 옵션 업데이트
function updateCityOptions() {
    const selectedRegion = regionSelect.value;
    
    // 도시 선택 초기화
    citySelect.innerHTML = '<option value="">도시를 선택하세요</option>';
    
    if (selectedRegion) {
        // region1.json에서 선택된 지역의 code 찾기
        fetch('/data/region1.json')
            .then(response => response.json())
            .then(data => {
                const region = data.regions.find(r => r.name === selectedRegion);
                if (region && cityData[region.code]) {
                    cityData[region.code].forEach(city => {
                        const option = document.createElement('option');
                        option.value = city;
                        option.textContent = city;
                        citySelect.appendChild(option);
                    });
                }
            });
    }
}

// 전체 이미지 개수 체크
function checkTotalImageCount() {
    const existingCount = document.querySelectorAll('.existing-image-item:not(.deleted)').length;
    const newCount = selectedFiles.length;
    const totalCount = existingCount + newCount;
    
    if (totalCount > 5) {
        alert(`전체 이미지는 최대 5개까지 가능합니다. (현재: ${totalCount}개)`);
        return false;
    }
    
    return true;
}

// 파일 선택 처리
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    // 전체 이미지 개수 체크
    const existingCount = document.querySelectorAll('.existing-image-item:not(.deleted)').length;
    const totalCount = existingCount + selectedFiles.length + files.length;
    
    if (totalCount > 5) {
        alert(`전체 이미지는 최대 5개까지 가능합니다. (현재 기존: ${existingCount}개, 새 이미지: ${selectedFiles.length + files.length}개)`);
        fileInput.value = '';
        return;
    }
    
    selectedFiles = [...selectedFiles, ...files];
    displayFilePreview();
}

// 파일 미리보기 표시
function displayFilePreview() {
    filePreview.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'file-preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = `이미지 ${index + 1}`;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.onclick = () => removeFile(index);
                
                previewItem.appendChild(img);
                previewItem.appendChild(deleteBtn);
                filePreview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 파일 input 초기화
    fileInput.value = '';
}

// 파일 삭제
function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayFilePreview();
}

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitButton = document.querySelector('.btn-submit');
    submitButton.disabled = true;
    submitButton.textContent = '수정 중...';
    
    try {
        // 이미지 처리
        let finalImages = await processImages();
        
        // 광고 데이터 준비
        const adData = {
            title: document.getElementById('title').value,
            businessType: businessTypeSelect.value,
            region: regionSelect.value,
            city: citySelect.value,
            content: document.getElementById('content').value,
            phone: document.getElementById('phone').value,
            kakao: document.getElementById('kakao').value || '',
            telegram: document.getElementById('telegram').value || '',
            thumbnail: finalImages.thumbnail,
            images: finalImages.details,
            updatedAt: Date.now()
        };
        
        // 리얼타임 데이터베이스 업데이트
        await update(ref(rtdb, `advertisements/${adId}`), adData);
        
        alert('광고가 성공적으로 수정되었습니다.');
        window.location.href = '/ad-posting/ad-management.html';
        
    } catch (error) {
        console.error('광고 수정 실패:', error);
        alert('광고 수정에 실패했습니다. 다시 시도해주세요.');
        submitButton.disabled = false;
        submitButton.textContent = '수정 완료';
    }
}

// 이미지 처리
async function processImages() {
    let finalThumbnail = currentAd.thumbnail;
    let finalDetails = [...(currentAd.images || [])];
    
    // 삭제된 이미지 처리
    deletedExistingImages.forEach(index => {
        const item = existingImagesDiv.querySelector(`[data-index="${index}"]`);
        const type = item.getAttribute('data-type');
        
        if (type === 'thumbnail') {
            finalThumbnail = null;
        } else if (type === 'detail') {
            const detailIndex = parseInt(item.getAttribute('data-index')) - 1; // 썸네일이 0번이므로
            finalDetails[detailIndex] = null;
        }
    });
    
    // null 값 제거
    finalDetails = finalDetails.filter(url => url !== null);
    
    // 새 이미지 업로드
    if (selectedFiles.length > 0) {
        const imageData = await uploadBusinessAdImages(selectedFiles, currentUser.uid);
        
        // 썸네일이 없으면 첫 번째 새 이미지를 썸네일로
        if (!finalThumbnail && imageData.thumbnail) {
            finalThumbnail = imageData.thumbnail;
            finalDetails = [...finalDetails, ...imageData.details];
        } else {
            // 기존 썸네일이 있으면 모든 새 이미지를 상세 이미지로
            finalDetails = [...finalDetails, imageData.thumbnail, ...imageData.details].filter(url => url);
        }
    }
    
    return {
        thumbnail: finalThumbnail,
        details: finalDetails
    };
}