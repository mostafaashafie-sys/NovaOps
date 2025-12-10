# Architecture Documentation

## Overview

This application follows a **layered architecture** with clear separation between UI, business logic, and data management.

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

