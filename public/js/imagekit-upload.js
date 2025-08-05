// ImageKit SDK가 로드될 때까지 대기
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

// 업체 광고 이미지 업로드
export async function uploadBusinessAdImages(files, userId) {
    try {
        // SDK 로드 확인
        await waitForImageKit();
        
        if (!imagekit) {
            throw new Error('ImageKit SDK가 초기화되지 않았습니다.');
        }
        
        // 인증 정보 가져오기
        const authParams = await getAuthenticationParameters();
        
        const uploadPromises = [];
        
        // 모든 이미지를 동일한 폴더에 업로드
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const fileName = `ad_${index}_${Date.now()}_${file.name}`;
            
            const uploadPromise = new Promise((resolve, reject) => {
                console.log('업로드 시작:', {
                    fileName: fileName,
                    folder: `/entmarvel/advertise/${userId}`,
                    fileSize: file.size,
                    fileType: file.type
                });
                
                imagekit.upload({
                    file: file,
                    fileName: fileName,
                    folder: `/entmarvel/advertise/${userId}`,
                    useUniqueFileName: true,
                    tags: ['business_ad', userId],
                    signature: authParams.signature,
                    expire: authParams.expire.toString(),
                    token: authParams.token
                }, function(error, result) {
                    if (error) {
                        console.error('ImageKit 업로드 오류:', error);
                        reject(error);
                    } else {
                        console.log('ImageKit 업로드 성공:', result);
                        resolve({
                            url: result.url,
                            fileId: result.fileId,
                            filePath: result.filePath
                        });
                    }
                });
            });
            
            uploadPromises.push(uploadPromise);
        }
        
        const results = await Promise.all(uploadPromises);
        
        // 결과 정리 - 첫 번째 이미지를 썸네일로, 나머지는 상세 이미지로
        const imageData = {
            thumbnail: results[0] ? results[0].url : null,
            details: results.slice(1).map(result => result.url)
        };
        
        return imageData;
        
    } catch (error) {
        console.error('이미지 업로드 실패:', error);
        throw error;
    }
}

// 단일 이미지 업로드 (범용)
export async function uploadSingleImage(file, folder, userId) {
    try {
        // SDK 로드 확인
        await waitForImageKit();
        
        if (!imagekit) {
            throw new Error('ImageKit SDK가 초기화되지 않았습니다.');
        }
        
        // 인증 정보 가져오기
        const authParams = await getAuthenticationParameters();
        
        return new Promise((resolve, reject) => {
            const fileName = `${Date.now()}_${file.name}`;
            
            console.log('업로드 시작:', {
                fileName: fileName,
                folder: folder || `/entmarvel/advertise/${userId}`,
                fileSize: file.size,
                fileType: file.type
            });
            
            imagekit.upload({
                file: file,
                fileName: fileName,
                folder: folder || `/entmarvel/advertise/${userId}`,
                useUniqueFileName: true,
                tags: [userId],
                signature: authParams.signature,
                expire: authParams.expire.toString(),
                token: authParams.token
            }, function(error, result) {
                if (error) {
                    console.error('ImageKit 업로드 오류:', error);
                    reject(error);
                } else {
                    console.log('ImageKit 업로드 성공:', result);
                    resolve(result.url);
                }
            });
        });
        
    } catch (error) {
        console.error('이미지 업로드 실패:', error);
        throw error;
    }
}

// 이미지 삭제
export async function deleteImage(fileId) {
    try {
        await waitForImageKit();
        
        if (!imagekit) {
            throw new Error('ImageKit SDK가 초기화되지 않았습니다.');
        }
        
        // ImageKit API를 통한 삭제 (인증 필요)
        const authParams = await getAuthenticationParameters();
        
        // 삭제 API 호출
        const response = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${btoa(authParams.privateKey + ':')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('이미지 삭제 실패');
        }
        
        return true;
    } catch (error) {
        console.error('이미지 삭제 실패:', error);
        throw error;
    }
}

// 썸네일 URL 생성 함수
export function getThumbnailUrl(url, width = 300, height = 300) {
    if (!imagekit) {
        console.error('ImageKit가 초기화되지 않았습니다.');
        return url;
    }
    
    return imagekit.url({
        src: url,
        transformation: [{
            height: height,
            width: width,
            crop: "at_max",
            quality: 80
        }]
    });
}

// 페이지 로드시 자동 초기화
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        waitForImageKit().then(() => {
            console.log('ImageKit 준비 완료');
        });
    });
}