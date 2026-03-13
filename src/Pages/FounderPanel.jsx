import React, { useState, useEffect, useMemo } from 'react'
import { Container, Row, Col, Table, Alert, Spinner, Button } from 'react-bootstrap'
import { useWallet } from '../hooks/useWallet'
import { useContracts } from '../hooks/useContracts'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'

export const FounderPanel = () => {
  const { isConnected, account } = useWallet()
  const { contracts, isLoading, error, loadContracts } = useContracts()
  const { t } = useTranslation()

  const [founderWallets, setFounderWallets] = useState([])
  const [founderRatios, setFounderRatios] = useState([])
  const [walletBalances, setWalletBalances] = useState({})
  const [id1Wallet, setId1Wallet] = useState('')
  const [isID1Downline, setIsID1Downline] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())

  const founderStyles = `
    @keyframes pulse-line {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    .lab-terminal {
      background: white;
      border: 1px solid rgba(0, 35, 102, 0.1);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 35, 102, 0.05);
      overflow: hidden;
    }
    .terminal-header {
      background: #002366;
      color: white;
      font-family: 'monospace';
      font-size: 0.85rem;
      padding: 12px 20px;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-bottom: 3px solid #0044cc;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .pulse-overlay {
      background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.02) 45%, rgba(0, 68, 204, 0.08) 50%, rgba(0, 35, 102, 0.02) 55%, transparent 100%);
      background-size: 200% 100%;
      animation: pulse-line 4s linear infinite;
    }
    .data-table {
      border: none;
      margin-bottom: 0;
    }
    .data-table thead th {
      background: #f8fafd;
      color: #002366;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-top: none;
      padding: 15px;
    }
    .data-table tbody td {
      padding: 15px;
      vertical-align: middle;
      font-family: 'monospace';
      font-size: 0.9rem;
      border-color: #f0f4f8;
    }
    .status-badge {
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .id-check-row {
      border-left: 4px solid #002366;
      padding-left: 15px;
      margin-bottom: 10px;
    }
    .refresh-button {
      background: white;
      color: #002366;
      border: none;
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .refresh-button:hover {
      background: #e9f0ff;
    }
    .refresh-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `

  const totalFounderBalance = useMemo(() => {
    return founderWallets.reduce((sum, wallet) => {
      return sum + parseFloat(walletBalances[wallet] || '0')
    }, 0)
  }, [founderWallets, walletBalances])

  const totalRatio = useMemo(() => {
    return founderRatios.reduce((sum, ratio) => sum + parseInt(ratio || '0', 10), 0)
  }, [founderRatios])

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  const fetchFounderData = async () => {
    if (!contracts || !account) return

    try {
      const [wallets, ratios] = await contracts.levelManager.getFounderWallets()
      setFounderWallets(wallets)
      setFounderRatios(ratios.map(r => r.toString()))

      const id1 = await contracts.levelManager.id1Wallet()
      setId1Wallet(id1)

      const isDownline = await contracts.levelManager.isID1Downline(account)
      setIsID1Downline(isDownline)

      const balances = {}
      for (const wallet of wallets) {
        try {
          const balance = await contracts.usdt.balanceOf(wallet)
          balances[wallet] = ethers.formatUnits(balance, 6)
        } catch {
          balances[wallet] = '0'
        }
      }
      setWalletBalances(balances)
    } catch (err) {
      console.error('Error fetching founder data:', err)
    }
  }

  const refreshData = async () => {
    if (!contracts || !account) return
    setIsRefreshing(true)
    try {
      await fetchFounderData()
      setLastUpdated(new Date().toLocaleTimeString())
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!contracts || !account) return

    fetchFounderData()

    const interval = setInterval(() => {
      fetchFounderData()
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)

    return () => clearInterval(interval)
  }, [contracts, account])

  if (!isConnected) {
    return (
      <Container className="mt-5 pt-5">
        <style>{founderStyles}</style>
        <Alert variant="primary" className="text-center p-5 lab-terminal" style={{ backgroundColor: '#002366', color: 'white', border: 'none' }}>
          <h4 className="fw-bold">{t('founder.handshakeRequired')}</h4>
          <p className="m-0 opacity-75">{t('founder.connectPrompt')}</p>
        </Alert>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container className="mt-5 text-center">
        <style>{founderStyles}</style>
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 fw-bold text-muted">{t('founder.loading')}</p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="mt-5">
        <style>{founderStyles}</style>
        <Alert variant="danger" className="lab-terminal border-0 shadow-sm">
          <strong>{t('founder.panelError')}</strong> {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="mt-5 pt-4">
      <style>{founderStyles}</style>

      <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
        <div className="d-flex align-items-center">
          <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
          <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
            {t('founder.title')}
          </h1>
        </div>

        <div className="d-flex align-items-center gap-3">
          <span className="text-muted small">{t('founder.lastSync')} {lastUpdated}</span>
          <Button
            variant="link"
            className="refresh-button text-decoration-none"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? `⟳ ${t('founder.syncing')}` : `⟳ ${t('founder.refresh')}`}
          </Button>
        </div>
      </div>

      <Row className="mb-4">
        <Col>
          <div className="lab-terminal">
            <div className="terminal-header">{t('founder.identificationStats')}</div>
            <div className="p-4 pulse-overlay">
              <Row>
                <Col md={6}>
                  <div className="id-check-row">
                    <div className="small text-muted text-uppercase fw-bold">{t('founder.masterId1')}</div>
                    <div className="fw-bold" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {id1Wallet || 'NULL_ADDRESS'}
                    </div>
                  </div>

                  <div className="id-check-row">
                    <div className="small text-muted text-uppercase fw-bold">{t('founder.activeUplink')}</div>
                    <div className="fw-bold" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {account}
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="id-check-row">
                    <div className="small text-muted text-uppercase fw-bold">{t('founder.walletCount')}</div>
                    <div className="fw-bold" style={{ fontFamily: 'monospace' }}>
                      {founderWallets.length}
                    </div>
                  </div>

                  <div className="id-check-row">
                    <div className="small text-muted text-uppercase fw-bold">{t('founder.totalRatio')}</div>
                    <div className="fw-bold" style={{ fontFamily: 'monospace' }}>
                      {(totalRatio / 100).toFixed(2)}%
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-md-end mt-3 mt-md-0">
                    <div className={`status-badge ${isID1Downline ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                      {isID1Downline ? t('founder.id1DownlineSynced') : t('founder.nonId1Node')}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <div className="lab-terminal">
            <div className="terminal-header">{t('founder.summary')}</div>
            <div className="p-4 pulse-overlay">
              <Row>
                <Col md={6} className="mb-3 mb-md-0">
                  <div className="small text-muted text-uppercase fw-bold">{t('founder.totalTrackedBalances')}</div>
                  <div className="fw-bold" style={{ fontFamily: 'monospace', fontSize: '1.4rem', color: '#002366' }}>
                    {totalFounderBalance.toFixed(2)} USDT
                  </div>
                </Col>

                <Col md={6}>
                  <div className="small text-muted text-uppercase fw-bold">{t('founder.distributionRule')}</div>
                  <div className="fw-bold" style={{ color: '#002366' }}>
                    {t('founder.distributionRuleText')}
                  </div>
                  <div className="small text-muted mt-1">
                    {t('founder.distributionRuleNote')}
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <div className="lab-terminal">
            <div className="terminal-header">{t('founder.vaultDistribution')}</div>
            <div className="pulse-overlay">
              <Table responsive className="data-table">
                <thead>
                  <tr>
                    <th>{t('founder.ledgerAddress')}</th>
                    <th>{t('founder.shardingRatio')}</th>
                    <th>{t('founder.liquidityYield')}</th>
                  </tr>
                </thead>
                <tbody>
                  {founderWallets.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-muted">
                        {t('founder.notConfigured')}
                      </td>
                    </tr>
                  ) : (
                    founderWallets.map((wallet, index) => (
                      <tr key={index}>
                        <td className="fw-bold">
                          <a
                            href={`https://amoy.polygonscan.com/address/${wallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-decoration-none"
                          >
                            {wallet.slice(0, 12)}...{wallet.slice(-8)}
                          </a>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="fw-bold text-success">
                          {walletBalances[wallet] || '0'} <small>USDT</small>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>

              <div className="p-3 border-top bg-light">
                <p className="text-muted m-0 small fw-bold">
                  <span className="text-primary">{t('founder.protocolNoteLabel')}</span> {t('founder.protocolNote')}
                </p>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  )
}
