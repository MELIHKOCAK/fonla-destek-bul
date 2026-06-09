import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  uploadCampaignImage,
  deleteCampaignMedia,
  setCoverMedia,
  getMediaSignedUrl,
  type CampaignMediaRow,
  type CampaignRow,
} from "@/lib/campaigns/api";
import { CAMPAIGN_LIMITS } from "@/lib/campaigns/config";
import { WizardStepNav } from "./WizardStepNav";

interface Props {
  campaign: CampaignRow;
  initialMedia: CampaignMediaRow[];
  onChanged: () => void | Promise<void>;
}

export function MediaStepForm({ campaign, initialMedia, onChanged }: Props) {
  const [media, setMedia] = useState<CampaignMediaRow[]>(initialMedia);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        media
          .filter((m) => m.storage_path)
          .map(async (m) => [m.id, (await getMediaSignedUrl(m.storage_path!)) ?? ""] as const),
      );
      if (!cancelled) {
        setUrls(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [media]);

  const onUpload = async (file: File, asCover: boolean) => {
    if (!CAMPAIGN_LIMITS.IMAGE_ACCEPT.includes(file.type as never)) {
      toast.error("Yalnızca JPEG, PNG veya WEBP yükleyebilirsiniz.");
      return;
    }
    if (file.size > CAMPAIGN_LIMITS.IMAGE_MAX_BYTES) {
      toast.error(`Dosya boyutu en fazla ${CAMPAIGN_LIMITS.IMAGE_MAX_BYTES / 1024 / 1024} MB olabilir.`);
      return;
    }
    if (media.length >= CAMPAIGN_LIMITS.GALLERY_MAX) {
      toast.error(`En fazla ${CAMPAIGN_LIMITS.GALLERY_MAX} görsel yükleyebilirsiniz.`);
      return;
    }
    setUploading(true);
    try {
      const next = await uploadCampaignImage({
        campaignId: campaign.id,
        file,
        isCover: asCover || media.length === 0,
        sortOrder: media.length,
      });
      setMedia((prev) => [...prev, next]);
      await onChanged();
      toast.success("Görsel yüklendi.");
    } catch (e) {
      toast.error("Görsel yüklenemedi.");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (m: CampaignMediaRow) => {
    if (!window.confirm("Görseli silmek istediğinize emin misiniz?")) return;
    try {
      await deleteCampaignMedia(m);
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
      await onChanged();
    } catch (e) {
      toast.error("Silinemedi.");
      console.error(e);
    }
  };

  const onSetCover = async (m: CampaignMediaRow) => {
    try {
      await setCoverMedia(campaign.id, m.id);
      setMedia((prev) => prev.map((x) => ({ ...x, is_cover: x.id === m.id })));
      await onChanged();
    } catch (e) {
      toast.error("Kapak ayarlanamadı.");
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="media-upload">Görsel yükle</Label>
        <p className="text-sm text-muted-foreground">
          JPEG / PNG / WEBP, en fazla {CAMPAIGN_LIMITS.IMAGE_MAX_BYTES / 1024 / 1024} MB. En fazla{" "}
          {CAMPAIGN_LIMITS.GALLERY_MAX} dosya.
        </p>
        <Input
          id="media-upload"
          type="file"
          accept={CAMPAIGN_LIMITS.IMAGE_ACCEPT.join(",")}
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f, false);
            e.target.value = "";
          }}
        />
        {uploading && (
          <p className="text-sm text-muted-foreground" role="status">
            <Upload className="mr-1 inline h-3 w-3" /> Yükleniyor…
          </p>
        )}
      </div>

      {media.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Henüz görsel yok. İlk yüklenen görsel otomatik kapak olur.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-md border bg-card">
              <div className="relative aspect-video bg-muted">
                {urls[m.id] ? (
                  <img src={urls[m.id]} alt={m.alt_text ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Yükleniyor…
                  </div>
                )}
                {m.is_cover && (
                  <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Kapak
                  </span>
                )}
              </div>
              <div className="flex gap-2 p-2">
                {m.is_cover ? (
                  <Button size="sm" variant="ghost" disabled>
                    <Star className="h-4 w-4" /> Kapak
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => void onSetCover(m)}>
                    <StarOff className="h-4 w-4" /> Kapak yap
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => void onDelete(m)} aria-label="Sil">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <WizardStepNav
        campaignId={campaign.id}
        currentStep="media"
        saveStatus="idle"
        onSaveAndNext={async () => {
          window.location.href = `/creator/campaigns/${campaign.id}/edit/rewards`;
        }}
      />
    </div>
  );
}
