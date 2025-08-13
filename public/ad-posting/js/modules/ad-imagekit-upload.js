// /ad-posting/js/modules/ad-imagekit-upload.js
// 광고 전용 ImageKit 업로드 모듈

let imagekit = null;

// ImageKit 초기화 함수
function initializeImageKit() {
    if (typeof ImageKit !== 'undefined') {
        imagekit = new ImageKit({
            publicKey: "public_QPT5XZczBoiDTDV0KFeRhMM4Bzo=",
            urlEndpoint: "https://ik.imagekit.io/leadproject",
            authenticationEndpoint: "https://imagekit-auth-enujtcasca-uc.a.run.app"
        });
        console.log('ImageKit 초기화 완료');
        return true;
    }
    return false;
}

// SDK 로드 대기
function waitForImageKit() {
    return new Promise((resolve) => {
        if (initializeImageKit()) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (initializeImageKit()) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // 5초 후 타임아웃
            setTimeout(() => {
                clearInterval(checkInterval);
                console.error('ImageKit SDK 로드 타임아웃');
            }, 5000);
        }
    });
}

// 인증 정보 가져오기
async function getAuthenticationParameters() {
    try {
        const response = await fetch('https://imagekit-auth-enujtcasca-uc.a.run.app');
        if (!response.ok) {
            throw new Error('인증 실패');
        }
        const authParams = await response.json();
        console.log('인증 파라미터 받음:', authParams);
        return authParams;
    } catch (error) {
        console.error('인증 파라미터 가져오기 실패:', error);
        throw error;
    }
}

// 썸네일 이미지 업로드
export async function uploadAdThumbnail(file, adId) {
    try {
        await waitForImageKit();
        
        if (!imagekit) {
            throw new Error('ImageKit SDK가 초기화되지 않았습니다.');
        }
        
        if (!adId) {
            throw new Error('광고 ID가 필요합니다.');
        }
        
        const authParams = await getAuthenticationParameters();
        const fileName = `thumbnail_${Date.now()}_${file.name}`;
        const folder = `/entmarvel/advertise/${adId}/thumbnail`;
        
        return new Promise((resolve, reject) => {
            console.log('썸네일 업로드 시작:', {
                fileName: fileName,
                folder: folder,
                fileSize: file.size
            });
            
            imagekit.upload({
                file: file,
                fileName: fileName,
                folder: folder,
                useUniqueFileName: true,
                tags: ['thumbnail', adId],
                signature: authParams.signature,
                expire: authParams.expire.toString(),
                token: authParams.token
            }, function(error, result) {
                if (error) {
                    console.error('썸네일 업로드 오류:', error);
                    reject(error);
                } else {
                    console.log('썸네일 업로드 성공:', result);
                    resolve(result.url);
                }
            });
        });
        
    } catch (error) {
        console.error('썸네일 업로드 실패:', error);
        throw error;
    }
}

// 상세 이미지 업로드
export async function uploadAdDetailImages(files, adId) {
    try {
        await waitForImageKit();
        
        if (!imagekit) {
            throw new Error('ImageKit SDK가 초기화되지 않았습니다.');
        }
        
        if (!adId) {
            throw new Error('광고 ID가 필요합니다.');
        }
        
        const authParams = await getAuthenticationParameters();
        const uploadPromises = [];
        
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const fileName = `detail_${index}_${Date.now()}_${file.name}`;
            const folder = `/entmarvel/advertise/${adId}/detail`;
            
            const uploadPromise = new Promise((resolve, reject) => {
                console.log('상세 이미지 업로드 시작:', {
                    fileName: fileName,
                    folder: folder,
                    fileSize: file.size
                });
                
                imagekit.upload({
                    file: file,
                    fileName: fileName,
                    folder: folder,
                    useUniqueFileName: true,
                    tags: ['detail', adId],
                    signature: authParams.signature,
                    expire: authParams.expire.toString(),
                    token: authParams.token
                }, function(error, result) {
                    if (error) {
                        console.error('상세 이미지 업로드 오류:', error);
                        reject(error);
                    } else {
                        console.log('상세 이미지 업로드 성공:', result);
                        resolve(result.url);
                    }
                });
            });
            
            uploadPromises.push(uploadPromise);
        }
        
        return await Promise.all(uploadPromises);
        
    } catch (error) {
        console.error('상세 이미지 업로드 실패:', error);
        throw error;
    }
}

// 이벤트 이미지 업로드
export async function uploadAdEventImages(files, adId) {
    try {
        await waitForImageKit();
        
        if (!imagekit) {
            throw new Error('ImageKit SDK가 초기화되지 않았습니다.');
        }
        
        if (!adId) {
            throw new Error('광고 ID가 필요합니다.');
        }
        
        const authParams = await getAuthenticationParameters();
        const uploadPromises = [];
        
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const fileName = `event_${index}_${Date.now()}_${file.name}`;
            const folder = `/entmarvel/advertise/${adId}/event`;
            
            const uploadPromise = new Promise((resolve, reject) => {
                console.log('이벤트 이미지 업로드 시작:', {
                    fileName: fileName,
                    folder: folder,
                    fileSize: file.size
                });
                
                imagekit.upload({
                    file: file,
                    fileName: fileName,
                    folder: folder,
                    useUniqueFileName: true,
                    tags: ['event', adId],
                    signature: authParams.signature,
                    expire: authParams.expire.toString(),
                    token: authParams.token
                }, function(error, result) {
                    if (error) {
                        console.error('이벤트 이미지 업로드 오류:', error);
                        reject(error);
                    } else {
                        console.log('이벤트 이미지 업로드 성공:', result);
                        resolve(result.url);
                    }
                });
            });
            
            uploadPromises.push(uploadPromise);
        }
        
        return await Promise.all(uploadPromises);
        
    } catch (error) {
        console.error('이벤트 이미지 업로드 실패:', error);
        throw error;
    }
}

// 단일 상세 이미지 업로드 (에디터용)
export async function uploadSingleDetailImage(file, adId) {
    try {
        const result = await uploadAdDetailImages([file], adId);
        return result[0];
    } catch (error) {
        console.error('단일 상세 이미지 업로드 실패:', error);
        throw error;
    }
}

// 단일 이벤트 이미지 업로드 (에디터용)
export async function uploadSingleEventImage(file, adId) {
    try {
        const result = await uploadAdEventImages([file], adId);
        return result[0];
    } catch (error) {
        console.error('단일 이벤트 이미지 업로드 실패:', error);
        throw error;
    }
}

// 광고 전체 이미지 삭제 (폴더 전체 삭제)
export async function deleteAdFolder(adId, userId) {
    try {
        if (!adId) {
            throw new Error('광고 ID가 필요합니다.');
        }
        
        console.log('광고 폴더 삭제 시작:', `/entmarvel/advertise/${adId}/`);
        
        // 기존 API에 폴더 삭제 요청
        const response = await fetch('https://imagekit-delete-enujtcasca-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                adId: adId,  // 광고 ID 전달
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
        
        if (result.summary) {
            console.log(`총 ${result.summary.total}개 파일 중 ${result.summary.deleted}개 삭제 성공`);
        }
        
        return result;
        
    } catch (error) {
        console.error('광고 폴더 삭제 오류:', error);
        // 폴더 삭제 실패해도 광고는 삭제되도록 에러를 throw하지 않음
        return { error: error.message };
    }
}

// 이미지 삭제 (서버 함수 호출)
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