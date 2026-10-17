import { describe, expect, it } from "vitest";
import { getDirection, resolveLocale, sourceLocale } from "./locales";

// Spec 0003 I18N-6: navigator languages matched to the shipped catalogs, else en.
describe("resolveLocale", () => {
  it("picks en when the browser asks for a regional English", () => {
    expect(resolveLocale(["en-GB", "fr-FR"])).toBe("en");
  });

  it("matches the language whatever its case", () => {
    expect(resolveLocale(["EN-us"])).toBe("en");
  });

  it("falls back to the source locale when nothing requested is shipped", () => {
    expect(resolveLocale(["de-DE", "ja"])).toBe(sourceLocale);
  });

  it("falls back to the source locale when the browser sends no languages", () => {
    expect(resolveLocale([])).toBe(sourceLocale);
  });

  it("never resolves to the pseudo locale from browser languages", () => {
    expect(resolveLocale(["pseudo-LOCALE"])).toBe(sourceLocale);
  });

  it("skips malformed tags and keeps looking", () => {
    expect(resolveLocale(["", "-", "en"])).toBe("en");
  });
});

describe("getDirection", () => {
  it.each(["ar", "ar-EG", "he", "fa-IR", "ur"])("is rtl for %s", (locale) => {
    expect(getDirection(locale)).toBe("rtl");
  });

  it.each(["en", "en-US", "fr", "pseudo-LOCALE", ""])("is ltr for %s", (locale) => {
    expect(getDirection(locale)).toBe("ltr");
  });
});
