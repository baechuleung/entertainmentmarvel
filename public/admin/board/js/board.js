import { checkAuthFirst, loadAdminHeader } from '/admin/js/admin-header.js';
import { db } from '/js/firebase-config.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { uploadSingleImage } from '/js/imagekit-upload.js';

let allPosts = [];
let currentUser = null;
let quill = null;
let editingPostId = null;
let previewImages = new Map(); // base64 -> File 객체 매핑

// 페이지 초기화 - 권한 체크 먼저!
(async function init() {
    try {
        // 1. 권한 체크 먼저 (페이지 표시 전)
        currentUser = await checkAuthFirst();
        
        // 2. 권한 확인 후 헤더 로드
        await loadAdminHeader(currentUser);
        
        // 3. Quill 에디터 초기화
        initializeQuillEditor();
        
        // 4. 게시판 목록 로드
        loadPosts();
        
        // 5. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        // 권한 없음 - checkAuthFirst에서 이미 리다이렉트 처리됨
        console.error('권한 체크 실패:', error);
    }
})();

// Quill 에디터 초기화
function initializeQuillEditor() {
    quill = new Quill('#editor', {
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
        }
    });
    
    // 에디터 내용 변경 시 hidden input 업데이트
    quill.on('text-change', function() {
        document.getElementById('post-content').value = quill.root.innerHTML;
    });
    
    // 이미지 핸들러 커스터마이징
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', selectLocalImage);
}

// 로컬 이미지 선택
function selectLocalImage() {
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
                
                // 에디터에 미리보기 이미지 삽입
                quill.insertEmbed(range.index, 'image', base64);
                
                // base64와 파일 객체 매핑 저장
                previewImages.set(base64, file);
                
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

// 게시판 목록 로드
async function loadPosts() {
    try {
        const postsQuery = query(collection(db, 'boards'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(postsQuery);
        
        allPosts = [];
        querySnapshot.forEach((doc) => {
            allPosts.push({ id: doc.id, ...doc.data() });
        });
        
        displayPosts();
    } catch (error) {
        console.error('게시판 목록 로드 실패:', error);
    }
}

// 게시판 목록 표시
function displayPosts() {
    const tbody = document.getElementById('board-tbody');
    const filterCategory = document.getElementById('filter-category').value;
    const searchText = document.getElementById('search-input').value.toLowerCase();
    
    // 필터링
    let filteredPosts = allPosts.filter(post => {
        if (filterCategory && post.category !== filterCategory) return false;
        if (searchText && !post.title.toLowerCase().includes(searchText) && 
            !post.content.toLowerCase().includes(searchText)) return false;
        return true;
    });
    
    tbody.innerHTML = filteredPosts.map((post, index) => {
        const categoryText = post.category === 'notice' ? '공지사항' : '이벤트';
        const createdDate = post.createdAt ? 
            new Date(post.createdAt.toMillis()).toLocaleDateString('ko-KR') : '-';
        
        return `
            <tr>
                <td>${filteredPosts.length - index}</td>
                <td>
                    <span class="category-badge ${post.category}">${categoryText}</span>
                </td>
                <td style="text-align: left;">${post.title}</td>
                <td>${post.author || '관리자'}</td>
                <td>${createdDate}</td>
                <td>${post.views || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-warning" onclick="editPost('${post.id}')">수정</button>
                        <button class="btn btn-danger" onclick="deletePost('${post.id}')">삭제</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 새 글 작성
function showNewPostModal() {
    editingPostId = null;
    document.getElementById('modal-title').textContent = '새 글 작성';
    document.getElementById('post-form').reset();
    quill.setText('');
    previewImages.clear();
    document.getElementById('post-modal').classList.add('show');
}

// 글 수정
window.editPost = async (postId) => {
    editingPostId = postId;
    document.getElementById('modal-title').textContent = '글 수정';
    
    try {
        const postDoc = await getDoc(doc(db, 'boards', postId));
        if (postDoc.exists()) {
            const postData = postDoc.data();
            document.getElementById('post-category').value = postData.category;
            document.getElementById('post-title').value = postData.title;
            quill.root.innerHTML = postData.content;
            document.getElementById('post-content').value = postData.content;
            document.getElementById('post-modal').classList.add('show');
        }
    } catch (error) {
        alert('게시글을 불러오는데 실패했습니다.');
    }
};

// 글 삭제
window.deletePost = async (postId) => {
    if (confirm('정말 삭제하시겠습니까?')) {
        try {
            await deleteDoc(doc(db, 'boards', postId));
            alert('삭제되었습니다.');
            loadPosts();
        } catch (error) {
            alert('삭제에 실패했습니다.');
        }
    }
};

// 글 저장
async function savePost(e) {
    e.preventDefault();
    
    const category = document.getElementById('post-category').value;
    const title = document.getElementById('post-title').value;
    let content = quill.root.innerHTML;
    
    const saveButton = document.getElementById('btn-save');
    saveButton.disabled = true;
    saveButton.textContent = '저장 중...';
    
    try {
        // 미리보기 이미지들을 실제 URL로 교체
        const imgElements = quill.root.querySelectorAll('img[data-preview="true"]');
        
        for (const img of imgElements) {
            const base64 = img.src;
            if (previewImages.has(base64)) {
                const file = previewImages.get(base64);
                const uploadedUrl = await uploadSingleImage(file, `/admin/boards/${category}`, currentUser.uid);
                content = content.replace(base64, uploadedUrl);
            }
        }
        
        const postData = {
            category,
            title,
            content,
            author: currentUser.email.split('@')[0],
            nickname: currentUser.displayName || currentUser.email.split('@')[0],
            updatedAt: serverTimestamp()
        };
        
        if (editingPostId) {
            // 수정
            await updateDoc(doc(db, 'boards', editingPostId), postData);
            alert('수정되었습니다.');
        } else {
            // 새 글
            postData.createdAt = serverTimestamp();
            postData.views = 0;
            await addDoc(collection(db, 'boards'), postData);
            alert('저장되었습니다.');
        }
        
        document.getElementById('post-modal').classList.remove('show');
        loadPosts();
        
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = '저장';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 새 글 작성 버튼
    document.getElementById('btn-new-post').addEventListener('click', showNewPostModal);
    
    // 모달 닫기
    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('post-modal').classList.remove('show');
    });
    
    document.getElementById('btn-cancel').addEventListener('click', () => {
        document.getElementById('post-modal').classList.remove('show');
    });
    
    // 폼 제출
    document.getElementById('post-form').addEventListener('submit', savePost);
    
    // 검색 및 필터
    document.getElementById('btn-search').addEventListener('click', displayPosts);
    document.getElementById('filter-category').addEventListener('change', displayPosts);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') displayPosts();
    });
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}