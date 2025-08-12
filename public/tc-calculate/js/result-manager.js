// 파일경로: /tc-calculate/js/result-manager.js
// 파일이름: result-manager.js

import { db } from '/js/firebase-config.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { currentUser, generateId, formatDate, createOptionCheckbox } from './tc-common.js';

// 결과 아이템 생성 함수 (공통)
export function createResultItem(resultData, config = {}) {
    const { 
        isSimpleMode = false, 
        onOptionChange = null, 
        onDelete = null,
        onCountChange = null,
        onTimeEdit = null 
    } = config;
    
    // 메인 아이템 컨테이너
    const item = document.createElement('div');
    item.className = 'result-item';
    item.dataset.resultId = resultData.id;
    
    // 삭제 버튼 (맨 위에 위치)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-item-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = () => onDelete ? onDelete(resultData.id) : window.deleteResultItem(resultData.id);
    
    // Pro 모드에서만 상세 정보 표시
    if (!isSimpleMode && resultData.storeInfo !== undefined) {
        const details = document.createElement('div');
        details.className = 'result-item-details';
        
        // NO.숫자를 details 안으로 이동
        const number = document.createElement('span');
        number.className = 'result-item-number';
        number.textContent = `NO.${resultData.number}`;
        details.appendChild(number);
        
        const store = document.createElement('span');
        store.className = 'result-item-store';
        store.textContent = resultData.storeInfo || '미입력';
        details.appendChild(store);
        
        if (resultData.sister) {
            const divider1 = document.createElement('span');
            divider1.className = 'result-divider-text';
            divider1.textContent = ' | ';
            details.appendChild(divider1);
            
            const sisterName = document.createElement('span');
            sisterName.className = 'result-item-sister-name';
            sisterName.textContent = resultData.sister.name;
            details.appendChild(sisterName);
            
            const divider2 = document.createElement('span');
            divider2.className = 'result-divider-text';
            divider2.textContent = ' | ';
            details.appendChild(divider2);
            
            const sisterCompany = document.createElement('span');
            sisterCompany.className = 'result-item-sister-company';
            sisterCompany.textContent = resultData.sister.company;
            details.appendChild(sisterCompany);
        }
        
        item.appendChild(deleteBtn);
        item.appendChild(details);
    } else {
        // Simple 모드에서는 헤더 사용
        const header = document.createElement('div');
        header.className = 'result-item-header';
        
        const info = document.createElement('div');
        info.className = 'result-item-info';
        
        const numberStoreWrapper = document.createElement('div');
        numberStoreWrapper.style.display = 'flex';
        numberStoreWrapper.style.alignItems = 'center';
        numberStoreWrapper.style.gap = '8px';
        
        const number = document.createElement('span');
        number.className = 'result-item-number';
        number.textContent = `NO.${resultData.number}`;
        
        numberStoreWrapper.appendChild(number);
        
        // Simple 모드에서도 storeInfo 표시
        if (resultData.storeInfo && resultData.storeInfo !== '미입력') {
            const divider = document.createElement('span');
            divider.className = 'result-divider-text';
            divider.textContent = ' | ';
            divider.style.color = '#999';
            divider.style.fontSize = '14px';
            divider.style.fontWeight = '700';
            
            const store = document.createElement('span');
            store.className = 'result-item-store';
            store.textContent = resultData.storeInfo;
            store.style.color = '#999';
            store.style.fontSize = '14px';
            store.style.fontWeight = '700';
            
            numberStoreWrapper.appendChild(divider);
            numberStoreWrapper.appendChild(store);
        }
        
        info.appendChild(numberStoreWrapper);
        header.appendChild(info);
        header.appendChild(deleteBtn);
        
        item.appendChild(header);
    }
    
    // 날짜 (클릭 가능)
    const date = document.createElement('div');
    date.className = 'result-item-date';
    
    // 날짜 텍스트
    const dateText = document.createElement('span');
    dateText.textContent = resultData.date;
    date.appendChild(dateText);
    
    // 수정 아이콘 SVG 추가
    const svgString = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.66634 15.9987C2.29967 15.9987 1.98579 15.8681 1.72467 15.607C1.46356 15.3459 1.33301 15.032 1.33301 14.6654C1.33301 14.2987 1.46356 13.9848 1.72467 13.7237C1.98579 13.4626 2.29967 13.332 2.66634 13.332H13.333C13.6997 13.332 14.0136 13.4626 14.2747 13.7237C14.5358 13.9848 14.6663 14.2987 14.6663 14.6654C14.6663 15.032 14.5358 15.3459 14.2747 15.607C14.0136 15.8681 13.6997 15.9987 13.333 15.9987H2.66634ZM3.99967 10.6654H4.93301L10.133 5.48203L9.64967 4.9987L9.18301 4.53203L3.99967 9.73203V10.6654ZM2.66634 11.332V9.4487C2.66634 9.35981 2.68301 9.2737 2.71634 9.19036C2.74967 9.10703 2.79967 9.03203 2.86634 8.96536L10.133 1.71536C10.2552 1.59314 10.3969 1.4987 10.558 1.43203C10.7191 1.36536 10.8886 1.33203 11.0663 1.33203C11.2441 1.33203 11.4163 1.36536 11.583 1.43203C11.7497 1.4987 11.8997 1.5987 12.033 1.73203L12.9497 2.66536C13.083 2.78759 13.1802 2.93203 13.2413 3.0987C13.3025 3.26536 13.333 3.43759 13.333 3.61536C13.333 3.78203 13.3025 3.94592 13.2413 4.10703C13.1802 4.26814 13.083 4.41536 12.9497 4.5487L5.69967 11.7987C5.63301 11.8654 5.55801 11.9154 5.47467 11.9487C5.39134 11.982 5.30523 11.9987 5.21634 11.9987H3.33301C3.14412 11.9987 2.98579 11.9348 2.85801 11.807C2.73023 11.6793 2.66634 11.5209 2.66634 11.332ZM10.133 5.48203L9.64967 4.9987L9.18301 4.53203L10.133 5.48203Z" fill="white"/>
    </svg>`;
    date.insertAdjacentHTML('beforeend', svgString);
    
    if (onTimeEdit) {
        date.style.cursor = 'pointer';
        date.title = '클릭하여 시간 수정';
        date.onclick = (e) => {
            e.stopPropagation();
            console.log('날짜 클릭됨, resultId:', resultData.id);
            onTimeEdit(resultData.id);
        };
    }
    item.appendChild(date);
    
    // 시간
    const time = document.createElement('div');
    time.className = 'result-item-time';
    time.textContent = `총 시간 ${resultData.hours}시간 ${resultData.minutes}분`;
    
    // 카운트
    const counts = document.createElement('div');
    counts.className = 'result-item-counts';
    
    if (isSimpleMode) {
        // Simple 모드: 편집 가능 (Pro 모드와 동일하게)
        const fullTc = document.createElement('div');
        fullTc.className = 'result-count';
        fullTc.innerHTML = `✓ 완티 <input type="number" class="count-input full-tc-input" value="${resultData.fullTcCount}" min="0" data-result-id="${resultData.id}">개`;
        
        const halfTc = document.createElement('div');
        halfTc.className = 'result-count';
        halfTc.innerHTML = `✓ 반티 <input type="number" class="count-input half-tc-input" value="${resultData.halfTcCount}" min="0" data-result-id="${resultData.id}">개`;
        
        counts.appendChild(fullTc);
        counts.appendChild(halfTc);
        
        // 카운트 input 이벤트 리스너 추가
        if (onCountChange) {
            const fullTcInput = fullTc.querySelector('.full-tc-input');
            const halfTcInput = halfTc.querySelector('.half-tc-input');
            
            fullTcInput.addEventListener('change', (e) => {
                const newValue = parseInt(e.target.value) || 0;
                onCountChange(resultData.id, 'fullTcCount', newValue);
            });
            
            halfTcInput.addEventListener('change', (e) => {
                const newValue = parseInt(e.target.value) || 0;
                onCountChange(resultData.id, 'halfTcCount', newValue);
            });
        }
    } else {
        // Pro 모드: 편집 가능
        const fullTc = document.createElement('div');
        fullTc.className = 'result-count';
        fullTc.innerHTML = `✓ 완티 <input type="number" class="count-input full-tc-input" value="${resultData.fullTcCount}" min="0" data-result-id="${resultData.id}">개`;
        
        const halfTc = document.createElement('div');
        halfTc.className = 'result-count';
        halfTc.innerHTML = `✓ 반티 <input type="number" class="count-input half-tc-input" value="${resultData.halfTcCount}" min="0" data-result-id="${resultData.id}">개`;
        
        counts.appendChild(fullTc);
        counts.appendChild(halfTc);
        
        // 카운트 input 이벤트 리스너 추가
        if (onCountChange) {
            const fullTcInput = fullTc.querySelector('.full-tc-input');
            const halfTcInput = halfTc.querySelector('.half-tc-input');
            
            fullTcInput.addEventListener('change', (e) => {
                const newValue = parseInt(e.target.value) || 0;
                onCountChange(resultData.id, 'fullTcCount', newValue);
            });
            
            halfTcInput.addEventListener('change', (e) => {
                const newValue = parseInt(e.target.value) || 0;
                onCountChange(resultData.id, 'halfTcCount', newValue);
            });
        }
    }
    
    // 옵션 추가
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'result-item-options';
    
    const optionLabels = ['차비', '지명', '팅김'];
    const optionValues = ['차비', '지명', '팅김'];
    
    optionLabels.forEach((label, index) => {
        const checked = resultData.options && resultData.options[optionValues[index]] || false;
        const changeHandler = onOptionChange ? 
            (e) => onOptionChange(resultData.id, optionValues[index], e.target.checked) : 
            () => {};
        
        const checkbox = createOptionCheckbox(label, optionValues[index], checked, changeHandler);
        optionsContainer.appendChild(checkbox);
    });
    
    // 아이템에 모든 요소 추가
    item.appendChild(time);
    item.appendChild(counts);
    item.appendChild(optionsContainer);
    
    return item;
}

// Firestore에 결과 저장
export async function saveResultsToFirestore(results, collectionName = 'results') {
    if (!currentUser) {
        console.log('로그인이 필요합니다.');
        return;
    }
    
    try {
        // 저장 전 데이터 확인
        console.log('Firestore에 저장할 데이터:', results);
        console.log('첫 번째 결과의 startTime:', results[0]?.startTime);
        console.log('첫 번째 결과의 endTime:', results[0]?.endTime);
        
        const resultsDocRef = doc(db, 'users', currentUser.uid, 'tc-calculate', collectionName);
        await setDoc(resultsDocRef, {
            results: results,
            updatedAt: new Date()
        });
        
        console.log(`${collectionName} 저장 완료`);
        
        // 저장 후 데이터 다시 읽어서 확인
        const docSnap = await getDoc(resultsDocRef);
        if (docSnap.exists()) {
            const savedData = docSnap.data();
            console.log('저장된 데이터 확인:', savedData.results[0]);
            console.log('저장된 startTime:', savedData.results[0]?.startTime);
            console.log('저장된 endTime:', savedData.results[0]?.endTime);
        }
    } catch (error) {
        console.error('결과 저장 실패:', error);
    }
}

// Firestore에서 결과 불러오기
export async function loadResultsFromFirestore(collectionName = 'results') {
    if (!currentUser) {
        console.log('로그인이 필요합니다.');
        return null;
    }
    
    try {
        const resultsDocRef = doc(db, 'users', currentUser.uid, 'tc-calculate', collectionName);
        const docSnap = await getDoc(resultsDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('Firestore에서 불러온 원본 데이터:', data.results);
            console.log('첫 번째 결과의 startTime:', data.results[0]?.startTime);
            console.log('첫 번째 결과의 endTime:', data.results[0]?.endTime);
            return data.results || [];
        }
        return [];
    } catch (error) {
        console.error('결과 불러오기 실패:', error);
        return [];
    }
}

// 결과 번호 재정렬
export function renumberResults(results) {
    // 최신순으로 정렬
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 번호 재정렬
    results.forEach((result, index) => {
        result.number = results.length - index;
    });
    
    return results;
}

// 가장 큰 번호 찾기
export function getMaxResultNumber(results) {
    if (results.length === 0) return 0;
    return Math.max(...results.map(r => r.number || 0));
}