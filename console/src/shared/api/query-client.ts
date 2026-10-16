import { QueryClient } from '@tanstack/react-query'

// Spec 0003 QRY-4. The read retry rule (network errors and 502 to 504 only) and the interaction lock need
// ApiError and shared/stores; they arrive with the API client (feature 10). Until then reads do not retry.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, networkMode: 'always', retry: false },
      mutations: { networkMode: 'always', retry: false },
    },
  })
}
