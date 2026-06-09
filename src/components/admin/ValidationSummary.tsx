import { CheckCircle2, AlertTriangle } from "lucide-react";

const LABELS: Record<string, string> = {
  title: "Başlık",
  short_description: "Kısa açıklama",
  story_content: "Hikâye (≥300 karakter)",
  funds_usage_content: "Fon kullanım planı (≥100)",
  timeline_content: "Takvim (≥100)",
  risks_content: "Riskler (≥100)",
  goal_amount_minor: "Hedef tutar (1.000–5.000.000 TL)",
  start_at: "Başlangıç tarihi",
  end_at: "Bitiş tarihi",
  category_id: "Kategori",
  cover_media: "Kapak görseli",
  reward_tiers: "En az bir aktif ödül",
};

export function ValidationSummary({ missing }: { missing: string[] }) {
  if (missing.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
        <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
        <span>Tüm zorunlu alanlar tamam.</span>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 text-amber-500" aria-hidden />
        Eksik alanlar
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {missing.map((m) => (
          <li key={m}>{LABELS[m] ?? m}</li>
        ))}
      </ul>
    </div>
  );
}
