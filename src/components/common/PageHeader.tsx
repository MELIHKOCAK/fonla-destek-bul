import type { ReactNode } from "react";
import { Container } from "./Container";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <section className={cn("border-b border-border/60 bg-muted/20", className)}>
      <Container className="py-10 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <div className="mt-3 text-sm text-muted-foreground sm:text-base">{description}</div>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </Container>
    </section>
  );
}
