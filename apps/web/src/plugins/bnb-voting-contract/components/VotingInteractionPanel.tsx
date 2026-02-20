'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Vote,
  Users,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { cn } from './cn';
import VOTING_ABI from '../contract/voting/voting-abi.json';

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
    contractAddress: '0x8a64dFb64A71AfD00F926064E1f2a0B9a7cBe7dD',
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
    contractAddress: '0x8a64dFb64A71AfD00F926064E1f2a0B9a7cBe7dD',
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


type Candidate = {
  name: string;
  voteCount: bigint;
};

export interface VotingInteractionPanelProps {
  contractAddress?: string;
}

interface TxStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  hash?: string;
}

export function VotingInteractionPanel({
  contractAddress: initialAddress,
}: VotingInteractionPanelProps) {
  const defaultAddress = initialAddress ?? '0x8a64dFb64A71AfD00F926064E1f2a0B9a7cBe7dD';
  const [contractAddress] = useState(defaultAddress);
  const [selectedNetwork, setSelectedNetwork] = useState<BnbNetworkKey>('testnet');
  const networkConfig = BNB_NETWORKS[selectedNetwork];

  const { address: userAddress, isConnected: walletConnected, chain } = useAccount();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalVotes, setTotalVotes] = useState<bigint | null>(null);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [winnerVotes, setWinnerVotes] = useState<bigint | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [votingOpen, setVotingOpen] = useState<boolean | null>(null);

  const [candidateIndex, setCandidateIndex] = useState('');
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: 'idle', message: '' });
  const [contractError, setContractError] = useState<string | null>(null);

  const [hasVotedAddress, setHasVotedAddress] = useState('');
  const [hasVotedResult, setHasVotedResult] = useState<boolean | null>(null);
  const [hasVotedError, setHasVotedError] = useState<string | null>(null);

  const [candidateQueryIndex, setCandidateQueryIndex] = useState('');
  const [candidateQueryResult, setCandidateQueryResult] = useState<Candidate | null>(null);
  const [candidateQueryError, setCandidateQueryError] = useState<string | null>(null);

  const explorerUrl = `${networkConfig.explorerUrl}/address/${contractAddress}`;

  const getReadContract = useCallback(() => {
    if (!contractAddress) return null;
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    return new ethers.Contract(contractAddress, VOTING_ABI, provider);
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
    return new ethers.Contract(contractAddress, VOTING_ABI, signer);
  }, [chain?.id, contractAddress, walletConnected]);

  const fetchState = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;

    setContractError(null);
    try {
      const [rawCandidates, total, winner, contractOwner, open] = await Promise.all([
        contract.getCandidates(),
        contract.totalVotes(),
        contract.getWinner(),
        contract.owner(),
        contract.votingOpen(),
      ]);

      const mappedCandidates: Candidate[] = rawCandidates.map((c: any) => ({
        name: c.name as string,
        voteCount: c.voteCount as bigint,
      }));

      setCandidates(mappedCandidates);
      setTotalVotes(total as bigint);
      setWinnerName(winner[0] as string);
      setWinnerVotes(winner[1] as bigint);
      setOwner(contractOwner as string);
      setVotingOpen(Boolean(open));
    } catch (error: any) {
      console.error('Error fetching voting state:', error);
      setContractError(error?.reason || error?.message || 'Unable to read contract state on BNB Testnet');
    }
  }, [getReadContract]);

  useEffect(() => {
    if (contractAddress) {
      fetchState();
    }
  }, [contractAddress, fetchState]);

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
      console.error('Voting transaction error:', error);
      const msg = error?.reason || error?.message || 'Transaction failed';
      setTxStatus({ status: 'error', message: msg });
    } finally {
      setTimeout(() => setTxStatus({ status: 'idle', message: '' }), 6000);
    }
  };

  const handleStartVoting = async () => {
    try {
      const contract = await getWriteContract();
      await handleTx(() => contract.startVoting(), 'Voting opened');
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error?.message || 'Failed to start voting' });
    }
  };

  const handleEndVoting = async () => {
    try {
      const contract = await getWriteContract();
      await handleTx(() => contract.endVoting(), 'Voting closed');
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error?.message || 'Failed to end voting' });
    }
  };

  const handleVote = async () => {
    if (!candidateIndex) return;
    const index = Number(candidateIndex);
    if (Number.isNaN(index) || index < 0) {
      setTxStatus({ status: 'error', message: 'Candidate index must be a non-negative number' });
      return;
    }

    try {
      const contract = await getWriteContract();
      await handleTx(() => contract.vote(index), `Cast vote for candidate #${index}`);
      setCandidateIndex('');
    } catch (error: any) {
      setTxStatus({ status: 'error', message: error?.message || 'Failed to cast vote' });
    }
  };

  const handleCheckHasVoted = async () => {
    const contract = getReadContract();
    if (!contract) return;

    const target = (hasVotedAddress || userAddress)?.toString();
    if (!target) {
      setHasVotedError('Enter an address or connect your wallet');
      setHasVotedResult(null);
      return;
    }

    try {
      setHasVotedError(null);
      const result = await contract.hasVoted(target);
      setHasVotedResult(Boolean(result));
    } catch (error: any) {
      console.error('Error checking hasVoted:', error);
      setHasVotedError(error?.reason || error?.message || 'Unable to check voting status');
      setHasVotedResult(null);
    }
  };

  const handleQueryCandidate = async () => {
    const contract = getReadContract();
    if (!contract || candidateQueryIndex === '') {
      setCandidateQueryError('Please enter a candidate index');
      setCandidateQueryResult(null);
      return;
    }

    const index = parseInt(candidateQueryIndex);
    if (Number.isNaN(index) || index < 0) {
      setCandidateQueryError('Index must be a non-negative number');
      setCandidateQueryResult(null);
      return;
    }

    try {
      setCandidateQueryError(null);
      const result = await contract.candidates(index);
      setCandidateQueryResult({
        name: result.name as string,
        voteCount: result.voteCount as bigint,
      });
    } catch (error: any) {
      console.error('Error querying candidate:', error);
      setCandidateQueryError(error?.reason || error?.message || 'Candidate not found at this index');
      setCandidateQueryResult(null);
    }
  };

  const isOwnerHint = (
    <p className="text-[10px] text-forge-muted">
      Owner-only functions. If your transaction reverts, make sure you are using the deployer wallet.
    </p>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-3 rounded-lg border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Vote className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-medium text-white">BNB Voting Contract</h3>
              <p className="text-[10px] text-forge-muted">
                On-chain votes on BNB Smart Chain Testnet.
              </p>
            </div>
          </div>
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:underline"
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
              networkConfig.disabled && 'opacity-60 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🟡</span>
              <span>{networkConfig.name}</span>
              {networkConfig.id === 'testnet' && (
                <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Testnet</span>
              )}
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
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
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
            txStatus.status === 'success' && 'bg-emerald-500/10 border-emerald-500/30',
            txStatus.status === 'error' && 'bg-red-500/10 border-red-500/30'
          )}
        >
          {txStatus.status === 'pending' && (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
          )}
          {txStatus.status === 'success' && (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          {txStatus.status === 'error' && (
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-[10px] font-medium truncate',
                txStatus.status === 'pending' && 'text-blue-300',
                txStatus.status === 'success' && 'text-emerald-300',
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

      {/* Admin actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Vote className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-white">Admin Controls</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            onClick={handleStartVoting}
            disabled={!walletConnected || txStatus.status === 'pending'}
            className="px-3 py-2 text-[11px] rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            Start Voting
          </button>
          <button
            onClick={handleEndVoting}
            disabled={!walletConnected || txStatus.status === 'pending'}
            className="px-3 py-2 text-[11px] rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-50"
          >
            End Voting
          </button>
        </div>
        {isOwnerHint}
      </div>

      {/* Vote form */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-white">Cast Your Vote</span>
        </div>
        <div className="p-3 rounded-lg bg-forge-bg/50 border border-forge-border/40 space-y-2">
          <input
            type="number"
            min={0}
            value={candidateIndex}
            onChange={(e) => setCandidateIndex(e.target.value)}
            placeholder="Candidate index (0, 1, 2, ...)"
            className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-xs text-white placeholder-forge-muted focus:outline-none"
          />
          <button
            onClick={handleVote}
            disabled={!walletConnected || txStatus.status === 'pending'}
            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-medium disabled:opacity-50"
          >
            Vote
          </button>
          <p className="text-[10px] text-forge-muted">
            You can only vote once. The contract enforces one vote per address.
          </p>
        </div>
      </div>

      {/* Voting state */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-medium text-white">Current Results</span>
        </div>
        {contractError && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <p className="text-[10px] text-red-200">{contractError}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
            <p className="text-[10px] text-forge-muted">Total votes</p>
            <p className="text-sm font-semibold text-white">
              {totalVotes !== null ? totalVotes.toString() : '—'}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30">
            <p className="text-[10px] text-forge-muted">Owner</p>
            <p className="text-[11px] font-mono text-white truncate">
              {owner ?? '—'}
            </p>
            <p className="text-[10px] text-forge-muted mt-1">
              Voting status:{' '}
              <span className="font-semibold text-white">
                {votingOpen === null ? '—' : votingOpen ? 'Open' : 'Closed'}
              </span>
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-forge-bg/50 border border-forge-border/30 col-span-1 md:col-span-1">
            <p className="text-[10px] text-forge-muted">Leading candidate</p>
            <p className="text-sm font-semibold text-white">
              {winnerName ?? '—'}
            </p>
            {winnerVotes !== null && (
              <p className="text-[10px] text-forge-muted">
                Votes: <span className="font-medium text-white">{winnerVotes.toString()}</span>
              </p>
            )}
          </div>
        </div>

        {/* Candidate list */}
        <div className="space-y-1">
          {candidates.length === 0 ? (
            <p className="text-[10px] text-forge-muted">
              No candidates found yet. Make sure the contract is deployed on BNB Testnet and voting
              has been configured.
            </p>
          ) : (
            <div className="space-y-1.5">
              {candidates.map((c, idx) => (
                <div
                  key={`${c.name}-${idx}`}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-forge-bg/50 border border-forge-border/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-forge-muted">#{idx}</span>
                    <span className="text-xs font-medium text-white">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    {c.voteCount.toString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Has voted check */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-white">
            Check if an address has voted
          </p>
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              placeholder={userAddress ? 'Leave empty to use connected wallet' : '0x... address'}
              value={hasVotedAddress}
              onChange={(e) => setHasVotedAddress(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-[11px] text-white placeholder-forge-muted focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckHasVoted}
                className="px-2.5 py-1.5 text-[10px] rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
              >
                Check status
              </button>
              {hasVotedResult !== null && !hasVotedError && (
                <span className="text-[10px] text-forge-muted">
                  Result:{' '}
                  <span className="font-semibold text-white">
                    {hasVotedResult ? 'Has voted' : 'Not voted yet'}
                  </span>
                </span>
              )}
              {hasVotedError && (
                <span className="text-[10px] text-red-300 truncate">
                  {hasVotedError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Get candidate by index */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-white">
            Get candidate by index
          </p>
          <div className="flex flex-col gap-1.5">
            <input
              type="number"
              min={0}
              placeholder="Enter candidate index (0, 1, 2, ...)"
              value={candidateQueryIndex}
              onChange={(e) => setCandidateQueryIndex(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded text-[11px] text-white placeholder-forge-muted focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleQueryCandidate}
                className="px-2.5 py-1.5 text-[10px] rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
              >
                Query candidate
              </button>
              {candidateQueryResult && !candidateQueryError && (
                <div className="flex items-center gap-2 text-[10px] text-forge-muted">
                  <span className="font-semibold text-white">
                    {candidateQueryResult.name}
                  </span>
                  <span>•</span>
                  <span>
                    Votes: <span className="font-semibold">{candidateQueryResult.voteCount.toString()}</span>
                  </span>
                </div>
              )}
              {candidateQueryError && (
                <span className="text-[10px] text-red-300 truncate">
                  {candidateQueryError}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

