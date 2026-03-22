// Shared UI utilities

export function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <svg className={`${dims[size]} animate-spin text-blue-500`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function Badge({ children, variant = 'gray' }: {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'amber' | 'coral' | 'pink' | 'gray';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    coral: 'bg-orange-50 text-orange-700',
    pink: 'bg-pink-50 text-pink-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ progress, label }: { progress: number; label?: string }) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">{label}</span>
          <span className="text-gray-400">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ message, action }: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-gray-400">{message}</p>
      {action && (
        <button className="btn-secondary mt-3 text-xs" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

export function StatusDot({ status }: { status: 'success' | 'warning' | 'error' | 'idle' }) {
  const colors = {
    success: 'bg-green-500',
    warning: 'bg-amber-400',
    error: 'bg-red-400',
    idle: 'bg-gray-300',
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}
