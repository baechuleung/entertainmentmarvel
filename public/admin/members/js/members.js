import { checkAuthFirst, loadAdminHeader } from '/admin/js/admin-header.js';
import { db } from '/js/firebase-config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allMembers = [];

// 페이지 초기화 - 권한 체크 먼저!
(async function init() {
    try {
        // 1. 권한 체크 먼저 (페이지 표시 전)
        const user = await checkAuthFirst();
        
        // 2. 권한 확인 후 헤더 로드
        await loadAdminHeader(user);
        
        // 3. 회원 목록 로드
        loadMembers();
        
        // 4. 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        // 권한 없음 - checkAuthFirst에서 이미 리다이렉트 처리됨
        console.error('권한 체크 실패:', error);
    }
})();

// 회원 목록 로드
async function loadMembers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        allMembers = [];
        
        querySnapshot.forEach((doc) => {
            allMembers.push({ id: doc.id, ...doc.data() });
        });
        
        // 가입일 기준 최신순 정렬
        allMembers.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
        });
        
        displayMembers();
    } catch (error) {
        console.error('회원 목록 로드 실패:', error);
    }
}

// 회원 표시
function displayMembers() {
    const tbody = document.getElementById('members-tbody');
    const filterUserType = document.getElementById('filter-usertype').value;
    const searchText = document.getElementById('search-input').value.toLowerCase();
    
    // 필터링
    let filteredMembers = allMembers.filter(member => {
        if (filterUserType && member.userType !== filterUserType) return false;
        if (searchText && !member.email.toLowerCase().includes(searchText) && 
            !member.nickname?.toLowerCase().includes(searchText)) return false;
        return true;
    });
    
    tbody.innerHTML = filteredMembers.map(member => {
        const userTypeText = {
            'member': '일반회원',
            'business': '업체회원',
            'administrator': '관리자'
        }[member.userType] || member.userType;
        
        const createdDate = member.createdAt ? 
            (member.createdAt.toMillis ? new Date(member.createdAt.toMillis()).toLocaleDateString('ko-KR') : 
             new Date(member.createdAt).toLocaleDateString('ko-KR')) : '-';
        
        const lastLoginDate = member.lastLogin ? 
            (member.lastLogin.toMillis ? new Date(member.lastLogin.toMillis()).toLocaleDateString('ko-KR') : 
             new Date(member.lastLogin).toLocaleDateString('ko-KR')) : '-';
        
        return `
            <tr>
                <td>${member.id.substring(0, 8)}...</td>
                <td>${member.email}</td>
                <td>${member.nickname || '-'}</td>
                <td>
                    <span class="user-type-badge ${member.userType}">${userTypeText}</span>
                </td>
                <td>
                    ${member.userType === 'member' ? `<span class="level-badge">Lv.${member.level || 1}</span>` : '-'}
                </td>
                <td>${createdDate}</td>
                <td>${lastLoginDate}</td>
                <td>
                    <div class="action-buttons">
                        ${member.userType !== 'administrator' ? `
                            <button class="btn btn-warning" onclick="changeUserType('${member.id}', '${member.userType}')">유형변경</button>
                            <button class="btn btn-danger" onclick="deleteMember('${member.id}')">삭제</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 회원 유형 변경
window.changeUserType = async (memberId, currentType) => {
    const newType = prompt('새로운 회원 유형을 입력하세요 (member, business, administrator):', currentType);
    
    if (newType && ['member', 'business', 'administrator'].includes(newType)) {
        try {
            await updateDoc(doc(db, 'users', memberId), {
                userType: newType
            });
            alert('회원 유형이 변경되었습니다.');
            loadMembers();
        } catch (error) {
            alert('회원 유형 변경 실패');
        }
    }
};

// 회원 삭제
window.deleteMember = async (memberId) => {
    if (confirm('정말 이 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        try {
            await deleteDoc(doc(db, 'users', memberId));
            alert('회원이 삭제되었습니다.');
            loadMembers();
        } catch (error) {
            alert('회원 삭제 실패');
        }
    }
};

// 검색 이벤트
function setupEventListeners() {
    document.getElementById('btn-search').addEventListener('click', displayMembers);
    document.getElementById('filter-usertype').addEventListener('change', displayMembers);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') displayMembers();
    });
}