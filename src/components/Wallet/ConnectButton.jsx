import React from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useWallet } from '../../hooks/useWallet'

export const ConnectButton = () => {
  const { account, isConnected, isLoading, error, connect, disconnect } = useWallet()

  if (error) {
    return (
      <Button variant="danger" onClick={connect}>
        Retry Connection
      </Button>
    )
  }

  if (isLoading) {
    return (
      <Button variant="primary" disabled>
        <Spinner
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true"
        />
        {' '}Connecting...
      </Button>
    )
  }

  if (isConnected) {
    return (
      <div className="d-flex align-items-center gap-2">
        <span className="text-success">
          {account?.slice(0, 6)}...{account?.slice(-4)}
        </span>
        <Button variant="outline-danger" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button variant="primary" onClick={connect}>
      Connect Wallet
    </Button>
  )
}