import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { useWallet } from '../hooks/useWallet'
import { useContracts } from '../hooks/useContracts'
import { web3Service } from '../Services/web3'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'

export const Registration = () => {
  const { isConnected, account } = useWallet()
  const { contracts, isLoading, error, loadContracts } = useContracts()
  const { t } = useTranslation()

  const [referrer, setReferrer] = useState('')
  const [level, setLevel] = useState(2)
  const [isRegistered, setIsRegistered] = useState(false)
  const [activeLevels, setActiveLevels] = useState({})
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [allowance, setAllowance] = useState('0')
  const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null })
  const [isDeployer, setIsDeployer] = useState(false)
  const [deployerUsdtBalance, setDeployerUsdtBalance] = useState('0')
  const [transferAmount, setTransferAmount] = useState('100')
  const [transferAddress, setTransferAddress] = useState('')
  const [showTransferToSelf, setShowTransferToSelf] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isId1Wallet, setIsId1Wallet] = useState(false)
  const [id1Address, setId1Address] = useState('')
  // New state for earnings tracking
  const [totalEarnings, setTotalEarnings] = useState('0')
  const [levelEarnings, setLevelEarnings] = useState({})

  const registrationStyles = `
    @keyframes pulse-line {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }

    @keyframes glow-red {
      0%, 100% { box-shadow: 0 0 5px rgba(220, 53, 69, 0.2); }
      50% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.5); }
    }

    .lab-terminal {
      background: #ffffff;
      border: 1px solid rgba(0, 35, 102, 0.1);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 35, 102, 0.05);
      overflow: hidden;
      position: relative;
    }

    .terminal-header {
      background: #002366;
      color: white;
      font-family: 'monospace';
      font-size: 0.9rem;
      letter-spacing: 1px;
      padding: 12px 20px;
      border-bottom: 2px solid #0044cc;
      line-height: 1.45;
      word-break: break-word;
    }

    .pulse-overlay {
      background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.03) 45%, rgba(0, 68, 204, 0.1) 50%, rgba(0, 35, 102, 0.03) 55%, transparent 100%);
      background-size: 200% 100%;
      animation: pulse-line 4s linear infinite;
    }

    .status-node {
      font-family: 'monospace';
      font-size: 0.75rem;
      border-radius: 12px;
      transition: all 0.3s ease;
      border: 1px solid #eee;
      min-width: 0;
    }

    .node-active {
      background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
      color: white !important;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 68, 204, 0.3);
    }

    .btn-protocol {
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 12px;
      border-radius: 12px;
      transition: all 0.3s ease;
      white-space: normal;
      word-break: break-word;
      line-height: 1.35;
    }

    .security-alert {
      animation: glow-red 2s infinite;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .deployer-badge {
      background: #002366;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: inline-block;
      margin-left: 10px;
      white-space: nowrap;
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
      margin-left: 15px;
      white-space: nowrap;
    }

    .refresh-button:hover {
      background: #0044cc;
      color: white;
    }

    .refresh-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      flex-shrink: 0;
    }

    [data-tooltip] {
      position: relative;
      cursor: help;
    }

    [data-tooltip]:before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 8px);
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
      max-width: min(260px, 80vw);
      white-space: normal;
      text-align: center;
      box-shadow: 0 10px 24px rgba(0,0,0,0.18);
    }

    [data-tooltip]:hover:before {
      display: block;
    }

    .form-control,
    .form-select {
      min-width: 0;
      word-break: break-word;
    }

    .alert,
    .small,
    .text-muted,
    .fw-bold,
    .fw-black,
    .form-text {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .row > [class*='col-'] {
      min-width: 0;
    }

    .lab-terminal .p-4,
    .lab-terminal .pulse-overlay.p-4 {
      min-width: 0;
    }

    .lab-terminal .fw-bold[style*='monospace'] {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .lab-terminal .d-flex.align-items-center.justify-content-between {
      gap: 1rem;
    }

    .lab-terminal .btn,
    .btn-protocol,
    .refresh-button {
      box-shadow: 0 8px 18px rgba(0, 35, 102, 0.08);
    }

    .lab-terminal .btn:hover:not(:disabled),
    .btn-protocol:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .lab-terminal .btn:disabled,
    .btn-protocol:disabled {
      transform: none;
    }

    .node-identity-panel {
      text-align: center;
    }

    .node-identity-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .node-identity-label {
      text-align: center;
      justify-content: center;
      margin-bottom: 0.35rem;
      width: 100%;
    }

    .node-identity-value {
      text-align: center;
      width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .tier-select-wrap {
      position: relative;
      overflow: hidden;
    }

    .tier-select-control {
      width: 100%;
      max-width: 100%;
      min-height: 58px;
      line-height: 1.4;
      white-space: normal;
      overflow: hidden;
      text-overflow: ellipsis;
      background-position: right 1rem center;
    }

    @media (max-width: 1199.98px) {
      .terminal-header {
        font-size: 0.84rem;
        padding: 11px 18px;
      }

      .btn-protocol {
        letter-spacing: 1.2px;
      }
    }

    @media (max-width: 991.98px) {
      .container.mt-5.pt-5.pb-5 {
        padding-left: 16px;
        padding-right: 16px;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 {
        flex-direction: column;
        align-items: stretch !important;
        gap: 14px;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center.mt-5 {
        margin-top: 1.75rem !important;
        align-items: flex-start !important;
        flex-wrap: wrap;
        row-gap: 10px;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center:last-child {
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        width: 100%;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 .text-muted.small.me-3 {
        margin-right: 0 !important;
      }

      .deployer-badge {
        margin-left: 0;
        margin-right: 8px;
      }

      .lab-terminal {
        border-radius: 18px;
      }

      .terminal-header {
        font-size: 0.8rem;
        padding: 11px 16px;
        letter-spacing: 0.8px;
      }

      .lab-terminal .p-4,
      .lab-terminal .pulse-overlay.p-4 {
        padding: 1.1rem !important;
      }
    }

    @media (max-width: 767.98px) {
      .container.mt-5.pt-5.pb-5 {
        padding-left: 14px;
        padding-right: 14px;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center.mt-5 {
        flex-direction: column;
        align-items: flex-start !important;
        width: 100%;
        gap: 10px;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 h1 {
        font-size: 1.35rem !important;
        line-height: 1.25;
        letter-spacing: 0.8px !important;
      }

      .refresh-button {
        margin-left: 0;
        width: 100%;
        max-width: 220px;
        text-align: center;
      }

      .terminal-header {
        font-size: 0.76rem;
        padding: 10px 14px;
        letter-spacing: 0.7px;
      }

      .status-node {
        font-size: 0.72rem;
      }

      .btn-protocol {
        font-size: 0.84rem;
        letter-spacing: 1px;
        padding: 11px;
      }

      .tooltip-icon {
        width: 17px;
        height: 17px;
        line-height: 17px;
        font-size: 11px;
        margin-left: 6px;
      }

      [data-tooltip]:before {
        font-size: 0.72rem;
        padding: 7px 10px;
      }

      .lab-terminal .p-4,
      .lab-terminal .pulse-overlay.p-4 {
        padding: 1rem !important;
      }

      .node-identity-panel .row {
        justify-content: center;
      }

      .node-identity-item {
        margin-bottom: 0.95rem;
      }

      .tier-select-control {
        min-height: 54px;
        font-size: 0.78rem !important;
        padding-right: 2.5rem !important;
      }
    }

    @media (max-width: 575.98px) {
      .container.mt-5.pt-5.pb-5 {
        padding-left: 12px;
        padding-right: 12px;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 h1 {
        font-size: 1.12rem !important;
        letter-spacing: 0.5px !important;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center:last-child {
        align-items: stretch !important;
        flex-direction: column;
      }

      .refresh-button {
        max-width: 100%;
      }

      .deployer-badge {
        font-size: 0.62rem;
        padding: 4px 10px;
      }

      .terminal-header {
        font-size: 0.72rem;
        padding: 10px 12px;
        letter-spacing: 0.5px;
      }

      .status-node {
        font-size: 0.68rem;
        border-radius: 10px;
      }

      .btn-protocol {
        font-size: 0.78rem;
        letter-spacing: 0.7px;
        padding: 10px;
        border-radius: 10px;
      }

      .lab-terminal {
        border-radius: 16px;
      }

      .lab-terminal .p-4,
      .lab-terminal .pulse-overlay.p-4 {
        padding: 0.95rem !important;
      }

      .alert.p-4 {
        padding: 1rem !important;
      }

      .lab-terminal .row .col-md-8,
      .lab-terminal .row .col-md-4,
      .lab-terminal .row .col-sm-6,
      .lab-terminal .row .col-sm-12 {
        margin-bottom: 0.75rem;
      }

      .node-identity-label {
        font-size: 0.68rem !important;
      }

      .node-identity-value {
        font-size: 0.82rem !important;
      }

      .tier-select-wrap {
        overflow-x: hidden;
      }

      .tier-select-control {
        min-height: 52px;
        font-size: 0.74rem !important;
        border-radius: 10px;
      }
    }

    @media (max-width: 480px) {
      .d-flex.align-items-center.justify-content-between.mb-4 h1 {
        font-size: 1rem !important;
      }

      .terminal-header {
        font-size: 0.68rem;
        padding: 9px 11px;
      }

      .status-node {
        font-size: 0.64rem;
      }

      .btn-protocol {
        font-size: 0.74rem;
        padding: 9px;
      }

      .deployer-badge {
        font-size: 0.58rem;
        letter-spacing: 0.6px;
      }

      .lab-terminal .p-4,
      .lab-terminal .pulse-overlay.p-4 {
        padding: 0.9rem !important;
      }

      .lab-terminal .fw-bold[style*='font-size: 0.95rem'] {
        font-size: 0.8rem !important;
      }

      .lab-terminal .fw-bold[style*='font-size: 1.2rem'] {
        font-size: 1rem !important;
      }

      .node-identity-value {
        font-size: 0.76rem !important;
      }

      .tier-select-control {
        font-size: 0.7rem !important;
        padding-top: 0.85rem !important;
        padding-bottom: 0.85rem !important;
      }
    }

    @media (max-width: 380px) {
      .container.mt-5.pt-5.pb-5 {
        padding-left: 10px;
        padding-right: 10px;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 h1 {
        font-size: 0.92rem !important;
        line-height: 1.2;
      }

      .terminal-header {
        font-size: 0.64rem;
        padding: 8px 10px;
        letter-spacing: 0.4px;
      }

      .btn-protocol {
        font-size: 0.7rem;
        letter-spacing: 0.5px;
      }

      .refresh-button {
        font-size: 0.72rem;
        padding: 6px 12px;
      }

      .deployer-badge {
        font-size: 0.54rem;
        padding: 3px 8px;
      }
    }

    @media (max-height: 540px) and (orientation: landscape) {
      .container.mt-5.pt-5.pb-5 {
        padding-bottom: 1.5rem !important;
      }

      .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center.mt-5 {
        margin-top: 1.25rem !important;
      }

      .lab-terminal .p-4,
      .lab-terminal .pulse-overlay.p-4 {
        padding: 0.85rem !important;
      }

      .terminal-header {
        padding: 8px 12px;
      }
    }
  `

  const levelPrices = {
    1: '10', 2: '20', 3: '40', 4: '80', 5: '160',
    6: '320', 7: '640', 8: '1280', 9: '2560', 10: '5120'
  }

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  const getWriteContracts = async () => {
    const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
    return writeContracts
  }

  // New function to fetch user earnings from orbit contracts
  const fetchUserEarnings = async () => {
    if (!contracts || !account || !isRegistered) return;

    try {
      let total = 0;
      const earningsByLevel = {};

      // Check earnings from each orbit contract for each level
      for (let i = 1; i <= 10; i++) {
        if (activeLevels[i]) {
          // You'll need to add these view functions to your orbit contracts
          // This is assuming the orbit contracts have a function to get earnings
          try {
            // Try to get earnings from P4 Orbit
            const p4Earnings = await contracts.p4Orbit?.getUserEarnings?.(account, i);
            if (p4Earnings) {
              const earningsNum = parseFloat(ethers.formatUnits(p4Earnings, 6));
              earningsByLevel[`level_${i}_p4`] = earningsNum;
              total += earningsNum;
            }
          } catch (e) { /* console.log('No P4 earnings for level', i); */ }

          try {
            // Try to get earnings from P12 Orbit
            const p12Earnings = await contracts.p12Orbit?.getUserEarnings?.(account, i);
            if (p12Earnings) {
              const earningsNum = parseFloat(ethers.formatUnits(p12Earnings, 6));
              earningsByLevel[`level_${i}_p12`] = earningsNum;
              total += earningsNum;
            }
          } catch (e) { /* console.log('No P12 earnings for level', i); */ }

          try {
            // Try to get earnings from P39 Orbit
            const p39Earnings = await contracts.p39Orbit?.getUserEarnings?.(account, i);
            if (p39Earnings) {
              const earningsNum = parseFloat(ethers.formatUnits(p39Earnings, 6));
              earningsByLevel[`level_${i}_p39`] = earningsNum;
              total += earningsNum;
            }
          } catch (e) { /* console.log('No P39 earnings for level', i); */ }
        }
      }

      setTotalEarnings(total.toFixed(2));
      setLevelEarnings(earningsByLevel);
    } catch (err) {
      console.error('Error fetching earnings:', err);
    }
  };

  const fetchUserData = async () => {
    if (!contracts || !account) return

    try {
      // Check if this is the ID1 wallet
      const id1WalletAddress = await contracts.registration.id1Wallet();
      const isId1 = id1WalletAddress.toLowerCase() === account.toLowerCase();
      setIsId1Wallet(isId1);
      setId1Address(id1WalletAddress);
      if (isId1) {
        // ID1 wallet is special - treat as registered with all levels active
        setIsRegistered(true);
        
        // ID1 has no referrer
        setReferrer('');
        
        // Mark all levels as active for ID1
        const levels = {};
        for (let i = 1; i <= 10; i++) {
          levels[i] = true;
        }
        setActiveLevels(levels);
      } else {
        // Normal user - check contract state
        const registered = await contracts.registration.isRegistered(account)
        setIsRegistered(registered)

        if (registered) {
          const ref = await contracts.registration.getReferrer(account)
          setReferrer(ref === ethers.ZeroAddress ? '' : ref)
        }

        const levels = {}
        for (let i = 1; i <= 10; i++) {
          try {
            const activated = await contracts.registration.isLevelActivated(account, i)
            levels[i] = activated
          } catch {
            levels[i] = false
          }
        }
        setActiveLevels(levels)
      }

      // These are the same for everyone
      const balance = await contracts.usdt.balanceOf(account)
      setUsdtBalance(ethers.formatUnits(balance, 6))

      const spender = contracts.levelManager.target
      const currentAllowance = await contracts.usdt.allowance(account, spender)
      setAllowance(ethers.formatUnits(currentAllowance, 6))

      // Fetch earnings if registered
      if (isRegistered) {
        await fetchUserEarnings();
      }
    } catch (err) {
      console.error('Data Extraction Failed:', err)
    }
  }

  useEffect(() => {
    const checkDeployerStatus = async () => {
      if (!contracts || !account) return

      try {
        const owner = await contracts.registration.owner()
        const ownerMatch = owner.toLowerCase() === account.toLowerCase()
        setIsDeployer(ownerMatch)

        if (ownerMatch && contracts.usdt) {
          const balance = await contracts.usdt.balanceOf(account)
          setDeployerUsdtBalance(ethers.formatUnits(balance, 6))
        }

        setTransferAddress(account)
      } catch (err) {
        console.error('Error checking deployer status:', err)
      }
    }

    checkDeployerStatus()
  }, [contracts, account])

  useEffect(() => {
    if (!contracts || !account) return

    fetchUserData()

    const interval = setInterval(() => {
      fetchUserData()
      setLastUpdated(new Date().toLocaleTimeString())
    }, 30000)

    return () => clearInterval(interval)
  }, [contracts, account])

  const refreshData = async () => {
    if (!contracts || !account) return
    setIsRefreshing(true)

    try {
      await fetchUserData()

      if (isDeployer) {
        const balance = await contracts.usdt.balanceOf(account)
        setDeployerUsdtBalance(ethers.formatUnits(balance, 6))
      }

      setLastUpdated(new Date().toLocaleTimeString())
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRegister = async () => {
    setTxStatus({ loading: true, hash: null, error: null })

    try {
      // Check USDT balance first (10 USDT required)
      const balance = await contracts.usdt.balanceOf(account);
      const requiredAmount = ethers.parseUnits("10", 6);
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient USDT balance. You need 10 USDT for registration. Current balance: ${ethers.formatUnits(balance, 6)} USDT`);
      }

      // Check allowance
      const spender = contracts.levelManager.target;
      const currentAllowance = await contracts.usdt.allowance(account, spender);
      if (currentAllowance < requiredAmount) {
        throw new Error("Please approve 10 USDT first before registering.");
      }

      const writeContracts = await getWriteContracts()
      
      // This now does: register + activate level 1 + transfer 10 USDT in one transaction
      const tx = await writeContracts.registration.register(referrer || ethers.ZeroAddress)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      setIsRegistered(true)
      setTxStatus({ loading: false, hash: tx.hash, error: null })
      await fetchUserData()
    } catch (err) {
      console.error('Registration error:', err)
      
      let errorMessage = err.message
      if (err.message?.includes('Already registered')) {
        errorMessage = 'You are already registered.'
      } else if (err.message?.includes('Self-referral')) {
        errorMessage = 'You cannot refer yourself.'
      } else if (err.message?.includes('Referrer not registered')) {
        errorMessage = 'The referrer address is not registered.'
      } else if (err.message?.includes('USDT transfer failed')) {
        errorMessage = 'USDT transfer failed. Check your balance and allowance.'
      }
      
      setTxStatus({ loading: false, hash: null, error: errorMessage })
    }
  }

  const handleApprove = async () => {
    const price = ethers.parseUnits(levelPrices[level], 6)
    setTxStatus({ loading: true, hash: null, error: null })

    try {
      const writeContracts = await getWriteContracts()
      const spender = contracts.levelManager.target
      const tx = await writeContracts.usdt.approve(spender, price)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      const newAllowance = await contracts.usdt.allowance(account, spender)
      setAllowance(ethers.formatUnits(newAllowance, 6))
      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      setTxStatus({ loading: false, hash: null, error: err.message })
    }
  }

  const handleTransferToSelf = async () => {
    setTxStatus({ loading: true, hash: null, error: null })

    try {
      if (!isDeployer) throw new Error('Only deployer can transfer USDT')

      const amount = ethers.parseUnits(transferAmount, 6)
      const balance = await contracts.usdt.balanceOf(account)

      if (balance < amount) {
        throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
      }

      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.usdt.transfer(account, amount)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      const newBalance = await contracts.usdt.balanceOf(account)
      setUsdtBalance(ethers.formatUnits(newBalance, 6))
      setDeployerUsdtBalance(ethers.formatUnits(newBalance, 6))

      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      console.error('Transfer error:', err)
      setTxStatus({ loading: false, hash: null, error: err.message })
    }
  }

  const handleTransferToAddress = async () => {
    setTxStatus({ loading: true, hash: null, error: null })

    try {
      if (!isDeployer) throw new Error('Only deployer can transfer USDT')
      if (!ethers.isAddress(transferAddress)) throw new Error('Invalid recipient address')

      const amount = ethers.parseUnits(transferAmount, 6)
      const balance = await contracts.usdt.balanceOf(account)

      if (balance < amount) {
        throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
      }

      const writeContracts = await getWriteContracts()
      const tx = await writeContracts.usdt.transfer(transferAddress, amount)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      const newDeployerBalance = await contracts.usdt.balanceOf(account)
      setDeployerUsdtBalance(ethers.formatUnits(newDeployerBalance, 6))

      if (transferAddress.toLowerCase() === account.toLowerCase()) {
        const newBalance = await contracts.usdt.balanceOf(account)
        setUsdtBalance(ethers.formatUnits(newBalance, 6))
      }

      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      console.error('Transfer error:', err)
      setTxStatus({ loading: false, hash: null, error: err.message })
    }
  }

  const handleActivateLevel = async () => {
    setTxStatus({ loading: true, hash: null, error: null })

    try {
      const balance = await contracts.usdt.balanceOf(account)
      const price = ethers.parseUnits(levelPrices[level], 6)
      const spender = contracts.levelManager.target

      if (balance < price) {
        throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT but need ${levelPrices[level]} USDT. Please request USDT from the deployer.`)
      }

      const currentAllowance = await contracts.usdt.allowance(account, spender)
      if (currentAllowance < price) {
        throw new Error('Insufficient allowance. Please approve USDT spending first.')
      }

      const writeContracts = await getWriteContracts()

      try {
        await writeContracts.registration.activateLevel.estimateGas(level)
      } catch (estimateErr) {
        let errorMessage = 'Transaction would fail. '

        if (estimateErr.error && estimateErr.error.data) {
          try {
            const iface = writeContracts.registration.interface
            const decodedError = iface.parseError(estimateErr.error.data)
            if (decodedError) {
              errorMessage += `Contract error: ${decodedError.name}`
              if (decodedError.args) {
                errorMessage += ` - ${decodedError.args.join(', ')}`
              }
            }
          } catch {
            if (estimateErr.reason) {
              errorMessage += estimateErr.reason
            } else {
              errorMessage += estimateErr.message
            }
          }
        } else if (estimateErr.reason) {
          errorMessage += estimateErr.reason
        } else {
          errorMessage += estimateErr.message
        }

        setTxStatus({ loading: false, hash: null, error: errorMessage })
        return
      }

      const tx = await writeContracts.registration.activateLevel(level)
      setTxStatus({ loading: true, hash: tx.hash, error: null })
      await tx.wait()

      const activated = await contracts.registration.isLevelActivated(account, level)
      setActiveLevels(prev => ({ ...prev, [level]: activated }))

      const newBalance = await contracts.usdt.balanceOf(account)
      setUsdtBalance(ethers.formatUnits(newBalance, 6))

      const newAllowance = await contracts.usdt.allowance(account, spender)
      setAllowance(ethers.formatUnits(newAllowance, 6))

      setTxStatus({ loading: false, hash: tx.hash, error: null })
    } catch (err) {
      console.error('Activation error:', err)

      try {
        const actualStatus = await contracts.registration.isLevelActivated(account, level)
        setActiveLevels(prev => ({ ...prev, [level]: actualStatus }))
      } catch {}

      let errorMessage = ''

      if (err.code === 'CALL_EXCEPTION') {
        errorMessage = 'Transaction failed. '
        if (err.error && err.error.data) {
          try {
            const iface = contracts.registration.interface
            const decodedError = iface.parseError(err.error.data)
            if (decodedError) {
              errorMessage += `Contract error: ${decodedError.name}`
              if (decodedError.args) {
                errorMessage += ` - ${decodedError.args.join(', ')}`
              }
            }
          } catch {
            errorMessage += err.reason || err.message
          }
        } else if (err.reason) {
          errorMessage += err.reason
        } else {
          errorMessage += err.message
        }
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'You do not have enough POL for gas.'
      } else if (err.message?.includes('transfer amount exceeds balance')) {
        errorMessage = 'You do not have enough USDT. Please request USDT from deployer.'
      } else if (err.message?.includes('Level already activated')) {
        errorMessage = 'This level is already activated.'
      } else if (err.message?.includes('Previous level not activated')) {
        errorMessage = `You need to activate Level ${level - 1} first.`
      } else {
        errorMessage = `Transaction failed: ${err.message || 'Unknown error'}`
      }

      setTxStatus({ loading: false, hash: null, error: errorMessage })
    }
  }

  const canActivate = () => {
    if (level === 1) return !activeLevels[1]
    return !activeLevels[level] && activeLevels[level - 1]
  }

  if (!isConnected) {
    return (
      <Container className="mt-5 pt-5 text-center">
        <style>{registrationStyles}</style>
        <Alert variant="primary" className="p-4" style={{ backgroundColor: '#002366', color: 'white', borderRadius: '15px' }}>
          <h4 className="fw-bold">{t('registration.connectTitle')}</h4>
          <p className="m-0">{t('registration.connectText')}</p>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="mt-5 pt-5 pb-5">
      <style>{registrationStyles}</style>

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center mt-5">
          <div style={{ height: '30px', width: '6px', background: '#002366', marginRight: '15px' }}></div>
          <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '1px', fontSize: '1.8rem' }}>
            {isRegistered ? t('registration.pageTitleRegistered') : t('registration.pageTitleUnregistered')}
          </h1>
          {isDeployer && <span className="deployer-badge">{t('registration.deployer')}</span>}
          {isId1Wallet && <span className="deployer-badge" style={{ background: '#28a745' }}>ID1 WALLET</span>}
        </div>

        <div className="d-flex align-items-center">
          <span className="text-muted small me-3">{t('registration.lastSync')}: {lastUpdated}</span>
          <Button
            variant="link"
            className="refresh-button"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? t('registration.refreshing') : t('registration.refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4 security-alert">
          {t('registration.coreError')}: {error}
        </Alert>
      )}

      {txStatus.error && (
        <Alert variant="danger" className="security-alert mb-4" dismissible onClose={() => setTxStatus({ ...txStatus, error: null })}>
          {t('registration.coreError')}: {txStatus.error}
        </Alert>
      )}

      {txStatus.hash && (
        <Alert variant="info" className="mb-4 status-node border-0 shadow-sm">
          <strong>{t('registration.broadcastingTx')}:</strong>{' '}
          <a
            href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            {txStatus.hash}
          </a>
        </Alert>
      )}

      <Row>
        <Col lg={7}>
          <div className="lab-terminal mb-4">
            <div className="terminal-header">{t('registration.nodeIdentityStatus')}</div>
            <div className="pulse-overlay p-4 node-identity-panel">
              <Row>
                <Col sm={12} className="mb-3 node-identity-item">
                  <div className="small text-muted fw-bold text-uppercase node-identity-label">MY ADDRESS</div>
                  <div className="fw-bold node-identity-value" style={{ color: '#002366', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    {account}
                  </div>
                </Col>

                <Col sm={12} className="mb-3 node-identity-item">
                  <div className="small text-muted fw-bold text-uppercase node-identity-label">MY UPLINE (REFERRER)</div>
                  <div className="fw-bold node-identity-value" style={{ color: '#002366', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    {!isRegistered ? 'You are not registerd yet, come back after registration' : (referrer || id1Address)}
                  </div>
                </Col>

                <Col sm={6} className="mb-3 node-identity-item">
                  <div className="small text-muted fw-bold text-uppercase node-identity-label">{t('registration.ledgerStatus')}</div>
                  <div className={`fw-bold node-identity-value ${isRegistered ? 'text-success' : 'text-danger'}`}>
                    {isRegistered ? t('registration.authorizedMember') : t('registration.unauthorizedNode')}
                  </div>
                </Col>

                <Col sm={6} className="node-identity-item">
                  <div className="small text-muted fw-bold text-uppercase d-flex align-items-center justify-content-center node-identity-label">
                    {t('registration.liquidAssets')}
                    <span className="tooltip-icon" data-tooltip={t('registration.liquidAssetsTooltip')}>?</span>
                  </div>
                  <div className="fw-bold node-identity-value" style={{ color: '#002366' }}>
                    {usdtBalance} <span className="small">USDT</span>
                  </div>
                </Col>

                <Col sm={6} className="node-identity-item">
                  <div className="small text-muted fw-bold text-uppercase d-flex align-items-center justify-content-center node-identity-label">
                    {t('registration.managerAllowance')}
                    <span className="tooltip-icon" data-tooltip={t('registration.managerAllowanceTooltip')}>?</span>
                  </div>
                  <div className="fw-bold node-identity-value" style={{ color: '#002366' }}>
                    {allowance} <span className="small">USDT</span>
                  </div>
                </Col>

                {/* Earnings Display */}
                {isRegistered && parseFloat(totalEarnings) > 0 && (
                  <Col sm={12} className="mt-3 node-identity-item">
                    <div className="small text-muted fw-bold text-uppercase node-identity-label">TOTAL EARNINGS</div>
                    <div className="fw-bold node-identity-value" style={{ color: '#28a745', fontSize: '1.2rem' }}>
                      {totalEarnings} <span className="small">USDT</span>
                    </div>
                  </Col>
                )}

                {isDeployer && (
                  <Col sm={12} className="mt-3 node-identity-item">
                    <div className="small text-muted fw-bold text-uppercase node-identity-label">{t('registration.deployerUsdtBalance')}</div>
                    <div className="fw-bold node-identity-value" style={{ color: '#002366' }}>
                      {deployerUsdtBalance} <span className="small">USDT</span>
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          </div>

          {isDeployer ? (
            <div className="lab-terminal mb-4">
              <div className="terminal-header">{t('registration.deployerUsdtFaucet')}</div>
              <div className="p-4">
                <div className="mb-3">
                  <Form.Check
                    type="switch"
                    id="transfer-mode-switch"
                    label={t('registration.transferToSpecificAddress')}
                    checked={!showTransferToSelf}
                    onChange={() => setShowTransferToSelf(!showTransferToSelf)}
                  />
                </div>

                {showTransferToSelf ? (
                  <>
                    <Row>
                      <Col md={8}>
                        <Form.Control
                          type="number"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          className="status-node mb-2"
                          placeholder={t('registration.amount')}
                        />
                      </Col>

                      <Col md={4}>
                        <Button
                          variant="success"
                          className="btn-protocol w-100"
                          onClick={handleTransferToSelf}
                          disabled={txStatus.loading}
                          style={{ background: '#28a745' }}
                        >
                          {txStatus.loading ? <Spinner size="sm" /> : t('registration.sendToSelf')}
                        </Button>
                      </Col>
                    </Row>

                    <div className="small text-muted mt-2">
                      {t('registration.transferToSelfHelp')}
                    </div>
                  </>
                ) : (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.recipientAddress')}</Form.Label>
                      <Form.Control
                        type="text"
                        value={transferAddress}
                        onChange={(e) => setTransferAddress(e.target.value)}
                        className="status-node"
                        placeholder="0x..."
                      />
                    </Form.Group>

                    <Row>
                      <Col md={8}>
                        <Form.Control
                          type="number"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          className="status-node mb-2"
                          placeholder={t('registration.amount')}
                        />
                      </Col>

                      <Col md={4}>
                        <Button
                          variant="success"
                          className="btn-protocol w-100"
                          onClick={handleTransferToAddress}
                          disabled={txStatus.loading}
                          style={{ background: '#28a745' }}
                        >
                          {txStatus.loading ? <Spinner size="sm" /> : t('registration.transfer')}
                        </Button>
                      </Col>
                    </Row>

                    <div className="small text-muted mt-2">
                      {t('registration.transferToAddressHelp')}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="lab-terminal mb-4">
              <div className="terminal-header">{t('registration.usdtAcquisition')}</div>
              <div className="p-4">
                <Alert variant="info" className="mb-0">
                  <strong>{t('registration.usdtRequiredTitle')}</strong>
                  <p className="mt-2 mb-0 small">
                    {t('registration.usdtRequiredText')}
                  </p>
                </Alert>
              </div>
            </div>
          )}

          {/* Only show registration box if not registered AND not ID1 wallet */}
          {!isRegistered && !isId1Wallet && (
            <div className="lab-terminal mb-4">
              <div className="terminal-header">{t('registration.initializeHandshake')}</div>
              <div className="p-4">
                <Alert variant="warning" className="mb-3">
                  <strong>Registration requires 10 USDT + Level 1 activation</strong>
                  <div className="mt-2 small">
                    <div>Your USDT Balance: <strong>{usdtBalance} USDT</strong></div>
                    <div>Current Allowance: <strong>{allowance} USDT</strong></div>
                  </div>
                </Alert>

                {parseFloat(allowance) < 10 && (
                  <Button
                    variant="warning"
                    className="btn-protocol w-100 mb-3"
                    onClick={async () => {
                      setTxStatus({ loading: true, hash: null, error: null });
                      try {
                        const writeContracts = await getWriteContracts();
                        const spender = contracts.levelManager.target;
                        const amount = ethers.parseUnits("10", 6);
                        const tx = await writeContracts.usdt.approve(spender, amount);
                        setTxStatus({ loading: true, hash: tx.hash, error: null });
                        await tx.wait();
                        
                        const newAllowance = await contracts.usdt.allowance(account, spender);
                        setAllowance(ethers.formatUnits(newAllowance, 6));
                        setTxStatus({ loading: false, hash: tx.hash, error: null });
                      } catch (err) {
                        setTxStatus({ loading: false, hash: null, error: err.message });
                      }
                    }}
                    disabled={txStatus.loading}
                  >
                    {txStatus.loading ? <Spinner size="sm" /> : 'Approve 10 USDT for Registration'}
                  </Button>
                )}

                <Form>
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.uplinkReferrer')}</Form.Label>
                    <Form.Control
                      className="status-node p-3"
                      type="text"
                      placeholder="0x000... (leave empty for no referrer)"
                      value={referrer}
                      onChange={(e) => setReferrer(e.target.value)}
                    />
                    <Form.Text className="text-muted">
                      Your referrer will be: {referrer || 'No referrer (ID1)'}
                    </Form.Text>
                  </Form.Group>

                  <Button
                    variant="primary"
                    className="btn-protocol w-100"
                    onClick={handleRegister}
                    disabled={txStatus.loading || parseFloat(usdtBalance) < 10 || parseFloat(allowance) < 10}
                    style={{ background: '#002366' }}
                  >
                    {txStatus.loading ? <Spinner size="sm" /> : 'Register & Activate Level 1 (10 USDT)'}
                  </Button>

                  {parseFloat(usdtBalance) < 10 && (
                    <div className="mt-3 p-2 bg-danger text-white text-center small rounded">
                      Insufficient USDT balance. Need 10 USDT.
                    </div>
                  )}
                </Form>
              </div>
            </div>
          )}

          <div className="lab-terminal mb-4">
            <div className="terminal-header">
              {isRegistered ? t('registration.levelsActivation') : t('registration.upgradeCipherLevel')}
            </div>

            <div className="p-4">
              {!isRegistered ? (
                <Alert variant="info" className="mb-0">
                  <strong>{t('registration.registrationRequiredTitle')}</strong>
                  <p className="mt-2 mb-0 small">
                    {t('registration.registrationRequiredText')}
                  </p>
                </Alert>
              ) : (
                <>
                  <Form.Group className="mb-4 tier-select-wrap">
                    <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.selectProtocolTier')}</Form.Label>
                    <Form.Select
                      className="status-node p-3 tier-select-control"
                      value={level}
                      onChange={(e) => setLevel(parseInt(e.target.value, 10))}
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => (
                        <option key={l} value={l} disabled={activeLevels[l]}>
                          TIER {l.toString().padStart(2, '0')} — {levelPrices[l]} USDT {activeLevels[l] ? t('registration.alreadyUnlocked') : ''}
                        </option>
                      ))}
                    </Form.Select>
                    {activeLevels[1] && (
                      <Form.Text className="text-success mt-2 d-block">
                        ✓ Level 1 is active (activated during registration)
                      </Form.Text>
                    )}
                  </Form.Group>

                  <div className="d-grid gap-3">
                    {parseFloat(allowance) < parseFloat(levelPrices[level]) && (
                      <Button
                        variant="warning"
                        onClick={handleApprove}
                        disabled={txStatus.loading}
                        className="btn-protocol py-3"
                      >
                        {t('registration.authorizeTreasuryTransfer')}
                      </Button>
                    )}

                    <Button
                      variant="success"
                      onClick={handleActivateLevel}
                      disabled={!canActivate() || txStatus.loading || parseFloat(allowance) < parseFloat(levelPrices[level])}
                      className="btn-protocol py-3"
                      style={{ background: '#0044cc', border: 'none' }}
                    >
                      {txStatus.loading ? <Spinner size="sm" /> : t('registration.activateCipher', { level })}
                    </Button>
                  </div>

                  {!canActivate() && level > 1 && !activeLevels[level - 1] && (
                    <div className="mt-3 p-3 bg-light border-start border-warning border-4 small fw-bold">
                      {t('registration.sequenceError', { level: level - 1, current: level })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Col>

        <Col lg={5}>
          <div className="lab-terminal">
            <div className="terminal-header">{t('registration.protocolSyncMap')}</div>
            <div className="pulse-overlay p-4">
              <Row className="g-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(levelNum => (
                  <Col xs={6} key={levelNum}>
                    <div className={`p-3 status-node text-center ${activeLevels[levelNum] ? 'node-active' : 'bg-white'}`}>
                      <div className="small opacity-75 fw-bold">TIER_{levelNum.toString().padStart(2, '0')}</div>
                      <div className="fw-black mt-1" style={{ fontSize: '0.65rem' }}>
                        {activeLevels[levelNum] ? t('registration.unlocked') : t('registration.encrypted')}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
    )
}



















// import React, { useState, useEffect } from 'react'
// import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'
// import { web3Service } from '../Services/web3'
// import { ethers } from 'ethers'
// import { useTranslation } from 'react-i18next'

// export const Registration = () => {
//   const { isConnected, account } = useWallet()
//   const { contracts, isLoading, error, loadContracts } = useContracts()
//   const { t } = useTranslation()

//   const [referrer, setReferrer] = useState('')
//   const [level, setLevel] = useState(2)
//   const [isRegistered, setIsRegistered] = useState(false)
//   const [activeLevels, setActiveLevels] = useState({})
//   const [usdtBalance, setUsdtBalance] = useState('0')
//   const [allowance, setAllowance] = useState('0')
//   const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null })
//   const [isDeployer, setIsDeployer] = useState(false)
//   const [deployerUsdtBalance, setDeployerUsdtBalance] = useState('0')
//   const [transferAmount, setTransferAmount] = useState('100')
//   const [transferAddress, setTransferAddress] = useState('')
//   const [showTransferToSelf, setShowTransferToSelf] = useState(true)
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [isRefreshing, setIsRefreshing] = useState(false)
//   const [isId1Wallet, setIsId1Wallet] = useState(false)
//   const [id1Address, setId1Address] = useState('')
//   // New state for earnings tracking
//   const [totalEarnings, setTotalEarnings] = useState('0')
//   const [levelEarnings, setLevelEarnings] = useState({})

 
//   const registrationStyles = `
//   @keyframes pulse-line {
//     0% { background-position: 0% 50%; }
//     100% { background-position: 200% 50%; }
//   }

//   @keyframes glow-red {
//     0%, 100% { box-shadow: 0 0 5px rgba(220, 53, 69, 0.2); }
//     50% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.5); }
//   }

//   .lab-terminal {
//     background: #ffffff;
//     border: 1px solid rgba(0, 35, 102, 0.1);
//     border-radius: 20px;
//     box-shadow: 0 10px 30px rgba(0, 35, 102, 0.05);
//     overflow: hidden;
//     position: relative;
//   }

//   .terminal-header {
//     background: #002366;
//     color: white;
//     font-family: 'monospace';
//     font-size: 0.9rem;
//     letter-spacing: 1px;
//     padding: 12px 20px;
//     border-bottom: 2px solid #0044cc;
//     line-height: 1.45;
//     word-break: break-word;
//   }

//   .pulse-overlay {
//     background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.03) 45%, rgba(0, 68, 204, 0.1) 50%, rgba(0, 35, 102, 0.03) 55%, transparent 100%);
//     background-size: 200% 100%;
//     animation: pulse-line 4s linear infinite;
//   }

//   .status-node {
//     font-family: 'monospace';
//     font-size: 0.75rem;
//     border-radius: 12px;
//     transition: all 0.3s ease;
//     border: 1px solid #eee;
//     min-width: 0;
//   }

//   .node-active {
//     background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//     color: white !important;
//     border: none;
//     box-shadow: 0 4px 12px rgba(0, 68, 204, 0.3);
//   }

//   .btn-protocol {
//     font-weight: 800;
//     text-transform: uppercase;
//     letter-spacing: 1.5px;
//     padding: 12px;
//     border-radius: 12px;
//     transition: all 0.3s ease;
//     white-space: normal;
//     word-break: break-word;
//     line-height: 1.35;
//   }

//   .security-alert {
//     animation: glow-red 2s infinite;
//     border: none;
//     border-radius: 12px;
//     font-weight: 700;
//     word-break: break-word;
//     overflow-wrap: anywhere;
//   }

//   .deployer-badge {
//     background: #002366;
//     color: white;
//     padding: 4px 12px;
//     border-radius: 20px;
//     font-size: 0.7rem;
//     font-weight: bold;
//     text-transform: uppercase;
//     letter-spacing: 1px;
//     display: inline-block;
//     margin-left: 10px;
//     white-space: nowrap;
//   }

//   .refresh-button {
//     background: #002366;
//     color: white;
//     border: none;
//     border-radius: 8px;
//     padding: 5px 15px;
//     font-size: 0.8rem;
//     cursor: pointer;
//     transition: all 0.3s ease;
//     margin-left: 15px;
//     white-space: nowrap;
//   }

//   .refresh-button:hover {
//     background: #0044cc;
//     color: white;
//   }

//   .refresh-button:disabled {
//     opacity: 0.5;
//     cursor: not-allowed;
//   }

//   .tooltip-icon {
//     cursor: help;
//     display: inline-block;
//     width: 18px;
//     height: 18px;
//     background: #002366;
//     color: white;
//     border-radius: 50%;
//     text-align: center;
//     line-height: 18px;
//     font-size: 12px;
//     margin-left: 8px;
//     flex-shrink: 0;
//   }

//   [data-tooltip] {
//     position: relative;
//     cursor: help;
//   }

//   [data-tooltip]:before {
//     content: attr(data-tooltip);
//     position: absolute;
//     bottom: calc(100% + 8px);
//     left: 50%;
//     transform: translateX(-50%);
//     background: #002366;
//     color: white;
//     padding: 8px 12px;
//     border-radius: 8px;
//     font-size: 0.8rem;
//     white-space: nowrap;
//     display: none;
//     z-index: 1000;
//     max-width: min(260px, 80vw);
//     white-space: normal;
//     text-align: center;
//     box-shadow: 0 10px 24px rgba(0,0,0,0.18);
//   }

//   [data-tooltip]:hover:before {
//     display: block;
//   }

//   .form-control,
//   .form-select {
//     min-width: 0;
//     word-break: break-word;
//   }

//   .alert,
//   .small,
//   .text-muted,
//   .fw-bold,
//   .fw-black,
//   .form-text {
//     overflow-wrap: anywhere;
//     word-break: break-word;
//   }

//   .row > [class*='col-'] {
//     min-width: 0;
//   }

//   .lab-terminal .p-4,
//   .lab-terminal .pulse-overlay.p-4 {
//     min-width: 0;
//   }

//   .lab-terminal .fw-bold[style*='monospace'] {
//     overflow-wrap: anywhere;
//     word-break: break-word;
//   }

//   .lab-terminal .d-flex.align-items-center.justify-content-between {
//     gap: 1rem;
//   }

//   .lab-terminal .btn,
//   .btn-protocol,
//   .refresh-button {
//     box-shadow: 0 8px 18px rgba(0, 35, 102, 0.08);
//   }

//   .lab-terminal .btn:hover:not(:disabled),
//   .btn-protocol:hover:not(:disabled) {
//     transform: translateY(-1px);
//   }

//   .lab-terminal .btn:disabled,
//   .btn-protocol:disabled {
//     transform: none;
//   }

//   @media (max-width: 1199.98px) {
//     .terminal-header {
//       font-size: 0.84rem;
//       padding: 11px 18px;
//     }

//     .btn-protocol {
//       letter-spacing: 1.2px;
//     }
//   }

//   @media (max-width: 991.98px) {
//     .container.mt-5.pt-5.pb-5 {
//       padding-left: 16px;
//       padding-right: 16px;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 {
//       flex-direction: column;
//       align-items: stretch !important;
//       gap: 14px;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center.mt-5 {
//       margin-top: 1.75rem !important;
//       align-items: flex-start !important;
//       flex-wrap: wrap;
//       row-gap: 10px;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center:last-child {
//       justify-content: space-between;
//       flex-wrap: wrap;
//       gap: 10px;
//       width: 100%;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 .text-muted.small.me-3 {
//       margin-right: 0 !important;
//     }

//     .deployer-badge {
//       margin-left: 0;
//       margin-right: 8px;
//     }

//     .lab-terminal {
//       border-radius: 18px;
//     }

//     .terminal-header {
//       font-size: 0.8rem;
//       padding: 11px 16px;
//       letter-spacing: 0.8px;
//     }

//     .lab-terminal .p-4,
//     .lab-terminal .pulse-overlay.p-4 {
//       padding: 1.1rem !important;
//     }
//   }

//   @media (max-width: 767.98px) {
//     .container.mt-5.pt-5.pb-5 {
//       padding-left: 14px;
//       padding-right: 14px;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center.mt-5 {
//       flex-direction: column;
//       align-items: flex-start !important;
//       width: 100%;
//       gap: 10px;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 h1 {
//       font-size: 1.35rem !important;
//       line-height: 1.25;
//       letter-spacing: 0.8px !important;
//     }

//     .refresh-button {
//       margin-left: 0;
//       width: 100%;
//       max-width: 220px;
//       text-align: center;
//     }

//     .terminal-header {
//       font-size: 0.76rem;
//       padding: 10px 14px;
//       letter-spacing: 0.7px;
//     }

//     .status-node {
//       font-size: 0.72rem;
//     }

//     .btn-protocol {
//       font-size: 0.84rem;
//       letter-spacing: 1px;
//       padding: 11px;
//     }

//     .tooltip-icon {
//       width: 17px;
//       height: 17px;
//       line-height: 17px;
//       font-size: 11px;
//       margin-left: 6px;
//     }

//     [data-tooltip]:before {
//       font-size: 0.72rem;
//       padding: 7px 10px;
//     }

//     .lab-terminal .p-4,
//     .lab-terminal .pulse-overlay.p-4 {
//       padding: 1rem !important;
//     }
//   }

//   @media (max-width: 575.98px) {
//     .container.mt-5.pt-5.pb-5 {
//       padding-left: 12px;
//       padding-right: 12px;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 h1 {
//       font-size: 1.12rem !important;
//       letter-spacing: 0.5px !important;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center:last-child {
//       align-items: stretch !important;
//       flex-direction: column;
//     }

//     .refresh-button {
//       max-width: 100%;
//     }

//     .deployer-badge {
//       font-size: 0.62rem;
//       padding: 4px 10px;
//     }

//     .terminal-header {
//       font-size: 0.72rem;
//       padding: 10px 12px;
//       letter-spacing: 0.5px;
//     }

//     .status-node {
//       font-size: 0.68rem;
//       border-radius: 10px;
//     }

//     .btn-protocol {
//       font-size: 0.78rem;
//       letter-spacing: 0.7px;
//       padding: 10px;
//       border-radius: 10px;
//     }

//     .lab-terminal {
//       border-radius: 16px;
//     }

//     .lab-terminal .p-4,
//     .lab-terminal .pulse-overlay.p-4 {
//       padding: 0.95rem !important;
//     }

//     .alert.p-4 {
//       padding: 1rem !important;
//     }

//     .lab-terminal .row .col-md-8,
//     .lab-terminal .row .col-md-4,
//     .lab-terminal .row .col-sm-6,
//     .lab-terminal .row .col-sm-12 {
//       margin-bottom: 0.75rem;
//     }
//   }

//   @media (max-width: 480px) {
//     .d-flex.align-items-center.justify-content-between.mb-4 h1 {
//       font-size: 1rem !important;
//     }

//     .terminal-header {
//       font-size: 0.68rem;
//       padding: 9px 11px;
//     }

//     .status-node {
//       font-size: 0.64rem;
//     }

//     .btn-protocol {
//       font-size: 0.74rem;
//       padding: 9px;
//     }

//     .deployer-badge {
//       font-size: 0.58rem;
//       letter-spacing: 0.6px;
//     }

//     .lab-terminal .p-4,
//     .lab-terminal .pulse-overlay.p-4 {
//       padding: 0.9rem !important;
//     }

//     .lab-terminal .fw-bold[style*='font-size: 0.95rem'] {
//       font-size: 0.8rem !important;
//     }

//     .lab-terminal .fw-bold[style*='font-size: 1.2rem'] {
//       font-size: 1rem !important;
//     }
//   }

//   @media (max-width: 380px) {
//     .container.mt-5.pt-5.pb-5 {
//       padding-left: 10px;
//       padding-right: 10px;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 h1 {
//       font-size: 0.92rem !important;
//       line-height: 1.2;
//     }

//     .terminal-header {
//       font-size: 0.64rem;
//       padding: 8px 10px;
//       letter-spacing: 0.4px;
//     }

//     .btn-protocol {
//       font-size: 0.7rem;
//       letter-spacing: 0.5px;
//     }

//     .refresh-button {
//       font-size: 0.72rem;
//       padding: 6px 12px;
//     }

//     .deployer-badge {
//       font-size: 0.54rem;
//       padding: 3px 8px;
//     }
//   }

//   @media (max-height: 540px) and (orientation: landscape) {
//     .container.mt-5.pt-5.pb-5 {
//       padding-bottom: 1.5rem !important;
//     }

//     .d-flex.align-items-center.justify-content-between.mb-4 > .d-flex.align-items-center.mt-5 {
//       margin-top: 1.25rem !important;
//     }

//     .lab-terminal .p-4,
//     .lab-terminal .pulse-overlay.p-4 {
//       padding: 0.85rem !important;
//     }

//     .terminal-header {
//       padding: 8px 12px;
//     }
//   }
// `

//   const levelPrices = {
//     1: '10', 2: '20', 3: '40', 4: '80', 5: '160',
//     6: '320', 7: '640', 8: '1280', 9: '2560', 10: '5120'
//   }

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const getWriteContracts = async () => {
//     const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
//     return writeContracts
//   }

//   // New function to fetch user earnings from orbit contracts
//   const fetchUserEarnings = async () => {
//     if (!contracts || !account || !isRegistered) return;

//     try {
//       let total = 0;
//       const earningsByLevel = {};

//       // Check earnings from each orbit contract for each level
//       for (let i = 1; i <= 10; i++) {
//         if (activeLevels[i]) {
//           // You'll need to add these view functions to your orbit contracts
//           // This is assuming the orbit contracts have a function to get earnings
//           try {
//             // Try to get earnings from P4 Orbit
//             const p4Earnings = await contracts.p4Orbit?.getUserEarnings?.(account, i);
//             if (p4Earnings) {
//               const earningsNum = parseFloat(ethers.formatUnits(p4Earnings, 6));
//               earningsByLevel[`level_${i}_p4`] = earningsNum;
//               total += earningsNum;
//             }
//           } catch (e) { /* console.log('No P4 earnings for level', i); */ }

//           try {
//             // Try to get earnings from P12 Orbit
//             const p12Earnings = await contracts.p12Orbit?.getUserEarnings?.(account, i);
//             if (p12Earnings) {
//               const earningsNum = parseFloat(ethers.formatUnits(p12Earnings, 6));
//               earningsByLevel[`level_${i}_p12`] = earningsNum;
//               total += earningsNum;
//             }
//           } catch (e) { /* console.log('No P12 earnings for level', i); */ }

//           try {
//             // Try to get earnings from P39 Orbit
//             const p39Earnings = await contracts.p39Orbit?.getUserEarnings?.(account, i);
//             if (p39Earnings) {
//               const earningsNum = parseFloat(ethers.formatUnits(p39Earnings, 6));
//               earningsByLevel[`level_${i}_p39`] = earningsNum;
//               total += earningsNum;
//             }
//           } catch (e) { /* console.log('No P39 earnings for level', i); */ }
//         }
//       }

//       setTotalEarnings(total.toFixed(2));
//       setLevelEarnings(earningsByLevel);
//     } catch (err) {
//       console.error('Error fetching earnings:', err);
//     }
//   };

//   const fetchUserData = async () => {
//     if (!contracts || !account) return

//     try {
//       // Check if this is the ID1 wallet
//       const id1WalletAddress = await contracts.registration.id1Wallet();
//       const isId1 = id1WalletAddress.toLowerCase() === account.toLowerCase();
//       setIsId1Wallet(isId1);
//       setId1Address(id1WalletAddress);
//       if (isId1) {
//         // ID1 wallet is special - treat as registered with all levels active
//         setIsRegistered(true);
        
//         // ID1 has no referrer
//         setReferrer('');
        
//         // Mark all levels as active for ID1
//         const levels = {};
//         for (let i = 1; i <= 10; i++) {
//           levels[i] = true;
//         }
//         setActiveLevels(levels);
//       } else {
//         // Normal user - check contract state
//         const registered = await contracts.registration.isRegistered(account)
//         setIsRegistered(registered)

//         if (registered) {
//           const ref = await contracts.registration.getReferrer(account)
//           setReferrer(ref === ethers.ZeroAddress ? '' : ref)
//         }

//         const levels = {}
//         for (let i = 1; i <= 10; i++) {
//           try {
//             const activated = await contracts.registration.isLevelActivated(account, i)
//             levels[i] = activated
//           } catch {
//             levels[i] = false
//           }
//         }
//         setActiveLevels(levels)
//       }

//       // These are the same for everyone
//       const balance = await contracts.usdt.balanceOf(account)
//       setUsdtBalance(ethers.formatUnits(balance, 6))

//       const spender = contracts.levelManager.target
//       const currentAllowance = await contracts.usdt.allowance(account, spender)
//       setAllowance(ethers.formatUnits(currentAllowance, 6))

//       // Fetch earnings if registered
//       if (isRegistered) {
//         await fetchUserEarnings();
//       }
//     } catch (err) {
//       console.error('Data Extraction Failed:', err)
//     }
//   }

//   useEffect(() => {
//     const checkDeployerStatus = async () => {
//       if (!contracts || !account) return

//       try {
//         const owner = await contracts.registration.owner()
//         const ownerMatch = owner.toLowerCase() === account.toLowerCase()
//         setIsDeployer(ownerMatch)

//         if (ownerMatch && contracts.usdt) {
//           const balance = await contracts.usdt.balanceOf(account)
//           setDeployerUsdtBalance(ethers.formatUnits(balance, 6))
//         }

//         setTransferAddress(account)
//       } catch (err) {
//         console.error('Error checking deployer status:', err)
//       }
//     }

//     checkDeployerStatus()
//   }, [contracts, account])

//   useEffect(() => {
//     if (!contracts || !account) return

//     fetchUserData()

//     const interval = setInterval(() => {
//       fetchUserData()
//       setLastUpdated(new Date().toLocaleTimeString())
//     }, 30000)

//     return () => clearInterval(interval)
//   }, [contracts, account])

//   const refreshData = async () => {
//     if (!contracts || !account) return
//     setIsRefreshing(true)

//     try {
//       await fetchUserData()

//       if (isDeployer) {
//         const balance = await contracts.usdt.balanceOf(account)
//         setDeployerUsdtBalance(ethers.formatUnits(balance, 6))
//       }

//       setLastUpdated(new Date().toLocaleTimeString())
//     } finally {
//       setIsRefreshing(false)
//     }
//   }

//   const handleRegister = async () => {
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       // Check USDT balance first (10 USDT required)
//       const balance = await contracts.usdt.balanceOf(account);
//       const requiredAmount = ethers.parseUnits("10", 6);
      
//       if (balance < requiredAmount) {
//         throw new Error(`Insufficient USDT balance. You need 10 USDT for registration. Current balance: ${ethers.formatUnits(balance, 6)} USDT`);
//       }

//       // Check allowance
//       const spender = contracts.levelManager.target;
//       const currentAllowance = await contracts.usdt.allowance(account, spender);
//       if (currentAllowance < requiredAmount) {
//         throw new Error("Please approve 10 USDT first before registering.");
//       }

//       const writeContracts = await getWriteContracts()
      
//       // This now does: register + activate level 1 + transfer 10 USDT in one transaction
//       const tx = await writeContracts.registration.register(referrer || ethers.ZeroAddress)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       setIsRegistered(true)
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//       await fetchUserData()
//     } catch (err) {
//       console.error('Registration error:', err)
      
//       let errorMessage = err.message
//       if (err.message?.includes('Already registered')) {
//         errorMessage = 'You are already registered.'
//       } else if (err.message?.includes('Self-referral')) {
//         errorMessage = 'You cannot refer yourself.'
//       } else if (err.message?.includes('Referrer not registered')) {
//         errorMessage = 'The referrer address is not registered.'
//       } else if (err.message?.includes('USDT transfer failed')) {
//         errorMessage = 'USDT transfer failed. Check your balance and allowance.'
//       }
      
//       setTxStatus({ loading: false, hash: null, error: errorMessage })
//     }
//   }

//   const handleApprove = async () => {
//     const price = ethers.parseUnits(levelPrices[level], 6)
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const writeContracts = await getWriteContracts()
//       const spender = contracts.levelManager.target
//       const tx = await writeContracts.usdt.approve(spender, price)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const newAllowance = await contracts.usdt.allowance(account, spender)
//       setAllowance(ethers.formatUnits(newAllowance, 6))
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   const handleTransferToSelf = async () => {
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       if (!isDeployer) throw new Error('Only deployer can transfer USDT')

//       const amount = ethers.parseUnits(transferAmount, 6)
//       const balance = await contracts.usdt.balanceOf(account)

//       if (balance < amount) {
//         throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
//       }

//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.usdt.transfer(account, amount)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const newBalance = await contracts.usdt.balanceOf(account)
//       setUsdtBalance(ethers.formatUnits(newBalance, 6))
//       setDeployerUsdtBalance(ethers.formatUnits(newBalance, 6))

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Transfer error:', err)
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   const handleTransferToAddress = async () => {
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       if (!isDeployer) throw new Error('Only deployer can transfer USDT')
//       if (!ethers.isAddress(transferAddress)) throw new Error('Invalid recipient address')

//       const amount = ethers.parseUnits(transferAmount, 6)
//       const balance = await contracts.usdt.balanceOf(account)

//       if (balance < amount) {
//         throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
//       }

//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.usdt.transfer(transferAddress, amount)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const newDeployerBalance = await contracts.usdt.balanceOf(account)
//       setDeployerUsdtBalance(ethers.formatUnits(newDeployerBalance, 6))

//       if (transferAddress.toLowerCase() === account.toLowerCase()) {
//         const newBalance = await contracts.usdt.balanceOf(account)
//         setUsdtBalance(ethers.formatUnits(newBalance, 6))
//       }

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Transfer error:', err)
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   const handleActivateLevel = async () => {
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const balance = await contracts.usdt.balanceOf(account)
//       const price = ethers.parseUnits(levelPrices[level], 6)
//       const spender = contracts.levelManager.target

//       if (balance < price) {
//         throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT but need ${levelPrices[level]} USDT. Please request USDT from the deployer.`)
//       }

//       const currentAllowance = await contracts.usdt.allowance(account, spender)
//       if (currentAllowance < price) {
//         throw new Error('Insufficient allowance. Please approve USDT spending first.')
//       }

//       const writeContracts = await getWriteContracts()

//       try {
//         await writeContracts.registration.activateLevel.estimateGas(level)
//       } catch (estimateErr) {
//         let errorMessage = 'Transaction would fail. '

//         if (estimateErr.error && estimateErr.error.data) {
//           try {
//             const iface = writeContracts.registration.interface
//             const decodedError = iface.parseError(estimateErr.error.data)
//             if (decodedError) {
//               errorMessage += `Contract error: ${decodedError.name}`
//               if (decodedError.args) {
//                 errorMessage += ` - ${decodedError.args.join(', ')}`
//               }
//             }
//           } catch {
//             if (estimateErr.reason) {
//               errorMessage += estimateErr.reason
//             } else {
//               errorMessage += estimateErr.message
//             }
//           }
//         } else if (estimateErr.reason) {
//           errorMessage += estimateErr.reason
//         } else {
//           errorMessage += estimateErr.message
//         }

//         setTxStatus({ loading: false, hash: null, error: errorMessage })
//         return
//       }

//       const tx = await writeContracts.registration.activateLevel(level)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const activated = await contracts.registration.isLevelActivated(account, level)
//       setActiveLevels(prev => ({ ...prev, [level]: activated }))

//       const newBalance = await contracts.usdt.balanceOf(account)
//       setUsdtBalance(ethers.formatUnits(newBalance, 6))

//       const newAllowance = await contracts.usdt.allowance(account, spender)
//       setAllowance(ethers.formatUnits(newAllowance, 6))

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Activation error:', err)

//       try {
//         const actualStatus = await contracts.registration.isLevelActivated(account, level)
//         setActiveLevels(prev => ({ ...prev, [level]: actualStatus }))
//       } catch {}

//       let errorMessage = ''

//       if (err.code === 'CALL_EXCEPTION') {
//         errorMessage = 'Transaction failed. '
//         if (err.error && err.error.data) {
//           try {
//             const iface = contracts.registration.interface
//             const decodedError = iface.parseError(err.error.data)
//             if (decodedError) {
//               errorMessage += `Contract error: ${decodedError.name}`
//               if (decodedError.args) {
//                 errorMessage += ` - ${decodedError.args.join(', ')}`
//               }
//             }
//           } catch {
//             errorMessage += err.reason || err.message
//           }
//         } else if (err.reason) {
//           errorMessage += err.reason
//         } else {
//           errorMessage += err.message
//         }
//       } else if (err.message?.includes('insufficient funds')) {
//         errorMessage = 'You do not have enough POL for gas.'
//       } else if (err.message?.includes('transfer amount exceeds balance')) {
//         errorMessage = 'You do not have enough USDT. Please request USDT from deployer.'
//       } else if (err.message?.includes('Level already activated')) {
//         errorMessage = 'This level is already activated.'
//       } else if (err.message?.includes('Previous level not activated')) {
//         errorMessage = `You need to activate Level ${level - 1} first.`
//       } else {
//         errorMessage = `Transaction failed: ${err.message || 'Unknown error'}`
//       }

//       setTxStatus({ loading: false, hash: null, error: errorMessage })
//     }
//   }

//   const canActivate = () => {
//     if (level === 1) return !activeLevels[1]
//     return !activeLevels[level] && activeLevels[level - 1]
//   }

//   if (!isConnected) {
//     return (
//       <Container className="mt-5 pt-5 text-center">
//         <style>{registrationStyles}</style>
//         <Alert variant="primary" className="p-4" style={{ backgroundColor: '#002366', color: 'white', borderRadius: '15px' }}>
//           <h4 className="fw-bold">{t('registration.connectTitle')}</h4>
//           <p className="m-0">{t('registration.connectText')}</p>
//         </Alert>
//       </Container>
//     )
//   }

//   return (
//     <Container className="mt-5 pt-5 pb-5">
//       <style>{registrationStyles}</style>

//       <div className="d-flex align-items-center justify-content-between mb-4">
//         <div className="d-flex align-items-center mt-5">
//           <div style={{ height: '30px', width: '6px', background: '#002366', marginRight: '15px' }}></div>
//           <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '1px', fontSize: '1.8rem' }}>
//             {isRegistered ? t('registration.pageTitleRegistered') : t('registration.pageTitleUnregistered')}
//           </h1>
//           {isDeployer && <span className="deployer-badge">{t('registration.deployer')}</span>}
//           {isId1Wallet && <span className="deployer-badge" style={{ background: '#28a745' }}>ID1 WALLET</span>}
//         </div>

//         <div className="d-flex align-items-center">
//           <span className="text-muted small me-3">{t('registration.lastSync')}: {lastUpdated}</span>
//           <Button
//             variant="link"
//             className="refresh-button"
//             onClick={refreshData}
//             disabled={isRefreshing}
//           >
//             {isRefreshing ? t('registration.refreshing') : t('registration.refresh')}
//           </Button>
//         </div>
//       </div>

//       {error && (
//         <Alert variant="danger" className="mb-4 security-alert">
//           {t('registration.coreError')}: {error}
//         </Alert>
//       )}

//       {txStatus.error && (
//         <Alert variant="danger" className="security-alert mb-4" dismissible onClose={() => setTxStatus({ ...txStatus, error: null })}>
//           {t('registration.coreError')}: {txStatus.error}
//         </Alert>
//       )}

//       {txStatus.hash && (
//         <Alert variant="info" className="mb-4 status-node border-0 shadow-sm">
//           <strong>{t('registration.broadcastingTx')}:</strong>{' '}
//           <a
//             href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="text-decoration-none"
//           >
//             {txStatus.hash}
//           </a>
//         </Alert>
//       )}

//       <Row>
//         <Col lg={7}>
//           <div className="lab-terminal mb-4">
//             <div className="terminal-header">{t('registration.nodeIdentityStatus')}</div>
//             <div className="pulse-overlay p-4">
//               <Row>
//                 <Col sm={12} className="mb-3">
//                   <div className="small text-muted fw-bold text-uppercase">MY ADDRESS</div>
//                   <div className="fw-bold" style={{ color: '#002366', fontSize: '0.95rem', fontFamily: 'monospace' }}>
//                     {account}
//                   </div>
//                 </Col>

//                 <Col sm={12} className="mb-3">
//                   <div className="small text-muted fw-bold text-uppercase">MY UPLINE (REFERRER)</div>
//                   <div className="fw-bold" style={{ color: '#002366', fontSize: '0.95rem', fontFamily: 'monospace' }}>
//                     {!isRegistered ? 'You are not registerd yet, come back after registration' : (referrer || id1Address)}
//                   </div>
//                 </Col>

//                 <Col sm={6} className="mb-3">
//                   <div className="small text-muted fw-bold text-uppercase">{t('registration.ledgerStatus')}</div>
//                   <div className={`fw-bold ${isRegistered ? 'text-success' : 'text-danger'}`}>
//                     {isRegistered ? t('registration.authorizedMember') : t('registration.unauthorizedNode')}
//                   </div>
//                 </Col>

//                 <Col sm={6}>
//                   <div className="small text-muted fw-bold text-uppercase d-flex align-items-center">
//                     {t('registration.liquidAssets')}
//                     <span className="tooltip-icon" data-tooltip={t('registration.liquidAssetsTooltip')}>?</span>
//                   </div>
//                   <div className="fw-bold" style={{ color: '#002366' }}>
//                     {usdtBalance} <span className="small">USDT</span>
//                   </div>
//                 </Col>

//                 <Col sm={6}>
//                   <div className="small text-muted fw-bold text-uppercase d-flex align-items-center">
//                     {t('registration.managerAllowance')}
//                     <span className="tooltip-icon" data-tooltip={t('registration.managerAllowanceTooltip')}>?</span>
//                   </div>
//                   <div className="fw-bold" style={{ color: '#002366' }}>
//                     {allowance} <span className="small">USDT</span>
//                   </div>
//                 </Col>

//                 {/* Earnings Display */}
//                 {isRegistered && parseFloat(totalEarnings) > 0 && (
//                   <Col sm={12} className="mt-3">
//                     <div className="small text-muted fw-bold text-uppercase">TOTAL EARNINGS</div>
//                     <div className="fw-bold" style={{ color: '#28a745', fontSize: '1.2rem' }}>
//                       {totalEarnings} <span className="small">USDT</span>
//                     </div>
//                   </Col>
//                 )}

//                 {isDeployer && (
//                   <Col sm={12} className="mt-3">
//                     <div className="small text-muted fw-bold text-uppercase">{t('registration.deployerUsdtBalance')}</div>
//                     <div className="fw-bold" style={{ color: '#002366' }}>
//                       {deployerUsdtBalance} <span className="small">USDT</span>
//                     </div>
//                   </Col>
//                 )}
//               </Row>
//             </div>
//           </div>

//           {isDeployer ? (
//             <div className="lab-terminal mb-4">
//               <div className="terminal-header">{t('registration.deployerUsdtFaucet')}</div>
//               <div className="p-4">
//                 <div className="mb-3">
//                   <Form.Check
//                     type="switch"
//                     id="transfer-mode-switch"
//                     label={t('registration.transferToSpecificAddress')}
//                     checked={!showTransferToSelf}
//                     onChange={() => setShowTransferToSelf(!showTransferToSelf)}
//                   />
//                 </div>

//                 {showTransferToSelf ? (
//                   <>
//                     <Row>
//                       <Col md={8}>
//                         <Form.Control
//                           type="number"
//                           value={transferAmount}
//                           onChange={(e) => setTransferAmount(e.target.value)}
//                           className="status-node mb-2"
//                           placeholder={t('registration.amount')}
//                         />
//                       </Col>

//                       <Col md={4}>
//                         <Button
//                           variant="success"
//                           className="btn-protocol w-100"
//                           onClick={handleTransferToSelf}
//                           disabled={txStatus.loading}
//                           style={{ background: '#28a745' }}
//                         >
//                           {txStatus.loading ? <Spinner size="sm" /> : t('registration.sendToSelf')}
//                         </Button>
//                       </Col>
//                     </Row>

//                     <div className="small text-muted mt-2">
//                       {t('registration.transferToSelfHelp')}
//                     </div>
//                   </>
//                 ) : (
//                   <>
//                     <Form.Group className="mb-3">
//                       <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.recipientAddress')}</Form.Label>
//                       <Form.Control
//                         type="text"
//                         value={transferAddress}
//                         onChange={(e) => setTransferAddress(e.target.value)}
//                         className="status-node"
//                         placeholder="0x..."
//                       />
//                     </Form.Group>

//                     <Row>
//                       <Col md={8}>
//                         <Form.Control
//                           type="number"
//                           value={transferAmount}
//                           onChange={(e) => setTransferAmount(e.target.value)}
//                           className="status-node mb-2"
//                           placeholder={t('registration.amount')}
//                         />
//                       </Col>

//                       <Col md={4}>
//                         <Button
//                           variant="success"
//                           className="btn-protocol w-100"
//                           onClick={handleTransferToAddress}
//                           disabled={txStatus.loading}
//                           style={{ background: '#28a745' }}
//                         >
//                           {txStatus.loading ? <Spinner size="sm" /> : t('registration.transfer')}
//                         </Button>
//                       </Col>
//                     </Row>

//                     <div className="small text-muted mt-2">
//                       {t('registration.transferToAddressHelp')}
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>
//           ) : (
//             <div className="lab-terminal mb-4">
//               <div className="terminal-header">{t('registration.usdtAcquisition')}</div>
//               <div className="p-4">
//                 <Alert variant="info" className="mb-0">
//                   <strong>{t('registration.usdtRequiredTitle')}</strong>
//                   <p className="mt-2 mb-0 small">
//                     {t('registration.usdtRequiredText')}
//                   </p>
//                 </Alert>
//               </div>
//             </div>
//           )}

//           {/* Only show registration box if not registered AND not ID1 wallet */}
//           {!isRegistered && !isId1Wallet && (
//             <div className="lab-terminal mb-4">
//               <div className="terminal-header">{t('registration.initializeHandshake')}</div>
//               <div className="p-4">
//                 <Alert variant="warning" className="mb-3">
//                   <strong>Registration requires 10 USDT + Level 1 activation</strong>
//                   <div className="mt-2 small">
//                     <div>Your USDT Balance: <strong>{usdtBalance} USDT</strong></div>
//                     <div>Current Allowance: <strong>{allowance} USDT</strong></div>
//                   </div>
//                 </Alert>

//                 {parseFloat(allowance) < 10 && (
//                   <Button
//                     variant="warning"
//                     className="btn-protocol w-100 mb-3"
//                     onClick={async () => {
//                       setTxStatus({ loading: true, hash: null, error: null });
//                       try {
//                         const writeContracts = await getWriteContracts();
//                         const spender = contracts.levelManager.target;
//                         const amount = ethers.parseUnits("10", 6);
//                         const tx = await writeContracts.usdt.approve(spender, amount);
//                         setTxStatus({ loading: true, hash: tx.hash, error: null });
//                         await tx.wait();
                        
//                         const newAllowance = await contracts.usdt.allowance(account, spender);
//                         setAllowance(ethers.formatUnits(newAllowance, 6));
//                         setTxStatus({ loading: false, hash: tx.hash, error: null });
//                       } catch (err) {
//                         setTxStatus({ loading: false, hash: null, error: err.message });
//                       }
//                     }}
//                     disabled={txStatus.loading}
//                   >
//                     {txStatus.loading ? <Spinner size="sm" /> : 'Approve 10 USDT for Registration'}
//                   </Button>
//                 )}

//                 <Form>
//                   <Form.Group className="mb-4">
//                     <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.uplinkReferrer')}</Form.Label>
//                     <Form.Control
//                       className="status-node p-3"
//                       type="text"
//                       placeholder="0x000... (leave empty for no referrer)"
//                       value={referrer}
//                       onChange={(e) => setReferrer(e.target.value)}
//                     />
//                     <Form.Text className="text-muted">
//                       Your referrer will be: {referrer || 'No referrer (ID1)'}
//                     </Form.Text>
//                   </Form.Group>

//                   <Button
//                     variant="primary"
//                     className="btn-protocol w-100"
//                     onClick={handleRegister}
//                     disabled={txStatus.loading || parseFloat(usdtBalance) < 10 || parseFloat(allowance) < 10}
//                     style={{ background: '#002366' }}
//                   >
//                     {txStatus.loading ? <Spinner size="sm" /> : 'Register & Activate Level 1 (10 USDT)'}
//                   </Button>

//                   {parseFloat(usdtBalance) < 10 && (
//                     <div className="mt-3 p-2 bg-danger text-white text-center small rounded">
//                       Insufficient USDT balance. Need 10 USDT.
//                     </div>
//                   )}
//                 </Form>
//               </div>
//             </div>
//           )}

//           <div className="lab-terminal mb-4">
//             <div className="terminal-header">
//               {isRegistered ? t('registration.levelsActivation') : t('registration.upgradeCipherLevel')}
//             </div>

//             <div className="p-4">
//               {!isRegistered ? (
//                 <Alert variant="info" className="mb-0">
//                   <strong>{t('registration.registrationRequiredTitle')}</strong>
//                   <p className="mt-2 mb-0 small">
//                     {t('registration.registrationRequiredText')}
//                   </p>
//                 </Alert>
//               ) : (
//                 <>
//                   <Form.Group className="mb-4">
//                     <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.selectProtocolTier')}</Form.Label>
//                     <Form.Select
//                       className="status-node p-3"
//                       value={level}
//                       onChange={(e) => setLevel(parseInt(e.target.value, 10))}
//                     >
//                       {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => (
//                         <option key={l} value={l} disabled={activeLevels[l]}>
//                           TIER {l.toString().padStart(2, '0')} — {levelPrices[l]} USDT {activeLevels[l] ? t('registration.alreadyUnlocked') : ''}
//                         </option>
//                       ))}
//                     </Form.Select>
//                     {activeLevels[1] && (
//                       <Form.Text className="text-success mt-2 d-block">
//                         ✓ Level 1 is active (activated during registration)
//                       </Form.Text>
//                     )}
//                   </Form.Group>

//                   <div className="d-grid gap-3">
//                     {parseFloat(allowance) < parseFloat(levelPrices[level]) && (
//                       <Button
//                         variant="warning"
//                         onClick={handleApprove}
//                         disabled={txStatus.loading}
//                         className="btn-protocol py-3"
//                       >
//                         {t('registration.authorizeTreasuryTransfer')}
//                       </Button>
//                     )}

//                     <Button
//                       variant="success"
//                       onClick={handleActivateLevel}
//                       disabled={!canActivate() || txStatus.loading || parseFloat(allowance) < parseFloat(levelPrices[level])}
//                       className="btn-protocol py-3"
//                       style={{ background: '#0044cc', border: 'none' }}
//                     >
//                       {txStatus.loading ? <Spinner size="sm" /> : t('registration.activateCipher', { level })}
//                     </Button>
//                   </div>

//                   {!canActivate() && level > 1 && !activeLevels[level - 1] && (
//                     <div className="mt-3 p-3 bg-light border-start border-warning border-4 small fw-bold">
//                       {t('registration.sequenceError', { level: level - 1, current: level })}
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>
//           </div>
//         </Col>

//         <Col lg={5}>
//           <div className="lab-terminal">
//             <div className="terminal-header">{t('registration.protocolSyncMap')}</div>
//             <div className="pulse-overlay p-4">
//               <Row className="g-2">
//                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(levelNum => (
//                   <Col xs={6} key={levelNum}>
//                     <div className={`p-3 status-node text-center ${activeLevels[levelNum] ? 'node-active' : 'bg-white'}`}>
//                       <div className="small opacity-75 fw-bold">TIER_{levelNum.toString().padStart(2, '0')}</div>
//                       <div className="fw-black mt-1" style={{ fontSize: '0.65rem' }}>
//                         {activeLevels[levelNum] ? t('registration.unlocked') : t('registration.encrypted')}
//                       </div>
//                     </div>
//                   </Col>
//                 ))}
//               </Row>
//             </div>
//           </div>
//         </Col>
//       </Row>
//     </Container>
//   )
// }



















// import React, { useState, useEffect } from 'react'
// import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'
// import { web3Service } from '../Services/web3'
// import { ethers } from 'ethers'
// import { useTranslation } from 'react-i18next'

// export const Registration = () => {
//   const { isConnected, account } = useWallet()
//   const { contracts, isLoading, error, loadContracts } = useContracts()
//   const { t } = useTranslation()

//   const [referrer, setReferrer] = useState('')
//   const [level, setLevel] = useState(1)
//   const [isRegistered, setIsRegistered] = useState(false)
//   const [activeLevels, setActiveLevels] = useState({})
//   const [usdtBalance, setUsdtBalance] = useState('0')
//   const [allowance, setAllowance] = useState('0')
//   const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null })
//   const [isDeployer, setIsDeployer] = useState(false)
//   const [deployerUsdtBalance, setDeployerUsdtBalance] = useState('0')
//   const [transferAmount, setTransferAmount] = useState('100')
//   const [transferAddress, setTransferAddress] = useState('')
//   const [showTransferToSelf, setShowTransferToSelf] = useState(true)
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [isRefreshing, setIsRefreshing] = useState(false)

//   const registrationStyles = `
//     @keyframes pulse-line {
//       0% { background-position: 0% 50%; }
//       100% { background-position: 200% 50%; }
//     }
//     @keyframes glow-red {
//       0%, 100% { box-shadow: 0 0 5px rgba(220, 53, 69, 0.2); }
//       50% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.5); }
//     }
//     .lab-terminal {
//       background: #ffffff;
//       border: 1px solid rgba(0, 35, 102, 0.1);
//       border-radius: 20px;
//       box-shadow: 0 10px 30px rgba(0, 35, 102, 0.05);
//       overflow: hidden;
//       position: relative;
//     }
//     .terminal-header {
//       background: #002366;
//       color: white;
//       font-family: 'monospace';
//       font-size: 0.9rem;
//       letter-spacing: 1px;
//       padding: 12px 20px;
//       border-bottom: 2px solid #0044cc;
//     }
//     .pulse-overlay {
//       background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.03) 45%, rgba(0, 68, 204, 0.1) 50%, rgba(0, 35, 102, 0.03) 55%, transparent 100%);
//       background-size: 200% 100%;
//       animation: pulse-line 4s linear infinite;
//     }
//     .status-node {
//       font-family: 'monospace';
//       font-size: 0.75rem;
//       border-radius: 12px;
//       transition: all 0.3s ease;
//       border: 1px solid #eee;
//     }
//     .node-active {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white !important;
//       border: none;
//       box-shadow: 0 4px 12px rgba(0, 68, 204, 0.3);
//     }
//     .btn-protocol {
//       font-weight: 800;
//       text-transform: uppercase;
//       letter-spacing: 1.5px;
//       padding: 12px;
//       border-radius: 12px;
//       transition: all 0.3s ease;
//     }
//     .security-alert {
//       animation: glow-red 2s infinite;
//       border: none;
//       border-radius: 12px;
//       font-weight: 700;
//     }
//     .deployer-badge {
//       background: #002366;
//       color: white;
//       padding: 4px 12px;
//       border-radius: 20px;
//       font-size: 0.7rem;
//       font-weight: bold;
//       text-transform: uppercase;
//       letter-spacing: 1px;
//       display: inline-block;
//       margin-left: 10px;
//     }
//     .refresh-button {
//       background: #002366;
//       color: white;
//       border: none;
//       border-radius: 8px;
//       padding: 5px 15px;
//       font-size: 0.8rem;
//       cursor: pointer;
//       transition: all 0.3s ease;
//       margin-left: 15px;
//     }
//     .refresh-button:hover {
//       background: #0044cc;
//     }
//     .refresh-button:disabled {
//       opacity: 0.5;
//       cursor: not-allowed;
//     }
//     .tooltip-icon {
//       cursor: help;
//       display: inline-block;
//       width: 18px;
//       height: 18px;
//       background: #002366;
//       color: white;
//       border-radius: 50%;
//       text-align: center;
//       line-height: 18px;
//       font-size: 12px;
//       margin-left: 8px;
//     }
//     [data-tooltip] {
//       position: relative;
//       cursor: help;
//     }
//     [data-tooltip]:before {
//       content: attr(data-tooltip);
//       position: absolute;
//       bottom: 100%;
//       left: 50%;
//       transform: translateX(-50%);
//       background: #002366;
//       color: white;
//       padding: 8px 12px;
//       border-radius: 8px;
//       font-size: 0.8rem;
//       white-space: nowrap;
//       display: none;
//       z-index: 1000;
//     }
//     [data-tooltip]:hover:before {
//       display: block;
//     }
//   `

//   const levelPrices = {
//     1: '10', 2: '20', 3: '40', 4: '80', 5: '160',
//     6: '320', 7: '640', 8: '1280', 9: '2560', 10: '5120'
//   }

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const getWriteContracts = async () => {
//     const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
//     return writeContracts
//   }

//   const fetchUserData = async () => {
//     if (!contracts || !account) return

//     try {
//       const registered = await contracts.registration.isRegistered(account)
//       setIsRegistered(registered)

//       if (registered) {
//         const ref = await contracts.registration.getReferrer(account)
//         setReferrer(ref === ethers.ZeroAddress ? '' : ref)
//       }

//       const levels = {}
//       for (let i = 1; i <= 10; i++) {
//         try {
//           const activated = await contracts.registration.isLevelActivated(account, i)
//           levels[i] = activated
//         } catch {
//           levels[i] = false
//         }
//       }
//       setActiveLevels(levels)

//       const balance = await contracts.usdt.balanceOf(account)
//       setUsdtBalance(ethers.formatUnits(balance, 6))

//       const spender = contracts.levelManager.target
//       const currentAllowance = await contracts.usdt.allowance(account, spender)
//       setAllowance(ethers.formatUnits(currentAllowance, 6))
//     } catch (err) {
//       console.error('Data Extraction Failed:', err)
//     }
//   }

//   useEffect(() => {
//     const checkDeployerStatus = async () => {
//       if (!contracts || !account) return

//       try {
//         const owner = await contracts.registration.owner()
//         const ownerMatch = owner.toLowerCase() === account.toLowerCase()
//         setIsDeployer(ownerMatch)

//         if (ownerMatch && contracts.usdt) {
//           const balance = await contracts.usdt.balanceOf(account)
//           setDeployerUsdtBalance(ethers.formatUnits(balance, 6))
//         }

//         setTransferAddress(account)
//       } catch (err) {
//         console.error('Error checking deployer status:', err)
//       }
//     }

//     checkDeployerStatus()
//   }, [contracts, account])

//   useEffect(() => {
//     if (!contracts || !account) return

//     fetchUserData()

//     const interval = setInterval(() => {
//       fetchUserData()
//       setLastUpdated(new Date().toLocaleTimeString())
//     }, 30000)

//     return () => clearInterval(interval)
//   }, [contracts, account])

//   const refreshData = async () => {
//     if (!contracts || !account) return
//     setIsRefreshing(true)

//     try {
//       await fetchUserData()

//       if (isDeployer) {
//         const balance = await contracts.usdt.balanceOf(account)
//         setDeployerUsdtBalance(ethers.formatUnits(balance, 6))
//       }

//       setLastUpdated(new Date().toLocaleTimeString())
//     } finally {
//       setIsRefreshing(false)
//     }
//   }

//   const handleRegister = async () => {
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.registration.register(referrer || ethers.ZeroAddress)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       setIsRegistered(true)
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//       await fetchUserData()
//     } catch (err) {
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   const handleApprove = async () => {
//     const price = ethers.parseUnits(levelPrices[level], 6)
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const writeContracts = await getWriteContracts()
//       const spender = contracts.levelManager.target
//       const tx = await writeContracts.usdt.approve(spender, price)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const newAllowance = await contracts.usdt.allowance(account, spender)
//       setAllowance(ethers.formatUnits(newAllowance, 6))
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   const handleTransferToSelf = async () => {
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       if (!isDeployer) throw new Error('Only deployer can transfer USDT')

//       const amount = ethers.parseUnits(transferAmount, 6)
//       const balance = await contracts.usdt.balanceOf(account)

//       if (balance < amount) {
//         throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
//       }

//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.usdt.transfer(account, amount)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const newBalance = await contracts.usdt.balanceOf(account)
//       setUsdtBalance(ethers.formatUnits(newBalance, 6))
//       setDeployerUsdtBalance(ethers.formatUnits(newBalance, 6))

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Transfer error:', err)
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   const handleTransferToAddress = async () => {
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       if (!isDeployer) throw new Error('Only deployer can transfer USDT')
//       if (!ethers.isAddress(transferAddress)) throw new Error('Invalid recipient address')

//       const amount = ethers.parseUnits(transferAmount, 6)
//       const balance = await contracts.usdt.balanceOf(account)

//       if (balance < amount) {
//         throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
//       }

//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.usdt.transfer(transferAddress, amount)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const newDeployerBalance = await contracts.usdt.balanceOf(account)
//       setDeployerUsdtBalance(ethers.formatUnits(newDeployerBalance, 6))

//       if (transferAddress.toLowerCase() === account.toLowerCase()) {
//         const newBalance = await contracts.usdt.balanceOf(account)
//         setUsdtBalance(ethers.formatUnits(newBalance, 6))
//       }

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Transfer error:', err)
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   const handleActivateLevel = async () => {
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const balance = await contracts.usdt.balanceOf(account)
//       const price = ethers.parseUnits(levelPrices[level], 6)
//       const spender = contracts.levelManager.target

//       if (balance < price) {
//         throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT but need ${levelPrices[level]} USDT. Please request USDT from the deployer.`)
//       }

//       const currentAllowance = await contracts.usdt.allowance(account, spender)
//       if (currentAllowance < price) {
//         throw new Error('Insufficient allowance. Please approve USDT spending first.')
//       }

//       const writeContracts = await getWriteContracts()

//       try {
//         await writeContracts.registration.activateLevel.estimateGas(level)
//       } catch (estimateErr) {
//         let errorMessage = 'Transaction would fail. '

//         if (estimateErr.error && estimateErr.error.data) {
//           try {
//             const iface = writeContracts.registration.interface
//             const decodedError = iface.parseError(estimateErr.error.data)
//             if (decodedError) {
//               errorMessage += `Contract error: ${decodedError.name}`
//               if (decodedError.args) {
//                 errorMessage += ` - ${decodedError.args.join(', ')}`
//               }
//             }
//           } catch {
//             if (estimateErr.reason) {
//               errorMessage += estimateErr.reason
//             } else {
//               errorMessage += estimateErr.message
//             }
//           }
//         } else if (estimateErr.reason) {
//           errorMessage += estimateErr.reason
//         } else {
//           errorMessage += estimateErr.message
//         }

//         setTxStatus({ loading: false, hash: null, error: errorMessage })
//         return
//       }

//       const tx = await writeContracts.registration.activateLevel(level)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const activated = await contracts.registration.isLevelActivated(account, level)
//       setActiveLevels(prev => ({ ...prev, [level]: activated }))

//       const newBalance = await contracts.usdt.balanceOf(account)
//       setUsdtBalance(ethers.formatUnits(newBalance, 6))

//       const newAllowance = await contracts.usdt.allowance(account, spender)
//       setAllowance(ethers.formatUnits(newAllowance, 6))

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Activation error:', err)

//       try {
//         const actualStatus = await contracts.registration.isLevelActivated(account, level)
//         setActiveLevels(prev => ({ ...prev, [level]: actualStatus }))
//       } catch {}

//       let errorMessage = ''

//       if (err.code === 'CALL_EXCEPTION') {
//         errorMessage = 'Transaction failed. '
//         if (err.error && err.error.data) {
//           try {
//             const iface = contracts.registration.interface
//             const decodedError = iface.parseError(err.error.data)
//             if (decodedError) {
//               errorMessage += `Contract error: ${decodedError.name}`
//               if (decodedError.args) {
//                 errorMessage += ` - ${decodedError.args.join(', ')}`
//               }
//             }
//           } catch {
//             errorMessage += err.reason || err.message
//           }
//         } else if (err.reason) {
//           errorMessage += err.reason
//         } else {
//           errorMessage += err.message
//         }
//       } else if (err.message?.includes('insufficient funds')) {
//         errorMessage = 'You do not have enough POL for gas.'
//       } else if (err.message?.includes('transfer amount exceeds balance')) {
//         errorMessage = 'You do not have enough USDT. Please request USDT from deployer.'
//       } else if (err.message?.includes('Level already activated')) {
//         errorMessage = 'This level is already activated.'
//       } else if (err.message?.includes('Previous level not activated')) {
//         errorMessage = `You need to activate Level ${level - 1} first.`
//       } else {
//         errorMessage = `Transaction failed: ${err.message || 'Unknown error'}`
//       }

//       setTxStatus({ loading: false, hash: null, error: errorMessage })
//     }
//   }

//   const canActivate = () => {
//     if (level === 1) return !activeLevels[1]
//     return !activeLevels[level] && activeLevels[level - 1]
//   }

//   if (!isConnected) {
//     return (
//       <Container className="mt-5 pt-5 text-center">
//         <style>{registrationStyles}</style>
//         <Alert variant="primary" className="p-4" style={{ backgroundColor: '#002366', color: 'white', borderRadius: '15px' }}>
//           <h4 className="fw-bold">{t('registration.connectTitle')}</h4>
//           <p className="m-0">{t('registration.connectText')}</p>
//         </Alert>
//       </Container>
//     )
//   }

//   return (
//     <Container className="mt-5 pt-5 pb-5">
//       <style>{registrationStyles}</style>

//       <div className="d-flex align-items-center justify-content-between mb-4">
//         <div className="d-flex align-items-center mt-5">
//           <div style={{ height: '30px', width: '6px', background: '#002366', marginRight: '15px' }}></div>
//           <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '1px', fontSize: '1.8rem' }}>
//             {isRegistered ? t('registration.pageTitleRegistered') : t('registration.pageTitleUnregistered')}
//           </h1>
//           {isDeployer && <span className="deployer-badge">{t('registration.deployer')}</span>}
//         </div>

//         <div className="d-flex align-items-center">
//           <span className="text-muted small me-3">{t('registration.lastSync')}: {lastUpdated}</span>
//           <Button
//             variant="link"
//             className="refresh-button"
//             onClick={refreshData}
//             disabled={isRefreshing}
//           >
//             {isRefreshing ? t('registration.refreshing') : t('registration.refresh')}
//           </Button>
//         </div>
//       </div>

//       {error && (
//         <Alert variant="danger" className="mb-4 security-alert">
//           {t('registration.coreError')}: {error}
//         </Alert>
//       )}

//       {txStatus.error && (
//         <Alert variant="danger" className="security-alert mb-4" dismissible onClose={() => setTxStatus({ ...txStatus, error: null })}>
//           {t('registration.coreError')}: {txStatus.error}
//         </Alert>
//       )}

//       {txStatus.hash && (
//         <Alert variant="info" className="mb-4 status-node border-0 shadow-sm">
//           <strong>{t('registration.broadcastingTx')}:</strong>{' '}
//           <a
//             href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="text-decoration-none"
//           >
//             {txStatus.hash}
//           </a>
//         </Alert>
//       )}

//       <Row>
//         <Col lg={7}>
//           <div className="lab-terminal mb-4">
//             <div className="terminal-header">{t('registration.nodeIdentityStatus')}</div>
//             <div className="pulse-overlay p-4">
//               <Row>
//                 <Col sm={6} className="mb-3">
//                   <div className="small text-muted fw-bold text-uppercase">{t('registration.publicAddress')}</div>
//                   <div className="fw-bold" style={{ color: '#002366', fontSize: '0.85rem' }}>
//                     {account.substring(0, 18)}...
//                   </div>
//                 </Col>

//                 <Col sm={6} className="mb-3">
//                   <div className="small text-muted fw-bold text-uppercase">{t('registration.ledgerStatus')}</div>
//                   <div className={`fw-bold ${isRegistered ? 'text-success' : 'text-danger'}`}>
//                     {isRegistered ? t('registration.authorizedMember') : t('registration.unauthorizedNode')}
//                   </div>
//                 </Col>

//                 <Col sm={6}>
//                   <div className="small text-muted fw-bold text-uppercase d-flex align-items-center">
//                     {t('registration.liquidAssets')}
//                     <span className="tooltip-icon" data-tooltip={t('registration.liquidAssetsTooltip')}>?</span>
//                   </div>
//                   <div className="fw-bold" style={{ color: '#002366' }}>
//                     {usdtBalance} <span className="small">USDT</span>
//                   </div>
//                 </Col>

//                 <Col sm={6}>
//                   <div className="small text-muted fw-bold text-uppercase d-flex align-items-center">
//                     {t('registration.managerAllowance')}
//                     <span className="tooltip-icon" data-tooltip={t('registration.managerAllowanceTooltip')}>?</span>
//                   </div>
//                   <div className="fw-bold" style={{ color: '#002366' }}>
//                     {allowance} <span className="small">USDT</span>
//                   </div>
//                 </Col>

//                 {isDeployer && (
//                   <Col sm={12} className="mt-3">
//                     <div className="small text-muted fw-bold text-uppercase">{t('registration.deployerUsdtBalance')}</div>
//                     <div className="fw-bold" style={{ color: '#002366' }}>
//                       {deployerUsdtBalance} <span className="small">USDT</span>
//                     </div>
//                   </Col>
//                 )}
//               </Row>
//             </div>
//           </div>

//           {isDeployer ? (
//             <div className="lab-terminal mb-4">
//               <div className="terminal-header">{t('registration.deployerUsdtFaucet')}</div>
//               <div className="p-4">
//                 <div className="mb-3">
//                   <Form.Check
//                     type="switch"
//                     id="transfer-mode-switch"
//                     label={t('registration.transferToSpecificAddress')}
//                     checked={!showTransferToSelf}
//                     onChange={() => setShowTransferToSelf(!showTransferToSelf)}
//                   />
//                 </div>

//                 {showTransferToSelf ? (
//                   <>
//                     <Row>
//                       <Col md={8}>
//                         <Form.Control
//                           type="number"
//                           value={transferAmount}
//                           onChange={(e) => setTransferAmount(e.target.value)}
//                           className="status-node mb-2"
//                           placeholder={t('registration.amount')}
//                         />
//                       </Col>

//                       <Col md={4}>
//                         <Button
//                           variant="success"
//                           className="btn-protocol w-100"
//                           onClick={handleTransferToSelf}
//                           disabled={txStatus.loading}
//                           style={{ background: '#28a745' }}
//                         >
//                           {txStatus.loading ? <Spinner size="sm" /> : t('registration.sendToSelf')}
//                         </Button>
//                       </Col>
//                     </Row>

//                     <div className="small text-muted mt-2">
//                       {t('registration.transferToSelfHelp')}
//                     </div>
//                   </>
//                 ) : (
//                   <>
//                     <Form.Group className="mb-3">
//                       <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.recipientAddress')}</Form.Label>
//                       <Form.Control
//                         type="text"
//                         value={transferAddress}
//                         onChange={(e) => setTransferAddress(e.target.value)}
//                         className="status-node"
//                         placeholder="0x..."
//                       />
//                     </Form.Group>

//                     <Row>
//                       <Col md={8}>
//                         <Form.Control
//                           type="number"
//                           value={transferAmount}
//                           onChange={(e) => setTransferAmount(e.target.value)}
//                           className="status-node mb-2"
//                           placeholder={t('registration.amount')}
//                         />
//                       </Col>

//                       <Col md={4}>
//                         <Button
//                           variant="success"
//                           className="btn-protocol w-100"
//                           onClick={handleTransferToAddress}
//                           disabled={txStatus.loading}
//                           style={{ background: '#28a745' }}
//                         >
//                           {txStatus.loading ? <Spinner size="sm" /> : t('registration.transfer')}
//                         </Button>
//                       </Col>
//                     </Row>

//                     <div className="small text-muted mt-2">
//                       {t('registration.transferToAddressHelp')}
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>
//           ) : (
//             <div className="lab-terminal mb-4">
//               <div className="terminal-header">{t('registration.usdtAcquisition')}</div>
//               <div className="p-4">
//                 <Alert variant="info" className="mb-0">
//                   <strong>{t('registration.usdtRequiredTitle')}</strong>
//                   <p className="mt-2 mb-0 small">
//                     {t('registration.usdtRequiredText')}
//                   </p>
//                 </Alert>
//               </div>
//             </div>
//           )}

//           {!isRegistered && (
//             <div className="lab-terminal mb-4">
//               <div className="terminal-header">{t('registration.initializeHandshake')}</div>
//               <div className="p-4">
//                 <Form>
//                   <Form.Group className="mb-4">
//                     <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.uplinkReferrer')}</Form.Label>
//                     <Form.Control
//                       className="status-node p-3"
//                       type="text"
//                       placeholder="0x000..."
//                       value={referrer}
//                       onChange={(e) => setReferrer(e.target.value)}
//                     />
//                   </Form.Group>

//                   <Button
//                     variant="primary"
//                     className="btn-protocol w-100"
//                     onClick={handleRegister}
//                     disabled={txStatus.loading}
//                     style={{ background: '#002366' }}
//                   >
//                     {txStatus.loading ? <Spinner size="sm" /> : t('registration.executeRegistration')}
//                   </Button>
//                 </Form>
//               </div>
//             </div>
//           )}

//           <div className="lab-terminal mb-4">
//             <div className="terminal-header">
//               {isRegistered ? t('registration.levelsActivation') : t('registration.upgradeCipherLevel')}
//             </div>

//             <div className="p-4">
//               {!isRegistered ? (
//                 <Alert variant="info" className="mb-0">
//                   <strong>{t('registration.registrationRequiredTitle')}</strong>
//                   <p className="mt-2 mb-0 small">
//                     {t('registration.registrationRequiredText')}
//                   </p>
//                 </Alert>
//               ) : (
//                 <>
//                   <Form.Group className="mb-4">
//                     <Form.Label className="small fw-bold text-muted text-uppercase">{t('registration.selectProtocolTier')}</Form.Label>
//                     <Form.Select
//                       className="status-node p-3"
//                       value={level}
//                       onChange={(e) => setLevel(parseInt(e.target.value, 10))}
//                     >
//                       {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => (
//                         <option key={l} value={l} disabled={activeLevels[l]}>
//                           TIER {l.toString().padStart(2, '0')} — {levelPrices[l]} USDT {activeLevels[l] ? t('registration.alreadyUnlocked') : ''}
//                         </option>
//                       ))}
//                     </Form.Select>
//                   </Form.Group>

//                   <div className="d-grid gap-3">
//                     {parseFloat(allowance) < parseFloat(levelPrices[level]) && (
//                       <Button
//                         variant="warning"
//                         onClick={handleApprove}
//                         disabled={txStatus.loading}
//                         className="btn-protocol py-3"
//                       >
//                         {t('registration.authorizeTreasuryTransfer')}
//                       </Button>
//                     )}

//                     <Button
//                       variant="success"
//                       onClick={handleActivateLevel}
//                       disabled={!canActivate() || txStatus.loading || parseFloat(allowance) < parseFloat(levelPrices[level])}
//                       className="btn-protocol py-3"
//                       style={{ background: '#0044cc', border: 'none' }}
//                     >
//                       {txStatus.loading ? <Spinner size="sm" /> : t('registration.activateCipher', { level })}
//                     </Button>
//                   </div>

//                   {!canActivate() && level > 1 && !activeLevels[level - 1] && (
//                     <div className="mt-3 p-3 bg-light border-start border-warning border-4 small fw-bold">
//                       {t('registration.sequenceError', { level: level - 1, current: level })}
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>
//           </div>
//         </Col>

//         <Col lg={5}>
//           <div className="lab-terminal">
//             <div className="terminal-header">{t('registration.protocolSyncMap')}</div>
//             <div className="pulse-overlay p-4">
//               <Row className="g-2">
//                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(levelNum => (
//                   <Col xs={6} key={levelNum}>
//                     <div className={`p-3 status-node text-center ${activeLevels[levelNum] ? 'node-active' : 'bg-white'}`}>
//                       <div className="small opacity-75 fw-bold">TIER_{levelNum.toString().padStart(2, '0')}</div>
//                       <div className="fw-black mt-1" style={{ fontSize: '0.65rem' }}>
//                         {activeLevels[levelNum] ? t('registration.unlocked') : t('registration.encrypted')}
//                       </div>
//                     </div>
//                   </Col>
//                 ))}
//               </Row>
//             </div>
//           </div>
//         </Col>
//       </Row>
//     </Container>
//   )
// }