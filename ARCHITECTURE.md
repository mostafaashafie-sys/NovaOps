# Architecture Documentation

## Overview

This application follows a **layered architecture** with clear separation between UI, business logic, and data management.

## Folder Structure

```
src/
├── components/
│   ├── index.js                # Components barrel export
│   ├── Layout/                 # Layout components
│   │   └── Navigation.jsx
│   ├── UI/                     # Basic reusable UI components
│   │   ├── index.js
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Modal.jsx
│   │   ├── StatusBadge.jsx
│   │   └── ... (12 components)
│   ├── Shared/                 # Page-level shared components
│   │   ├── index.js
│   │   ├── PageHeader.jsx
│   │   ├── LoadingState.jsx
│   │   ├── ErrorState.jsx
│   │   ├── DataTable.jsx
│   │   ├── FilterBar.jsx
│   │   └── OrderPill.jsx
│   ├── OrderManagement/       # Order management feature
│   │   ├── index.js
│   │   ├── OrderManagementPanel.jsx
│   │   ├── components/        # Feature sub-components
│   │   │   ├── index.js
│   │   │   ├── useOrderManagement.js
│   │   │   ├── PanelHeader.jsx
│   │   │   └── UnifiedDetailsTab.jsx  # Combined details and actions
│   │   └── modals/            # Feature modals
│   │       ├── index.js
│   │       ├── StatusModal.jsx
│   │       ├── AllocationModal.jsx
│   │       ├── MultiShipmentModal.jsx
│   │       ├── ForecastModal.jsx
│   │       ├── PlanModal.jsx
│   │       ├── ConfirmToPOModal.jsx
│   │       ├── POApprovalModal.jsx
│   │       ├── RegulatoryRejectModal.jsx
│   │       └── EditOrderItemModal.jsx
│   └── Pages/                 # Page-specific components
│       ├── index.js
│       ├── StockCoverTable.jsx
│       └── modals/
│           ├── index.js
│           ├── OrderDetailsModal.jsx
│           └── ShipmentDetailsModal.jsx
├── hooks/                     # Data fetching hooks
│   ├── index.js
│   ├── useAppData.js
│   ├── useOrders.js
│   ├── useOrderItems.js
│   ├── usePOs.js
│   ├── useForecasts.js
│   ├── useAllocations.js
│   ├── useShipments.js
│   ├── useStockCover.js
│   └── useStockCoverPage.js
├── services/                  # Business logic services
│   ├── index.js
│   ├── DataverseService.js
│   ├── MockDataService.js
│   ├── OrderService.js
│   ├── OrderItemService.js
│   ├── POService.js
│   ├── ForecastService.js
│   ├── AllocationService.js
│   ├── ShipmentService.js
│   └── StockCoverService.js
├── providers/                 # React Context providers
│   ├── index.js
│   └── AppProvider.jsx
├── pages/                     # Page components
│   ├── index.js
│   ├── HomePage.jsx
│   ├── StockCoverPage.jsx
│   ├── OrdersPage.jsx
│   ├── ForecastsPage.jsx
│   ├── AllocationsPage.jsx
│   └── ShipmentsPage.jsx
├── utils/                     # Utility functions
│   ├── index.js
│   └── formatters.js
├── config/                    # Configuration
│   ├── index.js
│   └── dataverse.config.js
└── main.jsx                   # Entry point
```

## Import Patterns

### ✅ Using Barrel Exports (Recommended)

```javascript
// Import from barrel exports
import { Button, Modal, StatusBadge, PageHeader } from '../components/index.js';
import { useOrders, usePOs } from '../hooks/index.js';
import { OrderService, POService } from '../services/index.js';
import { formatNumber, formatDate } from '../utils/index.js';
import { useApp } from '../providers/index.js';
```

### ❌ Direct Imports (Not Recommended)

```javascript
// Avoid direct imports
import Button from '../components/UI/Button.jsx';
import useOrders from '../hooks/useOrders.js';
import OrderService from '../services/OrderService.js';
```

## Layer Responsibilities

### 1. Services Layer (`src/services/`)

**Purpose**: Pure business logic, no UI dependencies

**Responsibilities**:
- API communication (Dataverse)
- Data transformations
- Business rules and calculations
- Data validation

**Rules**:
- ✅ No React imports
- ✅ No UI components
- ✅ Pure JavaScript functions
- ✅ Easily testable
- ✅ Can be used outside React

**Example**:
```javascript
// OrderService.js - Pure business logic
class OrderService {
  async createOrder(orderData) {
    // Validate, transform, call API
    return await this.dataverseService.createOrder(orderData);
  }
}
```

### 2. Hooks Layer (`src/hooks/`)

**Purpose**: Bridge between services and UI, manage data state

**Responsibilities**:
- Data fetching
- Loading/error state management
- Caching and optimization
- Provide clean API to components

**Rules**:
- ✅ Use services, never call APIs directly
- ✅ Manage loading/error states
- ✅ Return consistent interface
- ✅ Handle side effects properly

**Example**:
```javascript
// useOrders.js - Data management hook
export const useOrders = (filters) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    OrderService.getOrders(filters).then(setOrders);
  }, [filters]);
  
  return { orders, loading, error };
};
```

### 3. Providers Layer (`src/providers/`)

**Purpose**: Global state for master data only

**Responsibilities**:
- Provide master data (countries, SKUs, months)
- Global configuration
- Minimal business logic

**Rules**:
- ✅ Only master/reference data
- ✅ No business logic
- ✅ No direct service calls (use hooks)

### 4. Components Layer (`src/components/`)

**Purpose**: Reusable presentational components

**Responsibilities**:
- Display data
- Handle user input
- Emit events
- Styling

**Rules**:
- ✅ No business logic
- ✅ No direct service calls
- ✅ Receive data via props
- ✅ Emit events via callbacks
- ✅ Pure functions when possible

**Example**:
```javascript
// StatusBadge.jsx - Pure presentational
export const StatusBadge = ({ status }) => {
  const colors = getStatusColor(status);
  return <span style={{ backgroundColor: colors.bg }}>{status}</span>;
};
```

### 5. Pages Layer (`src/pages/`)

**Purpose**: Compose components and handle page-level logic

**Responsibilities**:
- Compose components
- Use hooks for data
- Handle page-level interactions
- Route management

**Rules**:
- ✅ Use hooks, not services directly
- ✅ Compose components
- ✅ Handle user interactions
- ✅ Minimal business logic

**Example**:
```javascript
// OrdersPage.jsx - Uses hooks
export const OrdersPage = () => {
  const { orders, loading, updateOrderStatus } = useOrders();
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div>
      {orders.map(order => (
        <OrderCard 
          key={order.id} 
          order={order}
          onStatusChange={updateOrderStatus}
        />
      ))}
    </div>
  );
};
```

## Data Flow

```
┌─────────────┐
│   User      │
│  Action     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Page      │  ← Composes components
│ Component   │  ← Uses hooks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Hook     │  ← Manages state
│  (useOrders)│  ← Calls services
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Service    │  ← Business logic
│ (OrderService)│  ← API calls
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   API/      │
│  Database   │
└─────────────┘
```

## Best Practices

### ✅ DO

1. **Services**: Keep pure, testable, no UI dependencies
2. **Hooks**: Manage state, handle loading/errors
3. **Components**: Be presentational, receive props
4. **Pages**: Compose, use hooks, handle interactions

### ❌ DON'T

1. **Services**: Don't import React, don't use hooks
2. **Hooks**: Don't call APIs directly, use services
3. **Components**: Don't call services, don't manage complex state
4. **Pages**: Don't call services directly, use hooks

## Testing Strategy

### Services
- Unit test with Jest
- Mock external dependencies
- Test business logic in isolation

### Hooks
- Test with React Testing Library
- Mock services
- Test state management

### Components
- Test rendering
- Test user interactions
- Snapshot testing

### Pages
- Integration tests
- Test component composition
- Test user flows

## Adding New Features

1. **Create Service** (`src/services/`)
   - Add business logic
   - No React dependencies

2. **Create Hook** (`src/hooks/`)
   - Use the service
   - Manage state
   - Return clean API

3. **Create Components** (`src/components/`)
   - Presentational
   - Reusable

4. **Create Page** (`src/pages/`)
   - Use hook
   - Compose components

## Migration Notes

When migrating from old code:

1. Extract business logic → Services
2. Extract data fetching → Hooks
3. Extract UI → Components
4. Compose → Pages

This ensures proper separation and maintainability.

## Component Organization

Components are organized into clear categories:

- **Layout/**: Application layout components (Navigation)
- **UI/**: Basic reusable UI building blocks (Button, Input, Modal, etc.)
- **Shared/**: Page-level shared components (PageHeader, LoadingState, FilterBar, etc.)
- **OrderManagement/**: Feature-specific components for order management
- **Pages/**: Page-specific complex components (StockCoverTable, etc.)

See `COMPONENT_ORGANIZATION.md` for detailed component organization guide.

## Data Model Relationships

### Purchase Order (PO) → Order Items

**Relationship:** One-to-Many
- **PO contains multiple Order Items**
- Each Order Item is linked to a PO via `poId` field

**Structure:**
- **PO** has:
  - `id`: PO identifier (e.g., "PO-2025-001")
  - `orderItemIds`: Array of order item IDs
  - `orderItems`: Array of order item objects (enriched)
  - `countries`: Array of unique countries in this PO
  - `skus`: Array of unique SKUs in this PO
  - `totalQtyCartons`: Sum of all order items

- **Order Item** has:
  - `id`: Order item identifier
  - `poId`: Link to Purchase Order (can be null if not linked)
  - `countryId`, `countryName`: One country per order item
  - `skuId`, `skuName`: One SKU per order item
  - `qtyCartons`: Quantity for this specific SKU+Country combination

### Order Item Structure

**Relationship:** One Order Item = One SKU + One Country

**Key Points:**
- ✅ Each Order Item represents **one SKU** for **one Country**
- ✅ Multiple Order Items can have the same SKU but different countries
- ✅ Multiple Order Items can have the same country but different SKUs
- ✅ Each Order Item is uniquely identified by: SKU + Country + Delivery Month

### Shipment → Order Items + Country

**Relationship:** One-to-Many (with country constraint)
- **Shipment contains multiple Order Items**
- **Shipment is to ONE country** (destination)
- All order items in a shipment should be for the same country

**Structure:**
- **Shipment** has:
  - `id`: Shipment identifier
  - `shipmentNumber`: Human-readable shipment number
  - `orderItemIds`: Array of order item IDs (multiple items)
  - `countryId`: Destination country (ONE country)
  - `countryName`: Destination country name
  - `status`: Shipment status (Shipped to Market, Arrived to Market)
  - `shipDate`, `deliveryDate`: Shipping dates
  - `carrier`: Shipping carrier

**Key Points:**
- ✅ Shipment can contain **multiple Order Items**
- ✅ Shipment has **ONE destination country**
- ⚠️ **Note:** Currently, the UI allows selecting items from different countries, but the shipment is assigned to ONE destination country. In practice, items in a shipment should typically be for the same country, but the system allows flexibility.

### Summary Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA MODEL RELATIONSHIPS                  │
└─────────────────────────────────────────────────────────────┘

Purchase Order (PO)
    │
    ├─── Order Item 1 (SKU-A, Country-KSA, Month-2025-01)
    ├─── Order Item 2 (SKU-A, Country-UAE, Month-2025-01)
    ├─── Order Item 3 (SKU-B, Country-KSA, Month-2025-01)
    └─── Order Item 4 (SKU-C, Country-KSA, Month-2025-02)

Shipment (Destination: KSA)
    │
    ├─── Order Item 1 (SKU-A, Country-KSA) ← from PO-001
    ├─── Order Item 3 (SKU-B, Country-KSA) ← from PO-001
    └─── Order Item 5 (SKU-D, Country-KSA) ← from PO-002
```

**Additional Notes:**
- A PO can contain order items for multiple countries (PO aggregates items across countries)
- A Shipment is to one specific destination country (but can contain items from different POs)
- Order Items maintain their PO link even when added to a shipment
- When items are shipped, they keep their `poId` reference for tracking

