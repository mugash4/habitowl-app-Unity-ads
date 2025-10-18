/**
 * Ad Service - Wrapper for Unity Ads Service
 * This file acts as an alias to maintain backward compatibility
 * while using UnityAdsService as the actual implementation
 */

import UnityAdsService from './UnityAdsService';

// Export UnityAdsService as default
export default UnityAdsService;

// Also export named exports if needed
export const AdService = UnityAdsService;
