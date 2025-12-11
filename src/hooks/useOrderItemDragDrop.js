import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrderItems } from '@/hooks/index.js';
import { showMessage } from '@/utils/index.js';
import mainLogger from '@/services/LoggerService.js';

const logger = mainLogger.createLogger('useOrderItemDragDrop');

/**
 * Custom hook for managing order item drag and drop functionality
 */
export const useOrderItemDragDrop = () => {
  const queryClient = useQueryClient();
  const { updateDeliveryMonth, refresh: refreshOrderItems } = useOrderItems();
  const [draggedOrderItem, setDraggedOrderItem] = useState(null);

  const handleDragOver = (e, month) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow drop on future months (non-past months)
    if (month.isPast) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, month, draggedOrderItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    logger.user.action('drop', 'Order Item', {
      targetMonth: month.key,
      draggedOrderItem,
      isPast: month.isPast
    });
    
    // Prevent drop on past months
    if (month.isPast) {
      logger.warn('Cannot drop on past month');
      setDraggedOrderItem(null);
      return;
    }
    
    try {
      // Try to get data from dataTransfer first, fallback to state
      let dragData = null;
      try {
        const dataTransferData = e.dataTransfer.getData('application/json');
        if (dataTransferData) {
          dragData = JSON.parse(dataTransferData);
        }
      } catch (parseErr) {
        logger.warn('Could not parse dataTransfer data, using state');
      }
      
      // Fallback to state if dataTransfer doesn't have data
      if (!dragData && draggedOrderItem) {
        dragData = {
          orderItemId: draggedOrderItem.orderItemId,
          currentMonth: draggedOrderItem.currentMonth
        };
      }
      
      logger.debug('Drag data', dragData);
      
      if (!dragData || !dragData.orderItemId) {
        logger.warn('Invalid drag data, aborting drop');
        setDraggedOrderItem(null);
        return;
      }

      const { orderItemId, currentMonth } = dragData;
      
      // Validate that we have a valid currentMonth
      if (!currentMonth) {
        logger.warn('No current month in drag data');
        setDraggedOrderItem(null);
        return;
      }
      
      logger.debug('Checking if month change is needed', {
        orderItemId,
        currentMonth,
        targetMonth: month.key,
        willUpdate: currentMonth !== month.key
      });
      
      // Only update if dropped on a different month
      if (currentMonth !== month.key) {
        logger.user.action('update', 'Delivery Month', {
          orderItemId,
          from: currentMonth,
          to: month.key
        });
        
        await updateDeliveryMonth(orderItemId, month.key);
        logger.info('Delivery month updated successfully');
        
        // Invalidate and refetch queries
        logger.debug('Refreshing queries');
        queryClient.invalidateQueries({ queryKey: ['orderItems'] });
        queryClient.invalidateQueries({ queryKey: ['stockCover'] });
        
        // Refetch queries to ensure UI updates
        await queryClient.refetchQueries({ queryKey: ['orderItems'] });
        await queryClient.refetchQueries({ queryKey: ['stockCover'] });
        
        logger.info('Queries refreshed');
        logger.info('Drop operation completed successfully');
      } else {
        logger.debug('Same month, no update needed', {
          orderItemId,
          month: currentMonth
        });
      }
    } catch (err) {
      logger.error('Error updating delivery month:', err);
      showMessage.error('Failed to update order delivery month: ' + err.message);
    } finally {
      // Always clear drag state
      setDraggedOrderItem(null);
    }
  };

  const handleDragEnter = (e, month, draggedOrderItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow drag enter on future months
    if (month.isPast) {
      return;
    }
    
    if (draggedOrderItem) {
      setDraggedOrderItem(prev => prev ? { ...prev, targetMonth: month.key } : null);
    }
  };

  const handleDragLeave = (e, month) => {
    e.preventDefault();
    
    // Only clear if we're leaving the cell entirely
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      // Additional check: make sure we're not just moving to a child element
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      // Only clear if mouse is actually outside the cell bounds
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDraggedOrderItem(prev => {
          if (prev && prev.targetMonth === month.key) {
            return { ...prev, targetMonth: null };
          }
          return prev;
        });
      }
    }
  };

  return {
    draggedOrderItem,
    setDraggedOrderItem,
    handleDragOver,
    handleDrop,
    handleDragEnter,
    handleDragLeave
  };
};

