import { ReactNode } from 'react';

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Section({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`py-20 ${className}`}>{children}</section>;
}

export function PageHeader({ title, description, icon: Icon }: { title: string; description?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {Icon && (
        <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/10">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div>
        <h1 className="font-display font-bold text-2xl text-brand-dark">{title}</h1>
        {description && <p className="text-gray-500 text-sm">{description}</p>}
      </div>
    </div>
  );
}

export function UploadZone({
  icon: Icon,
  title,
  subtitle,
  accept,
  multiple,
  onFiles,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFiles(e.dataTransfer.files);
      }}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer mb-6"
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        if (multiple) input.multiple = true;
        input.onchange = (e) => onFiles((e.target as HTMLInputElement).files);
        input.click();
      }}
    >
      <Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-700 font-medium mb-1">{title}</p>
      <p className="text-gray-400 text-sm">{subtitle}</p>
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled,
  loading,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const base =
    'w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-brand-red text-white hover:bg-red-700 shadow-lg shadow-red-500/10'
      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50';

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${styles} ${className}`}>
      {loading && <span className="animate-spin">⟳</span>}
      {children}
    </button>
  );
}

export function Alert({ type = 'error', children }: { type?: 'error' | 'success'; children: React.ReactNode }) {
  const styles =
    type === 'error'
      ? 'flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm'
      : 'flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm';

  return <div className={styles}>{children}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>{children}</div>;
}