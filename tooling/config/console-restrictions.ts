// Spec 0008 LNT-3: the console's restriction rules, from the spec 0003 Enforcement table and Replaces list, and the
// spec 0001 import boundary. Each entry's message starts with its rule ID and says where to go instead.
//
// Flat config replaces a rule's options rather than merging them, so eslint.config.ts builds one rule set per
// region below. A region that is a restriction's allowed home simply leaves that one restriction out: no inline
// disables, and the other restrictions still apply there.

type Area = "app" | "routes" | "features" | "shared" | "ui";
type Home = "api" | "config" | "storage" | "url" | "view-hook" | "queries";

interface Region {
  files: string[];
  area: Area;
  home?: Home;
}

// `group` takes gitignore style globs, where a bare name like `react-router` also matches `@tanstack/react-router`,
// so package names go in `regex`, anchored.
type ImportPattern = ({ group: string[] } | { regex: string }) & {
  importNames?: string[];
  message: string;
};

/** An anchored regex for package names, matching each package and its subpaths. */
const packages = (names: string[]): string =>
  `^(${names.map((name) => name.replaceAll("/", "\\/").replaceAll("*", "[^/]+")).join("|")})(\\/.*)?$`;

interface Restriction {
  /** Where the restriction applies. Every area when left out. */
  areas?: Area[];
  /** The restriction's allowed homes, where it is left out. */
  allowIn?: Home[];
  imports?: ImportPattern;
  globals?: { name: string; message: string }[];
  syntax?: { selector: string; message: string }[];
}

const src = "console/src";

// Later regions win, so the more specific ones come last.
export const regions: Region[] = [
  { files: [`${src}/**/*.{ts,tsx}`], area: "app" },
  { files: [`${src}/routes/**/*.{ts,tsx}`], area: "routes" },
  { files: [`${src}/features/**/*.{ts,tsx}`], area: "features" },
  { files: [`${src}/features/**/use-*-view.{ts,tsx}`], area: "features", home: "view-hook" },
  { files: [`${src}/features/*/api/queries.ts`], area: "features", home: "queries" },
  { files: [`${src}/shared/**/*.{ts,tsx}`], area: "shared" },
  { files: [`${src}/shared/api/**/*.{ts,tsx}`], area: "shared", home: "api" },
  { files: [`${src}/shared/config.ts`], area: "shared", home: "config" },
  { files: [`${src}/shared/storage/**/*.{ts,tsx}`], area: "shared", home: "storage" },
  { files: [`${src}/shared/url/**/*.{ts,tsx}`], area: "shared", home: "url" },
  { files: [`${src}/ui/**/*.{ts,tsx}`], area: "ui" },
];

const banned = (names: string[], message: string): Restriction => ({
  imports: { regex: packages(names), message },
});

export const restrictions: Restriction[] = [
  // DIR-2: imports flow routes → features → shared and ui; ui → shared only; shared imports neither.
  {
    areas: ["features", "shared", "ui"],
    imports: {
      group: ["@/routes", "@/routes/**"],
      message: "DIR-2: only route files import from src/routes; move shared code to src/shared.",
    },
  },
  {
    areas: ["shared", "ui"],
    imports: {
      group: ["@/features", "@/features/**"],
      message: "DIR-2: shared and ui never import a feature; move the code to src/shared.",
    },
  },
  {
    areas: ["shared"],
    imports: {
      group: ["@/ui", "@/ui/**"],
      message: "DIR-2: src/shared imports neither ui nor features.",
    },
  },
  {
    areas: ["features"],
    imports: {
      group: ["@/features/*/**"],
      message:
        "DIR-2: import another area only through its index (@/features/<area>); inside your own area use relative paths.",
    },
  },
  // DIR-3 and the spec 0001 import boundary: React Aria only inside src/ui.
  {
    areas: ["app", "routes", "features", "shared"],
    imports: {
      regex: packages([
        "react-aria-components",
        "react-aria",
        "react-stately",
        "@react-aria/*",
        "@react-stately/*",
      ]),
      message: "DIR-3: compose the primitives in src/ui instead of importing React Aria.",
    },
  },
  // QRY-1: all HTTP goes through the one client in src/shared/api.
  {
    allowIn: ["api"],
    imports: {
      regex: packages(["openapi-fetch"]),
      message: "QRY-1: call the API through the client in src/shared/api.",
    },
    globals: [
      { name: "fetch", message: "QRY-1: call the API through the client in src/shared/api." },
    ],
    syntax: [
      {
        selector: "MemberExpression[property.name='fetch']",
        message: "QRY-1: call the API through the client in src/shared/api.",
      },
    ],
  },
  // QRY-2: only query option factories create keys.
  {
    allowIn: ["queries"],
    syntax: [
      {
        selector: "Property[key.name='queryKey']",
        message:
          "QRY-2: build query keys only in features/<area>/api/queries.ts, and call its factory here.",
      },
    ],
  },
  // URL-3: only view hooks and src/shared/url write search params.
  {
    allowIn: ["view-hook", "url"],
    syntax: [
      {
        selector:
          "CallExpression:matches([callee.name='navigate'], [callee.property.name='navigate']) > ObjectExpression > Property[key.name='search']",
        message:
          "URL-3: write search params through the route's use<Route>View() hook (setSearch in src/shared/url).",
      },
    ],
  },
  // WEB-8: import.meta.env only in src/shared/config.ts.
  {
    allowIn: ["config"],
    syntax: [
      {
        selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
        message:
          "WEB-8: read import.meta.env only in src/shared/config.ts, and import config from there.",
      },
    ],
  },
  // STO-1: only src/shared/storage touches browser storage.
  {
    allowIn: ["storage"],
    globals: ["localStorage", "sessionStorage", "indexedDB"].map((name) => ({
      name,
      message: "STO-1: use src/shared/storage for browser storage.",
    })),
    syntax: [
      {
        selector: "MemberExpression[property.name=/^(localStorage|sessionStorage|indexedDB)$/]",
        message: "STO-1: use src/shared/storage for browser storage.",
      },
    ],
  },
  // SEC-2: no raw HTML, eval, or event handler strings.
  {
    syntax: [
      {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: "SEC-2: no dangerouslySetInnerHTML; rendering trusted HTML needs a spec.",
      },
      {
        selector:
          "CallExpression[callee.name='eval'], NewExpression[callee.name='Function'], CallExpression[callee.name='Function']",
        message: "SEC-2: no eval or new Function; the console runs under a strict CSP.",
      },
      {
        selector:
          "JSXAttribute[name.name=/^on[A-Z]/] > Literal, CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^on/i]",
        message: "SEC-2: no inline event handler strings; pass a function.",
      },
    ],
  },
  // WEB-4: no enum or namespace (erasableSyntaxOnly catches them too, this names the rule).
  {
    syntax: [
      {
        selector: "TSEnumDeclaration",
        message: "WEB-4: no enum; use a union of string literals or an `as const` object.",
      },
    ],
  },
  // WEB-6: the React Compiler memoizes; no hand written memo.
  {
    imports: {
      regex: "^react$",
      importNames: ["useMemo", "useCallback", "memo"],
      message:
        "WEB-6: the React Compiler memoizes for you; remove the hand written memo (or 'use no memo' with a reason).",
    },
    syntax: [
      {
        selector:
          "MemberExpression[object.name='React'][property.name=/^(useMemo|useCallback|memo)$/]",
        message:
          "WEB-6: the React Compiler memoizes for you; remove the hand written memo (or 'use no memo' with a reason).",
      },
    ],
  },
  // Replaces list: packages the console never uses.
  banned(
    ["react-router", "react-router-dom", "@remix-run/*", "next"],
    "RTE-1: routing is TanStack Router, file based in src/routes.",
  ),
  banned(
    ["axios", "ky", "swr", "@reduxjs/toolkit"],
    "QRY-1: HTTP goes through src/shared/api, and server state lives in TanStack Query.",
  ),
  banned(
    ["redux", "react-redux", "zustand", "jotai"],
    "STA-1: no client state store; keep state in the URL, the query cache, or the component.",
  ),
  banned(
    ["react-hook-form", "formik"],
    "FRM-1: build forms with TanStack Form through the app hook in src/ui/form.",
  ),
  banned(
    ["i18next", "react-i18next", "react-intl"],
    "I18N-1: every string goes through the Lingui macros.",
  ),
  banned(
    ["date-fns", "dayjs", "moment"],
    "I18N-5: format dates, numbers, and sizes through src/shared/format.",
  ),
  banned(
    ["@radix-ui/*", "radix-ui", "@headlessui/*", "@base-ui-components/*", "@base-ui/*", "@mui/*"],
    "DIR-3: compose the primitives in src/ui (React Aria inside), never another component library.",
  ),
  banned(
    ["jsdom", "happy-dom", "enzyme", "@testing-library/react"],
    "QA-1: tests run in Vitest browser mode; render with renderWithProviders from src/test.",
  ),
];

type RuleEntry = ["error", ...unknown[]];

export interface RegionRules {
  files: string[];
  rules: {
    "no-restricted-imports": RuleEntry | "off";
    "no-restricted-globals": RuleEntry | "off";
    "no-restricted-syntax": RuleEntry | "off";
  };
}

/** One rule set per region, holding every restriction that applies there. */
export function regionRules(): RegionRules[] {
  return regions.map((region) => {
    const active = restrictions.filter(
      (restriction) =>
        (restriction.areas?.includes(region.area) ?? true) &&
        !(region.home && restriction.allowIn?.includes(region.home)),
    );
    const patterns = active.flatMap((restriction) =>
      restriction.imports ? [restriction.imports] : [],
    );
    const globals = active.flatMap((restriction) => restriction.globals ?? []);
    const syntax = active.flatMap((restriction) => restriction.syntax ?? []);
    return {
      files: region.files,
      rules: {
        "no-restricted-imports": patterns.length > 0 ? ["error", { patterns }] : "off",
        "no-restricted-globals": globals.length > 0 ? ["error", ...globals] : "off",
        "no-restricted-syntax": syntax.length > 0 ? ["error", ...syntax] : "off",
      },
    };
  });
}

/** Every restriction message, grouped by the rule ID it starts with. check:lint-fixtures expects each to fire. */
export function restrictionMessages(): Map<string, string[]> {
  const byId = new Map<string, string[]>();
  for (const restriction of restrictions) {
    const messages = [
      ...(restriction.imports ? [restriction.imports.message] : []),
      ...[...(restriction.globals ?? []), ...(restriction.syntax ?? [])].map(
        (entry) => entry.message,
      ),
    ];
    for (const message of messages) {
      const id = message.split(":")[0] ?? message;
      const list = byId.get(id) ?? [];
      if (!list.includes(message)) list.push(message);
      byId.set(id, list);
    }
  }
  return byId;
}
