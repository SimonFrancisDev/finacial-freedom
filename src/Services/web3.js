import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/addresses'

import USDT_ABI from '../abis/USDT.json'
import ESCROW_ABI from '../abis/AutoUpgradeEscrow.json'
import REGISTRATION_ABI from '../abis/RegistrationFixed.json'
import LEVEL_MANAGER_ABI from '../abis/LevelManager.json'
import ORBIT_ABI from '../abis/OrbitBase.json'
import FGT_TOKEN_ABI from '../abis/FGTToken.json'
import FGTR_TOKEN_ABI from '../abis/FGTrToken.json'
import TOKEN_CONTROLLER_ABI from '../abis/FreedomTokenController.json'

export class Web3Service {
  constructor() {
    this.readProvider = null
    this.walletProvider = null
    this.signer = null
    this.readContracts = {}
    this.writeContracts = {}
  }

  initReadProvider() {
    if (!this.readProvider) {
      this.readProvider = new ethers.JsonRpcProvider(
        import.meta.env.VITE_AMOY_RPC_URL || NETWORK_CONFIG.rpcUrls[0]
      )
    }

    return this.readProvider
  }

  initReadContracts() {
    if (Object.keys(this.readContracts).length > 0) {
      return this.readContracts
    }

    const provider = this.initReadProvider()

    this.readContracts = {
      usdt: new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, provider),
      escrow: new ethers.Contract(CONTRACT_ADDRESSES.ESCROW, ESCROW_ABI, provider),
      registration: new ethers.Contract(CONTRACT_ADDRESSES.REGISTRATION, REGISTRATION_ABI, provider),
      levelManager: new ethers.Contract(CONTRACT_ADDRESSES.LEVEL_MANAGER, LEVEL_MANAGER_ABI, provider),
      p4Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P4_ORBIT, ORBIT_ABI, provider),
      p12Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P12_ORBIT, ORBIT_ABI, provider),
      p39Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P39_ORBIT, ORBIT_ABI, provider),

      // Token reward layer
      fgtToken: new ethers.Contract(CONTRACT_ADDRESSES.FGT_TOKEN, FGT_TOKEN_ABI, provider),
      fgtrToken: new ethers.Contract(CONTRACT_ADDRESSES.FGTR_TOKEN, FGTR_TOKEN_ABI, provider),
      tokenController: new ethers.Contract(
        CONTRACT_ADDRESSES.FREEDOM_TOKEN_CONTROLLER,
        TOKEN_CONTROLLER_ABI,
        provider
      )
    }

    return this.readContracts
  }

  async initWallet(options = {}) {
    const { requestAccounts = true } = options

    if (!window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    this.initReadContracts()

    if (!this.walletProvider) {
      this.walletProvider = new ethers.BrowserProvider(window.ethereum)
    }

    if (requestAccounts) {
      await this.walletProvider.send('eth_requestAccounts', [])
    }

    this.signer = await this.walletProvider.getSigner()

    this.writeContracts = {
      usdt: new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, this.signer),
      escrow: new ethers.Contract(CONTRACT_ADDRESSES.ESCROW, ESCROW_ABI, this.signer),
      registration: new ethers.Contract(CONTRACT_ADDRESSES.REGISTRATION, REGISTRATION_ABI, this.signer),
      levelManager: new ethers.Contract(CONTRACT_ADDRESSES.LEVEL_MANAGER, LEVEL_MANAGER_ABI, this.signer),
      p4Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P4_ORBIT, ORBIT_ABI, this.signer),
      p12Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P12_ORBIT, ORBIT_ABI, this.signer),
      p39Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P39_ORBIT, ORBIT_ABI, this.signer),

      // Token reward layer
      fgtToken: new ethers.Contract(CONTRACT_ADDRESSES.FGT_TOKEN, FGT_TOKEN_ABI, this.signer),
      fgtrToken: new ethers.Contract(CONTRACT_ADDRESSES.FGTR_TOKEN, FGTR_TOKEN_ABI, this.signer),
      tokenController: new ethers.Contract(
        CONTRACT_ADDRESSES.FREEDOM_TOKEN_CONTROLLER,
        TOKEN_CONTROLLER_ABI,
        this.signer
      )
    }

    return {
      readContracts: this.readContracts,
      writeContracts: this.writeContracts
    }
  }

  async init(options = {}) {
    return this.initWallet(options)
  }

  getReadProvider() {
    return this.initReadProvider()
  }

  getWalletProvider() {
    return this.walletProvider
  }

  getSigner() {
    return this.signer
  }

  getReadContracts() {
    return this.initReadContracts()
  }

  getWriteContracts() {
    return this.writeContracts
  }

  getAddress() {
    return this.signer?.address || null
  }
}

export const web3Service = new Web3Service()












// import { ethers } from 'ethers'
// import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../constants/addresses'

// import USDT_ABI from '../abis/USDT.json'
// import ESCROW_ABI from '../abis/AutoUpgradeEscrow.json'
// import REGISTRATION_ABI from '../abis/RegistrationFixed.json'
// import LEVEL_MANAGER_ABI from '../abis/LevelManager.json'
// import ORBIT_ABI from '../abis/OrbitBase.json'

// export class Web3Service {
//   constructor() {
//     this.readProvider = null
//     this.walletProvider = null
//     this.signer = null
//     this.readContracts = {}
//     this.writeContracts = {}
//   }

//   initReadProvider() {
//     if (!this.readProvider) {
//       this.readProvider = new ethers.JsonRpcProvider(
//         import.meta.env.VITE_AMOY_RPC_URL || NETWORK_CONFIG.rpcUrls[0]
//       )
//     }

//     return this.readProvider
//   }

//   initReadContracts() {
//     if (Object.keys(this.readContracts).length > 0) {
//       return this.readContracts
//     }

//     const provider = this.initReadProvider()

//     this.readContracts = {
//       usdt: new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, provider),
//       escrow: new ethers.Contract(CONTRACT_ADDRESSES.ESCROW, ESCROW_ABI, provider),
//       registration: new ethers.Contract(CONTRACT_ADDRESSES.REGISTRATION, REGISTRATION_ABI, provider),
//       levelManager: new ethers.Contract(CONTRACT_ADDRESSES.LEVEL_MANAGER, LEVEL_MANAGER_ABI, provider),
//       p4Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P4_ORBIT, ORBIT_ABI, provider),
//       p12Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P12_ORBIT, ORBIT_ABI, provider),
//       p39Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P39_ORBIT, ORBIT_ABI, provider)
//     }

//     return this.readContracts
//   }

//   async initWallet(options = {}) {
//     const { requestAccounts = true } = options

//     if (!window.ethereum) {
//       throw new Error('MetaMask not installed')
//     }

//     this.initReadContracts()

//     if (!this.walletProvider) {
//       this.walletProvider = new ethers.BrowserProvider(window.ethereum)
//     }

//     if (requestAccounts) {
//       await this.walletProvider.send('eth_requestAccounts', [])
//     }

//     this.signer = await this.walletProvider.getSigner()

//     this.writeContracts = {
//       usdt: new ethers.Contract(CONTRACT_ADDRESSES.USDT, USDT_ABI, this.signer),
//       escrow: new ethers.Contract(CONTRACT_ADDRESSES.ESCROW, ESCROW_ABI, this.signer),
//       registration: new ethers.Contract(CONTRACT_ADDRESSES.REGISTRATION, REGISTRATION_ABI, this.signer),
//       levelManager: new ethers.Contract(CONTRACT_ADDRESSES.LEVEL_MANAGER, LEVEL_MANAGER_ABI, this.signer),
//       p4Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P4_ORBIT, ORBIT_ABI, this.signer),
//       p12Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P12_ORBIT, ORBIT_ABI, this.signer),
//       p39Orbit: new ethers.Contract(CONTRACT_ADDRESSES.P39_ORBIT, ORBIT_ABI, this.signer)
//     }

//     return {
//       readContracts: this.readContracts,
//       writeContracts: this.writeContracts
//     }
//   }

//   async init(options = {}) {
//     return this.initWallet(options)
//   }

//   getReadProvider() {
//     return this.initReadProvider()
//   }

//   getWalletProvider() {
//     return this.walletProvider
//   }

//   getSigner() {
//     return this.signer
//   }

//   getReadContracts() {
//     return this.initReadContracts()
//   }

//   getWriteContracts() {
//     return this.writeContracts
//   }

//   getAddress() {
//     return this.signer?.address || null
//   }
// }

// export const web3Service = new Web3Service()


