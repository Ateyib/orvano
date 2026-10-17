import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "vitest-browser-react";
import { createAppRouter } from "@/router";
import { activateLocale, i18n } from "@/shared/i18n";

/**
 * Spec 0003 QA-3: renders the real route tree at an in app URL (`/`, not `/console/`: memory history does not apply
 * the router's base path), with a fresh query client that never retries. MSW handlers join here once the console
 * calls the API (QA-2).
 */
export async function renderWithProviders(url: string) {
  // The boot step from main.tsx (RTE-10): I18nProvider renders nothing until a locale is active.
  if (!i18n.locale) await activateLocale("en");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  await router.load();
  return render(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>,
  );
}
