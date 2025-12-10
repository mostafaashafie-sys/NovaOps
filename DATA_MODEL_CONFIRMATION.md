# Data Model Relationships Confirmation

## ✅ Confirmed Relationships

### 1. Purchase Order (PO) → Order Items

**Relationship:** One-to-Many
- **PO contains multiple Order Items**
- Each Order Item is linked to a PO via `poId` field

**Evidence from Code:**
```javascript
// POService.js - PO contains orderItemIds array
po.orderItems = (this.mockData.orderItems || []).filter(oi => oi.poId === poId);

// When creating PO
orderItemIds: orderItemIds,  // Array of order item IDs

// When linking order items to PO
orderItem.poId = poId;  // Each order item links to PO
```

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

---

### 2. Order Item Structure

**Relationship:** One Order Item = One SKU + One Country

**Evidence from Code:**
```javascript
// MockDataService.js - Order Item structure
const orderItem = {
  id: `OI-${month.key}-${sku.id}-${i + 1}`,
  countryId: country.id,      // ONE country
  countryName: country.name,
  skuId: sku.id,              // ONE SKU
  skuName: sku.name,
  poId: poId,                 // Link to PO
  qtyCartons: 300 + Math.floor(Math.random() * 1500),
  deliveryMonth: month.key,
  // ... other fields
};
```

**Key Points:**
- ✅ Each Order Item represents **one SKU** for **one Country**
- ✅ Multiple Order Items can have the same SKU but different countries
- ✅ Multiple Order Items can have the same country but different SKUs
- ✅ Each Order Item is uniquely identified by: SKU + Country + Delivery Month

---

### 3. Shipment → Order Items + Country

**Relationship:** One-to-Many (with country constraint)
- **Shipment contains multiple Order Items**
- **Shipment is to ONE country** (destination)
- All order items in a shipment should be for the same country

**Evidence from Code:**
```javascript
// ShipmentService.js - Shipment structure
const newShipment = {
  id: `SH-2025-${String(this.mockData.shipments.length + 1).padStart(3, '0')}`,
  shipmentNumber: `SHIP-${String(this.mockData.shipments.length + 1).padStart(4, '0')}`,
  orderItemIds: orderItemIds,  // Array of order item IDs
  countryId: destination,      // ONE destination country
  status: 'Shipped to Market',
  // ... other fields
};

// MultiShipmentModal.jsx - Destination selection
<select value={destination} onChange={(e) => setDestination(e.target.value)}>
  <option value="">Select Country</option>
  {Array.from(new Set(selectedItemsArray.map(item => item.countryId))).map(countryId => {
    // Shows countries from selected items
  })}
</select>
```

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

---

## Summary Diagram

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

---

## ✅ Confirmation

**Your understanding is CORRECT:**

1. ✅ **PO (Purchase Order)** contains multiple **Order Items**
2. ✅ **One Order Item** = **One SKU** + **One Country** (linked to PO via `poId`)
3. ✅ **Shipment** is to **one country** and contains **multiple Order Items**

**Additional Notes:**
- A PO can contain order items for multiple countries (PO aggregates items across countries)
- A Shipment is to one specific destination country (but can contain items from different POs)
- Order Items maintain their PO link even when added to a shipment
- When items are shipped, they keep their `poId` reference for tracking

