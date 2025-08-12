// /ad-posting/js/modules/thumbnail.js

// 썸네일 업로드 초기화
export function setupThumbnailUpload(onFileSelect) {
    const thumbnailInput = document.getElementById('thumbnail-input');
    const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    const thumbnailImage = document.getElementById('thumbnail-image');
    const deleteThumbnailBtn = document.getElementById('delete-thumbnail');
    
    if (!thumbnailInput || !thumbnailUploadBtn) return;
    
    // 썸네일 업로드 버튼 클릭
    thumbnailUploadBtn.addEventListener('click', () => {
        thumbnailInput.click();
    });
    
    // 썸네일 파일 선택
    thumbnailInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            showThumbnailPreview(file, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
            
            // 콜백 실행
            if (onFileSelect) {
                onFileSelect(file);
            }
        }
    });
    
    // 썸네일 삭제
    if (deleteThumbnailBtn) {
        deleteThumbnailBtn.addEventListener('click', function() {
            clearThumbnail(thumbnailInput, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
            
            // 콜백 실행
            if (onFileSelect) {
                onFileSelect(null);
            }
        });
    }
}

// 썸네일 미리보기 표시
export function showThumbnailPreview(file, imageElement, previewElement, uploadBtn) {
    if (!file || !imageElement || !previewElement) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        imageElement.src = e.target.result;
        previewElement.style.display = 'block';
        if (uploadBtn) uploadBtn.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// 썸네일 URL로 표시
export function showThumbnailFromUrl(url, imageElement, previewElement, uploadBtn) {
    if (!url || !imageElement || !previewElement) return;
    
    imageElement.src = url;
    previewElement.style.display = 'block';
    if (uploadBtn) uploadBtn.style.display = 'none';
}

// 썸네일 초기화
export function clearThumbnail(inputElement, imageElement, previewElement, uploadBtn) {
    if (inputElement) inputElement.value = '';
    if (imageElement) imageElement.src = '';
    if (previewElement) previewElement.style.display = 'none';
    if (uploadBtn) uploadBtn.style.display = 'block';
}

// 썸네일 업로드 처리
export async function uploadThumbnail(thumbnailFile, existingThumbnail, uploadFunction) {
    if (thumbnailFile) {
        // 새 파일 업로드
        return await uploadFunction(thumbnailFile);
    } else if (existingThumbnail) {
        // 기존 썸네일 유지
        return existingThumbnail;
    }
    return null;
}