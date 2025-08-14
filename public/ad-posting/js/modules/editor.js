// /ad-posting/js/modules/editor.js

// Quill 에디터 초기화
export function initializeQuillEditor(placeholder = '광고 상세 내용을 입력하세요...') {
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean']
            ]
        },
        placeholder: placeholder
    });
    
    // 에디터 최소 높이 보장
    const editorElement = document.querySelector('.ql-editor');
    if (editorElement) {
        editorElement.style.minHeight = '300px';
    }
    
    // 에디터 컨테이너 클릭 시 에디터에 포커스
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
        editorContainer.addEventListener('click', function(e) {
            if (e.target === editorContainer || e.target.closest('#editor')) {
                quill.focus();
            }
        });
    }
    
    // 에디터 내용 변경 시 hidden input 업데이트
    const contentInput = document.getElementById('content');
    if (contentInput) {
        quill.on('text-change', function() {
            contentInput.value = quill.root.innerHTML;
        });
    }
    
    return quill;
}

// 로컬 이미지 선택 핸들러 생성
export function createImageHandler(quill, previewImages) {
    return function() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.setAttribute('multiple', 'multiple');
        input.click();
        
        input.addEventListener('change', async function() {
            const files = Array.from(input.files);
            
            // 파일명으로 정렬
            files.sort((a, b) => a.name.localeCompare(b.name));
            
            // 현재 커서 위치 저장
            const range = quill.getSelection() || { index: 0 };
            let currentIndex = range.index;
            
            // 순차적으로 처리하기 위해 for...of 사용
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // Promise를 사용하여 각 파일이 완전히 처리될 때까지 대기
                await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const base64 = e.target.result;
                        
                        // Quill 에디터에 이미지 삽입
                        quill.insertEmbed(currentIndex, 'image', base64);
                        
                        // base64와 File 객체 매핑 저장
                        previewImages.set(base64, file);
                        
                        // 다음 위치로 이동 (이미지 = 1)
                        currentIndex += 1;
                        
                        // 마지막 이미지가 아니면 줄바꿈 2개 추가
                        if (i < files.length - 1) {
                            // 첫 번째 줄바꿈
                            quill.insertText(currentIndex, '\n');
                            currentIndex += 1;
                            
                            // 두 번째 줄바꿈 (빈 줄 생성)
                            quill.insertText(currentIndex, '\n');
                            currentIndex += 1;
                        }
                        
                        resolve();
                    };
                    reader.onerror = () => resolve();
                    reader.readAsDataURL(file);
                });
            }
            
            // 모든 이미지 삽입 후 커서를 마지막 위치로 이동
            quill.setSelection(currentIndex);
        });
    };
}

// 에디터 내용 설정
export function setEditorContent(quill, content) {
    if (quill && content) {
        quill.root.innerHTML = content;
        const contentInput = document.getElementById('content');
        if (contentInput) {
            contentInput.value = content;
        }
    }
}

// 에디터 내용 가져오기
export function getEditorContent(quill) {
    return quill ? quill.root.innerHTML : '';
}

// 에디터 이미지 처리
export async function processEditorImages(quill, previewImages, uploadFunction) {
    const uploadedImages = [];
    const imgElements = quill.root.querySelectorAll('img');
    
    for (const img of imgElements) {
        const src = img.src;
        if (src.startsWith('data:')) {
            // base64 이미지를 File 객체로 변환하여 업로드
            const file = previewImages.get(src);
            if (file) {
                // uploadFunction에 단일 파일 전달 (배열이 아님)
                const uploadedUrl = await uploadFunction(file);
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