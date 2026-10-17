// Spec 0008 HOK-1: installs the git hook dispatcher after `pnpm install`.
// Exits quietly in CI, when ORVANO_SKIP_HOOKS=1, and outside a git checkout (the Docker build, an archive).
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

if (process.env.CI || process.env.ORVANO_SKIP_HOOKS === '1' || !existsSync('.git')) {
  process.exit(0)
}

// --no-agent stops Vite+ from editing AGENTS.md, which /sync owns.
const result = spawnSync('vp', ['config', '--no-agent'], { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
