import { afterEach, describe, expect, it } from "vitest";
import { activateLocale } from "@/shared/i18n";
import { renderWithProviders } from "@/test/render";

describe("WelcomePage", () => {
  afterEach(async () => {
    await activateLocale("en");
  });

  it("shows the console heading as the page h1 at the console root", async () => {
    const screen = await renderWithProviders("/");

    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Orvano console" }))
      .toBeVisible();
  });

  it("renders inside a main landmark", async () => {
    const screen = await renderWithProviders("/");

    await expect.element(screen.getByRole("main")).toBeInTheDocument();
  });

  // Spec 0003 I18N-9 at component level: proves the macro pass ran and strings come from the catalog.
  it("shows pseudo translated text when the pseudo locale is active", async () => {
    await activateLocale("pseudo-LOCALE");

    const screen = await renderWithProviders("/");

    const heading = screen.getByRole("heading", { level: 1 });
    await expect.element(heading).toBeVisible();
    await expect.element(heading).not.toHaveTextContent("Orvano console");
  });
});
