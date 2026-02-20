
export const BNB_BASE_NETWORKS = {
  testnet: {
    id: 'testnet' as const,
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    label: 'BNB Testnet',
    description: 'BNB Smart Chain Testnet (BSC Testnet)',
    disabled: false,
    symbol: 'tBNB',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'tBNB',
      decimals: 18,
    },
  },
  mainnet: {
    id: 'mainnet' as const,
    name: 'BSC Mainnet',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.bnbchain.org',
    explorerUrl: 'https://bscscan.com',
    label: 'BNB Mainnet',
    description: 'BNB Smart Chain Mainnet',
    disabled: true,
    symbol: 'BNB',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },
  opbnbTestnet: {
    id: 'opbnbTestnet' as const,
    name: 'opBNB Testnet',
    chainId: 5611,
    rpcUrl: 'https://opbnb-testnet-rpc.bnbchain.org',
    explorerUrl: 'https://testnet.opbnbscan.com',
    label: 'opBNB Testnet',
    description: 'opBNB L2 Testnet',
    disabled: false,
    symbol: 'tBNB',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'tBNB',
      decimals: 18,
    },
  },
  opbnbMainnet: {
    id: 'opbnbMainnet' as const,
    name: 'opBNB Mainnet',
    chainId: 204,
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorerUrl: 'https://opbnbscan.com',
    label: 'opBNB Mainnet',
    description: 'opBNB L2 Mainnet',
    disabled: true,
    symbol: 'BNB',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },
} as const;

export type BnbNetworkKey = keyof typeof BNB_BASE_NETWORKS;

// --- Feature Contract Addresses ---
export const VOTING_CONTRACTS = {
  testnet: '0x8a64dFb64A71AfD00F926064E1f2a0B9a7cBe7dD',
  mainnet: undefined,
  opbnbTestnet: '0x8a64dFb64A71AfD00F926064E1f2a0B9a7cBe7dD',
  opbnbMainnet: undefined,
};

export const AUCTION_CONTRACTS = {
  testnet: '0x00320016Ad572264a64C98142e51200E60f73bCE',
  mainnet: undefined,
  opbnbTestnet: '0xea2c7377fd34366878516bd68ccb469016b529d9',
  opbnbMainnet: undefined,
};

export const LOTTERY_CONTRACTS = {
  testnet: '0x9bb658a999a46d149262fe74d37894ac203ca493',
  mainnet: undefined,
  opbnbTestnet: '0x59c9ca4D0fd69674705043525FF0e063F9A6F13E',
  opbnbMainnet: undefined,
};

export const CROWDFUNDING_CONTRACTS = {
  testnet: '0x96bbbef124fe87477244d8583f771fdf6c2f0ed6',
  mainnet: undefined,
  opbnbTestnet: '0x9C8ca8Cb9eC9886f2cbD9917F083D561e773cF28',
  opbnbMainnet: undefined,
};

// --- Feature-Specific Exports ---
export const BNB_VOTING_NETWORKS = {
  testnet: { ...BNB_BASE_NETWORKS.testnet, contracts: { voting: VOTING_CONTRACTS.testnet } },
  mainnet: { ...BNB_BASE_NETWORKS.mainnet, contracts: { voting: VOTING_CONTRACTS.mainnet } },
  opbnbTestnet: { ...BNB_BASE_NETWORKS.opbnbTestnet, contracts: { voting: VOTING_CONTRACTS.opbnbTestnet } },
  opbnbMainnet: { ...BNB_BASE_NETWORKS.opbnbMainnet, contracts: { voting: VOTING_CONTRACTS.opbnbMainnet } },
} as const;

export const BNB_AUCTION_NETWORKS = {
  testnet: { ...BNB_BASE_NETWORKS.testnet, contracts: { auction: AUCTION_CONTRACTS.testnet } },
  mainnet: { ...BNB_BASE_NETWORKS.mainnet, contracts: { auction: AUCTION_CONTRACTS.mainnet } },
  opbnbTestnet: { ...BNB_BASE_NETWORKS.opbnbTestnet, contracts: { auction: AUCTION_CONTRACTS.opbnbTestnet } },
  opbnbMainnet: { ...BNB_BASE_NETWORKS.opbnbMainnet, contracts: { auction: AUCTION_CONTRACTS.opbnbMainnet } },
} as const;

export const BNB_LOTTERY_NETWORKS = {
  testnet: { ...BNB_BASE_NETWORKS.testnet, contracts: { lottery: LOTTERY_CONTRACTS.testnet } },
  mainnet: { ...BNB_BASE_NETWORKS.mainnet, contracts: { lottery: LOTTERY_CONTRACTS.mainnet } },
  opbnbTestnet: { ...BNB_BASE_NETWORKS.opbnbTestnet, contracts: { lottery: LOTTERY_CONTRACTS.opbnbTestnet } },
  opbnbMainnet: { ...BNB_BASE_NETWORKS.opbnbMainnet, contracts: { lottery: LOTTERY_CONTRACTS.opbnbMainnet } },
} as const;

export const BNB_CROWDFUNDING_NETWORKS = {
  testnet: { ...BNB_BASE_NETWORKS.testnet, contracts: { crowdFunding: CROWDFUNDING_CONTRACTS.testnet } },
  mainnet: { ...BNB_BASE_NETWORKS.mainnet, contracts: { crowdFunding: CROWDFUNDING_CONTRACTS.mainnet } },
  opbnbTestnet: { ...BNB_BASE_NETWORKS.opbnbTestnet, contracts: { crowdFunding: CROWDFUNDING_CONTRACTS.opbnbTestnet } },
  opbnbMainnet: { ...BNB_BASE_NETWORKS.opbnbMainnet, contracts: { crowdFunding: CROWDFUNDING_CONTRACTS.opbnbMainnet } },
} as const;

// --- Combined Export (Single Source of Truth) ---

export const BNB_NETWORKS = {
  testnet: {
    ...BNB_BASE_NETWORKS.testnet,
    contracts: {
      voting: VOTING_CONTRACTS.testnet,
      auction: AUCTION_CONTRACTS.testnet,
      lottery: LOTTERY_CONTRACTS.testnet,
      crowdFunding: CROWDFUNDING_CONTRACTS.testnet,
    },
  },
  mainnet: {
    ...BNB_BASE_NETWORKS.mainnet,
    contracts: {
      voting: VOTING_CONTRACTS.mainnet,
      auction: AUCTION_CONTRACTS.mainnet,
      lottery: LOTTERY_CONTRACTS.mainnet,
      crowdFunding: CROWDFUNDING_CONTRACTS.mainnet,
    },
  },
  opbnbTestnet: {
    ...BNB_BASE_NETWORKS.opbnbTestnet,
    contracts: {
      voting: VOTING_CONTRACTS.opbnbTestnet,
      auction: AUCTION_CONTRACTS.opbnbTestnet,
      lottery: LOTTERY_CONTRACTS.opbnbTestnet,
      crowdFunding: CROWDFUNDING_CONTRACTS.opbnbTestnet,
    },
  },
  opbnbMainnet: {
    ...BNB_BASE_NETWORKS.opbnbMainnet,
    contracts: {
      voting: VOTING_CONTRACTS.opbnbMainnet,
      auction: AUCTION_CONTRACTS.opbnbMainnet,
      lottery: LOTTERY_CONTRACTS.opbnbMainnet,
      crowdFunding: CROWDFUNDING_CONTRACTS.opbnbMainnet,
    },
  },
} as const;