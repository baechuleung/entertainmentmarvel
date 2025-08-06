import { checkAuthFirst, loadAdminHeader } from '/admin/js/admin-header.js';
import { db } from '/js/firebase-config.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allFaqs = [];
let currentUser = null;
let editingFaqId = null;

// 페이지 초기화 - 권한 체크 먼저!
(async function init() {
    try {
        // 1. 권한 체크 먼저 (페이지 표시 전)
        currentUser = await checkAuthFirst();
        
        // 2. 권한 확인 후 헤더 로드
        await loadAdminHeader(currentUser);
        
        // 3. FAQ 목록 로드
        loadFaqs();
        
        // 4. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        // 권한 없음 - checkAuthFirst에서 이미 리다이렉트 처리됨
        console.error('권한 체크 실패:', error);
    }
})();

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
        console.error('FAQ 목록 로드 실패:', error);
    }
}

// FAQ 목록 표시
function displayFaqs() {
    const tbody = document.getElementById('faq-tbody');
    const filterCategory = document.getElementById('filter-category').value;
    const searchText = document.getElementById('search-input').value.toLowerCase();
    
    // 필터링
    let filteredFaqs = allFaqs.filter(faq => {
        if (filterCategory && faq.category !== filterCategory) return false;
        if (searchText && !faq.question.toLowerCase().includes(searchText) && 
            !faq.answer.toLowerCase().includes(searchText)) return false;
        return true;
    });
    
    tbody.innerHTML = filteredFaqs.map((faq, index) => {
        const categoryText = getCategoryText(faq.category);
        const createdDate = faq.createdAt ? 
            new Date(faq.createdAt.toMillis()).toLocaleDateString('ko-KR') : '-';
        
        return `
            <tr>
                <td>${filteredFaqs.length - index}</td>
                <td>
                    <span class="category-badge ${faq.category}">${categoryText}</span>
                </td>
                <td style="text-align: left;">${faq.question}</td>
                <td>${createdDate}</td>
                <td>${faq.views || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-warning" onclick="editFaq('${faq.id}')">수정</button>
                        <button class="btn btn-danger" onclick="deleteFaq('${faq.id}')">삭제</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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

// 새 FAQ 작성
function showNewFaqModal() {
    editingFaqId = null;
    document.getElementById('modal-title').textContent = '새 FAQ 작성';
    document.getElementById('faq-form').reset();
    document.getElementById('faq-modal').classList.add('show');
}

// FAQ 수정
window.editFaq = async (faqId) => {
    editingFaqId = faqId;
    document.getElementById('modal-title').textContent = 'FAQ 수정';
    
    try {
        const faqDoc = await getDoc(doc(db, 'faqs', faqId));
        if (faqDoc.exists()) {
            const faqData = faqDoc.data();
            document.getElementById('faq-category').value = faqData.category;
            document.getElementById('faq-question').value = faqData.question;
            document.getElementById('faq-answer').value = faqData.answer;
            document.getElementById('faq-modal').classList.add('show');
        }
    } catch (error) {
        alert('FAQ를 불러오는데 실패했습니다.');
    }
};

// FAQ 삭제
window.deleteFaq = async (faqId) => {
    if (confirm('정말 삭제하시겠습니까?')) {
        try {
            await deleteDoc(doc(db, 'faqs', faqId));
            alert('삭제되었습니다.');
            loadFaqs();
        } catch (error) {
            alert('삭제에 실패했습니다.');
        }
    }
};

// FAQ 저장
async function saveFaq(e) {
    e.preventDefault();
    
    const category = document.getElementById('faq-category').value;
    const question = document.getElementById('faq-question').value;
    const answer = document.getElementById('faq-answer').value;
    
    const saveButton = document.getElementById('btn-save');
    saveButton.disabled = true;
    saveButton.textContent = '저장 중...';
    
    try {
        const faqData = {
            category,
            question,
            answer,
            updatedAt: serverTimestamp()
        };
        
        if (editingFaqId) {
            // 수정
            await updateDoc(doc(db, 'faqs', editingFaqId), faqData);
            alert('수정되었습니다.');
        } else {
            // 새 FAQ
            faqData.createdAt = serverTimestamp();
            faqData.views = 0;
            await addDoc(collection(db, 'faqs'), faqData);
            alert('저장되었습니다.');
        }
        
        document.getElementById('faq-modal').classList.remove('show');
        loadFaqs();
        
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
    // 새 FAQ 작성 버튼
    document.getElementById('btn-new-faq').addEventListener('click', showNewFaqModal);
    
    // 모달 닫기
    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('faq-modal').classList.remove('show');
    });
    
    document.getElementById('btn-cancel').addEventListener('click', () => {
        document.getElementById('faq-modal').classList.remove('show');
    });
    
    // 폼 제출
    document.getElementById('faq-form').addEventListener('submit', saveFaq);
    
    // 검색 및 필터
    document.getElementById('btn-search').addEventListener('click', displayFaqs);
    document.getElementById('filter-category').addEventListener('change', displayFaqs);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') displayFaqs();
    });
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}