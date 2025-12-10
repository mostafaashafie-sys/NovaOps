
/**
 * Data Table Component
 * Reusable table component with consistent styling
 */
export const DataTable = ({ columns, data, renderRow, emptyMessage = 'No data available' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`px-4 py-3 text-left font-semibold text-gray-700 ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={item.id || idx}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {renderRow(item, idx)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

