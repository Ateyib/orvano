import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import viteConfig from './vite.config'

// Spec 0003 QA-1: browser mode only, on the app's own Vite config, so tests run the same router plugin, Lingui
// macros, and React Compiler as the app. The src/ui project (Chromium, Firefox, WebKit) joins with feature 11.
// The dev proxy (spec 0007 CSL-3) is left out: it would send Vitest's own browser requests to the server.
export default mergeConfig(
  { ...viteConfig, server: { ...viteConfig.server, proxy: undefined } },
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'app',
            include: ['src/**/*.test.{ts,tsx}'],
            exclude: ['src/ui/**'],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
)
