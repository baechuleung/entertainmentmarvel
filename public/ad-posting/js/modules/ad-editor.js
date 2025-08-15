// /ad-posting/js/modules/ad-editor.js
// Quill 에디터 관련 모든 기능을 담당하는 모듈

/**
* Quill 에디터 초기화
* @returns {Object} Quill 인스턴스
*/
export function initializeQuillEditor() {
   // ID를 'editor'로 변경 (HTML과 일치)
   const editorContainer = document.getElementById('editor');
   
   if (!editorContainer) {
       console.error('에디터 컨테이너를 찾을 수 없습니다.');
       return null;
   }
   
   // Quill 옵션 설정
   const options = {
       theme: 'snow',
       placeholder: '상세 내용을 입력하세요...',
       modules: {
           toolbar: {
               container: [
                   ['bold', 'italic', 'underline', 'strike'],
                   ['blockquote', 'code-block'],
                   [{ 'header': 1 }, { 'header': 2 }],
                   [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                   [{ 'script': 'sub'}, { 'script': 'super' }],
                   [{ 'indent': '-1'}, { 'indent': '+1' }],
                   [{ 'size': ['small', false, 'large', 'huge'] }],
                   [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                   [{ 'color': [] }, { 'background': [] }],
                   [{ 'font': [] }],
                   [{ 'align': [] }],
                   ['clean'],
                   ['image', 'video', 'link']
               ]
           }
       }
   };
   
   // Quill 인스턴스 생성
   const quill = new Quill(editorContainer, options);
   
   // 에디터 최소 높이 설정
   const editorElement = editorContainer.querySelector('.ql-editor');
   if (editorElement) {
       editorElement.style.minHeight = '300px';
   }
   
   console.log('Quill 에디터 초기화 완료');
   return quill;
}

/**
* 이미지 핸들러 생성
* @param {Object} quill - Quill 인스턴스
* @param {Map} previewImages - 이미지 미리보기 Map
* @returns {Function} 이미지 핸들러 함수
*/
export function createImageHandler(quill, previewImages) {
   return function() {
       const input = document.createElement('input');
       input.setAttribute('type', 'file');
       input.setAttribute('accept', 'image/*');
       input.setAttribute('multiple', 'multiple');
       
       input.onchange = async function() {
           const files = Array.from(input.files);
           
           for (const file of files) {
               // 파일 유효성 검사
               if (!file.type.startsWith('image/')) {
                   alert('이미지 파일만 업로드 가능합니다.');
                   continue;
               }
               
               // 파일 크기 제한 (5MB)
               if (file.size > 5 * 1024 * 1024) {
                   alert('파일 크기는 5MB 이하여야 합니다.');
                   continue;
               }
               
               // 이미지를 base64로 변환
               const reader = new FileReader();
               reader.onload = function(e) {
                   const base64 = e.target.result;
                   
                   // previewImages Map에 저장
                   previewImages.set(base64, file);
                   
                   // 에디터에 이미지 삽입
                   const range = quill.getSelection();
                   const position = range ? range.index : quill.getLength();
                   quill.insertEmbed(position, 'image', base64);
                   quill.setSelection(position + 1);
               };
               
               reader.readAsDataURL(file);
           }
       };
       
       input.click();
   };
}

/**
* 에디터 내용 설정
* @param {Object} quill - Quill 인스턴스
* @param {string} content - HTML 콘텐츠
*/
export function setEditorContent(quill, content) {
   if (!quill || !content) return;
   
   // HTML 콘텐츠 설정
   quill.root.innerHTML = content;
   
   console.log('에디터 내용 설정 완료');
}

/**
* 에디터 내용 가져오기
* @param {Object} quill - Quill 인스턴스
* @returns {string} HTML 콘텐츠
*/
export function getEditorContent(quill) {
   if (!quill) return '';
   
   return quill.root.innerHTML;
}

/**
* 에디터 이미지 처리
* @param {Object} quill - Quill 인스턴스
* @param {Map} previewImages - 이미지 Map
* @returns {Object} 처리 결과
*/
export function processEditorImages(quill, previewImages) {
   if (!quill) {
       return {
           content: '',
           detailFiles: []
       };
   }
   
   let content = quill.root.innerHTML;
   const detailFiles = [];
   
   // base64 이미지 찾기
   const imgRegex = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/gi;
   let match;
   let index = 0;
   const replacements = [];
   
   while ((match = imgRegex.exec(content)) !== null) {
       const fullImgTag = match[0];
       const base64Src = match[1];
       
       // previewImages에서 파일 찾기
       const file = previewImages.get(base64Src);
       if (file) {
           detailFiles.push(file);
           replacements.push({
               original: fullImgTag,
               replacement: `<img src="DETAIL_IMAGE_${index}">`
           });
           index++;
       }
   }
   
   // 모든 교체 수행
   replacements.forEach(({original, replacement}) => {
       content = content.replace(original, replacement);
   });
   
   return {
       content,
       detailFiles
   };
}

/**
* 에디터 초기화
* @param {Object} quill - Quill 인스턴스
*/
export function clearEditor(quill) {
   if (!quill) return;
   
   quill.setText('');
   console.log('에디터 초기화 완료');
}

/**
* 에디터 활성화/비활성화
* @param {Object} quill - Quill 인스턴스
* @param {boolean} enabled - 활성화 여부
*/
export function setEditorEnabled(quill, enabled) {
   if (!quill) return;
   
   quill.enable(enabled);
}

/**
* 에디터에 텍스트 삽입
* @param {Object} quill - Quill 인스턴스
* @param {string} text - 삽입할 텍스트
*/
export function insertText(quill, text) {
   if (!quill || !text) return;
   
   const range = quill.getSelection();
   const position = range ? range.index : quill.getLength();
   quill.insertText(position, text);
   quill.setSelection(position + text.length);
}

/**
* 에디터 포커스
* @param {Object} quill - Quill 인스턴스
*/
export function focusEditor(quill) {
   if (!quill) return;
   
   quill.focus();
}

/**
* 에디터 내용이 비어있는지 확인
* @param {Object} quill - Quill 인스턴스
* @returns {boolean} 비어있으면 true
*/
export function isEditorEmpty(quill) {
   if (!quill) return true;
   
   const text = quill.getText().trim();
   return text.length === 0;
}

/**
* 에디터 워드 카운트
* @param {Object} quill - Quill 인스턴스
* @returns {number} 단어 수
*/
export function getWordCount(quill) {
   if (!quill) return 0;
   
   const text = quill.getText();
   const words = text.trim().split(/\s+/);
   return words.filter(word => word.length > 0).length;
}

/**
* 에디터 문자 카운트
* @param {Object} quill - Quill 인스턴스
* @returns {number} 문자 수
*/
export function getCharCount(quill) {
   if (!quill) return 0;
   
   return quill.getText().length;
}