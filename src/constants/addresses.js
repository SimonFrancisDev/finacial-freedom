export const CONTRACT_ADDRESSES = {
  USDT: import.meta.env.VITE_USDT_ADDRESS,
  ESCROW: import.meta.env.VITE_ESCROW_ADDRESS,
  REGISTRATION: import.meta.env.VITE_REGISTRATION_ADDRESS,
  LEVEL_MANAGER: import.meta.env.VITE_LEVELMANAGER_ADDRESS,

  // Reusable orbit contracts
  P4_ORBIT: import.meta.env.VITE_P4_ORBIT_ADDRESS, // Levels 1, 4, 7, 10
  P12_ORBIT: import.meta.env.VITE_P12_ORBIT_ADDRESS, // Levels 2, 5, 8
  P39_ORBIT: import.meta.env.VITE_P39_ORBIT_ADDRESS, // Levels 3, 6, 9

  // Token reward layer
  FGT_TOKEN: import.meta.env.VITE_FGT_TOKEN_ADDRESS,
  FGTR_TOKEN: import.meta.env.VITE_FGTR_TOKEN_ADDRESS,
  FREEDOM_TOKEN_CONTROLLER: import.meta.env.VITE_FREEDOM_TOKEN_CONTROLLER_ADDRESS
}

export const NETWORK_CONFIG = {
  chainId: '0x13882', // 80002
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18
  },
  rpcUrls: [import.meta.env.VITE_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology/'],
  blockExplorerUrls: ['https://amoy.polygonscan.com/']
}

export const AMOY_CHAIN_ID = NETWORK_CONFIG.chainId

export const ORBIT_LEVEL_MAP = {
  1: 'P4',
  2: 'P12',
  3: 'P39',
  4: 'P4',
  5: 'P12',
  6: 'P39',
  7: 'P4',
  8: 'P12',
  9: 'P39',
  10: 'P4'
}

export const CONTRACT_LABELS = {
  ESCROW: 'AutoUpgrade Escrow',
  REGISTRATION: 'Registration',
  LEVEL_MANAGER: 'Level Manager',
  P4_ORBIT: 'P4 Orbit',
  P12_ORBIT: 'P12 Orbit',
  P39_ORBIT: 'P39 Orbit',
  FGT_TOKEN: 'FGT Token',
  FGTR_TOKEN: 'FGTr Token',
  FREEDOM_TOKEN_CONTROLLER: 'Freedom Token Controller'
}
