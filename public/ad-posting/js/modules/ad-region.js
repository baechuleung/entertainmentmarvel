// /ad-posting/js/modules/ad-region.js
// 지역 및 도시 데이터 관련 기능을 담당하는 모듈

// 지역 데이터 캐시
let regionDataCache = null;
let cityDataCache = null;

/**
 * 지역 데이터 로드
 * @returns {Promise<Object>} 지역 데이터
 */
export async function loadRegionData() {
    if (regionDataCache) {
        return { regionData: regionDataCache, cityData: cityDataCache };
    }
    
    try {
        // region1.json과 region2.json 동시 로드
        const [response1, response2] = await Promise.all([
            fetch('/data/region1.json'),
            fetch('/data/region2.json')
        ]);
        
        if (!response1.ok || !response2.ok) {
            throw new Error('지역 데이터 로드 실패');
        }
        
        const data1 = await response1.json();
        const data2 = await response2.json();
        
        // region1에서 지역 이름만 추출
        regionDataCache = {};
        if (data1.regions && Array.isArray(data1.regions)) {
            data1.regions.forEach(region => {
                // name을 키로, name을 값으로 (코드 매핑 제거)
                regionDataCache[region.name] = region.name;
            });
        }
        
        // region2는 도시 데이터
        cityDataCache = data2;
        
        console.log('지역 데이터 로드 완료');
        return { regionData: regionDataCache, cityData: cityDataCache };
        
    } catch (error) {
        console.error('지역 데이터 로드 오류:', error);
        return { regionData: {}, cityData: {} };
    }
}

/**
 * 도시 데이터 로드
 * @returns {Promise<Object>} 도시 데이터
 */
export async function loadCityData() {
    if (cityDataCache) {
        return cityDataCache;
    }
    
    await loadRegionData(); // 지역 데이터와 함께 로드
    return cityDataCache || {};
}

/**
 * 지역별 도시 목록 가져오기
 * @param {string} regionName - 지역명
 * @returns {Promise<Array>} 도시 목록
 */
export async function getCitiesByRegion(regionName) {
    const { regionData, cityData } = await loadRegionData();
    
    if (!regionName) {
        return [];
    }
    
    // region1.json의 regions 배열에서 해당 지역의 code 찾기
    const response = await fetch('/data/region1.json');
    const data1 = await response.json();
    
    const region = data1.regions?.find(r => r.name === regionName);
    if (region && region.code && cityData[region.code]) {
        // 도시 배열 반환
        return cityData[region.code] || [];
    }
    
    return [];
}

/**
 * 지역명 가져오기
 * @param {string} regionCode - 지역 코드
 * @returns {string} 지역명
 */
export function getRegionName(regionCode) {
    // 그대로 반환
    return regionCode;
}

/**
 * 도시명 가져오기
 * @param {string} cityCode - 도시 코드
 * @returns {string} 도시명
 */
export function getCityName(cityCode) {
    // 그대로 반환
    return cityCode;
}

/**
 * 모든 지역 목록 가져오기
 * @returns {Promise<Array>} 지역 목록
 */
export async function getAllRegions() {
    const { regionData } = await loadRegionData();
    return Object.keys(regionData);
}

/**
 * 지역과 도시 유효성 검사
 * @param {string} regionName - 지역명
 * @param {string} cityName - 도시명
 * @returns {Promise<boolean>} 유효 여부
 */
export async function validateRegionCity(regionName, cityName) {
    const cities = await getCitiesByRegion(regionName);
    return cities.includes(cityName);
}

/**
 * 지역 데이터 초기화 (캐시 클리어)
 */
export function clearRegionCache() {
    regionDataCache = null;
    cityDataCache = null;
    console.log('지역 데이터 캐시 초기화');
}