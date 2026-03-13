import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Alert, Badge, Card, Col, Container, Row, Spinner, Table, Tabs, Tab, Modal, Button } from 'react-bootstrap'
import { ethers } from 'ethers'
import { useWallet } from '../hooks/useWallet'
import { useContracts } from '../hooks/useContracts'
import { web3Service } from '../Services/web3'

export const MyTokens = () => {
  const { isConnected, account } = useWallet()
  const { contracts, loadContracts, isLoading, error } = useContracts()

  const [isFetching, setIsFetching] = useState(true)
  const [isLoadingFullHistory, setIsLoadingFullHistory] = useState(false)
  const [pageError, setPageError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)
  const [showAllTimeline, setShowAllTimeline] = useState(false)
  const [showAllTables, setShowAllTables] = useState({})
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false)
  const [balances, setBalances] = useState({
    fgtTotal: '0',
    fgtLocked: '0',
    fgtAvailable: '0',
    fgtrTotal: '0',
    fgtrLocked: '0',
    fgtrAvailable: '0',
    totalFGTMinted: '0',
    totalFGTrMinted: '0',
    totalFGTBurned: '0',
    totalFGTrBurned: '0',
    totalFGTLocked: '0'
  })
  const [recordCounts, setRecordCounts] = useState({
    fgtMints: 0,
    fgtrMints: 0,
    fgtBurns: 0,
    fgtrBurns: 0,
    fgtLocks: 0
  })
  const [history, setHistory] = useState({
    timeline: [],
    fgtMints: [],
    fgtrMints: [],
    fgtBurns: [],
    fgtrBurns: [],
    fgtLocks: []
  })
  const [fetchProgress, setFetchProgress] = useState('')

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  const formatToken = (value) => {
    try {
      return Number(ethers.formatUnits(value || 0, 6)).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
      })
    } catch {
      return '0'
    }
  }

  const shortAddress = (address) => {
    if (!address) return '—'
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '—'
    return new Date(timestamp * 1000).toLocaleString()
  }

  const reasonLabel = (reason) => {
    const labels = {
      manualActivation: 'Manual activation reward',
      autoUpgrade: 'Auto-upgrade reward',
      founderActivation: 'Founder free activation reward',
      recycleReward: 'Recycle completion reward',
      raffleBurn: 'Raffle burn',
      NFTLock: 'NFT utility lock'
    }

    return labels[reason] || reason || 'Protocol event'
  }

  const reasonVariant = (reason) => {
    if (reason === 'manualActivation' || reason === 'autoUpgrade' || reason === 'founderActivation') return 'primary'
    if (reason === 'recycleReward') return 'success'
    if (reason?.toLowerCase()?.includes('burn')) return 'danger'
    if (reason?.toLowerCase()?.includes('lock') || reason === 'NFTLock') return 'warning'
    return 'secondary'
  }

  const buildNarrative = (entry) => {
    if (entry.kind === 'FGT_MINT') {
      if (entry.reason === 'manualActivation') {
        return `You activated Level ${entry.level} manually and earned ${entry.amountFormatted} FGT.`
      }
      if (entry.reason === 'autoUpgrade') {
        return `Your auto-upgrade completed into Level ${entry.level} and the protocol minted ${entry.amountFormatted} FGT to your wallet.`
      }
      if (entry.reason === 'founderActivation') {
        return `A founder representative free activation occurred on Level ${entry.level}, and ${entry.amountFormatted} FGT was minted to your wallet.`
      }
      return `You received ${entry.amountFormatted} FGT on Level ${entry.level}.`
    }

    if (entry.kind === 'FGTR_MINT') {
      return `Your orbit completed a recycle on Level ${entry.level}, and ${entry.amountFormatted} FGTr was minted as your recycle reward.`
    }

    if (entry.kind === 'FGT_BURN') {
      return `${entry.amountFormatted} FGT was burned for utility usage under reason: ${reasonLabel(entry.reason)}.`
    }

    if (entry.kind === 'FGTR_BURN') {
      return `${entry.amountFormatted} FGTr was burned for utility usage under reason: ${reasonLabel(entry.reason)}.`
    }

    if (entry.kind === 'FGT_LOCK') {
      return `${entry.amountFormatted} FGT was locked for ecosystem utility under reason: ${reasonLabel(entry.reason)}.`
    }

    return 'Protocol activity recorded.'
  }

  const decodeReason = (value) => {
    try {
      if (!value || value === ethers.ZeroHash) return ''
      return ethers.decodeBytes32String(value)
    } catch {
      try {
        const bytes = ethers.getBytes(value)
        const filtered = bytes.filter((b) => b !== 0)
        return new TextDecoder().decode(new Uint8Array(filtered))
      } catch {
        return ''
      }
    }
  }

  // Fetch event logs to get transaction hashes
  const fetchEventLogs = useCallback(async (controller, user) => {
    try {
      const provider = web3Service.getReadProvider()
      const latestBlock = await provider.getBlockNumber()
      
      // Fetch last 100,000 blocks for events (adjust as needed)
      const fromBlock = Math.max(0, latestBlock - 100000)
      
      console.log(`Fetching events from block ${fromBlock} to ${latestBlock}`)
      
      // Create filters for each event type
      const fgtMintFilter = controller.filters.FGTMintRecorded(user)
      const fgtrMintFilter = controller.filters.FGTrMintRecorded(user)
      const fgtBurnFilter = controller.filters.FGTBurnRecorded(user)
      const fgtrBurnFilter = controller.filters.FGTrBurnRecorded(user)
      const fgtLockFilter = controller.filters.FGTLockRecorded(user)
      
      // Fetch events in parallel
      const [
        fgtMintEvents,
        fgtrMintEvents,
        fgtBurnEvents,
        fgtrBurnEvents,
        fgtLockEvents
      ] = await Promise.all([
        controller.queryFilter(fgtMintFilter, fromBlock, latestBlock).catch(() => []),
        controller.queryFilter(fgtrMintFilter, fromBlock, latestBlock).catch(() => []),
        controller.queryFilter(fgtBurnFilter, fromBlock, latestBlock).catch(() => []),
        controller.queryFilter(fgtrBurnFilter, fromBlock, latestBlock).catch(() => []),
        controller.queryFilter(fgtLockFilter, fromBlock, latestBlock).catch(() => [])
      ])
      
      // Enrich events with block timestamps
      const enrichEvents = async (events) => {
        if (!events.length) return events
        
        const uniqueBlocks = [...new Set(events.map(e => e.blockNumber))]
        const timestampMap = new Map()
        
        // Fetch timestamps for unique blocks
        const batchSize = 10
        for (let i = 0; i < uniqueBlocks.length; i += batchSize) {
          const batch = uniqueBlocks.slice(i, i + batchSize)
          const blocks = await Promise.all(
            batch.map(async (blockNumber) => {
              try {
                const block = await provider.getBlock(blockNumber)
                return [blockNumber, block?.timestamp || 0]
              } catch {
                return [blockNumber, 0]
              }
            })
          )
          blocks.forEach(([blockNumber, timestamp]) => timestampMap.set(blockNumber, timestamp))
        }
        
        return events.map(event => ({
          ...event,
          timestamp: timestampMap.get(event.blockNumber) || 0
        }))
      }
      
      // Enrich all events with timestamps
      const [enrichedFgtMint, enrichedFgtrMint, enrichedFgtBurn, enrichedFgtrBurn, enrichedFgtLock] = 
        await Promise.all([
          enrichEvents(fgtMintEvents),
          enrichEvents(fgtrMintEvents),
          enrichEvents(fgtBurnEvents),
          enrichEvents(fgtrBurnEvents),
          enrichEvents(fgtLockEvents)
        ])
      
      return {
        fgtMintEvents: enrichedFgtMint,
        fgtrMintEvents: enrichedFgtrMint,
        fgtBurnEvents: enrichedFgtBurn,
        fgtrBurnEvents: enrichedFgtrBurn,
        fgtLockEvents: enrichedFgtLock
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      return {
        fgtMintEvents: [],
        fgtrMintEvents: [],
        fgtBurnEvents: [],
        fgtrBurnEvents: [],
        fgtLockEvents: []
      }
    }
  }, [])

  // Process stored records with event data
  const processStoredRecordsWithEvents = useCallback((records, events) => {
    const parsedFGTMints = []
    const parsedFGTrMints = []
    const parsedFGTBurns = []
    const parsedFGTrBurns = []
    const parsedFGTLocks = []

    // Create lookup maps for events by type, level, and amount
    const createEventMap = (eventList, type) => {
      const map = new Map()
      eventList.forEach(event => {
        const level = Number(event.args?.level || 0)
        const amount = event.args?.amount?.toString() || '0'
        const key = `${type}-${level}-${amount}`
        if (!map.has(key)) map.set(key, [])
        map.get(key).push({
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: event.timestamp,
          event
        })
      })
      return map
    }

    const fgtMintMap = createEventMap(events.fgtMintEvents, 'FGT_MINT')
    const fgtrMintMap = createEventMap(events.fgtrMintEvents, 'FGTR_MINT')
    const fgtBurnMap = createEventMap(events.fgtBurnEvents, 'FGT_BURN')
    const fgtrBurnMap = createEventMap(events.fgtrBurnEvents, 'FGTR_BURN')
    const fgtLockMap = createEventMap(events.fgtLockEvents, 'FGT_LOCK')

    records.forEach((record, index) => {
      const recordType = Number(record.recordType ?? record[0] ?? 0)
      const level = Number(record.level ?? record[1] ?? 0)
      const timestamp = Number(record.timestamp ?? record[2] ?? 0)
      const amount = record.amount ?? record[3] ?? 0
      const reasonRaw = record.reason ?? record[4] ?? ethers.ZeroHash
      const reason = decodeReason(reasonRaw)
      
      let txHash = ''
      let blockNumber = 0
      let eventTimestamp = timestamp

      // Try to find matching event based on type, level, and amount
      let matchingEvents = []
      if (recordType === 1) { // FGT_MINT
        matchingEvents = fgtMintMap.get(`FGT_MINT-${level}-${amount}`) || []
      } else if (recordType === 2) { // FGTR_MINT
        matchingEvents = fgtrMintMap.get(`FGTR_MINT-${level}-${amount}`) || []
      } else if (recordType === 3) { // FGT_BURN
        matchingEvents = fgtBurnMap.get(`FGT_BURN-${level}-${amount}`) || []
      } else if (recordType === 4) { // FGTR_BURN
        matchingEvents = fgtrBurnMap.get(`FGTR_BURN-${level}-${amount}`) || []
      } else if (recordType === 5) { // FGT_LOCK
        matchingEvents = fgtLockMap.get(`FGT_LOCK-${level}-${amount}`) || []
      }

      // Find the closest event by timestamp (within 1 hour)
      if (matchingEvents.length > 0) {
        const closestEvent = matchingEvents.reduce((closest, current) => {
          const timeDiff = Math.abs(current.timestamp - timestamp)
          const closestDiff = Math.abs(closest.timestamp - timestamp)
          return timeDiff < closestDiff ? current : closest
        }, matchingEvents[0])
        
        // Only use if within 1 hour (3600 seconds)
        if (Math.abs(closestEvent.timestamp - timestamp) < 3600) {
          txHash = closestEvent.txHash
          blockNumber = closestEvent.blockNumber
          eventTimestamp = closestEvent.timestamp
        }
      }

      const baseEntry = {
        id: `stored-record-${index}`,
        user: account,
        level: level > 0 ? level : undefined,
        amount,
        amountFormatted: formatToken(amount),
        reason,
        reasonText: reasonLabel(reason),
        timestamp: eventTimestamp,
        blockNumber,
        txHash,
        source: txHash ? 'On-chain transaction' : 'Stored in contract'
      }

      if (recordType === 1) {
        parsedFGTMints.push({
          ...baseEntry,
          kind: 'FGT_MINT',
          token: 'FGT',
          source: 'Activation reward'
        })
      } else if (recordType === 2) {
        parsedFGTrMints.push({
          ...baseEntry,
          kind: 'FGTR_MINT',
          token: 'FGTr',
          source: 'Recycle reward'
        })
      } else if (recordType === 3) {
        parsedFGTBurns.push({
          ...baseEntry,
          kind: 'FGT_BURN',
          token: 'FGT',
          source: 'Utility burn'
        })
      } else if (recordType === 4) {
        parsedFGTrBurns.push({
          ...baseEntry,
          kind: 'FGTR_BURN',
          token: 'FGTr',
          source: 'Utility burn'
        })
      } else if (recordType === 5) {
        parsedFGTLocks.push({
          ...baseEntry,
          kind: 'FGT_LOCK',
          token: 'FGT',
          source: 'NFT / utility lock'
        })
      }
    })

    const timeline = [
      ...parsedFGTMints,
      ...parsedFGTrMints,
      ...parsedFGTBurns,
      ...parsedFGTrBurns,
      ...parsedFGTLocks
    ]
      .map((entry) => ({
        ...entry,
        narrative: buildNarrative(entry)
      }))
      .sort((a, b) => {
        if ((b.timestamp || 0) !== (a.timestamp || 0)) return (b.timestamp || 0) - (a.timestamp || 0)
        return b.id.localeCompare(a.id)
      })

    return {
      timeline,
      fgtMints: parsedFGTMints,
      fgtrMints: parsedFGTrMints,
      fgtBurns: parsedFGTBurns,
      fgtrBurns: parsedFGTrBurns,
      fgtLocks: parsedFGTLocks
    }
  }, [account])

  // Fetch stored history with events
  const fetchStoredHistory = useCallback(async (controller, user, progressPrefix = 'Loading token history...') => {
    const totalRecords = Number(await controller.getUserTokenRecordCount(user))
    if (totalRecords === 0) {
      return {
        timeline: [],
        fgtMints: [],
        fgtrMints: [],
        fgtBurns: [],
        fgtrBurns: [],
        fgtLocks: []
      }
    }

    const PAGE_SIZE = 100
    const records = []

    for (let offset = 0; offset < totalRecords; offset += PAGE_SIZE) {
      setFetchProgress(`${progressPrefix} ${Math.min(offset + PAGE_SIZE, totalRecords)}/${totalRecords}`)
      const batch = await controller.getUserTokenRecords(user, offset, PAGE_SIZE)
      records.push(...batch)
    }

    // Fetch events to get transaction hashes
    setFetchProgress('Fetching transaction details...')
    const events = await fetchEventLogs(controller, user)

    // Merge records with events
    return processStoredRecordsWithEvents(records, events)
  }, [fetchEventLogs, processStoredRecordsWithEvents])

  // Load full history on demand
  const loadFullHistory = async () => {
    setShowFullHistory(true)
    if (fullHistoryLoaded || !contracts?.tokenController || !account) return

    setIsLoadingFullHistory(true)
    setPageError('')

    try {
      const fullHistory = await fetchStoredHistory(
        contracts.tokenController,
        account,
        'Loading full history...'
      )

      setHistory(fullHistory)
      setFullHistoryLoaded(true)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Error loading full history:', err)
      setPageError('Failed to load full history. Please try again.')
    } finally {
      setIsLoadingFullHistory(false)
      setFetchProgress('')
    }
  }

  useEffect(() => {
    const fetchTokenData = async () => {
      if (!isConnected || !account || !contracts?.tokenController) {
        setIsFetching(false)
        return
      }

      setIsFetching(true)
      setPageError('')
      setFetchProgress('Fetching balances...')

      try {
        setFetchProgress('Loading token balances...')

        const [
          fgtBalances,
          fgtrBalances,
          totalFGTMinted,
          totalFGTrMinted,
          totalFGTBurned,
          totalFGTrBurned,
          totalFGTLocked,
          fgtMintCount,
          fgtrMintCount,
          fgtBurnCount,
          fgtrBurnCount,
          fgtLockCount
        ] = await Promise.all([
          contracts.tokenController.getFGTBalances(account).catch(() => [0, 0, 0]),
          contracts.tokenController.getFGTrBalances(account).catch(() => [0, 0, 0]),
          contracts.tokenController.totalFGTMinted(account).catch(() => 0),
          contracts.tokenController.totalFGTrMinted(account).catch(() => 0),
          contracts.tokenController.totalFGTBurned(account).catch(() => 0),
          contracts.tokenController.totalFGTrBurned(account).catch(() => 0),
          contracts.tokenController.totalFGTLocked(account).catch(() => 0),
          contracts.tokenController.getFGTMintCount(account).catch(() => 0),
          contracts.tokenController.getFGTrMintCount(account).catch(() => 0),
          contracts.tokenController.getFGTBurnCount(account).catch(() => 0),
          contracts.tokenController.getFGTrBurnCount(account).catch(() => 0),
          contracts.tokenController.getFGTLockCount(account).catch(() => 0)
        ])

        setBalances({
          fgtTotal: fgtBalances[0] || 0,
          fgtLocked: fgtBalances[1] || 0,
          fgtAvailable: fgtBalances[2] || 0,
          fgtrTotal: fgtrBalances[0] || 0,
          fgtrLocked: fgtrBalances[1] || 0,
          fgtrAvailable: fgtrBalances[2] || 0,
          totalFGTMinted,
          totalFGTrMinted,
          totalFGTBurned,
          totalFGTrBurned,
          totalFGTLocked
        })

        setRecordCounts({
          fgtMints: Number(fgtMintCount),
          fgtrMints: Number(fgtrMintCount),
          fgtBurns: Number(fgtBurnCount),
          fgtrBurns: Number(fgtrBurnCount),
          fgtLocks: Number(fgtLockCount)
        })

        setFetchProgress('Loading token history...')

        const storedHistory = await fetchStoredHistory(
          contracts.tokenController,
          account,
          'Loading token history...'
        )

        setHistory(storedHistory)
        setFullHistoryLoaded(true)
        setLastUpdated(new Date().toLocaleTimeString())
        setFetchProgress('')
      } catch (err) {
        console.error('Error fetching token data:', err)
        setPageError(err?.reason || err?.message || 'Failed to load token data. Please try refreshing.')
      } finally {
        setIsFetching(false)
        setFetchProgress('')
      }
    }

    fetchTokenData()
  }, [isConnected, account, contracts, fetchStoredHistory])

  const summaryCards = useMemo(() => [
    {
      title: 'FGT – Activation Rewards',
      value: formatToken(balances.fgtTotal),
      subtitle: `Available ${formatToken(balances.fgtAvailable)} • Locked ${formatToken(balances.fgtLocked)}`,
      accent: '#002366'
    },
    {
      title: 'FGTr – Recycle Rewards',
      value: formatToken(balances.fgtrTotal),
      subtitle: `Available ${formatToken(balances.fgtrAvailable)}`,
      accent: '#198754'
    },
    {
      title: 'FGT Burned',
      value: formatToken(balances.totalFGTBurned),
      subtitle: 'Utility burns recorded on-chain',
      accent: '#dc3545'
    },
    {
      title: 'FGT Locked',
      value: formatToken(balances.totalFGTLocked),
      subtitle: 'Locked for NFT / utility usage',
      accent: '#fd7e14'
    }
  ], [balances])

  const pageStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
   
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
    }
   
    .token-card {
      border: none;
      border-radius: 32px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 35, 102, 0.15);
      background: rgba(255,255,255,0.98);
      backdrop-filter: blur(16px);
      transition: transform 0.2s ease;
    }
   
    .token-card:hover {
      transform: translateY(-2px);
    }
   
    .token-hero {
      background: linear-gradient(135deg, #001b52 0%, #002366 45%, #2b4db3 100%);
      color: white;
      border-radius: 40px;
      padding: 36px;
      box-shadow: 0 30px 60px -15px rgba(0, 35, 102, 0.3);
      position: relative;
      overflow: hidden;
    }
   
    .token-hero::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
      border-radius: 50%;
      pointer-events: none;
    }
   
    .token-hero::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -5%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(255,213,79,0.08) 0%, rgba(255,213,79,0) 70%);
      border-radius: 50%;
      pointer-events: none;
    }
   
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(2deg); }
    }
   
    .token-stat {
      border-radius: 28px;
      background: white;
      box-shadow: 0 20px 40px -12px rgba(0, 35, 102, 0.12);
      padding: 24px;
      height: 100%;
      border: 1px solid rgba(0, 35, 102, 0.06);
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
   
    .token-stat:hover {
      box-shadow: 0 30px 60px -15px rgba(0, 35, 102, 0.2);
    }
   
    .token-stat-value {
      font-size: 2.2rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
   
    .timeline-row {
      border-left: 4px solid #002366;
      background: linear-gradient(90deg, rgba(248,249,252,0.98) 0%, rgba(255,255,255,1) 100%);
      border-radius: 24px;
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 15px 35px -10px rgba(0, 35, 102, 0.1);
      transition: all 0.3s ease;
      position: relative;
    }
   
    .timeline-row:hover {
      transform: translateX(4px);
      box-shadow: 0 20px 45px -10px rgba(0, 35, 102, 0.15);
    }
   
    .timeline-row::before {
      content: '';
      position: absolute;
      left: -2px;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 80%;
      background: linear-gradient(180deg, #002366, #4a6fd4);
      border-radius: 4px;
    }
   
    .soft-note {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      border-radius: 24px;
      padding: 18px 22px;
      box-shadow: 0 15px 30px -10px rgba(0,0,0,0.2);
    }
   
    .table-modern thead th {
      background: linear-gradient(90deg, #f0f5ff, #f8faff);
      color: #002366;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 2px solid #e0e7ff;
      padding: 16px 12px;
    }
   
    .table-modern td {
      padding: 16px 12px;
      border-bottom: 1px solid #edf2f9;
    }
   
    .progress-badge {
      background: linear-gradient(135deg, rgba(0,35,102,0.1), rgba(0,35,102,0.05));
      color: #002366;
      padding: 10px 20px;
      border-radius: 40px;
      font-size: 0.9rem;
      font-weight: 600;
    }
   
    .floating-decoration {
      position: absolute;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }
   
    .floating-decoration-1 {
      position: absolute;
      top: 10%;
      left: 5%;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(255,213,79,0.1) 0%, rgba(255,213,79,0) 70%);
      border-radius: 50%;
      animation: float 8s ease-in-out infinite;
    }
   
    .floating-decoration-2 {
      position: absolute;
      bottom: 15%;
      right: 8%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(0,35,102,0.05) 0%, rgba(0,35,102,0) 70%);
      border-radius: 50%;
      animation: float 10s ease-in-out infinite reverse;
    }
   
    .welcome-modal .modal-content {
      border-radius: 40px;
      overflow: hidden;
      border: none;
      box-shadow: 0 50px 100px -20px rgba(0,35,102,0.3);
    }
   
    .welcome-modal .modal-header {
      background: linear-gradient(135deg, #001b52, #002366);
      color: white;
      border: none;
      padding: 24px 32px;
    }
   
    .welcome-modal .modal-body {
      padding: 32px;
      background: linear-gradient(135deg, #f8faff, #ffffff);
    }
   
    .welcome-modal .modal-footer {
      border: none;
      padding: 24px 32px;
      background: #f8faff;
    }
   
    .see-more-btn {
      background: linear-gradient(135deg, #f0f5ff, #ffffff);
      border: 1px solid #00236620;
      color: #002366;
      padding: 10px 24px;
      border-radius: 40px;
      font-weight: 600;
      transition: all 0.3s ease;
      margin-top: 16px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
   
    .see-more-btn:hover {
      background: linear-gradient(135deg, #e0e9ff, #f5f8ff);
      border-color: #002366;
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -8px rgba(0,35,102,0.2);
    }
   
    .load-full-history-btn {
      background: linear-gradient(135deg, #002366, #2b4db3);
      border: none;
      color: white;
      padding: 14px 32px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 1.1rem;
      transition: all 0.3s ease;
      box-shadow: 0 10px 25px -8px rgba(0,35,102,0.3);
    }
   
    .load-full-history-btn:hover {
      background: linear-gradient(135deg, #001b52, #1a3a8c);
      transform: translateY(-2px);
      box-shadow: 0 15px 30px -8px rgba(0,35,102,0.4);
    }
   
    .load-full-history-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }
   
    .see-more-container {
      display: flex;
      justify-content: center;
      width: 100%;
    }
  `

  const toggleTableDisplay = (tabKey) => {
    setShowAllTables(prev => ({
      ...prev,
      [tabKey]: !prev[tabKey]
    }))
  }

  if (!isConnected) {
    return (
      <Container className="mt-5 pt-5">
        <style>{pageStyles}</style>
        <div className="floating-decoration">
          <div className="floating-decoration-1"></div>
          <div className="floating-decoration-2"></div>
        </div>
        <Alert variant="primary" className="text-center p-5 token-card" style={{ position: 'relative', zIndex: 1 }}>
          <h4 className="fw-bold mb-2">Connect your wallet</h4>
          <p className="m-0">Your token rewards page will appear here once your wallet is connected.</p>
        </Alert>
      </Container>
    )
  }

  if (isLoading || isFetching) {
    return (
      <Container className="mt-5 pt-4">
        <style>{pageStyles}</style>
        <div className="floating-decoration">
          <div className="floating-decoration-1"></div>
          <div className="floating-decoration-2"></div>
        </div>
        <div className="text-center py-5" style={{ position: 'relative', zIndex: 1 }}>
          <Spinner animation="border" variant="primary" style={{ width: '4rem', height: '4rem' }} />
          <p className="mt-3 fw-bold text-muted">{fetchProgress || 'Loading your token rewards...'}</p>
        </div>
      </Container>
    )
  }

  if (error || pageError) {
    return (
      <Container className="mt-5 pt-4">
        <style>{pageStyles}</style>
        <div className="floating-decoration">
          <div className="floating-decoration-1"></div>
          <div className="floating-decoration-2"></div>
        </div>
        <Alert variant="danger" className="token-card" style={{ position: 'relative', zIndex: 1 }}>
          <strong>Unable to load token data:</strong> {error || pageError}
          <div className="mt-3">
            <Button
              variant="outline-primary"
              onClick={() => window.location.reload()}
              size="sm"
              className="rounded-pill px-4"
            >
              Try Again
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="mt-5 pt-4 pb-5" style={{ position: 'relative' }}>
      <style>{pageStyles}</style>
     
      <div className="floating-decoration">
        <div className="floating-decoration-1"></div>
        <div className="floating-decoration-2"></div>
      </div>

      {/* Welcome Modal - Non-intrusive, can be dismissed */}
      <Modal show={showWelcomeModal} onHide={() => setShowWelcomeModal(false)} centered className="welcome-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="fw-bold">Welcome to Your Token Dashboard</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <h5 className="mb-3">Track Your Rewards Journey</h5>
          <p className="text-muted mb-0">
            Here you'll find all your FGT activation rewards, FGTr recycle rewards,
            and token utility history. Each entry tells the story of your protocol participation.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowWelcomeModal(false)} className="rounded-pill px-4">
            Got it, thanks!
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Hero Section */}
      <div className="token-hero mb-4 mt-4">
        <Row className="align-items-center position-relative" style={{ zIndex: 2 }}>
          <Col lg={8}>
            <div className="d-flex align-items-center mb-3">
              <div style={{ height: '42px', width: '10px', background: '#ffd54f', marginRight: '20px', borderRadius: '10px' }}></div>
              <h1 className="m-0 fw-black text-uppercase" style={{ letterSpacing: '2px', fontSize: '2.5rem' }}>
                My Tokens
              </h1>
            </div>
            <p className="mb-3 opacity-90" style={{ maxWidth: '860px', fontSize: '1.1rem' }}>
              This page shows your FGT activation rewards, your FGTr recycle rewards, your burned utility tokens,
              and your locked FGT used for NFT or ecosystem utility flows. Each record is presented as a readable
              on-chain narrative so you can see what happened, why it happened, and which level triggered it.
            </p>
            <div className="small opacity-75">
              Wallet: <strong>{shortAddress(account)}</strong> {lastUpdated ? `• Last synced: ${lastUpdated}` : ''}
            </div>
          </Col>

          <Col lg={4}>
            <div className="soft-note mt-3 mt-lg-0">
              The token reward layer records the protocol action, amount, reason, level, and time.
              Direct payer wallet details are not emitted by the token contracts, so this page narrates the exact
              qualifying system event instead.
            </div>
          </Col>
        </Row>
      </div>

      {/* Summary Cards */}
      <Row className="g-4 mb-4">
        {summaryCards.map((card) => (
          <Col md={6} xl={3} key={card.title}>
            <div className="token-stat">
              <div className="small text-uppercase fw-bold text-muted mb-2">{card.title}</div>
              <div className="token-stat-value" style={{ color: card.accent }}>{card.value}</div>
              <div className="small text-muted">{card.subtitle}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Mint Summary and Info Cards */}
      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="token-card h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4" style={{ color: '#002366' }}>Mint Summary</h5>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span>Total FGT Minted</span>
                <strong>{formatToken(balances.totalFGTMinted)}</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span>Total FGTr Minted</span>
                <strong>{formatToken(balances.totalFGTrMinted)}</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span>Total FGTr Burned</span>
                <strong>{formatToken(balances.totalFGTrBurned)}</strong>
              </div>
              <div className="d-flex justify-content-between py-2">
                <span>Current FGT Available</span>
                <strong>{formatToken(balances.fgtAvailable)}</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="token-card h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4" style={{ color: '#002366' }}>What these tokens mean</h5>
              <div className="mb-3"><strong>FGT</strong> is your activation reward token. It appears when a level activates manually,  or through auto-upgrade.</div>
              <div className="mb-3"><strong>FGTr</strong> is your recycle reward token. It appears after a recycle cycle completes and the orbit resets successfully.</div>
              <div><strong>Burned / Locked</strong> entries show utility usage history. Burn means consumed for utility. Lock means reserved for NFT or another supported utility flow.</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Timeline with See More/Less */}
      <Card className="token-card mb-4">
        <Card.Body className="p-4">
          <h5 className="fw-bold mb-4" style={{ color: '#002366' }}>Reward Timeline ({history.timeline.length} events)</h5>

          {history.timeline.length === 0 ? (
            <Alert variant="light" className="mb-0 text-center p-4">
              <p className="mb-0">No token activity has been found for this wallet yet.</p>
              {!fullHistoryLoaded && !showFullHistory && (
                <div className="mt-3">
                  <Button
                    variant="primary"
                    onClick={loadFullHistory}
                    disabled={isLoadingFullHistory}
                    className="load-full-history-btn"
                  >
                    {isLoadingFullHistory ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading full history...
                      </>
                    ) : (
                      '🔍 Load Complete Transaction History'
                    )}
                  </Button>
                </div>
              )}
            </Alert>
          ) : (
            <>
              {(showAllTimeline ? history.timeline : history.timeline.slice(0, 2)).map((entry) => (
                <div className="timeline-row" key={entry.id}>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <Badge bg={reasonVariant(entry.reason)}>{entry.token}</Badge>
                      <Badge bg="dark">{entry.reasonText}</Badge>
                      {typeof entry.level === 'number' && <Badge bg="info">Level {entry.level}</Badge>}
                      <Badge bg="secondary">{entry.amountFormatted}</Badge>
                    </div>

                    <div className="small text-muted">
                      {formatDateTime(entry.timestamp)}
                    </div>
                  </div>

                  <div className="fw-semibold mb-1">{entry.narrative}</div>
                  <div className="small text-muted">
                    <a 
                      href={entry.txHash ? `https://amoy.polygonscan.com/tx/${entry.txHash}` : `https://amoy.polygonscan.com/address/${entry.user}#internaltx`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#002366', textDecoration: 'none' }}
                    >
                      Tx: {entry.txHash ? shortAddress(entry.txHash) : '🔍 View on Explorer'}
                    </a> • Source: {entry.source}
                  </div>
                </div>
              ))}
             
              {history.timeline.length > 2 && (
                <div className="see-more-container">
                  <Button
                    variant="light"
                    onClick={() => setShowAllTimeline(!showAllTimeline)}
                    className="see-more-btn"
                  >
                    {showAllTimeline ? (
                      <>↑ Show Less</>
                    ) : (
                      <>↓ See More ({history.timeline.length - 2} more events)</>
                    )}
                  </Button>
                </div>
              )}

              {/* Load Full History Button (shown if not already loaded) */}
              {!fullHistoryLoaded && !showFullHistory && (
                <div className="see-more-container mt-4">
                  <Button
                    variant="primary"
                    onClick={loadFullHistory}
                    disabled={isLoadingFullHistory}
                    className="load-full-history-btn"
                  >
                    {isLoadingFullHistory ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {fetchProgress || 'Loading full history...'}
                      </>
                    ) : (
                      '🔍 Load Complete Transaction History'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Detailed Records with See More/Less per tab */}
      <Card className="token-card">
        <Card.Body className="p-4">
          <h5 className="fw-bold mb-4" style={{ color: '#002366' }}>Detailed Token Records</h5>

          <Tabs defaultActiveKey="fgt-earned" className="mb-3" onSelect={() => setShowAllTables({})}>
            <Tab eventKey="fgt-earned" title={`FGT Earned (${recordCounts.fgtMints})`}>
              <RecordTable
                records={history.fgtMints}
                formatDateTime={formatDateTime}
                reasonVariant={reasonVariant}
                showAll={showAllTables['fgt-earned'] || false}
                onToggle={() => toggleTableDisplay('fgt-earned')}
              />
            </Tab>

            <Tab eventKey="fgtr-earned" title={`FGTr Earned (${recordCounts.fgtrMints})`}>
              <RecordTable
                records={history.fgtrMints}
                formatDateTime={formatDateTime}
                reasonVariant={reasonVariant}
                showAll={showAllTables['fgtr-earned'] || false}
                onToggle={() => toggleTableDisplay('fgtr-earned')}
              />
            </Tab>

            <Tab eventKey="fgt-burned" title={`FGT Burned (${recordCounts.fgtBurns})`}>
              <RecordTable
                records={history.fgtBurns}
                formatDateTime={formatDateTime}
                reasonVariant={reasonVariant}
                showAll={showAllTables['fgt-burned'] || false}
                onToggle={() => toggleTableDisplay('fgt-burned')}
              />
            </Tab>

            <Tab eventKey="fgtr-burned" title={`FGTr Burned (${recordCounts.fgtrBurns})`}>
              <RecordTable
                records={history.fgtrBurns}
                formatDateTime={formatDateTime}
                reasonVariant={reasonVariant}
                showAll={showAllTables['fgtr-burned'] || false}
                onToggle={() => toggleTableDisplay('fgtr-burned')}
              />
            </Tab>

            <Tab eventKey="fgt-locked" title={`FGT Locked (${recordCounts.fgtLocks})`}>
              <RecordTable
                records={history.fgtLocks}
                formatDateTime={formatDateTime}
                reasonVariant={reasonVariant}
                showAll={showAllTables['fgt-locked'] || false}
                onToggle={() => toggleTableDisplay('fgt-locked')}
              />
            </Tab>
          </Tabs>

          {/* Load Full History Button for detailed records (if not already loaded) */}
          {!fullHistoryLoaded && !showFullHistory && history.fgtMints.length === 0 && history.fgtrMints.length === 0 && (
            <div className="see-more-container mt-4">
              <Button
                variant="primary"
                onClick={loadFullHistory}
                disabled={isLoadingFullHistory}
                className="load-full-history-btn"
              >
                {isLoadingFullHistory ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {fetchProgress || 'Loading full history...'}
                  </>
                ) : (
                  '🔍 Load Complete Transaction History'
                )}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  )
}

const RecordTable = ({ records, formatDateTime, reasonVariant, showAll, onToggle }) => {
  const displayRecords = showAll ? records : records.slice(0, 2)

  if (!records.length) {
    return (
      <Alert variant="light" className="mb-0 text-center p-4">
        <p className="mb-0">No records found in this category.</p>
      </Alert>
    )
  }

  // Function to get explorer link based on available data
  const getExplorerLink = (entry) => {
    if (entry.txHash) {
      return `https://amoy.polygonscan.com/tx/${entry.txHash}`
    } else if (entry.blockNumber && entry.blockNumber > 0) {
      return `https://amoy.polygonscan.com/block/${entry.blockNumber}`
    } else {
      // Search by address with date
      const date = new Date(entry.timestamp * 1000)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `https://amoy.polygonscan.com/address/${entry.user}?fromDate=${year}-${month}-${day}&toDate=${year}-${month}-${day}`
    }
  }

  // Function to get display text
  const getDisplayText = (entry) => {
    if (entry.txHash) {
      return entry.txHash.slice(0, 8) + '...' + entry.txHash.slice(-6)
    } else if (entry.blockNumber && entry.blockNumber > 0) {
      return `Block #${entry.blockNumber}`
    } else {
      return '🔍 Find on Explorer'
    }
  }

  // Function to get badge variant
  const getBadgeVariant = (entry) => {
    if (entry.txHash) return 'primary'
    if (entry.blockNumber && entry.blockNumber > 0) return 'info'
    return 'success'
  }

  return (
    <>
      <div className="table-responsive">
        <Table hover className="align-middle table-modern mb-0">
          <thead>
            <tr>
              <th>Token</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Level</th>
              <th>When</th>
              <th>Transaction</th>
            </tr>
          </thead>
          <tbody>
            {displayRecords.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <strong>{entry.token}</strong>
                </td>
                <td>{entry.amountFormatted}</td>
                <td>
                  <Badge bg={reasonVariant(entry.reason)}>
                    {entry.reasonText}
                  </Badge>
                </td>
                <td>{typeof entry.level === 'number' ? `Level ${entry.level}` : '—'}</td>
                <td>{formatDateTime(entry.timestamp)}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  <a 
                    href={getExplorerLink(entry)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                    title={entry.txHash ? 'View transaction' : 'Search on Polygonscan'}
                  >
                    <Badge 
                      bg={getBadgeVariant(entry)}
                      style={{ fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      {getDisplayText(entry)}
                    </Badge>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
     
      {records.length > 2 && (
        <div className="see-more-container">
          <Button
            variant="light"
            onClick={onToggle}
            className="see-more-btn"
          >
            {showAll ? (
              <>↑ Show Less</>
            ) : (
              <>↓ See More ({records.length - 2} more records)</>
            )}
          </Button>
        </div>
      )}
    </>
  )
}











// import React, { useEffect, useMemo, useState, useCallback } from 'react'
// import { Alert, Badge, Card, Col, Container, Row, Spinner, Table, Tabs, Tab, Modal, Button } from 'react-bootstrap'
// import { ethers } from 'ethers'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'

// export const MyTokens = () => {
//   const { isConnected, account } = useWallet()
//   const { contracts, loadContracts, isLoading, error } = useContracts()

//   const [isFetching, setIsFetching] = useState(true)
//   const [isLoadingFullHistory, setIsLoadingFullHistory] = useState(false)
//   const [pageError, setPageError] = useState('')
//   const [lastUpdated, setLastUpdated] = useState('')
//   const [showWelcomeModal, setShowWelcomeModal] = useState(true)
//   const [showAllTimeline, setShowAllTimeline] = useState(false)
//   const [showAllTables, setShowAllTables] = useState({})
//   const [showFullHistory, setShowFullHistory] = useState(false)
//   const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false)
//   const [balances, setBalances] = useState({
//     fgtTotal: '0',
//     fgtLocked: '0',
//     fgtAvailable: '0',
//     fgtrTotal: '0',
//     fgtrLocked: '0',
//     fgtrAvailable: '0',
//     totalFGTMinted: '0',
//     totalFGTrMinted: '0',
//     totalFGTBurned: '0',
//     totalFGTrBurned: '0',
//     totalFGTLocked: '0'
//   })
//   const [recordCounts, setRecordCounts] = useState({
//     fgtMints: 0,
//     fgtrMints: 0,
//     fgtBurns: 0,
//     fgtrBurns: 0,
//     fgtLocks: 0
//   })
//   const [history, setHistory] = useState({
//     timeline: [],
//     fgtMints: [],
//     fgtrMints: [],
//     fgtBurns: [],
//     fgtrBurns: [],
//     fgtLocks: []
//   })
//   const [fetchProgress, setFetchProgress] = useState('')

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const formatToken = (value) => {
//     try {
//       return Number(ethers.formatUnits(value || 0, 6)).toLocaleString(undefined, {
//         minimumFractionDigits: 0,
//         maximumFractionDigits: 6
//       })
//     } catch {
//       return '0'
//     }
//   }

//   const shortAddress = (address) => {
//     if (!address) return '—'
//     return `${address.slice(0, 8)}...${address.slice(-6)}`
//   }

//   const formatDateTime = (timestamp) => {
//     if (!timestamp) return '—'
//     return new Date(timestamp * 1000).toLocaleString()
//   }

//   const reasonLabel = (reason) => {
//     const labels = {
//       manualActivation: 'Manual activation reward',
//       autoUpgrade: 'Auto-upgrade reward',
//       founderActivation: 'Founder free activation reward',
//       recycleReward: 'Recycle completion reward',
//       raffleBurn: 'Raffle burn',
//       NFTLock: 'NFT utility lock'
//     }

//     return labels[reason] || reason || 'Protocol event'
//   }

//   const reasonVariant = (reason) => {
//     if (reason === 'manualActivation' || reason === 'autoUpgrade' || reason === 'founderActivation') return 'primary'
//     if (reason === 'recycleReward') return 'success'
//     if (reason?.toLowerCase()?.includes('burn')) return 'danger'
//     if (reason?.toLowerCase()?.includes('lock') || reason === 'NFTLock') return 'warning'
//     return 'secondary'
//   }

//   const buildNarrative = (entry) => {
//     if (entry.kind === 'FGT_MINT') {
//       if (entry.reason === 'manualActivation') {
//         return `You activated Level ${entry.level} manually and earned ${entry.amountFormatted} FGT.`
//       }
//       if (entry.reason === 'autoUpgrade') {
//         return `Your auto-upgrade completed into Level ${entry.level} and the protocol minted ${entry.amountFormatted} FGT to your wallet.`
//       }
//       if (entry.reason === 'founderActivation') {
//         return `A founder representative free activation occurred on Level ${entry.level}, and ${entry.amountFormatted} FGT was minted to your wallet.`
//       }
//       return `You received ${entry.amountFormatted} FGT on Level ${entry.level}.`
//     }

//     if (entry.kind === 'FGTR_MINT') {
//       return `Your orbit completed a recycle on Level ${entry.level}, and ${entry.amountFormatted} FGTr was minted as your recycle reward.`
//     }

//     if (entry.kind === 'FGT_BURN') {
//       return `${entry.amountFormatted} FGT was burned for utility usage under reason: ${reasonLabel(entry.reason)}.`
//     }

//     if (entry.kind === 'FGTR_BURN') {
//       return `${entry.amountFormatted} FGTr was burned for utility usage under reason: ${reasonLabel(entry.reason)}.`
//     }

//     if (entry.kind === 'FGT_LOCK') {
//       return `${entry.amountFormatted} FGT was locked for ecosystem utility under reason: ${reasonLabel(entry.reason)}.`
//     }

//     return 'Protocol activity recorded.'
//   }

//   const decodeReason = (value) => {
//     try {
//       if (!value || value === ethers.ZeroHash) return ''
//       return ethers.decodeBytes32String(value)
//     } catch {
//       try {
//         const bytes = ethers.getBytes(value)
//         const filtered = bytes.filter((b) => b !== 0)
//         return new TextDecoder().decode(new Uint8Array(filtered))
//       } catch {
//         return ''
//       }
//     }
//   }

//   const processStoredRecords = useCallback((records) => {
//     const parsedFGTMints = []
//     const parsedFGTrMints = []
//     const parsedFGTBurns = []
//     const parsedFGTrBurns = []
//     const parsedFGTLocks = []

//     records.forEach((record, index) => {
//       const recordType = Number(record.recordType ?? record[0] ?? 0)
//       const level = Number(record.level ?? record[1] ?? 0)
//       const timestamp = Number(record.timestamp ?? record[2] ?? 0)
//       const amount = record.amount ?? record[3] ?? 0
//       const reasonRaw = record.reason ?? record[4] ?? ethers.ZeroHash
//       const reason = decodeReason(reasonRaw)

//       const baseEntry = {
//         id: `stored-record-${index}`,
//         user: account,
//         level: level > 0 ? level : undefined,
//         amount,
//         amountFormatted: formatToken(amount),
//         reason,
//         reasonText: reasonLabel(reason),
//         timestamp,
//         blockNumber: 0,
//         txHash: '',
//         source: 'Stored controller history'
//       }

//       if (recordType === 1) {
//         parsedFGTMints.push({
//           ...baseEntry,
//           kind: 'FGT_MINT',
//           token: 'FGT',
//           source: 'Activation reward'
//         })
//       } else if (recordType === 2) {
//         parsedFGTrMints.push({
//           ...baseEntry,
//           kind: 'FGTR_MINT',
//           token: 'FGTr',
//           source: 'Recycle reward'
//         })
//       } else if (recordType === 3) {
//         parsedFGTBurns.push({
//           ...baseEntry,
//           kind: 'FGT_BURN',
//           token: 'FGT',
//           source: 'Utility burn'
//         })
//       } else if (recordType === 4) {
//         parsedFGTrBurns.push({
//           ...baseEntry,
//           kind: 'FGTR_BURN',
//           token: 'FGTr',
//           source: 'Utility burn'
//         })
//       } else if (recordType === 5) {
//         parsedFGTLocks.push({
//           ...baseEntry,
//           kind: 'FGT_LOCK',
//           token: 'FGT',
//           source: 'NFT / utility lock'
//         })
//       }
//     })

//     const timeline = [
//       ...parsedFGTMints,
//       ...parsedFGTrMints,
//       ...parsedFGTBurns,
//       ...parsedFGTrBurns,
//       ...parsedFGTLocks
//     ]
//       .map((entry) => ({
//         ...entry,
//         narrative: buildNarrative(entry)
//       }))
//       .sort((a, b) => {
//         if ((b.timestamp || 0) !== (a.timestamp || 0)) return (b.timestamp || 0) - (a.timestamp || 0)
//         return b.id.localeCompare(a.id)
//       })

//     return {
//       timeline,
//       fgtMints: parsedFGTMints,
//       fgtrMints: parsedFGTrMints,
//       fgtBurns: parsedFGTBurns,
//       fgtrBurns: parsedFGTrBurns,
//       fgtLocks: parsedFGTLocks
//     }
//   }, [account])

//   const fetchStoredHistory = useCallback(async (controller, user, progressPrefix = 'Loading token history...') => {
//     const totalRecords = Number(await controller.getUserTokenRecordCount(user))
//     if (totalRecords === 0) {
//       return {
//         timeline: [],
//         fgtMints: [],
//         fgtrMints: [],
//         fgtBurns: [],
//         fgtrBurns: [],
//         fgtLocks: []
//       }
//     }

//     const PAGE_SIZE = 100
//     const records = []

//     for (let offset = 0; offset < totalRecords; offset += PAGE_SIZE) {
//       setFetchProgress(`${progressPrefix} ${Math.min(offset + PAGE_SIZE, totalRecords)}/${totalRecords}`)
//       const batch = await controller.getUserTokenRecords(user, offset, PAGE_SIZE)
//       records.push(...batch)
//     }

//     return processStoredRecords(records)
//   }, [processStoredRecords])

//   // Load full history on demand
//   const loadFullHistory = async () => {
//     setShowFullHistory(true)
//     if (fullHistoryLoaded || !contracts?.tokenController || !account) return

//     setIsLoadingFullHistory(true)
//     setPageError('')

//     try {
//       const fullHistory = await fetchStoredHistory(
//         contracts.tokenController,
//         account,
//         'Loading full history...'
//       )

//       setHistory(fullHistory)
//       setFullHistoryLoaded(true)
//       setLastUpdated(new Date().toLocaleTimeString())
//     } catch (err) {
//       console.error('Error loading full history:', err)
//       setPageError('Failed to load full history. Please try again.')
//     } finally {
//       setIsLoadingFullHistory(false)
//       setFetchProgress('')
//     }
//   }

//   useEffect(() => {
//     const fetchTokenData = async () => {
//       if (!isConnected || !account || !contracts?.tokenController) {
//         setIsFetching(false)
//         return
//       }

//       setIsFetching(true)
//       setPageError('')
//       setFetchProgress('Fetching balances...')

//       try {
//         setFetchProgress('Loading token balances...')

//         const [
//           fgtBalances,
//           fgtrBalances,
//           totalFGTMinted,
//           totalFGTrMinted,
//           totalFGTBurned,
//           totalFGTrBurned,
//           totalFGTLocked,
//           // Add the new count functions
//           fgtMintCount,
//           fgtrMintCount,
//           fgtBurnCount,
//           fgtrBurnCount,
//           fgtLockCount
//         ] = await Promise.all([
//           contracts.tokenController.getFGTBalances(account).catch(() => [0, 0, 0]),
//           contracts.tokenController.getFGTrBalances(account).catch(() => [0, 0, 0]),
//           contracts.tokenController.totalFGTMinted(account).catch(() => 0),
//           contracts.tokenController.totalFGTrMinted(account).catch(() => 0),
//           contracts.tokenController.totalFGTBurned(account).catch(() => 0),
//           contracts.tokenController.totalFGTrBurned(account).catch(() => 0),
//           contracts.tokenController.totalFGTLocked(account).catch(() => 0),
//           // These are the new functions we added to the contract
//           contracts.tokenController.getFGTMintCount(account).catch(() => 0),
//           contracts.tokenController.getFGTrMintCount(account).catch(() => 0),
//           contracts.tokenController.getFGTBurnCount(account).catch(() => 0),
//           contracts.tokenController.getFGTrBurnCount(account).catch(() => 0),
//           contracts.tokenController.getFGTLockCount(account).catch(() => 0)
//         ])

//         setBalances({
//           fgtTotal: fgtBalances[0] || 0,
//           fgtLocked: fgtBalances[1] || 0,
//           fgtAvailable: fgtBalances[2] || 0,
//           fgtrTotal: fgtrBalances[0] || 0,
//           fgtrLocked: fgtrBalances[1] || 0,
//           fgtrAvailable: fgtrBalances[2] || 0,
//           totalFGTMinted,
//           totalFGTrMinted,
//           totalFGTBurned,
//           totalFGTrBurned,
//           totalFGTLocked
//         })

//         // Set the counts from the contract
//         setRecordCounts({
//           fgtMints: Number(fgtMintCount),
//           fgtrMints: Number(fgtrMintCount),
//           fgtBurns: Number(fgtBurnCount),
//           fgtrBurns: Number(fgtrBurnCount),
//           fgtLocks: Number(fgtLockCount)
//         })

//         setFetchProgress('Loading token history...')

//         const storedHistory = await fetchStoredHistory(
//           contracts.tokenController,
//           account,
//           'Loading token history...'
//         )

//         setHistory(storedHistory)
//         setFullHistoryLoaded(true)
//         setLastUpdated(new Date().toLocaleTimeString())
//         setFetchProgress('')
//       } catch (err) {
//         console.error('Error fetching token data:', err)
//         setPageError(err?.reason || err?.message || 'Failed to load token data. Please try refreshing.')
//       } finally {
//         setIsFetching(false)
//         setFetchProgress('')
//       }
//     }

//     fetchTokenData()
//   }, [isConnected, account, contracts, fetchStoredHistory])

//   const summaryCards = useMemo(() => [
//     {
//       title: 'FGT – Activation Rewards',
//       value: formatToken(balances.fgtTotal),
//       subtitle: `Available ${formatToken(balances.fgtAvailable)} • Locked ${formatToken(balances.fgtLocked)}`,
//       accent: '#002366'
//     },
//     {
//       title: 'FGTr – Recycle Rewards',
//       value: formatToken(balances.fgtrTotal),
//       subtitle: `Available ${formatToken(balances.fgtrAvailable)}`,
//       accent: '#198754'
//     },
//     {
//       title: 'FGT Burned',
//       value: formatToken(balances.totalFGTBurned),
//       subtitle: 'Utility burns recorded on-chain',
//       accent: '#dc3545'
//     },
//     {
//       title: 'FGT Locked',
//       value: formatToken(balances.totalFGTLocked),
//       subtitle: 'Locked for NFT / utility usage',
//       accent: '#fd7e14'
//     }
//   ], [balances])

//   const pageStyles = `
//     @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
   
//     body {
//       font-family: 'Inter', sans-serif;
//       background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
//     }
   
//     .token-card {
//       border: none;
//       border-radius: 32px;
//       overflow: hidden;
//       box-shadow: 0 25px 50px -12px rgba(0, 35, 102, 0.15);
//       background: rgba(255,255,255,0.98);
//       backdrop-filter: blur(16px);
//       transition: transform 0.2s ease;
//     }
   
//     .token-card:hover {
//       transform: translateY(-2px);
//     }
   
//     .token-hero {
//       background: linear-gradient(135deg, #001b52 0%, #002366 45%, #2b4db3 100%);
//       color: white;
//       border-radius: 40px;
//       padding: 36px;
//       box-shadow: 0 30px 60px -15px rgba(0, 35, 102, 0.3);
//       position: relative;
//       overflow: hidden;
//     }
   
//     .token-hero::before {
//       content: '';
//       position: absolute;
//       top: -50%;
//       right: -10%;
//       width: 600px;
//       height: 600px;
//       background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
//       border-radius: 50%;
//       pointer-events: none;
//     }
   
//     .token-hero::after {
//       content: '';
//       position: absolute;
//       bottom: -30%;
//       left: -5%;
//       width: 400px;
//       height: 400px;
//       background: radial-gradient(circle, rgba(255,213,79,0.08) 0%, rgba(255,213,79,0) 70%);
//       border-radius: 50%;
//       pointer-events: none;
//     }
   
//     @keyframes float {
//       0%, 100% { transform: translateY(0) rotate(0deg); }
//       50% { transform: translateY(-10px) rotate(2deg); }
//     }
   
//     .token-stat {
//       border-radius: 28px;
//       background: white;
//       box-shadow: 0 20px 40px -12px rgba(0, 35, 102, 0.12);
//       padding: 24px;
//       height: 100%;
//       border: 1px solid rgba(0, 35, 102, 0.06);
//       position: relative;
//       overflow: hidden;
//       transition: all 0.3s ease;
//     }
   
//     .token-stat:hover {
//       box-shadow: 0 30px 60px -15px rgba(0, 35, 102, 0.2);
//     }
   
//     .token-stat-value {
//       font-size: 2.2rem;
//       font-weight: 800;
//       line-height: 1;
//       margin-bottom: 8px;
//       letter-spacing: -0.02em;
//     }
   
//     .timeline-row {
//       border-left: 4px solid #002366;
//       background: linear-gradient(90deg, rgba(248,249,252,0.98) 0%, rgba(255,255,255,1) 100%);
//       border-radius: 24px;
//       padding: 20px 24px;
//       margin-bottom: 16px;
//       box-shadow: 0 15px 35px -10px rgba(0, 35, 102, 0.1);
//       transition: all 0.3s ease;
//       position: relative;
//     }
   
//     .timeline-row:hover {
//       transform: translateX(4px);
//       box-shadow: 0 20px 45px -10px rgba(0, 35, 102, 0.15);
//     }
   
//     .timeline-row::before {
//       content: '';
//       position: absolute;
//       left: -2px;
//       top: 50%;
//       transform: translateY(-50%);
//       width: 8px;
//       height: 80%;
//       background: linear-gradient(180deg, #002366, #4a6fd4);
//       border-radius: 4px;
//     }
   
//     .soft-note {
//       background: rgba(255,255,255,0.15);
//       backdrop-filter: blur(8px);
//       border: 1px solid rgba(255,255,255,0.2);
//       color: white;
//       border-radius: 24px;
//       padding: 18px 22px;
//       box-shadow: 0 15px 30px -10px rgba(0,0,0,0.2);
//     }
   
//     .table-modern thead th {
//       background: linear-gradient(90deg, #f0f5ff, #f8faff);
//       color: #002366;
//       font-size: 0.85rem;
//       text-transform: uppercase;
//       letter-spacing: 0.6px;
//       border-bottom: 2px solid #e0e7ff;
//       padding: 16px 12px;
//     }
   
//     .table-modern td {
//       padding: 16px 12px;
//       border-bottom: 1px solid #edf2f9;
//     }
   
//     .progress-badge {
//       background: linear-gradient(135deg, rgba(0,35,102,0.1), rgba(0,35,102,0.05));
//       color: #002366;
//       padding: 10px 20px;
//       border-radius: 40px;
//       font-size: 0.9rem;
//       font-weight: 600;
//     }
   
//     .floating-decoration {
//       position: absolute;
//       width: 100%;
//       height: 100%;
//       pointer-events: none;
//       z-index: 0;
//     }
   
//     .floating-decoration-1 {
//       position: absolute;
//       top: 10%;
//       left: 5%;
//       width: 150px;
//       height: 150px;
//       background: radial-gradient(circle, rgba(255,213,79,0.1) 0%, rgba(255,213,79,0) 70%);
//       border-radius: 50%;
//       animation: float 8s ease-in-out infinite;
//     }
   
//     .floating-decoration-2 {
//       position: absolute;
//       bottom: 15%;
//       right: 8%;
//       width: 200px;
//       height: 200px;
//       background: radial-gradient(circle, rgba(0,35,102,0.05) 0%, rgba(0,35,102,0) 70%);
//       border-radius: 50%;
//       animation: float 10s ease-in-out infinite reverse;
//     }
   
//     .welcome-modal .modal-content {
//       border-radius: 40px;
//       overflow: hidden;
//       border: none;
//       box-shadow: 0 50px 100px -20px rgba(0,35,102,0.3);
//     }
   
//     .welcome-modal .modal-header {
//       background: linear-gradient(135deg, #001b52, #002366);
//       color: white;
//       border: none;
//       padding: 24px 32px;
//     }
   
//     .welcome-modal .modal-body {
//       padding: 32px;
//       background: linear-gradient(135deg, #f8faff, #ffffff);
//     }
   
//     .welcome-modal .modal-footer {
//       border: none;
//       padding: 24px 32px;
//       background: #f8faff;
//     }
   
//     .see-more-btn {
//       background: linear-gradient(135deg, #f0f5ff, #ffffff);
//       border: 1px solid #00236620;
//       color: #002366;
//       padding: 10px 24px;
//       border-radius: 40px;
//       font-weight: 600;
//       transition: all 0.3s ease;
//       margin-top: 16px;
//       display: inline-flex;
//       align-items: center;
//       gap: 8px;
//     }
   
//     .see-more-btn:hover {
//       background: linear-gradient(135deg, #e0e9ff, #f5f8ff);
//       border-color: #002366;
//       transform: translateY(-2px);
//       box-shadow: 0 10px 25px -8px rgba(0,35,102,0.2);
//     }
   
//     .load-full-history-btn {
//       background: linear-gradient(135deg, #002366, #2b4db3);
//       border: none;
//       color: white;
//       padding: 14px 32px;
//       border-radius: 50px;
//       font-weight: 600;
//       font-size: 1.1rem;
//       transition: all 0.3s ease;
//       box-shadow: 0 10px 25px -8px rgba(0,35,102,0.3);
//     }
   
//     .load-full-history-btn:hover {
//       background: linear-gradient(135deg, #001b52, #1a3a8c);
//       transform: translateY(-2px);
//       box-shadow: 0 15px 30px -8px rgba(0,35,102,0.4);
//     }
   
//     .load-full-history-btn:disabled {
//       opacity: 0.7;
//       cursor: not-allowed;
//       transform: none;
//     }
   
//     .see-more-container {
//       display: flex;
//       justify-content: center;
//       width: 100%;
//     }
//   `

//   const toggleTableDisplay = (tabKey) => {
//     setShowAllTables(prev => ({
//       ...prev,
//       [tabKey]: !prev[tabKey]
//     }))
//   }

//   if (!isConnected) {
//     return (
//       <Container className="mt-5 pt-5">
//         <style>{pageStyles}</style>
//         <div className="floating-decoration">
//           <div className="floating-decoration-1"></div>
//           <div className="floating-decoration-2"></div>
//         </div>
//         <Alert variant="primary" className="text-center p-5 token-card" style={{ position: 'relative', zIndex: 1 }}>
//           <h4 className="fw-bold mb-2">Connect your wallet</h4>
//           <p className="m-0">Your token rewards page will appear here once your wallet is connected.</p>
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoading || isFetching) {
//     return (
//       <Container className="mt-5 pt-4">
//         <style>{pageStyles}</style>
//         <div className="floating-decoration">
//           <div className="floating-decoration-1"></div>
//           <div className="floating-decoration-2"></div>
//         </div>
//         <div className="text-center py-5" style={{ position: 'relative', zIndex: 1 }}>
//           <Spinner animation="border" variant="primary" style={{ width: '4rem', height: '4rem' }} />
//           <p className="mt-3 fw-bold text-muted">{fetchProgress || 'Loading your token rewards...'}</p>
//         </div>
//       </Container>
//     )
//   }

//   if (error || pageError) {
//     return (
//       <Container className="mt-5 pt-4">
//         <style>{pageStyles}</style>
//         <div className="floating-decoration">
//           <div className="floating-decoration-1"></div>
//           <div className="floating-decoration-2"></div>
//         </div>
//         <Alert variant="danger" className="token-card" style={{ position: 'relative', zIndex: 1 }}>
//           <strong>Unable to load token data:</strong> {error || pageError}
//           <div className="mt-3">
//             <Button
//               variant="outline-primary"
//               onClick={() => window.location.reload()}
//               size="sm"
//               className="rounded-pill px-4"
//             >
//               Try Again
//             </Button>
//           </div>
//         </Alert>
//       </Container>
//     )
//   }

//   return (
//     <Container className="mt-5 pt-4 pb-5" style={{ position: 'relative' }}>
//       <style>{pageStyles}</style>
     
//       <div className="floating-decoration">
//         <div className="floating-decoration-1"></div>
//         <div className="floating-decoration-2"></div>
//       </div>

//       {/* Welcome Modal - Non-intrusive, can be dismissed */}
//       <Modal show={showWelcomeModal} onHide={() => setShowWelcomeModal(false)} centered className="welcome-modal">
//         <Modal.Header closeButton closeVariant="white">
//           <Modal.Title className="fw-bold">Welcome to Your Token Dashboard</Modal.Title>
//         </Modal.Header>
//         <Modal.Body className="text-center">
//           <h5 className="mb-3">Track Your Rewards Journey</h5>
//           <p className="text-muted mb-0">
//             Here you'll find all your FGT activation rewards, FGTr recycle rewards,
//             and token utility history. Each entry tells the story of your protocol participation.
//           </p>
//         </Modal.Body>
//         <Modal.Footer>
//           <Button variant="primary" onClick={() => setShowWelcomeModal(false)} className="rounded-pill px-4">
//             Got it, thanks!
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       {/* Hero Section */}
//       <div className="token-hero mb-4 mt-4">
//         <Row className="align-items-center position-relative" style={{ zIndex: 2 }}>
//           <Col lg={8}>
//             <div className="d-flex align-items-center mb-3">
//               <div style={{ height: '42px', width: '10px', background: '#ffd54f', marginRight: '20px', borderRadius: '10px' }}></div>
//               <h1 className="m-0 fw-black text-uppercase" style={{ letterSpacing: '2px', fontSize: '2.5rem' }}>
//                 My Tokens
//               </h1>
//             </div>
//             <p className="mb-3 opacity-90" style={{ maxWidth: '860px', fontSize: '1.1rem' }}>
//               This page shows your FGT activation rewards, your FGTr recycle rewards, your burned utility tokens,
//               and your locked FGT used for NFT or ecosystem utility flows. Each record is presented as a readable
//               on-chain narrative so you can see what happened, why it happened, and which level triggered it.
//             </p>
//             <div className="small opacity-75">
//               Wallet: <strong>{shortAddress(account)}</strong> {lastUpdated ? `• Last synced: ${lastUpdated}` : ''}
//             </div>
//           </Col>

//           <Col lg={4}>
//             <div className="soft-note mt-3 mt-lg-0">
//               The token reward layer records the protocol action, amount, reason, level, and time.
//               Direct payer wallet details are not emitted by the token contracts, so this page narrates the exact
//               qualifying system event instead.
//             </div>
//           </Col>
//         </Row>
//       </div>

//       {/* Summary Cards */}
//       <Row className="g-4 mb-4">
//         {summaryCards.map((card) => (
//           <Col md={6} xl={3} key={card.title}>
//             <div className="token-stat">
//               <div className="small text-uppercase fw-bold text-muted mb-2">{card.title}</div>
//               <div className="token-stat-value" style={{ color: card.accent }}>{card.value}</div>
//               <div className="small text-muted">{card.subtitle}</div>
//             </div>
//           </Col>
//         ))}
//       </Row>

//       {/* Mint Summary and Info Cards */}
//       <Row className="g-4 mb-4">
//         <Col lg={6}>
//           <Card className="token-card h-100">
//             <Card.Body className="p-4">
//               <h5 className="fw-bold mb-4" style={{ color: '#002366' }}>Mint Summary</h5>
//               <div className="d-flex justify-content-between py-2 border-bottom">
//                 <span>Total FGT Minted</span>
//                 <strong>{formatToken(balances.totalFGTMinted)}</strong>
//               </div>
//               <div className="d-flex justify-content-between py-2 border-bottom">
//                 <span>Total FGTr Minted</span>
//                 <strong>{formatToken(balances.totalFGTrMinted)}</strong>
//               </div>
//               <div className="d-flex justify-content-between py-2 border-bottom">
//                 <span>Total FGTr Burned</span>
//                 <strong>{formatToken(balances.totalFGTrBurned)}</strong>
//               </div>
//               <div className="d-flex justify-content-between py-2">
//                 <span>Current FGT Available</span>
//                 <strong>{formatToken(balances.fgtAvailable)}</strong>
//               </div>
//             </Card.Body>
//           </Card>
//         </Col>

//         <Col lg={6}>
//           <Card className="token-card h-100">
//             <Card.Body className="p-4">
//               <h5 className="fw-bold mb-4" style={{ color: '#002366' }}>What these tokens mean</h5>
//               <div className="mb-3"><strong>FGT</strong> is your activation reward token. It appears when a level activates manually, through founder free activation, or through auto-upgrade.</div>
//               <div className="mb-3"><strong>FGTr</strong> is your recycle reward token. It appears after a recycle cycle completes and the orbit resets successfully.</div>
//               <div><strong>Burned / Locked</strong> entries show utility usage history. Burn means consumed for utility. Lock means reserved for NFT or another supported utility flow.</div>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>

//       {/* Timeline with See More/Less */}
//       <Card className="token-card mb-4">
//         <Card.Body className="p-4">
//           <h5 className="fw-bold mb-4" style={{ color: '#002366' }}>Reward Timeline ({history.timeline.length} events)</h5>

//           {history.timeline.length === 0 ? (
//             <Alert variant="light" className="mb-0 text-center p-4">
//               <p className="mb-0">No token activity has been found for this wallet yet.</p>
//               {!fullHistoryLoaded && !showFullHistory && (
//                 <div className="mt-3">
//                   <Button
//                     variant="primary"
//                     onClick={loadFullHistory}
//                     disabled={isLoadingFullHistory}
//                     className="load-full-history-btn"
//                   >
//                     {isLoadingFullHistory ? (
//                       <>
//                         <Spinner animation="border" size="sm" className="me-2" />
//                         Loading full history...
//                       </>
//                     ) : (
//                       '🔍 Load Complete Transaction History'
//                     )}
//                   </Button>
//                 </div>
//               )}
//             </Alert>
//           ) : (
//             <>
//               {(showAllTimeline ? history.timeline : history.timeline.slice(0, 2)).map((entry) => (
//                 <div className="timeline-row" key={entry.id}>
//                   <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
//                     <div className="d-flex align-items-center gap-2 flex-wrap">
//                       <Badge bg={reasonVariant(entry.reason)}>{entry.token}</Badge>
//                       <Badge bg="dark">{entry.reasonText}</Badge>
//                       {typeof entry.level === 'number' && <Badge bg="info">Level {entry.level}</Badge>}
//                       <Badge bg="secondary">{entry.amountFormatted}</Badge>
//                     </div>

//                     <div className="small text-muted">
//                       {formatDateTime(entry.timestamp)}
//                     </div>
//                   </div>

//                   <div className="fw-semibold mb-1">{entry.narrative}</div>
//                   <div className="small text-muted">
//                     Tx: {entry.txHash ? shortAddress(entry.txHash) : '—'} • Source: {entry.source}
//                   </div>
//                 </div>
//               ))}
             
//               {history.timeline.length > 2 && (
//                 <div className="see-more-container">
//                   <Button
//                     variant="light"
//                     onClick={() => setShowAllTimeline(!showAllTimeline)}
//                     className="see-more-btn"
//                   >
//                     {showAllTimeline ? (
//                       <>↑ Show Less</>
//                     ) : (
//                       <>↓ See More ({history.timeline.length - 2} more events)</>
//                     )}
//                   </Button>
//                 </div>
//               )}

//               {/* Load Full History Button (shown if not already loaded) */}
//               {!fullHistoryLoaded && !showFullHistory && (
//                 <div className="see-more-container mt-4">
//                   <Button
//                     variant="primary"
//                     onClick={loadFullHistory}
//                     disabled={isLoadingFullHistory}
//                     className="load-full-history-btn"
//                   >
//                     {isLoadingFullHistory ? (
//                       <>
//                         <Spinner animation="border" size="sm" className="me-2" />
//                         {fetchProgress || 'Loading full history...'}
//                       </>
//                     ) : (
//                       '🔍 Load Complete Transaction History'
//                     )}
//                   </Button>
//                 </div>
//               )}
//             </>
//           )}
//         </Card.Body>
//       </Card>

//       {/* Detailed Records with See More/Less per tab */}
//       <Card className="token-card">
//         <Card.Body className="p-4">
//           <h5 className="fw-bold mb-4" style={{ color: '#002366' }}>Detailed Token Records</h5>

//           <Tabs defaultActiveKey="fgt-earned" className="mb-3" onSelect={() => setShowAllTables({})}>
//             <Tab eventKey="fgt-earned" title={`FGT Earned (${recordCounts.fgtMints})`}>
//               <RecordTable
//                 records={history.fgtMints}
//                 formatDateTime={formatDateTime}
//                 reasonVariant={reasonVariant}
//                 showAll={showAllTables['fgt-earned'] || false}
//                 onToggle={() => toggleTableDisplay('fgt-earned')}
//               />
//             </Tab>

//             <Tab eventKey="fgtr-earned" title={`FGTr Earned (${recordCounts.fgtrMints})`}>
//               <RecordTable
//                 records={history.fgtrMints}
//                 formatDateTime={formatDateTime}
//                 reasonVariant={reasonVariant}
//                 showAll={showAllTables['fgtr-earned'] || false}
//                 onToggle={() => toggleTableDisplay('fgtr-earned')}
//               />
//             </Tab>

//             <Tab eventKey="fgt-burned" title={`FGT Burned (${recordCounts.fgtBurns})`}>
//               <RecordTable
//                 records={history.fgtBurns}
//                 formatDateTime={formatDateTime}
//                 reasonVariant={reasonVariant}
//                 showAll={showAllTables['fgt-burned'] || false}
//                 onToggle={() => toggleTableDisplay('fgt-burned')}
//               />
//             </Tab>

//             <Tab eventKey="fgtr-burned" title={`FGTr Burned (${recordCounts.fgtrBurns})`}>
//               <RecordTable
//                 records={history.fgtrBurns}
//                 formatDateTime={formatDateTime}
//                 reasonVariant={reasonVariant}
//                 showAll={showAllTables['fgtr-burned'] || false}
//                 onToggle={() => toggleTableDisplay('fgtr-burned')}
//               />
//             </Tab>

//             <Tab eventKey="fgt-locked" title={`FGT Locked (${recordCounts.fgtLocks})`}>
//               <RecordTable
//                 records={history.fgtLocks}
//                 formatDateTime={formatDateTime}
//                 reasonVariant={reasonVariant}
//                 showAll={showAllTables['fgt-locked'] || false}
//                 onToggle={() => toggleTableDisplay('fgt-locked')}
//               />
//             </Tab>
//           </Tabs>

//           {/* Load Full History Button for detailed records (if not already loaded) */}
//           {!fullHistoryLoaded && !showFullHistory && history.fgtMints.length === 0 && history.fgtrMints.length === 0 && (
//             <div className="see-more-container mt-4">
//               <Button
//                 variant="primary"
//                 onClick={loadFullHistory}
//                 disabled={isLoadingFullHistory}
//                 className="load-full-history-btn"
//               >
//                 {isLoadingFullHistory ? (
//                   <>
//                     <Spinner animation="border" size="sm" className="me-2" />
//                     {fetchProgress || 'Loading full history...'}
//                   </>
//                 ) : (
//                   '🔍 Load Complete Transaction History'
//                 )}
//               </Button>
//             </div>
//           )}
//         </Card.Body>
//       </Card>
//     </Container>
//   )
// }

// const RecordTable = ({ records, formatDateTime, reasonVariant, showAll, onToggle }) => {
//   const displayRecords = showAll ? records : records.slice(0, 2)

//   if (!records.length) {
//     return (
//       <Alert variant="light" className="mb-0 text-center p-4">
//         <p className="mb-0">No records found in this category.</p>
//       </Alert>
//     )
//   }

//   return (
//     <>
//       <div className="table-responsive">
//         <Table hover className="align-middle table-modern mb-0">
//           <thead>
//             <tr>
//               <th>Token</th>
//               <th>Amount</th>
//               <th>Reason</th>
//               <th>Level</th>
//               <th>When</th>
//               <th>Transaction</th>
//             </tr>
//           </thead>
//           <tbody>
//             {displayRecords.map((entry) => (
//               <tr key={entry.id}>
//                 <td>
//                   <strong>{entry.token}</strong>
//                 </td>
//                 <td>{entry.amountFormatted}</td>
//                 <td>
//                   <Badge bg={reasonVariant(entry.reason)}>
//                     {entry.reasonText}
//                   </Badge>
//                 </td>
//                 <td>{typeof entry.level === 'number' ? `Level ${entry.level}` : '—'}</td>
//                 <td>{formatDateTime(entry.timestamp)}</td>
//                 <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
//                   {entry.txHash ? `${entry.txHash.slice(0, 8)}...${entry.txHash.slice(-6)}` : '—'}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </Table>
//       </div>
     
//       {records.length > 2 && (
//         <div className="see-more-container">
//           <Button
//             variant="light"
//             onClick={onToggle}
//             className="see-more-btn"
//           >
//             {showAll ? (
//               <>↑ Show Less</>
//             ) : (
//               <>↓ See More ({records.length - 2} more records)</>
//             )}
//           </Button>
//         </div>
//       )}
//     </>
//   )
// }