// 파일경로: /tc-calculate/js/tc-settings.js
// 파일이름: tc-settings.js

import { db } from '/js/firebase-config.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { currentUser, setTcSettings, resetToDefaults } from './tc-common.js';

// TC 설정 초기화
export function initializeTcSettings() {
    // 완티 기준 버튼들
    const fullTcButtons = document.querySelectorAll('.setting-btn[data-value]');
    fullTcButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 같은 줄의 버튼들에서 active 제거
            fullTcButtons.forEach(b => b.classList.remove('active'));
            // 클릭한 버튼에 active 추가
            this.classList.add('active');
        });
    });

    // 저장 버튼
    const saveBtn = document.getElementById('saveTcSettings');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTcSettings);
    }
}

// TC 설정 저장
export async function saveTcSettings() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    // 완티 기준 값 가져오기
    const activeFullTc = document.querySelector('.setting-btn.active[data-value]');
    const fullTcValue = activeFullTc ? parseInt(activeFullTc.getAttribute('data-value')) : 60;

    // 반티 기준 값 가져오기
    const halfTcStart = document.getElementById('halfTcStart').value;
    const halfTcEnd = document.getElementById('halfTcEnd').value;

    if (!halfTcStart || !halfTcEnd) {
        alert('반티 기준 시간을 입력해주세요.');
        return;
    }

    // 숫자만 추출 (예: "30분" -> 30)
    const startValue = parseInt(halfTcStart.replace(/[^0-9]/g, ''));
    const endValue = parseInt(halfTcEnd.replace(/[^0-9]/g, ''));

    if (isNaN(startValue) || isNaN(endValue)) {
        alert('올바른 숫자를 입력해주세요.');
        return;
    }

    try {
        // Firestore에 저장
        const tcDocRef = doc(db, 'users', currentUser.uid, 'tc-calculate', 'settings');
        await setDoc(tcDocRef, {
            'full-tc': fullTcValue,
            'half-tc': {
                start: startValue,
                end: endValue
            },
            updatedAt: new Date()
        }, { merge: true });

        // 전역 변수 업데이트
        setTcSettings({
            fullTc: fullTcValue,
            halfTc: { start: startValue, end: endValue }
        });

        alert('TC 기준이 저장되었습니다.');
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
}

// TC 설정 불러오기
export async function loadTcSettings() {
    if (!currentUser) {
        console.log('로그인이 필요합니다.');
        return;
    }

    try {
        const tcDocRef = doc(db, 'users', currentUser.uid, 'tc-calculate', 'settings');
        const docSnap = await getDoc(tcDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('저장된 TC 설정:', data);
            
            // 완티 기준 설정
            if (data['full-tc']) {
                const fullTcButtons = document.querySelectorAll('.setting-btn[data-value]');
                fullTcButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (parseInt(btn.getAttribute('data-value')) === data['full-tc']) {
                        btn.classList.add('active');
                        console.log('완티 버튼 활성화:', data['full-tc']);
                    }
                });
            }

            // 반티 기준 설정
            if (data['half-tc']) {
                const startInput = document.getElementById('halfTcStart');
                const endInput = document.getElementById('halfTcEnd');
                
                if (startInput && endInput) {
                    startInput.value = data['half-tc'].start + '분';
                    endInput.value = data['half-tc'].end + '분';
                    console.log('반티 설정 로드:', data['half-tc']);
                }
            }
            
            // 전역 변수에 저장
            setTcSettings({
                fullTc: data['full-tc'] || 60,
                halfTc: data['half-tc'] || { start: 30, end: 59 }
            });
        } else {
            console.log('저장된 설정이 없습니다. 기본값을 사용합니다.');
            resetToDefaults();
        }
    } catch (error) {
        console.error('설정 불러오기 실패:', error);
        resetToDefaults();
    }
}