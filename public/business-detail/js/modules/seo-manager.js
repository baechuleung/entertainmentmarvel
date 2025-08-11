// SEO 태그 동적 업데이트
export function updateSEOTags(data, adId) {
    // 타이틀 생성
    const titleParts = [];
    if (data.businessName) titleParts.push(data.businessName);
    if (data.region) titleParts.push(data.region);
    if (data.city) titleParts.push(data.city);
    if (data.businessType) titleParts.push(data.businessType);
    
    const title = titleParts.length > 0 
        ? titleParts.join(' ') + ' - 유흥마블'
        : '업체 상세 - 유흥마블';
    
    document.title = title;
    
    // author 메타 태그 다음에 SEO 태그들을 삽입하기 위한 기준점
    const authorMeta = document.querySelector('meta[name="author"]');
    
    // description 메타 태그
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        // author 태그 바로 다음에 삽입
        if (authorMeta && authorMeta.nextSibling) {
            authorMeta.parentNode.insertBefore(metaDescription, authorMeta.nextSibling);
        } else {
            document.head.appendChild(metaDescription);
        }
    }
    
    const descriptionParts = [];
    if (data.businessName) descriptionParts.push(data.businessName);
    if (data.region && data.city) {
        descriptionParts.push(`${data.region} ${data.city} 위치`);
    }
    if (data.businessType) descriptionParts.push(data.businessType);
    
    const description = descriptionParts.length > 0
        ? descriptionParts.join(', ') + ' 정보를 확인하세요. 유흥마블'
        : '유흥마블 업체 상세 정보';
    
    metaDescription.content = description;
    
    // keywords 메타 태그
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        // description 태그 바로 다음에 삽입
        if (metaDescription && metaDescription.nextSibling) {
            metaDescription.parentNode.insertBefore(metaKeywords, metaDescription.nextSibling);
        } else {
            document.head.appendChild(metaKeywords);
        }
    }
    
    const keywords = [];
    if (data.businessName) keywords.push(data.businessName);
    if (data.businessType) keywords.push(data.businessType);
    if (data.region) keywords.push(data.region);
    if (data.city) keywords.push(data.city);
    if (data.category) keywords.push(data.category);
    keywords.push('유흥마블', '유흥', '업소');
    
    metaKeywords.content = keywords.join(', ');
    
    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        // keywords 태그 바로 다음에 삽입
        if (metaKeywords && metaKeywords.nextSibling) {
            metaKeywords.parentNode.insertBefore(canonical, metaKeywords.nextSibling);
        } else {
            document.head.appendChild(canonical);
        }
    }
    canonical.href = `${window.location.origin}/business-detail/business-detail.html?id=${adId}`;
    
    // Open Graph 태그
    updateOpenGraphTags(title, description, data.thumbnail);
}

// Open Graph 태그 업데이트
function updateOpenGraphTags(title, description, image) {
    // og:type (가장 먼저)
    let ogType = document.querySelector('meta[property="og:type"]');
    if (!ogType) {
        ogType = document.createElement('meta');
        ogType.setAttribute('property', 'og:type');
        // canonical 다음에 삽입
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && canonical.nextSibling) {
            canonical.parentNode.insertBefore(ogType, canonical.nextSibling);
        } else {
            document.head.appendChild(ogType);
        }
    }
    ogType.content = 'business.business';
    
    // og:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        // og:type 다음에 삽입
        if (ogType && ogType.nextSibling) {
            ogType.parentNode.insertBefore(ogTitle, ogType.nextSibling);
        } else {
            document.head.appendChild(ogTitle);
        }
    }
    ogTitle.content = title;
    
    // og:description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        // og:title 다음에 삽입
        if (ogTitle && ogTitle.nextSibling) {
            ogTitle.parentNode.insertBefore(ogDescription, ogTitle.nextSibling);
        } else {
            document.head.appendChild(ogDescription);
        }
    }
    ogDescription.content = description;
    
    // og:image
    if (image) {
        let ogImage = document.querySelector('meta[property="og:image"]');
        if (!ogImage) {
            ogImage = document.createElement('meta');
            ogImage.setAttribute('property', 'og:image');
            // og:description 다음에 삽입
            if (ogDescription && ogDescription.nextSibling) {
                ogDescription.parentNode.insertBefore(ogImage, ogDescription.nextSibling);
            } else {
                document.head.appendChild(ogImage);
            }
        }
        ogImage.content = image;
    }
    
    // og:url
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
        ogUrl = document.createElement('meta');
        ogUrl.setAttribute('property', 'og:url');
        // og:image가 있으면 그 다음, 없으면 og:description 다음
        const ogImage = document.querySelector('meta[property="og:image"]');
        const insertAfter = ogImage || ogDescription;
        if (insertAfter && insertAfter.nextSibling) {
            insertAfter.parentNode.insertBefore(ogUrl, insertAfter.nextSibling);
        } else {
            document.head.appendChild(ogUrl);
        }
    }
    ogUrl.content = window.location.href;
}