/**
 * Month Header Row Component
 * Renders the table header with months grouped by year
 */
export const MonthHeaderRow = ({ years, monthsByYear }) => {
  // Build header cells array with proper keys
  const headerCells = years.flatMap(year => {
    const yearMonths = monthsByYear[year];
    const monthCells = yearMonths.map((month) => {
      const bgColor = month.isCurrentMonth 
        ? 'bg-blue-100 border-l-2 border-blue-500' 
        : 'bg-blue-50';
      return (
        <th 
          key={month.key}
          data-month-key={month.key}
          data-is-current={month.isCurrentMonth}
          className={`px-3 py-3 text-right font-semibold text-blue-900 min-w-[90px] ${bgColor} ${month.isPast ? 'opacity-60' : ''}`}
        >
          <div className="flex flex-col">
            <span>{month.label}</span>
            {month.isCurrentMonth && (
              <span className="text-xs text-blue-700 font-normal">Current</span>
            )}
          </div>
        </th>
      );
    });
    
    const totalCell = (
      <th 
        key={`total-header-${year}`}
        className="px-3 py-3 text-right font-bold text-amber-900 min-w-[100px] border-l-2 border-amber-300 bg-amber-50"
      >
        {year} Total
      </th>
    );
    
    return [...monthCells, totalCell];
  });

  return (
    <tr className="sticky top-0 z-40 bg-blue-50 border-b-2 border-blue-200">
      <th className="sticky left-0 z-50 bg-blue-50 px-4 py-3 text-left font-semibold text-blue-900 min-w-[180px]">
        SKU / Measure
      </th>
      {headerCells}
    </tr>
  );
};

