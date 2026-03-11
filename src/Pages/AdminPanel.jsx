import React, { useState, useEffect, useMemo } from 'react'
import { Container, Row, Col, Form, Button, Alert, Spinner, Table } from 'react-bootstrap'
import { useWallet } from '../hooks/useWallet'
import { useContracts } from '../hooks/useContracts'
import { web3Service } from '../Services/web3'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'

export const AdminPanel = () => {
  const { isConnected, account } = useWallet()
  const { contracts, isLoading, error, loadContracts } = useContracts()
  const { t } = useTranslation()

  const [founderWallets, setFounderWallets] = useState([])
  const [founderRatios, setFounderRatios] = useState([])

  const [walletInputs, setWalletInputs] = useState(Array(8).fill(''))
  const [ratioInputs, setRatioInputs] = useState(Array(8).fill('1250'))

  const [repAddress, setRepAddress] = useState('')
  const [nftPool, setNftPool] = useState('')
  const [opsWallet, setOpsWallet] = useState('')

  const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null })
  const [isOwner, setIsOwner] = useState(false)
  const [ownerCheckComplete, setOwnerCheckComplete] = useState(false)

  const totalRatio = useMemo(
    () => ratioInputs.reduce((sum, r) => sum + parseInt(r || 0, 10), 0),
    [ratioInputs]
  )

  const generateRandomEthAddresses = (count = 1) => {
    return Array.from({ length: count }, () => ethers.Wallet.createRandom().address)
  }

  const getWriteContracts = async () => {
    const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
    return writeContracts
  }

  const adminStyles = `
    .admin-card {
      background: white;
      border: 1px solid rgba(0, 35, 102, 0.1);
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0, 35, 102, 0.05);
      overflow: hidden;
      height: 100%;
    }
    .admin-header {
      background: #002366;
      color: white;
      font-family: 'monospace';
      font-size: 0.8rem;
      padding: 12px 20px;
      text-transform: uppercase;
      letter-spacing: 2px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .input-field {
      border: 1px solid #e0e6ed;
      border-radius: 8px;
      padding: 10px;
      font-family: 'monospace';
      font-size: 0.9rem;
      background: #fcfdfe;
    }
    .input-field:focus {
      border-color: #0044cc;
      box-shadow: 0 0 0 3px rgba(0, 68, 204, 0.1);
    }
    .command-btn {
      background: #002366;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.75rem;
      transition: all 0.3s ease;
    }
    .command-btn:hover:not(:disabled) {
      background: #0044cc;
      transform: translateY(-2px);
    }
    .command-btn:disabled {
      background: #cccccc;
    }
    .log-table {
      font-size: 0.85rem;
      border: none;
    }
    .log-table thead th {
      background: #f8fafd;
      text-transform: uppercase;
      font-size: 0.7rem;
      border: none;
      padding: 12px;
    }
    .pulse-bar {
      height: 4px;
      background: linear-gradient(90deg, #002366, #0044cc, #002366);
      background-size: 200% 100%;
      animation: pulse-line 3s linear infinite;
    }
    @keyframes pulse-line {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    .wallet-grid {
      display: grid;
      grid-template-columns: 1fr 100px;
      gap: 10px;
      margin-bottom: 10px;
    }
  `

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!contracts || !account) return

      try {
        const owner = await contracts.levelManager.owner()
        const ownerMatch = owner.toLowerCase() === account.toLowerCase()
        setIsOwner(ownerMatch)

        if (ownerMatch) {
          const [wallets, ratios] = await contracts.levelManager.getFounderWallets()
          setFounderWallets(wallets)
          setFounderRatios(ratios.map(r => r.toString()))

          const currentNftPool = await contracts.levelManager.nftPool()
          const currentOpsWallet = await contracts.levelManager.operationsWallet()

          setNftPool(currentNftPool)
          setOpsWallet(currentOpsWallet)
        }
      } catch (err) {
        console.error('Error fetching admin data:', err)
      } finally {
        setOwnerCheckComplete(true)
      }
    }

    fetchAdminData()
  }, [contracts, account])

  const handleSetFounderWallets = async () => {
    const validWallets = walletInputs.map(w => w.trim())
    const validRatios = ratioInputs.map(r => parseInt(r || 0, 10))

    if (validWallets.some(w => !ethers.isAddress(w))) {
      alert('All founder wallet addresses must be valid Ethereum addresses')
      return
    }

    if (validWallets.length !== 8) {
      alert('You must provide exactly 8 wallet addresses')
      return
    }

    const ratioSum = validRatios.reduce((sum, r) => sum + r, 0)
    if (ratioSum !== 10000) {
      alert(`Ratios must sum to 10000 (currently ${ratioSum})`)
      return
    }

    setTxStatus({ loading: true, hash: null, error: null })

    try {
      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.levelManager.setFounderWallets(validWallets, validRatios)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      const [wallets, ratios] = await contracts.levelManager.getFounderWallets()
      setFounderWallets(wallets)
      setFounderRatios(ratios.map(r => r.toString()))

      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      setTxStatus({ loading: false, hash: null, error: err?.reason || err?.message || 'Transaction failed' })
    }
  }

  const handleWalletInputChange = (index, value) => {
    const updated = [...walletInputs]
    updated[index] = value
    setWalletInputs(updated)
  }

  const handleRatioInputChange = (index, value) => {
    const updated = [...ratioInputs]
    updated[index] = value
    setRatioInputs(updated)
  }

  const fillFounderTestAddresses = () => {
    setWalletInputs(generateRandomEthAddresses(8))
    setRatioInputs(Array(8).fill('1250'))
  }

  const handleAddFounderRep = async () => {
    if (!ethers.isAddress(repAddress)) {
      alert('Please enter a valid representative address')
      return
    }

    setTxStatus({ loading: true, hash: null, error: null })

    try {
      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.levelManager.setFounderRepresentatives([repAddress])
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()
      setRepAddress('')
      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      setTxStatus({ loading: false, hash: null, error: err?.reason || err?.message || 'Transaction failed' })
    }
  }

  const fillRepTestAddress = () => {
    const [randomAddr] = generateRandomEthAddresses(1)
    setRepAddress(randomAddr)
  }

  const handleUpdateChargeRecipients = async () => {
    if (!ethers.isAddress(nftPool) || !ethers.isAddress(opsWallet)) {
      alert('NFT Pool and Operations wallet must be valid Ethereum addresses')
      return
    }

    setTxStatus({ loading: true, hash: null, error: null })

    try {
      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.levelManager.updateChargeRecipients(nftPool, opsWallet)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()
      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      setTxStatus({ loading: false, hash: null, error: err?.reason || err?.message || 'Transaction failed' })
    }
  }

  const fillChargeTestAddresses = () => {
    const [randomNft, randomOps] = generateRandomEthAddresses(2)
    setNftPool(randomNft)
    setOpsWallet(randomOps)
  }

  if (!isConnected) {
    return (
      <Container className="mt-5 pt-5">
        <style>{adminStyles}</style>
        <Alert variant="info" className="p-5 text-center admin-card border-0">
          <h4 className="fw-bold">{t('admin.connectTitle')}</h4>
          <p className="mb-0">{t('admin.connectText')}</p>
        </Alert>
      </Container>
    )
  }

  if (isLoading || !ownerCheckComplete) {
    return (
      <Container className="mt-5 text-center">
        <style>{adminStyles}</style>
        <Spinner animation="grow" variant="primary" />
        <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>{t('admin.authorizing')}</p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="mt-5">
        <style>{adminStyles}</style>
        <Alert variant="danger" className="p-4 admin-card border-0 shadow">
          <h5 className="fw-bold">{t('admin.loadErrorTitle')}</h5>
          <p className="mb-0">{error}</p>
        </Alert>
      </Container>
    )
  }

  if (!isOwner) {
    return (
      <Container className="mt-5">
        <style>{adminStyles}</style>
        <Alert variant="danger" className="p-4 admin-card border-0 shadow">
          <h5 className="fw-bold">{t('admin.accessDeniedTitle')}</h5>
          <p className="mb-0">{t('admin.accessDeniedText')}</p>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="mt-5 pt-4 pb-5">
      <style>{adminStyles}</style>

      <div className="d-flex align-items-center mt-5 mb-4">
        <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
        <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
          {t('admin.pageTitle')}
        </h1>
      </div>

      {txStatus.error && (
        <Alert variant="danger" className="mb-4 border-0 shadow-sm" dismissible>
          <strong className="text-uppercase" style={{ fontSize: '0.7rem' }}>{t('admin.executionError')}:</strong> {txStatus.error}
        </Alert>
      )}

      {txStatus.hash && (
        <Alert variant="primary" className="mb-4 border-0 shadow-sm bg-dark text-white">
          <div className="small text-uppercase opacity-50 mb-1" style={{ letterSpacing: '1px' }}>{t('admin.transactionBroadcast')}</div>
          <a
            href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info text-decoration-none fw-bold"
            style={{ fontFamily: 'monospace' }}
          >
            {txStatus.hash}
          </a>
        </Alert>
      )}

      <Row>
        <Col lg={6} className="mb-4">
          <div className="admin-card">
            <div className="admin-header">
              <span>{t('admin.founderRegistry')}</span>
              <span className="badge bg-primary px-2">{t('admin.total')}: {founderWallets.length}</span>
            </div>

            <div className="pulse-bar"></div>

            <div className="p-4">
              <Table responsive className="log-table mb-4">
                <thead>
                  <tr>
                    <th>{t('admin.nodeAddress')}</th>
                    <th>{t('admin.weight')}</th>
                  </tr>
                </thead>
                <tbody>
                  {founderWallets.map((wallet, index) => (
                    <tr key={index}>
                      <td className="fw-bold text-primary" style={{ fontFamily: 'monospace' }}>
                        {wallet.slice(0, 10)}...{wallet.slice(-8)}
                      </td>
                      <td>{(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <hr className="my-4" />

              <h6 className="text-uppercase fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
                {t('admin.setAllFounderWallets')}
              </h6>

              <Button
                variant="secondary"
                size="sm"
                onClick={fillFounderTestAddresses}
                className="mb-3"
                disabled={txStatus.loading}
              >
                {t('admin.fillTestAddresses')}
              </Button>

              {walletInputs.map((wallet, index) => (
                <div key={index} className="wallet-grid mb-2">
                  <Form.Control
                    className="input-field"
                    type="text"
                    placeholder={t('admin.founderAddress', { number: index + 1 })}
                    value={wallet}
                    onChange={(e) => handleWalletInputChange(index, e.target.value)}
                    disabled={txStatus.loading}
                  />
                  <Form.Control
                    className="input-field"
                    type="number"
                    placeholder={t('admin.ratio')}
                    value={ratioInputs[index]}
                    onChange={(e) => handleRatioInputChange(index, e.target.value)}
                    disabled={txStatus.loading}
                  />
                </div>
              ))}

              <div className="d-flex justify-content-between align-items-center mt-3">
                <span className="text-muted small">
                  {t('admin.totalRatio')}: {totalRatio} / 10000
                </span>
                <Button
                  className="command-btn"
                  onClick={handleSetFounderWallets}
                  disabled={txStatus.loading}
                >
                  {txStatus.loading ? t('admin.executing') : t('admin.setAll8Wallets')}
                </Button>
              </div>
            </div>
          </div>
        </Col>

        <Col lg={6}>
          <div className="admin-card mb-4">
            <div className="admin-header">{t('admin.representativeOverride')}</div>
            <div className="pulse-bar"></div>

            <div className="p-4">
              <Form.Group className="mb-4">
                <Form.Label className="small text-muted fw-bold">{t('admin.representativeAddress')}</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    className="input-field flex-grow-1"
                    type="text"
                    placeholder="0x..."
                    value={repAddress}
                    onChange={(e) => setRepAddress(e.target.value)}
                  />
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={fillRepTestAddress}
                    disabled={txStatus.loading}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {t('admin.fillTest')}
                  </Button>
                </div>
              </Form.Group>

              <Button
                className="command-btn w-100"
                onClick={handleAddFounderRep}
                disabled={txStatus.loading || !repAddress}
              >
                {txStatus.loading ? t('admin.executingSequence') : t('admin.updateRepresentative')}
              </Button>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-header">{t('admin.chargeRoutingProtocol')}</div>
            <div className="pulse-bar"></div>

            <div className="p-4">
              <Form.Group className="mb-3">
                <Form.Label className="small text-muted fw-bold">{t('admin.nftPoolUplink')}</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    className="input-field flex-grow-1"
                    type="text"
                    value={nftPool}
                    onChange={(e) => setNftPool(e.target.value)}
                  />
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={fillChargeTestAddresses}
                    disabled={txStatus.loading}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {t('admin.fillBoth')}
                  </Button>
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small text-muted fw-bold">{t('admin.operationsHubAddress')}</Form.Label>
                <Form.Control
                  className="input-field"
                  type="text"
                  value={opsWallet}
                  onChange={(e) => setOpsWallet(e.target.value)}
                />
              </Form.Group>

              <Button
                className="command-btn w-100"
                onClick={handleUpdateChargeRecipients}
                disabled={txStatus.loading}
              >
                {txStatus.loading ? t('admin.executingSequence') : t('admin.commitProtocolUpdates')}
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  )
}















// import React, { useState, useEffect, useMemo } from 'react'
// import { Container, Row, Col, Form, Button, Alert, Spinner, Table } from 'react-bootstrap'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'
// import { web3Service } from '../Services/web3'
// import { ethers } from 'ethers'

// export const AdminPanel = () => {
//   const { isConnected, account } = useWallet()
//   const { contracts, isLoading, error, loadContracts } = useContracts()

//   const [founderWallets, setFounderWallets] = useState([])
//   const [founderRatios, setFounderRatios] = useState([])

//   const [walletInputs, setWalletInputs] = useState(Array(8).fill(''))
//   const [ratioInputs, setRatioInputs] = useState(Array(8).fill('1250'))

//   const [repAddress, setRepAddress] = useState('')
//   const [nftPool, setNftPool] = useState('')
//   const [opsWallet, setOpsWallet] = useState('')

//   const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null })
//   const [isOwner, setIsOwner] = useState(false)
//   const [ownerCheckComplete, setOwnerCheckComplete] = useState(false)

//   const totalRatio = useMemo(
//     () => ratioInputs.reduce((sum, r) => sum + parseInt(r || 0, 10), 0),
//     [ratioInputs]
//   )

//   const generateRandomEthAddresses = (count = 1) => {
//     return Array.from({ length: count }, () => ethers.Wallet.createRandom().address)
//   }

//   const getWriteContracts = async () => {
//     const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
//     return writeContracts
//   }

//   const adminStyles = `
//     .admin-card {
//       background: white;
//       border: 1px solid rgba(0, 35, 102, 0.1);
//       border-radius: 15px;
//       box-shadow: 0 10px 30px rgba(0, 35, 102, 0.05);
//       overflow: hidden;
//       height: 100%;
//     }
//     .admin-header {
//       background: #002366;
//       color: white;
//       font-family: 'monospace';
//       font-size: 0.8rem;
//       padding: 12px 20px;
//       text-transform: uppercase;
//       letter-spacing: 2px;
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//     }
//     .input-field {
//       border: 1px solid #e0e6ed;
//       border-radius: 8px;
//       padding: 10px;
//       font-family: 'monospace';
//       font-size: 0.9rem;
//       background: #fcfdfe;
//     }
//     .input-field:focus {
//       border-color: #0044cc;
//       box-shadow: 0 0 0 3px rgba(0, 68, 204, 0.1);
//     }
//     .command-btn {
//       background: #002366;
//       border: none;
//       border-radius: 8px;
//       padding: 10px 20px;
//       font-weight: 700;
//       text-transform: uppercase;
//       letter-spacing: 1px;
//       font-size: 0.75rem;
//       transition: all 0.3s ease;
//     }
//     .command-btn:hover:not(:disabled) {
//       background: #0044cc;
//       transform: translateY(-2px);
//     }
//     .command-btn:disabled {
//       background: #cccccc;
//     }
//     .log-table {
//       font-size: 0.85rem;
//       border: none;
//     }
//     .log-table thead th {
//       background: #f8fafd;
//       text-transform: uppercase;
//       font-size: 0.7rem;
//       border: none;
//       padding: 12px;
//     }
//     .pulse-bar {
//       height: 4px;
//       background: linear-gradient(90deg, #002366, #0044cc, #002366);
//       background-size: 200% 100%;
//       animation: pulse-line 3s linear infinite;
//     }
//     @keyframes pulse-line {
//       0% { background-position: 0% 50%; }
//       100% { background-position: 200% 50%; }
//     }
//     .wallet-grid {
//       display: grid;
//       grid-template-columns: 1fr 100px;
//       gap: 10px;
//       margin-bottom: 10px;
//     }
//   `

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   useEffect(() => {
//     const fetchAdminData = async () => {
//       if (!contracts || !account) return

//       try {
//         const owner = await contracts.levelManager.owner()
//         const ownerMatch = owner.toLowerCase() === account.toLowerCase()

//         setIsOwner(ownerMatch)

//         if (ownerMatch) {
//           const [wallets, ratios] = await contracts.levelManager.getFounderWallets()
//           setFounderWallets(wallets)
//           setFounderRatios(ratios.map(r => r.toString()))

//           const currentNftPool = await contracts.levelManager.nftPool()
//           const currentOpsWallet = await contracts.levelManager.operationsWallet()

//           setNftPool(currentNftPool)
//           setOpsWallet(currentOpsWallet)
//         }
//       } catch (err) {
//         console.error('Error fetching admin data:', err)
//       } finally {
//         setOwnerCheckComplete(true)
//       }
//     }

//     fetchAdminData()
//   }, [contracts, account])

//   const handleSetFounderWallets = async () => {
//     const validWallets = walletInputs.map(w => w.trim())
//     const validRatios = ratioInputs.map(r => parseInt(r || 0, 10))

//     if (validWallets.some(w => !ethers.isAddress(w))) {
//       alert('All founder wallet addresses must be valid Ethereum addresses')
//       return
//     }

//     if (validWallets.length !== 8) {
//       alert('You must provide exactly 8 wallet addresses')
//       return
//     }

//     const ratioSum = validRatios.reduce((sum, r) => sum + r, 0)
//     if (ratioSum !== 10000) {
//       alert(`Ratios must sum to 10000 (currently ${ratioSum})`)
//       return
//     }

//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.levelManager.setFounderWallets(validWallets, validRatios)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const [wallets, ratios] = await contracts.levelManager.getFounderWallets()
//       setFounderWallets(wallets)
//       setFounderRatios(ratios.map(r => r.toString()))

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       setTxStatus({ loading: false, hash: null, error: err?.reason || err?.message || 'Transaction failed' })
//     }
//   }

//   const handleWalletInputChange = (index, value) => {
//     const updated = [...walletInputs]
//     updated[index] = value
//     setWalletInputs(updated)
//   }

//   const handleRatioInputChange = (index, value) => {
//     const updated = [...ratioInputs]
//     updated[index] = value
//     setRatioInputs(updated)
//   }

//   const fillFounderTestAddresses = () => {
//     setWalletInputs(generateRandomEthAddresses(8))
//     setRatioInputs(Array(8).fill('1250'))
//   }

//   const handleAddFounderRep = async () => {
//     if (!ethers.isAddress(repAddress)) {
//       alert('Please enter a valid representative address')
//       return
//     }

//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.levelManager.setFounderRepresentatives([repAddress])
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()
//       setRepAddress('')
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       setTxStatus({ loading: false, hash: null, error: err?.reason || err?.message || 'Transaction failed' })
//     }
//   }

//   const fillRepTestAddress = () => {
//     const [randomAddr] = generateRandomEthAddresses(1)
//     setRepAddress(randomAddr)
//   }

//   const handleUpdateChargeRecipients = async () => {
//     if (!ethers.isAddress(nftPool) || !ethers.isAddress(opsWallet)) {
//       alert('NFT Pool and Operations wallet must be valid Ethereum addresses')
//       return
//     }

//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.levelManager.updateChargeRecipients(nftPool, opsWallet)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       setTxStatus({ loading: false, hash: null, error: err?.reason || err?.message || 'Transaction failed' })
//     }
//   }

//   const fillChargeTestAddresses = () => {
//     const [randomNft, randomOps] = generateRandomEthAddresses(2)
//     setNftPool(randomNft)
//     setOpsWallet(randomOps)
//   }

//   if (!isConnected) {
//     return (
//       <Container className="mt-5 pt-5">
//         <style>{adminStyles}</style>
//         <Alert variant="info" className="p-5 text-center admin-card border-0">
//           <h4 className="fw-bold">TERMINAL CONNECTION REQUIRED</h4>
//           <p className="mb-0">Please connect an authorized wallet to initialize admin sequences.</p>
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoading || !ownerCheckComplete) {
//     return (
//       <Container className="mt-5 text-center">
//         <style>{adminStyles}</style>
//         <Spinner animation="grow" variant="primary" />
//         <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>AUTHORIZING_ADMIN...</p>
//       </Container>
//     )
//   }

//   if (error) {
//     return (
//       <Container className="mt-5">
//         <style>{adminStyles}</style>
//         <Alert variant="danger" className="p-4 admin-card border-0 shadow">
//           <h5 className="fw-bold">ADMIN_LOAD_ERROR</h5>
//           <p className="mb-0">{error}</p>
//         </Alert>
//       </Container>
//     )
//   }

//   if (!isOwner) {
//     return (
//       <Container className="mt-5">
//         <style>{adminStyles}</style>
//         <Alert variant="danger" className="p-4 admin-card border-0 shadow">
//           <h5 className="fw-bold">ACCESS_DENIED</h5>
//           <p className="mb-0">Unauthorized signature detected. This terminal is restricted to contract owners only.</p>
//         </Alert>
//       </Container>
//     )
//   }

//   return (
//     <Container className="mt-5 pt-4 pb-5">
//       <style>{adminStyles}</style>

//       <div className="d-flex align-items-center mt-5 mb-4">
//         <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
//         <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//           Admin Command
//         </h1>
//       </div>

//       {txStatus.error && (
//         <Alert variant="danger" className="mb-4 border-0 shadow-sm" dismissible>
//           <strong className="text-uppercase" style={{ fontSize: '0.7rem' }}>Execution_Error:</strong> {txStatus.error}
//         </Alert>
//       )}

//       {txStatus.hash && (
//         <Alert variant="primary" className="mb-4 border-0 shadow-sm bg-dark text-white">
//           <div className="small text-uppercase opacity-50 mb-1" style={{ letterSpacing: '1px' }}>Transaction_Broadcast</div>
//           <a
//             href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="text-info text-decoration-none fw-bold"
//             style={{ fontFamily: 'monospace' }}
//           >
//             {txStatus.hash}
//           </a>
//         </Alert>
//       )}

//       <Row>
//         <Col lg={6} className="mb-4">
//           <div className="admin-card">
//             <div className="admin-header">
//               <span>Founder_Registry</span>
//               <span className="badge bg-primary px-2">Total: {founderWallets.length}</span>
//             </div>
//             <div className="pulse-bar"></div>
//             <div className="p-4">
//               <Table responsive className="log-table mb-4">
//                 <thead>
//                   <tr>
//                     <th>Node_Address</th>
//                     <th>Weight</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {founderWallets.map((wallet, index) => (
//                     <tr key={index}>
//                       <td className="fw-bold text-primary" style={{ fontFamily: 'monospace' }}>
//                         {wallet.slice(0, 10)}...{wallet.slice(-8)}
//                       </td>
//                       <td>{(parseInt(founderRatios[index] || '0', 10) / 100).toFixed(2)}%</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </Table>

//               <hr className="my-4" />

//               <h6 className="text-uppercase fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
//                 Set All 8 Founder Wallets
//               </h6>

//               <Button
//                 variant="secondary"
//                 size="sm"
//                 onClick={fillFounderTestAddresses}
//                 className="mb-3"
//                 disabled={txStatus.loading}
//               >
//                 Fill Test Addresses
//               </Button>

//               {walletInputs.map((wallet, index) => (
//                 <div key={index} className="wallet-grid mb-2">
//                   <Form.Control
//                     className="input-field"
//                     type="text"
//                     placeholder={`Founder ${index + 1} Address`}
//                     value={wallet}
//                     onChange={(e) => handleWalletInputChange(index, e.target.value)}
//                     disabled={txStatus.loading}
//                   />
//                   <Form.Control
//                     className="input-field"
//                     type="number"
//                     placeholder="Ratio"
//                     value={ratioInputs[index]}
//                     onChange={(e) => handleRatioInputChange(index, e.target.value)}
//                     disabled={txStatus.loading}
//                   />
//                 </div>
//               ))}

//               <div className="d-flex justify-content-between align-items-center mt-3">
//                 <span className="text-muted small">
//                   Total Ratio: {totalRatio} / 10000
//                 </span>
//                 <Button
//                   className="command-btn"
//                   onClick={handleSetFounderWallets}
//                   disabled={txStatus.loading}
//                 >
//                   {txStatus.loading ? 'Executing...' : 'Set All 8 Wallets'}
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </Col>

//         <Col lg={6}>
//           <div className="admin-card mb-4">
//             <div className="admin-header">Representative_Override</div>
//             <div className="pulse-bar"></div>
//             <div className="p-4">
//               <Form.Group className="mb-4">
//                 <Form.Label className="small text-muted fw-bold">Representative Address</Form.Label>
//                 <div className="d-flex gap-2">
//                   <Form.Control
//                     className="input-field flex-grow-1"
//                     type="text"
//                     placeholder="0x..."
//                     value={repAddress}
//                     onChange={(e) => setRepAddress(e.target.value)}
//                   />
//                   <Button
//                     variant="outline-secondary"
//                     size="sm"
//                     onClick={fillRepTestAddress}
//                     disabled={txStatus.loading}
//                     style={{ whiteSpace: 'nowrap' }}
//                   >
//                     Fill Test
//                   </Button>
//                 </div>
//               </Form.Group>

//               <Button
//                 className="command-btn w-100"
//                 onClick={handleAddFounderRep}
//                 disabled={txStatus.loading || !repAddress}
//               >
//                 {txStatus.loading ? 'Executing_Sequence...' : 'Update Representative'}
//               </Button>
//             </div>
//           </div>

//           <div className="admin-card">
//             <div className="admin-header">Charge_Routing_Protocol</div>
//             <div className="pulse-bar"></div>
//             <div className="p-4">
//               <Form.Group className="mb-3">
//                 <Form.Label className="small text-muted fw-bold">NFT Pool Uplink</Form.Label>
//                 <div className="d-flex gap-2">
//                   <Form.Control
//                     className="input-field flex-grow-1"
//                     type="text"
//                     value={nftPool}
//                     onChange={(e) => setNftPool(e.target.value)}
//                   />
//                   <Button
//                     variant="outline-secondary"
//                     size="sm"
//                     onClick={fillChargeTestAddresses}
//                     disabled={txStatus.loading}
//                     style={{ whiteSpace: 'nowrap' }}
//                   >
//                     Fill Both
//                   </Button>
//                 </div>
//               </Form.Group>

//               <Form.Group className="mb-4">
//                 <Form.Label className="small text-muted fw-bold">Operations Hub Address</Form.Label>
//                 <Form.Control
//                   className="input-field"
//                   type="text"
//                   value={opsWallet}
//                   onChange={(e) => setOpsWallet(e.target.value)}
//                 />
//               </Form.Group>

//               <Button
//                 className="command-btn w-100"
//                 onClick={handleUpdateChargeRecipients}
//                 disabled={txStatus.loading}
//               >
//                 {txStatus.loading ? 'Executing_Sequence...' : 'Commit Protocol Updates'}
//               </Button>
//             </div>
//           </div>
//         </Col>
//       </Row>
//     </Container>
//   )
// }
