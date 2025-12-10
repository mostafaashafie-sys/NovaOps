import { useState } from 'react';
import { useApp } from '@/providers/index.js';
import { usePOs, useOrderItems } from '@/hooks/index.js';
import { PageHeader, StatusBadge, DataTable, LoadingState, ErrorState, Modal } from '@/components/index.js';
import { formatNumber, formatDate } from '@/utils/index.js';

/**
 * PO Management Page
 * Allows planners to manage POs: Request CFO Approval and Confirm to UP
 */
export const POManagementPage = () => {
  const { data } = useApp();
  const { pos, loading, error, refresh, requestPOApproval, confirmPOToUP } = usePOs();
  const { orderItems } = useOrderItems();
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Filter all Draft POs (show all, but only allow approval request when all items are Regulatory Approved)
  const draftPOs = pos.filter(po => po.status === 'Draft');

  const cfoApprovedPOs = pos.filter(po => po.status === 'CFO Approved');

  const handleRequestApproval = async (poId) => {
    setProcessing(true);
    try {
      await requestPOApproval(poId);
      refresh();
      alert('PO submitted for CFO approval successfully');
      setShowDetailsModal(false);
      setSelectedPO(null);
    } catch (err) {
      alert('Error requesting approval: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmToUP = async (poId) => {
    if (!confirm('Are you sure you want to confirm this PO to UP? All order items will become Back Order.')) {
      return;
    }
    setProcessing(true);
    try {
      await confirmPOToUP(poId);
      refresh();
      alert('PO confirmed to UP successfully. All order items are now Back Order.');
      setShowDetailsModal(false);
      setSelectedPO(null);
    } catch (err) {
      alert('Error confirming PO to UP: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getPOOrderItems = (poId) => {
    return orderItems.filter(oi => oi.poId === poId);
  };

  const calculatePOTotal = (poId) => {
    const items = getPOOrderItems(poId);
    return items.reduce((sum, item) => sum + item.qtyCartons, 0);
  };

  const renderDraftPORow = (po) => {
    const poItems = getPOOrderItems(po.id);
    const totalQty = calculatePOTotal(po.id);
    const countries = [...new Set(poItems.map(item => item.countryName))];
    const allRegulatoryApproved = poItems.every(item => item.status === 'Regulatory Approved');

    return (
      <>
        <td className="px-4 py-3 font-mono text-sm font-semibold">{po.id}</td>
        <td className="px-4 py-3">
          <StatusBadge status={po.status} />
        </td>
        <td className="px-4 py-3">{poItems.length} items</td>
        <td className="px-4 py-3 font-semibold text-blue-600">{formatNumber(totalQty)} cartons</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {countries.slice(0, 2).map(country => (
              <span key={country} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {country}
              </span>
            ))}
            {countries.length > 2 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                +{countries.length - 2}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-600">{formatDate(po.createdOn)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSelectedPO(po);
                setShowDetailsModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              View
            </button>
            {allRegulatoryApproved && (
              <button
                onClick={() => handleRequestApproval(po.id)}
                disabled={processing}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded-lg font-medium transition-colors"
              >
                Request CFO Approval
              </button>
            )}
          </div>
        </td>
      </>
    );
  };

  const renderCFOApprovedPORow = (po) => {
    const poItems = getPOOrderItems(po.id);
    const totalQty = calculatePOTotal(po.id);
    const countries = [...new Set(poItems.map(item => item.countryName))];

    return (
      <>
        <td className="px-4 py-3 font-mono text-sm font-semibold">{po.id}</td>
        <td className="px-4 py-3">
          <StatusBadge status={po.status} />
        </td>
        <td className="px-4 py-3">{poItems.length} items</td>
        <td className="px-4 py-3 font-semibold text-blue-600">{formatNumber(totalQty)} cartons</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {countries.slice(0, 2).map(country => (
              <span key={country} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {country}
              </span>
            ))}
            {countries.length > 2 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                +{countries.length - 2}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-600">{formatDate(po.approvedOn)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSelectedPO(po);
                setShowDetailsModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              View
            </button>
            <button
              onClick={() => handleConfirmToUP(po.id)}
              disabled={processing}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Confirm to UP
            </button>
          </div>
        </td>
      </>
    );
  };

  if (loading) {
    return <LoadingState message="Loading purchase orders..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const draftColumns = [
    { label: 'PO Number', className: 'font-mono' },
    { label: 'Status' },
    { label: 'Items' },
    { label: 'Total Quantity' },
    { label: 'Countries' },
    { label: 'Created On' },
    { label: 'Actions', className: 'text-center' }
  ];

  const cfoApprovedColumns = [
    { label: 'PO Number', className: 'font-mono' },
    { label: 'Status' },
    { label: 'Items' },
    { label: 'Total Quantity' },
    { label: 'Countries' },
    { label: 'Approved On' },
    { label: 'Actions', className: 'text-center' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="PO Management" 
        description="Manage purchase orders: Request CFO approval and confirm to UP"
      />

      {/* Draft POs Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Draft POs Ready for Approval ({draftPOs.length})
          </h3>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            All Draft POs are shown here. You can request CFO approval only when all items in a PO are Regulatory Approved.
          </p>
        </div>

        {draftPOs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <p className="font-medium mb-2">No Draft POs</p>
            <p className="text-sm">Draft POs will appear here once created</p>
          </div>
        ) : (
          <DataTable
            columns={draftColumns}
            data={draftPOs}
            renderRow={renderDraftPORow}
            emptyMessage="No draft POs ready for approval"
          />
        )}
      </div>

      {/* CFO Approved POs Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            CFO Approved POs ({cfoApprovedPOs.length})
          </h3>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800">
            These POs have been approved by CFO and can be confirmed to UP (manufacturer). 
            Confirming will change all order items to Back Order status.
          </p>
        </div>

        {cfoApprovedPOs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">✅</div>
            <p className="font-medium mb-2">No CFO Approved POs</p>
            <p className="text-sm">CFO approved POs will appear here for confirmation to UP</p>
          </div>
        ) : (
          <DataTable
            columns={cfoApprovedColumns}
            data={cfoApprovedPOs}
            renderRow={renderCFOApprovedPORow}
            emptyMessage="No CFO approved POs"
          />
        )}
      </div>

      {/* PO Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPO(null);
        }}
        title={selectedPO ? `PO Details: ${selectedPO.id}` : "PO Details"}
        size="lg"
      >
        {selectedPO && (() => {
          const poItems = getPOOrderItems(selectedPO.id);
          const totalQty = calculatePOTotal(selectedPO.id);
          const allRegulatoryApproved = poItems.every(item => item.status === 'Regulatory Approved');

          return (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">PO Number:</span>
                    <span className="ml-2 font-mono font-semibold">{selectedPO.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2"><StatusBadge status={selectedPO.status} /></span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Items:</span>
                    <span className="ml-2 font-semibold">{poItems.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Quantity:</span>
                    <span className="ml-2 font-semibold text-blue-600">{formatNumber(totalQty)} cartons</span>
                  </div>
                  {selectedPO.poDate && (
                    <div>
                      <span className="text-gray-600">PO Date:</span>
                      <span className="ml-2">{formatDate(selectedPO.poDate)}</span>
                    </div>
                  )}
                  {selectedPO.deliveryDate && (
                    <div>
                      <span className="text-gray-600">Delivery Date:</span>
                      <span className="ml-2">{formatDate(selectedPO.deliveryDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedPO.status === 'Draft' && !allRegulatoryApproved && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Cannot Request Approval</p>
                  <p className="text-xs text-yellow-700">
                    {poItems.filter(item => item.status !== 'Regulatory Approved').length} order item(s) are not Regulatory Approved. 
                    All items must be Regulatory Approved before requesting CFO approval.
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Order Items ({poItems.length})</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {poItems.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-semibold">{item.id}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">SKU:</span> {item.skuName}
                        </div>
                        <div>
                          <span className="font-medium">Country:</span> {item.countryName}
                        </div>
                        <div>
                          <span className="font-medium">Qty:</span> {formatNumber(item.qtyCartons)} cartons
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedPO(null);
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Close
                </button>
                {selectedPO.status === 'Draft' && allRegulatoryApproved && (
                  <button
                    onClick={() => handleRequestApproval(selectedPO.id)}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md disabled:opacity-50"
                  >
                    {processing ? 'Requesting...' : 'Request CFO Approval'}
                  </button>
                )}
                {selectedPO.status === 'CFO Approved' && (
                  <button
                    onClick={() => handleConfirmToUP(selectedPO.id)}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors shadow-md disabled:opacity-50"
                  >
                    {processing ? 'Confirming...' : 'Confirm to UP'}
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default POManagementPage;

