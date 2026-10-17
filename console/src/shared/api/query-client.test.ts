import { describe, expect, it } from "vitest";
import { createQueryClient } from "./query-client";

// Spec 0003 QRY-4: the defaults set once for every query and mutation.
describe("createQueryClient", () => {
  it("keeps query data fresh for 30 seconds and fails offline requests at once", () => {
    const queries = createQueryClient().getDefaultOptions().queries;

    expect(queries?.staleTime).toBe(30_000);
    expect(queries?.networkMode).toBe("always");
  });

  it("never retries a mutation and fails it at once when offline", () => {
    const mutations = createQueryClient().getDefaultOptions().mutations;

    expect(mutations?.retry).toBe(false);
    expect(mutations?.networkMode).toBe("always");
  });

  it("creates a separate cache each time", () => {
    expect(createQueryClient().getQueryCache()).not.toBe(createQueryClient().getQueryCache());
  });
});
