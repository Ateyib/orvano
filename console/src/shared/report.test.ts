import { afterEach, describe, expect, it, vi } from "vitest";
import { reportConsoleError } from "./report";

// Spec 0003 FLT-4: one reporter; it writes to the browser console and sends nothing anywhere else.
describe("reportConsoleError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the error and the component stack to the console", () => {
    const write = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("boom");

    reportConsoleError(error, { componentStack: "\n    at WelcomePage" });

    expect(write).toHaveBeenCalledWith(error, "\n    at WelcomePage");
  });

  it("writes the error alone when React gives no component stack", () => {
    const write = vi.spyOn(console, "error").mockImplementation(() => {});

    reportConsoleError("plain failure");

    expect(write).toHaveBeenCalledWith("plain failure", undefined);
  });

  it("makes no network request", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const beacon = vi.spyOn(navigator, "sendBeacon");

    reportConsoleError(new Error("boom"));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });
});
