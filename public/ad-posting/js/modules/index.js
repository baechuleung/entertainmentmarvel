// /ad-posting/js/modules/index.js
// 모든 모듈을 한 곳에서 export하는 인덱스 파일

// 폼 관련 모듈
export {
    validateRequiredFields,
    collectFormData,
    fillFormData,
    resetForm,
    enableSubmitButton,
    disableSubmitButton,
    showFormErrors,
    setFormEnabled
} from './ad-form.js';

// Firebase CRUD 모듈
export {
    createAd,
    updateAd,
    deleteAd,
    getAd,
    getUserAds,
    checkExistingAd,
    watchAd,
    getAllAds,
    updateAdStatus,
    incrementAdViews
} from './ad-firebase.js';

// 이미지 처리 모듈
export {
    setupThumbnailUpload,
    showThumbnailPreview,
    showThumbnailFromUrl,
    clearThumbnail,
    deleteThumbnail,
    processBase64Images,
    createPlaceholder,
    startBackgroundUpload,
    deleteAdImages,
    deleteAdFolder,
    compressImage
} from './ad-image.js';

// UI 관련 모듈
export {
    createCategoryButtons,
    createRegionOptions,
    createCityOptions,
    createBusinessTypeOptions,
    setupCustomSelects,
    selectOption,
    updateCityByRegion,
    setSelectValue,
    closeAllSelect,
    activateCategoryButton,
    showLoadingState,
    showErrorMessage,
    showSuccessMessage
} from './ad-ui.js';

// 에디터 모듈
export {
    initializeQuillEditor,
    createImageHandler,
    setEditorContent,
    getEditorContent,
    processEditorImages,
    clearEditor,
    setEditorEnabled,
    insertText,
    focusEditor,
    isEditorEmpty,
    getWordCount,
    getCharCount
} from './ad-editor.js';

// 카테고리별 특수 기능 모듈
export {
    toggleCategorySpecificFields,
    collectCategoryData,
    collectTablePrices,
    collectCourses,
    setupTablePriceEvents,
    setupCourseEvents,
    fillTablePrices,
    fillCourses,
    initializeEventEditor,
    fillCategoryFields
} from './ad-category.js';

// 지역 데이터 모듈
export {
    loadRegionData,
    loadCityData,
    getCitiesByRegion,
    getRegionName,
    getCityName,
    getAllRegions,
    validateRegionCity,
    clearRegionCache
} from './ad-region.js';

// 카테고리/업종 데이터 모듈
export {
    loadCategoryData,
    loadBusinessTypes,
    getCategoryByName,
    getBusinessTypeByName,
    getAllCategories,
    getAllBusinessTypes,
    cacheData,
    getCachedData,
    clearDataCache,
    getCategoryNameByCode,
    getBusinessTypeNameByCode
} from './ad-data.js';

// 인증/권한 모듈
export {
    checkAuth,
    getUserData,
    getCurrentUser,
    checkUserPermission,
    isBusinessUser,
    isAdminUser,
    redirectToLogin,
    handleNoPermission,
    isAdOwner,
    canEditAd,
    canDeleteAd,
    logout,
    redirectByUserType
} from './ad-auth.js';