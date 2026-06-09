import { Link } from "@tanstack/react-router";

const STEPS = [
  { key: "amount", label: "Miktar", to: "/campaigns/$slug/back" },
  { key: "reward", label: "Ödül", to: "/campaigns/$slug/back/reward" },
  { key: "details", label: "Bilgiler", to: "/campaigns/$slug/back/details" },
  { key: "review", label: "Özet", to: "/campaigns/$slug/back/review" },
  { key: "result", label: "Sonuç", to: "/campaigns/$slug/back/result" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

interface Props {
  slug: string;
  current: StepKey;
}

export function StepIndicator({ slug, current }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Destek adımları" className="mb-6">
      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((s, i) => {
          const active = i === currentIndex;
          const passed = i < currentIndex;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-medium ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : passed
                      ? "bg-muted text-foreground"
                      : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <Link
                to={s.to}
                params={{ slug }}
                className={`underline-offset-2 ${active ? "font-semibold" : "hover:underline"}`}
              >
                {s.label}
              </Link>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
