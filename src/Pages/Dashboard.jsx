import React, { useEffect, useState, useCallback } from 'react'
import { Container, Row, Col, Spinner, Alert, Button, ProgressBar } from 'react-bootstrap'
import { useWallet } from '../hooks/useWallet'
import { useContracts } from '../hooks/useContracts'
import { CONTRACT_ADDRESSES, CONTRACT_LABELS, AMOY_CHAIN_ID } from '../constants/addresses'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'

export const Dashboard = () => {
  const { isConnected, account } = useWallet()
  const { contracts, isLoading, error, loadContracts } = useContracts()
  const { t } = useTranslation()

  const [contractBalances, setContractBalances] = useState({})
  const [userLevels, setUserLevels] = useState({})
  const [networkWarning, setNetworkWarning] = useState('')

  const [nftPoolAddress, setNftPoolAddress] = useState('')
  const [nftPoolBalance, setNftPoolBalance] = useState('0')
  const [opsWalletAddress, setOpsWalletAddress] = useState('')
  const [opsWalletBalance, setOpsWalletBalance] = useState('0')
  const [totalFeesCollected, setTotalFeesCollected] = useState('0')
  const [totalParticipants, setTotalParticipants] = useState(0)

  const [feesSinceLastCheck, setFeesSinceLastCheck] = useState({
    nft: '0',
    ops: '0',
    total: '0'
  })

  const [initialNftBalance, setInitialNftBalance] = useState(null)
  const [initialOpsBalance, setInitialOpsBalance] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const dashboardStyles = `
    body {
      background-color: #f0f4f8;
      font-family: 'Inter', sans-serif;
    }

    @keyframes pulse-line {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }

    @keyframes radar-pulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(3); opacity: 0; }
    }

    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    .animate-fade { animation: fadeInUp 0.6s ease-out forwards; }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .pulse-bg {
      background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.05) 45%, rgba(0, 68, 204, 0.2) 50%, rgba(0, 35, 102, 0.05) 55%, transparent 100%);
      background-size: 200% 100%;
      animation: pulse-line 3s linear infinite;
    }

    .royal-card {
      min-width: 280px;
      margin: 0 15px;
      border: 1px solid rgba(0, 35, 102, 0.1);
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(0, 35, 102, 0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .level-active {
      background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
      color: white !important;
      border: none;
      box-shadow: 0 0 20px rgba(0, 68, 204, 0.4);
    }

    .level-active .pulse-bg {
      background-image: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0) 45%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 55%, transparent 100%);
    }

    .section-title {
      color: #002366;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: 1.1rem;
      border-left: 5px solid #002366;
      padding-left: 15px;
    }

    .radar-dot {
      width: 10px;
      height: 10px;
      background-color: #00ffcc;
      border-radius: 50%;
      position: relative;
      display: inline-block;
    }

    .radar-dot::before {
      content: "";
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: #00ffcc;
      border-radius: 50%;
      animation: radar-pulse 2s infinite;
    }

    .slider-container {
      overflow: hidden;
      padding: 30px 0;
      mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
    }

    .slider-track {
      display: flex;
      width: fit-content;
      animation: scroll 40s linear infinite;
    }

    .tooltip-icon {
      cursor: help;
      display: inline-block;
      width: 18px;
      height: 18px;
      background: #002366;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 18px;
      font-size: 12px;
      margin-left: 8px;
    }

    [data-tooltip] {
      position: relative;
      cursor: help;
    }

    [data-tooltip]:before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #002366;
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      white-space: nowrap;
      display: none;
      z-index: 1000;
    }

    [data-tooltip]:hover:before {
      display: block;
    }

    .refresh-button {
      background: #002366;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 5px 15px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .refresh-button:hover {
      background: #0044cc;
    }

    .refresh-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .fee-card {
      border-left: 4px solid;
      transition: all 0.3s ease;
    }

    .fee-card.nft {
      border-left-color: #002366;
    }

    .fee-card.ops {
      border-left-color: #28a745;
    }

    .accumulation-badge {
      background: #e9ecef;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
    }
  `

  const fetchFeeRecipients = useCallback(async () => {
    if (!contracts) return

    try {
      const nftPool = await contracts.levelManager.nftPool()
      const opsWallet = await contracts.levelManager.operationsWallet()

      setNftPoolAddress(nftPool)
      setOpsWalletAddress(opsWallet)

      if (nftPool === ethers.ZeroAddress || opsWallet === ethers.ZeroAddress) {
        return
      }

      const [nftBalanceRaw, opsBalanceRaw] = await Promise.all([
        contracts.usdt.balanceOf(nftPool),
        contracts.usdt.balanceOf(opsWallet)
      ])

      const nftFormatted = ethers.formatUnits(nftBalanceRaw, 6)
      const opsFormatted = ethers.formatUnits(opsBalanceRaw, 6)

      setNftPoolBalance(nftFormatted)
      setOpsWalletBalance(opsFormatted)
      setTotalFeesCollected((parseFloat(nftFormatted) + parseFloat(opsFormatted)).toFixed(2))

      if (initialNftBalance === null || initialOpsBalance === null) {
        setInitialNftBalance(parseFloat(nftFormatted))
        setInitialOpsBalance(parseFloat(opsFormatted))
        setFeesSinceLastCheck({ nft: '0', ops: '0', total: '0' })
      } else {
        const nftIncrease = (parseFloat(nftFormatted) - initialNftBalance).toFixed(2)
        const opsIncrease = (parseFloat(opsFormatted) - initialOpsBalance).toFixed(2)

        setFeesSinceLastCheck({
          nft: nftIncrease,
          ops: opsIncrease,
          total: (parseFloat(nftIncrease) + parseFloat(opsIncrease)).toFixed(2)
        })
      }
    } catch (err) {
      console.error('Error fetching fee recipients:', err)
    }
  }, [contracts, initialNftBalance, initialOpsBalance])

  const fetchParticipantCount = useCallback(async () => {
    if (!contracts) return

    try {
      const participantCount = await contracts.registration.totalParticipants()
      setTotalParticipants(Number(participantCount))
    } catch (err) {
      console.error('Error fetching participant count:', err)
      setTotalParticipants(0)
    }
  }, [contracts])

  const fetchData = useCallback(async () => {
    if (!contracts || !account) return

    try {
      const balanceTargets = [
        ['ESCROW', CONTRACT_ADDRESSES.ESCROW],
        ['LEVEL_MANAGER', CONTRACT_ADDRESSES.LEVEL_MANAGER],
        ['P4_ORBIT', CONTRACT_ADDRESSES.P4_ORBIT],
        ['P12_ORBIT', CONTRACT_ADDRESSES.P12_ORBIT],
        ['P39_ORBIT', CONTRACT_ADDRESSES.P39_ORBIT]
      ]

      const balances = {}

      for (const [key, address] of balanceTargets) {
        try {
          const balance = await contracts.usdt.balanceOf(address)
          balances[key] = ethers.formatUnits(balance, 6)
        } catch (err) {
          console.error(`Error fetching balance for ${key}:`, err)
          balances[key] = '0'
        }
      }

      setContractBalances(balances)

      const levels = {}
      for (let i = 1; i <= 10; i++) {
        try {
          const activated = await contracts.registration.isLevelActivated(account, i)
          levels[`level${i}`] = activated
        } catch (err) {
          levels[`level${i}`] = false
        }
      }
      setUserLevels(levels)

      await Promise.all([
        fetchFeeRecipients(),
        fetchParticipantCount()
      ])
    } catch (err) {
      console.error('Cryptographic sync error:', err)
    }
  }, [contracts, account, fetchFeeRecipients, fetchParticipantCount])

  const refreshData = async () => {
    if (!contracts || !account) return
    setIsRefreshing(true)

    try {
      await fetchData()
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const resetAccumulationTracking = () => {
    setInitialNftBalance(parseFloat(nftPoolBalance))
    setInitialOpsBalance(parseFloat(opsWalletBalance))
    setFeesSinceLastCheck({
      nft: '0',
      ops: '0',
      total: '0'
    })
  }

  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) return
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      setNetworkWarning(chainId !== AMOY_CHAIN_ID ? t('dashboard.networkMismatch') : '')
    }

    checkNetwork()

    const handleChainChanged = () => window.location.reload()
    window.ethereum?.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [t])

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
    if (!contracts || !account) return

    fetchData()
    const interval = setInterval(() => {
      fetchData()
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)

    return () => clearInterval(interval)
  }, [contracts, account, fetchData])

  if (!isConnected) {
    return (
      <Container className="mt-5 pt-5 animate-fade text-center">
        <style>{dashboardStyles}</style>
        <div className="p-5 rounded-4 shadow-lg bg-white">
          <div className="radar-dot mb-3" style={{ backgroundColor: '#ff4d4d' }}></div>
          <h2 style={{ color: '#002366', fontWeight: '800' }}>{t('dashboard.handshakeRequired')}</h2>
          <p className="text-muted">{t('dashboard.awaitingConnection')}</p>
        </div>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container className="mt-5 text-center">
        <style>{dashboardStyles}</style>
        <Spinner animation="grow" variant="primary" />
        <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>{t('dashboard.loading')}</p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="mt-5">
        <style>{dashboardStyles}</style>
        <Alert variant="danger">{error}</Alert>
      </Container>
    )
  }

  const levelsRange = Array.from({ length: 10 }, (_, i) => i + 1)
  const scrollItems = [...levelsRange, ...levelsRange]

  return (
    <Container className="mt-5 pt-5 pb-5">
      <style>{dashboardStyles}</style>

      <div className="animate-fade">
        {networkWarning && (
          <Alert variant="warning" className="mb-4">
            {networkWarning}
          </Alert>
        )}

        <div className="mb-5 p-4 rounded-4 shadow-sm bg-white d-flex justify-content-between align-items-center">
          <div className='mt-4'>
            <h1 className="section-title m-0">{t('dashboard.protocolSecureTerminal')}</h1>
            <div className="d-flex align-items-center mt-2 ms-3">
              <div className="radar-dot me-2"></div>
              <span className="text-muted small fw-bold" style={{ fontFamily: 'monospace' }}>
                NODE_AUTH: {account.substring(0, 12)}...SECURE_LINK
              </span>
            </div>
          </div>
          <div className="text-end">
            <div className="small fw-bold text-uppercase text-muted">{t('dashboard.lastSync')} {lastUpdated}</div>
            <Button
              variant="link"
              className="refresh-button mt-1"
              onClick={refreshData}
              disabled={isRefreshing}
            >
              {isRefreshing ? `⟳ ${t('dashboard.syncing')}` : `⟳ ${t('dashboard.refreshData')}`}
            </Button>
          </div>
        </div>

        <h2 className="section-title mb-4">{t('dashboard.chainLevelMatrix')}</h2>
        <div className="slider-container mb-5">
          <div className="slider-track">
            {scrollItems.map((level, index) => {
              const isActive = userLevels[`level${level}`]
              return (
                <div key={index} className={`royal-card ${isActive ? 'level-active' : ''}`}>
                  <div className="pulse-bg p-4 text-center h-100 w-100">
                    <div className="small text-uppercase opacity-75 mb-1" style={{ letterSpacing: '2px', fontSize: '0.6rem' }}>
                      {t('dashboard.levelValidationLayer')}
                    </div>
                    <h3 className="fw-bold mb-3" style={{ fontSize: '1.6rem', fontFamily: 'monospace' }}>
                      Level_{level.toString().padStart(2, '0')}
                    </h3>
                    <div
                      className={`py-1 px-3 rounded-pill d-inline-block ${isActive ? 'bg-white text-primary' : 'bg-light text-muted'}`}
                      style={{ fontSize: '0.6rem', fontWeight: '900' }}
                    >
                      {isActive ? t('dashboard.levelActivated') : t('dashboard.levelNotActive')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <h2 className="section-title mb-4">{t('dashboard.feeDistribution')}</h2>
        <Row className="mb-5">
          <Col lg={6} md={6} className="mb-4">
            <div className="royal-card h-100 fee-card nft">
              <div className="pulse-bg p-4 h-100 w-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-uppercase fw-bold text-muted" style={{ letterSpacing: '1px' }}>
                    {t('dashboard.nftPool')}
                  </span>
                  <span className="badge bg-primary">{t('dashboard.ofFees80')}</span>
                </div>

                <h2 className="fw-bold mb-2" style={{ color: '#002366', fontFamily: 'monospace', fontSize: '2.2rem' }}>
                  {parseFloat(nftPoolBalance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <small className="text-muted" style={{ fontSize: '0.8rem' }}> {t('dashboard.usdt')}</small>
                </h2>

                <div className="mb-3 p-2 bg-light rounded-3">
                  <div className="d-flex justify-content-between small">
                    <span>{t('dashboard.accumulatedSinceReset')}</span>
                    <span className="fw-bold text-success">+{feesSinceLastCheck.nft} {t('dashboard.usdt')}</span>
                  </div>
                  <ProgressBar
                    now={parseFloat(feesSinceLastCheck.nft) > 0 ? 100 : 0}
                    variant="info"
                    className="mt-1"
                    style={{ height: '4px' }}
                  />
                </div>

                <div className="small text-muted mt-2" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                  <span className="fw-bold">{t('dashboard.address')}</span> {nftPoolAddress}
                </div>
                <div className="small text-muted mt-1">
                  <span className="fw-bold">{t('dashboard.purpose')}</span> {t('dashboard.nftPurpose')}
                </div>
              </div>
            </div>
          </Col>

          <Col lg={6} md={6} className="mb-4">
            <div className="royal-card h-100 fee-card ops">
              <div className="pulse-bg p-4 h-100 w-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-uppercase fw-bold text-muted" style={{ letterSpacing: '1px' }}>
                    {t('dashboard.operationsWallet')}
                  </span>
                  <span className="badge bg-success">{t('dashboard.ofFees20')}</span>
                </div>

                <h2 className="fw-bold mb-2" style={{ color: '#28a745', fontFamily: 'monospace', fontSize: '2.2rem' }}>
                  {parseFloat(opsWalletBalance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <small className="text-muted" style={{ fontSize: '0.8rem' }}> {t('dashboard.usdt')}</small>
                </h2>

                <div className="mb-3 p-2 bg-light rounded-3">
                  <div className="d-flex justify-content-between small">
                    <span>{t('dashboard.accumulatedSinceReset')}</span>
                    <span className="fw-bold text-success">+{feesSinceLastCheck.ops} {t('dashboard.usdt')}</span>
                  </div>
                  <ProgressBar
                    now={parseFloat(feesSinceLastCheck.ops) > 0 ? 100 : 0}
                    variant="success"
                    className="mt-1"
                    style={{ height: '4px' }}
                  />
                </div>

                <div className="small text-muted mt-2" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                  <span className="fw-bold">{t('dashboard.address')}</span> {opsWalletAddress}
                </div>
                <div className="small text-muted mt-1">
                  <span className="fw-bold">{t('dashboard.purpose')}</span> {t('dashboard.opsPurpose')}
                </div>
              </div>
            </div>
          </Col>
        </Row>

        <Row className="mb-5">
          <Col>
            <div className="royal-card p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1">{t('dashboard.totalFeesCollected')}</h5>
                  <h2 className="fw-bold" style={{ color: '#002366' }}>{totalFeesCollected} {t('dashboard.usdt')}</h2>
                  <div className="small text-muted">
                    {t('dashboard.feeSplit')}
                  </div>
                </div>
                <div className="text-end">
                  <div className="accumulation-badge mb-2">
                    ⚡ +{feesSinceLastCheck.total} {t('dashboard.sinceLastReset')}
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={resetAccumulationTracking}
                  >
                    {t('dashboard.resetTracking')}
                  </Button>
                </div>
              </div>
              <ProgressBar className="mt-3">
                <ProgressBar striped variant="primary" now={80} key={1} label="80% NFT" />
                <ProgressBar striped variant="success" now={20} key={2} label="20% Ops" />
              </ProgressBar>
            </div>
          </Col>
        </Row>

        <h2 className="section-title mb-4">{t('dashboard.treasurySummary')}</h2>
        <Row>
          {Object.entries(contractBalances).map(([name, balance]) => {
            let tooltip = CONTRACT_LABELS[name] || name

            if (name === 'P4_ORBIT') tooltip = 'P4 Orbit treasury for levels 1, 4, 7, 10'
            if (name === 'P12_ORBIT') tooltip = 'P12 Orbit treasury for levels 2, 5, 8'
            if (name === 'P39_ORBIT') tooltip = 'P39 Orbit treasury for levels 3, 6, 9'
            if (name === 'ESCROW') tooltip = 'AutoUpgradeEscrow - locked upgrade funds'
            if (name === 'LEVEL_MANAGER') tooltip = 'LevelManager - central routing treasury'

            return (
              <Col lg={4} md={6} key={name} className="mb-4">
                <div className="royal-card h-100">
                  <div className="pulse-bg p-4 h-100 w-100">
                    <div className="d-flex justify-content-between align-items-center border-bottom border-light pb-2 mb-3">
                      <span className="text-uppercase small fw-bold text-muted" style={{ letterSpacing: '1px' }}>
                        {name.replace(/_/g, ' ')}
                        {tooltip && <span className="tooltip-icon" data-tooltip={tooltip}>?</span>}
                      </span>
                      <span className="badge rounded-pill bg-primary" style={{ fontSize: '0.6rem' }}>{t('dashboard.realData')}</span>
                    </div>

                    <h2 className="fw-bold m-0" style={{ color: '#002366', fontFamily: 'monospace' }}>
                      {parseFloat(balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>
                    <div className="small fw-bold text-muted mt-1">{t('dashboard.usdt')}</div>

                    {name === 'LEVEL_MANAGER' && (
                      <div className="small text-info mt-2">
                        {t('dashboard.levelManagerHint')}
                      </div>
                    )}

                    {name === 'ESCROW' && (
                      <div className="small text-info mt-2">
                        {t('dashboard.escrowHint')}
                      </div>
                    )}
                  </div>
                </div>
              </Col>
            )
          })}

          <Col lg={4} md={6} className="mb-4">
            <div className="royal-card h-100">
              <div className="pulse-bg p-4 h-100 w-100">
                <div className="d-flex justify-content-between align-items-center border-bottom border-light pb-2 mb-3">
                  <span className="text-uppercase small fw-bold text-muted" style={{ letterSpacing: '1px' }}>
                    {t('dashboard.totalParticipants')}
                    <span className="tooltip-icon" data-tooltip={t('dashboard.totalParticipantsTooltip')}>?</span>
                  </span>
                  <span className="badge rounded-pill bg-primary" style={{ fontSize: '0.6rem' }}>{t('dashboard.realData')}</span>
                </div>

                <h2 className="fw-bold m-0" style={{ color: '#002366', fontFamily: 'monospace' }}>
                  {totalParticipants.toLocaleString()}
                </h2>
                <div className="small fw-bold text-muted mt-1">
                  {totalParticipants.toLocaleString() === '1' ? t('dashboard.participant') : t('dashboard.participants')}
                </div>

                <div className="small text-info mt-2">
                  {t('dashboard.includesFounder')}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Container>
  )
}