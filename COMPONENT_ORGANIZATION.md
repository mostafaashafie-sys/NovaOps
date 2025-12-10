# Component Organization Guide

## Folder Structure

```
src/components/
├── index.js                    # Main barrel export
├── Navigation.jsx              # Main navigation component
├── OrderManagementPanel.jsx    # Main order management feature
│
├── UI/                         # Basic reusable UI components
│   ├── index.js
│   ├── ActionButton.jsx
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── EmptyState.jsx
│   ├── ErrorMessage.jsx
│   ├── FormField.jsx
│   ├── InfoCard.jsx
│   ├── Input.jsx
│   ├── LoadingSpinner.jsx
│   ├── Modal.jsx
│   ├── Select.jsx
│   └── StatusBadge.jsx
│
├── Shared/                     # Page-level shared components
│   ├── index.js
│   ├── PageHeader.jsx          # Consistent page headers
│   ├── LoadingState.jsx        # Loading indicators
│   ├── ErrorState.jsx          # Error displays
│   ├── DataTable.jsx           # Reusable table component
│   ├── FilterBar.jsx           # Filter controls
│   └── OrderPill.jsx           # Order item pill component
│
├── Pages/                      # Page-specific complex components
│   ├── index.js
│   └── StockCoverTable.jsx     # Stock cover planning table
│
└── OrderManagement/            # Order management feature components
    ├── index.js
    ├── useOrderManagement.js   # Business logic hook
    ├── PanelHeader.jsx
    ├── PanelTabs.jsx
    ├── DetailsTab.jsx
    ├── ActionsTab.jsx
    ├── POTab.jsx
    ├── ForecastTab.jsx
    ├── ShippingTab.jsx
    └── modals/
        ├── index.js
        ├── StatusModal.jsx
        ├── AllocationModal.jsx
        ├── ShipmentModal.jsx
        ├── ForecastModal.jsx
        ├── PlanModal.jsx
        └── POApprovalModal.jsx
```

## Component Categories

### 1. UI Components (`UI/`)
**Purpose**: Basic, reusable UI building blocks
**Usage**: Used throughout the application for consistent UI elements
**Examples**: Button, Input, Select, Modal, StatusBadge, Card

### 2. Shared Components (`Shared/`)
**Purpose**: Page-level components used across multiple pages
**Usage**: Common patterns like page headers, loading states, error states
**Examples**: PageHeader, LoadingState, ErrorState, FilterBar, DataTable

### 3. Page Components (`Pages/`)
**Purpose**: Complex, page-specific components
**Usage**: Large components that are specific to one page
**Examples**: StockCoverTable

### 4. Feature Components (`OrderManagement/`)
**Purpose**: Components specific to a feature/domain
**Usage**: All components related to order management feature
**Examples**: OrderManagementPanel sub-components, modals, tabs

## Import Patterns

### ✅ Correct Imports

```javascript
// Import from main components index (recommended)
import { Button, Modal, StatusBadge, PageHeader, LoadingState } from '../components/index.js';

// Import from specific folder (also valid)
import { Button, Modal } from '../components/UI/index.js';
import { PageHeader, LoadingState } from '../components/Shared/index.js';
```

### ❌ Incorrect Imports

```javascript
// Don't import directly from files
import Button from '../components/UI/Button.jsx';
import PageHeader from '../components/Shared/PageHeader.jsx';
```

## Page Component Usage

All pages should use shared components for consistency:

```javascript
import { PageHeader, LoadingState, ErrorState, FilterBar } from '../components/index.js';

export const MyPage = () => {
  const { loading, error } = useData();
  
  if (loading) return <LoadingState message="Loading..." />;
  if (error) return <ErrorState message={error} />;
  
  return (
    <div className="space-y-4">
      <PageHeader 
        title="My Page" 
        description="Page description"
      />
      <FilterBar filters={filters} onFilterChange={setFilters} />
      {/* Page content */}
    </div>
  );
};
```

## Benefits

1. **Consistency**: All pages use the same shared components
2. **Maintainability**: Easy to find and update components
3. **Reusability**: Components are organized by purpose
4. **Scalability**: Easy to add new components in the right place
5. **Clean Imports**: Barrel exports make imports clean and organized

