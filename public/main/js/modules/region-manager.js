import { regionData, cityData, setRegionData, setCityData } from '/main/js/business-header.js';
import { selectOption } from '/main/js/modules/select-manager.js';

// 지역 데이터 로드
export async function loadRegionData() {
    try {
        // region1.json 로드
        const region1Response = await fetch('/data/region1.json');
        const region1Data = await region1Response.json();
        
        // region2.json 로드
        const region2Response = await fetch('/data/region2.json');
        const cityDataResult = await region2Response.json();
        setCityData(cityDataResult);
        
        const regionOptions = document.getElementById('region-options');
        if (regionOptions) {
            // 전체 옵션 추가
            const allOption = document.createElement('div');
            allOption.setAttribute('data-value', '전체');
            allOption.textContent = '전체';
            allOption.addEventListener('click', function() {
                selectOption(this, 'region');
            });
            regionOptions.appendChild(allOption);
            
            // 각 지역 옵션 추가
            region1Data.regions.forEach(region => {
                const option = document.createElement('div');
                option.setAttribute('data-value', region.name);
                option.textContent = region.name;
                option.addEventListener('click', function() {
                    selectOption(this, 'region');
                });
                regionOptions.appendChild(option);
            });
        }
        
        // regionData 저장 - name을 key로, code를 value로
        const regionDataMap = {};
        region1Data.regions.forEach(region => {
            regionDataMap[region.name] = region.code;
        });
        setRegionData(regionDataMap);
        
    } catch (error) {
        console.error('지역 데이터 로드 실패:', error);
    }
}

// 도시 옵션 업데이트
export function updateCityOptions(regionName) {
    const cityOptions = document.getElementById('city-options');
    const citySelected = document.querySelector('#city-select-wrapper .select-selected');
    
    if (!cityOptions) return;
    
    // 기존 옵션 제거
    cityOptions.innerHTML = '';
    citySelected.textContent = '도시';
    citySelected.setAttribute('data-value', '');
    
    // 전체 옵션 추가
    const allOption = document.createElement('div');
    allOption.setAttribute('data-value', '전체');
    allOption.textContent = '전체';
    allOption.addEventListener('click', function() {
        selectOption(this, 'city');
    });
    cityOptions.appendChild(allOption);
    
    // 선택된 지역의 code 찾기
    const regionCode = regionData[regionName];
    
    if (regionCode && cityData[regionCode]) {
        cityData[regionCode].forEach(city => {
            const option = document.createElement('div');
            option.setAttribute('data-value', city);
            option.textContent = city;
            option.addEventListener('click', function() {
                selectOption(this, 'city');
            });
            cityOptions.appendChild(option);
        });
    }
}