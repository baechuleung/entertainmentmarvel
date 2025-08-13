// /ad-posting/js/modules/index.js
// 모든 모듈을 한 곳에서 export하는 인덱스 파일

// 데이터 로더 모듈
export {
    regionData,
    cityData,
    businessTypes,
    categories,
    loadCategoryData,
    loadRegionData,
    loadBusinessTypes,
    getCitiesByRegion
} from './data-loader.js';

// UI 컴포넌트 모듈
export {
    createCategoryButtons,
    createRegionOptions,
    createBusinessTypeOptions,
    updateCityOptions,
    selectOption,
    closeAllSelect
} from './ui-components.js';

// 커스텀 셀렉트 모듈
export {
    setupCustomSelects,
    setSelectValue,
    resetSelect
} from './custom-select.js';

// 에디터 모듈
export {
    initializeQuillEditor,
    createImageHandler,
    setEditorContent,
    getEditorContent,
    processEditorImages
} from './editor.js';

// 썸네일 모듈
export {
    setupThumbnailUpload,
    showThumbnailPreview,
    showThumbnailFromUrl,
    clearThumbnail,
    uploadThumbnail
} from './thumbnail.js';

// 카테고리별 필드 모듈
export {
    initializeEventEditor,
    setupTablePriceEvents,
    toggleCategorySpecificFields,
    collectTablePrices,
    collectCategoryData
} from './category-fields.js';

// 광고 전용 ImageKit 업로드 모듈 - 백그라운드 업로드 함수 추가
export {
    startBackgroundUpload,  // 새로운 백그라운드 업로드 함수
    uploadAdThumbnail,      // 호환성을 위해 유지 (deprecated)
    uploadAdDetailImages,   // 호환성을 위해 유지 (deprecated)
    uploadAdEventImages,    // 호환성을 위해 유지 (deprecated)
    uploadSingleDetailImage,
    uploadSingleEventImage,
    deleteAdImages,
    deleteAdFolder
} from './ad-imagekit-upload.js';