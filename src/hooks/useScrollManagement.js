import { useEffect, useRef } from 'react';
import mainLogger from '@/services/LoggerService.js';

const logger = mainLogger.createLogger('useScrollManagement');

/**
 * Custom hook for managing scroll position and auto-scrolling to current month
 */
export const useScrollManagement = (data, stockCoverLoading) => {
  const scrollContainerRef = useRef(null);
  const hasScrolledToCurrentMonth = useRef(false);
  const scrollPositionRef = useRef({ left: 0, top: 0 });

  // Scroll to current month when data loads - center the current month in view
  useEffect(() => {
    // Skip if we've already scrolled, or if data isn't ready
    if (hasScrolledToCurrentMonth.current || !data?.months || !scrollContainerRef.current || stockCoverLoading) {
      return;
    }

    const currentMonth = data.months.find(m => m.isCurrentMonth);
    if (!currentMonth) return;

    // Wait for table to render, then find the current month column and scroll to it
    const scrollToCurrentMonth = () => {
      // Double-check flag before attempting scroll
      if (hasScrolledToCurrentMonth.current || !scrollContainerRef.current) return false;
      
      // Find the table element
      const table = scrollContainerRef.current.querySelector('table');
      if (!table) return false;
      
      // Find the current month header using data attribute
      const currentMonthHeader = table.querySelector(`th[data-month-key="${currentMonth.key}"]`);
      
      if (!currentMonthHeader) return false;
      
      // Get the position of the current month column relative to the scroll container
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const headerRect = currentMonthHeader.getBoundingClientRect();
      
      // Calculate the absolute position of the current month column
      const currentMonthLeft = headerRect.left - containerRect.left + scrollContainerRef.current.scrollLeft;
      
      // Calculate scroll position to center the current month
      const viewportWidth = scrollContainerRef.current.clientWidth;
      const monthColumnWidth = headerRect.width || 90; // Fallback to 90px if width not available
      const scrollPosition = currentMonthLeft - (viewportWidth / 2) + (monthColumnWidth / 2);
      
      // Scroll to center the current month
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      
      // Mark that we've successfully scrolled (set flag BEFORE logging to prevent race conditions)
      if (scrollPosition >= 0) {
        hasScrolledToCurrentMonth.current = true;
        logger.info('Scrolled to current month, marking as complete');
        return true;
      }
      
      return false;
    };
    
    // Try scrolling with increasing delays until successful
    let attempts = 0;
    const maxAttempts = 10;
    const attemptScroll = () => {
      // Check flag before attempting
      if (hasScrolledToCurrentMonth.current) return;
      
      attempts++;
      const success = scrollToCurrentMonth();
      
      if (!success && attempts < maxAttempts && !hasScrolledToCurrentMonth.current) {
        setTimeout(attemptScroll, 100 * attempts);
      }
    };
    
    // Start attempting to scroll with a single initial delay
    setTimeout(attemptScroll, 200);
  }, [data?.months, stockCoverLoading]);

  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = {
        left: scrollContainerRef.current.scrollLeft,
        top: scrollContainerRef.current.scrollTop
      };
    }
  };

  return {
    scrollContainerRef,
    saveScrollPosition
  };
};

