import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-card border border-[var(--color-border)] rounded-xl shadow-sm p-4 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-xl sm:text-2xl font-bold text-ink mb-4 sm:mb-6">{children}</h1>
  );
}

export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "gold" | "success" | "danger";
}) {
  const toneClasses: Record<string, string> = {
    default: "text-ink",
    gold: "text-[var(--color-gold-dark)]",
    success: "text-[var(--color-success)]",
    danger: "text-[var(--color-danger)]",
  };
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs sm:text-sm text-ink-soft">{label}</span>
      <span className={`text-lg sm:text-2xl font-bold ${toneClasses[tone]}`}>{value}</span>
    </Card>
  );
}

export function Badge({ status }: { status: "paid" | "unpaid" }) {
  return status === "paid" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] px-3 py-1 text-xs sm:text-sm font-semibold whitespace-nowrap">
      مسدد
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)] px-3 py-1 text-xs sm:text-sm font-semibold whitespace-nowrap">
      غير مسدد
    </span>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 text-base text-ink outline-none transition focus:border-[var(--color-gold)] focus:ring-2 focus:ring-[var(--color-gold-light)]";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} min-h-24 resize-y ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-[var(--color-gold)] text-black hover:bg-[var(--color-gold-dark)] hover:text-white",
    secondary:
      "bg-transparent border border-[var(--color-ink)] text-ink hover:bg-black hover:text-white",
    danger: "bg-[var(--color-danger)] text-white hover:brightness-90",
    ghost: "bg-transparent text-ink-soft hover:text-ink underline",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-[var(--color-danger)] mt-1">{children}</p>;
}
