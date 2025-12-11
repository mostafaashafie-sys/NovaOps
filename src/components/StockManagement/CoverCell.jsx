import { formatCover, getCoverColor, getCoverTextColor } from '@/utils/index.js';

/**
 * Cover Cell Component
 * Renders months cover with color coding
 */
export const CoverCell = ({ month, monthData, cellBgColor }) => {
  if (!monthData) {
    return (
      <td 
        className={`px-2 py-1 text-right min-w-[90px] ${cellBgColor}`}
      >
        <div className="text-xs text-amber-700">—</div>
      </td>
    );
  }

  return (
    <td 
      className={`px-2 py-1 text-right min-w-[90px] ${cellBgColor}`}
      style={{ 
        backgroundColor: getCoverColor(monthData.monthsCover),
        color: getCoverTextColor(monthData.monthsCover)
      }}
    >
      <div className="font-semibold">{formatCover(monthData.monthsCover)}</div>
    </td>
  );
};

