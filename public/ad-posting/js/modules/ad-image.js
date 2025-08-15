// /ad-posting/js/modules/ad-image.js
// 이미지 처리 관련 모든 기능을 담당하는 모듈

import { auth, rtdb } from '/js/firebase-config.js';
import { ref, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 백엔드 API URL (CORS 해결된 URL)
const UPLOAD_API_URL = 'https://ad-imagekit-upload-background-txjekregmq-uc.a.run.app';
const DELETE_API_URL = 'https://imagekit-delete-txjekregmq-uc.a.run.app';

// Base64 변환 헬퍼
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * 썸네일 업로드 설정
 */
export function setupThumbnailUpload(onFileSelect) {
    const thumbnailInput = document.getElementById('thumbnail-input');
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    const thumbnailImage = document.getElementById('thumbnail-image');
    const thumbnailUploadBtn = document.getElementById('thumbnail-upload-btn');
    const deleteThumbnailBtn = document.getElementById('delete-thumbnail');
    
    if (!thumbnailInput || !thumbnailPreview) return;
    
    if (thumbnailUploadBtn) {
        thumbnailUploadBtn.addEventListener('click', () => thumbnailInput.click());
    }
    
    thumbnailInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('파일 크기는 5MB 이하여야 합니다.');
                return;
            }
            showThumbnailPreview(file, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
            if (onFileSelect) onFileSelect(file);
        }
    });
    
    if (deleteThumbnailBtn) {
        deleteThumbnailBtn.addEventListener('click', () => {
            clearThumbnail(thumbnailInput, thumbnailImage, thumbnailPreview, thumbnailUploadBtn);
            if (onFileSelect) onFileSelect(null);
        });
    }
}

export function showThumbnailPreview(file, imageElement, previewElement, uploadBtn) {
    const reader = new FileReader();
    reader.onload = (e) => {
        if (imageElement) imageElement.src = e.target.result;
        if (previewElement) previewElement.style.display = 'block';
        if (uploadBtn) uploadBtn.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

export function showThumbnailFromUrl(url, imageElement, previewElement, uploadBtn) {
    if (imageElement && url) imageElement.src = url;
    if (previewElement) previewElement.style.display = 'block';
    if (uploadBtn) uploadBtn.style.display = 'none';
}

export function clearThumbnail(inputElement, imageElement, previewElement, uploadBtn) {
    if (inputElement) inputElement.value = '';
    if (imageElement) imageElement.src = '';
    if (previewElement) previewElement.style.display = 'none';
    if (uploadBtn) uploadBtn.style.display = 'block';
}

export async function deleteThumbnail(thumbnailUrl, userId) {
    if (!thumbnailUrl || !thumbnailUrl.includes('ik.imagekit.io')) {
        console.log('삭제할 썸네일이 없거나 ImageKit URL이 아닙니다.');
        return;
    }
    
    try {
        const deleteResult = await deleteAdImages([thumbnailUrl], userId);
        if (deleteResult && deleteResult.summary) {
            console.log(`썸네일 삭제 성공: ${deleteResult.summary.deleted}개 삭제`);
        }
    } catch (error) {
        console.error('썸네일 삭제 실패:', error);
        throw error;
    }
}

export function processBase64Images(content, previewImages) {
    let processedContent = content;
    const detailFiles = [];
    const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/gi;
    let match, index = 0;
    const replacements = [];
    
    while ((match = imgRegex.exec(content)) !== null) {
        const file = previewImages.get(match[1]);
        if (file) {
            detailFiles.push(file);
            replacements.push({
                original: match[0],
                replacement: `<img src="DETAIL_IMAGE_${index++}">`
            });
        }
    }
    
    replacements.forEach(({original, replacement}) => {
        processedContent = processedContent.replace(original, replacement);
    });
    
    return { processedContent, detailFiles, eventFiles: [] };
}

export function createPlaceholder(type, index) {
    return `${type}_IMAGE_${index}`;
}

/**
 * 백그라운드 이미지 업로드 - 기존 ad-imagekit-upload.js와 동일
 */
export async function startBackgroundUpload(adId, thumbnailFile, detailFiles, eventFiles) {
    try {
        console.log('=== 이미지 업로드 시작 ===');
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error('사용자 인증 실패');
            throw new Error('사용자 인증이 필요합니다.');
        }
        
        console.log('업로드 정보:', {
            adId,
            userId: currentUser.uid,
            thumbnailFile: !!thumbnailFile,
            detailFilesCount: detailFiles?.length || 0
        });

        const requestData = {
            adId: adId,
            userId: currentUser.uid,
            thumbnailImages: [],
            detailImages: []
        };

        if (thumbnailFile) {
            console.log('썸네일 변환 중...');
            requestData.thumbnailImages = [{
                base64: await fileToBase64(thumbnailFile),
                fileName: thumbnailFile.name
            }];
        }

        if (detailFiles && detailFiles.length > 0) {
            console.log(`상세 이미지 ${detailFiles.length}개 변환 중...`);
            for (const file of detailFiles) {
                requestData.detailImages.push({
                    base64: await fileToBase64(file),
                    fileName: file.name
                });
            }
        }

        const requestSize = JSON.stringify(requestData).length;
        const MAX_SIZE = 20 * 1024 * 1024; // 20MB 제한
        
        console.log('요청 크기:', requestSize, 'bytes');

        // 크기 초과시 분할 업로드
        if (requestSize > MAX_SIZE) {
            console.log('분할 업로드 시작...');
            
            if (requestData.thumbnailImages.length > 0) {
                await uploadBatch({
                    adId: requestData.adId,
                    userId: requestData.userId,
                    thumbnailImages: requestData.thumbnailImages,
                    detailImages: []
                });
            }
            
            for (let i = 0; i < requestData.detailImages.length; i++) {
                await uploadBatch({
                    adId: requestData.adId,
                    userId: requestData.userId,
                    thumbnailImages: [],
                    detailImages: [requestData.detailImages[i]]
                });
            }
            
            return { success: true, message: 'All images uploaded in batches' };
        }

        // 백그라운드 업로드
        console.log('API 호출 시작:', UPLOAD_API_URL);
        
        fetch(UPLOAD_API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData),
            mode: 'cors'
        }).then(async response => {
            const responseText = await response.text();
            console.log('API 응답:', response.status, responseText);
            
            if (response.ok) {
                const result = JSON.parse(responseText);
                console.log('✅ 이미지 업로드 성공:', result);
                if (result.success && result.results) {
                    await updateImageUrls(adId, result);
                }
                return result;
            } else {
                console.error('❌ 업로드 실패:', response.status);
                return { success: false, error: `업로드 실패: ${response.status}` };
            }
        }).catch(error => {
            console.error('❌ 네트워크 에러:', error);
            return { success: false, error: error.message };
        });
        
        return { success: true, message: 'Upload started in background' };
        
    } catch (error) {
        console.error('이미지 업로드 실패:', error);
        return { success: false, error: error.message };
    }
}

// 배치 업로드 헬퍼
async function uploadBatch(requestData) {
    try {
        const response = await fetch(UPLOAD_API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData),
            mode: 'cors'
        });
        
        const responseText = await response.text();
        if (response.ok) {
            return { success: true, result: JSON.parse(responseText) };
        } else {
            return { success: false, error: responseText };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// DB URL 업데이트
export async function updateImageUrls(adId, uploadResults) {
    try {
        if (!uploadResults?.results) return false;
        
        const updateData = {};
        if (uploadResults.results.thumbnail) {
            updateData.thumbnail = uploadResults.results.thumbnail;
        }
        updateData.uploadStatus = 'completed';
        updateData.uploadedAt = Date.now();
        
        if (Object.keys(updateData).length > 0) {
            await update(ref(rtdb, `advertisements/${adId}`), updateData);
            console.log('✅ DB URL 업데이트 완료');
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ DB URL 업데이트 실패:', error);
        return false;
    }
}

export async function deleteAdImages(imageUrls, userId) {
    if (!imageUrls || imageUrls.length === 0) {
        return { summary: { deleted: 0 } };
    }
    
    try {
        const validUrls = imageUrls.filter(url => url && url.includes('ik.imagekit.io'));
        if (validUrls.length === 0) {
            return { summary: { deleted: 0 } };
        }
        
        const fileIds = validUrls.map(url => {
            const match = url.match(/\/([^\/]+)\?/);
            return match ? match[1] : null;
        }).filter(id => id !== null);
        
        const response = await fetch(DELETE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileIds, userId })
        });
        
        if (!response.ok) throw new Error(`삭제 실패: ${response.status}`);
        
        const result = await response.json();
        console.log('이미지 삭제 완료:', result);
        return result;
    } catch (error) {
        console.error('이미지 삭제 오류:', error);
        return { error: error.message };
    }
}

export async function deleteAdFolder(adId, userId) {
    if (!adId) return { error: 'No ad ID' };
    
    try {
        const response = await fetch(DELETE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adId, userId })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('광고 이미지 폴더 삭제 실패');
        }
        
        const result = await response.json();
        console.log('광고 폴더 삭제 결과:', result);
        return result;
    } catch (error) {
        console.error('광고 폴더 삭제 오류:', error);
        return { error: error.message };
    }
}

export async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}