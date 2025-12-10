# Feature Location Guide

This document shows where all the allocation, shipping, and popup logic is located in the codebase.

## 📍 Main Components & Popups

### 1. **Order Management Panel** (Main Popup/Sidebar)
**Location**: `src/components/OrderManagementPanel.jsx`

**What it does**:
- Main sidebar panel that opens when clicking on order pills in the stock cover table
- Contains 4 tabs: Details, Actions, Forecast, Shipping
- Handles all order-related actions in one place

**Features**:
- ✅ Status change modal
- ✅ Allocation modal (basic - needs enhancement for partial allocation)
- ✅ Shipment creation modal
- ✅ Forecast update modal
- ✅ New order creation form

**Status**: ⚠️ **Needs Update** - Currently uses old order model, needs to be updated for OrderItems and POs

---

### 2. **Allocation Logic**

#### Service Layer
**Location**: `src/services/AllocationService.js`

**Key Methods**:
- `getAllocations(filters)` - Get all allocations
- `allocateOrderItem(orderItemId, allocatedQty, allocationMonth, action, pushToMonth, userId)` - **Main allocation method**
  - Supports: Full, Partial, Push, Remove actions
  - Handles pushing remaining quantity to different month
  - Creates new order items when pushing

**Status**: ✅ **Complete** - Has full partial allocation logic with push/remove

#### Hook Layer
**Location**: `src/hooks/useAllocations.js`

**Provides**:
- `allocations` - List of allocations
- `createAllocation(data)` - Create allocation
- `moveAllocation(allocationId, targetCountryId, targetMonth, quantity)` - Move allocation
- `refresh()` - Refresh data

**Status**: ✅ **Complete**

#### UI Page
**Location**: `src/pages/AllocationsPage.jsx`

**What it does**:
- Standalone page for viewing all allocations
- Table view with filters
- Move allocation modal

**Status**: ✅ **Complete** - But needs integration with OrderItems

---

### 3. **Shipping Logic**

#### Service Layer
**Location**: `src/services/ShipmentService.js`

**Key Methods**:
- `getShipments(filters)` - Get all shipments
- `createShipment(shipmentData)` - Create new shipment
- `updateShipmentStatus(shipmentId, newStatus)` - Update shipment status

**Status**: ✅ **Complete**

#### Hook Layer
**Location**: `src/hooks/useShipments.js`

**Provides**:
- `shipments` - List of shipments
- `createShipment(shipmentData)` - Create shipment
- `updateShipmentStatus(shipmentId, newStatus)` - Update status
- `refresh()` - Refresh data

**Status**: ✅ **Complete**

#### UI Page
**Location**: `src/pages/ShipmentsPage.jsx`

**What it does**:
- Standalone page for viewing all shipments
- Table view with filters
- Status update functionality

**Status**: ✅ **Complete**

---

### 4. **Modal Components**

#### Base Modal Component
**Location**: `src/components/Modal.jsx`

**What it does**:
- Reusable modal/dialog component
- Used by all popups in the application

**Status**: ✅ **Complete**

---

## 🚧 What Needs to Be Updated/Enhanced

### 1. **OrderManagementPanel** - Needs Major Update
**Current Issues**:
- Uses old `Order` model instead of `OrderItem`
- Doesn't support new business logic (POs, forecasted items, etc.)
- Allocation modal is basic - doesn't support partial allocation with push/remove
- Doesn't integrate with OrderItemService or POService

**What Needs to Be Done**:
1. Update to use `OrderItemService` instead of `OrderService`
2. Add PO management (link to PO, create PO, request approval)
3. Enhance allocation modal to support:
   - Full allocation
   - Partial allocation with push to different month
   - Partial allocation with remove remaining
4. Add forecasted order item planning
5. Add PO approval workflow

**Files to Update**:
- `src/components/OrderManagementPanel.jsx`

---

### 2. **Allocation Modal in OrderManagementPanel**
**Current**: Basic allocation form
**Needed**: Enhanced modal with:
- Full/Partial selection
- If Partial:
  - Quantity input
  - Push to month selector
  - Remove remaining option
- Visual feedback for remaining quantity

**Location**: Inside `OrderManagementPanel.jsx` - `showAllocateModal` section

---

### 3. **PO Management Popups**
**Status**: ❌ **Not Created Yet**

**What's Needed**:
1. **PO Creation Modal** - When planning order items, create or link to PO
2. **PO Approval Request Modal** - Request manager approval
3. **PO Approval Modal** (Manager View) - Approve/reject PO
4. **PO Summary View** - Show all order items in PO

**Services Available**:
- `src/services/POService.js` - ✅ Complete
- Need hooks: `src/hooks/usePOs.js` - ❌ Not created
- Need components: PO modals - ❌ Not created

---

### 4. **Order Item Planning Popup**
**Status**: ❌ **Not Created Yet**

**What's Needed**:
- Modal to plan forecasted order items
- Link to existing PO or create new PO
- Update status from Forecasted → Planned

**Services Available**:
- `src/services/OrderItemService.js` - ✅ Complete
- Need hooks: `src/hooks/useOrderItems.js` - ❌ Not created

---

## 📂 File Structure Summary

```
src/
├── components/
│   ├── OrderManagementPanel.jsx    ⚠️ Needs update for new logic
│   ├── Modal.jsx                   ✅ Complete
│   ├── OrderPill.jsx               ✅ Complete
│   └── StatusBadge.jsx             ✅ Complete
│
├── pages/
│   ├── AllocationsPage.jsx         ✅ Complete (needs OrderItem integration)
│   ├── ShipmentsPage.jsx           ✅ Complete
│   └── StockCoverPage.jsx          ✅ Complete (shows order pills)
│
├── services/
│   ├── AllocationService.js        ✅ Complete (has partial allocation)
│   ├── ShipmentService.js           ✅ Complete
│   ├── OrderItemService.js          ✅ Complete
│   └── POService.js                 ✅ Complete
│
├── hooks/
│   ├── useAllocations.js           ✅ Complete
│   ├── useShipments.js              ✅ Complete
│   ├── useOrderItems.js             ❌ Not created
│   └── usePOs.js                   ❌ Not created
```

---

## 🎯 Priority Actions Needed

### High Priority
1. **Create `useOrderItems.js` hook** - Bridge OrderItemService to UI
2. **Create `usePOs.js` hook** - Bridge POService to UI
3. **Update `OrderManagementPanel.jsx`**:
   - Use OrderItems instead of Orders
   - Add PO management
   - Enhance allocation modal for partial allocation
   - Add planning functionality

### Medium Priority
4. **Create PO Management Modals**:
   - PO creation/linking modal
   - PO approval request modal
   - PO approval modal (manager view)
5. **Create Order Item Planning Modal**

### Low Priority
6. **Update AllocationsPage** to use OrderItems
7. **Update ShipmentsPage** to use OrderItems

---

## 🔗 Integration Points

### From Stock Cover Page
- Click order pill → Opens `OrderManagementPanel`
- Panel should handle:
  - Viewing order item details
  - Planning forecasted items
  - Allocating (with partial support)
  - Creating shipments
  - Managing POs

### Current Flow
1. Stock Cover shows order pills ✅
2. Click pill → Opens OrderManagementPanel ✅
3. Panel shows old order model ⚠️ **Needs Update**
4. Allocation is basic ⚠️ **Needs Enhancement**
5. PO management missing ❌ **Not Implemented**

---

## 📝 Next Steps

1. **Create missing hooks** (`useOrderItems.js`, `usePOs.js`)
2. **Update OrderManagementPanel** to use new services
3. **Enhance allocation modal** with partial allocation UI
4. **Create PO management modals**
5. **Test complete workflow** end-to-end

