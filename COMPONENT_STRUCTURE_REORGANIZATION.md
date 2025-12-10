# Component Structure Reorganization

## ✅ New Structure

```
src/components/
├── Layout/                    # Layout components
│   ├── index.js
│   └── Navigation.jsx
│
├── UI/                        # Basic UI components (12 components)
│   ├── index.js
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Select.jsx
│   ├── Modal.jsx
│   ├── StatusBadge.jsx
│   ├── Card.jsx
│   ├── EmptyState.jsx
│   ├── FormField.jsx
│   ├── InfoCard.jsx
│   ├── ActionButton.jsx
│   ├── ErrorMessage.jsx
│   └── LoadingSpinner.jsx
│
├── Shared/                     # Common page components (6 components)
│   ├── index.js
│   ├── PageHeader.jsx
│   ├── LoadingState.jsx
│   ├── ErrorState.jsx
│   ├── DataTable.jsx
│   ├── FilterBar.jsx
│   └── OrderPill.jsx
│
├── Features/                   # Feature-specific components
│   ├── index.js
│   └── OrderManagement/       # Order Management feature
│       ├── index.js
│       ├── OrderManagementPanel.jsx  # Main feature component
│       └── components/        # Feature sub-components
│           ├── index.js
│           ├── useOrderManagement.js
│           ├── PanelHeader.jsx
│           ├── PanelTabs.jsx
│           ├── DetailsTab.jsx
│           ├── ActionsTab.jsx
│           ├── POTab.jsx
│           ├── ForecastTab.jsx
│           ├── ShippingTab.jsx
│           └── modals/
│               ├── index.js
│               ├── StatusModal.jsx
│               ├── AllocationModal.jsx
│               ├── ShipmentModal.jsx
│               ├── ForecastModal.jsx
│               ├── PlanModal.jsx
│               └── POApprovalModal.jsx
│
├── Pages/                      # Page-specific components
│   ├── index.js
│   ├── StockCoverTable.jsx
│   └── modals/
│       ├── index.js
│       ├── OrderDetailsModal.jsx
│       └── ShipmentDetailsModal.jsx
│
└── index.js                    # Main barrel export
```

## Organization Principles

### 1. Layout/ - Application Layout
- Components that define the overall application structure
- Examples: Navigation, Sidebar, Header, Footer

### 2. UI/ - Basic UI Components
- Reusable building blocks used throughout the app
- No business logic, pure presentation
- Examples: Button, Input, Modal, StatusBadge

### 3. Shared/ - Common Page Components
- Components used across multiple pages
- Page-level patterns and utilities
- Examples: PageHeader, LoadingState, ErrorState, FilterBar

### 4. Features/ - Feature Components
- Complete features organized by domain
- Each feature has its own folder with:
  - Main component
  - Sub-components
  - Modals
  - Hooks (if needed)
- Examples: OrderManagement feature

### 5. Pages/ - Page-Specific Components
- Complex components specific to one page
- Page modals and tables
- Examples: StockCoverTable, OrderDetailsModal

## Benefits

1. **Clear Organization**: Easy to find components by purpose
2. **Scalability**: Easy to add new features in Features/
3. **Separation**: Layout, UI, Shared, Features, Pages are clearly separated
4. **Maintainability**: Related components grouped together
5. **Consistency**: Same structure for all features

## Import Pattern

```javascript
// Import from main barrel (recommended)
import { Navigation, OrderManagementPanel, Button, PageHeader } from '../components/index.js';

// Or import from specific folders
import { Navigation } from '../components/Layout/index.js';
import { Button } from '../components/UI/index.js';
import { OrderManagementPanel } from '../components/Features/index.js';
```

