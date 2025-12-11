/**
 * ============================================================================
 * GLOBAL APP CONSTANTS
 * ============================================================================
 * 
 * Centralized business constants, rules, and configuration values
 * This file serves as the single source of truth for business logic constants
 * 
 * Features:
 * - Business rules and thresholds
 * - Status codes and workflow states
 * - Calculation parameters
 * - UI constants
 * - Workflow definitions
 * - Validation rules
 * 
 * Usage:
 *   import { AppConstants } from '@/config/app.constants.js';
 *   
 *   const status = AppConstants.ORDER_STATUS.PLANNED_BY_LO;
 *   const threshold = AppConstants.CALCULATION.AT_RISK_THRESHOLD_MONTHS;
 */

// ============================================================================
// CALCULATION PARAMETERS
// ============================================================================

export const CALCULATION = {
  // Forecast horizon
  FORECAST_MONTHS_AHEAD: parseInt(import.meta.env.VITE_FORECAST_MONTHS_AHEAD || '25'),
  
  // Stock cover thresholds
  AT_RISK_THRESHOLD_MONTHS: parseInt(import.meta.env.VITE_AT_RISK_THRESHOLD_MONTHS || '6'),
  NO_SELL_BUFFER_MONTHS: parseInt(import.meta.env.VITE_NO_SELL_BUFFER_MONTHS || '3'),
  MAX_MONTHS_COVER_OFFSET: 12,
  
  // Stock cover calculation
  MIN_COVER_MONTHS: 0,
  MAX_COVER_MONTHS: 24,
  TARGET_COVER_MONTHS: 3, // Default target cover
  
  // Procurement safety margin
  DEFAULT_PROCUREMENT_SAFE_MARGIN: 1.0,
  MIN_PROCUREMENT_SAFE_MARGIN: 0.5,
  MAX_PROCUREMENT_SAFE_MARGIN: 2.0,
  
  // Rounding precision
  QUANTITY_PRECISION: 2,
  COVER_PRECISION: 2,
  PERCENTAGE_PRECISION: 1,
};

// ============================================================================
// ORDER ITEM STATUS CODES (Dataverse)
// ============================================================================

export const ORDER_ITEM_STATUS = {
  // Numeric codes (Dataverse)
  SYSTEM_FORECASTED_ORDER: 100000000,
  PLANNED_BY_LO: 100000001,
  CONFIRMED_PENDING_RO_APPROVAL: 100000002,
  RO_APPROVED_PENDING_CFO_APPROVAL: 100000003,
  APPROVED: 100000004,
  CONFIRMED_TO_UP: 100000005,
  BACK_ORDER: 100000006,
  ALLOCATION_PENDING_RO_APPROVAL: 100000007,
  ALLOCATED_TO_MARKET: 100000008,
  SHIPPED_TO_MARKET: 100000009,
  REMAINING_FOR_SHIPPING: 100000010,
  COMPLETED: 100000011,
  ITEM_APPROVED_PENDING_PO_APPROVAL: 100000012,
  
  // String names (for UI)
  NAMES: {
    100000000: 'System Forecasted Order',
    100000001: 'Planned By LO',
    100000002: 'Confirmed Pending RO Approval',
    100000003: 'RO Approved Pending CFO Approval',
    100000004: 'Approved',
    100000005: 'Confirmed to UP',
    100000006: 'Back Order',
    100000007: 'Allocation Pending RO Approval',
    100000008: 'Allocated To Market',
    100000009: 'Shipped To Market',
    100000010: 'Remaining For Shipping',
    100000011: 'Completed',
    100000012: 'Item Approved Pending PO Approval',
  },
  
  // UI-friendly names (mapped for filtering)
  UI_NAMES: {
    100000000: 'Forecasted',
    100000001: 'Planned',
    100000002: 'Pending RO Approval',
    100000003: 'Pending CFO Approval',
    100000004: 'Approved',
    100000005: 'Confirmed to UP',
    100000006: 'Back Order',
    100000007: 'Pending Allocation',
    100000008: 'Allocated',
    100000009: 'Shipped',
    100000010: 'Remaining',
    100000011: 'Completed',
    100000012: 'Regulatory Approved',
  },
  
  // Status groups (for filtering)
  GROUPS: {
    FORECASTED: [100000000],
    PLANNED: [100000001],
    PENDING_APPROVAL: [100000002, 100000003, 100000007],
    APPROVED: [100000004, 100000012],
    CONFIRMED: [100000005],
    BACK_ORDER: [100000006],
    ALLOCATED: [100000008],
    SHIPPED: [100000009],
    REMAINING: [100000010],
    COMPLETED: [100000011],
  },
  
  // Workflow transitions (allowed status changes)
  TRANSITIONS: {
    100000000: [100000001], // Forecasted → Planned
    100000001: [100000002, 100000006], // Planned → Pending RO Approval or Back Order
    100000002: [100000003, 100000001], // Pending RO Approval → Pending CFO Approval or back to Planned
    100000003: [100000004, 100000001], // Pending CFO Approval → Approved or back to Planned
    100000004: [100000005, 100000001], // Approved → Confirmed to UP or back to Planned
    100000005: [100000006, 100000008], // Confirmed to UP → Back Order or Allocated
    100000006: [100000005, 100000008], // Back Order → Confirmed to UP or Allocated
    100000007: [100000008, 100000005], // Pending Allocation → Allocated or back to Confirmed
    100000008: [100000009, 100000010], // Allocated → Shipped or Remaining
    100000009: [100000011], // Shipped → Completed
    100000010: [100000009], // Remaining → Shipped
    100000011: [], // Completed (terminal state)
    100000012: [100000004, 100000001], // Regulatory Approved → Approved or back to Planned
  },
};

// ============================================================================
// PURCHASE ORDER (PO) STATUS CODES (Dataverse)
// ============================================================================

export const PO_STATUS = {
  // Numeric codes (Dataverse)
  OPEN: 100000000,
  PENDING_CFO_APPROVAL: 100000001,
  APPROVED: 100000002,
  COMPLETED: 100000003,
  CONFIRMED_TO_UP: 100000004,
  
  // String names (for UI)
  NAMES: {
    100000000: 'Open',
    100000001: 'Pending CFO Approval',
    100000002: 'Approved',
    100000003: 'Completed',
    100000004: 'Confirmed to UP',
  },
  
  // UI-friendly names
  UI_NAMES: {
    100000000: 'Draft',
    100000001: 'Pending CFO Approval',
    100000002: 'CFO Approved',
    100000003: 'Completed',
    100000004: 'Confirmed to UP',
  },
  
  // Workflow transitions
  TRANSITIONS: {
    100000000: [100000001], // Draft → Pending CFO Approval
    100000001: [100000002, 100000000], // Pending CFO Approval → Approved or back to Draft
    100000002: [100000004, 100000001], // Approved → Confirmed to UP or back to Pending
    100000004: [100000003], // Confirmed to UP → Completed
    100000003: [], // Completed (terminal state)
  },
};

// ============================================================================
// CHANNEL CODES
// ============================================================================

export const CHANNEL = {
  PRIVATE: 100000000,
  TENDER: 100000001,
  OFFERS: 100000002,
  
  NAMES: {
    100000000: 'Private',
    100000001: 'Tender',
    100000002: 'Offers',
  },
};

// ============================================================================
// FORECAST STATUS CODES
// ============================================================================

export const FORECAST_STATUS = {
  SUBMITTED: 100000000,
  APPROVED: 100000001,
  SYSTEM_FORECASTED: 100000002,
  
  NAMES: {
    100000000: 'Submitted',
    100000001: 'Approved',
    100000002: 'System Forecasted',
  },
};

// ============================================================================
// SHIPMENT STATUS CODES
// ============================================================================

export const SHIPMENT_STATUS = {
  IN_TRANSIT: 100000001,
  DELIVERED: 100000002,
  
  NAMES: {
    100000001: 'In Transit',
    100000002: 'Delivered',
  },
};

// ============================================================================
// SKU CATEGORIES
// ============================================================================

export const SKU_CATEGORY = {
  STANDARD: 1,
  GENIO: 2,
  SPECIAL: 3,
  RTF: 4,
  GIMMICKS: 5,
  
  NAMES: {
    1: 'Standard',
    2: 'Genio',
    3: 'Special',
    4: 'RTF',
    5: 'Gimmicks',
  },
};

// ============================================================================
// DISEASE AREAS
// ============================================================================

export const DISEASE_AREA = {
  INFANT_FORMULA: 100000000,
  FOLLOW_ON_FORMULA: 100000001,
  GROWING_UP_FORMULA: 100000002,
  ALLERGY_FORMULA: 100000003,
  CONSTIPATION_FORMULA: 100000004,
  REGURGITATION_FORMULA: 100000005,
  DIARRHEA_FORMULA: 100000006,
  COLIC_FORMULA: 100000007,
  
  NAMES: {
    100000000: 'Infant Formula',
    100000001: 'Follow-on Formula',
    100000002: 'Growing-up Formula',
    100000003: 'Allergy Formula',
    100000004: 'Constipation Formula',
    100000005: 'Regurgitation Formula',
    100000006: 'Diarrhea Formula',
    100000007: 'Colic Formula',
  },
};

// ============================================================================
// REGIONS
// ============================================================================

export const REGION = {
  GCC: 100000000,
  LEVANT: 100000001,
  
  NAMES: {
    100000000: 'GCC',
    100000001: 'Levant',
  },
};

// ============================================================================
// CURRENCIES
// ============================================================================

export const CURRENCY = {
  SAR: 1,
  YER: 2,
  AED: 3,
  BHD: 4,
  KWD: 5,
  OMR: 6,
  QAR: 7,
  LBP: 8,
  IQD: 9,
  USD: 10,
  
  NAMES: {
    1: 'Saudi Riyal (SAR)',
    2: 'Yemeni Rial (YER)',
    3: 'UAE Dirham (AED)',
    4: 'Bahraini Dinar (BHD)',
    5: 'Kuwaiti Dinar (KWD)',
    6: 'Omani Rial (OMR)',
    7: 'Qatari Riyal (QAR)',
    8: 'Lebanese Pound (LBP)',
    9: 'Iraqi Dinar (IQD)',
    10: 'US Dollar (USD)',
  },
  
  SYMBOLS: {
    1: 'SAR',
    2: 'YER',
    3: 'AED',
    4: 'BHD',
    5: 'KWD',
    6: 'OMR',
    7: 'QAR',
    8: 'LBP',
    9: 'IQD',
    10: 'USD',
  },
};

// ============================================================================
// BUSINESS RULES
// ============================================================================

export const BUSINESS_RULES = {
  // Order Item Rules
  ORDER_ITEM: {
    // Must link to PO before approval can be requested
    REQUIRES_PO_FOR_APPROVAL: true,
    
    // Can only allocate items with status "Confirmed to UP"
    ALLOCATION_REQUIRES_STATUS: [ORDER_ITEM_STATUS.CONFIRMED_TO_UP],
    
    // When pushing remaining quantity, new item starts as "Planned"
    PUSHED_ITEM_DEFAULT_STATUS: ORDER_ITEM_STATUS.PLANNED_BY_LO,
    
    // Partial allocation creates split
    PARTIAL_ALLOCATION_CREATES_SPLIT: true,
  },
  
  // Purchase Order Rules
  PURCHASE_ORDER: {
    // Approval is always at PO level, never at order item level
    APPROVAL_AT_PO_LEVEL: true,
    
    // Cannot confirm to UP until manager approves
    REQUIRES_APPROVAL_FOR_CONFIRMATION: true,
    
    // Cannot request approval until all items are Regulatory Approved
    REQUIRES_ALL_ITEMS_REGULATORY_APPROVED: true,
    
    // All items in PO change status when PO is confirmed
    CONFIRMATION_AFFECTS_ALL_ITEMS: true,
  },
  
  // Forecast Rules
  FORECAST: {
    // Forecasts are auto-generated by Azure Function
    AUTO_GENERATED: true,
    
    // Forecast horizon (months ahead)
    HORIZON_MONTHS: CALCULATION.FORECAST_MONTHS_AHEAD,
  },
  
  // Label Rules
  LABEL: {
    // Labels are mandatory for confirmation
    REQUIRED_FOR_CONFIRMATION: true,
    
    // Regulatory must approve labels
    REQUIRES_REGULATORY_APPROVAL: true,
  },
  
  // Allocation Rules
  ALLOCATION: {
    // Can only allocate to future months
    ALLOW_FUTURE_MONTHS_ONLY: true,
    
    // Partial allocation allowed
    ALLOW_PARTIAL: true,
    
    // Can push remaining quantity to different month
    ALLOW_PUSH_TO_MONTH: true,
  },
  
  // Shipping Rules
  SHIPPING: {
    // Shipping can be partial (not all allocated items must ship together)
    ALLOW_PARTIAL_SHIPPING: true,
    
    // Can create multiple shipments from same allocation
    ALLOW_MULTIPLE_SHIPMENTS: true,
  },
};

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const UI = {
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  },
  
  // Table settings
  TABLE: {
    DEFAULT_SORT_ORDER: 'desc',
    MAX_VISIBLE_COLUMNS: 20,
  },
  
  // Date formats
  DATE_FORMAT: {
    DISPLAY: 'DD MMM YYYY',
    SHORT: 'DD/MM/YYYY',
    LONG: 'DD MMMM YYYY',
    DATETIME: 'DD MMM YYYY HH:mm',
    MONTH_YEAR: 'MMM YYYY',
  },
  
  // Number formats
  NUMBER_FORMAT: {
    QUANTITY: {
      MIN_DECIMALS: 0,
      MAX_DECIMALS: 2,
    },
    PERCENTAGE: {
      MIN_DECIMALS: 1,
      MAX_DECIMALS: 2,
    },
    CURRENCY: {
      MIN_DECIMALS: 2,
      MAX_DECIMALS: 2,
    },
  },
  
  // Colors (for status badges, etc.)
  COLORS: {
    STATUS: {
      DRAFT: '#8B8B8B',
      PLANNED: '#1890FF',
      PENDING: '#FAAD14',
      APPROVED: '#52C41A',
      CONFIRMED: '#722ED1',
      SHIPPED: '#13C2C2',
      COMPLETED: '#52C41A',
      ERROR: '#F5222D',
    },
    COVER: {
      LOW: '#F5222D',      // Red (< 1 month)
      MEDIUM: '#FAAD14',   // Orange (1-3 months)
      GOOD: '#52C41A',     // Green (3-6 months)
      HIGH: '#1890FF',      // Blue (> 6 months)
    },
  },
  
  // Refresh intervals (seconds)
  REFRESH: {
    AUTO_REFRESH_INTERVAL: 30,
    MANUAL_REFRESH_DEBOUNCE: 1,
  },
  
  // Notification settings
  NOTIFICATION: {
    SUCCESS_DURATION: 3, // seconds
    ERROR_DURATION: 5,   // seconds
    WARNING_DURATION: 4, // seconds
  },
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION = {
  // Order Item validation
  ORDER_ITEM: {
    MIN_QUANTITY: 0.01,
    MAX_QUANTITY: 1000000,
    REQUIRED_FIELDS: ['countryId', 'skuId', 'month', 'year', 'orderItemQty'],
  },
  
  // Purchase Order validation
  PURCHASE_ORDER: {
    MIN_ITEMS: 1,
    MAX_ITEMS: 1000,
    REQUIRED_FIELDS: ['name', 'date', 'deliveryDate'],
  },
  
  // Date validation
  DATE: {
    MIN_YEAR: 2020,
    MAX_YEAR: 2100,
    FUTURE_MONTHS_LIMIT: 36, // Can plan up to 36 months ahead
  },
  
  // Quantity validation
  QUANTITY: {
    MIN: 0.01,
    MAX: 1000000,
    STEP: 0.01,
  },
};

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

export const WORKFLOWS = {
  // Order Item Lifecycle
  ORDER_ITEM_LIFECYCLE: [
    ORDER_ITEM_STATUS.SYSTEM_FORECASTED_ORDER,
    ORDER_ITEM_STATUS.PLANNED_BY_LO,
    ORDER_ITEM_STATUS.CONFIRMED_PENDING_RO_APPROVAL,
    ORDER_ITEM_STATUS.RO_APPROVED_PENDING_CFO_APPROVAL,
    ORDER_ITEM_STATUS.APPROVED,
    ORDER_ITEM_STATUS.CONFIRMED_TO_UP,
    ORDER_ITEM_STATUS.BACK_ORDER,
    ORDER_ITEM_STATUS.ALLOCATED_TO_MARKET,
    ORDER_ITEM_STATUS.SHIPPED_TO_MARKET,
    ORDER_ITEM_STATUS.COMPLETED,
  ],
  
  // Purchase Order Lifecycle
  PO_LIFECYCLE: [
    PO_STATUS.OPEN,
    PO_STATUS.PENDING_CFO_APPROVAL,
    PO_STATUS.APPROVED,
    PO_STATUS.CONFIRMED_TO_UP,
    PO_STATUS.COMPLETED,
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status name by code
 */
export function getStatusName(statusType, code) {
  const statusMap = {
    orderItem: ORDER_ITEM_STATUS.NAMES,
    po: PO_STATUS.NAMES,
    forecast: FORECAST_STATUS.NAMES,
    shipment: SHIPMENT_STATUS.NAMES,
  };
  
  return statusMap[statusType]?.[code] || 'Unknown';
}

/**
 * Get UI-friendly status name
 */
export function getUIStatusName(statusType, code) {
  const statusMap = {
    orderItem: ORDER_ITEM_STATUS.UI_NAMES,
    po: PO_STATUS.UI_NAMES,
  };
  
  return statusMap[statusType]?.[code] || getStatusName(statusType, code);
}

/**
 * Check if status transition is allowed
 */
export function isStatusTransitionAllowed(statusType, fromStatus, toStatus) {
  const transitions = {
    orderItem: ORDER_ITEM_STATUS.TRANSITIONS,
    po: PO_STATUS.TRANSITIONS,
  };
  
  const allowedTransitions = transitions[statusType]?.[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
}

/**
 * Get status group
 */
export function getStatusGroup(statusType, code) {
  if (statusType === 'orderItem') {
    for (const [group, codes] of Object.entries(ORDER_ITEM_STATUS.GROUPS)) {
      if (codes.includes(code)) {
        return group;
      }
    }
  }
  return null;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export const AppConstants = {
  CALCULATION,
  ORDER_ITEM_STATUS,
  PO_STATUS,
  CHANNEL,
  FORECAST_STATUS,
  SHIPMENT_STATUS,
  SKU_CATEGORY,
  DISEASE_AREA,
  REGION,
  CURRENCY,
  BUSINESS_RULES,
  UI,
  VALIDATION,
  WORKFLOWS,
  
  // Helper functions
  getStatusName,
  getUIStatusName,
  isStatusTransitionAllowed,
  getStatusGroup,
};

export default AppConstants;

