import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionPermission?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionPermission = true,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#f0fdfa] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-[#111827] mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] text-[#6b7280] text-center max-w-[320px] mb-5">
        {description}
      </p>
      {actionLabel && onAction && actionPermission && (
        <Button
          onClick={onAction}
          className="h-9 px-4 rounded-[6px] bg-[#0d9488] hover:bg-[#0f766e] text-white text-[13px] font-medium gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
