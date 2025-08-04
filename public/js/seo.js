// IIFE(즉시 실행 함수 표현식)로 감싸서 전역 스코프 오염 방지
(function() {
    // 이미 SEO가 존재하는지 확인
    if (window.SEO) {
        console.log('SEO가 이미 초기화되어 있습니다.');
        return;
    }

    window.SEO = {
        // 기본 설정
        defaults: {
            image: '/img/social-thumbnail.png',
            siteName: '유흥마블',
            locale: 'ko_KR',
            type: 'website',
            domain: 'https://yourdomain.com' // 실제 도메인으로 변경 필요
        },

        // HTML에서 기존 메타 정보 읽기
        readExistingMeta: function() {
            const data = {
                // title 태그에서 읽기
                title: document.title || '유흥마블',
                
                // meta description에서 읽기
                description: document.querySelector('meta[name="description"]')?.content || '',
                
                // meta keywords에서 읽기
                keywords: document.querySelector('meta[name="keywords"]')?.content || '',
                
                // meta author에서 읽기
                author: document.querySelector('meta[name="author"]')?.content || '유흥마블',
                
                // 현재 URL
                url: window.location.href
            };
            
            return data;
        },

        // Canonical URL 생성 및 추가
        generateCanonical: function() {
            // 이미 canonical이 있는지 확인
            const existingCanonical = document.querySelector('link[rel="canonical"]');
            if (existingCanonical) {
                console.log('Canonical 링크가 이미 존재합니다.');
                return;
            }

            // Canonical URL 생성
            const canonicalURL = this.defaults.domain + window.location.pathname;
            
            // Canonical 링크 태그 생성
            const canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            canonicalLink.href = canonicalURL;
            document.head.appendChild(canonicalLink);
            
            console.log('Canonical URL 추가:', canonicalURL);
        },

        // Open Graph와 Twitter Card 태그 자동 생성
        generateSocialTags: function() {
            // HTML에서 기존 메타 정보 읽기
            const pageData = this.readExistingMeta();
            const config = { ...this.defaults, ...pageData };
            
            // Open Graph 태그가 이미 있는지 확인
            const hasOG = document.querySelector('meta[property="og:title"]');
            
            // 이미 있으면 생성하지 않음
            if (hasOG) {
                console.log('Open Graph 태그가 이미 존재합니다.');
                return;
            }
            
            // Open Graph 태그 생성
            this.setMetaTag('og:type', config.type, 'property');
            this.setMetaTag('og:title', config.title, 'property');
            this.setMetaTag('og:description', config.description, 'property');
            this.setMetaTag('og:image', config.image, 'property');
            this.setMetaTag('og:url', config.url, 'property');
            this.setMetaTag('og:site_name', config.siteName, 'property');
            this.setMetaTag('og:locale', config.locale, 'property');
            
            // Twitter Card 태그 생성
            this.setMetaTag('twitter:card', 'summary_large_image');
            this.setMetaTag('twitter:title', config.title);
            this.setMetaTag('twitter:description', config.description);
            this.setMetaTag('twitter:image', config.image);
            
            console.log('SEO 태그 자동 생성 완료:', config.title);
        },

        // 메타 태그 설정 헬퍼
        setMetaTag: function(name, content, type = 'name') {
            if (!content) return;
            
            let meta = document.querySelector(`meta[${type}="${name}"]`);
            
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute(type, name);
                document.head.appendChild(meta);
            }
            
            meta.setAttribute('content', content);
        },

        // 동적 업데이트 (필요한 경우)
        updateSEO: function(data) {
            // title 업데이트
            if (data.title) {
                document.title = data.title;
                this.setMetaTag('og:title', data.title, 'property');
                this.setMetaTag('twitter:title', data.title);
            }
            
            // description 업데이트
            if (data.description) {
                this.setMetaTag('description', data.description);
                this.setMetaTag('og:description', data.description, 'property');
                this.setMetaTag('twitter:description', data.description);
            }
            
            // keywords 업데이트
            if (data.keywords) {
                this.setMetaTag('keywords', data.keywords);
            }
            
            // author 업데이트
            if (data.author) {
                this.setMetaTag('author', data.author);
            }
            
            // image 업데이트
            if (data.image) {
                this.setMetaTag('og:image', data.image, 'property');
                this.setMetaTag('twitter:image', data.image);
            }
        },

        // 초기화
        init: function() {
            this.generateCanonical();
            this.generateSocialTags();
        }
    };

    // 자동 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.SEO.init();
        });
    } else {
        window.SEO.init();
    }
})();