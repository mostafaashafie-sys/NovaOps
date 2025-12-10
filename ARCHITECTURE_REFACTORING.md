# Architecture Refactoring Plan

## Overview
This document outlines the consistent refactoring pattern applied across the entire application.

## Refactoring Pattern

### 1. Shared Components (`src/components/Shared/`)
Common UI components used across all pages:
- `PageHeader.jsx` - Consistent page headers
- `LoadingState.jsx` - Loading indicators
- `ErrorState.jsx` - Error displays
- `DataTable.jsx` - Reusable table component

### 2. Page-Specific Components (`src/components/Pages/`)
Large page-specific components extracted:
- `StockCoverTable.jsx` - Stock cover planning table
- Additional page-specific components can be added as needed

### 3. Page-Specific Hooks (`src/hooks/`)
Business logic extracted from pages:
- `useStockCoverPage.js` - Stock cover page logic
- Additional page-specific hooks can be added as needed

### 4. Page Components (`src/pages/`)
Pages that:
- Use shared components
- Use page-specific hooks
- Compose smaller components
- Focus on coordination, not implementation

## File Structure

```
src/
├── components/
│   ├── Shared/              # Shared UI components
│   │   ├── PageHeader.jsx
│   │   ├── LoadingState.jsx
│   │   ├── ErrorState.jsx
│   │   ├── DataTable.jsx
│   │   └── index.js
│   ├── Pages/               # Page-specific components
│   │   ├── StockCoverTable.jsx
│   │   ├── OrdersTable.jsx
│   │   ├── ForecastsTable.jsx
│   │   ├── AllocationsTable.jsx
│   │   └── ShipmentsTable.jsx
│   └── OrderManagement/     # Order management components
│       ├── useOrderManagement.js
│       ├── PanelHeader.jsx
│       ├── PanelTabs.jsx
│       ├── DetailsTab.jsx
│       ├── ActionsTab.jsx
│       ├── POTab.jsx
│       ├── ForecastTab.jsx
│       ├── ShippingTab.jsx
│       └── modals/
│           ├── StatusModal.jsx
│           ├── AllocationModal.jsx
│           ├── ShipmentModal.jsx
│           ├── ForecastModal.jsx
│           ├── PlanModal.jsx
│           └── POApprovalModal.jsx
├── hooks/
│   ├── useStockCoverPage.js
│   └── ... (additional page hooks as needed)
└── pages/
    ├── StockCoverPage.jsx
    ├── OrdersPage.jsx
    ├── ForecastsPage.jsx
    ├── AllocationsPage.jsx
    └── ShipmentsPage.jsx
```

## Refactoring Principles

1. **Separation of Concerns**
   - Business logic → Hooks
   - UI components → Components
   - Coordination → Pages

2. **Reusability**
   - Shared components for common UI
   - Page-specific components for complex UI
   - Hooks for reusable logic

3. **Maintainability**
   - Small, focused files
   - Clear responsibilities
   - Easy to test

4. **Consistency**
   - Same pattern across all pages
   - Consistent naming
   - Consistent structure

## Benefits

- ✅ **Maintainability**: Smaller, focused files
- ✅ **Testability**: Logic separated from UI
- ✅ **Reusability**: Components and hooks can be reused
- ✅ **Consistency**: Same pattern everywhere
- ✅ **Scalability**: Easy to add new features

