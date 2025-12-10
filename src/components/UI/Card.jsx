
/**
 * Card Component
 * Dashboard card with icon and metrics
 */
export const Card = ({ title, value, subtitle, icon, trend, color = 'blue', onClick, clickable = false }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };
  
  const isClickable = clickable || onClick;
  
  return (
    <div 
      className={`bg-white rounded-xl border border-gray-200 p-5 transition-all ${
        isClickable ? 'hover:shadow-lg hover:scale-105 cursor-pointer' : 'hover:shadow-lg'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d={trend > 0 ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} 
            />
          </svg>
          <span>{Math.abs(trend)}% vs last month</span>
        </div>
      )}
    </div>
  );
};

export default Card;

