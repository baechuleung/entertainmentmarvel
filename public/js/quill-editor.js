// Quill 에디터 공통 모듈

// Quill 에디터 초기화
export function initQuillEditor(editorId, previewImagesMap) {
    const editorElement = document.getElementById(editorId);
    if (!editorElement) return null;
    
    const quill = new Quill(`#${editorId}`, {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ]
        },
        placeholder: '내용을 작성해주세요...'
    });
    
    // hidden input 업데이트
    const hiddenInputId = editorId === 'editor' ? 'review-content' : 
                         editorId === 'editor-edit' ? 'review-edit-content' : null;
    
    if (hiddenInputId) {
        quill.on('text-change', function() {
            document.getElementById(hiddenInputId).value = quill.root.innerHTML;
        });
    }
    
    // 이미지 핸들러 설정
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', () => selectLocalImage(quill, previewImagesMap));
    
    return quill;
}

// 로컬 이미지 선택
function selectLocalImage(quill, previewImagesMap) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    
    input.onchange = () => {
        const file = input.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                const range = quill.getSelection();
                
                // 에디터에 이미지 삽입
                quill.insertEmbed(range.index, 'image', base64);
                
                // 파일 매핑 저장
                if (previewImagesMap) {
                    previewImagesMap.set(base64, file);
                }
                
                // 미리보기 표시
                setTimeout(() => {
                    const img = quill.root.querySelector(`img[src="${base64}"]`);
                    if (img) {
                        img.setAttribute('data-preview', 'true');
                    }
                }, 100);
            };
            reader.readAsDataURL(file);
        }
    };
}