import { useState, useEffect } from 'react';
import { Table, Modal } from 'antd';
import { useApp } from '@/providers/index.js';
import { usePOs, useOrderItems } from '@/hooks/index.js';
import { PageHeader, StatusBadge, LoadingState, ErrorState, PODetailsModal } from '@/components/index.js';
import { formatNumber, formatDate, showMessage } from '@/utils/index.js';

/**
 * PO Management Page
 * Allows planners to manage POs: Request CFO Approval and Confirm to UP
 */
export const POManagementPage = () => {
  const { data } = useApp();
  const { pos, loading, error, refresh, requestPOApproval, confirmPOToUP, getPOById } = usePOs();
  const { orderItems, refresh: refreshOrderItems } = useOrderItems();
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Refresh data when modal opens to ensure we have latest PO and order items
  useEffect(() => {
    if (showDetailsModal && selectedPO) {
      refresh();
      refreshOrderItems();
    }
  }, [showDetailsModal, selectedPO?.id]);

  // Filter all Draft POs (show all, but only allow approval request when all items are Regulatory Approved)
  const draftPOs = pos.filter(po => po.status === 'Draft');

  const cfoApprovedPOs = pos.filter(po => po.status === 'CFO Approved');

  const confirmedToUPPOs = pos.filter(po => po.status === 'Confirmed to UP');

  const handleRequestApproval = async (poId) => {
    setProcessing(true);
    try {
      await requestPOApproval(poId);
      refresh();
      showMessage.success('PO submitted for CFO approval successfully');
      setShowDetailsModal(false);
      setSelectedPO(null);
    } catch (err) {
      showMessage.error('Error requesting approval: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmToUP = async (poId) => {
    Modal.confirm({
      title: 'Confirm PO to UP',
      content: 'Are you sure you want to confirm this PO to UP? All order items will become Back Order.',
      okText: 'Confirm',
      cancelText: 'Cancel',
      onOk: async () => {
        setProcessing(true);
        try {
          await confirmPOToUP(poId);
          refresh();
          showMessage.success('PO confirmed to UP successfully. All order items are now Back Order.');
          setShowDetailsModal(false);
          setSelectedPO(null);
        } catch (err) {
          showMessage.error('Error confirming PO to UP: ' + err.message);
        } finally {
          setProcessing(false);
        }
      }
    });
  };

  const getPOOrderItems = (po) => {
    // Use PO's orderItemIds as source of truth, fallback to filtering by poId
    if (po?.orderItemIds && po.orderItemIds.length > 0) {
      return orderItems.filter(oi => po.orderItemIds.includes(oi.id));
    }
    // Fallback: filter by poId (for backward compatibility)
    return orderItems.filter(oi => oi.poId === po?.id || oi.poId === po);
  };

  const calculatePOTotal = (po) => {
    const items = getPOOrderItems(po);
    return items.reduce((sum, item) => sum + (item.qtyCartons || 0), 0);
  };

  const draftPOColumns = [
    {
      title: 'PO Number',
      dataIndex: 'id',
      key: 'id',
      className: 'font-mono',
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, po) => <StatusBadge status={po.status} />,
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, po) => {
        const poItems = getPOOrderItems(po);
        return `${poItems.length} items`;
      },
    },
    {
      title: 'Total Quantity',
      key: 'totalQty',
      render: (_, po) => {
        const totalQty = calculatePOTotal(po);
        return <span className="font-semibold text-blue-600">{formatNumber(totalQty)} cartons</span>;
      },
      sorter: (a, b) => calculatePOTotal(a) - calculatePOTotal(b),
    },
    {
      title: 'Countries',
      key: 'countries',
      render: (_, po) => {
        const poItems = getPOOrderItems(po);
        const countries = [...new Set(poItems.map(item => item.countryName))];
        return (
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
        );
      },
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'createdOn',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.createdOn) - new Date(b.createdOn),
    },
    {
      title: 'Actions',
      key: 'actions',
      className: 'text-center',
      render: (_, po) => {
        const poItems = getPOOrderItems(po);
        const allRegulatoryApproved = poItems.every(item => item.status === 'Regulatory Approved');
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={async () => {
                const fullPO = await getPOById(po.id);
                setSelectedPO(fullPO);
                setShowDetailsModal(true);
                refreshOrderItems();
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
        );
      },
    },
  ];

  const cfoApprovedColumns = [
    {
      title: 'PO Number',
      dataIndex: 'id',
      key: 'id',
      className: 'font-mono',
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, po) => <StatusBadge status={po.status} />,
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, po) => {
        const poItems = getPOOrderItems(po);
        return `${poItems.length} items`;
      },
    },
    {
      title: 'Total Quantity',
      key: 'totalQty',
      render: (_, po) => {
        const totalQty = calculatePOTotal(po);
        return <span className="font-semibold text-blue-600">{formatNumber(totalQty)} cartons</span>;
      },
      sorter: (a, b) => calculatePOTotal(a) - calculatePOTotal(b),
    },
    {
      title: 'Countries',
      key: 'countries',
      render: (_, po) => {
        const poItems = getPOOrderItems(po);
        const countries = [...new Set(poItems.map(item => item.countryName))];
        return (
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
        );
      },
    },
    {
      title: 'Approved On',
      dataIndex: 'approvedOn',
      key: 'approvedOn',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.approvedOn) - new Date(b.approvedOn),
    },
    {
      title: 'Actions',
      key: 'actions',
      className: 'text-center',
      render: (_, po) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={async () => {
              const fullPO = await getPOById(po.id);
              setSelectedPO(fullPO);
              setShowDetailsModal(true);
              refreshOrderItems();
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
      ),
    },
  ];


  if (loading) {
    return <LoadingState message="Loading purchase orders..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }


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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table
              columns={draftPOColumns}
              dataSource={draftPOs}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: 'No draft POs ready for approval' }}
            />
          </div>
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table
              columns={cfoApprovedColumns}
              dataSource={cfoApprovedPOs}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: 'No CFO approved POs' }}
            />
          </div>
        )}
      </div>

      {/* Confirmed to UP POs Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Confirmed to UP POs ({confirmedToUPPOs.length})
          </h3>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-purple-800">
            These POs have been confirmed to UP (manufacturer). All order items are in Back Order status.
          </p>
        </div>

        {confirmedToUPPOs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📦</div>
            <p className="font-medium mb-2">No Confirmed to UP POs</p>
            <p className="text-sm">POs confirmed to UP will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table
              columns={cfoApprovedColumns}
              dataSource={confirmedToUPPOs}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              locale={{ emptyText: 'No confirmed to UP POs' }}
            />
          </div>
        )}
      </div>

      {/* PO Details Modal */}
      <PODetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPO(null);
        }}
        po={selectedPO}
        orderItems={orderItems}
        showWarnings={true}
        actions={[
          {
            label: 'Close',
            onClick: () => {
              setShowDetailsModal(false);
              setSelectedPO(null);
            },
            variant: 'default'
          },
          ...(selectedPO ? (() => {
            const poItems = getPOOrderItems(selectedPO);
            const allRegulatoryApproved = poItems.every(item => item.status === 'Regulatory Approved');
            const actions = [];
            if (selectedPO.status === 'Draft' && allRegulatoryApproved) {
              actions.push({
                label: processing ? 'Requesting...' : 'Request CFO Approval',
                onClick: () => handleRequestApproval(selectedPO.id),
                disabled: processing,
                variant: 'success'
              });
            }
            if (selectedPO.status === 'CFO Approved') {
              actions.push({
                label: processing ? 'Confirming...' : 'Confirm to UP',
                onClick: () => handleConfirmToUP(selectedPO.id),
                disabled: processing,
                variant: 'secondary'
              });
            }
            return actions;
          })() : [])
        ]}
      />
    </div>
  );
};

export default POManagementPage;

