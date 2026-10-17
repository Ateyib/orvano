import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@lingui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createQueryClient } from "@/shared/api/query-client";
import { activateLocale, i18n, resolveLocale } from "@/shared/i18n";
import { reportConsoleError } from "@/shared/report";
import { createAppRouter } from "./router";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("index.html has no #root element");

const root = createRoot(rootElement, {
  onCaughtError: reportConsoleError, // spec 0003 WEB-10, FLT-4
  onUncaughtError: reportConsoleError,
});

// Spec 0003 RTE-10: boot before the first render. The runtime config and session requests join this step once
// feature 10 defines their endpoints.
await activateLocale(resolveLocale(navigator.languages));

const queryClient = createQueryClient();
const router = createAppRouter({ queryClient });

root.render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
);
