import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  retry?: { label?: string; onClick: () => void };
  className?: string;
}

export function ErrorState({
  title = "Bir şeyler ters gitti",
  description = "İçerik yüklenirken beklenmeyen bir hata oluştu.",
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-10 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {retry ? (
        <Button variant="outline" onClick={retry.onClick} className="mt-2">
          {retry.label ?? "Tekrar dene"}
        </Button>
      ) : null}
    </div>
  );
}
