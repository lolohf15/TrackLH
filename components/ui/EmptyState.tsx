interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {icon && (
        <div className="mb-4 text-4xl opacity-25">{icon}</div>
      )}
      <h3 className="text-sm font-semibold text-[#8b949e] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[#6e7681] max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
