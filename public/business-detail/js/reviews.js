import { rtdb, auth, db } from '/js/firebase-config.js';
import { ref, push, set, onValue, remove, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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

// 모달 닫기 함수 추가
function closeReviewModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

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
    
    // 초기 로드
    loadReviews(currentAdId);
    
    // 후기 로드 이벤트
    window.addEventListener('loadReviews', () => {
        loadReviews(currentAdId);
    });
    
    // 후기 작성 버튼 - 직접 이벤트 리스너 추가
    setTimeout(() => {
        const writeReviewBtn = document.getElementById('btn-write-review-tab');
        if (writeReviewBtn) {
            console.log('후기 작성 버튼 찾음');
            writeReviewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('후기 작성 버튼 클릭됨');
                handleWriteReview();
            });
        } else {
            console.error('후기 작성 버튼을 찾을 수 없음');
        }
    }, 1000);
    
    // 모달 닫기 버튼들
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            if (modalId) {
                closeReviewModal(modalId);
            }
        });
    });
    
    // 취소 버튼들
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            if (modalId) {
                closeReviewModal(modalId);
            }
        });
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
    console.log('handleWriteReview 함수 호출됨');
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
        if (confirm('후기 작성은 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
            const currentUrl = window.location.href;
            window.location.href = `/auth/login.html?returnUrl=${encodeURIComponent(currentUrl)}`;
        }
        return;
    }
    
    console.log('모달 열기 시도');
    const modal = document.getElementById('review-modal');
    if (modal) {
        console.log('모달 요소 찾음');
        // show 클래스 대신 직접 스타일 적용
        modal.style.cssText = 'display: flex !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 99999; align-items: center; justify-content: center;';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('모달 스타일 적용 완료');
    } else {
        console.error('review-modal 요소를 찾을 수 없음');
    }
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
            
            // 후기 개수 업데이트 추가
            const reviewTotalCount = document.getElementById('review-total-count');
            if (reviewTotalCount) {
                reviewTotalCount.textContent = `(${reviews.length})`;
            }
            
            // 헤더의 review-count도 업데이트
            const headerReviewCount = document.getElementById('review-count');
            if (headerReviewCount) {
                headerReviewCount.textContent = reviews.length;
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
        
        // Firestore에서 사용자 정보 업데이트
        const userRef = doc(db, 'users', currentUser.uid);
        const pointsToAdd = 100; // 후기 작성 포인트
        const timestamp = Date.now();
        
        // point_history 맵에 추가할 데이터
        const historyKey = `${timestamp}`;
        const historyData = {
            type: 'earned',
            amount: pointsToAdd,
            title: '후기 작성',
            createdAt: new Date(timestamp),
            adId: currentAdId,
            reviewTitle: reviewTitle
        };
        
        // 사용자 데이터 업데이트
        await updateDoc(userRef, {
            reviews_count: increment(1),
            points: increment(pointsToAdd),
            [`point_history.${historyKey}`]: historyData
        });
        
        alert('후기가 등록되었습니다.');
        
        // 모달 닫기
        closeReviewModal('review-modal');
        
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
        
        // 모달 닫기
        closeReviewModal('review-edit-modal');
        
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
            
            // Firestore에서 사용자 정보 업데이트 (포인트 차감 및 이력 추가)
            const userRef = doc(db, 'users', currentUser.uid);
            const pointsToDeduct = -100; // 후기 삭제 시 포인트 차감
            const timestamp = Date.now();
            
            // point_history 맵에 추가할 데이터 (차감 기록)
            const historyKey = `${timestamp}`;
            const historyData = {
                type: 'used',
                amount: 100, // 차감되는 포인트 (양수로 저장)
                title: '후기 삭제',
                createdAt: new Date(timestamp),
                adId: currentAdId
            };
            
            // 사용자 데이터 업데이트
            await updateDoc(userRef, {
                reviews_count: increment(-1),
                points: increment(pointsToDeduct),
                [`point_history.${historyKey}`]: historyData
            });
            
            alert('후기가 삭제되었습니다.');
            
            // 모달 닫기
            closeReviewModal('review-detail-modal');
        } catch (error) {
            console.error('후기 삭제 실패:', error);
            alert('후기 삭제에 실패했습니다.');
        }
    }
}