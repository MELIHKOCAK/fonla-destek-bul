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
  campaignSlug: string;
}

export function SupportCtaDialog({
  open,
  onOpenChange,
  campaignTitle,
  campaignSlug,
}: SupportCtaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Giriş yapın</DialogTitle>
          <DialogDescription>
            &ldquo;{campaignTitle}&rdquo; kampanyasına destek olmak için giriş yapın ya da
            yeni bir hesap oluşturun.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button asChild>
            <Link
              to="/login"
              search={{ redirect: `/campaigns/${campaignSlug}/back` }}
              onClick={() => onOpenChange(false)}
            >
              Giriş yap
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
