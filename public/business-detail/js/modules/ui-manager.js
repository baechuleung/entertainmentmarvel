// 업체 헤더 설정
export function setBusinessHeader(data) {
    const thumbnail = document.getElementById('business-thumbnail');
    const businessName = document.getElementById('business-name');
    const businessType = document.getElementById('business-type');
    const businessLocation = document.getElementById('business-location');
    const viewCount = document.getElementById('view-count');
    const reviewCount = document.getElementById('review-count');
    const bookmarkCount = document.getElementById('bookmark-count');
    
    if (thumbnail) {
        const thumbnailSrc = data.thumbnail || 
            (data.businessTypeCode ? `/img/business-type/${data.businessTypeCode}.png` : null);
            
        if (thumbnailSrc) {
            thumbnail.src = thumbnailSrc;
            thumbnail.style.display = 'block';
            thumbnail.onerror = function() {
                this.style.display = 'none';
            };
        }
    }
    
    // businessName과 author를 조합
    if (businessName) businessName.textContent = `${data.businessName || ''} - ${data.author || ''}`;
    if (businessType) businessType.textContent = `${data.businessType || ''}`;
    if (businessLocation) businessLocation.textContent = `${data.region || ''} ${data.city || ''}`;
    
    // 통계 정보 표시
    if (viewCount) viewCount.textContent = data.views || 0;
    if (reviewCount) reviewCount.textContent = data.reviewCount || 0;
    if (bookmarkCount) {
        const bookmarks = data.bookmarks || [];
        bookmarkCount.textContent = Array.isArray(bookmarks) ? bookmarks.length : 0;
    }
}

// 상세내용 설정
export function setDetailContent(data) {
    const detailContent = document.getElementById('detail-content');
    
    if (detailContent) {
        detailContent.innerHTML = data.content || '';
    }
}