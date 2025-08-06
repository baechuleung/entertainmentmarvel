import { rtdb, auth, db } from '/js/firebase-config.js';
import { ref, get, update, push, set, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { uploadSingleImage } from '/js/imagekit-upload.js';
import { loadComponent, setBusinessHeader, setDetailContent, setupTabs } from './components.js';

// 전역 변수
let currentAd = null;
let currentUser = null;
let adId = null;
let quill = null;
let previewImages = new Map();

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // URL에서 광고 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    adId = urlParams.get('id');
    
    if (!adId) {
        showError('잘못된 접근입니다.');
        return;
    }
    
    // 인증 상태 확인
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
    });
    
    // 컴포넌트 로드
    await loadComponent('business-header-container', 'components/business-header.html');
    await loadComponent('business-tabs-container', 'components/business-tabs.html');
    
    // 광고 데이터 로드
    await loadAdDetail(adId);
    
    // 이벤트 설정
    setupEvents();
});

// 광고 상세 정보 로드
async function loadAdDetail(adId) {
    try {
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (!snapshot.exists()) {
            showError('광고를 찾을 수 없습니다.');
            return;
        }
        
        currentAd = snapshot.val();
        
        // 조회수 증가
        await updateViewCount(adId, currentAd.views || 0);
        
        // 페이지 타이틀 업데이트
        document.title = `${currentAd.title} - 유흥마블`;
        
        // 컴포넌트에 데이터 설정
        setBusinessHeader(currentAd);
        setDetailContent(currentAd);
        
        // 탭 설정
        setupTabs();
        
        // Quill 에디터 초기화
        initializeQuillEditor();
        
        // 로딩 숨기고 콘텐츠 표시
        document.getElementById('loading-container').style.display = 'none';
        document.querySelector('.business-detail-container').style.display = 'block';
        
    } catch (error) {
        console.error('광고 로드 실패:', error);
        showError('광고를 불러오는데 실패했습니다.');
    }
}

// 조회수 업데이트
async function updateViewCount(adId, currentViews) {
    try {
        await update(ref(rtdb, `advertisements/${adId}`), {
            views: currentViews + 1
        });
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}

// 이벤트 설정
function setupEvents() {
    // 후기 로드 이벤트
    window.addEventListener('loadReviews', () => {
        loadReviews(adId);
    });
    
    // 후기 작성 버튼
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-write-review-tab') {
            handleWriteReview();
        }
    });
    
    // 모달 이벤트
    setupModalEvents();
}

// 모달 이벤트 설정
function setupModalEvents() {
    // 모달 닫기
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.querySelector('.btn-cancel')?.addEventListener('click', closeModal);
    
    // 상세 모달 닫기
    document.getElementById('detail-modal-close')?.addEventListener('click', () => {
        document.getElementById('review-detail-modal').classList.remove('show');
    });
    
    // 수정 버튼
    document.getElementById('btn-edit-review')?.addEventListener('click', handleEditReview);
    
    // 삭제 버튼
    document.getElementById('btn-delete-review')?.addEventListener('click', handleDeleteReview);
    
    // 모달 외부 클릭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('review-modal')) {
            closeModal();
        }
    });
    
    // 폼 제출
    document.getElementById('review-form')?.addEventListener('submit', handleReviewSubmit);
}

// 후기 수정
async function handleEditReview() {
    alert('수정 기능은 준비 중입니다.');
}

// 후기 삭제
async function handleDeleteReview() {
    const reviewId = this.getAttribute('data-review-id');
    
    if (confirm('정말 이 후기를 삭제하시겠습니까?')) {
        try {
            const { remove } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            await remove(ref(rtdb, `advertisements/${adId}/reviews/${reviewId}`));
            
            alert('후기가 삭제되었습니다.');
            document.getElementById('review-detail-modal').classList.remove('show');
        } catch (error) {
            console.error('후기 삭제 실패:', error);
            alert('후기 삭제에 실패했습니다.');
        }
    }
}

// Quill 에디터 초기화
function initializeQuillEditor() {
    if (document.getElementById('editor')) {
        quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                ]
            },
            placeholder: '후기를 작성해주세요...'
        });
        
        quill.on('text-change', function() {
            document.getElementById('review-content').value = quill.root.innerHTML;
        });
        
        const toolbar = quill.getModule('toolbar');
        toolbar.addHandler('image', selectLocalImage);
    }
}

// 이미지 선택
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
                
                quill.insertEmbed(range.index, 'image', base64);
                previewImages.set(base64, file);
                
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

// 후기 작성 처리
function handleWriteReview() {
    if (!currentUser) {
        if (confirm('후기 작성은 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
            const currentUrl = window.location.href;
            window.location.href = `/auth/login.html?returnUrl=${encodeURIComponent(currentUrl)}`;
        }
        return;
    }
    
    document.getElementById('review-modal').classList.add('show');
}

// 모달 닫기
function closeModal() {
    document.getElementById('review-modal').classList.remove('show');
}

// 후기 목록 로드
async function loadReviews(adId) {
    const reviewsList = document.getElementById('reviews-list-tab');
    if (!reviewsList) return;
    
    reviewsList.innerHTML = '<div class="loading">후기를 불러오는 중...</div>';
    
    try {
        // 리얼타임 데이터베이스에서 해당 광고의 후기 가져오기
        const reviewsRef = ref(rtdb, `advertisements/${adId}/reviews`);
        
        onValue(reviewsRef, async (snapshot) => {
            const reviews = [];
            const reviewsData = snapshot.val();
            
            if (reviewsData) {
                // 객체를 배열로 변환
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
    
    // 본인 작성 후기인지 확인
    if (currentUser && currentUser.uid === reviewData.userId) {
        document.getElementById('btn-edit-review').style.display = 'block';
        document.getElementById('btn-delete-review').style.display = 'block';
    } else {
        document.getElementById('btn-edit-review').style.display = 'none';
        document.getElementById('btn-delete-review').style.display = 'none';
    }
    
    // 상세 모달 열기
    document.getElementById('review-detail-modal').classList.add('show');
}

// 후기 제출
async function handleReviewSubmit(e) {
    e.preventDefault();
    
    const reviewTitle = document.getElementById('review-title').value.trim();
    let editorContent = quill.root.innerHTML;
    
    if (!reviewTitle) {
        alert('후기 제목을 입력해주세요.');
        return;
    }
    
    if (quill.getText().trim() === '') {
        alert('후기 내용을 입력해주세요.');
        return;
    }
    
    const submitButton = document.querySelector('.btn-submit');
    submitButton.disabled = true;
    submitButton.textContent = '등록 중...';
    
    try {
        // 이미지 업로드
        const imgElements = quill.root.querySelectorAll('img[data-preview="true"]');
        
        for (const img of imgElements) {
            const base64 = img.src;
            if (previewImages.has(base64)) {
                const file = previewImages.get(base64);
                const uploadedUrl = await uploadSingleImage(
                    file, 
                    `/entmarvel/advertise/${currentUser.uid}/reviews`, 
                    currentUser.uid
                );
                editorContent = editorContent.replace(base64, uploadedUrl);
            }
        }
        
        // 리얼타임 데이터베이스의 해당 광고 하위에 후기 저장
        const reviewsRef = ref(rtdb, `advertisements/${adId}/reviews`);
        const newReviewRef = push(reviewsRef);
        
        const reviewData = {
            userId: currentUser.uid,
            title: reviewTitle,
            content: editorContent,
            createdAt: Date.now()
        };
        
        await set(newReviewRef, reviewData);
        
        alert('후기가 등록되었습니다.');
        closeModal();
        
        // 초기화
        document.getElementById('review-title').value = '';
        quill.setText('');
        previewImages.clear();
        
        // 후기 목록은 onValue 리스너로 자동 업데이트됨
        
    } catch (error) {
        console.error('후기 저장 실패:', error);
        alert('후기 등록에 실패했습니다.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '등록';
    }
}

// 에러 표시
function showError(message) {
    // 로딩 숨기기
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
    
    // 에러 메시지 표시
    const container = document.querySelector('.business-detail-container');
    container.style.display = 'block';
    container.innerHTML = `<div class="error">${message}</div>`;
}