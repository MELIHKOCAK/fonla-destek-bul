import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";

export const Route = createFileRoute("/_authenticated/_admin/")({
  head: () => ({ meta: [{ title: "Admin — BeniFonla" }] }),
  component: AdminHomePage,
});

function AdminHomePage() {
  return (
    <Container className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Admin paneli</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Admin yetenekleri sonraki fazda eklenecek. Bu sayfa yalnızca yetki altyapısını doğrulamak için var.
      </p>
    </Container>
  );
}
