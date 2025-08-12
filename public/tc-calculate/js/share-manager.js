// 파일경로: /tc-calculate/js/share-manager.js
// 파일이름: share-manager.js

// 공유 모달 표시 함수
export function showShareModal(blob) {
    console.log('showShareModal 함수 호출됨');
    
    // 모달 컨테이너 생성
    const modal = document.createElement('div');
    modal.className = 'share-options-modal';
    
    // 모달 내용 컨테이너
    const content = document.createElement('div');
    content.className = 'share-options-content';
    
    // 제목
    const title = document.createElement('h3');
    title.textContent = '공유하기';
    content.appendChild(title);
    
    // 버튼 컨테이너
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'share-buttons';
    
    // 이미지 저장 버튼
    const downloadBtn = createShareButton('💾', '이미지 저장', () => {
        downloadImage(blob);
        document.body.removeChild(modal);
    });
    buttonContainer.appendChild(downloadBtn);
    
    // 이미지 복사 버튼
    const copyBtn = createShareButton('📋', '이미지 복사', async () => {
        await copyImageToClipboard(blob);
        document.body.removeChild(modal);
    });
    buttonContainer.appendChild(copyBtn);
    
    // 카카오톡 공유 버튼
    const kakaoBtn = createShareButton('💬', '카카오톡 공유', async () => {
        await shareToKakao(blob);
        document.body.removeChild(modal);
    });
    buttonContainer.appendChild(kakaoBtn);
    
    content.appendChild(buttonContainer);
    
    // 닫기 버튼
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-modal-btn';
    closeBtn.textContent = '닫기';
    closeBtn.onclick = () => document.body.removeChild(modal);
    content.appendChild(closeBtn);
    
    modal.appendChild(content);
    
    // 모달 외부 클릭 시 닫기
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    document.body.appendChild(modal);
    console.log('모달이 DOM에 추가됨');
}

// 공유 버튼 생성
function createShareButton(icon, text, onclick) {
    const btn = document.createElement('button');
    btn.className = 'share-option-btn';
    const span = document.createElement('span');
    span.textContent = icon;
    btn.appendChild(span);
    btn.appendChild(document.createTextNode(text));
    btn.onclick = onclick;
    return btn;
}

// 이미지 다운로드
function downloadImage(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tc-result-${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('이미지가 저장되었습니다.');
}

// 클립보드에 이미지 복사
async function copyImageToClipboard(blob) {
    try {
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);
        alert('이미지가 클립보드에 복사되었습니다!\n카카오톡이나 다른 메신저에 붙여넣기(Ctrl+V)하세요.');
    } catch (err) {
        console.error('복사 실패:', err);
        alert('이미지 복사에 실패했습니다.\n대신 이미지를 저장해서 사용해주세요.');
    }
}

// 카카오톡 공유
async function shareToKakao(blob) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 모바일: 네이티브 공유 사용
        const file = new File([blob], 'tc-result.png', { type: 'image/png' });
        
        if (navigator.share) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'TC 계산 결과',
                    text: '반티완티 계산 결과입니다.'
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    // 공유 실패 시 클립보드 복사
                    await copyImageToClipboard(blob);
                }
            }
        } else {
            // Web Share API 미지원 시
            alert('이 브라우저는 직접 공유를 지원하지 않습니다.\n이미지 복사나 저장을 사용해주세요.');
        }
    } else {
        // PC: 이미지 복사 후 안내
        await copyImageToClipboard(blob);
    }
}

// 캡쳐 및 공유 (공통)
export async function captureAndShare(container, buttonElement, options = {}) {
    const { includeWatermark = true, captureElement = null, onComplete = null } = options;
    
    // html2canvas 라이브러리 동적 로드
    if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
            script.onload = resolve;
        });
    }
    
    try {
        // 로딩 표시
        const originalText = buttonElement.textContent;
        buttonElement.textContent = '캡쳐 중...';
        buttonElement.disabled = true;
        
        // 캡쳐할 요소 결정
        const elementToCapture = captureElement || container;
        
        console.log('캡쳐 시작');
        
        const canvas = await html2canvas(elementToCapture, {
            backgroundColor: '#1E1E1E',
            scale: 2,
            logging: false,
            useCORS: true
        });
        
        console.log('캡쳐 완료, 캔버스 크기:', canvas.width, 'x', canvas.height);
        
        let finalCanvas = canvas;
        
        if (includeWatermark) {
            // 워터마크 추가
            finalCanvas = await addWatermark(canvas);
        }
        
        // 캔버스를 Blob으로 변환
        await new Promise((resolve) => {
            finalCanvas.toBlob(async (blob) => {
                if (blob) {
                    console.log('Blob 생성 성공');
                    if (onComplete) {
                        onComplete(blob);
                    } else {
                        showShareModal(blob);
                    }
                } else {
                    console.error('Blob 생성 실패');
                    alert('이미지 생성에 실패했습니다.');
                }
                resolve();
            }, 'image/png');
        });
        
    } catch (error) {
        console.error('캡쳐 실패:', error);
        alert('이미지 캡쳐에 실패했습니다.');
    } finally {
        // 버튼 원상복구
        buttonElement.textContent = originalText;
        buttonElement.disabled = false;
    }
}

// 워터마크 추가
async function addWatermark(canvas) {
    const watermarkHeight = 100; // 워터마크 영역 높이
    
    // 새로운 캔버스 생성 (원본 + 워터마크 여백)
    const watermarkCanvas = document.createElement('canvas');
    watermarkCanvas.width = canvas.width;
    watermarkCanvas.height = canvas.height + watermarkHeight;
    const ctx = watermarkCanvas.getContext('2d');
    
    // 배경색 설정
    ctx.fillStyle = '#1E1E1E';
    ctx.fillRect(0, 0, watermarkCanvas.width, watermarkCanvas.height);
    
    // 원본 이미지 그리기
    ctx.drawImage(canvas, 0, 0);
    
    // 하단 워터마크 영역
    console.log('워터마크 추가 시작');
    
    // 워터마크 배경 (약간 어두운 배경)
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, canvas.height, watermarkCanvas.width, watermarkHeight);
    
    // 워터마크 텍스트
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const watermarkY = canvas.height + watermarkHeight / 2;
    ctx.fillText('구글에 밤다를 검색 - 채용정보, 반티완티, 제휴정보, 오늘의운세', watermarkCanvas.width / 2, watermarkY);
    
    console.log('워터마크 추가 완료');
    
    return watermarkCanvas;
}

// 텍스트 공유 모달 (Simple 모드 전용)
export function showShareModalWithText(blob, resultsList) {
    console.log('showShareModalWithText 함수 호출됨');
    
    // 모달 컨테이너 생성
    const modal = document.createElement('div');
    modal.className = 'share-options-modal';
    
    // 모달 내용 컨테이너
    const content = document.createElement('div');
    content.className = 'share-options-content';
    
    // 제목
    const title = document.createElement('h3');
    title.textContent = '공유하기';
    content.appendChild(title);
    
    // 버튼 컨테이너
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'share-buttons';
    
    // 이미지 저장 버튼
    const downloadBtn = createShareButton('💾', '이미지 저장', () => {
        downloadImage(blob);
        document.body.removeChild(modal);
    });
    buttonContainer.appendChild(downloadBtn);
    
    // 이미지 복사 버튼
    const copyBtn = createShareButton('📋', '이미지 복사', async () => {
        await copyImageToClipboard(blob);
        document.body.removeChild(modal);
    });
    buttonContainer.appendChild(copyBtn);
    
    // 카카오톡 공유 버튼
    const kakaoBtn = createShareButton('💬', '카카오톡 공유', async () => {
        await shareToKakao(blob);
        document.body.removeChild(modal);
    });
    buttonContainer.appendChild(kakaoBtn);
    
    // 텍스트 복사 버튼 (Simple 모드 전용)
    const textBtn = createShareButton('📝', '텍스트 복사', () => {
        let shareText = '📊 TC 계산 결과\n\n';
        resultsList.forEach((result) => {
            shareText += `【NO.${result.number}】 ${result.date}\n`;
            shareText += `⏱ ${result.hours}시간 ${result.minutes}분\n`;
            shareText += `✓ 완티: ${result.fullTcCount}개, 반티: ${result.halfTcCount}개\n`;
            const options = [];
            if (result.options && result.options['차비']) options.push('차비');
            if (result.options && result.options['지명']) options.push('지명');
            if (result.options && result.options['팅김']) options.push('팅김');
            if (options.length > 0) shareText += `✓ ${options.join(', ')}\n`;
            shareText += '\n';
        });
        
        navigator.clipboard.writeText(shareText).then(() => {
            alert('텍스트가 클립보드에 복사되었습니다!');
            document.body.removeChild(modal);
        });
    });
    buttonContainer.appendChild(textBtn);
    
    content.appendChild(buttonContainer);
    
    // 닫기 버튼
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-modal-btn';
    closeBtn.textContent = '닫기';
    closeBtn.onclick = () => document.body.removeChild(modal);
    content.appendChild(closeBtn);
    
    modal.appendChild(content);
    
    // 모달 외부 클릭 시 닫기
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    document.body.appendChild(modal);
    console.log('모달이 DOM에 추가됨');
}