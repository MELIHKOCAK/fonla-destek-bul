import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addRewardTier,
  deactivateRewardTier,
  updateRewardTier,
  type CampaignRow,
  type RewardTierRow,
} from "@/lib/campaigns/api";
import { CAMPAIGN_LIMITS } from "@/lib/campaigns/config";
import { parseTryToMinor, minorToTryInput } from "@/lib/money";
import { formatMoneyMinor } from "@/lib/format";
import { WizardStepNav } from "./WizardStepNav";

interface Props {
  campaign: CampaignRow;
  initialRewards: RewardTierRow[];
  onChanged: () => void | Promise<void>;
}

interface DraftReward {
  title: string;
  description: string;
  amountTl: string;
  quantity: string;
  shipping: boolean;
}

const EMPTY: DraftReward = { title: "", description: "", amountTl: "", quantity: "", shipping: false };

export function RewardsStepForm({ campaign, initialRewards, onChanged }: Props) {
  const [rewards, setRewards] = useState<RewardTierRow[]>(initialRewards);
  const [draft, setDraft] = useState<DraftReward>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRewards(initialRewards);
  }, [initialRewards]);

  const activeRewards = rewards.filter((r) => r.is_active);

  const onAdd = async () => {
    if (!draft.title.trim() || draft.title.trim().length < 2) {
      toast.error("Başlık girin.");
      return;
    }
    const amount = parseTryToMinor(draft.amountTl);
    if (!amount || amount < CAMPAIGN_LIMITS.REWARD_AMOUNT_MIN_MINOR) {
      toast.error("Geçerli bir tutar girin.");
      return;
    }
    let qty: number | null = null;
    if (draft.quantity.trim()) {
      qty = Number(draft.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        toast.error("Adet pozitif tam sayı olmalı.");
        return;
      }
    }
    if (activeRewards.length >= CAMPAIGN_LIMITS.REWARD_TIERS_MAX) {
      toast.error(`En fazla ${CAMPAIGN_LIMITS.REWARD_TIERS_MAX} ödül ekleyebilirsiniz.`);
      return;
    }
    setSubmitting(true);
    try {
      const next = await addRewardTier(
        campaign.id,
        {
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          amount_minor: amount,
          quantity_limit: qty,
          shipping_required: draft.shipping,
        },
        rewards.length,
      );
      setRewards((prev) => [...prev, next]);
      setDraft(EMPTY);
      await onChanged();
    } catch (e) {
      toast.error("Ödül eklenemedi.");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const onRemove = async (r: RewardTierRow) => {
    if (!window.confirm("Bu ödülü kaldırmak istiyor musunuz? (pasifleştirilir)")) return;
    try {
      await deactivateRewardTier(r.id);
      setRewards((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: false } : x)));
      await onChanged();
    } catch (e) {
      toast.error("İşlem başarısız.");
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Mevcut ödüller</h3>
        {activeRewards.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Henüz aktif ödül yok. Kampanyayı incelemeye gönderebilmek için en az 1 ödül gerekir.
          </p>
        ) : (
          <ul className="space-y-2">
            {activeRewards.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="font-medium">
                    {r.title} — {formatMoneyMinor(r.amount_minor)}
                  </p>
                  {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                  <p className="text-xs text-muted-foreground">
                    {r.quantity_limit ? `Adet: ${r.quantity_limit}` : "Adet sınırsız"}
                    {r.shipping_required ? " · Kargo gerekli" : ""}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void onRemove(r)} aria-label="Kaldır">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <h3 className="text-sm font-semibold">Yeni ödül ekle</h3>
        <div className="space-y-2">
          <Label htmlFor="r-title">Başlık</Label>
          <Input
            id="r-title"
            value={draft.title}
            maxLength={CAMPAIGN_LIMITS.REWARD_TITLE_MAX}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="r-desc">Açıklama</Label>
          <Textarea
            id="r-desc"
            rows={3}
            value={draft.description}
            maxLength={CAMPAIGN_LIMITS.REWARD_DESC_MAX}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="r-amount">Tutar (TL)</Label>
            <Input
              id="r-amount"
              inputMode="decimal"
              value={draft.amountTl}
              onChange={(e) => setDraft({ ...draft, amountTl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-qty">Adet (opsiyonel)</Label>
            <Input
              id="r-qty"
              inputMode="numeric"
              value={draft.quantity}
              onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="r-ship"
            checked={draft.shipping}
            onCheckedChange={(v) => setDraft({ ...draft, shipping: Boolean(v) })}
          />
          <Label htmlFor="r-ship">Kargo gerekli</Label>
        </div>
        <Button onClick={() => void onAdd()} disabled={submitting}>
          <Plus className="mr-1 h-4 w-4" /> Ödül ekle
        </Button>
      </div>

      <WizardStepNav
        campaignId={campaign.id}
        currentStep="rewards"
        saveStatus="idle"
        onSaveAndNext={() => {
          window.location.href = `/creator/campaigns/${campaign.id}/edit/submit`;
        }}
      />
      <p className="text-xs text-muted-foreground">
        Not: Aktif destek varsa ödül kalıcı olarak silinmez; yalnızca pasifleştirilir.
      </p>
    </div>
  );
}

// minorToTryInput kullanılmıyor şu an ama API ile tutarlı:
void minorToTryInput;
