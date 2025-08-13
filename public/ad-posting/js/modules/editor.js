// /ad-posting/js/modules/editor.js

import { uploadBusinessAdImages } from '/js/imagekit-upload.js';

// Quill 에디터 초기화
export function initializeQuillEditor(placeholder = '광고 상세 내용을 입력하세요...') {
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'size': ['small', false, 'large', 'huge'] }],  // 글자 크기
                [{ 'color': [] }],  // 글자 색상
                ['link', 'image'],  // 링크, 이미지
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
            
            for (const file of files) {
                // 이미지를 base64로 변환
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result;
                    
                    // Quill 에디터에 이미지 삽입
                    const range = quill.getSelection() || { index: 0 };
                    quill.insertEmbed(range.index, 'image', base64);
                    
                    // base64와 File 객체 매핑 저장
                    previewImages.set(base64, file);
                };
                reader.readAsDataURL(file);
            }
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
                const uploadedUrl = await uploadFunction([file]);
                if (uploadedUrl && uploadedUrl.length > 0) {
                    uploadedImages.push(uploadedUrl[0]);
                    // 에디터 내의 base64 이미지를 업로드된 URL로 교체
                    img.src = uploadedUrl[0];
                }
            }
        } else {
            uploadedImages.push(src);
        }
    }
    
    return uploadedImages;
}