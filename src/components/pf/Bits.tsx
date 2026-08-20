import { cn } from "@/lib/utils";

export function Scale({
  value,
  onChange,
  label,
  hint,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-2 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "min-h-12 rounded-2xl text-base font-bold ring-1 transition-colors",
              value === n
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-foreground ring-border",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
        active
          ? "bg-primary text-primary-foreground ring-primary"
          : "bg-card text-foreground ring-border",
      )}
    >
      {children}
    </button>
  );
}

export function LoadDot({ value }: { value: number }) {
  const color =
    value >= 5
      ? "bg-destructive"
      : value >= 4
        ? "bg-primary"
        : value >= 3
          ? "bg-chart-4"
          : "bg-accent-foreground/60";
  return <span className={cn("inline-block size-2.5 rounded-full", color)} />;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-6 font-display text-base font-bold">{children}</h2>;
}
