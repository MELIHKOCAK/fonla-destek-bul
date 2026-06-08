import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/common/Container";

export const HomePage = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Container className="flex min-h-screen flex-col items-center justify-center py-16">
        <div className="w-full max-w-2xl space-y-8">
          <header className="space-y-4 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              BeniFonla
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              BeniFonla geliştirme aşamasında
            </h1>
            <p className="mx-auto max-w-xl text-base text-muted-foreground">
              BeniFonla; ürünlerini, yaratıcı fikirlerini ve projelerini
              tanıtmak isteyen kişilerin belirli bir hedef tutar ve süreyle
              destek toplayabildiği ödül temelli bir kitle fonlama
              platformudur. BeniFonla bir yatırım, hisse satışı veya finansal
              getiri ürünü değildir.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Bu ortam henüz yayınlanmadı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Şu an yalnızca temel uygulama iskeleti hazır. Kampanya
                oluşturma, kullanıcı hesabı, ödeme ve destek akışları gibi
                ürün özellikleri sonraki fazlarda devreye alınacaktır.
              </p>
              <p>
                Geliştirme süreci hakkında daha fazla bilgi için depodaki{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  README.md
                </code>{" "}
                ve{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  docs/
                </code>{" "}
                klasörüne bakabilirsiniz.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </main>
  );
};
