import { db } from '/js/firebase-config.js';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// 전역 변수
let allFaqs = [];
let currentCategory = 'all';

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadFaqs();
    setupEventListeners();
});

// FAQ 목록 로드
async function loadFaqs() {
    try {
        const faqsQuery = query(collection(db, 'faqs'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(faqsQuery);
        
        allFaqs = [];
        querySnapshot.forEach((doc) => {
            allFaqs.push({ id: doc.id, ...doc.data() });
        });
        
        displayFaqs();
        
    } catch (error) {
        console.error('FAQ 로드 실패:', error);
        showError();
    }
}

// FAQ 표시
function displayFaqs() {
    const faqList = document.getElementById('faq-list');
    const emptyState = document.getElementById('empty-state');
    
    // 카테고리 필터링
    let filteredFaqs = allFaqs;
    if (currentCategory !== 'all') {
        filteredFaqs = allFaqs.filter(faq => faq.category === currentCategory);
    }
    
    if (filteredFaqs.length === 0) {
        faqList.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    faqList.style.display = 'flex';
    emptyState.style.display = 'none';
    
    faqList.innerHTML = filteredFaqs.map(faq => {
        const categoryText = getCategoryText(faq.category);
        
        return `
            <div class="faq-item" data-id="${faq.id}">
                <div class="faq-question">
                    <div class="faq-question-text">
                        <span class="category-badge ${faq.category}">${categoryText}</span>
                        ${faq.question}
                    </div>
                    <span class="faq-arrow">▼</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        ${faq.answer.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // 클릭 이벤트 추가
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', handleFaqClick);
    });
}

// 카테고리 텍스트 변환
function getCategoryText(category) {
    const categoryMap = {
        'general': '일반',
        'service': '서비스',
        'payment': '결제',
        'account': '계정'
    };
    return categoryMap[category] || category;
}

// FAQ 클릭 처리
async function handleFaqClick(e) {
    const faqItem = e.currentTarget.parentElement;
    const faqId = faqItem.getAttribute('data-id');
    
    // 다른 FAQ 닫기
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
        }
    });
    
    // 현재 FAQ 토글
    faqItem.classList.toggle('active');
    
    // 조회수 증가 (선택사항)
    if (faqItem.classList.contains('active')) {
        const faq = allFaqs.find(f => f.id === faqId);
        if (faq) {
            await updateViewCount(faqId, faq.views || 0);
        }
    }
}

// 조회수 업데이트
async function updateViewCount(faqId, currentViews) {
    try {
        await updateDoc(doc(db, 'faqs', faqId), {
            views: currentViews + 1
        });
        
        // 로컬 데이터도 업데이트
        const faq = allFaqs.find(f => f.id === faqId);
        if (faq) {
            faq.views = currentViews + 1;
        }
    } catch (error) {
        console.error('조회수 업데이트 실패:', error);
    }
}

// 에러 표시
function showError() {
    const faqList = document.getElementById('faq-list');
    const emptyState = document.getElementById('empty-state');
    
    faqList.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.innerHTML = '<p>FAQ를 불러오는데 실패했습니다.</p>';
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 카테고리 탭 클릭
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // 모든 탭에서 active 제거
            document.querySelectorAll('.category-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // 현재 탭에 active 추가
            this.classList.add('active');
            
            // 카테고리 업데이트
            currentCategory = this.getAttribute('data-category');
            
            // FAQ 다시 표시
            displayFaqs();
        });
    });
}