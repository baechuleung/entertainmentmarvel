// 파일경로: /tc-calculate/js/tc-calculator.js
// 파일이름: tc-calculator.js

import { getTcSettings } from './tc-common.js';

// 시간 차이 계산
export function calculateTimeDifference(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    // 만약 종료 시간이 시작 시간보다 작으면 다음날로 처리
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60; // 24시간 추가
    }
    
    // 시작 시간과 종료 시간이 같으면 24시간으로 처리
    if (totalMinutes === 0) {
        totalMinutes = 24 * 60;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return { hours, minutes, totalMinutes };
}

// TC 계산
export function calculateTC(totalMinutes) {
    const settings = getTcSettings();
    
    let fullTcCount = 0;
    let halfTcCount = 0;
    let remainingMinutes = totalMinutes;
    
    // halfTc.end를 초과한 시간부터 완티 계산 시작
    while (remainingMinutes > settings.halfTc.end) {
        fullTcCount++;
        remainingMinutes -= settings.fullTc;
    }
    
    // 남은 시간이 halfTc 범위에 있으면 반티 1개
    if (remainingMinutes >= settings.halfTc.start && remainingMinutes <= settings.halfTc.end) {
        halfTcCount = 1;
    }
    
    return { fullTcCount, halfTcCount };
}

// 시간 유효성 검사 (Simple 모드용)
export function validateTime(startTime, endTime) {
    if (!startTime || !endTime || startTime === '00:00' || endTime === '00:00') {
        alert('시작 시간과 마감 시간을 모두 선택해주세요.');
        return false;
    }
    return true;
}

// 시간 유효성 검사 (Pro 모드용 - 00:00 허용)
export function validateTimeProMode(startTime, endTime) {
    if (!startTime || !endTime) {
        alert('시작 시간과 마감 시간을 모두 선택해주세요.');
        return false;
    }
    return true;
}