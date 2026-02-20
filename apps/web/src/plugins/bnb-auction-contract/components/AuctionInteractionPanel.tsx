'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
    Gavel,
    Users,
    RefreshCw,
    Loader2,
    AlertCircle,
    Check,
    ExternalLink,
    Timer,
    TrendingUp,
    ArrowDownToLine,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { cn } from './cn';
import AUCTION_ABI from '../contract/auction/auction-abi.json';

const BNB_NETWORKS = {
  testnet: {
    id: 'testnet' as const,
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    label: 'BNB Testnet',
    description: 'Deployed Voting.sol contract on BNB Testnet',
    disabled: false,
    symbol: 'tBNB',
    contractAddress: '0xea2c7377fd34366878516bd68ccb469016b529d9',
  },
  mainnet: {
    id: 'mainnet' as const,
    name: 'BSC Mainnet',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.bnbchain.org',
    explorerUrl: 'https://bscscan.com',
    label: 'BNB Mainnet',
    description: 'No voting contract deployed yet (coming soon)',
    disabled: true,
    symbol: 'BNB',
    contractAddress: undefined,
  },
  opbnbTestnet: {
    id: 'opbnbTestnet' as const,
    name: 'opBNB Testnet',
    chainId: 5611,
    rpcUrl: 'https://opbnb-testnet-rpc.bnbchain.org',
    explorerUrl: 'https://opbnb-testnet.bscscan.com',
    label: 'opBNB Testnet',
    description: 'Deployed Voting.sol contract on opBNB L2 Testnet',
    disabled: false,
    symbol: 'tBNB',
    contractAddress: '0xea2c7377fd34366878516bd68ccb469016b529d9',
  },
  opbnbMainnet: {
    id: 'opbnbMainnet' as const,
    name: 'opBNB Mainnet',
    chainId: 204,
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorerUrl: 'https://opbnbscan.com',
    label: 'opBNB Mainnet',
    description: 'opBNB L2 Mainnet (coming soon)',
    disabled: true,
    symbol: 'BNB',
    contractAddress: undefined,
  },
} as const;

type BnbNetworkKey = keyof typeof BNB_NETWORKS;

export interface AuctionInteractionPanelProps {
    contractAddress?: string;
}

interface TxStatus {
    status: 'idle' | 'pending' | 'success' | 'error';
    message: string;
    hash?: string;
}

export function AuctionInteractionPanel({
    contractAddress: initialAddress,
}: AuctionInteractionPanelProps) {
    const defaultAddress = initialAddress ?? '0x00320016Ad572264a64C98142e51200E60f73bCE';
    const [contractAddress] = useState(defaultAddress);
    const [selectedNetwork] = useState<BnbNetworkKey>('testnet');
    const networkConfig = BNB_NETWORKS[selectedNetwork];

    const { address: userAddress, isConnected: walletConnected, chain } = useAccount();

    // Auction state
    const [itemName, setItemName] = useState<string | null>(null);
    const [highestBid, setHighestBid] = useState<bigint | null>(null);
    const [highestBidder, setHighestBidder] = useState<string | null>(null);
    const [owner, setOwner] = useState<string | null>(null);
    const [ended, setEnded] = useState<boolean | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<bigint | null>(null);

    // Bid input
    const [bidAmount, setBidAmount] = useState('');

    // Pending returns check
    const [pendingAddress, setPendingAddress] = useState('');
    const [pendingResult, setPendingResult] = useState<bigint | null>(null);
    const [pendingError, setPendingError] = useState<string | null>(null);

    // Tx status
    const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle', message: '' });
    const [contractError, setContractError] = useState<string | null>(null);

    const explorerUrl = `${networkConfig.explorerUrl}/address/${contractAddress}`;

    const getReadContract = useCallback(() => {
        if (!contractAddress) return null;
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
        return new ethers.Contract(contractAddress, AUCTION_ABI, provider);
    }, [contractAddress, networkConfig.rpcUrl]);

    const getWriteContract = useCallback(async () => {
        if (!contractAddress) {
            throw new Error('No contract address specified');
        }
        if (!walletConnected) {
            throw new Error('Please connect your wallet first');
        }

        const ethereum = (window as any).ethereum;
        if (!ethereum) {
            throw new Error('No wallet detected. Please install MetaMask or a compatible wallet.');
        }

        const targetChainIdHex = `0x${networkConfig.chainId.toString(16)}`;

        if (chain?.id !== networkConfig.chainId) {
            try {
                await ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetChainIdHex }],
                });
            } catch (switchError: any) {
                if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
                    try {
                        await ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                                {
                                    chainId: targetChainIdHex,
                                    chainName: networkConfig.name,
                                    nativeCurrency: {
                                        name: 'BNB',
                                        symbol: 'BNB',
                                        decimals: 18,
                                    },
                                    rpcUrls: [networkConfig.rpcUrl],
                                    blockExplorerUrls: [networkConfig.explorerUrl],
                                },
                            ],
                        });
                    } catch (addError: any) {
                        throw new Error(`Failed to add BNB Testnet to wallet: ${addError.message}`);
                    }
                } else if (switchError.code === 4001) {
                    throw new Error('User rejected chain switch');
                } else {
                    throw switchError;
                }
            }
        }

        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        return new ethers.Contract(contractAddress, AUCTION_ABI, signer);
    }, [chain?.id, contractAddress, walletConnected, networkConfig]);

    const fetchState = useCallback(async () => {
        const contract = getReadContract();
        if (!contract) return;

        setContractError(null);
        try {
            const [status, contractOwner] = await Promise.all([
                contract.getStatus(),
                contract.owner(),
            ]);

            setItemName(status.item as string);
            setHighestBidder(status.leader as string);
            setHighestBid(status.leadingBid as bigint);
            setSecondsLeft(status.secondsLeft as bigint);
            setEnded(Boolean(status.isEnded));
            setOwner(contractOwner as string);
        } catch (error: any) {
            console.error('Error fetching auction state:', error);
            setContractError(error?.reason || error?.message || 'Unable to read contract state on BNB Testnet');
        }
    }, [getReadContract]);

    useEffect(() => {
        if (contractAddress) {
            fetchState();
        }
    }, [contractAddress, fetchState]);

    // Auto-refresh countdown
    useEffect(() => {
        if (ended || secondsLeft === null || secondsLeft === 0n) return;
        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev === null || prev <= 1n) return 0n;
                return prev - 1n;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [ended, secondsLeft]);

    const handleTx = async (op: () => Promise<ethers.TransactionResponse>, successMessage: string) => {
        if (!walletConnected) {
            setTxStatus({ status: 'error', message: 'Please connect your wallet first' });
            setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 4000);
            return;
        }

        try {
            setTxStatus({ status: 'pending', message: 'Confirm in your wallet…' });
            const tx = await op();
            setTxStatus({ status: 'pending', message: 'Waiting for confirmation…', hash: tx.hash });
            await tx.wait();
            setTxStatus({ status: 'success', message: successMessage, hash: tx.hash });
            await fetchState();
        } catch (error: any) {
            console.error('Auction transaction error:', error);
            const msg = error?.reason || error?.message || 'Transaction failed';
            setTxStatus({ status: 'error', message: msg });
        } finally {
            setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 6000);
        }
    };

    const handlePlaceBid = async () => {
        if (!bidAmount) {
            setTxStatus({ status: 'error', message: 'Please enter a bid amount' });
            setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 3000);
            return;
        }

        const value = parseFloat(bidAmount);
        if (Number.isNaN(value) || value <= 0) {
            setTxStatus({ status: 'error', message: 'Bid amount must be a positive number' });
            setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 3000);
            return;
        }

        // Check if auction is still active
        if (ended || (secondsLeft !== null && secondsLeft <= 0n)) {
            setTxStatus({ status: 'error', message: 'Auction has ended. Cannot place bid.' });
            setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 4000);
            return;
        }

        // Check if bid exceeds current highest
        if (highestBid !== null) {
            const weiValue = ethers.parseEther(bidAmount);
            if (weiValue <= highestBid) {
                setTxStatus({
                    status: 'error',
                    message: `Bid must exceed ${ethers.formatEther(highestBid)} BNB (current highest bid)`
                });
                setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 4000);
                return;
            }
        }

        try {
            const contract = await getWriteContract();
            const weiValue = ethers.parseEther(bidAmount);
            await handleTx(
                () => contract.placeBid({ value: weiValue }),
                `Bid placed: ${bidAmount} BNB`
            );
            setBidAmount('');
        } catch (error: any) {
            console.error('Auction transaction error:', error);
            let errorMsg = 'Failed to place bid';

            if (error?.message?.includes('Auction has ended')) {
                errorMsg = 'Auction has ended. Refresh to see current status.';
            } else if (error?.message?.includes('Auction already closed')) {
                errorMsg = 'Auction has been closed by owner.';
            } else if (error?.message?.includes('Bid too low')) {
                errorMsg = 'Bid too low. Must exceed current highest bid.';
            } else if (error?.reason) {
                errorMsg = error.reason;
            } else if (error?.message) {
                errorMsg = error.message;
            }

            setTxStatus({ status: 'error', message: errorMsg });
            setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 6000);
        }
    };

    const handleWithdraw = async () => {
        try {
            const contract = await getWriteContract();
            await handleTx(() => contract.withdraw(), 'Withdrawn pending returns');
        } catch (error: any) {
            setTxStatus({ status: 'error', message: error?.message || 'Failed to withdraw' });
        }
    };

    const handleEndEarly = async () => {
        try {
            const contract = await getWriteContract();
            await handleTx(() => contract.endEarly(), 'Auction ended early');
        } catch (error: any) {
            setTxStatus({ status: 'error', message: error?.message || 'Failed to end auction early' });
        }
    };

    const handleWithdrawProceeds = async () => {
        try {
            const contract = await getWriteContract();
            await handleTx(() => contract.withdrawProceeds(), 'Proceeds withdrawn');
        } catch (error: any) {
            setTxStatus({ status: 'error', message: error?.message || 'Failed to withdraw proceeds' });
        }
    };

    const handleCheckPending = async () => {
        const contract = getReadContract();
        if (!contract) return;

        const target = (pendingAddress || userAddress)?.toString();
        if (!target) {
            setPendingError('Enter an address or connect your wallet');
            setPendingResult(null);
            return;
        }

        try {
            setPendingError(null);
            const result = await contract.pendingReturns(target);
            setPendingResult(result as bigint);
        } catch (error: any) {
            console.error('Error checking pending returns:', error);
            setPendingError(error?.reason || error?.message || 'Unable to check pending returns');
            setPendingResult(null);
        }
    };

    function formatTimeLeft(secs: bigint): string {
        const total = Number(secs);
        if (total <= 0) return 'Ended';
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    const isOwnerHint = (
        <p className="text-[10px] text-forge-muted">
            Owner-only functions. If your transaction reverts, make sure you are using the deployer wallet.
        </p>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="p-3 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-amber-400" />
                        <div>
                            <h3 className="text-sm font-medium text-white">BNB Auction Contract</h3>
                            <p className="text-[10px] text-forge-muted">
                                English auction on BNB Smart Chain Testnet.
                            </p>
                        </div>
                    </div>
                </div>
                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:underline"
                >
                    {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                    <ExternalLink className="w-2.5 h-2.5" />
                </a>
            </div>

            {/* Wallet Status */}
            <div className={cn(
                'p-2.5 rounded-lg border',
                walletConnected ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'
            )}>
                <div className="flex items-center gap-2">
                    <Users className={cn('w-3.5 h-3.5', walletConnected ? 'text-green-400' : 'text-amber-400')} />
                    {walletConnected ? (
                        <span className="text-[10px] text-green-300">
                            Connected: <code className="text-green-400">{userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}</code>
                        </span>
                    ) : (
                        <span className="text-[10px] text-amber-300">Connect wallet via Wallet Auth node for write ops</span>
                    )}
                </div>
            </div>

            {/* Network Selector */}
            <div className="space-y-1.5">
                <label className="text-xs text-forge-muted flex items-center gap-1.5">
                    <span className="text-sm">🌐</span> Network
                </label>
                <div className="relative">
                    <button
                        type="button"
                        disabled
                        className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm',
                            'bg-forge-bg border-forge-border',
                            'text-white',
                            'opacity-60 cursor-not-allowed'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm">🟡</span>
                            <span>{networkConfig.name}</span>
                            <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Testnet</span>
                        </div>
                    </button>
                    <p className="text-[10px] text-forge-muted mt-1">
                        Contract deployed on BNB Testnet only. Mainnet support coming soon.
                    </p>
                </div>
            </div>

            {/* Refresh button */}
            <button
                onClick={fetchState}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh state
            </button>

            {/* Tx status */}
            {txStatus.status !== 'idle' && (
                <div
                    className={cn(
                        'rounded-lg p-2.5 border flex items-start gap-2',
                        txStatus.status === 'pending' && 'bg-blue-500/10 border-blue-500/30',
                        txStatus.status === 'success' && 'bg-amber-500/10 border-amber-500/30',
                        txStatus.status === 'error' && 'bg-red-500/10 border-red-500/30'
                    )}
                >
                    {txStatus.status === 'pending' && (
                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                    )}
                    {txStatus.status === 'success' && (
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    {txStatus.status === 'error' && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p
                            className={cn(
                                'text-[10px] font-medium truncate',
                                txStatus.status === 'pending' && 'text-blue-300',
                                txStatus.status === 'success' && 'text-amber-300',
                                txStatus.status === 'error' && 'text-red-300'
                            )}
                        >
                            {txStatus.message}
                        </p>
                        {txStatus.hash && (
                            <a
                                href={`${networkConfig.explorerUrl}/tx/${txStatus.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-forge-muted hover:text-white flex items-center gap-1"
                            >
                                View on BscScan
                                <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Auction State */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-white">Auction Status</span>
                </div>
                {contractError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <p className="text-[10px] text-red-200">{contractError}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
                        <p className="text-[10px] text-forge-muted">Item</p>
                        <p className="text-sm font-semibold text-white">
                            {itemName ?? '—'}
                        </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
                        <p className="text-[10px] text-forge-muted">Highest Bid</p>
                        <p className="text-sm font-semibold text-white">
                            {highestBid !== null
                                ? `${ethers.formatEther(highestBid)} BNB`
                                : '—'}
                        </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
                        <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3 text-amber-400" />
                            <p className="text-[10px] text-forge-muted">Time Left</p>
                        </div>
                        <p className="text-sm font-semibold text-white">
                            {secondsLeft !== null ? formatTimeLeft(secondsLeft) : '—'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
                        <p className="text-[10px] text-forge-muted">Leading Bidder</p>
                        <p className="text-[11px] font-mono text-white truncate">
                            {highestBidder && highestBidder !== '0x0000000000000000000000000000000000000000'
                                ? highestBidder
                                : '—'}
                        </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
                        <p className="text-[10px] text-forge-muted">Owner</p>
                        <p className="text-[11px] font-mono text-white truncate">
                            {owner ?? '—'}
                        </p>
                        <p className="text-[10px] text-forge-muted mt-1">
                            Status:{' '}
                            <span className="font-semibold text-white">
                                {ended === null ? '—' : ended ? 'Ended' : 'Active'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Place Bid */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Gavel className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-white">Place a Bid</span>
                </div>
                <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/40 space-y-2">
                    {ended || (secondsLeft !== null && secondsLeft <= 0n) ? (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            <p className="text-[10px] text-red-200">
                                Auction has ended. No more bids can be placed.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <input
                                    type="number"
                                    step="0.001"
                                    min={0}
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    placeholder="Bid amount in BNB (e.g. 0.01)"
                                    className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-white/40 focus:outline-none"
                                />
                                {highestBid !== null && (
                                    <p className="text-[9px] text-amber-400">
                                        Minimum bid: {ethers.formatEther(highestBid + 1n)} BNB (must exceed current highest)
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handlePlaceBid}
                                disabled={!walletConnected || txStatus.status === 'pending'}
                                className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-medium disabled:opacity-50"
                            >
                                Place Bid
                            </button>
                            <p className="text-[10px] text-forge-muted">
                                Your bid must exceed the current highest bid. Outbid BNB is refundable via Withdraw.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Withdraw */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-medium text-white">Withdraw</span>
                </div>
                <button
                    onClick={handleWithdraw}
                    disabled={!walletConnected || txStatus.status === 'pending'}
                    className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-medium disabled:opacity-50"
                >
                    Withdraw Pending Returns
                </button>
                <p className="text-[10px] text-forge-muted">
                    If you have been outbid, use this to reclaim your BNB.
                </p>
            </div>

            {/* Admin Controls */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Gavel className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-white">Owner Controls</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <button
                        onClick={handleEndEarly}
                        disabled={!walletConnected || txStatus.status === 'pending'}
                        className="px-3 py-2 text-[11px] rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-50"
                    >
                        End Auction Early
                    </button>
                    <button
                        onClick={handleWithdrawProceeds}
                        disabled={!walletConnected || txStatus.status === 'pending'}
                        className="px-3 py-2 text-[11px] rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50"
                    >
                        Withdraw Proceeds
                    </button>
                </div>
                {isOwnerHint}
            </div>

            {/* Check Pending Returns */}
            <div className="space-y-2">
                <p className="text-[10px] font-medium text-white">
                    Check pending returns for an address
                </p>
                <div className="flex flex-col gap-1.5">
                    <input
                        type="text"
                        placeholder={userAddress ? 'Leave empty to use connected wallet' : '0x... address'}
                        value={pendingAddress}
                        onChange={(e) => setPendingAddress(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-[11px] text-white placeholder-white/40 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCheckPending}
                            className="px-2.5 py-1.5 text-[10px] rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500"
                        >
                            Check pending
                        </button>
                        {pendingResult !== null && !pendingError && (
                            <span className="text-[10px] text-forge-muted">
                                Pending:{' '}
                                <span className="font-semibold text-white">
                                    {ethers.formatEther(pendingResult)} BNB
                                </span>
                            </span>
                        )}
                        {pendingError && (
                            <span className="text-[10px] text-red-300 truncate">
                                {pendingError}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
