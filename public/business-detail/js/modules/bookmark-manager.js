import { rtdb, db } from '/js/firebase-config.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { currentUser, isBookmarked, setIsBookmarked, adId, currentAd } from '/business-detail/js/business-detail.js';

// 즐겨찾기 상태 확인
export async function checkBookmarkStatus() {
    if (!currentUser || !adId) return;
    
    try {
        // 광고의 bookmarks 배열에서 현재 사용자 uid 확인
        const adRef = ref(rtdb, `advertisements/${adId}`);
        const snapshot = await get(adRef);
        
        if (snapshot.exists()) {
            const adData = snapshot.val();
            const bookmarks = adData.bookmarks || [];
            setIsBookmarked(bookmarks.includes(currentUser.uid));
            updateBookmarkButton();
        }
    } catch (error) {
        console.error('즐겨찾기 상태 확인 실패:', error);
    }
}

// 즐겨찾기 버튼 설정
export function setupBookmarkButton() {
    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (!bookmarkBtn) return;
    
    bookmarkBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = '/auth/login.html';
            return;
        }
        
        try {
            const adRef = ref(rtdb, `advertisements/${adId}`);
            const snapshot = await get(adRef);
            
            if (snapshot.exists()) {
                const adData = snapshot.val();
                const bookmarks = adData.bookmarks || [];
                let updatedBookmarks;
                
                if (isBookmarked) {
                    // 즐겨찾기 제거
                    updatedBookmarks = bookmarks.filter(uid => uid !== currentUser.uid);
                    setIsBookmarked(false);
                } else {
                    // 즐겨찾기 추가
                    updatedBookmarks = [...bookmarks, currentUser.uid];
                    setIsBookmarked(true);
                }
                
                // Firebase 업데이트
                await update(adRef, {
                    bookmarks: updatedBookmarks
                });
                
                // Firestore 사용자 데이터 업데이트
                const userDocRef = doc(db, 'users', currentUser.uid);
                if (isBookmarked) {
                    await updateDoc(userDocRef, {
                        bookmarks: arrayUnion(adId)
                    });
                } else {
                    await updateDoc(userDocRef, {
                        bookmarks: arrayRemove(adId)
                    });
                }
                
                alert(isBookmarked ? '즐겨찾기에 추가되었습니다.' : '즐겨찾기에서 제거되었습니다.');
                
                // 즐겨찾기 수 업데이트
                const bookmarkCount = document.getElementById('bookmark-count');
                if (bookmarkCount) {
                    bookmarkCount.textContent = updatedBookmarks.length;
                }
            }
            
            updateBookmarkButton();
        } catch (error) {
            console.error('즐겨찾기 처리 실패:', error);
            alert('즐겨찾기 처리 중 오류가 발생했습니다.');
        }
    });
    
    // 전화 문의하기 버튼
    const callBtn = document.getElementById('btn-call');
    if (callBtn && currentAd) {
        callBtn.addEventListener('click', async () => {
            if (currentAd.phone) {
                // 문의 카운트 증가
                try {
                    const adRef = ref(rtdb, `advertisements/${adId}`);
                    const snapshot = await get(adRef);
                    const currentInquiries = snapshot.val().inquiries || 0;
                    
                    await update(adRef, {
                        inquiries: currentInquiries + 1,
                        lastInquiryDate: new Date().toISOString()
                    });
                    
                    console.log('문의 카운트 증가 완료');
                } catch (error) {
                    console.error('문의 카운트 업데이트 실패:', error);
                }
                
                // 전화 걸기
                window.location.href = `tel:${currentAd.phone}`;
            } else {
                alert('전화번호가 등록되지 않았습니다.');
            }
        });
    }
}

// 즐겨찾기 버튼 UI 업데이트
function updateBookmarkButton() {
    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (!bookmarkBtn) return;
    
    const starOutline = bookmarkBtn.querySelector('.star-outline');
    const starFilled = bookmarkBtn.querySelector('.star-filled');
    const bookmarkText = bookmarkBtn.querySelector('.bookmark-text');
    
    if (isBookmarked) {
        bookmarkBtn.classList.add('bookmarked');
        if (starOutline) starOutline.style.display = 'none';
        if (starFilled) starFilled.style.display = 'block';
        if (bookmarkText) bookmarkText.textContent = '즐겨찾기';
    } else {
        bookmarkBtn.classList.remove('bookmarked');
        if (starOutline) starOutline.style.display = 'block';
        if (starFilled) starFilled.style.display = 'none';
        if (bookmarkText) bookmarkText.textContent = '즐겨찾기';
    }
}