# Folder Architecture Guide

## Overview
This document describes the organized folder structure with proper separation and barrel exports for clean imports.

## Folder Structure

```
src/
├── index.js                    # Main barrel export (global packages)
├── components/
│   ├── index.js                # Components barrel export
│   ├── Shared/                 # Shared UI components
│   │   ├── index.js
│   │   ├── PageHeader.jsx
│   │   ├── LoadingState.jsx
│   │   ├── ErrorState.jsx
│   │   └── DataTable.jsx
│   ├── Pages/                 # Page-specific components
│   │   ├── index.js
│   │   └── StockCoverTable.jsx
│   ├── OrderManagement/       # Order management components
│   │   ├── index.js
│   │   ├── useOrderManagement.js
│   │   ├── PanelHeader.jsx
│   │   ├── PanelTabs.jsx
│   │   ├── DetailsTab.jsx
│   │   ├── ActionsTab.jsx
│   │   ├── POTab.jsx
│   │   ├── ForecastTab.jsx
│   │   ├── ShippingTab.jsx
│   │   └── modals/
│   │       ├── index.js
│   │       ├── StatusModal.jsx
│   │       ├── AllocationModal.jsx
│   │       ├── ShipmentModal.jsx
│   │       ├── ForecastModal.jsx
│   │       ├── PlanModal.jsx
│   │       └── POApprovalModal.jsx
│   ├── OrderManagementPanel.jsx
│   ├── Navigation.jsx
│   ├── Modal.jsx
│   ├── StatusBadge.jsx
│   ├── OrderPill.jsx
│   ├── FilterBar.jsx
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Select.jsx
│   └── ... (other components)
├── hooks/
│   ├── index.js                # Hooks barrel export
│   ├── useAppData.js
│   ├── useStockCover.js
│   ├── useStockCoverPage.js
│   ├── useOrderItems.js
│   ├── usePOs.js
│   ├── useAllocations.js
│   ├── useShipments.js
│   ├── useForecasts.js
│   └── useOrders.js
├── services/
│   ├── index.js                # Services barrel export
│   ├── DataverseService.js
│   ├── MockDataService.js
│   ├── OrderItemService.js
│   ├── POService.js
│   ├── AllocationService.js
│   ├── ShipmentService.js
│   ├── ForecastService.js
│   ├── StockCoverService.js
│   └── OrderService.js
├── providers/
│   ├── index.js                # Providers barrel export
│   └── AppProvider.jsx
├── pages/
│   ├── index.js                # Pages barrel export
│   ├── HomePage.jsx
│   ├── StockCoverPage.jsx
│   ├── OrdersPage.jsx
│   ├── ForecastsPage.jsx
│   ├── AllocationsPage.jsx
│   └── ShipmentsPage.jsx
├── utils/
│   ├── index.js                # Utils barrel export
│   └── formatters.js
├── types/
│   └── index.js                # Types documentation
├── config/
│   ├── index.js                # Config barrel export
│   └── dataverse.config.js
└── main.jsx
```

## Import Patterns

### ✅ Using Barrel Exports (Recommended)

```javascript
// Import from barrel exports
import { Button, Modal, StatusBadge } from '../components/index.js';
import { useOrders, usePOs } from '../hooks/index.js';
import { OrderService, POService } from '../services/index.js';
import { formatNumber, formatDate } from '../utils/index.js';
import { useApp } from '../providers/index.js';
```

### ❌ Direct Imports (Not Recommended)

```javascript
// Avoid direct imports
import Button from '../components/Button.jsx';
import useOrders from '../hooks/useOrders.js';
import OrderService from '../services/OrderService.js';
```

## Separation of Concerns

### 1. Components (`src/components/`)
- **Shared/**: Reusable UI components used across pages
- **Pages/**: Page-specific complex components
- **OrderManagement/**: Order management feature components
- **Root**: Core reusable components

### 2. Hooks (`src/hooks/`)
- Data hooks: `useOrders`, `usePOs`, etc.
- Page hooks: `useStockCoverPage`, etc.
- All use services, never call APIs directly

### 3. Services (`src/services/`)
- Pure business logic
- No React dependencies
- Use config for settings
- Can use other services via barrel exports

### 4. Providers (`src/providers/`)
- Global state management
- Master data only
- Use hooks for data fetching

### 5. Pages (`src/pages/`)
- Compose components
- Use hooks for data
- Handle page-level interactions

### 6. Utils (`src/utils/`)
- Pure utility functions
- No dependencies on other layers

### 7. Config (`src/config/`)
- Configuration constants
- Environment settings

### 8. Types (`src/types/`)
- Type definitions (JSDoc)
- Documentation only

## Benefits

1. **Clean Imports**: Use barrel exports for organized imports
2. **Easy Navigation**: Clear folder structure
3. **Separation**: Each layer has clear responsibilities
4. **Maintainability**: Easy to find and modify code
5. **Scalability**: Easy to add new features

## Import Examples

### Components
```javascript
import { Button, Modal, StatusBadge, OrderManagementPanel } from '../components/index.js';
```

### Hooks
```javascript
import { useOrders, usePOs, useStockCover } from '../hooks/index.js';
```

### Services
```javascript
import { OrderService, POService } from '../services/index.js';
```

### Utils
```javascript
import { formatNumber, formatDate } from '../utils/index.js';
```

### Providers
```javascript
import { useApp } from '../providers/index.js';
```

### Config
```javascript
import { DataverseConfig } from '../config/index.js';
```

