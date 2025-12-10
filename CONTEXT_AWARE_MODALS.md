# Context-Aware Modals & Actions

## ✅ Implementation Summary

All modals and actions in the OrderManagementPanel are now **fully context-aware** based on what the user clicked on.

## 🎯 Context-Aware Features

### 1. **Allocation Modal**
**Context**: Order Item clicked
- ✅ Pre-fills with order item's quantity
- ✅ Pre-fills with order item's delivery month
- ✅ Shows order item details (ID, SKU, Country, Quantity, PO)
- ✅ Title includes order item ID: "Allocate Order Item: OI-123"
- ✅ Only shows for order items with status "Confirmed to UP"

**Before**:
```jsx
title="Allocate Order Item"
// No context shown
```

**After**:
```jsx
title={`Allocate Order Item: ${orderItem.id}`}
// Shows full context: ID, SKU, Country, Quantity, PO
```

---

### 2. **Shipment Modal**
**Context**: Order Item clicked
- ✅ Pre-fills with order item context
- ✅ Shows order item details (ID, Quantity, SKU, Country, PO)
- ✅ Title includes order item ID: "Create Shipment for OI-123"
- ✅ Form is pre-contextualized

**Before**:
```jsx
title="Create Shipment"
// Generic form
```

**After**:
```jsx
title={`Create Shipment for ${orderItem.id}`}
// Shows full context before form
```

---

### 3. **Status Change Modal**
**Context**: Order Item clicked
- ✅ Shows current order item details
- ✅ Title includes order item ID: "Change Status: OI-123"
- ✅ Displays: Order Item ID, Current Status, SKU, Quantity
- ✅ Only shows valid status transitions for that item

**Before**:
```jsx
title="Change Order Item Status"
// Minimal context
```

**After**:
```jsx
title={`Change Status: ${orderItem.id}`}
// Shows full context card
```

---

### 4. **Plan Order Item Modal**
**Context**: Forecasted Order Item clicked
- ✅ Shows order item details (ID, Status, Quantity, SKU, Country, Month)
- ✅ Title includes order item ID: "Plan Order Item: OI-123"
- ✅ Only available for "Forecasted" status items
- ✅ Pre-contextualized with item information

**Before**:
```jsx
title="Plan Order Item"
// Basic info
```

**After**:
```jsx
title={`Plan Order Item: ${orderItem.id}`}
// Full context card with all details
```

---

### 5. **Forecast Modal**
**Context**: Country/SKU/Month clicked
- ✅ Shows context: Country, SKU, Month
- ✅ Title includes month: "Update Forecast: 2025-01"
- ✅ Pre-fills with existing forecast data if available
- ✅ Contextualized to the specific period

**Before**:
```jsx
title={relatedForecast ? "Update Forecast" : "Create Forecast"}
// No context shown
```

**After**:
```jsx
title={`Update Forecast: ${monthKey}`}
// Shows Country, SKU, Month context
```

---

### 6. **PO Approval Modal**
**Context**: PO clicked or viewed
- ✅ Shows PO details (ID, Status, Total Quantity)
- ✅ Lists all order items in the PO
- ✅ Title includes PO ID: "Request Approval: PO-2025-001"
- ✅ Full context of what's being approved

**Before**:
```jsx
title="Request PO Approval"
// Basic PO info
```

**After**:
```jsx
title={`Request Approval: ${po.id}`}
// Full context with order items list
```

---

## 🔄 Dynamic Form Pre-filling

### Allocation Form
```javascript
// Automatically pre-fills when order item is selected
useEffect(() => {
  if (orderItem && orderItem.status === 'Confirmed to UP') {
    setAllocationForm({
      allocatedQty: orderItem.qtyCartons,  // Pre-filled
      allocationMonth: orderItem.deliveryMonth,  // Pre-filled
      action: 'Full',
      pushToMonth: ''
    });
  }
}, [orderItem?.id, orderItem?.status]);
```

### Shipment Form
- Pre-contextualized with order item details
- User only needs to fill: ship date, delivery date, carrier
- Quantity and other details are shown from context

---

## 📋 Context Cards in Modals

All modals now show a **context card** at the top with:
- Order Item ID (if applicable)
- Status badge
- SKU name
- Country name
- Quantity
- Delivery Month
- Purchase Order (if linked)

**Example**:
```jsx
<div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
  <div className="text-sm space-y-2">
    <div className="flex items-center justify-between">
      <span className="font-medium text-gray-700">Order Item:</span>
      <span className="font-mono font-semibold text-blue-700">{orderItem.id}</span>
    </div>
    {/* More context rows... */}
  </div>
</div>
```

---

## 🎨 User Experience Improvements

1. **Clear Context**: Users always know what they're working with
2. **Pre-filled Forms**: Less typing, fewer errors
3. **Visual Feedback**: Context cards show all relevant information
4. **Smart Defaults**: Forms default to sensible values
5. **Error Prevention**: Can't allocate/ship without proper context

---

## 🔍 Context Flow

```
User Clicks Order Pill
    ↓
Panel Opens with Order Item ID
    ↓
Order Item Loaded
    ↓
User Clicks Action (e.g., "Allocate")
    ↓
Modal Opens with:
  - Title: "Allocate Order Item: OI-123"
  - Context Card: Full order item details
  - Pre-filled Form: Quantity, Month, etc.
    ↓
User Completes Action
    ↓
Action Applied to Specific Order Item
```

---

## ✅ Benefits

1. **No Confusion**: Always clear what item/PO is being acted upon
2. **Faster Workflow**: Pre-filled forms save time
3. **Fewer Errors**: Context prevents wrong selections
4. **Better UX**: Professional, contextual interface
5. **Audit Trail**: Clear what was changed and why

---

## 📝 Implementation Details

- All modals check for context before rendering
- Empty states shown if context is missing
- Forms reset to context when order item changes
- Titles dynamically include context identifiers
- Context cards show in all relevant modals

