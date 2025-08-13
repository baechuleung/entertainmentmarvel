// /ad-posting/js/modules/ad-imagekit-upload.js
// 광고 전용 ImageKit 업로드 모듈 - 백엔드 서버 사용 버전

import { auth } from '/js/firebase-config.js';

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

// 백그라운드 업로드 시작 (sendBeacon 사용 - 페이지 이동해도 계속 실행)
export async function startBackgroundUpload(adId, thumbnailFile, detailFiles, eventFiles) {
    try {
        console.log('=== 백그라운드 업로드 시작 ===');
        
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
            console.log('썸네일 변환 완료');
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
            }
            console.log('이벤트 이미지 변환 완료');
        }

        console.log('최종 요청 데이터:', {
            adId: requestData.adId,
            userId: requestData.userId,
            thumbnailCount: requestData.thumbnailImages.length,
            detailCount: requestData.detailImages.length,
            eventCount: requestData.eventImages.length
        });

        // fetch 사용
        console.log('API 호출 시작:', UPLOAD_API_URL);
        console.log('요청 데이터 크기:', JSON.stringify(requestData).length, 'bytes');
        
        try {
            const response = await fetch(UPLOAD_API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            console.log('API 응답 상태:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ 백그라운드 업로드 요청 전송 성공:', result);
                return result;
            } else {
                const errorText = await response.text();
                console.error('❌ API 에러 응답:', response.status, errorText);
                return { 
                    success: false, 
                    error: `업로드 실패: ${response.status}` 
                };
            }
        } catch (error) {
            console.error('❌ 네트워크 에러 상세:', error);
            console.error('에러 메시지:', error.message);
            console.error('에러 스택:', error.stack);
            
            return { 
                success: false, 
                error: error.message || 'Upload failed' 
            };
        }
        
    } catch (error) {
        console.error('백그라운드 업로드 실패:', error);
        // 에러가 나도 페이지 이동은 계속되도록 에러를 throw하지 않음
        return { 
            success: false, 
            error: error.message 
        };
    }
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