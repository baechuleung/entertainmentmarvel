// admin/ads/js/ads-editor.js - Quill 에디터 관리 모듈
import { uploadSingleImage } from '/js/imagekit-upload.js';

// 에디터 인스턴스 저장
let contentEditor = null;
let eventEditor = null;
let previewImages = new Map();

// Quill 에디터 초기화
export function initializeEditors() {
    // 메인 콘텐츠 에디터
    const contentContainer = document.getElementById('ad-content-editor');
    if (contentContainer) {
        contentEditor = new Quill('#ad-content-editor', {
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
            placeholder: '광고 상세 내용을 입력하세요...'
        });
        
        // 이미지 핸들러 설정
        const contentToolbar = contentEditor.getModule('toolbar');
        contentToolbar.addHandler('image', () => selectLocalImage(contentEditor));
    }
    
    // 이벤트 정보 에디터
    const eventContainer = document.getElementById('ad-event-editor');
    if (eventContainer) {
        eventEditor = new Quill('#ad-event-editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'color': [] }],
                    ['link', 'image'],
                    ['clean']
                ]
            },
            placeholder: '이벤트 내용을 입력하세요...'
        });
        
        // 이미지 핸들러 설정
        const eventToolbar = eventEditor.getModule('toolbar');
        eventToolbar.addHandler('image', () => selectLocalImage(eventEditor));
    }
    
    return { contentEditor, eventEditor };
}

// 로컬 이미지 선택
function selectLocalImage(quill) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.setAttribute('multiple', 'multiple');
    input.click();
    
    input.addEventListener('change', async function() {
        const files = Array.from(input.files);
        
        for (const file of files) {
            // 이미지를 base64로 변환하여 미리보기
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                
                // Quill 에디터에 이미지 삽입
                const range = quill.getSelection() || { index: 0 };
                quill.insertEmbed(range.index, 'image', base64);
                
                // base64와 File 객체 매핑 저장
                previewImages.set(base64, file);
                
                // 미리보기 표시
                const img = quill.root.querySelector(`img[src="${base64}"]`);
                if (img) {
                    img.setAttribute('data-preview', 'true');
                    img.style.opacity = '0.8';
                    img.style.border = '2px dashed #1a5490';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// 에디터 내용 설정
export function setEditorContent(editorType, content) {
    if (editorType === 'content' && contentEditor && content) {
        contentEditor.root.innerHTML = content;
    } else if (editorType === 'event' && eventEditor && content) {
        eventEditor.root.innerHTML = content;
    }
}

// 에디터 내용 가져오기
export function getEditorContent(editorType) {
    if (editorType === 'content' && contentEditor) {
        return contentEditor.root.innerHTML;
    } else if (editorType === 'event' && eventEditor) {
        return eventEditor.root.innerHTML;
    }
    return '';
}

// 에디터 이미지 처리 (base64를 실제 URL로 변환)
export async function processEditorImages(editorType, userId) {
    const editor = editorType === 'content' ? contentEditor : eventEditor;
    if (!editor) return [];
    
    const uploadedImages = [];
    const imgElements = editor.root.querySelectorAll('img');
    
    for (const img of imgElements) {
        const src = img.src;
        if (src.startsWith('data:')) {
            // base64 이미지를 File 객체로 변환하여 업로드
            const file = previewImages.get(src);
            if (file) {
                try {
                    const uploadedUrl = await uploadSingleImage(
                        file, 
                        `/entmarvel/admin/${userId}`,
                        userId
                    );
                    if (uploadedUrl) {
                        uploadedImages.push(uploadedUrl);
                        // 에디터 내의 base64 이미지를 업로드된 URL로 교체
                        img.src = uploadedUrl;
                        img.removeAttribute('data-preview');
                        img.style.opacity = '1';
                        img.style.border = 'none';
                    }
                } catch (error) {
                    console.error('이미지 업로드 실패:', error);
                }
            }
        } else if (src.includes('ik.imagekit.io')) {
            // 이미 업로드된 이미지
            uploadedImages.push(src);
        }
    }
    
    return uploadedImages;
}

// 에디터 초기화
export function clearEditors() {
    if (contentEditor) {
        contentEditor.root.innerHTML = '';
    }
    if (eventEditor) {
        eventEditor.root.innerHTML = '';
    }
    previewImages.clear();
}

// 에디터 스타일 적용
export function applyEditorStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .ql-toolbar.ql-snow {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px 4px 0 0;
        }
        
        .ql-container.ql-snow {
            border: 1px solid #dee2e6;
            border-top: none;
            border-radius: 0 0 4px 4px;
        }
        
        .ql-editor {
            min-height: 200px;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .ql-editor.ql-blank::before {
            color: #999;
            font-style: normal;
        }
        
        .ql-editor img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 10px 0;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
}