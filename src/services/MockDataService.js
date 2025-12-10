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

    // Generate labels for regulatory approval
    const labels = [];
    countries.forEach(country => {
      const countryLabels = [
        { id: `LABEL-${country.id}-001`, name: `${country.name} Standard Label`, description: 'Standard regulatory label', countryId: country.id },
        { id: `LABEL-${country.id}-002`, name: `${country.name} Premium Label`, description: 'Premium regulatory label', countryId: country.id },
        { id: `LABEL-${country.id}-003`, name: `${country.name} Export Label`, description: 'Export regulatory label', countryId: country.id },
      ];
      labels.push(...countryLabels);
    });
    // Add some global labels
    labels.push(
      { id: 'LABEL-GLOBAL-001', name: 'Global Standard Label', description: 'Universal regulatory label', countryId: null },
      { id: 'LABEL-GLOBAL-002', name: 'Global Export Label', description: 'Universal export label', countryId: null }
    );

    const months = [];
    // Generate full years: previous year, current year, and 2 years ahead
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    // Start from January of previous year
    const startYear = currentYear - 1;
    const endYear = currentYear + 2; // 2 years ahead
    
    // Generate all months from startYear January to endYear December
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        const isCurrentMonth = year === currentYear && month === currentMonth;
        const isPast = date < new Date(currentYear, currentMonth, 1);
        
        months.push({
          key: date.toISOString().slice(0, 7),
          label: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
          month: month + 1,
          year: year,
          date,
          isCurrentMonth: isCurrentMonth,
          isPast: isPast
        });
      }
    }

    // Generate orders (legacy - for backward compatibility)
    // CLEARED: No mock orders generated
    const orders = [];

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

    // Generate order items and purchase orders with proper logic
    // CLEARED: No mock order items or POs generated - returning empty arrays
    const allOrderItems = [];
    const purchaseOrders = [];
    const poMap = new Map(); // Track POs by ID to ensure country consistency
    let poCounter = 1; // Counter for generating unique PO names
    
    // Generate stock cover data (without order items)
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
          const isFutureMonth = !month.isPast;
          const isEditableMonth = isFutureMonth && idx >= 14;
          
          const orderItems = [];
          
          // CLEARED: Order item generation skipped - returning empty array
          // All order item generation code below is commented out
          /*
          // Generate order items for this month/SKU/country combination
          // Distribution: More forecasted items, fewer in advanced stages
          const rand = Math.random();
          let numItems = 0;
          let statusDistribution = [];
          
          if (isFutureMonth) {
            // Future months: Generate 1-3 items with various statuses
            numItems = Math.floor(Math.random() * 3) + 1;
            
            // Status distribution for future months
            for (let i = 0; i < numItems; i++) {
              const itemRand = Math.random();
              if (itemRand > 0.7) {
                statusDistribution.push('Forecasted'); // 30% Forecasted
              } else if (itemRand > 0.5) {
                statusDistribution.push('Planned'); // 20% Planned
              } else if (itemRand > 0.35) {
                statusDistribution.push('Pending Regulatory'); // 15% Pending Regulatory
              } else if (itemRand > 0.2) {
                statusDistribution.push('Regulatory Approved'); // 15% Regulatory Approved
              } else if (itemRand > 0.1) {
                statusDistribution.push('Back Order'); // 10% Back Order
              } else if (itemRand > 0.05) {
                statusDistribution.push('Allocated to Market'); // 5% Allocated
              } else {
                statusDistribution.push('Shipped to Market'); // 5% Shipped
              }
            }
          } else {
            // Past months: Generate items that are mostly completed
            numItems = Math.random() > 0.5 ? 1 : 2;
            for (let i = 0; i < numItems; i++) {
              const itemRand = Math.random();
              if (itemRand > 0.3) {
                statusDistribution.push('Arrived to Market'); // 70% Arrived
              } else if (itemRand > 0.1) {
                statusDistribution.push('Shipped to Market'); // 20% Shipped
              } else {
                statusDistribution.push('Allocated to Market'); // 10% Allocated
              }
            }
          }
          
          // Generate order items with proper statuses
          statusDistribution.forEach((status, itemIdx) => {
            let poId = null;
            let labelId = null;
            
            // Determine PO and label based on status
            if (status !== 'Forecasted') {
              // All non-forecasted items need a PO
              // Find or create a PO for this country
              let po = null;
              
              // Try to find an existing PO for this country that can accept more items
              for (const [existingPoId, existingPo] of poMap.entries()) {
                if (existingPo.countries && existingPo.countries.length > 0 && 
                    existingPo.countries[0] === country.id &&
                    (existingPo.status === 'Draft' || existingPo.status === 'Pending CFO Approval' || existingPo.status === 'CFO Approved')) {
                  po = existingPo;
                  poId = existingPoId;
                  break;
                }
              }
              
              // If no suitable PO found, create a new one
              if (!po) {
                poId = `PO-${currentYear}-${String(poCounter).padStart(3, '0')}`;
                poCounter++;
                
                // Generate PO dates
                const deliveryDateObj = new Date(month.year, month.month - 1, 1);
                const poDateObj = new Date(deliveryDateObj);
                poDateObj.setMonth(poDateObj.getMonth() - (Math.floor(Math.random() * 3) + 1)); // 1-3 months before
                
                // Ensure PO date is not in the future
                const today = new Date();
                if (poDateObj > today) {
                  poDateObj.setTime(today.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000)); // Random date in last 30 days
                }
                
                const poDate = poDateObj.toISOString().split('T')[0];
                const deliveryDate = deliveryDateObj.toISOString().split('T')[0];
                
                // Determine PO status based on order item status
                let poStatus = 'Draft';
                if (status === 'Regulatory Approved') {
                  poStatus = 'Draft'; // Can request approval
                } else if (status === 'Back Order' || status === 'Allocated to Market' || status === 'Shipped to Market') {
                  poStatus = 'Confirmed to UP';
                } else if (status === 'Pending Regulatory') {
                  poStatus = 'Draft';
                }
                
                po = {
                  id: poId,
                  poName: poId, // Use ID as name for mock data
                  status: poStatus,
                  orderItemIds: [],
                  totalQtyCartons: 0,
                  countries: [country.id],
                  skus: [],
                  poDate: poDate,
                  deliveryDate: deliveryDate,
                  requestedBy: null,
                  requestedOn: null,
                  approvedBy: null,
                  approvedOn: null,
                  confirmedBy: null,
                  confirmedOn: null,
                  createdOn: new Date().toISOString(),
                  modifiedOn: new Date().toISOString(),
                  createdBy: 'System',
                  modifiedBy: 'System',
                  history: [{
                    action: 'Created',
                    by: 'System',
                    date: new Date().toISOString()
                  }]
                };
                
                purchaseOrders.push(po);
                poMap.set(poId, po);
              }
              
              // Assign label for items that need regulatory approval
              if (status === 'Pending Regulatory' || status === 'Regulatory Approved') {
                const countryLabels = labels.filter(l => !l.countryId || l.countryId === country.id);
                if (countryLabels.length > 0) {
                  labelId = countryLabels[Math.floor(Math.random() * countryLabels.length)].id;
                }
              }
            }
            
            const orderItem = {
              id: `OI-${month.key}-${country.id}-${sku.id}-${itemIdx + 1}`,
              countryId: country.id,
              countryName: country.name,
              skuId: sku.id,
              skuName: sku.name,
              status: status,
              qtyCartons: 300 + Math.floor(Math.random() * 1500),
              deliveryMonth: month.key,
              poId: poId,
              labelId: labelId,
              originalOrderItemId: null,
              isSystemGenerated: status === 'Forecasted',
              channel: ['Private', 'Government', 'Tender'][Math.floor(Math.random() * 3)],
              tender: Math.random() > 0.8,
              createdOn: new Date().toISOString(),
              modifiedOn: new Date().toISOString(),
              createdBy: status === 'Forecasted' ? 'System' : 'Ahmed Hassan',
              modifiedBy: status === 'Forecasted' ? 'System' : 'Ahmed Hassan',
              history: [{
                action: status === 'Forecasted' ? 'Forecasted' : 'Created',
                by: status === 'Forecasted' ? 'System' : 'Ahmed Hassan',
                date: new Date().toISOString()
              }]
            };
            
            orderItems.push(orderItem);
            allOrderItems.push(orderItem);
            
            // Update PO with this order item
            if (poId && poMap.has(poId)) {
              const po = poMap.get(poId);
              po.orderItemIds.push(orderItem.id);
              po.totalQtyCartons += orderItem.qtyCartons;
              if (!po.skus.includes(sku.id)) {
                po.skus.push(sku.id);
              }
            }
          });
          
          // Calculate stock cover metrics
          const confirmedOrderQty = orderItems
            .filter(oi => ['Back Order', 'Allocated to Market', 'Shipped to Market', 'Arrived to Market'].includes(oi.status))
            .reduce((sum, oi) => sum + oi.qtyCartons, 0);
          
          const pendingOrderQty = orderItems
            .filter(oi => ['Forecasted', 'Planned', 'Pending Regulatory', 'Regulatory Approved'].includes(oi.status))
            .reduce((sum, oi) => sum + oi.qtyCartons, 0);
          
          const plannedQty = isEditableMonth ? Math.floor(Math.random() * 2000) + 500 : 0;
          const shipmentQty = orderItems
            .filter(oi => ['Shipped to Market', 'Arrived to Market'].includes(oi.status))
            .reduce((sum, oi) => sum + oi.qtyCartons, 0);
          
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
            confirmedOrderId: null,
            confirmedOrderStatus: null,
            pendingOrderQty,
            pendingOrderId: null,
            pendingOrderStatus: null,
            orderItems: orderItems, // Empty array - no order items generated
            shipmentQty: 0, // No shipments since no order items
            closingStock,
            monthsCover,
            isEditable: isEditableMonth
          };
          */
          // END OF COMMENTED OUT ORDER ITEM GENERATION
          
          // Set stock cover data without order items
          const openingStock = runningStock;
          const totalIn = 0; // No shipments
          const closingStock = openingStock + totalIn - consumption;
          runningStock = Math.max(100, closingStock);
          
          const avgConsumption = consumption || 1;
          const monthsCover = Math.max(0, closingStock / avgConsumption);
          
          stockCoverData[country.id][sku.id].months[month.key] = {
            openingStock,
            consumption,
            plannedQty: 0,
            confirmedOrderQty: 0,
            confirmedOrderId: null,
            confirmedOrderStatus: null,
            pendingOrderQty: 0,
            pendingOrderId: null,
            pendingOrderStatus: null,
            orderItems: [], // Empty - no order items
            shipmentQty: 0,
            closingStock,
            monthsCover,
            isEditable: isEditableMonth
          };
        });
      });
    });

    // Generate allocations based on allocated order items
    const allocations = [];
    allOrderItems
      .filter(oi => oi.status === 'Allocated to Market' || oi.status === 'Shipped to Market' || oi.status === 'Arrived to Market')
      .forEach((orderItem, idx) => {
        allocations.push({
          id: `AL-${currentYear}-${String(idx + 1).padStart(3, '0')}`,
          orderItemId: orderItem.id,
          countryId: orderItem.countryId,
          countryName: orderItem.countryName,
          skuId: orderItem.skuId,
          skuName: orderItem.skuName,
          allocatedQty: orderItem.qtyCartons,
          allocationMonth: orderItem.deliveryMonth,
          allocatedDate: orderItem.modifiedOn || orderItem.createdOn,
          status: 'Allocated to Market'
        });
      });

    // Generate shipments based on shipped/arrived order items
    const shipments = [];
    const shipmentMap = new Map(); // Group order items by country for shipments
    
    // Group order items by country and status for shipment creation
    const shippedItemsByCountry = {};
    allOrderItems
      .filter(oi => oi.status === 'Shipped to Market' || oi.status === 'Arrived to Market')
      .forEach(orderItem => {
        if (!shippedItemsByCountry[orderItem.countryId]) {
          shippedItemsByCountry[orderItem.countryId] = [];
        }
        shippedItemsByCountry[orderItem.countryId].push(orderItem);
      });
    
    // Create shipments (one per country, or multiple if many items)
    Object.entries(shippedItemsByCountry).forEach(([countryId, items]) => {
      // Group items into shipments (max 5 items per shipment)
      const shipmentSize = 5;
      for (let i = 0; i < items.length; i += shipmentSize) {
        const shipmentItems = items.slice(i, i + shipmentSize);
        const shipmentId = `SH-${currentYear}-${String(shipments.length + 1).padStart(3, '0')}`;
        const orderItemIds = shipmentItems.map(oi => oi.id);
        const totalQty = shipmentItems.reduce((sum, oi) => sum + oi.qtyCartons, 0);
        
        // Determine shipment status based on order items
        const allArrived = shipmentItems.every(oi => oi.status === 'Arrived to Market');
        const shipmentStatus = allArrived ? 'Completed' : 'Shipped to Market';
        
        // Get earliest and latest dates
        const dates = shipmentItems.map(oi => new Date(oi.modifiedOn || oi.createdOn)).sort((a, b) => a - b);
        const shipDate = dates[0];
        const deliveryDate = dates[dates.length - 1];
        
        shipments.push({
          id: shipmentId,
          shipmentNumber: `SHIP-${String(shipments.length + 1).padStart(4, '0')}`,
          orderItemIds: orderItemIds,
          orderItemId: orderItemIds[0], // Keep for backward compatibility
          countryId: countryId,
          countryName: shipmentItems[0].countryName,
          qtyCartons: totalQty,
          shipDate: shipDate.toISOString(),
          deliveryDate: deliveryDate.toISOString(),
          status: shipmentStatus,
          carrier: ['DHL', 'Maersk', 'FedEx', 'UPS'][Math.floor(Math.random() * 4)],
          trackingNumber: `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          createdOn: shipDate.toISOString(),
          modifiedOn: new Date().toISOString(),
          createdBy: 'System',
          modifiedBy: 'System'
        });
      }
    });

    // Update PO statuses based on their order items
    purchaseOrders.forEach(po => {
      const poOrderItems = allOrderItems.filter(oi => po.orderItemIds.includes(oi.id));
      
      // Check if all items are Regulatory Approved (can request CFO approval)
      const allRegulatoryApproved = poOrderItems.length > 0 && 
        poOrderItems.every(oi => oi.status === 'Regulatory Approved');
      
      // Check if all items are Arrived or Deleted (PO is completed)
      const allCompleted = poOrderItems.length > 0 && 
        poOrderItems.every(oi => oi.status === 'Arrived to Market' || oi.status === 'Deleted');
      
      // Update PO status based on order items
      if (allCompleted && po.status !== 'Completed') {
        po.status = 'Completed';
        po.modifiedOn = new Date().toISOString();
        if (!po.history) po.history = [];
        po.history.push({
          action: 'Completed',
          by: 'System',
          date: new Date().toISOString()
        });
      } else if (allRegulatoryApproved && po.status === 'Draft') {
        // Can be upgraded to Pending CFO Approval (but we'll leave it as Draft for now)
        // User will request approval manually
      }
    });

    return { 
      countries, 
      skus, 
      months, 
      orders, 
      forecasts, 
      allocations, 
      shipments, 
      stockCoverData,
      orderItems: allOrderItems,
      purchaseOrders: purchaseOrders,
      labels: labels
    };
  }
}

export default new MockDataService();
