cat > src/App.tsx << 'EOF'
import React, { useState, useEffect, useCallback, memo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { RainbowKitProvider, ConnectButton, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowDownUp, Settings2, X } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import '@rainbow-me/rainbowkit/styles.css';

const SIDRA_CHAIN = {
  id: 97453,
  name: 'Sidra Chain',
  nativeCurrency: { name: 'SDA', symbol: 'SDA', decimals: 18 },
  rpcUrls: { default: { http: ['https://node.sidrachain.com'] } },
  blockExplorers: { default: { name: 'Sidra Explorer', url: 'https://ledger.sidrachain.com' } },
} as const;

const WSDA = '0xe4095a910209d7be03b55d02f40d4554b1666182';
const ROUTER_ADDRESS = '0x35cAC72Db00e8dAC0e4f7F8A0F53D339E0cC23fb';

const config = getDefaultConfig({
  appName: 'MySidraDEX',
  projectId: import.meta.env.VITE_WC_PROJECT_ID,
  chains: [SIDRA_CHAIN],
  transports: { [SIDRA_CHAIN.id]: http() },
});

const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

const ALL_TOKENS = [
  { symbol: 'SDA', name: 'Sidra (Native)', address: 'NATIVE', decimals: 18, icon: '🔹' },
  { symbol: 'VPD', name: 'Dining Platform Halal', address: '0x345b20d4fca08376f19145c36c531a1821af96c4', decimals: 18, icon: '🍽️' },
  { symbol: 'MBF', name: 'EBMOF', address: '0xf74106911432657a24b0d85257d40f24f801cc01', decimals: 18, icon: '🏦' },
  { symbol: 'ECSDA', name: 'ECOSIDRA', address: '0xb6f440a059d24ca305bce6f25115d09e9dbea653', decimals: 18, icon: '🌍' },
  { symbol: 'ARMS', name: 'Sidra Aram Travel', address: '0x9b61324f0bee10f4624fe6e75c60943b73125e81', decimals: 18, icon: '✈️' },
  { symbol: 'NGEC', name: 'NEWGEN GLOBAL MARKETING', address: '0x88a53e067a6d2be71248d7b660ae72cc47f82d88', decimals: 18, icon: '📣' },
];

const queryClient = new QueryClient();

const AppContent = memo(() => {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { isSuccess, data: txHash } = useWaitForTransactionReceipt({ hash: undefined });

  const [fromToken, setFromToken] = useState(ALL_TOKENS[0]);
  const [toToken, setToToken] = useState(ALL_TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('0.000000');
  const [slippage, setSlippage] = useState(0.5);
  const [showTokenModal, setShowTokenModal] = useState<'from' | 'to' | null>(null);
  const [modalSearch, setModalSearch] = useState('');

  const handleSwapTokens = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  }, [fromToken, toToken, fromAmount, toAmount]);

  const executeSwap = async () => {
    if (!address || !fromAmount) return toast.error('Connect wallet and enter amount');
    toast.success('Demo mode - full swap coming after connect');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/90 backdrop-blur-2xl border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-3xl flex items-center justify-center text-3xl">🔹</div>
            <span className="logo-font text-4xl font-bold tracking-tighter">MySidra<span className="text-emerald-400">DEX</span></span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      <div className="pt-28 pb-12 max-w-[420px] mx-auto px-5">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-semibold logo-font tracking-tighter">Swap on SidraChain</h1>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-700 rounded-3xl p-8">
          {/* FROM */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-zinc-400">From</span>
              <span className="font-mono text-emerald-300 text-xs">{fromToken.symbol}</span>
            </div>
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
              <button onClick={() => setShowTokenModal('from')} className="flex items-center gap-4 bg-zinc-800 px-6 py-3 rounded-2xl">
                <span className="text-4xl">{fromToken.icon}</span>
                <span className="text-xl font-semibold">{fromToken.symbol}</span>
              </button>
              <input type="text" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} placeholder="0.0" className="flex-1 bg-transparent text-5xl text-right outline-none" />
            </div>
          </div>

          {/* SWAP ICON */}
          <div className="flex justify-center -my-5 relative z-10">
            <button onClick={handleSwapTokens} className="bg-zinc-900 border-4 border-zinc-800 rounded-3xl p-4">
              <ArrowDownUp size={32} className="text-emerald-400" />
            </button>
          </div>

          {/* TO */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-zinc-400">To</span>
              <span className="font-mono text-emerald-300 text-xs">{toToken.symbol}</span>
            </div>
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
              <button onClick={() => setShowTokenModal('to')} className="flex items-center gap-4 bg-zinc-800 px-6 py-3 rounded-2xl">
                <span className="text-4xl">{toToken.icon}</span>
                <span className="text-xl font-semibold">{toToken.symbol}</span>
              </button>
              <input type="text" value={toAmount} readOnly className="flex-1 bg-transparent text-5xl text-right outline-none text-emerald-300" />
            </div>
          </div>

          <button onClick={executeSwap} className="mt-10 w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black py-6 rounded-3xl text-2xl font-bold">Swap Now</button>
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
});

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
EOF
