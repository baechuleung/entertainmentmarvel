import { rtdb, auth, db } from '/js/firebase-config.js';
import { ref, push, set, onValue, remove, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { uploadSingleImage } from '/js/imagekit-upload.js';
import { initQuillEditor } from './quill-handler.js';
import { openModal, closeModal } from './modals.js';

// 전역 변수
let currentUser = null;
let currentAdId = null;
let quillWrite = null;
let quillEdit = null;
let previewImagesWrite = new Map();
let previewImagesEdit = new Map();
let editingReviewData = null;

// 후기 설정
export function setupReviews(adId) {
    currentAdId = adId;
    
    // 인증 상태 확인
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
    });
    
    // Quill 에디터 초기화
    quillWrite = initQuillEditor('editor', previewImagesWrite);
    quillEdit = initQuillEditor('editor-edit', previewImagesEdit);
    
    // 후기 로드 이벤트
    window.addEventListener('loadReviews', () => {
        loadReviews(currentAdId);
    });
    
    // 후기 작성 버튼
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-write-review-tab') {
            handleWriteReview();
        }
    });
    
    // 폼 이벤트
    document.getElementById('review-form')?.addEventListener('submit', handleReviewSubmit);
    document.getElementById('review-edit-form')?.addEventListener('submit', handleReviewEditSubmit);
    
    // 수정/삭제 버튼
    document.getElementById('btn-edit-review')?.addEventListener('click', handleEditReview);
    document.getElementById('btn-delete-review')?.addEventListener('click', handleDeleteReview);
}

// 후기 작성 처리
function handleWriteReview() {
    if (!currentUser) {
        if (confirm('후기 작성은 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
            const currentUrl = window.location.href;
            window.location.href = `/auth/login.html?returnUrl=${encodeURIComponent(currentUrl)}`;
        }
        return;
    }
    
    openModal('review-modal');
}

// 후기 목록 로드
async function loadReviews(adId) {
    const reviewsList = document.getElementById('reviews-list-tab');
    if (!reviewsList) return;
    
    reviewsList.innerHTML = '<div class="loading">후기를 불러오는 중...</div>';
    
    try {
        const reviewsRef = ref(rtdb, `advertisements/${adId}/reviews`);
        
        onValue(reviewsRef, async (snapshot) => {
            const reviews = [];
            const reviewsData = snapshot.val();
            
            if (reviewsData) {
                for (const [key, value] of Object.entries(reviewsData)) {
                    const reviewData = { id: key, ...value };
                    
                    // 작성자 정보 가져오기
                    if (reviewData.userId) {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', reviewData.userId));
                            if (userDoc.exists()) {
                                reviewData.authorNickname = userDoc.data().nickname || '익명';
                            } else {
                                reviewData.authorNickname = '익명';
                            }
                        } catch (error) {
                            reviewData.authorNickname = '익명';
                        }
                    }
                    
                    reviews.push(reviewData);
                }
                
                // 최신순 정렬
                reviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            }
            
            displayReviews(reviews);
        });
        
    } catch (error) {
        console.error('후기 로드 실패:', error);
        reviewsList.innerHTML = '<div class="error">후기를 불러오는데 실패했습니다.</div>';
    }
}

// 후기 표시
function displayReviews(reviews) {
    const reviewsList = document.getElementById('reviews-list-tab');
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = `
            <div class="no-reviews">
                <p>아직 작성된 후기가 없습니다.</p>
                <p>첫 번째 후기를 작성해보세요!</p>
            </div>
        `;
        return;
    }
    
    reviewsList.innerHTML = reviews.map(review => {
        const createdDate = review.createdAt ? 
            new Date(review.createdAt).toLocaleDateString('ko-KR') : '-';
        
        return `
            <div class="review-item" data-review-id="${review.id}" data-review='${JSON.stringify(review).replace(/'/g, "&apos;")}'>
                <div class="review-header">
                    <span class="review-author">${review.authorNickname || '익명'}</span>
                    <span class="review-date">${createdDate}</span>
                </div>
                <div class="review-title">${review.title || '제목 없음'}</div>
            </div>
        `;
    }).join('');
    
    // 후기 클릭 이벤트 추가
    document.querySelectorAll('.review-item').forEach(item => {
        item.addEventListener('click', handleReviewClick);
    });
}

// 후기 클릭 핸들러
function handleReviewClick(e) {
    const reviewItem = e.currentTarget;
    const reviewData = JSON.parse(reviewItem.getAttribute('data-review'));
    
    // 상세 모달에 내용 표시
    document.getElementById('detail-modal-title').textContent = reviewData.title || '제목 없음';
    document.getElementById('review-detail-content').innerHTML = reviewData.content || '';
    
    // 수정/삭제 버튼에 데이터 저장
    document.getElementById('btn-edit-review').setAttribute('data-review-id', reviewData.id);
    document.getElementById('btn-delete-review').setAttribute('data-review-id', reviewData.id);
    
    // 수정을 위해 전역 변수에 저장
    editingReviewData = reviewData;
    
    // 본인 작성 후기인지 확인
    if (currentUser && currentUser.uid === reviewData.userId) {
        document.getElementById('btn-edit-review').style.display = 'block';
        document.getElementById('btn-delete-review').style.display = 'block';
    } else {
        document.getElementById('btn-edit-review').style.display = 'none';
        document.getElementById('btn-delete-review').style.display = 'none';
    }
    
    openModal('review-detail-modal');
}

// 후기 제출
async function handleReviewSubmit(e) {
    e.preventDefault();
    
    const reviewTitle = document.getElementById('review-title').value.trim();
    let editorContent = quillWrite.root.innerHTML;
    
    if (!reviewTitle) {
        alert('후기 제목을 입력해주세요.');
        return;
    }
    
    if (quillWrite.getText().trim() === '') {
        alert('후기 내용을 입력해주세요.');
        return;
    }
    
    const submitButton = e.target.querySelector('.btn-submit');
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';
    
    try {
        // 이미지 업로드
        const imgElements = quillWrite.root.querySelectorAll('img[data-preview="true"]');
        
        for (const img of imgElements) {
            const base64 = img.src;
            if (previewImagesWrite.has(base64)) {
                const file = previewImagesWrite.get(base64);
                const uploadedUrl = await uploadSingleImage(
                    file, 
                    `/entmarvel/advertise/${currentUser.uid}/reviews`, 
                    currentUser.uid
                );
                editorContent = editorContent.replace(base64, uploadedUrl);
            }
        }
        
        // 리얼타임 데이터베이스에 저장
        const reviewsRef = ref(rtdb, `advertisements/${currentAdId}/reviews`);
        const newReviewRef = push(reviewsRef);
        
        const reviewData = {
            userId: currentUser.uid,
            title: reviewTitle,
            content: editorContent,
            createdAt: Date.now()
        };
        
        await set(newReviewRef, reviewData);
        
        alert('후기가 등록되었습니다.');
        closeModal('review-modal');
        
        // 초기화
        document.getElementById('review-title').value = '';
        quillWrite.setText('');
        previewImagesWrite.clear();
        
    } catch (error) {
        console.error('후기 저장 실패:', error);
        alert('후기 등록에 실패했습니다.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '등록';
    }
}

// 후기 수정
async function handleEditReview() {
    if (!editingReviewData) return;
    
    // 수정 모달에 데이터 설정
    document.getElementById('review-edit-title').value = editingReviewData.title || '';
    quillEdit.root.innerHTML = editingReviewData.content || '';
    document.getElementById('review-edit-content').value = editingReviewData.content || '';
    
    // 상세 모달 닫고 수정 모달 열기
    closeModal('review-detail-modal');
    openModal('review-edit-modal');
}

// 후기 수정 제출
async function handleReviewEditSubmit(e) {
    e.preventDefault();
    
    const reviewTitle = document.getElementById('review-edit-title').value.trim();
    let editorContent = quillEdit.root.innerHTML;
    
    if (!reviewTitle) {
        alert('후기 제목을 입력해주세요.');
        return;
    }
    
    if (quillEdit.getText().trim() === '') {
        alert('후기 내용을 입력해주세요.');
        return;
    }
    
    const submitButton = e.target.querySelector('.btn-submit');
    submitButton.disabled = true;
    submitButton.textContent = '수정 중...';
    
    try {
        // 새로 추가된 이미지 업로드
        const imgElements = quillEdit.root.querySelectorAll('img[data-preview="true"]');
        
        for (const img of imgElements) {
            const base64 = img.src;
            if (previewImagesEdit.has(base64)) {
                const file = previewImagesEdit.get(base64);
                const uploadedUrl = await uploadSingleImage(
                    file, 
                    `/entmarvel/advertise/${currentUser.uid}/reviews`, 
                    currentUser.uid
                );
                editorContent = editorContent.replace(base64, uploadedUrl);
            }
        }
        
        // 데이터베이스 업데이트
        const reviewRef = ref(rtdb, `advertisements/${currentAdId}/reviews/${editingReviewData.id}`);
        await update(reviewRef, {
            title: reviewTitle,
            content: editorContent,
            updatedAt: Date.now()
        });
        
        alert('후기가 수정되었습니다.');
        closeModal('review-edit-modal');
        
        // 초기화
        previewImagesEdit.clear();
        editingReviewData = null;
        
    } catch (error) {
        console.error('후기 수정 실패:', error);
        alert('후기 수정에 실패했습니다.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '수정 완료';
    }
}

// 후기 삭제
async function handleDeleteReview() {
    const reviewId = this.getAttribute('data-review-id');
    
    if (confirm('정말 이 후기를 삭제하시겠습니까?')) {
        try {
            await remove(ref(rtdb, `advertisements/${currentAdId}/reviews/${reviewId}`));
            
            alert('후기가 삭제되었습니다.');
            closeModal('review-detail-modal');
        } catch (error) {
            console.error('후기 삭제 실패:', error);
            alert('후기 삭제에 실패했습니다.');
        }
    }
}