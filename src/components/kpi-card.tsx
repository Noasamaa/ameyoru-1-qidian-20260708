import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  emphasis?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  emphasis,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm",
        emphasis && "border-primary/30 bg-primary/[0.03]",
        className
      )}
    >
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight",
          emphasis && "text-primary"
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
