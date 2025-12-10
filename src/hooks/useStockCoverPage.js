import { useState, useEffect, useRef, useMemo } from 'react';
import { useStockCover } from './index.js';

/**
 * Custom hook for StockCoverPage business logic
 * Separates business logic from UI components
 */
export const useStockCoverPage = (selectedCountry) => {
  const { stockCoverData, updatePlannedQty, loading: stockCoverLoading } = useStockCover(selectedCountry);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  
  // Order management panel state
  const [panelState, setPanelState] = useState({
    isOpen: false,
    orderItemId: null,
    countryId: null,
    skuId: null,
    monthKey: null
  });

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEdit = (skuId, monthKey, currentValue) => {
    setEditingCell({ skuId, monthKey });
    setEditValue(currentValue || '');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const newValue = Number(editValue) || 0;
    try {
      await updatePlannedQty(selectedCountry, editingCell.skuId, editingCell.monthKey, newValue);
      setEditingCell(null);
    } catch (err) {
      console.error('Error updating planned quantity:', err);
      throw err;
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const openOrderPanel = (orderItemId, countryId, skuId, monthKey) => {
    setPanelState({
      isOpen: true,
      orderItemId,
      countryId,
      skuId,
      monthKey
    });
  };

  const closeOrderPanel = () => {
    setPanelState({
      isOpen: false,
      orderItemId: null,
      countryId: null,
      skuId: null,
      monthKey: null
    });
  };

  return {
    // Data
    stockCoverData,
    stockCoverLoading,
    
    // Editing state
    editingCell,
    editValue,
    inputRef,
    scrollContainerRef,
    
    // Panel state
    panelState,
    
    // Actions
    startEdit,
    saveEdit,
    cancelEdit,
    handleKeyDown,
    openOrderPanel,
    closeOrderPanel
  };
};

export default useStockCoverPage;

