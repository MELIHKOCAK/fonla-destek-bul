import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SupportCtaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignTitle: string;
}

export function SupportCtaDialog({ open, onOpenChange, campaignTitle }: SupportCtaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demo aşaması</DialogTitle>
          <DialogDescription>
            BeniFonla şu an demo aşamasındadır. &ldquo;{campaignTitle}&rdquo; kampanyasına destek
            olabilmek için giriş yapmanız gerekir; ancak hesap ve ödeme işlemleri henüz etkin
            değildir.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button asChild>
            <Link to="/login" onClick={() => onOpenChange(false)}>
              Giriş sayfasına git
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
