// The only module that reads import.meta.env (spec 0003 WEB-8), and only for build facts. Install specific
// values (instance URL, name, feature switches) come from the API at boot, never from the build.
const baseUrl = import.meta.env.BASE_URL;

export const config = {
  dev: import.meta.env.DEV,
  /** `/console`, fixed at build time for every install (spec 0007 CSL-1). */
  basePath: baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl,
} as const;
