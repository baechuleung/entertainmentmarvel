// /ad-posting/js/modules/ad-imagekit-upload.js
// 광고 전용 ImageKit 업로드 모듈 - 백엔드 서버 사용 버전

import { auth, rtdb } from '/js/firebase-config.js';
import { ref, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// 백엔드 API URL
const UPLOAD_API_URL = 'https://ad-imagekit-upload-background-enujtcasca-uc.a.run.app';

// Base64 변환 헬퍼 함수
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
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
            detailFilesCount: detailFiles?.length || 0,
            eventFilesCount: eventFiles?.length || 0
        });

        // 요청 데이터 준비
        const requestData = {
            adId: adId,
            userId: currentUser.uid,
            thumbnailImages: [],
            detailImages: [],
            eventImages: []
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

        // 이벤트 이미지 처리
        if (eventFiles && eventFiles.length > 0) {
            console.log(`이벤트 이미지 ${eventFiles.length}개 변환 중...`);
            for (const file of eventFiles) {
                const base64 = await fileToBase64(file);
                requestData.eventImages.push({
                    base64: base64,
                    fileName: file.name
                });
                console.log(`  - ${file.name} 변환 완료`);
            }
            console.log('이벤트 이미지 변환 완료');
        }

        console.log('최종 요청 데이터:', {
            adId: requestData.adId,
            userId: requestData.userId,
            thumbnailCount: requestData.thumbnailImages.length,
            detailCount: requestData.detailImages.length,
            eventCount: requestData.eventImages.length,
            totalSize: JSON.stringify(requestData).length + ' bytes'
        });

        // 요청 크기 체크 (10MB 제한)
        const requestSize = JSON.stringify(requestData).length;
        if (requestSize > 10 * 1024 * 1024) {
            console.error('요청 크기가 너무 큽니다:', requestSize);
            throw new Error('이미지 파일 크기가 너무 큽니다. 이미지를 압축하거나 개수를 줄여주세요.');
        }

        // fetch 사용하여 POST 요청
        console.log('API 호출 시작:', UPLOAD_API_URL);
        
        try {
            const response = await fetch(UPLOAD_API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData),
                mode: 'cors'  // CORS 모드 명시
            });
            
            console.log('API 응답 상태:', response.status);
            
            // 응답 텍스트 먼저 받기
            const responseText = await response.text();
            console.log('API 응답 본문:', responseText);
            
            if (response.ok) {
                try {
                    const result = JSON.parse(responseText);
                    console.log('✅ 이미지 업로드 성공:', result);
                    
                    // 업로드된 URL들 로그
                    if (result.success && result.results) {
                        console.log('업로드된 이미지 URL:');
                        
                        if (result.results.thumbnail) {
                            console.log('  - 썸네일:', result.results.thumbnail);
                        }
                        
                        if (result.results.detailImages) {
                            result.results.detailImages.forEach((url, idx) => {
                                console.log(`  - 상세 이미지 ${idx + 1}:`, url);
                            });
                        }
                        
                        if (result.results.eventImages) {
                            result.results.eventImages.forEach((url, idx) => {
                                console.log(`  - 이벤트 이미지 ${idx + 1}:`, url);
                            });
                        }
                        
                        // 성공 시 결과 반환
                        return {
                            success: true,
                            results: result.results,
                            uploadId: result.uploadId
                        };
                    } else {
                        console.error('업로드 응답에 결과가 없음:', result);
                        return {
                            success: false,
                            error: 'No results in response'
                        };
                    }
                } catch (parseError) {
                    console.error('응답 파싱 실패:', parseError);
                    return { 
                        success: false, 
                        error: 'Invalid JSON response' 
                    };
                }
            } else {
                console.error('❌ API 에러 응답:', response.status, responseText);
                return { 
                    success: false, 
                    error: `업로드 실패: ${response.status} - ${responseText}` 
                };
            }
        } catch (error) {
            console.error('❌ 네트워크 에러 상세:', error);
            console.error('에러 타입:', error.name);
            console.error('에러 메시지:', error.message);
            console.error('에러 스택:', error.stack);
            
            // CORS 에러 체크
            if (error.message.includes('CORS') || error.message.includes('fetch')) {
                console.error('CORS 에러 발생! 서버 CORS 설정을 확인하세요.');
            }
            
            return { 
                success: false, 
                error: error.message || 'Upload failed' 
            };
        }
        
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

// 에디터용 단일 이미지 업로드 함수들 (에디터에서 미리보기용으로만 사용)
export async function uploadSingleDetailImage(file, adId) {
    console.warn('에디터 이미지는 저장 시 일괄 업로드됩니다.');
    // 일단 base64 URL 반환 (나중에 handleSubmit에서 처리)
    return await fileToBase64(file);
}

export async function uploadSingleEventImage(file, adId) {
    console.warn('에디터 이미지는 저장 시 일괄 업로드됩니다.');
    // 일단 base64 URL 반환 (나중에 handleSubmit에서 처리)
    return await fileToBase64(file);
}

// 기존 함수들 - 호환성 유지를 위해 남겨둠 (deprecated)
export async function uploadAdThumbnail(file, adId) {
    console.warn('uploadAdThumbnail은 더 이상 사용되지 않습니다. startBackgroundUpload를 사용하세요.');
    throw new Error('이 함수는 더 이상 사용되지 않습니다.');
}

export async function uploadAdDetailImages(files, adId) {
    console.warn('uploadAdDetailImages는 더 이상 사용되지 않습니다. startBackgroundUpload를 사용하세요.');
    throw new Error('이 함수는 더 이상 사용되지 않습니다.');
}

export async function uploadAdEventImages(files, adId) {
    console.warn('uploadAdEventImages는 더 이상 사용되지 않습니다. startBackgroundUpload를 사용하세요.');
    throw new Error('이 함수는 더 이상 사용되지 않습니다.');
}

// 이미지 삭제 (기존 유지)
export async function deleteAdImages(fileUrls, userId) {
    try {
        const response = await fetch('https://imagekit-delete-enujtcasca-uc.a.run.app', {
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
        
        const response = await fetch('https://imagekit-delete-enujtcasca-uc.a.run.app', {
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