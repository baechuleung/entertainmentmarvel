// /ad-posting/js/modules/ad-imagekit-upload.js
// 광고 전용 ImageKit 업로드 모듈 - 백엔드 서버 사용 버전

import { auth, rtdb } from '/js/firebase-config.js';
import { ref, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 백엔드 API URL
const UPLOAD_API_URL = 'https://ad-imagekit-upload-background-txjekregmq-uc.a.run.app';

// Base64 변환 헬퍼 함수
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// 배치 업로드 헬퍼 함수
async function uploadBatch(requestData) {
    try {
        console.log('배치 업로드 요청:', {
            adId: requestData.adId,
            thumbnailCount: requestData.thumbnailImages.length,
            detailCount: requestData.detailImages.length
        });
        
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
        console.log('배치 업로드 응답:', response.status, responseText);
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log('배치 업로드 성공:', result);
            
            // DB 업데이트는 백엔드에서 처리됨
            return { success: true, result: result };
        } else {
            console.error('배치 업로드 실패:', response.status, responseText);
            return { success: false, error: responseText };
        }
    } catch (error) {
        console.error('배치 업로드 에러:', error);
        return { success: false, error: error.message };
    }
}

// 백그라운드 업로드 시작 - 동기적으로 처리하여 실제 URL 반환
export async function startBackgroundUpload(adId, thumbnailFile, detailFiles, eventFiles) {
    try {
        console.log('=== 이미지 업로드 시작 ===');
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error('사용자 인증 실패');
            throw new Error('사용자 인증이 필요합니다.');
        }
        
        console.log('업로드 정보:', {
            adId: adId,
            userId: currentUser.uid,
            thumbnailFile: !!thumbnailFile,
            detailFilesCount: detailFiles?.length || 0
        });

        // 요청 데이터 준비
        const requestData = {
            adId: adId,
            userId: currentUser.uid,
            thumbnailImages: [],
            detailImages: []
        };

        // 썸네일 처리
        if (thumbnailFile) {
            console.log('썸네일 변환 중...');
            const base64 = await fileToBase64(thumbnailFile);
            requestData.thumbnailImages = [{
                base64: base64,
                fileName: thumbnailFile.name
            }];
            console.log('썸네일 변환 완료:', thumbnailFile.name);
        }

        // 상세 이미지 처리
        if (detailFiles && detailFiles.length > 0) {
            console.log(`상세 이미지 ${detailFiles.length}개 변환 중...`);
            for (const file of detailFiles) {
                const base64 = await fileToBase64(file);
                requestData.detailImages.push({
                    base64: base64,
                    fileName: file.name
                });
                console.log(`  - ${file.name} 변환 완료`);
            }
            console.log('상세 이미지 변환 완료');
        }

        console.log('최종 요청 데이터:', {
            adId: requestData.adId,
            userId: requestData.userId,
            thumbnailCount: requestData.thumbnailImages.length,
            detailCount: requestData.detailImages.length,
            totalSize: JSON.stringify(requestData).length + ' bytes'
        });

        // 요청 크기 체크 (10MB 제한)
        const requestSize = JSON.stringify(requestData).length;
        const MAX_SIZE = 20 * 1024 * 1024; // 9MB로 안전하게 설정 (Base64 오버헤드 고려)
        
        if (requestSize > MAX_SIZE) {
            console.log(`요청 크기(${requestSize} bytes)가 제한(${MAX_SIZE} bytes)을 초과하여 분할 업로드합니다.`);
            
            // 분할 업로드를 순차적으로 처리
            try {
                // 썸네일 먼저 업로드
                if (requestData.thumbnailImages.length > 0) {
                    const thumbnailRequest = {
                        adId: requestData.adId,
                        userId: requestData.userId,
                        thumbnailImages: requestData.thumbnailImages,
                        detailImages: []
                    };
                    
                    console.log('썸네일 업로드 중...');
                    const thumbnailResult = await uploadBatch(thumbnailRequest);
                    if (!thumbnailResult.success) {
                        console.error('썸네일 업로드 실패:', thumbnailResult.error);
                    }
                }
                
                // 상세 이미지를 하나씩 업로드
                if (requestData.detailImages.length > 0) {
                    for (let i = 0; i < requestData.detailImages.length; i++) {
                        const singleImageRequest = {
                            adId: requestData.adId,
                            userId: requestData.userId,
                            thumbnailImages: [],
                            detailImages: [requestData.detailImages[i]]
                        };
                        
                        console.log(`상세 이미지 ${i + 1}/${requestData.detailImages.length} 업로드 중...`);
                        const detailResult = await uploadBatch(singleImageRequest);
                        if (!detailResult.success) {
                            console.error(`상세 이미지 ${i + 1} 업로드 실패:`, detailResult.error);
                        }
                    }
                }
                
                console.log('✅ 모든 이미지 분할 업로드 완료');
                return { 
                    success: true, 
                    message: 'All images uploaded in batches'
                };
            } catch (error) {
                console.error('분할 업로드 중 에러:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // 정상 크기인 경우 한 번에 업로드
        console.log('API 호출 시작:', UPLOAD_API_URL);
        
        // 백그라운드로 fetch 처리 - await 없이 바로 실행
        fetch(UPLOAD_API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData),
            mode: 'cors'
        }).then(async response => {
            console.log('API 응답 상태:', response.status);
            
            const responseText = await response.text();
            console.log('API 응답 본문:', responseText);
            
            if (response.ok) {
                try {
                    const result = JSON.parse(responseText);
                    console.log('✅ 이미지 업로드 성공:', result);
                    
                    // DB 업데이트는 백그라운드에서 처리
                    if (result.success && result.results) {
                        await updateImageUrls(adId, result);
                    }
                    
                    return result;
                } catch (parseError) {
                    console.error('응답 파싱 실패:', parseError);
                    return { success: false, error: 'Invalid JSON response' };
                }
            } else {
                console.error('❌ API 에러 응답:', response.status, responseText);
                return { success: false, error: `업로드 실패: ${response.status}` };
            }
        }).catch(error => {
            console.error('❌ 네트워크 에러:', error);
            return { success: false, error: error.message };
        });
        
        // API 호출이 시작되었으므로 바로 반환
        return { 
            success: true, 
            message: 'Upload started in background'
        };
        
    } catch (error) {
        console.error('이미지 업로드 실패:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// DB URL 업데이트 함수 (업로드 완료 후 호출)
export async function updateImageUrls(adId, uploadResults) {
    try {
        if (!uploadResults || !uploadResults.results) {
            console.error('업로드 결과가 없습니다');
            return false;
        }
        
        const updateData = {};
        
        // 썸네일 URL 업데이트
        if (uploadResults.results.thumbnail) {
            updateData.thumbnail = uploadResults.results.thumbnail;
        }
        
        // 상세 이미지 URL 업데이트 (있는 경우)
        if (uploadResults.results.detailImages && uploadResults.results.detailImages.length > 0) {
            // 기존 content 가져와서 placeholder 교체
            // 이 부분은 백엔드에서 처리하므로 여기서는 썸네일만 업데이트
        }
        
        // 업로드 상태 업데이트
        updateData.uploadStatus = 'completed';
        updateData.uploadedAt = Date.now();
        
        // DB 업데이트
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

// 에디터용 단일 이미지 업로드 함수 (에디터에서 미리보기용으로만 사용)
export async function uploadSingleDetailImage(file, adId) {
    console.warn('에디터 이미지는 저장 시 일괄 업로드됩니다.');
    // 일단 base64 URL 반환 (나중에 handleSubmit에서 처리)
    return await fileToBase64(file);
}

// 이미지 삭제 (기존 유지)
export async function deleteAdImages(fileUrls, userId) {
    try {
        const response = await fetch('https://imagekit-delete-txjekregmq-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrls: fileUrls,
                userId: userId
            })
        });
        
        if (!response.ok) {
            throw new Error('이미지 삭제 실패');
        }
        
        const result = await response.json();
        console.log('이미지 삭제 성공:', result);
        return result;
        
    } catch (error) {
        console.error('이미지 삭제 오류:', error);
        throw error;
    }
}

// 광고 폴더 전체 삭제 (기존 유지)
export async function deleteAdFolder(adId, userId) {
    try {
        if (!adId) {
            throw new Error('광고 ID가 필요합니다.');
        }
        
        console.log('광고 폴더 삭제 시작:', `/entmarvel/advertise/${adId}/`);
        
        const response = await fetch('https://imagekit-delete-txjekregmq-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                adId: adId,
                userId: userId
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('폴더 삭제 실패 응답:', errorText);
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