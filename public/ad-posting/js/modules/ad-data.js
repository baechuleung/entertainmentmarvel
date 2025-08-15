// /ad-posting/js/modules/ad-data.js
// 카테고리 및 업종 데이터 관련 기능을 담당하는 모듈

// 데이터 캐시
let categoryDataCache = null;
let businessTypesCache = {};

/**
 * 카테고리 데이터 로드
 * @returns {Promise<Object>} 카테고리 데이터
 */
export async function loadCategoryData() {
    if (categoryDataCache) {
        return categoryDataCache;
    }
    
    try {
        const response = await fetch('/data/category.json');  // categories.json이 아니라 category.json
        if (!response.ok) {
            throw new Error('카테고리 데이터 로드 실패');
        }
        
        const data = await response.json();
        categoryDataCache = data;
        
        console.log('카테고리 데이터 로드 완료:', data);
        return data;
        
    } catch (error) {
        console.error('카테고리 데이터 로드 오류:', error);
        return null;
    }
}

/**
 * 업종 데이터 로드
 * @param {string} categoryName - 카테고리명
 * @returns {Promise<Object>} 업종 데이터
 */
export async function loadBusinessTypes(categoryName) {
    if (!categoryName) return null;
    
    // 캐시 확인
    if (businessTypesCache[categoryName]) {
        return businessTypesCache[categoryName];
    }
    
    try {
        // 카테고리별 JSON 파일 경로 결정
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
        if (!response.ok) {
            throw new Error(`업종 데이터 로드 실패: ${fileName}`);
        }
        
        const data = await response.json();
        
        // businessTypes를 객체 형태로 변환
        const types = {};
        if (data.businessTypes && Array.isArray(data.businessTypes)) {
            data.businessTypes.forEach(type => {
                types[type.name] = { code: type.code };
            });
        }
        
        businessTypesCache[categoryName] = types;
        console.log(`${categoryName} 업종 데이터 로드 완료:`, types);
        
        return types;
        
    } catch (error) {
        console.error('업종 데이터 로드 오류:', error);
        return null;
    }
}

/**
 * 카테고리 정보 가져오기
 * @param {string} categoryName - 카테고리명
 * @returns {Promise<Object>} 카테고리 정보
 */
export async function getCategoryByName(categoryName) {
    const categoryData = await loadCategoryData();
    return categoryData.categories?.find(cat => cat.name === categoryName) || null;
}

/**
 * 업종 정보 가져오기
 * @param {string} categoryName - 카테고리명
 * @param {string} businessTypeName - 업종명
 * @returns {Promise<Object>} 업종 정보
 */
export async function getBusinessTypeByName(categoryName, businessTypeName) {
    const businessTypes = await loadBusinessTypes(categoryName);
    if (!businessTypes) return null;
    
    return businessTypes[businessTypeName] || null;
}

/**
 * 모든 카테고리 목록 가져오기
 * @returns {Promise<Array>} 카테고리 목록
 */
export async function getAllCategories() {
    const categoryData = await loadCategoryData();
    return categoryData.categories?.map(cat => cat.name) || [];
}

/**
 * 카테고리별 모든 업종 목록 가져오기
 * @param {string} categoryName - 카테고리명
 * @returns {Promise<Array>} 업종 목록
 */
export async function getAllBusinessTypes(categoryName) {
    const businessTypes = await loadBusinessTypes(categoryName);
    if (!businessTypes) return [];
    
    return Object.keys(businessTypes);
}

/**
 * 데이터 캐싱
 * @param {string} key - 캐시 키
 * @param {any} data - 캐시할 데이터
 */
export function cacheData(key, data) {
    if (!window.adDataCache) {
        window.adDataCache = {};
    }
    
    window.adDataCache[key] = {
        data: data,
        timestamp: Date.now()
    };
    
    console.log(`데이터 캐시 저장: ${key}`);
}

/**
 * 캐시 데이터 가져오기
 * @param {string} key - 캐시 키
 * @param {number} maxAge - 최대 캐시 유효 시간 (밀리초)
 * @returns {any} 캐시된 데이터 또는 null
 */
export function getCachedData(key, maxAge = 3600000) { // 기본 1시간
    if (!window.adDataCache || !window.adDataCache[key]) {
        return null;
    }
    
    const cached = window.adDataCache[key];
    const age = Date.now() - cached.timestamp;
    
    if (age > maxAge) {
        delete window.adDataCache[key];
        console.log(`캐시 만료: ${key}`);
        return null;
    }
    
    console.log(`캐시 히트: ${key}`);
    return cached.data;
}

/**
 * 캐시 초기화
 */
export function clearDataCache() {
    categoryDataCache = null;
    businessTypesCache = {};
    window.adDataCache = {};
    console.log('데이터 캐시 초기화');
}

/**
 * 카테고리 코드로 이름 가져오기
 * @param {string} categoryCode - 카테고리 코드
 * @returns {Promise<string>} 카테고리명
 */
export async function getCategoryNameByCode(categoryCode) {
    const categoryData = await loadCategoryData();
    const category = categoryData.categories?.find(cat => cat.code === categoryCode);
    return category?.name || categoryCode;
}

/**
 * 업종 코드로 이름 가져오기
 * @param {string} categoryName - 카테고리명
 * @param {string} businessTypeCode - 업종 코드
 * @returns {Promise<string>} 업종명
 */
export async function getBusinessTypeNameByCode(categoryName, businessTypeCode) {
    const businessTypes = await loadBusinessTypes(categoryName);
    if (!businessTypes) return businessTypeCode;
    
    for (const [name, info] of Object.entries(businessTypes)) {
        if (info.code === businessTypeCode) {
            return name;
        }
    }
    
    return businessTypeCode;
}