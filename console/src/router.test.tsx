import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'

// Spec 0003 RTE-3: the router runs under the /console base path and handles unknown paths itself.
describe('createAppRouter', () => {
  it('shows a not found view when the path matches no route', async () => {
    const screen = await renderWithProviders('/no/such/page')

    await expect.element(screen.getByText(/not found/i)).toBeVisible()
  })
})
