# Unified Management Interface Guide

## Overview

The Stock Cover Planning page now features a comprehensive **Order Management Panel** that allows you to manage almost everything from one screen using a sidebar interface.

## Features

### 🎯 Accessing the Panel

1. **From Stock Cover Table**:
   - Click on any **Confirmed Order ID** (blue link) in the "Confirmed Orders" row
   - Click on any **Pending Order ID** (amber link) in the "Pending Orders" row
   - Click the **"+ Order"** button in any Months Cover cell to create a new order

2. **Panel Opens**: A sidebar panel slides in from the right with 4 tabs

### 📋 Tab 1: Details

**Order Information**:
- View complete order details (SKU, Country, Quantity, Delivery Month, Channel)
- See order history with timestamps
- View order status badge

**When No Order Selected**:
- Shows option to create a new order directly

### ⚡ Tab 2: Actions

**Quick Actions Available**:

1. **Change Status** 🔄
   - Update order status (Draft → Submitted → Approved → Confirmed → Shipped → Received)
   - Or reject orders
   - Modal with all status options

2. **Allocate Order** 📦
   - Create allocation for the order
   - Specify quantity to allocate
   - Automatically links to order

3. **Create Shipment** 🚚
   - Set up shipping for the order
   - Enter ship date, delivery date, and carrier
   - Generates tracking number automatically

4. **New Order** ➕
   - Create a completely new order
   - Pre-filled with context (country, SKU, month) if clicked from table
   - Full order form with all fields

### 📈 Tab 3: Forecast

**Forecast Management**:
- View current forecast, budget, and actual quantities
- Update forecast values
- Create forecast if none exists for the period
- Directly linked to the order's country, SKU, and month

### 🚚 Tab 4: Shipping

**Shipping Information**:
- View shipment details (if created)
- See shipment status, carrier, dates, tracking number
- Mark shipments as delivered
- Create shipment if not yet created

**Allocation Status**:
- View related allocation information
- See allocated quantities and status

## Workflow Examples

### Example 1: Complete Order Lifecycle

1. **Create Order**: Click "+ Order" in Months Cover cell
2. **Panel Opens**: Go to "Actions" tab → "New Order"
3. **Fill Form**: Enter all order details
4. **Submit**: Order created, panel refreshes
5. **Change Status**: Go to "Actions" → "Change Status" → Select "Submitted"
6. **Approve**: Change status to "Approved"
7. **Allocate**: Go to "Actions" → "Allocate Order"
8. **Create Shipment**: Go to "Actions" → "Create Shipment"
9. **Track**: Go to "Shipping" tab to see shipment details
10. **Mark Delivered**: Click "Mark as Delivered" when shipment arrives

### Example 2: Quick Status Update

1. Click on order ID in table
2. Panel opens on "Details" tab
3. Switch to "Actions" tab
4. Click "Change Status"
5. Select new status
6. Done! Status updated instantly

### Example 3: Forecast Adjustment

1. Click on order ID in table
2. Go to "Forecast" tab
3. Click "Update Forecast"
4. Adjust forecast, budget, or actual quantities
5. Save changes
6. Forecast updated for that period

## Panel Features

### ✅ Smart Context Awareness
- Pre-fills forms with context (country, SKU, month) when opened from table
- Shows related data (shipments, allocations, forecasts)
- Updates automatically after actions

### ✅ Real-time Updates
- All actions refresh related data automatically
- No page reload needed
- Instant feedback on changes

### ✅ Comprehensive Actions
- Everything in one place
- No need to navigate between pages
- Quick access to all order-related functions

### ✅ Visual Feedback
- Color-coded action buttons
- Status badges
- Loading states
- Error handling

## Keyboard Shortcuts

- **ESC**: Close panel
- **Click Backdrop**: Close panel

## Tips

1. **Quick Access**: Click any order ID in the table for instant access
2. **Context Matters**: Panel pre-fills based on where you clicked
3. **Tab Navigation**: Use tabs to organize different aspects of order management
4. **Multiple Actions**: You can perform multiple actions in sequence without closing the panel
5. **Auto-refresh**: Data refreshes automatically after each action

## Architecture

The panel follows the same clean architecture:
- Uses hooks for data management
- Services handle business logic
- Components are presentational
- Proper error handling and loading states

---

**Enjoy the unified management experience!** 🚀

