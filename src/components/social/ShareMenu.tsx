import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareMenu({ title }: { title: string }) {
  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Bağlantı panoya kopyalandı.");
        return;
      }
      toast.error("Paylaşım desteklenmiyor.");
    } catch {
      // user cancelled or denied — silent
    }
  };
  return (
    <Button variant="outline" onClick={onShare} aria-label="Bağlantıyı paylaş">
      <Share2 className="size-4" aria-hidden="true" />
      Paylaş
    </Button>
  );
}
