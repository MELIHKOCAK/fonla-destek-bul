import { Link } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";

export const NotFoundPage = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Container className="flex min-h-screen flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Sayfa bulunamadı</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ana sayfaya dön
        </Link>
      </Container>
    </main>
  );
};
