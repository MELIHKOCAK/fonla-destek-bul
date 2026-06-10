import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications/preferences.functions";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  head: () => ({ meta: [{ title: "Bildirim Tercihleri — BeniFonla" }] }),
  component: NotificationSettingsPage,
});

function NotificationSettingsPage() {
  const getPrefs = useServerFn(getNotificationPreferences);
  const updatePrefs = useServerFn(updateNotificationPreferences);
  const qc = useQueryClient();

  const prefsQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => getPrefs(),
  });

  const [campaignUpdatesEmail, setCampaignUpdatesEmail] = useState(true);
  const [marketingEmail, setMarketingEmail] = useState(false);

  useEffect(() => {
    if (prefsQuery.data) {
      setCampaignUpdatesEmail(prefsQuery.data.campaign_updates_email);
      setMarketingEmail(prefsQuery.data.marketing_email);
    }
  }, [prefsQuery.data]);

  const save = useMutation({
    mutationFn: async () =>
      updatePrefs({
        data: {
          campaign_updates_email: campaignUpdatesEmail,
          marketing_email: marketingEmail,
        },
      }),
    onSuccess: () => {
      toast.success("Tercihleriniz kaydedildi");
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Kaydedilemedi"),
  });

  if (prefsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  }
  if (prefsQuery.isError) {
    return <p className="text-sm text-destructive">Tercihler yüklenemedi.</p>;
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Bildirim tercihleri</h2>
        <p className="text-sm text-muted-foreground">
          Hangi e-postaları almak istediğinizi seçin. Kritik ödeme, iade ve aktarım bildirimleri
          yasal ve güvenlik nedeniyle her zaman gönderilir.
        </p>
      </header>

      <div className="space-y-4 rounded-lg border border-border bg-card p-5">
        <PrefRow
          label="Kritik finansal bildirimler"
          description="Ödeme, iade, aktarım gibi finansal işlem bildirimleri. Yasal/güvenlik gereği kapatılamaz."
          checked
          disabled
        />
        <PrefRow
          label="Kampanya güncellemeleri"
          description="Desteklediğiniz kampanyalardan gelen güncellemeler için e-posta."
          checked={campaignUpdatesEmail}
          onChange={setCampaignUpdatesEmail}
        />
        <PrefRow
          label="Pazarlama e-postaları"
          description="Yeni özellikler ve önerilen kampanyalar hakkında e-posta. Finansal bildirimleri etkilemez."
          checked={marketingEmail}
          onChange={setMarketingEmail}
        />
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </section>
  );
}

function PrefRow(props: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{props.label}</p>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </div>
      <Switch
        checked={props.checked}
        disabled={props.disabled}
        onCheckedChange={props.onChange}
        aria-label={props.label}
      />
    </div>
  );
}
