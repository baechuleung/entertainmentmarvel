// admin/ads/js/ads-thumbnail.js - 썸네일 업로드 관리 모듈
import { uploadSingleImage } from '/js/imagekit-upload.js';

let thumbnailFile = null;
let existingThumbnailUrl = null;

// 썸네일 업로드 UI 생성
export function createThumbnailUploader() {
    const container = document.getElementById('thumbnail-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="thumbnail-upload-area">
            <input type="file" id="thumbnail-input" accept="image/*" style="display: none;">
            <button type="button" class="thumbnail-upload-btn" id="thumbnail-upload-btn">
                <span class="upload-icon">📷</span>
                <span class="upload-text">썸네일 업로드</span>
            </button>
            <div class="thumbnail-preview" id="thumbnail-preview" style="display: none;">
                <img id="thumbnail-image" src="" alt="썸네일 미리보기">
                <button type="button" class="delete-thumbnail" id="delete-thumbnail">×</button>
            </div>
        </div>
    `;
    
    setupThumbnailEvents();
}

// 썸네일 이벤트 설정
function setupThumbnailEvents() {
    const thumbnailInput = document.getElementById('thumbnail-input');
    const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    const thumbnailImage = document.getElementById('thumbnail-image');
    const deleteThumbnailBtn = document.getElementById('delete-thumbnail');
    
    // 썸네일 업로드 버튼 클릭
    thumbnailUploadBtn?.addEventListener('click', () => {
        thumbnailInput.click();
    });
    
    // 썸네일 파일 선택
    thumbnailInput?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            thumbnailFile = file;
            showThumbnailPreview(file);
        }
    });
    
    // 썸네일 삭제
    deleteThumbnailBtn?.addEventListener('click', function() {
        clearThumbnail();
    });
}

// 썸네일 미리보기 표시
function showThumbnailPreview(file) {
    const thumbnailImage = document.getElementById('thumbnail-image');
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
    
    if (!file || !thumbnailImage || !thumbnailPreview) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        thumbnailImage.src = e.target.result;
        thumbnailPreview.style.display = 'block';
        thumbnailUploadBtn.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// 기존 썸네일 URL로 표시
export function showExistingThumbnail(url) {
    if (!url) return;
    
    existingThumbnailUrl = url;
    const thumbnailImage = document.getElementById('thumbnail-image');
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
    
    if (thumbnailImage && thumbnailPreview) {
        thumbnailImage.src = url;
        thumbnailPreview.style.display = 'block';
        if (thumbnailUploadBtn) {
            thumbnailUploadBtn.style.display = 'none';
        }
    }
}

// 썸네일 초기화
function clearThumbnail() {
    const thumbnailInput = document.getElementById('thumbnail-input');
    const thumbnailImage = document.getElementById('thumbnail-image');
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
    
    if (thumbnailInput) thumbnailInput.value = '';
    if (thumbnailImage) thumbnailImage.src = '';
    if (thumbnailPreview) thumbnailPreview.style.display = 'none';
    if (thumbnailUploadBtn) thumbnailUploadBtn.style.display = 'block';
    
    thumbnailFile = null;
    existingThumbnailUrl = null;
}

// 썸네일 업로드 처리
export async function uploadThumbnail(userId) {
    if (thumbnailFile) {
        try {
            const uploadedUrl = await uploadSingleImage(
                thumbnailFile,
                `/entmarvel/admin/${userId}/thumbnails`,
                userId
            );
            return uploadedUrl;
        } catch (error) {
            console.error('썸네일 업로드 실패:', error);
            return existingThumbnailUrl;
        }
    }
    return existingThumbnailUrl;
}

// 썸네일 삭제 (ImageKit에서)
export async function deleteThumbnailFromImageKit(thumbnailUrl, userId) {
    if (!thumbnailUrl || !thumbnailUrl.includes('ik.imagekit.io')) {
        return;
    }
    
    try {
        const response = await fetch('https://imagekit-delete-enujtcasca-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrls: [thumbnailUrl],
                userId: userId || 'admin'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('썸네일 삭제 성공:', result);
        } else {
            console.error('썸네일 삭제 실패');
        }
    } catch (error) {
        console.error('썸네일 삭제 오류:', error);
    }
}

// 썸네일 스타일 추가
export function addThumbnailStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .thumbnail-upload-area {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .thumbnail-upload-btn {
            padding: 10px 20px;
            background-color: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 4px;
            color: #495057;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s;
            width: fit-content;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .thumbnail-upload-btn:hover {
            background-color: #e9ecef;
            border-color: #adb5bd;
        }
        
        .upload-icon {
            font-size: 20px;
        }
        
        .thumbnail-preview {
            position: relative;
            width: 300px;
            height: 200px;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #dee2e6;
        }
        
        .thumbnail-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .delete-thumbnail {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            background-color: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }
        
        .delete-thumbnail:hover {
            background-color: #ff4444;
            color: white;
        }
    `;
    document.head.appendChild(style);
}