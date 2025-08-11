import { currentCategory, setCurrentCategory } from '/main/js/business-header.js';
import { selectCategory } from '/main/js/modules/select-manager.js';
import { updateURLWithFilters } from '/main/js/modules/url-manager.js';

// 업종 데이터 로드 - 기본적으로 카라오케 데이터 로드
export async function loadBusinessTypes() {
    try {
        // 기본적으로 karaoke.json 로드
        const response = await fetch('/data/karaoke.json');
        const data = await response.json();
        
        const categoryContainer = document.getElementById('category-slide-container');
        if (categoryContainer) {
            categoryContainer.innerHTML = '';
            
            // 전체 버튼 추가
            const allBtn = document.createElement('button');
            allBtn.className = 'category-btn active';
            allBtn.textContent = '전체';
            allBtn.setAttribute('data-value', '');
            allBtn.addEventListener('click', function() {
                selectCategory(this);
            });
            categoryContainer.appendChild(allBtn);
            
            // 각 업종 버튼 추가
            data.businessTypes.forEach(type => {
                const btn = document.createElement('button');
                btn.className = 'category-btn';
                btn.textContent = type.name;
                btn.setAttribute('data-value', type.code);
                btn.addEventListener('click', function() {
                    selectCategory(this);
                });
                categoryContainer.appendChild(btn);
            });
        }
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
    }
}

// 카테고리별 업종 데이터 로드
export async function loadCategoryBusinessTypes(categoryType) {
    try {
        let jsonPath = '';
        
        if (categoryType === 'karaoke') {
            jsonPath = '/data/karaoke.json';
        } else if (categoryType === 'gunma') {
            jsonPath = '/data/gunma.json';
        }
        
        const response = await fetch(jsonPath);
        const data = await response.json();
        
        // 가로 슬라이드 컨테이너 찾기
        const categoryContainer = document.getElementById('category-slide-container');
        if (categoryContainer) {
            // 기존 버튼들 제거
            categoryContainer.innerHTML = '';
            
            // 전체 버튼 추가
            const allBtn = document.createElement('button');
            allBtn.className = 'category-btn active';
            allBtn.textContent = '전체';
            allBtn.setAttribute('data-value', '');
            allBtn.addEventListener('click', function() {
                selectCategory(this);
            });
            categoryContainer.appendChild(allBtn);
            
            // 각 업종 버튼 추가
            data.businessTypes.forEach(type => {
                const btn = document.createElement('button');
                btn.className = 'category-btn';
                btn.textContent = type.name;
                btn.setAttribute('data-value', type.code);
                btn.addEventListener('click', function() {
                    selectCategory(this);
                });
                categoryContainer.appendChild(btn);
            });
        }
    } catch (error) {
        console.error('카테고리 업종 데이터 로드 실패:', error);
    }
}

// 카테고리 버튼 설정
export function setupCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category-select-btn');
    
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            // 모든 버튼에서 active 제거
            categoryButtons.forEach(b => b.classList.remove('active'));
            // 클릭한 버튼에 active 추가
            this.classList.add('active');
            
            const category = this.dataset.category;
            setCurrentCategory(category);
            
            if (category === 'all') {
                // 전체 선택 시 기본 업종 로드
                await loadBusinessTypes();
            } else if (category === 'karaoke') {
                // 유흥주점 선택 시
                await loadCategoryBusinessTypes('karaoke');
            } else if (category === 'gunma') {
                // 건전마사지 선택 시
                await loadCategoryBusinessTypes('gunma');
            }
            
            // URL 파라미터 업데이트
            updateURLWithFilters();
            
            // 카테고리 변경 이벤트 발생
            window.dispatchEvent(new CustomEvent('categoryChanged', { 
                detail: { category } 
            }));
        });
    });
}