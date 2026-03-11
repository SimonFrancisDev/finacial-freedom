import { useState, useCallback } from 'react'
import { web3Service } from '../Services/web3'

export const useContracts = () => {
  const [contracts, setContracts] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadContracts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const initializedContracts = web3Service.getReadContracts()
      setContracts(initializedContracts)
      return initializedContracts
    } catch (err) {
      const message = err?.reason || err?.message || 'Failed to initialize contracts'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { contracts, isLoading, error, loadContracts }
}
