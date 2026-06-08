import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};
