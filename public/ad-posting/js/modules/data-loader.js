// /ad-posting/js/modules/data-loader.js

// 전역 데이터 저장소
export let regionData = {};
export let cityData = {};
export let businessTypes = {};
export let categories = {};

// 카테고리 데이터 로드
export async function loadCategoryData() {
    try {
        const response = await fetch('/data/category.json');
        const data = await response.json();
        categories = data;
        return data;
    } catch (error) {
        console.error('카테고리 데이터 로드 실패:', error);
        throw error;
    }
}

// 지역 데이터 로드
export async function loadRegionData() {
    try {
        // region1.json 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        // region2.json 로드  
        const region2Response = await fetch('/data/region2.json');
        cityData = await region2Response.json();
        
        // 지역 데이터 매핑
        region1Data.regions.forEach(region => {
            regionData[region.name] = region.code;
        });
        
        return { regionData, cityData };
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
        throw error;
    }
}

// 업종 데이터 로드
export async function loadBusinessTypes(categoryName) {
    try {
        let fileName = '';
        if (categoryName === '유흥주점') {
            fileName = '/data/karaoke.json';
        } else if (categoryName === '건전마사지') {
            fileName = '/data/gunma.json';
        } else {
            console.error('알 수 없는 카테고리:', categoryName);
            return null;
        }
        
        const response = await fetch(fileName);
        const data = await response.json();
        
        // 업종 코드 매핑 저장
        businessTypes = {};
        data.businessTypes.forEach(type => {
            businessTypes[type.name] = type.code;
        });
        
        // 전역으로 사용할 수 있도록 window 객체에 저장
        window.businessTypes = businessTypes;
        
        return businessTypes;
    } catch (error) {
        console.error('업종 데이터 로드 실패:', error);
        throw error;
    }
}

// 도시 데이터 가져오기
export function getCitiesByRegion(regionName) {
    const regionCode = regionData[regionName];
    if (regionCode && cityData[regionCode]) {
        return cityData[regionCode];
    }
    return [];
}