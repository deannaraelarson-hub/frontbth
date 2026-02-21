import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// 1. Get projectId from Reown Cloud (https://cloud.reown.com)
const projectId = '906bd57a09299f262aab595f3226ec60' // Get from https://cloud.reown.com

// 2. Create QueryClient
const queryClient = new QueryClient()

// 3. Set up networks
const networks = [mainnet, bsc, polygon, arbitrum, optimism, avalanche]

// 4. Set up Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// 5. Create AppKit instance
const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#F7931A',
    '--w3m-color-mix': '#F7931A',
    '--w3m-color-mix-strength': 20,
    '--w3m-border-radius-master': '8px'
  },
  features: {
    analytics: true,
    email: false,
    socials: false
  }
})

export function AppKitProvider({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}