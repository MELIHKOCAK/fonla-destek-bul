import { Link } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";

type FooterLink = { label: string; to: string };

const GROUPS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<FooterLink>;
}> = [
  {
    title: "Ürün",
    links: [
      { label: "Keşfet", to: "/discover" },
      { label: "Nasıl Çalışır", to: "/how-it-works" },
      { label: "Hakkında", to: "/about" },
    ],
  },
  {
    title: "Kaynaklar",
    links: [
      { label: "Sık Sorulan Sorular", to: "/faq" },
      { label: "İletişim", to: "/contact" },
      { label: "Risk Açıklaması", to: "/risk-disclosure" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { label: "Kullanım Şartları", to: "/terms" },
      { label: "Gizlilik Politikası", to: "/privacy" },
      { label: "İade Politikası", to: "/refund-policy" },
    ],
  },
  {
    title: "Hesap",
    links: [
      { label: "Giriş yap", to: "/login" },
      { label: "Kayıt ol", to: "/register" },
      { label: "Şifremi unuttum", to: "/forgot-password" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-muted/30">
      <Container className="py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-2 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <p>
            BeniFonla bir ödül temelli kitle fonlama platformudur. Yatırım, hisse satışı, faiz veya
            finansal getiri ürünü değildir.
          </p>
          <p>© {new Date().getFullYear()} BeniFonla. Tüm hakları saklıdır.</p>
        </div>
      </Container>
    </footer>
  );
}
