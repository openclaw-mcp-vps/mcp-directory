import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--border)] bg-white/5 px-2.5 py-1 text-xs font-medium text-[var(--foreground)]",
        className
      )}
    >
      {children}
    </span>
  );
}
