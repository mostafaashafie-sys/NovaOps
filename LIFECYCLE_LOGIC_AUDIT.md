# Order Lifecycle Logic Audit

## Current Implementation Status

### ✅ CORRECTLY IMPLEMENTED

1. **FORECASTED → PLANNED**
   - ✅ `planOrderItem` method correctly transitions Forecasted → Planned
   - ✅ User can plan forecasted items via Plan action
   - ⚠️ **ISSUE**: Editing a Forecasted item doesn't automatically make it Planned (should it?)

2. **PLANNED → PENDING REGULATORY**
   - ✅ `confirmOrderItemToPO` requires label selection
   - ✅ Correctly transitions Planned → Pending Regulatory
   - ✅ Links to PO (new or existing)
   - ✅ Label is required and validated

3. **PENDING REGULATORY → REGULATORY APPROVED**
   - ✅ `approveRegulatoryLabel` correctly transitions
   - ✅ `rejectRegulatoryLabel` returns to Planned and removes label

4. **PO APPROVAL (CFO)**
   - ✅ `requestPOApproval` validates all items are Regulatory Approved
   - ✅ Only Draft POs can request approval
   - ✅ CFO approves entire PO (not individual items)

5. **Confirm to UP → BACK ORDER**
   - ✅ `confirmPOToUP` sets all items in PO to Back Order
   - ✅ PO status becomes "Confirmed to UP"

6. **BACK ORDER → ALLOCATED TO MARKET**
   - ✅ `allocateOrderItem` only works on Back Order items
   - ✅ Full allocation → Allocated to Market
   - ✅ Partial allocation with Push → Allocated + new Back Order item
   - ✅ Partial allocation with Remove → Allocated + Deleted item

7. **ALLOCATED → SHIPPED → ARRIVED**
   - ✅ Shipping handled via ShipmentsPage
   - ✅ Mark arrived action available

### ⚠️ ISSUES FOUND

1. **Delete Action Missing**
   - User says: "Actions: Edit, Delete" for Forecasted and Planned
   - Current: Only Edit action exists
   - **FIX NEEDED**: Add delete functionality for Forecasted and Planned items

2. **Edit Forecast → Planned?**
   - User says: "User edits forecast OR creates new order" → Planned
   - Current: Editing Forecasted item keeps it as Forecasted
   - **QUESTION**: Should editing automatically make it Planned, or is explicit "Plan" action required?

3. **Create New Order Status**
   - User says: "User edits forecast OR creates new order" → Planned
   - Current: Creating new order → Forecasted
   - **QUESTION**: Should new orders be Planned or Forecasted?

## Recommendations

Based on the user's logic:
- **FORECASTED**: System-generated, user can edit or delete
- **PLANNED**: User-edited forecast OR user-created new order

This suggests:
1. When user edits a Forecasted item → it should become Planned
2. When user creates a new order → it should be Planned (not Forecasted)
3. Delete action should be available for Forecasted and Planned items

