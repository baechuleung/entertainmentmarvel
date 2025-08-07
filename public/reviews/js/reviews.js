import { auth, db, rtdb } from '/js/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, get, remove, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { uploadSingleImage } from '/js/imagekit-upload.js';

// 전역 변수
let currentUser = null;
let userData = null;
let allReviews = [];
let currentFilter = 'all';
let currentReviewData = null;
let currentAdId = null;
let quillEdit = null;
let previewImagesEdit = new Map();

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadBusinessTypes();
    setupEventListeners();
    initQuillEditor();
});

// Quill 에디터 초기화
function initQuillEditor() {
    quillEdit = new Quill('#editor-edit', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['image'],
                ['clean']
            ]
        }
    });

    // 이미지 핸들러
    quillEdit.getModule('toolbar').addHandler('image', function() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        
        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const range = quillEdit.getSelection();
                    const base64 = e.target.result;
                    quillEdit.insertEmbed(range.index, 'image', base64);
                    
                    // 미리보기 이미지 저장
                    const img = quillEdit.root.querySelector(`img[src="${base64}"]`);
                    if (img) {
                        img.setAttribute('data-preview', 'true');
                        previewImagesEdit.set(base64, file);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    });
}

// 인증 상태 확인
function checkAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadUserReviews();
        } else {
            window.location.href = '/auth/login.html';
        }
    });
}

// 사용자 데이터 로드
async function loadUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
        }
    } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
    }
}

// 업종 데이터 로드
async function loadBusinessTypes() {
    try {
        const response = await fetch('/data/business-types.json');
        const data = await response.json();
        
        // 필터 태그 컨테이너
        const filterTags = document.querySelector('.filter-tags');
        if (filterTags) {
            // 기존 태그 모두 제거
            filterTags.innerHTML = '';
            
            // 전체 태그 추가
            const allTag = document.createElement('button');
            allTag.className = 'filter-tag active';
            allTag.setAttribute('data-filter', 'all');
            allTag.textContent = '전체';
            // 이벤트 리스너는 드래그 스크롤에서 처리
            filterTags.appendChild(allTag);
            
            // 업종별 태그 추가
            data.businessTypes.forEach(type => {
                const tag = document.createElement('button');
                tag.className = 'filter-tag';
                tag.setAttribute('data-filter', type.name);
                tag.textContent = type.name;
                // 이벤트 리스너는 드래그 스크롤에서 처리
                filterTags.appendChild(tag);
            });
        }
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 필터 클릭 처리
function handleFilterClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 모든 태그에서 active 제거
    document.querySelectorAll('.filter-tag').forEach(t => 
        t.classList.remove('active')
    );
    
    // 클릭한 태그에 active 추가
    this.classList.add('active');
    
    // 필터 업데이트
    currentFilter = this.getAttribute('data-filter');
    
    // 목록 다시 표시
    displayReviews();
    
    // 클릭한 태그가 보이도록 스크롤
    const container = this.parentElement;
    const tagRect = this.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (tagRect.left < containerRect.left) {
        container.scrollLeft -= containerRect.left - tagRect.left + 20;
    } else if (tagRect.right > containerRect.right) {
        container.scrollLeft += tagRect.right - containerRect.right + 20;
    }
}

// 사용자 후기 로드
async function loadUserReviews() {
    try {
        // 모든 광고에서 현재 사용자의 후기 찾기
        const adsRef = ref(rtdb, 'advertisements');
        const snapshot = await get(adsRef);
        
        allReviews = [];
        
        if (snapshot.exists()) {
            const adsData = snapshot.val();
            
            for (const [adId, adData] of Object.entries(adsData)) {
                if (adData.reviews) {
                    for (const [reviewId, reviewData] of Object.entries(adData.reviews)) {
                        if (reviewData.userId === currentUser.uid) {
                            // 사용자 닉네임 가져오기
                            let authorNickname = userData?.nickname || '익명';
                            
                            allReviews.push({
                                id: reviewId,
                                adId: adId,
                                adTitle: adData.title || '업체명',
                                businessType: adData.businessType || '기타',
                                authorNickname: authorNickname,
                                ...reviewData
                            });
                        }
                    }
                }
            }
        }
        
        // 최신순 정렬
        allReviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        // 총 개수 업데이트
        document.getElementById('total-count').textContent = allReviews.length;
        
        displayReviews();
        
    } catch (error) {
        console.error('후기 로드 실패:', error);
    }
}

// 후기 표시
function displayReviews() {
    const reviewList = document.getElementById('review-list');
    const emptyState = document.getElementById('empty-state');
    
    // 필터링
    let filteredReviews = allReviews;
    if (currentFilter !== 'all') {
        filteredReviews = allReviews.filter(review => 
            review.businessType === currentFilter
        );
    }
    
    if (filteredReviews.length === 0) {
        reviewList.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    reviewList.style.display = 'block';
    emptyState.style.display = 'none';
    
    reviewList.innerHTML = filteredReviews.map(review => {
        // 날짜 포맷
        const reviewDate = review.createdAt ? 
            new Date(review.createdAt).toLocaleDateString('ko-KR') : '';
        
        return `
            <div class="review-item" data-review='${JSON.stringify(review).replace(/'/g, "&apos;")}'>
                <div class="review-header">
                    <div style="flex: 1;">
                        <div class="review-title">
                            ${review.title || '제목 없음'}
                        </div>
                        <div class="review-info">
                            <span class="review-date">${reviewDate}</span>
                            <span class="review-stat">👁 ${review.views || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // 이벤트 리스너 추가
    addReviewEventListeners();
}

// 후기 이벤트 리스너 추가
function addReviewEventListeners() {
    // 후기 아이템 클릭
    document.querySelectorAll('.review-item').forEach(item => {
        item.addEventListener('click', function() {
            const reviewData = JSON.parse(this.getAttribute('data-review'));
            showReviewDetail(reviewData);
        });
    });
}

// 후기 상세 보기
function showReviewDetail(reviewData) {
    currentReviewData = reviewData;
    currentAdId = reviewData.adId;
    
    // 모달에 내용 표시
    document.getElementById('detail-modal-title').textContent = reviewData.title || '제목 없음';
    document.getElementById('review-detail-content').innerHTML = reviewData.content || '';
    
    // 모달 열기
    openModal('review-detail-modal');
}

// 모달 열기
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

// 모달 닫기
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// 후기 수정
async function handleEditReview() {
    if (!currentReviewData) return;
    
    // 수정 모달에 데이터 설정
    document.getElementById('review-edit-title').value = currentReviewData.title || '';
    quillEdit.root.innerHTML = currentReviewData.content || '';
    
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
        const reviewRef = ref(rtdb, `advertisements/${currentAdId}/reviews/${currentReviewData.id}`);
        await update(reviewRef, {
            title: reviewTitle,
            content: editorContent,
            updatedAt: Date.now()
        });
        
        alert('후기가 수정되었습니다.');
        closeModal('review-edit-modal');
        
        // 초기화
        previewImagesEdit.clear();
        
        // 목록 새로고침
        await loadUserReviews();
        
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
    if (!currentReviewData || !currentAdId) return;
    
    if (confirm('정말 이 후기를 삭제하시겠습니까?\n삭제된 후기는 복구할 수 없습니다.')) {
        try {
            // 리얼타임 데이터베이스에서 삭제
            await remove(ref(rtdb, `advertisements/${currentAdId}/reviews/${currentReviewData.id}`));
            
            // Firestore에서 사용자 정보 업데이트 (포인트 차감)
            const userRef = doc(db, 'users', currentUser.uid);
            const pointsToDeduct = -100; // 후기 삭제 시 포인트 차감
            const timestamp = Date.now();
            
            // point_history 맵에 추가할 데이터
            const historyKey = `${timestamp}`;
            const historyData = {
                type: 'used',
                amount: 100,
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
            closeModal('review-detail-modal');
            
            // 목록 새로고침
            await loadUserReviews();
            
        } catch (error) {
            console.error('후기 삭제 실패:', error);
            alert('후기 삭제에 실패했습니다.');
        }
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 모달 닫기 버튼
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            closeModal(modalId);
        });
    });
    
    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.review-modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
    
    // 수정 버튼
    document.getElementById('btn-edit-review')?.addEventListener('click', handleEditReview);
    
    // 삭제 버튼
    document.getElementById('btn-delete-review')?.addEventListener('click', handleDeleteReview);
    
    // 수정 폼 제출
    document.getElementById('review-edit-form')?.addEventListener('submit', handleReviewEditSubmit);
    
    // 취소 버튼
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            closeModal(modalId);
        });
    });
    
    // 필터 태그 드래그 스크롤 설정
    setupFilterDragScroll();
}

// 필터 태그 드래그 스크롤 설정
function setupFilterDragScroll() {
    const filterContainer = document.querySelector('.filter-tags');
    if (!filterContainer) return;
    
    let isDown = false;
    let startX;
    let scrollLeft;
    let isDragging = false;
    let clickTarget = null;
    
    filterContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        isDragging = false;
        clickTarget = e.target;
        filterContainer.style.cursor = 'grabbing';
        startX = e.pageX - filterContainer.offsetLeft;
        scrollLeft = filterContainer.scrollLeft;
        e.preventDefault(); // 텍스트 선택 방지
    });
    
    filterContainer.addEventListener('mouseleave', () => {
        isDown = false;
        isDragging = false;
        filterContainer.style.cursor = 'grab';
    });
    
    filterContainer.addEventListener('mouseup', (e) => {
        isDown = false;
        filterContainer.style.cursor = 'grab';
        
        // 드래그하지 않고 클릭만 한 경우 필터 태그 클릭 처리
        if (!isDragging && clickTarget && clickTarget.classList.contains('filter-tag')) {
            handleFilterClick.call(clickTarget, e);
        }
        
        isDragging = false;
        clickTarget = null;
    });
    
    filterContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        
        const x = e.pageX - filterContainer.offsetLeft;
        const walk = (x - startX) * 2; // 스크롤 속도 조절
        
        // 움직임이 3px 이상일 때만 드래그로 인식
        if (Math.abs(walk) > 3) {
            isDragging = true;
        }
        
        filterContainer.scrollLeft = scrollLeft - walk;
    });
    
    // 기본 커서 스타일
    filterContainer.style.cursor = 'grab';
}