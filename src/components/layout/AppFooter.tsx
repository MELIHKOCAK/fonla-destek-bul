import { Container } from "@/components/common/Container";

const GROUPS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}> = [
  {
    title: "Ürün",
    links: [
      { label: "Keşfet", href: "/" },
      { label: "Nasıl Çalışır", href: "#" },
      { label: "Proje Başlat", href: "#" },
    ],
  },
  {
    title: "Kaynaklar",
    links: [
      { label: "Yardım Merkezi", href: "#" },
      { label: "Creator Rehberi", href: "#" },
      { label: "Topluluk Kuralları", href: "#" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { label: "Kullanım Şartları", href: "#" },
      { label: "Gizlilik Politikası", href: "#" },
      { label: "KVKK Aydınlatma", href: "#" },
    ],
  },
  {
    title: "Sosyal",
    links: [
      { label: "X / Twitter", href: "#" },
      { label: "Instagram", href: "#" },
      { label: "LinkedIn", href: "#" },
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
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {link.label}
                    </a>
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
