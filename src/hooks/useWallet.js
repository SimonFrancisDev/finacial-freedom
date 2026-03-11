import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { web3Service } from '../Services/web3'
import { AMOY_CHAIN_ID, NETWORK_CONFIG } from '../constants/addresses'

export const useWallet = () => {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshBalance = useCallback(async (address) => {
    try {
      if (!address) return

      const provider = web3Service.getReadProvider()
      const rawBalance = await provider.getBalance(address)
      setBalance(ethers.formatEther(rawBalance))
    } catch (err) {
      console.error('Error refreshing balance:', err)
    }
  }, [])

  const switchToAmoy = useCallback(async () => {
    if (!window.ethereum) return false

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AMOY_CHAIN_ID }]
      })
      return true
    } catch (err) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG]
          })
          return true
        } catch (addErr) {
          console.error('Error adding Amoy network:', addErr)
          return false
        }
      }

      console.error('Error switching network:', err)
      return false
    }
  }, [])

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })

      if (chainId !== AMOY_CHAIN_ID) {
        const switched = await switchToAmoy()
        if (!switched) {
          throw new Error('Please switch to Polygon Amoy Testnet manually')
        }
        await new Promise(resolve => setTimeout(resolve, 700))
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account found')
      }

      const address = ethers.getAddress(accounts[0])

      await web3Service.initWallet({ requestAccounts: false })

      setAccount(address)
      setIsConnected(true)
      await refreshBalance(address)
    } catch (err) {
      console.error('Connection error:', err)
      setError(err?.reason || err?.message || 'Wallet connection failed')
    } finally {
      setIsLoading(false)
    }
  }, [refreshBalance, switchToAmoy])

  const disconnect = useCallback(() => {
    setAccount(null)
    setBalance(null)
    setIsConnected(false)
    setError(null)
  }, [])

  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })

        if (accounts.length > 0) {
          const address = ethers.getAddress(accounts[0])
          setAccount(address)
          setIsConnected(true)

          if (chainId === AMOY_CHAIN_ID) {
            await web3Service.initWallet({ requestAccounts: false })
            await refreshBalance(address)
          }
        }
      } catch (err) {
        console.error('Error checking connection:', err)
      }
    }

    checkConnection()
  }, [refreshBalance])

  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnect()
        return
      }

      const address = ethers.getAddress(accounts[0])
      setAccount(address)
      setIsConnected(true)
      await web3Service.initWallet({ requestAccounts: false })
      await refreshBalance(address)
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [disconnect, refreshBalance])

  return {
    account,
    balance,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    switchToAmoy
  }
}

