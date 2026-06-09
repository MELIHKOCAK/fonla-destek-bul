import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "./NavLinks";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menüyü aç">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Menü</SheetTitle>
          <SheetDescription className="sr-only">
            BeniFonla site bölümleri arasında gezinin.
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobil ana navigasyon" className="mt-6">
          <NavLinks variant="vertical" onNavigate={() => setOpen(false)} />
        </nav>
        <MobileAuthActions onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function MobileAuthActions({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mt-6 space-y-2 border-t border-border pt-4">
      <Button asChild variant="outline" className="w-full">
        <Link to="/login" onClick={onNavigate}>Giriş yap</Link>
      </Button>
      <Button asChild className="w-full">
        <Link to="/register" onClick={onNavigate}>Kayıt ol</Link>
      </Button>
    </div>
  );
}
