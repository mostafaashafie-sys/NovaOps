/**
 * Mock Data Service
 * Generates mock data for development and testing
 * In production, this would be replaced by actual DataverseService calls
 */
class MockDataService {
  generateMockData() {
    const countries = [
      { id: 'KSA', name: 'Saudi Arabia', region: 'GCC', currency: 'SAR' },
      { id: 'Kuwait', name: 'Kuwait', region: 'GCC', currency: 'KWD' },
      { id: 'UAE', name: 'UAE', region: 'GCC', currency: 'AED' },
      { id: 'Lebanon', name: 'Lebanon', region: 'Levant', currency: 'LBP' }
    ];

    const skus = [
      { id: 'N1-400', name: 'NOVALAC N1 12x400gr', category: 'Infant Formula', tinSize: '400g', tinsPerCarton: 12 },
      { id: 'N1-800', name: 'NOVALAC N1 6x800gr', category: 'Infant Formula', tinSize: '800g', tinsPerCarton: 6 },
      { id: 'N2-400', name: 'NOVALAC N2 12x400gr', category: 'Follow-on Formula', tinSize: '400g', tinsPerCarton: 12 },
      { id: 'N2-800', name: 'NOVALAC N2 6x800gr', category: 'Follow-on Formula', tinSize: '800g', tinsPerCarton: 6 },
      { id: 'AC-400', name: 'NOVALAC AC 12x400gr', category: 'Specialty', tinSize: '400g', tinsPerCarton: 12 },
      { id: 'AR-400', name: 'NOVALAC AR 12x400gr', category: 'Specialty', tinSize: '400g', tinsPerCarton: 12 },
      { id: 'AD-400', name: 'NOVALAC AD 12x400gr', category: 'Specialty', tinSize: '400g', tinsPerCarton: 12 },
    ];

    const months = [];
    // Generate 36 months: 12 months back, current month, 24 months ahead
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 12, 1);
    for (let i = 0; i < 36; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      months.push({
        key: date.toISOString().slice(0, 7),
        label: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        date,
        isCurrentMonth: i === 12, // Mark current month
        isPast: i < 12
      });
    }

    // Generate orders
    const orders = [];
    const statuses = ['Draft', 'Submitted', 'Approved', 'Confirmed', 'Shipped', 'Received', 'Rejected'];
    const channels = ['Private', 'Government', 'Tender'];
    
    for (let i = 0; i < 25; i++) {
      const country = countries[Math.floor(Math.random() * countries.length)];
      const sku = skus[Math.floor(Math.random() * skus.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const month = months[Math.floor(Math.random() * 6)];
      
      orders.push({
        id: `PO-2025-${String(i + 1).padStart(3, '0')}`,
        countryId: country.id,
        countryName: country.name,
        skuId: sku.id,
        skuName: sku.name,
        status,
        channel: channels[Math.floor(Math.random() * channels.length)],
        qtyCartons: 500 + Math.floor(Math.random() * 2000),
        qtyUnits: 0,
        orderDate: new Date(2025, month.month - 1, Math.floor(Math.random() * 28) + 1).toISOString(),
        deliveryMonth: month.key,
        tender: Math.random() > 0.7,
        comments: '',
        createdBy: 'Ahmed Hassan',
        createdOn: new Date(2025, 0, Math.floor(Math.random() * 15) + 1).toISOString(),
        modifiedBy: 'Ahmed Hassan',
        modifiedOn: new Date().toISOString(),
        history: [
          { action: 'Created', by: 'Ahmed Hassan', date: new Date(2025, 0, 10).toISOString() },
          { action: 'Submitted', by: 'Ahmed Hassan', date: new Date(2025, 0, 11).toISOString() },
        ]
      });
    }

    // Generate forecasts
    const forecasts = [];
    countries.forEach(country => {
      skus.forEach(sku => {
        months.forEach(month => {
          forecasts.push({
            id: `FC-${country.id}-${sku.id}-${month.key}`,
            countryId: country.id,
            countryName: country.name,
            skuId: sku.id,
            skuName: sku.name,
            month: month.month,
            year: month.year,
            monthKey: month.key,
            forecastQty: 800 + Math.floor(Math.random() * 600),
            budgetQty: 900 + Math.floor(Math.random() * 500),
            actualQty: month.month <= 2 ? 850 + Math.floor(Math.random() * 300) : null,
          });
        });
      });
    });

    // Generate allocations
    const allocations = [];
    orders.filter(o => ['Confirmed', 'Shipped', 'Received'].includes(o.status)).forEach((order, idx) => {
      allocations.push({
        id: `AL-2025-${String(idx + 1).padStart(3, '0')}`,
        orderId: order.id,
        countryId: order.countryId,
        countryName: order.countryName,
        skuId: order.skuId,
        skuName: order.skuName,
        allocatedQty: order.qtyCartons,
        allocatedDate: order.orderDate,
        deliveryMonth: order.deliveryMonth,
        status: order.status === 'Received' ? 'Received' : 'Allocated'
      });
    });

    // Generate shipments
    const shipments = [];
    orders.filter(o => ['Shipped', 'Received'].includes(o.status)).forEach((order, idx) => {
      shipments.push({
        id: `SH-2025-${String(idx + 1).padStart(3, '0')}`,
        orderId: order.id,
        countryId: order.countryId,
        countryName: order.countryName,
        skuId: order.skuId,
        skuName: order.skuName,
        shipmentNumber: `SHIP-${String(idx + 1).padStart(4, '0')}`,
        qtyCartons: order.qtyCartons,
        shipDate: new Date(2025, 0, 15 + idx).toISOString(),
        deliveryDate: new Date(2025, 1, 1 + idx).toISOString(),
        status: order.status === 'Received' ? 'Delivered' : 'In Transit',
        carrier: ['DHL', 'Maersk', 'FedEx'][Math.floor(Math.random() * 3)],
        trackingNumber: `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      });
    });

    // Generate stock cover data
    const stockCoverData = {};
    countries.forEach(country => {
      stockCoverData[country.id] = {};
      skus.forEach((sku, skuIndex) => {
        stockCoverData[country.id][sku.id] = { sku, months: {} };
        let runningStock = 3000 + skuIndex * 500 + Math.floor(Math.random() * 2000);
        
        months.forEach((month, idx) => {
          const baseConsumption = 1200 + skuIndex * 100;
          const consumption = baseConsumption + Math.floor(Math.random() * 400) - 200;
          
          // Only allow editing for future months (not past months)
          // Allow editing starting from current month + 2 months ahead (idx 12 + 2 = 14)
          const isFutureMonth = !month.isPast;
          const isEditableMonth = isFutureMonth && idx >= 14;
          
          const relevantOrders = orders.filter(o => 
            o.countryId === country.id && 
            o.skuId === sku.id && 
            o.deliveryMonth === month.key
          );
          
          const confirmedOrderQty = relevantOrders
            .filter(o => ['Confirmed', 'Shipped', 'Received'].includes(o.status))
            .reduce((sum, o) => sum + o.qtyCartons, 0);
          
          const pendingOrderQty = relevantOrders
            .filter(o => ['Draft', 'Submitted', 'Approved'].includes(o.status))
            .reduce((sum, o) => sum + o.qtyCartons, 0);
          
          const confirmedOrder = relevantOrders.find(o => ['Confirmed', 'Shipped', 'Received'].includes(o.status));
          const pendingOrder = relevantOrders.find(o => ['Draft', 'Submitted', 'Approved'].includes(o.status));
          
          // Generate order items (forecasted items) for this month
          // Some months will have forecasted items (system-generated)
          const hasForecastedItems = isFutureMonth && Math.random() > 0.4; // 60% chance of having forecasted items
          const orderItems = [];
          if (hasForecastedItems) {
            // Generate 1-3 forecasted order items per month
            const numItems = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numItems; i++) {
              const isPlanned = Math.random() > 0.6; // 40% chance of being planned
              const isConfirmed = isPlanned && Math.random() > 0.7; // Some planned items are confirmed
              orderItems.push({
                id: `OI-${month.key}-${sku.id}-${i + 1}`,
                countryId: country.id,
                countryName: country.name,
                skuId: sku.id,
                skuName: sku.name,
                status: isConfirmed ? 'Confirmed to UP' : isPlanned ? 'Planned' : 'Forecasted',
                qtyCartons: 300 + Math.floor(Math.random() * 1500),
                deliveryMonth: month.key,
                poId: isPlanned ? `PO-2025-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}` : null,
                originalOrderItemId: null,
                isSystemGenerated: !isPlanned,
                channel: ['Private', 'Government', 'Tender'][Math.floor(Math.random() * 3)],
                tender: Math.random() > 0.8
              });
            }
          }
          
          // Also add confirmed/pending orders as order items if they exist
          if (confirmedOrder) {
            orderItems.push({
              id: confirmedOrder.id,
              countryId: country.id,
              countryName: country.name,
              skuId: sku.id,
              skuName: sku.name,
              status: confirmedOrder.status === 'Confirmed' ? 'Confirmed to UP' : confirmedOrder.status,
              qtyCartons: confirmedOrder.qtyCartons,
              deliveryMonth: month.key,
              poId: confirmedOrder.id, // Using order ID as PO for now
              originalOrderItemId: null,
              isSystemGenerated: false,
              channel: confirmedOrder.channel,
              tender: confirmedOrder.tender
            });
          }
          if (pendingOrder) {
            orderItems.push({
              id: pendingOrder.id,
              countryId: country.id,
              countryName: country.name,
              skuId: sku.id,
              skuName: sku.name,
              status: pendingOrder.status === 'Approved' ? 'Planned' : pendingOrder.status,
              qtyCartons: pendingOrder.qtyCartons,
              deliveryMonth: month.key,
              poId: null,
              originalOrderItemId: null,
              isSystemGenerated: false,
              channel: pendingOrder.channel,
              tender: pendingOrder.tender
            });
          }
          
          const plannedQty = isEditableMonth ? Math.floor(Math.random() * 2000) + 500 : 0;
          const shipmentQty = confirmedOrderQty;
          
          const openingStock = runningStock;
          const totalIn = shipmentQty;
          const closingStock = openingStock + totalIn - consumption;
          runningStock = Math.max(100, closingStock);
          
          const avgConsumption = consumption || 1;
          const monthsCover = Math.max(0, closingStock / avgConsumption);
          
          stockCoverData[country.id][sku.id].months[month.key] = {
            openingStock,
            consumption,
            plannedQty,
            confirmedOrderQty,
            confirmedOrderId: confirmedOrder?.id || null,
            confirmedOrderStatus: confirmedOrder?.status || null,
            pendingOrderQty,
            pendingOrderId: pendingOrder?.id || null,
            pendingOrderStatus: pendingOrder?.status || null,
            orderItems: orderItems, // Array of order items for this month
            shipmentQty,
            closingStock,
            monthsCover,
            isEditable: isEditableMonth
          };
        });
      });
    });

    return { countries, skus, months, orders, forecasts, allocations, shipments, stockCoverData };
  }
}

export default new MockDataService();

