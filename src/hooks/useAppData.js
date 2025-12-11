import { useQuery } from '@tanstack/react-query';
import { DataverseDataService } from '@/services/index.js';

/**
 * Generate month objects for display (next 24 months from current date)
 */
function generateMonths() {
  const months = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Generate 24 months starting from current month
  for (let i = 0; i < 24; i++) {
    const date = new Date(currentYear, currentMonth - 1 + i, 1);
    const year = date.getFullYear();
    const monthNum = date.getMonth() + 1;
    const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Check if this is the current month
    const isCurrentMonth = i === 0;
    // Check if this month is in the past (before current month)
    const isPast = i < 0;
    
    months.push({
      key: monthKey,
      year: year,
      month: monthNum,
      label: `${monthNames[monthNum - 1]} ${year}`,
      isCurrentMonth: isCurrentMonth,
      isPast: isPast
    });
  }
  
  return months;
}

/**
 * Custom Hook for App Data Management
 * Provides access to master data (countries, SKUs, months)
 */
export const useAppData = () => {
  const { data, isLoading: loading, error, refetch: refresh } = useQuery({
    queryKey: ['appData'],
    queryFn: async () => {
      // Fetch master data from Dataverse using proper service methods
      const [countries, skus] = await Promise.all([
        DataverseDataService.getCountries(),
        DataverseDataService.getSkus()
      ]);
      
      // Sort SKUs by sortOrder (ascending), with fallback to name if sortOrder is null/undefined
      const sortedSkus = Array.isArray(skus) ? [...skus].sort((a, b) => {
        const sortOrderA = a.sortOrder != null ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const sortOrderB = b.sortOrder != null ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        
        // First sort by sortOrder
        if (sortOrderA !== sortOrderB) {
          return sortOrderA - sortOrderB;
        }
        
        // If sortOrder is the same (or both null), fallback to name
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      }) : [];
      
      // Generate months for display (24 months from current date)
      // Note: getAllowedOrderMonths() is configuration data, not display months
      const months = generateMonths();
      
      return {
        countries: Array.isArray(countries) ? countries : [],
        skus: sortedSkus,
        months: months,
        labels: [] // Labels will be fetched separately when needed via LabelService
      };
    },
    staleTime: 1000 * 60 * 30, // Master data rarely changes - 30 minutes
  });

  return {
    data,
    loading,
    error: error?.message || null,
    refresh
  };
};

export default useAppData;
