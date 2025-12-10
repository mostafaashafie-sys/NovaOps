import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShipmentService } from '@/services/index.js';

/**
 * Custom Hook for Shipment Management
 * Separates UI from service layer
 */
export const useShipments = (initialFilters = {}) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState(initialFilters);

  const { data: shipments = [], isLoading: loading, error } = useQuery({
    queryKey: ['shipments', filters],
    queryFn: () => ShipmentService.getShipments(filters),
  });

  const createShipmentMutation = useMutation({
    mutationFn: (shipmentData) => ShipmentService.createShipment(shipmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });

  const updateShipmentStatusMutation = useMutation({
    mutationFn: ({ shipmentId, newStatus }) =>
      ShipmentService.updateShipmentStatus(shipmentId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
    },
  });

  const addToShipmentMutation = useMutation({
    mutationFn: ({ shipmentId, orderItemIds }) =>
      ShipmentService.addOrderItemsToShipment(shipmentId, orderItemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['shipments'] });
  };

  return {
    shipments,
    loading,
    error: error?.message || null,
    filters,
    setFilters,
    createShipment: createShipmentMutation.mutateAsync,
    updateShipmentStatus: (shipmentId, newStatus) =>
      updateShipmentStatusMutation.mutateAsync({ shipmentId, newStatus }),
    addToShipment: (shipmentId, orderItemIds) =>
      addToShipmentMutation.mutateAsync({ shipmentId, orderItemIds }),
    refresh
  };
};

export default useShipments;
