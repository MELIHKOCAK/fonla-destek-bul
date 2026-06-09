import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

const META: Record<SaveStatus, { label: string; icon: typeof Loader2; className: string }> = {
  idle: { label: "Bekliyor", icon: CheckCircle2, className: "text-muted-foreground" },
  saving: { label: "Kaydediliyor…", icon: Loader2, className: "text-muted-foreground" },
  saved: { label: "Kaydedildi", icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  error: { label: "Kaydedilemedi", icon: AlertCircle, className: "text-destructive" },
  conflict: { label: "Çakışma — yenileyin", icon: AlertCircle, className: "text-destructive" },
};

export function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs ${meta.className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === "saving" ? "animate-spin" : ""}`} />
      <span>{meta.label}</span>
    </div>
  );
}
