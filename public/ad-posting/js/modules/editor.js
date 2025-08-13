// /ad-posting/js/modules/editor.js 업데이트 부분

// processEditorImages 함수 수정 - 광고 ID와 이미지 타입 추가
export async function processEditorImages(quill, previewImages, uploadFunction, adId, imageType = 'detail') {
    const uploadedImages = [];
    const imgElements = quill.root.querySelectorAll('img');
    
    for (const img of imgElements) {
        const src = img.src;
        if (src.startsWith('data:')) {
            // base64 이미지를 File 객체로 변환하여 업로드
            const file = previewImages.get(src);
            if (file) {
                // adId와 imageType을 전달하여 업로드
                const uploadedUrl = await uploadFunction(file, adId, imageType);
                if (uploadedUrl) {
                    uploadedImages.push(uploadedUrl);
                    // 에디터 내의 base64 이미지를 업로드된 URL로 교체
                    img.src = uploadedUrl;
                }
            }
        } else {
            uploadedImages.push(src);
        }
    }
    
    return uploadedImages;
}

// createImageHandler 함수 수정 - 광고 ID 받을 수 있도록
export function createImageHandler(quill, previewImages, getAdId = null) {
    return function() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.setAttribute('multiple', 'multiple');
        
        input.onchange = async () => {
            const files = Array.from(input.files);
            
            for (const file of files) {
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    
                    reader.onload = (e) => {
                        const range = quill.getSelection();
                        const index = range ? range.index : quill.getLength();
                        
                        // Base64 이미지를 에디터에 삽입 (미리보기)
                        quill.insertEmbed(index, 'image', e.target.result);
                        
                        // 이미지 파일을 Map에 저장 (나중에 업로드용)
                        previewImages.set(e.target.result, file);
                        
                        // 광고 ID가 있으면 즉시 업로드 (선택사항)
                        if (getAdId && typeof getAdId === 'function') {
                            const adId = getAdId();
                            if (adId) {
                                // 여기서 즉시 업로드 로직을 추가할 수 있음
                                console.log('광고 ID로 즉시 업로드 가능:', adId);
                            }
                        }
                    };
                    
                    reader.readAsDataURL(file);
                }
            }
        };
        
        input.click();
    };
}