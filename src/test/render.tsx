import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { ThemeProvider } from "@/app/theme/ThemeProvider";

export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

type WrapperProps = { children: ReactNode };

export const renderWithProviders = (ui: ReactElement, options?: RenderOptions) => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Test için minimal bir TanStack Router kurar. Bileşen tek bir
 * sentetik route içinde render edilir; <Link to="/"> ve useRouter gibi
 * API'ler çalışır.
 */
export const renderWithRouter = (ui: ReactElement) => {
  const queryClient = createTestQueryClient();
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{ui}</ThemeProvider>
      </QueryClientProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
};
