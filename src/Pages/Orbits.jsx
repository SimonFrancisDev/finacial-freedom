import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Container,
  Row,
  Col,
  Tabs,
  Tab,
  Alert,
  Spinner,
  ProgressBar,
  Button,
  Badge,
  Modal,
  OverlayTrigger,
  Tooltip,
  Form
} from 'react-bootstrap'
import { useWallet } from '../hooks/useWallet'
import { useContracts } from '../hooks/useContracts'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'

export const Orbits = () => {
  console.log('Debug: This is the new file')

  const { isConnected, account } = useWallet()
  const { contracts, isLoading, error, loadContracts } = useContracts()
  const { t } = useTranslation()

  const [orbitData, setOrbitData] = useState({})
  const [userLocks, setUserLocks] = useState({})
  const [downlineData, setDownlineData] = useState({})
  const [spilloverData, setSpilloverData] = useState({})
  const [orbitError, setOrbitError] = useState('')
  const [viewMode, setViewMode] = useState('global')
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [showPositionModal, setShowPositionModal] = useState(false)
  const [hoveredPosition, setHoveredPosition] = useState(null)
  const [showStructuralPreview, setShowStructuralPreview] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [viewAddress, setViewAddress] = useState('')
  const [inputAddress, setInputAddress] = useState('')
  const [viewedLevels, setViewedLevels] = useState({})
  const [cycleHistoryData, setCycleHistoryData] = useState({})
  const [selectedCycleByLevel, setSelectedCycleByLevel] = useState({})
  const [loadingCycleByLevel, setLoadingCycleByLevel] = useState({})
  const [cycleHistorySupportByLevel, setCycleHistorySupportByLevel] = useState({})
  const [linePaymentCountsByLevel, setLinePaymentCountsByLevel] = useState({})
  const [viewAddressReceipts, setViewAddressReceipts] = useState([])
  const [receiptBucketsByLevel, setReceiptBucketsByLevel] = useState({})
  const [receiptsSupported, setReceiptsSupported] = useState(false)

  const galaxyRef = useRef(null)
  const referrerCacheRef = useRef(new Map())
  const viewedLevelsCacheRef = useRef(new Map())
  const fetchIdRef = useRef(0)
  const cycleHistoryCacheRef = useRef(new Map())
  const receiptCacheRef = useRef(new Map())
  const activationReceiptCacheRef = useRef(new Map()) // NEW: cache for activation-level receipts

  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('level1')
  const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const chunkArray = (arr, size) => {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }

  const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
    try {
      return await fn()
    } catch (err) {
      const code = err?.code || err?.info?.error?.code
      const msg = String(err?.message || '')
      const isRateLimited =
        code === -32005 ||
        err?.status === 429 ||
        msg.includes('rate limited') ||
        msg.includes('429')

      if (!isRateLimited || retries <= 0) {
        throw err
      }

      await delay(wait)
      return withRetry(fn, retries - 1, wait * 2)
    }
  }, [])

  const formatUsdt = useCallback((value) => {
    try {
      return Number(ethers.formatUnits(value ?? 0, 6))
    } catch {
      return 0
    }
  }, [])

  const formatUsdtDisplay = useCallback((value) => {
    const num = typeof value === 'number' ? value : Number(value || 0)
    if (!Number.isFinite(num)) return '0'
    if (Math.abs(num % 1) < 0.000001) return String(num)
    return num.toFixed(6).replace(/\.?0+$/, '')
  }, [])

  const getNetAmount = useCallback((grossAmount) => {
    const systemCharge = grossAmount * 0.10
    const netAmount = Math.max(0, grossAmount - systemCharge)
    return netAmount
  }, [])

  const shortAddress = useCallback((addr) => {
    if (!addr || addr === ethers.ZeroAddress) return '—'
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`
  }, [])

  const getCachedReferrer = useCallback(async (address) => {
    const key = address.toLowerCase()
    if (referrerCacheRef.current.has(key)) {
      return referrerCacheRef.current.get(key)
    }

    const referrer = await withRetry(() => contracts.registration.getReferrer(address))
    referrerCacheRef.current.set(key, referrer)
    return referrer
  }, [contracts, withRetry])

  // ============================================================
  // RECEIPT TYPE CONSTANTS
  // ============================================================
  const RECEIPT_TYPES = {
    FOUNDER_PATH: 1,
    DIRECT_OWNER: 2,
    ROUTED_SPILLOVER: 3,
    RECYCLE: 4
  }

  // ============================================================
  // ORBIT TYPE CONFIGURATION
  // ============================================================
  const orbitTypeConfig = {
    P4: {
      name: 'P4',
      contract: 'p4Orbit',
      positions: 4,
      lines: 1,
      lineSizes: [4],
      linePayouts: ['Rule-based from contract'],
      lineSpillovers: ['No structural child line'],
      levels: [1, 4, 7, 10],
      description: 'Single-line orbit'
    },
    P12: {
      name: 'P12',
      contract: 'p12Orbit',
      positions: 12,
      lines: 2,
      lineSizes: [3, 9],
      linePayouts: ['Rule-based from contract'],
      lineSpillovers: ['Rule-based from contract'],
      levels: [2, 5, 8],
      description: 'Two-line orbit'
    },
    P39: {
      name: 'P39',
      contract: 'p39Orbit',
      positions: 39,
      lines: 3,
      lineSizes: [3, 9, 27],
      linePayouts: ['Rule-based from contract', 'Rule-based from contract', 'Rule-based from contract'],
      lineSpillovers: ['Rule-based from contract', 'Rule-based from contract', 'Rule-based from contract'],
      levels: [3, 6, 9],
      description: 'Three-line orbit'
    }
  }

  const levelToOrbitType = {
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

  const levelConfig = {
    1: { price: 10, upgradeReq: 20, nextLevel: 2 },
    2: { price: 20, upgradeReq: 40, nextLevel: 3 },
    3: { price: 40, upgradeReq: 80, nextLevel: 4 },
    4: { price: 80, upgradeReq: 160, nextLevel: 5 },
    5: { price: 160, upgradeReq: 320, nextLevel: 6 },
    6: { price: 320, upgradeReq: 640, nextLevel: 7 },
    7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
    8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
    9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
    10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  const getStructuralParentPosition = (orbitType, position) => {
    if (orbitType === 'P4') {
      return null
    }

    if (orbitType === 'P12') {
      if (position === 4 || position === 7 || position === 10) return 1
      if (position === 5 || position === 8 || position === 11) return 2
      if (position === 6 || position === 9 || position === 12) return 3
      return null
    }

    if (orbitType === 'P39') {
      if (position === 4 || position === 7 || position === 10) return 1
      if (position === 5 || position === 8 || position === 11) return 2
      if (position === 6 || position === 9 || position === 12) return 3
      if (position === 13 || position === 22 || position === 31) return 4
      if (position === 14 || position === 23 || position === 32) return 5
      if (position === 15 || position === 24 || position === 33) return 6
      if (position === 16 || position === 25 || position === 34) return 7
      if (position === 17 || position === 26 || position === 35) return 8
      if (position === 18 || position === 27 || position === 36) return 9
      if (position === 19 || position === 28 || position === 37) return 10
      if (position === 20 || position === 29 || position === 38) return 11
      if (position === 21 || position === 30 || position === 39) return 12
      return null
    }

    return null
  }

  const tryContractCall = async (contract, methodNames, args) => {
    for (const methodName of methodNames) {
      if (typeof contract?.[methodName] === 'function') {
        try {
          const result = await withRetry(() => contract[methodName](...args))
          return { ok: true, methodName, result }
        } catch {}
      }
    }
    return { ok: false, methodName: null, result: null }
  }

  const normalizeRuleView = (ruleResult) => {
    if (!ruleResult) return null

    const isHistorical =
      ruleResult.hasStoredRuleData !== undefined ||
      (Array.isArray(ruleResult) && ruleResult.length >= 13)

    if (isHistorical) {
      return {
        cycleNumber: Number(ruleResult.cycleNumber ?? ruleResult[0] ?? 0),
        position: Number(ruleResult.position ?? ruleResult[1] ?? 0),
        line: Number(ruleResult.line ?? ruleResult[2] ?? 0),
        linePaymentNumber: Number(ruleResult.linePaymentNumber ?? ruleResult[3] ?? 0),
        autoUpgradeEnabled: Boolean(ruleResult.autoUpgradeEnabled ?? ruleResult[4] ?? false),
        hasStoredRuleData: Boolean(ruleResult.hasStoredRuleData ?? ruleResult[5] ?? false),
        isFounderNoReferrerPath: false,
        toOwner: Number(ethers.formatUnits(ruleResult.toOwner ?? ruleResult[6] ?? 0, 6)),
        toSpillover1: Number(ethers.formatUnits(ruleResult.toSpillover1 ?? ruleResult[7] ?? 0, 6)),
        toSpillover2: Number(ethers.formatUnits(ruleResult.toSpillover2 ?? ruleResult[8] ?? 0, 6)),
        toEscrow: Number(ethers.formatUnits(ruleResult.toEscrow ?? ruleResult[9] ?? 0, 6)),
        toRecycle: Number(ethers.formatUnits(ruleResult.toRecycle ?? ruleResult[10] ?? 0, 6)),
        spillover1Recipient: ruleResult.spillover1Recipient ?? ruleResult[11] ?? ethers.ZeroAddress,
        spillover2Recipient: ruleResult.spillover2Recipient ?? ruleResult[12] ?? ethers.ZeroAddress
      }
    }

    return {
      position: Number(ruleResult.position ?? ruleResult[0] ?? 0),
      line: Number(ruleResult.line ?? ruleResult[1] ?? 0),
      linePaymentNumber: Number(ruleResult.linePaymentNumber ?? ruleResult[2] ?? 0),
      autoUpgradeEnabled: Boolean(ruleResult.autoUpgradeEnabled ?? ruleResult[3] ?? false),
      isFounderNoReferrerPath: Boolean(ruleResult.isFounderNoReferrerPath ?? ruleResult[4] ?? false),
      hasStoredRuleData: false,
      toOwner: Number(ethers.formatUnits(ruleResult.toOwner ?? ruleResult[5] ?? 0, 6)),
      toSpillover1: Number(ethers.formatUnits(ruleResult.toSpillover1 ?? ruleResult[6] ?? 0, 6)),
      toSpillover2: Number(ethers.formatUnits(ruleResult.toSpillover2 ?? ruleResult[7] ?? 0, 6)),
      toEscrow: Number(ethers.formatUnits(ruleResult.toEscrow ?? ruleResult[8] ?? 0, 6)),
      toRecycle: Number(ethers.formatUnits(ruleResult.toRecycle ?? ruleResult[9] ?? 0, 6)),
      spillover1Recipient: ruleResult.spillover1Recipient ?? ruleResult[10] ?? ethers.ZeroAddress,
      spillover2Recipient: ruleResult.spillover2Recipient ?? ruleResult[11] ?? ethers.ZeroAddress
    }
  }

  const buildPositionInfoFromRuleView = (orbitType, position, level, ruleView, orbitOwnerAddress) => {
    const parentPosition = getStructuralParentPosition(orbitType, position)

    if (!ruleView) {
      return {
        type: 'unknown',
        payout: 0,
        escrow: 0,
        spillover: 0,
        description: '',
        toUpline: false,
        line: 1,
        isAutoUpgradeSource: false,
        isRecyclePosition: false,
        spillsTo: parentPosition,
        parentPosition,
        linePaymentNumber: 0,
        orbitOwner: orbitOwnerAddress,
        spillover1Recipient: null,
        spillover2Recipient: null,
        exactToOwner: 0,
        exactToSpillover1: 0,
        exactToSpillover2: 0,
        exactToEscrow: 0,
        exactToRecycle: 0,
        autoUpgradeEnabled: false,
        isFounderNoReferrerPath: false,
        hasStoredRuleData: false
      }
    }

    const totalRouted = (ruleView.toSpillover1 || 0) + (ruleView.toSpillover2 || 0)
    let type = 'unknown'

    if ((ruleView.toRecycle || 0) > 0) type = 'recycle'
    else if ((ruleView.toEscrow || 0) > 0 && (ruleView.toOwner || 0) > 0) type = 'payout-escrow'
    else if ((ruleView.toEscrow || 0) > 0) type = 'escrow'
    else if ((ruleView.toOwner || 0) > 0) type = 'payout'

    const parts = []
    if (ruleView.isFounderNoReferrerPath) {
      parts.push('Founder no-referrer path')
    } else {
      if (ruleView.toOwner > 0) parts.push(`${ruleView.toOwner} USDT to orbit owner`)
      if (ruleView.toSpillover1 > 0) parts.push(`${ruleView.toSpillover1} USDT to spillover recipient 1`)
      if (ruleView.toSpillover2 > 0) parts.push(`${ruleView.toSpillover2} USDT to spillover recipient 2`)
      if (ruleView.toEscrow > 0) parts.push(`${ruleView.toEscrow} USDT to escrow`)
      if (ruleView.toRecycle > 0) parts.push(`${ruleView.toRecycle} USDT to recycle`)
    }

    return {
      type,
      payout: ruleView.toOwner || 0,
      escrow: ruleView.toEscrow || 0,
      spillover: totalRouted,
      description: parts.length ? parts.join(', ') : 'No payout rule data available.',
      toUpline: totalRouted > 0,
      line: ruleView.line || 1,
      isAutoUpgradeSource: (ruleView.toEscrow || 0) > 0,
      isRecyclePosition: (ruleView.toRecycle || 0) > 0,
      spillsTo: parentPosition,
      parentPosition,
      linePaymentNumber: ruleView.linePaymentNumber || 0,
      orbitOwner: orbitOwnerAddress,
      spillover1Recipient: ruleView.spillover1Recipient,
      spillover2Recipient: ruleView.spillover2Recipient,
      exactToOwner: ruleView.toOwner || 0,
      exactToSpillover1: ruleView.toSpillover1 || 0,
      exactToSpillover2: ruleView.toSpillover2 || 0,
      exactToEscrow: ruleView.toEscrow || 0,
      exactToRecycle: ruleView.toRecycle || 0,
      autoUpgradeEnabled: !!ruleView.autoUpgradeEnabled,
      isFounderNoReferrerPath: !!ruleView.isFounderNoReferrerPath,
      hasStoredRuleData: !!ruleView.hasStoredRuleData
    }
  }

  const classifyOccupantType = useCallback((occupantAddress, viewedAddr, referrer, truthLabel, payoutReceipts = []) => {
    if (!occupantAddress || occupantAddress === ethers.ZeroAddress) return 'empty'
    if (!viewedAddr) return 'other'

    const occupantLower = occupantAddress.toLowerCase()
    const viewedLower = viewedAddr.toLowerCase()
    const referrerLower = (referrer || ethers.ZeroAddress).toLowerCase()

    if (occupantLower === viewedLower) return 'mine'

    const isFounderPathReceipt =
      truthLabel === 'FOUNDER_PATH' ||
      (payoutReceipts || []).some(r => Number(r?.receiptType) === RECEIPT_TYPES.FOUNDER_PATH)

    if (referrerLower === viewedLower || isFounderPathReceipt) {
      return 'downline'
    }

    return 'other'
  }, [])

  const normalizeReceipt = useCallback((receipt) => {
    if (!receipt) return null

    const hasNamedActivationId =
      receipt.activationId !== undefined && receipt.activationId !== null

    const isDetailedTuple =
      Array.isArray(receipt) && receipt.length >= 15

    if (hasNamedActivationId || isDetailedTuple) {
      return {
        activationId: Number(receipt.activationId ?? receipt[0] ?? 0),
        receiptType: Number(receipt.receiptType ?? receipt[1] ?? 0),
        level: Number(receipt.level ?? receipt[2] ?? 0),
        timestamp: Number(receipt.timestamp ?? receipt[3] ?? 0),
        receiver: receipt.receiver ?? receipt[4] ?? ethers.ZeroAddress,
        fromUser: receipt.fromUser ?? receipt[5] ?? ethers.ZeroAddress,
        orbitOwner: receipt.orbitOwner ?? receipt[6] ?? ethers.ZeroAddress,
        sourcePosition: Number(receipt.sourcePosition ?? receipt[7] ?? 0),
        sourceCycle: Number(receipt.sourceCycle ?? receipt[8] ?? 0),
        mirroredPosition: Number(receipt.mirroredPosition ?? receipt[9] ?? 0),
        mirroredCycle: Number(receipt.mirroredCycle ?? receipt[10] ?? 0),
        routedRole: Number(receipt.routedRole ?? receipt[11] ?? 0),
        grossAmount: formatUsdt(receipt.grossAmount ?? receipt[12] ?? 0),
        escrowLocked: formatUsdt(receipt.escrowLocked ?? receipt[13] ?? 0),
        liquidPaid: formatUsdt(receipt.liquidPaid ?? receipt[14] ?? 0)
      }
    }

    return {
      activationId: 0,
      receiptType: Number(receipt.receiptType ?? receipt[0] ?? 0),
      level: Number(receipt.level ?? receipt[1] ?? 0),
      timestamp: Number(receipt.timestamp ?? receipt[2] ?? 0),
      receiver: receipt.receiver ?? receipt[3] ?? ethers.ZeroAddress,
      fromUser: receipt.fromUser ?? receipt[4] ?? ethers.ZeroAddress,
      orbitOwner: receipt.orbitOwner ?? receipt[5] ?? ethers.ZeroAddress,
      sourcePosition: 0,
      sourceCycle: 0,
      mirroredPosition: 0,
      mirroredCycle: 0,
      routedRole: 0,
      grossAmount: formatUsdt(receipt.grossAmount ?? receipt[6] ?? 0),
      escrowLocked: formatUsdt(receipt.escrowLocked ?? receipt[7] ?? 0),
      liquidPaid: formatUsdt(receipt.liquidPaid ?? receipt[8] ?? 0)
    }
  }, [formatUsdt])

  const buildReceiptBuckets = useCallback((receipts) => {
    const buckets = {}

    for (let level = 1; level <= 10; level++) {
      buckets[level] = {
        receipts: [],
        byFromUser: {},
        byActivationId: {},
        totals: {
          gross: 0,
          escrow: 0,
          liquid: 0,
          founderPathGross: 0,
          founderPathEscrow: 0,
          founderPathLiquid: 0,
          directOwnerGross: 0,
          directOwnerEscrow: 0,
          directOwnerLiquid: 0,
          routedSpilloverGross: 0,
          routedSpilloverEscrow: 0,
          routedSpilloverLiquid: 0,
          recycleGross: 0,
          recycleEscrow: 0,
          recycleLiquid: 0
        }
      }
    }

    for (const receipt of receipts) {
      const level = Number(receipt.level || 0)
      if (!buckets[level]) continue

      const bucket = buckets[level]
      bucket.receipts.push(receipt)

      const fromKey = (receipt.fromUser || ethers.ZeroAddress).toLowerCase()
      if (!bucket.byFromUser[fromKey]) {
        bucket.byFromUser[fromKey] = []
      }
      bucket.byFromUser[fromKey].push(receipt)

      const activationId = Number(receipt.activationId || 0)
      if (activationId > 0) {
        if (!bucket.byActivationId[activationId]) {
          bucket.byActivationId[activationId] = []
        }
        bucket.byActivationId[activationId].push(receipt)
      }

      bucket.totals.gross += receipt.grossAmount || 0
      bucket.totals.escrow += receipt.escrowLocked || 0
      bucket.totals.liquid += receipt.liquidPaid || 0

      if (receipt.receiptType === RECEIPT_TYPES.FOUNDER_PATH) {
        bucket.totals.founderPathGross += receipt.grossAmount || 0
        bucket.totals.founderPathEscrow += receipt.escrowLocked || 0
        bucket.totals.founderPathLiquid += receipt.liquidPaid || 0
      } else if (receipt.receiptType === RECEIPT_TYPES.DIRECT_OWNER) {
        bucket.totals.directOwnerGross += receipt.grossAmount || 0
        bucket.totals.directOwnerEscrow += receipt.escrowLocked || 0
        bucket.totals.directOwnerLiquid += receipt.liquidPaid || 0
      } else if (receipt.receiptType === RECEIPT_TYPES.ROUTED_SPILLOVER) {
        bucket.totals.routedSpilloverGross += receipt.grossAmount || 0
        bucket.totals.routedSpilloverEscrow += receipt.escrowLocked || 0
        bucket.totals.routedSpilloverLiquid += receipt.liquidPaid || 0
      } else if (receipt.receiptType === RECEIPT_TYPES.RECYCLE) {
        bucket.totals.recycleGross += receipt.grossAmount || 0
        bucket.totals.recycleEscrow += receipt.escrowLocked || 0
        bucket.totals.recycleLiquid += receipt.liquidPaid || 0
      }
    }

    return buckets
  }, [])

  const getLivePositionActivationData = useCallback(async (orbitContract, orbitOwner, level, position) => {
    if (typeof orbitContract?.getPositionActivationData !== 'function') {
      return { activationId: 0, cycleNumber: 0, isMirror: false }
    }

    try {
      const result = await withRetry(() =>
        orbitContract.getPositionActivationData(orbitOwner, level, position)
      )

      return {
        activationId: Number(result?.activationId ?? result?.[0] ?? 0),
        cycleNumber: Number(result?.cycleNumber ?? result?.[1] ?? 0),
        isMirror: Boolean(result?.isMirror ?? result?.[2] ?? false)
      }
    } catch {
      return { activationId: 0, cycleNumber: 0, isMirror: false }
    }
  }, [withRetry])

  const getHistoricalPositionActivationData = useCallback(async (orbitContract, orbitOwner, level, cycleNumber, position) => {
    if (typeof orbitContract?.getHistoricalPositionActivationData !== 'function') {
      return { activationId: 0, isMirror: false }
    }

    try {
      const result = await withRetry(() =>
        orbitContract.getHistoricalPositionActivationData(orbitOwner, level, cycleNumber, position)
      )

      return {
        activationId: Number(result?.activationId ?? result?.[0] ?? 0),
        isMirror: Boolean(result?.isMirror ?? result?.[1] ?? false)
      }
    } catch {
      return { activationId: 0, isMirror: false }
    }
  }, [withRetry])

  // ============================================================
  // NEW: fetch activation receipts directly from LevelManager
  // ============================================================
  const getActivationDetailedReceipts = useCallback(async (activationId) => {
    const numericActivationId = Number(activationId || 0)
    if (!numericActivationId || !contracts?.levelManager) return []

    const cacheKey = String(numericActivationId)
    if (activationReceiptCacheRef.current.has(cacheKey)) {
      return activationReceiptCacheRef.current.get(cacheKey)
    }

    const levelManager = contracts.levelManager

    if (
      typeof levelManager.getActivationDetailedPayoutReceiptCount !== 'function' ||
      typeof levelManager.getActivationDetailedPayoutReceipts !== 'function'
    ) {
      return []
    }

    try {
      const totalCountRaw = await withRetry(() =>
        levelManager.getActivationDetailedPayoutReceiptCount(numericActivationId)
      )

      const totalCount = Number(totalCountRaw ?? 0)
      if (totalCount === 0) {
        activationReceiptCacheRef.current.set(cacheKey, [])
        return []
      }

      const PAGE_SIZE = 100
      let offset = 0
      let allReceipts = []

      while (offset < totalCount) {
        const batch = await withRetry(() =>
          levelManager.getActivationDetailedPayoutReceipts(numericActivationId, offset, PAGE_SIZE)
        )

        const normalizedBatch = (batch || []).map(normalizeReceipt).filter(Boolean)
        allReceipts.push(...normalizedBatch)

        if (!batch || batch.length === 0) break
        offset += batch.length
      }

      allReceipts.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0))
      activationReceiptCacheRef.current.set(cacheKey, allReceipts)
      return allReceipts
    } catch (err) {
      console.error(`Error fetching activation receipts for activation ${numericActivationId}:`, err)
      return []
    }
  }, [contracts, normalizeReceipt, withRetry])

  // Replace old getReceiptsForPositionActivation with async version
  const getReceiptsForPositionActivation = useCallback(async (activationId) => {
    return await getActivationDetailedReceipts(activationId)
  }, [getActivationDetailedReceipts])

  const getReceiptSummaryForPositionActivation = useCallback(async (level, activationId) => {
    const related = await getReceiptsForPositionActivation(activationId)

    const summary = {
      count: related.length,
      gross: 0,
      escrow: 0,
      liquid: 0,
      founderPathGross: 0,
      directOwnerGross: 0,
      routedSpilloverGross: 0,
      recycleGross: 0
    }

    related.forEach((receipt) => {
      summary.gross += receipt.grossAmount || 0
      summary.escrow += receipt.escrowLocked || 0
      summary.liquid += receipt.liquidPaid || 0

      if (receipt.receiptType === RECEIPT_TYPES.FOUNDER_PATH) summary.founderPathGross += receipt.grossAmount || 0
      if (receipt.receiptType === RECEIPT_TYPES.DIRECT_OWNER) summary.directOwnerGross += receipt.grossAmount || 0
      if (receipt.receiptType === RECEIPT_TYPES.ROUTED_SPILLOVER) summary.routedSpilloverGross += receipt.grossAmount || 0
      if (receipt.receiptType === RECEIPT_TYPES.RECYCLE) summary.recycleGross += receipt.grossAmount || 0
    })

    return summary
  }, [getReceiptsForPositionActivation])

  const getPositionTruthLabel = useCallback((positionReceipts) => {
    if (!positionReceipts || positionReceipts.length === 0) return 'NO_RECEIPT'

    const typeSet = new Set(positionReceipts.map(r => r.receiptType))
    if (typeSet.has(RECEIPT_TYPES.FOUNDER_PATH)) return 'FOUNDER_PATH'
    if (typeSet.has(RECEIPT_TYPES.DIRECT_OWNER) && typeSet.has(RECEIPT_TYPES.ROUTED_SPILLOVER)) return 'DIRECT_AND_ROUTED'
    if (typeSet.has(RECEIPT_TYPES.DIRECT_OWNER)) return 'DIRECT_OWNER'
    if (typeSet.has(RECEIPT_TYPES.ROUTED_SPILLOVER)) return 'ROUTED_SPILLOVER'
    if (typeSet.has(RECEIPT_TYPES.RECYCLE)) return 'RECYCLE'
    return 'UNKNOWN'
  }, [])

  const fetchViewedLevels = useCallback(async (forceRefresh = false) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

    const key = viewAddress.toLowerCase()

    if (!forceRefresh && viewedLevelsCacheRef.current.has(key)) {
      setViewedLevels(viewedLevelsCacheRef.current.get(key))
      return
    }

    try {
      const levels = {}
      for (let i = 1; i <= 10; i++) {
        try {
          levels[i] = await withRetry(() => contracts.registration.isLevelActivated(viewAddress, i))
        } catch {
          levels[i] = false
        }
      }

      viewedLevelsCacheRef.current.set(key, levels)
      setViewedLevels(levels)
    } catch (err) {
      console.error('Error fetching viewed levels:', err)
    }
  }, [contracts, viewAddress, withRetry])

  const fetchViewedAddressReceipts = useCallback(async (forceRefresh = false) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) {
      setViewAddressReceipts([])
      setReceiptBucketsByLevel({})
      setReceiptsSupported(false)
      return
    }

    const levelManager = contracts.levelManager
    if (!levelManager) {
      setViewAddressReceipts([])
      setReceiptBucketsByLevel({})
      setReceiptsSupported(false)
      return
    }

    const hasDetailedReceiptApi =
      typeof levelManager.getUserDetailedPayoutReceiptCount === 'function' &&
      typeof levelManager.getUserDetailedPayoutReceipts === 'function'

    const hasBasicReceiptApi =
      typeof levelManager.getUserPayoutReceiptCount === 'function' &&
      typeof levelManager.getUserPayoutReceipts === 'function'

    if (!hasDetailedReceiptApi && !hasBasicReceiptApi) {
      setViewAddressReceipts([])
      setReceiptBucketsByLevel({})
      setReceiptsSupported(false)
      return
    }

    const cacheKey = `${viewAddress.toLowerCase()}-${hasDetailedReceiptApi ? 'detailed' : 'basic'}`

    if (!forceRefresh && receiptCacheRef.current.has(cacheKey)) {
      const cachedReceipts = receiptCacheRef.current.get(cacheKey)
      setViewAddressReceipts(cachedReceipts)
      setReceiptBucketsByLevel(buildReceiptBuckets(cachedReceipts))
      setReceiptsSupported(true)
      return
    }

    try {
      let totalCountRaw = 0
      let allReceipts = []
      const PAGE_SIZE = 100

      if (hasDetailedReceiptApi) {
        totalCountRaw = await withRetry(() =>
          levelManager.getUserDetailedPayoutReceiptCount(viewAddress)
        )

        const totalCount = Number(totalCountRaw ?? 0)

        if (totalCount === 0) {
          receiptCacheRef.current.set(cacheKey, [])
          setViewAddressReceipts([])
          setReceiptBucketsByLevel(buildReceiptBuckets([]))
          setReceiptsSupported(true)
          return
        }

        let offset = 0
        while (offset < totalCount) {
          const batch = await withRetry(() =>
            levelManager.getUserDetailedPayoutReceipts(viewAddress, offset, PAGE_SIZE)
          )

          const normalizedBatch = (batch || []).map(normalizeReceipt).filter(Boolean)
          allReceipts.push(...normalizedBatch)

          if (!batch || batch.length === 0) break
          offset += batch.length
        }
      } else {
        totalCountRaw = await withRetry(() =>
          levelManager.getUserPayoutReceiptCount(viewAddress)
        )

        const totalCount = Number(totalCountRaw ?? 0)

        if (totalCount === 0) {
          receiptCacheRef.current.set(cacheKey, [])
          setViewAddressReceipts([])
          setReceiptBucketsByLevel(buildReceiptBuckets([]))
          setReceiptsSupported(true)
          return
        }

        let offset = 0
        while (offset < totalCount) {
          const batch = await withRetry(() =>
            levelManager.getUserPayoutReceipts(viewAddress, offset, PAGE_SIZE)
          )

          const normalizedBatch = (batch || []).map(normalizeReceipt).filter(Boolean)
          allReceipts.push(...normalizedBatch)

          if (!batch || batch.length === 0) break
          offset += batch.length
        }
      }

      receiptCacheRef.current.set(cacheKey, allReceipts)
      setViewAddressReceipts(allReceipts)
      setReceiptBucketsByLevel(buildReceiptBuckets(allReceipts))
      setReceiptsSupported(true)
    } catch (err) {
      console.error('Error fetching payout receipts:', err)
      setViewAddressReceipts([])
      setReceiptBucketsByLevel({})
      setReceiptsSupported(false)
    }
  }, [contracts, viewAddress, withRetry, normalizeReceipt, buildReceiptBuckets])

  // ============================================================
  // FETCH FUNCTIONS (updated to await receipt fetching)
  // ============================================================
  const fetchStoredCycleForLevel = useCallback(async (level, cycleNumber) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return []
    if (!orbitData[level]) return []

    const cacheKey = `${viewAddress.toLowerCase()}-${level}-${cycleNumber}`
    if (cycleHistoryCacheRef.current.has(cacheKey)) {
      return cycleHistoryCacheRef.current.get(cacheKey)
    }

    const orbitType = levelToOrbitType[level]
    const config = orbitTypeConfig[orbitType]
    const orbitContract = contracts[config.contract]

    if (!orbitContract) return []

    const positionGetterCandidates = [
      'getHistoricalPosition',
      'getCyclePosition',
      'getStoredCyclePosition',
      'getArchivedPosition'
    ]

    const positions = []

    for (let pos = 1; pos <= config.positions; pos++) {
      const call = await tryContractCall(
        orbitContract,
        positionGetterCandidates,
        [viewAddress, level, cycleNumber, pos]
      )

      if (!call.ok) {
        throw new Error('No supported historical position getter found on orbit contract')
      }

      const result = call.result || []
      const occupantAddress = result[0]
      const amountRaw = result[1]
      const timestampRaw = result[2]

      let historicalRuleView = null
      try {
        const historicalRuleCall = await tryContractCall(
          orbitContract,
          ['getHistoricalPositionRuleView'],
          [viewAddress, level, cycleNumber, pos]
        )
        if (historicalRuleCall.ok) {
          historicalRuleView = normalizeRuleView(historicalRuleCall.result)
        }
      } catch {}

      const historicalActivationData = await getHistoricalPositionActivationData(
        orbitContract,
        viewAddress,
        level,
        cycleNumber,
        pos
      )

      // Use the new async receipt fetcher
      const receiptsForActivation =
        historicalActivationData.activationId > 0
          ? await getReceiptsForPositionActivation(historicalActivationData.activationId)
          : []

      const receiptSummary =
        historicalActivationData.activationId > 0
          ? await getReceiptSummaryForPositionActivation(level, historicalActivationData.activationId)
          : {
              count: 0,
              gross: 0,
              escrow: 0,
              liquid: 0,
              founderPathGross: 0,
              directOwnerGross: 0,
              routedSpilloverGross: 0,
              recycleGross: 0
            }

      const truthLabel = getPositionTruthLabel(receiptsForActivation)

      const posInfo = buildPositionInfoFromRuleView(orbitType, pos, level, historicalRuleView, viewAddress)

      let occupantType = 'empty'

      if (occupantAddress && occupantAddress !== ethers.ZeroAddress) {
        let referrer = ethers.ZeroAddress
        try {
          referrer = await getCachedReferrer(occupantAddress)
        } catch {}

        const historicalTruthLabel =
          truthLabel !== 'NO_RECEIPT'
            ? truthLabel
            : (historicalRuleView?.isFounderNoReferrerPath ? 'FOUNDER_PATH' : 'UNKNOWN')

        occupantType = classifyOccupantType(
          occupantAddress,
          viewAddress,
          referrer,
          historicalTruthLabel,
          receiptsForActivation
        )
      }

      positions.push({
        number: pos,
        occupantType,
        occupant: occupantAddress && occupantAddress !== ethers.ZeroAddress ? occupantAddress : null,
        amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
        timestamp: timestampRaw || 0,
        positionInfo: posInfo,
        ruleView: historicalRuleView,
        line: posInfo.line,
        spillsTo: posInfo.spillsTo,
        parentPosition: posInfo.parentPosition,
        activationId: historicalActivationData.activationId,
        activationCycleNumber: cycleNumber,
        isMirrorActivation: historicalActivationData.isMirror,
        payoutReceipts: receiptsForActivation,
        payoutReceiptSummary: receiptSummary,
        truthLabel
      })
    }

    cycleHistoryCacheRef.current.set(cacheKey, positions)
    return positions
  }, [
    contracts,
    viewAddress,
    orbitData,
    getCachedReferrer,
    tryContractCall,
    normalizeRuleView,
    buildPositionInfoFromRuleView,
    classifyOccupantType,
    getHistoricalPositionActivationData,
    getReceiptsForPositionActivation,
    getReceiptSummaryForPositionActivation,
    getPositionTruthLabel
  ])

  const loadCycleHistoryForLevel = useCallback(async (level, cycleNumber) => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    if (!orbitData[level]) return

    const cycleKey = String(cycleNumber)
    const existing = cycleHistoryData[level]?.[cycleKey]
    if (existing) return

    setLoadingCycleByLevel(prev => ({ ...prev, [level]: true }))

    try {
      const positions = await fetchStoredCycleForLevel(level, cycleNumber)

      setCycleHistoryData(prev => ({
        ...prev,
        [level]: {
          ...(prev[level] || {}),
          [cycleKey]: positions
        }
      }))

      setCycleHistorySupportByLevel(prev => ({
        ...prev,
        [level]: true
      }))
    } catch (err) {
      console.error(`Cycle history load failed for level ${level}, cycle ${cycleNumber}:`, err)
      setCycleHistorySupportByLevel(prev => ({
        ...prev,
        [level]: false
      }))
    } finally {
      setLoadingCycleByLevel(prev => ({ ...prev, [level]: false }))
    }
  }, [contracts, viewAddress, orbitData, cycleHistoryData, fetchStoredCycleForLevel])

  const fetchAllOrbitData = useCallback(async () => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

    const fetchId = ++fetchIdRef.current
    setOrbitError('')
    setIsLoadingOrbits(true)

    try {
      const newOrbitData = {}
      const newUserLocks = {}
      const derivedDownline = {}
      const derivedSpillover = {}
      const newLinePaymentCountsByLevel = {}

      const BATCH_SIZE = 2
      const BATCH_DELAY = 700
      const POSITION_CHUNK_SIZE = 5

      for (let batchStart = 1; batchStart <= 10; batchStart += BATCH_SIZE) {
        const batchPromises = []

        for (let level = batchStart; level < batchStart + BATCH_SIZE && level <= 10; level++) {
          const orbitType = levelToOrbitType[level]
          const config = orbitTypeConfig[orbitType]
          const orbitContract = contracts[config.contract]

          if (!orbitContract) continue

          const levelPromise = (async () => {
            try {
              const orbitState = await withRetry(() => orbitContract.getUserOrbit(viewAddress, level))

              let lineCounts = { line1: 0, line2: 0, line3: 0 }
              try {
                const counts = await withRetry(() => orbitContract.getLinePaymentCounts(viewAddress, level))
                lineCounts = {
                  line1: Number(counts[0] ?? 0),
                  line2: Number(counts[1] ?? 0),
                  line3: Number(counts[2] ?? 0)
                }
              } catch {}

              const positions = []
              const myPositions = []
              const downlinePositions = []
              const otherOccupants = []
              const positionTasks = []

              for (let pos = 1; pos <= config.positions; pos++) {
                positionTasks.push(async () => {
                  try {
                    const position = await withRetry(() => orbitContract.getPosition(viewAddress, level, pos))
                    const occupantAddress = position[0]
                    const amountRaw = position[1]
                    const timestampRaw = position[2]

                    let ruleView = null
                    try {
                      const ruleCall = await tryContractCall(
                        orbitContract,
                        ['getPositionRuleView'],
                        [viewAddress, level, pos]
                      )
                      if (ruleCall.ok) {
                        ruleView = normalizeRuleView(ruleCall.result)
                      }
                    } catch {}

                    const posInfo = buildPositionInfoFromRuleView(orbitType, pos, level, ruleView, viewAddress)

                    const activationData = await getLivePositionActivationData(
                      orbitContract,
                      viewAddress,
                      level,
                      pos
                    )

                    // Use the new async receipt fetcher
                    const receiptsForActivation =
                      activationData.activationId > 0
                        ? await getReceiptsForPositionActivation(activationData.activationId)
                        : []

                    const receiptSummary =
                      activationData.activationId > 0
                        ? await getReceiptSummaryForPositionActivation(level, activationData.activationId)
                        : {
                            count: 0,
                            gross: 0,
                            escrow: 0,
                            liquid: 0,
                            founderPathGross: 0,
                            directOwnerGross: 0,
                            routedSpilloverGross: 0,
                            recycleGross: 0
                          }

                    const truthLabel = getPositionTruthLabel(receiptsForActivation)

                    let occupantType = 'empty'

                    if (occupantAddress && occupantAddress !== ethers.ZeroAddress) {
                      let referrer = ethers.ZeroAddress
                      try {
                        referrer = await getCachedReferrer(occupantAddress)
                      } catch {}

                      occupantType = classifyOccupantType(
                        occupantAddress,
                        viewAddress,
                        referrer,
                        truthLabel,
                        receiptsForActivation
                      )

                      if (occupantType === 'mine') {
                        myPositions.push(pos)
                      } else if (occupantType === 'downline') {
                        downlinePositions.push({
                          position: pos,
                          user: occupantAddress,
                          amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
                          timestamp: Number(timestampRaw || 0) > 0
                            ? new Date(Number(timestampRaw) * 1000).toLocaleString()
                            : '',
                          level,
                          activated: false,
                          positionInfo: posInfo
                        })
                      } else {
                        otherOccupants.push({
                          position: pos,
                          user: occupantAddress,
                          amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
                          timestamp: Number(timestampRaw || 0) > 0
                            ? new Date(Number(timestampRaw) * 1000).toLocaleString()
                            : '',
                          level,
                          positionInfo: posInfo,
                          originalReferrer: referrer
                        })
                      }
                    }

                    const viewerReceipts = receiptsForActivation.filter((receipt) => {
                      const receiver = (receipt?.receiver || ethers.ZeroAddress).toLowerCase()
                      return receiver === (viewAddress || '').toLowerCase()
                    })

                    const viewerReceiptBreakdown = {
                      count: 0,
                      totalGross: 0,
                      totalLiquid: 0,
                      totalEscrow: 0,
                      directOwnerGross: 0,
                      directOwnerLiquid: 0,
                      directOwnerEscrow: 0,
                      routedSpilloverGross: 0,
                      routedSpilloverLiquid: 0,
                      routedSpilloverEscrow: 0,
                      founderPathGross: 0,
                      founderPathLiquid: 0,
                      founderPathEscrow: 0,
                      recycleGross: 0,
                      recycleLiquid: 0,
                      recycleEscrow: 0
                    }

                    viewerReceipts.forEach((receipt) => {
                      const gross = Number(receipt?.grossAmount || 0)
                      const liquid = Number(receipt?.liquidPaid || 0)
                      const escrow = Number(receipt?.escrowLocked || 0)
                      const type = Number(receipt?.receiptType || 0)

                      viewerReceiptBreakdown.count += 1
                      viewerReceiptBreakdown.totalGross += gross
                      viewerReceiptBreakdown.totalLiquid += liquid
                      viewerReceiptBreakdown.totalEscrow += escrow

                      if (type === RECEIPT_TYPES.DIRECT_OWNER) {
                        viewerReceiptBreakdown.directOwnerGross += gross
                        viewerReceiptBreakdown.directOwnerLiquid += liquid
                        viewerReceiptBreakdown.directOwnerEscrow += escrow
                      } else if (type === RECEIPT_TYPES.ROUTED_SPILLOVER) {
                        viewerReceiptBreakdown.routedSpilloverGross += gross
                        viewerReceiptBreakdown.routedSpilloverLiquid += liquid
                        viewerReceiptBreakdown.routedSpilloverEscrow += escrow
                      } else if (type === RECEIPT_TYPES.FOUNDER_PATH) {
                        viewerReceiptBreakdown.founderPathGross += gross
                        viewerReceiptBreakdown.founderPathLiquid += liquid
                        viewerReceiptBreakdown.founderPathEscrow += escrow
                      } else if (type === RECEIPT_TYPES.RECYCLE) {
                        viewerReceiptBreakdown.recycleGross += gross
                        viewerReceiptBreakdown.recycleLiquid += liquid
                        viewerReceiptBreakdown.recycleEscrow += escrow
                      }
                    })

                    return {
                      number: pos,
                      occupantType,
                      occupant: occupantAddress !== ethers.ZeroAddress ? occupantAddress : null,
                      amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
                      timestamp: timestampRaw,
                      positionInfo: posInfo,
                      ruleView,
                      line: posInfo.line,
                      spillsTo: posInfo.spillsTo,
                      parentPosition: posInfo.parentPosition,
                      activationId: activationData.activationId,
                      activationCycleNumber: activationData.cycleNumber,
                      isMirrorActivation: activationData.isMirror,
                      payoutReceipts: receiptsForActivation,
                      payoutReceiptSummary: receiptSummary,
                      viewerReceipts,
                      viewerReceiptBreakdown,
                      truthLabel
                    }
                  } catch {
                    const posInfo = buildPositionInfoFromRuleView(orbitType, pos, level, null, viewAddress)
                    return {
                      number: pos,
                      occupantType: 'empty',
                      occupant: null,
                      amount: '0',
                      timestamp: 0,
                      positionInfo: posInfo,
                      ruleView: null,
                      line: posInfo.line,
                      spillsTo: posInfo.spillsTo,
                      parentPosition: posInfo.parentPosition,
                      activationId: 0,
                      activationCycleNumber: 0,
                      isMirrorActivation: false,
                      payoutReceipts: [],
                      payoutReceiptSummary: {
                        count: 0,
                        gross: 0,
                        escrow: 0,
                        liquid: 0,
                        founderPathGross: 0,
                        directOwnerGross: 0,
                        routedSpilloverGross: 0,
                        recycleGross: 0
                      },
                      viewerReceipts: [],
                      viewerReceiptBreakdown: {
                        count: 0,
                        totalGross: 0,
                        totalLiquid: 0,
                        totalEscrow: 0,
                        directOwnerGross: 0,
                        directOwnerLiquid: 0,
                        directOwnerEscrow: 0,
                        routedSpilloverGross: 0,
                        routedSpilloverLiquid: 0,
                        routedSpilloverEscrow: 0,
                        founderPathGross: 0,
                        founderPathLiquid: 0,
                        founderPathEscrow: 0,
                        recycleGross: 0,
                        recycleLiquid: 0,
                        recycleEscrow: 0
                      },
                      truthLabel: 'NO_RECEIPT'
                    }
                  }
                })
              }

              const positionResults = []
              for (const chunk of chunkArray(positionTasks, POSITION_CHUNK_SIZE)) {
                const chunkResults = await Promise.all(chunk.map(task => task()))
                positionResults.push(...chunkResults)
                await delay(120)
              }

              positions.push(...positionResults)

              const structuralLinks = positions
                .filter((p) => p.parentPosition && p.occupant)
                .map((p) => ({
                  from: p.number,
                  to: p.parentPosition,
                  user: p.occupant,
                  amount: p.amount
                }))

              let escrowLock = '0'
              if (level < 10) {
                try {
                  const lockedAmount = await withRetry(() =>
                    contracts.escrow.getLockedAmount(viewAddress, level, level + 1)
                  )
                  escrowLock = ethers.formatUnits(lockedAmount, 6)
                } catch {}
              }

              const receiptBucket = receiptBucketsByLevel[level] || {
                receipts: [],
                byFromUser: {},
                totals: {
                  gross: 0,
                  escrow: 0,
                  liquid: 0,
                  founderPathGross: 0,
                  founderPathEscrow: 0,
                  founderPathLiquid: 0,
                  directOwnerGross: 0,
                  directOwnerEscrow: 0,
                  directOwnerLiquid: 0,
                  routedSpilloverGross: 0,
                  routedSpilloverEscrow: 0,
                  routedSpilloverLiquid: 0,
                  recycleGross: 0,
                  recycleEscrow: 0,
                  recycleLiquid: 0
                }
              }

              return {
                level,
                data: {
                  orbitType,
                  config,
                  currentIndex: Number(orbitState[0] ?? 1),
                  escrowBalance: ethers.formatUnits(orbitState[1] ?? 0, 6),
                  autoUpgradeCompleted: Boolean(orbitState[2] ?? false),
                  positionsInLine1: Number(orbitState[3] ?? 0),
                  positionsInLine2: Number(orbitState[4] ?? 0),
                  positionsInLine3: Number(orbitState[5] ?? 0),
                  totalCycles: Number(orbitState[6] ?? 0),
                  totalEarned: ethers.formatUnits(orbitState[7] ?? 0, 6),
                  positions,
                  myPositions,
                  downlinePositions,
                  otherOccupants,
                  spilloverFromPositions: structuralLinks,
                  linePaymentCounts: lineCounts,
                  receiptCount: receiptBucket.receipts.length
                },
                escrowLock
              }
            } catch {
              const positions = []
              for (let pos = 1; pos <= config.positions; pos++) {
                const posInfo = buildPositionInfoFromRuleView(orbitType, pos, level, null, viewAddress)
                positions.push({
                  number: pos,
                  occupantType: 'empty',
                  occupant: null,
                  amount: '0',
                  timestamp: 0,
                  positionInfo: posInfo,
                  ruleView: null,
                  line: posInfo.line,
                  spillsTo: posInfo.spillsTo,
                  parentPosition: posInfo.parentPosition,
                  activationId: 0,
                  activationCycleNumber: 0,
                  isMirrorActivation: false,
                  payoutReceipts: [],
                  payoutReceiptSummary: {
                    count: 0,
                    gross: 0,
                    escrow: 0,
                    liquid: 0,
                    founderPathGross: 0,
                    directOwnerGross: 0,
                    routedSpilloverGross: 0,
                    recycleGross: 0
                  },
                  viewerReceipts: [],
                  viewerReceiptBreakdown: {
                    count: 0,
                    totalGross: 0,
                    totalLiquid: 0,
                    totalEscrow: 0,
                    directOwnerGross: 0,
                    directOwnerLiquid: 0,
                    directOwnerEscrow: 0,
                    routedSpilloverGross: 0,
                    routedSpilloverLiquid: 0,
                    routedSpilloverEscrow: 0,
                    founderPathGross: 0,
                    founderPathLiquid: 0,
                    founderPathEscrow: 0,
                    recycleGross: 0,
                    recycleLiquid: 0,
                    recycleEscrow: 0
                  },
                  truthLabel: 'NO_RECEIPT'
                })
              }

              return {
                level,
                data: {
                  orbitType,
                  config,
                  currentIndex: 1,
                  escrowBalance: '0',
                  autoUpgradeCompleted: false,
                  positionsInLine1: 0,
                  positionsInLine2: 0,
                  positionsInLine3: 0,
                  totalCycles: 0,
                  totalEarned: '0',
                  positions,
                  myPositions: [],
                  downlinePositions: [],
                  otherOccupants: [],
                  spilloverFromPositions: [],
                  linePaymentCounts: { line1: 0, line2: 0, line3: 0 },
                  receiptCount: 0
                },
                escrowLock: '0'
              }
            }
          })()

          batchPromises.push(levelPromise)
        }

        const batchResults = await Promise.all(batchPromises)

        batchResults.forEach(result => {
          if (result) {
            newOrbitData[result.level] = result.data
            newLinePaymentCountsByLevel[result.level] = result.data.linePaymentCounts || { line1: 0, line2: 0, line3: 0 }
            derivedDownline[result.level] = result.data.downlinePositions || derivedDownline[result.level] || []
            derivedSpillover[result.level] = result.data.otherOccupants || derivedSpillover[result.level] || []

            if (result.level < 10) {
              newUserLocks[result.level] = result.escrowLock
            }
          }
        })

        if (batchStart + BATCH_SIZE <= 10) {
          await delay(BATCH_DELAY)
        }
      }

      if (fetchId !== fetchIdRef.current) return

      setOrbitData(newOrbitData)
      setUserLocks(newUserLocks)
      setDownlineData(derivedDownline)
      setSpilloverData(derivedSpillover)
      setLinePaymentCountsByLevel(newLinePaymentCountsByLevel)
      await fetchViewedLevels(true)
    } catch (err) {
      console.error('Orbit sync error:', err)
      setOrbitError(t('orbits.loadFailed'))
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoadingOrbits(false)
      }
    }
  }, [
    contracts,
    viewAddress,
    getCachedReferrer,
    withRetry,
    t,
    receiptBucketsByLevel,
    getReceiptsForPositionActivation,
    getReceiptSummaryForPositionActivation,
    getPositionTruthLabel,
    classifyOccupantType,
    getLivePositionActivationData,
    fetchViewedLevels
  ])

  const getViewerReceiptsForPosition = useCallback((position) => {
    if (!position?.payoutReceipts || !Array.isArray(position.payoutReceipts)) return []

    const viewerLower = (viewAddress || '').toLowerCase()
    if (!viewerLower) return []

    return position.payoutReceipts.filter((receipt) => {
      const receiver = (receipt?.receiver || ethers.ZeroAddress).toLowerCase()
      return receiver === viewerLower
    })
  }, [viewAddress])

  const getViewerReceiptBreakdownForPosition = useCallback((position) => {
    const viewerReceipts = getViewerReceiptsForPosition(position)

    const breakdown = {
      count: viewerReceipts.length,
      totalGross: 0,
      totalLiquid: 0,
      totalEscrow: 0,
      directOwnerGross: 0,
      directOwnerLiquid: 0,
      directOwnerEscrow: 0,
      routedSpilloverGross: 0,
      routedSpilloverLiquid: 0,
      routedSpilloverEscrow: 0,
      founderPathGross: 0,
      founderPathLiquid: 0,
      founderPathEscrow: 0,
      recycleGross: 0,
      recycleLiquid: 0,
      recycleEscrow: 0
    }

    for (const receipt of viewerReceipts) {
      const gross = Number(receipt?.grossAmount || 0)
      const liquid = Number(receipt?.liquidPaid || 0)
      const escrow = Number(receipt?.escrowLocked || 0)
      const type = Number(receipt?.receiptType || 0)

      breakdown.totalGross += gross
      breakdown.totalLiquid += liquid
      breakdown.totalEscrow += escrow

      if (type === RECEIPT_TYPES.DIRECT_OWNER) {
        breakdown.directOwnerGross += gross
        breakdown.directOwnerLiquid += liquid
        breakdown.directOwnerEscrow += escrow
      } else if (type === RECEIPT_TYPES.ROUTED_SPILLOVER) {
        breakdown.routedSpilloverGross += gross
        breakdown.routedSpilloverLiquid += liquid
        breakdown.routedSpilloverEscrow += escrow
      } else if (type === RECEIPT_TYPES.FOUNDER_PATH) {
        breakdown.founderPathGross += gross
        breakdown.founderPathLiquid += liquid
        breakdown.founderPathEscrow += escrow
      } else if (type === RECEIPT_TYPES.RECYCLE) {
        breakdown.recycleGross += gross
        breakdown.recycleLiquid += liquid
        breakdown.recycleEscrow += escrow
      }
    }

    return breakdown
  }, [getViewerReceiptsForPosition])

  const didViewerActuallyReceiveFromPosition = useCallback((position) => {
    const viewerBreakdown = getViewerReceiptBreakdownForPosition(position)
    return (
      viewerBreakdown.totalGross > 0 ||
      viewerBreakdown.totalLiquid > 0 ||
      viewerBreakdown.totalEscrow > 0
    )
  }, [getViewerReceiptBreakdownForPosition])

  const getViewerRoleLabelForPosition = useCallback((position) => {
    const viewerBreakdown = getViewerReceiptBreakdownForPosition(position)

    if (viewerBreakdown.founderPathGross > 0) return 'FOUNDER_PATH'
    if (viewerBreakdown.directOwnerGross > 0) return 'DIRECT_OWNER'
    if (viewerBreakdown.routedSpilloverGross > 0) return 'ROUTED_SPILLOVER'
    if (viewerBreakdown.recycleGross > 0) return 'RECYCLE'
    return 'NONE'
  }, [getViewerReceiptBreakdownForPosition])

  // ============================================================
  // PATCH 1 — Receipt-backed global routing helper
  // ============================================================
  const getReceiptBackedGlobalRouting = useCallback((position) => {
    const receipts = Array.isArray(position?.payoutReceipts) ? position.payoutReceipts : []

    const grouped = {
      founderPath: {},
      directOwner: {},
      routedSpillover: {},
      recycle: {},
      escrowTotal: 0
    }

    for (const receipt of receipts) {
      const receiver = receipt?.receiver || ethers.ZeroAddress
      const gross = Number(receipt?.grossAmount || 0)
      const escrow = Number(receipt?.escrowLocked || 0)
      const type = Number(receipt?.receiptType || 0)

      grouped.escrowTotal += escrow

      if (type === RECEIPT_TYPES.FOUNDER_PATH) {
        grouped.founderPath[receiver] = (grouped.founderPath[receiver] || 0) + gross
      } else if (type === RECEIPT_TYPES.DIRECT_OWNER) {
        grouped.directOwner[receiver] = (grouped.directOwner[receiver] || 0) + gross
      } else if (type === RECEIPT_TYPES.ROUTED_SPILLOVER) {
        grouped.routedSpillover[receiver] = (grouped.routedSpillover[receiver] || 0) + gross
      } else if (type === RECEIPT_TYPES.RECYCLE) {
        grouped.recycle[receiver] = (grouped.recycle[receiver] || 0) + gross
      }
    }

    return grouped
  }, [])

  // Helper to check if the viewer earned from a specific payment
  const didViewerEarnPayment = useCallback((receiver, amount) => {
    if (!account || !viewAddress) return false
    const receiverLower = receiver.toLowerCase()
    const viewerLower = viewAddress.toLowerCase()
    const accountLower = account.toLowerCase()
    
    // Check if the receiver matches either the viewed address or the connected account
    return (receiverLower === viewerLower || receiverLower === accountLower) && amount > 0
  }, [account, viewAddress])

  const refreshData = async () => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    setIsRefreshing(true)

    try {
      await fetchViewedLevels(true)
      await fetchViewedAddressReceipts(true)
      await fetchAllOrbitData()
      setLastUpdated(new Date().toLocaleTimeString())
      // Clear activation receipt cache on refresh
      activationReceiptCacheRef.current.clear()
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const applyViewerAddress = async () => {
    if (!inputAddress || !ethers.isAddress(inputAddress)) {
      setOrbitError(t('orbits.enterValidAddress'))
      return
    }

    setOrbitError('')
    const normalized = ethers.getAddress(inputAddress)

    viewedLevelsCacheRef.current.delete(normalized.toLowerCase())
    receiptCacheRef.current.delete(normalized.toLowerCase())
    activationReceiptCacheRef.current.clear() // Clear activation receipt cache

    setInputAddress(normalized)
    setViewAddress(normalized)
    setViewMode('global')
    setSelectedCycleByLevel({})
    setCycleHistoryData({})
    setCycleHistorySupportByLevel({})
    setViewAddressReceipts([])
    setReceiptBucketsByLevel({})
    cycleHistoryCacheRef.current.clear()
  }

  const viewMyOrbit = () => {
    if (!account) return

    viewedLevelsCacheRef.current.delete(account.toLowerCase())
    receiptCacheRef.current.delete(account.toLowerCase())
    activationReceiptCacheRef.current.clear() // Clear activation receipt cache

    setOrbitError('')
    setInputAddress(account)
    setViewAddress(account)
    setViewMode('global')
    setSelectedCycleByLevel({})
    setCycleHistoryData({})
    setCycleHistorySupportByLevel({})
    setViewAddressReceipts([])
    setReceiptBucketsByLevel({})
    cycleHistoryCacheRef.current.clear()
  }

  const getHighestViewedActiveLevel = useCallback(() => {
    const activeLevels = Object.keys(viewedLevels)
      .filter(level => viewedLevels[level])
      .map(Number)
      .sort((a, b) => b - a)

    return activeLevels[0] || 0
  }, [viewedLevels])

  const getHistoricalCycleSelection = useCallback((level) => {
    return selectedCycleByLevel[level] || 'current'
  }, [selectedCycleByLevel])

  const setHistoricalCycleSelection = (level, cycleKey) => {
    setSelectedCycleByLevel(prev => ({
      ...prev,
      [level]: cycleKey
    }))
  }

  const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
    const angle = (index / total) * 360 + startAngle
    const radian = (angle * Math.PI) / 180
    return {
      x: centerX + radiusPx * Math.cos(radian),
      y: centerY + radiusPx * Math.sin(radian),
      angle
    }
  }

  const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
    const radian = (angle * Math.PI) / 180
    return {
      x: centerX + radiusPx * Math.cos(radian),
      y: centerY + radiusPx * Math.sin(radian),
      angle
    }
  }

  const getPlanetSize = (orbitType, stageSize) => {
    const base = orbitType === 'P39' ? 34 : 44
    if (stageSize <= 260) return orbitType === 'P39' ? 22 : 30
    if (stageSize <= 420) return orbitType === 'P39' ? 26 : 36
    return base
  }

  const getCoreSize = (orbitType, stageSize) => {
    if (stageSize <= 260) return orbitType === 'P39' ? 64 : 74
    if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
    return orbitType === 'P39' ? 80 : 96
  }

  const getOrbitStructure = (orbitType) => {
    return {
      P4: {
        lines: [1],
        counts: { 1: 4 },
        positions: { 1: [1, 2, 3, 4] },
        startAngles: { 1: -90 },
        customAngles: {
          1: { 1: -90, 2: 0, 3: 90, 4: 180 }
        }
      },
      P12: {
        lines: [1, 2],
        counts: { 1: 3, 2: 9 },
        positions: {
          1: [1, 2, 3],
          2: [4, 5, 6, 7, 8, 9, 10, 11, 12]
        },
        startAngles: { 1: -90, 2: -90 },
        customAngles: {
          1: { 1: -90, 2: 30, 3: 150 },
          2: {
            4: -138, 7: -102, 10: -66,
            5: -18, 8: 18, 11: 54,
            6: 102, 9: 138, 12: 174
          }
        }
      },
      P39: {
        lines: [1, 2, 3],
        counts: { 1: 3, 2: 9, 3: 27 },
        positions: {
          1: [1, 2, 3],
          2: [4, 5, 6, 7, 8, 9, 10, 11, 12],
          3: Array.from({ length: 27 }, (_, i) => i + 13)
        },
        startAngles: { 1: -90, 2: -90, 3: -90 },
        customAngles: {
          1: { 1: -90, 2: 30, 3: 150 },
          2: {
            4: -138, 7: -102, 10: -66,
            5: -18, 8: 18, 11: 54,
            6: 102, 9: 138, 12: 174
          },
          3: {
            13: -145, 22: -133, 31: -121,
            14: -25, 23: -13, 32: -1,
            15: 95, 24: 107, 33: 119,
            16: -109, 25: -97, 34: -85,
            17: 11, 26: 23, 35: 35,
            18: 131, 27: 143, 36: 155,
            19: -73, 28: -61, 37: -49,
            20: 47, 29: 59, 38: 71,
            21: 167, 30: 179, 39: 191
          }
        }
      }
    }[orbitType] || {
      lines: [1],
      counts: { 1: 4 },
      positions: { 1: [1, 2, 3, 4] },
      startAngles: { 1: -90 },
      customAngles: {
        1: { 1: -90, 2: 0, 3: 90, 4: 180 }
      }
    }
  }

  const getStarConfig = (count = 36) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${((i * 17.73) % 100).toFixed(2)}%`,
      top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
      size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
      delay: `${(i * 0.27).toFixed(2)}s`,
      duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
      drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
      opacity: i % 4 === 0 ? 0.65 : 0.35
    }))
  }

  const starConfig = getStarConfig(40)


//   const getLiquidEarnedByAddressForPosition = useCallback((position, targetAddress) => {
//   if (!position?.payoutReceipts || !Array.isArray(position.payoutReceipts) || !targetAddress) {
//     return 0
//   }

//   const targetLower = targetAddress.toLowerCase()

//   return position.payoutReceipts.reduce((sum, receipt) => {
//     const receiverLower = (receipt?.receiver || '').toLowerCase()
//     if (receiverLower !== targetLower) return sum
//     return sum + Number(receipt?.liquidPaid || 0)
//   }, 0)
// }, [])

// const getPlanetBadgeValue = useCallback((position) => {
//   if (!position?.occupant) return 0

//   if (receiptsSupported) {
//     return getLiquidEarnedByAddressForPosition(position, position.occupant)
//   }

//   return Number(position?.positionInfo?.exactToOwner || 0)
// }, [receiptsSupported, getLiquidEarnedByAddressForPosition])

    const getPlanetBadgeValue = useCallback((position) => {
      if (!position?.occupant) return 0

      if (receiptsSupported) {
        return Number(position?.viewerReceiptBreakdown?.totalLiquid || 0)
      }

      return Number(position?.positionInfo?.exactToOwner || 0)
    }, [receiptsSupported])

  const renderPositionTooltip = (position) => {
    if (!position.occupant) {
      return (
        <Tooltip id={`tooltip-empty-${position.number}`}>
          <strong>{t('orbits.emptyPosition')}</strong>
          <div>{t('orbits.availableToBeFilled')}</div>
          {position.parentPosition && (
            <div className="text-warning mt-1">
              Structural parent: Position {position.parentPosition}
            </div>
          )}
          {!receiptsSupported && (
            <div className="text-muted mt-1 small">
              Receipt verification unavailable
            </div>
          )}
        </Tooltip>
      )
    }

    const fmtAddr = (addr) => (addr && addr !== ethers.ZeroAddress ? shortAddress(addr) : '—')
    // get receipt routing for this position
    const receiptRouting = getReceiptBackedGlobalRouting(position)

    const viewerBreakdown = position.viewerReceiptBreakdown || {
      count: 0,
      totalGross: 0,
      totalLiquid: 0,
      totalEscrow: 0,
      directOwnerGross: 0,
      directOwnerLiquid: 0,
      directOwnerEscrow: 0,
      routedSpilloverGross: 0,
      routedSpilloverLiquid: 0,
      routedSpilloverEscrow: 0,
      founderPathGross: 0,
      founderPathLiquid: 0,
      founderPathEscrow: 0,
      recycleGross: 0,
      recycleLiquid: 0,
      recycleEscrow: 0
    }

    const viewerActuallyReceived =
      viewerBreakdown.totalGross > 0 ||
      viewerBreakdown.totalLiquid > 0 ||
      viewerBreakdown.totalEscrow > 0

    const viewerRole =
      viewerBreakdown.founderPathGross > 0 ? 'FOUNDER_PATH' :
      viewerBreakdown.directOwnerGross > 0 ? 'DIRECT_OWNER' :
      viewerBreakdown.routedSpilloverGross > 0 ? 'ROUTED_SPILLOVER' :
      viewerBreakdown.recycleGross > 0 ? 'RECYCLE' :
      'NONE'

    return (
      <Tooltip id={`tooltip-${position.number}`}>
        <div><strong>Position #{position.number}</strong> (Line {position.line})</div>
        <div><strong>Occupant:</strong> {shortAddress(position.occupant)}</div>
        <div>
          <strong>Amount entered (net):</strong> {formatUsdtDisplay(getNetAmount(Number(position.amount)))} USDT
          <small className="text-muted d-block">
            (Gross: {formatUsdtDisplay(position.amount)} USDT - 10% fee)
          </small>
        </div>

        {position.parentPosition && (
          <div className="text-warning mt-1">
            Structural parent: Position {position.parentPosition}
          </div>
        )}

        {position.positionInfo?.linePaymentNumber > 0 && (
          <div className="text-info mt-1">
            Arrival in line: #{position.positionInfo.linePaymentNumber}
          </div>
        )}

        {position.occupantType === 'downline' && (
          <div className="text-warning mt-1">
            {t('orbits.directDownlineViewedAddress')}
          </div>
        )}

        {position.occupantType === 'mine' && (
          <div className="text-success mt-1">
            {t('orbits.belongsToViewedAddress')}
          </div>
        )}

        <hr className="my-2" />
        <div className="fw-bold">Global routing for this activation:</div>

        {/* Use receipt-based routing when available */}
        {receiptsSupported && position.payoutReceipts?.length > 0 ? (
          <>
            {Object.entries(receiptRouting.founderPath).map(([receiver, amount]) => (
              <div className="small" key={`fp-${receiver}`}>
                <span className="fw-bold">Founder Path:</span>{' '}
                {formatUsdtDisplay(amount)} USDT
                <span className="text-muted"> → {fmtAddr(receiver)}</span>
                {didViewerEarnPayment(receiver, amount) && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
            ))}

            {Object.entries(receiptRouting.directOwner).map(([receiver, amount]) => (
              <div className="small" key={`do-${receiver}`}>
                <span className="fw-bold">Owner Payment:</span>{' '}
                {formatUsdtDisplay(amount)} USDT
                <span className="text-muted"> → {fmtAddr(receiver)}</span>
                {didViewerEarnPayment(receiver, amount) && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
            ))}

            {Object.entries(receiptRouting.routedSpillover).map(([receiver, amount], index) => (
              <div className="small" key={`rs-${receiver}`}>
                <span className="fw-bold">Spillover {index + 1} Payment:</span>{' '}
                {formatUsdtDisplay(amount)} USDT
                <span className="text-muted"> → {fmtAddr(receiver)}</span>
                {didViewerEarnPayment(receiver, amount) && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
            ))}
          </>
        ) : position.positionInfo?.isFounderNoReferrerPath ? (
          <div className="small">
            <span className="fw-bold">Founder Path:</span>{' '}
            {formatUsdtDisplay(position.positionInfo.exactToOwner)} USDT to ID1
            {didViewerEarnPayment(position.positionInfo.orbitOwner, position.positionInfo.exactToOwner) && (
              <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                ✓ You earned this
              </Badge>
            )}
          </div>
        ) : (
          <>
            {position.positionInfo?.exactToOwner > 0 && (
              <div className="small">
                <span className="fw-bold">Owner Payment:</span>{' '}
                {formatUsdtDisplay(position.positionInfo.exactToOwner)} USDT
                {position.positionInfo.orbitOwner && position.positionInfo.orbitOwner !== ethers.ZeroAddress && (
                  <span className="text-muted"> → {fmtAddr(position.positionInfo.orbitOwner)}</span>
                )}
                {didViewerEarnPayment(position.positionInfo.orbitOwner, position.positionInfo.exactToOwner) && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
            )}

            {position.positionInfo?.exactToSpillover1 > 0 && (
              <div className="small">
                <span className="fw-bold">Spillover 1 Payment:</span>{' '}
                {formatUsdtDisplay(position.positionInfo.exactToSpillover1)} USDT
                {position.positionInfo.spillover1Recipient &&
                  position.positionInfo.spillover1Recipient !== ethers.ZeroAddress && (
                  <span className="text-muted"> → {fmtAddr(position.positionInfo.spillover1Recipient)}</span>
                )}
                {didViewerEarnPayment(position.positionInfo.spillover1Recipient, position.positionInfo.exactToSpillover1) && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
            )}

            {position.positionInfo?.exactToSpillover2 > 0 && (
              <div className="small">
                <span className="fw-bold">Spillover 2 Payment:</span>{' '}
                {formatUsdtDisplay(position.positionInfo.exactToSpillover2)} USDT
                {position.positionInfo.spillover2Recipient &&
                  position.positionInfo.spillover2Recipient !== ethers.ZeroAddress && (
                  <span className="text-muted"> → {fmtAddr(position.positionInfo.spillover2Recipient)}</span>
                )}
                {didViewerEarnPayment(position.positionInfo.spillover2Recipient, position.positionInfo.exactToSpillover2) && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
            )}
          </>
        )}

        {/* Escrow line with receipt-backed total */}
        {(receiptsSupported && position.payoutReceipts?.length > 0)
          ? (
            receiptRouting.escrowTotal > 0 ? (
              <div className="small">
                <span className="fw-bold">Escrow locked:</span>{' '}
                {formatUsdtDisplay(receiptRouting.escrowTotal)} USDT
                {didViewerEarnPayment(viewAddress, receiptRouting.escrowTotal) && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
            ) : (
              <div className="small text-muted">No escrow locked</div>
            )
          )
          : (
            position.positionInfo?.exactToEscrow > 0 ? (
              <div className="small">
                <span className="fw-bold">Escrow locked:</span>{' '}
                {formatUsdtDisplay(position.positionInfo.exactToEscrow)} USDT
                {didViewerEarnPayment(viewAddress, position.positionInfo.exactToEscrow) && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
            ) : (
              <div className="small text-muted">No escrow locked</div>
            )
          )
        }

        {position.positionInfo?.exactToRecycle > 0 && (
          <div className="small">
            <span className="fw-bold">Recycled:</span>{' '}
            {formatUsdtDisplay(position.positionInfo.exactToRecycle)} USDT
          </div>
        )}

        <hr className="my-2" />
        <div className="fw-bold">What you actually received from this activation:</div>

        {receiptsSupported ? (
          viewerActuallyReceived ? (
            <>
              <div className="small">
                <span className="fw-bold">Your role:</span> {viewerRole}
              </div>
              <div className="small">
                <span className="fw-bold">Gross credited to you:</span>{' '}
                {formatUsdtDisplay(viewerBreakdown.totalGross)} USDT
                {viewerBreakdown.totalGross > 0 && (
                  <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem', background: '#28a745' }}>
                    ✓ You earned this
                  </Badge>
                )}
              </div>
              <div className="small">
                <span className="fw-bold">Liquid received:</span>{' '}
                {formatUsdtDisplay(viewerBreakdown.totalLiquid)} USDT
              </div>
              <div className="small">
                <span className="fw-bold">Escrow locked for you:</span>{' '}
                {formatUsdtDisplay(viewerBreakdown.totalEscrow)} USDT
              </div>
            </>
          ) : (
            <div className="text-muted mt-1 small">
              You did not receive any payment from this activation.
            </div>
          )
        ) : (
          <div className="text-muted mt-2 small">
            Receipt verification unavailable – showing rule-view distribution only.
          </div>
        )}
      </Tooltip>
    )
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
  }

  const handlePositionClick = (position) => {
    setSelectedPosition(position)
    setShowPositionModal(true)
  }

  const handleStructuralPreview = (position) => {
    if (position.parentPosition) {
      setShowStructuralPreview(true)
      setTimeout(() => setShowStructuralPreview(false), 2000)
    }
  }

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => {
    if (account && !viewAddress) {
      setViewAddress(account)
      setInputAddress(account)
    }
  }, [account, viewAddress])

  useEffect(() => {
    const updateSize = () => {
      if (galaxyRef.current) {
        const { width, height } = galaxyRef.current.getBoundingClientRect()
        if (width > 0 && height > 0 && (width !== containerSize.width || height !== containerSize.height)) {
          setContainerSize({ width, height })
        }
      }
    }

    const timer = setTimeout(updateSize, 120)
    window.addEventListener('resize', updateSize)

    let resizeObserver
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(updateSize)
      if (galaxyRef.current) {
        resizeObserver.observe(galaxyRef.current)
      }
    }

    return () => {
      window.removeEventListener('resize', updateSize)
      if (resizeObserver) resizeObserver.disconnect()
      clearTimeout(timer)
    }
  }, [activeTab, orbitData, cycleHistoryData, selectedCycleByLevel, containerSize.width, containerSize.height])

  useEffect(() => {
    if (Object.keys(orbitData).length > 0 && galaxyRef.current) {
      const { width, height } = galaxyRef.current.getBoundingClientRect()
      if (width > 0 && height > 0) {
        setContainerSize({ width, height })
      }
    }
  }, [orbitData, cycleHistoryData, selectedCycleByLevel, activeTab])

  useEffect(() => {
    if (contracts && viewAddress && ethers.isAddress(viewAddress)) {
      fetchViewedLevels(true)
      fetchViewedAddressReceipts(true)
    }
  }, [contracts, viewAddress, fetchViewedLevels, fetchViewedAddressReceipts])

  useEffect(() => {
    if (contracts && viewAddress && ethers.isAddress(viewAddress)) {
      fetchAllOrbitData()
    }
  }, [contracts, viewAddress, fetchAllOrbitData, viewAddressReceipts])

  useEffect(() => {
    const match = activeTab?.match(/^level(\d+)$/)
    if (!match) return

    const level = Number(match[1])
    const selectedCycle = getHistoricalCycleSelection(level)

    if (selectedCycle !== 'current') {
      loadCycleHistoryForLevel(level, Number(selectedCycle))
    }
  }, [activeTab, selectedCycleByLevel, getHistoricalCycleSelection, loadCycleHistoryForLevel])

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  // ============================================================
  // RENDER
  // ============================================================
 const orbitStyles = `
  @keyframes pulse-line {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes orbit-glow {
    0%, 100% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.08), 0 0 12px rgba(0, 68, 204, 0.08) inset; }
    50% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.15), 0 0 20px rgba(0, 68, 204, 0.12) inset; }
  }
  @keyframes structural-pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.75); }
    70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
  }
  @keyframes rotate-slow {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes rotate-reverse {
    from { transform: translate(-50%, -50%) rotate(360deg); }
    to { transform: translate(-50%, -50%) rotate(0deg); }
  }
  @keyframes float {
    0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
    50% { transform: translate(-50%, -50%) translateY(-4px); }
  }
  @keyframes core-pulse {
    0%, 100% { box-shadow: 0 0 28px rgba(0,35,102,0.35), 0 0 60px rgba(0,68,204,0.12); }
    50% { box-shadow: 0 0 36px rgba(0,35,102,0.45), 0 0 75px rgba(0,68,204,0.18); }
  }
  @keyframes core-pulse-inactive {
    0%, 100% { box-shadow: 0 0 18px rgba(108,117,125,0.18), 0 0 36px rgba(108,117,125,0.08); }
    50% { box-shadow: 0 0 24px rgba(108,117,125,0.22), 0 0 48px rgba(108,117,125,0.12); }
  }
  @keyframes twinkle {
    0%, 100% { opacity: 0.18; transform: scale(1); }
    50% { opacity: 0.95; transform: scale(1.55); }
  }
  @keyframes drift {
    0% { transform: translateY(0px) translateX(0px); }
    50% { transform: translateY(-3px) translateX(2px); }
    100% { transform: translateY(0px) translateX(0px); }
  }
  @keyframes glow-border {
    0%, 100% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 18px 50px rgba(0,35,102,0.05); }
    50% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 22px 60px rgba(0,35,102,0.08); }
  }

  .lab-card {
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 24px;
    box-shadow: 0 14px 40px rgba(0, 35, 102, 0.06);
    overflow: hidden;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .orbit-header {
    background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
    color: white;
    font-family: 'monospace';
    font-size: 0.85rem;
    padding: 10px 20px;
    text-transform: uppercase;
    letter-spacing: 2px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    box-shadow: inset 0 -1px 0 rgba(255,255,255,0.08);
  }

  .cycle-badge {
    background: linear-gradient(135deg, #ffd54f 0%, #ffc107 100%);
    color: #002366;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    box-shadow: 0 4px 10px rgba(255,193,7,0.25);
  }

  .cycle-switcher-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 14px;
  }

  .cycle-switcher-label {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #6c757d;
    margin-right: 4px;
  }

  .cycle-switcher-btn {
    border-radius: 999px !important;
    padding: 4px 12px !important;
    font-size: 0.76rem !important;
    font-weight: 700 !important;
    border-width: 1px !important;
    box-shadow: 0 8px 18px rgba(0,0,0,0.04);
  }

  .cycle-switcher-btn.active {
    background: linear-gradient(135deg, #002366 0%, #0044cc 100%) !important;
    border-color: #002366 !important;
    color: #fff !important;
    box-shadow: 0 10px 22px rgba(0,68,204,0.18);
  }

  .cycle-history-note {
    margin-bottom: 14px;
    padding: 10px 12px;
    border-radius: 14px;
    font-size: 0.78rem;
    line-height: 1.45;
    color: #52627a;
    background: rgba(248, 249, 250, 0.92);
    border: 1px solid rgba(0,35,102,0.06);
  }

  .history-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.14);
    color: #fff;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 1px;
    margin-left: 10px;
    border: 1px solid rgba(255,255,255,0.16);
  }

  .history-summary-card {
    margin-top: 12px;
    padding: 14px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(244,247,252,0.95) 100%);
    border: 1px solid rgba(0,35,102,0.05);
  }

  .history-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    font-size: 0.86rem;
  }

  .history-summary-label {
    color: #6c757d;
    font-weight: 700;
  }

  .history-summary-value {
    color: #002366;
    font-weight: 800;
    font-family: monospace;
    text-align: right;
  }

  .galaxy-container {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    max-width: 660px;
    margin: 20px auto;
    min-height: 320px;
    border-radius: 34px;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 50%, rgba(27, 75, 196, 0.08) 0%, rgba(5, 22, 62, 0.06) 28%, rgba(2, 10, 33, 0.94) 74%, rgba(0, 7, 24, 0.98) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow:
      inset 0 0 80px rgba(0, 119, 255, 0.06),
      inset 0 0 24px rgba(255,255,255,0.03),
      0 24px 60px rgba(0,35,102,0.12);
    animation: glow-border 6s ease-in-out infinite;
  }

  .galaxy-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 18%, rgba(0, 174, 255, 0.10), transparent 16%),
      radial-gradient(circle at 82% 24%, rgba(132, 94, 255, 0.08), transparent 18%),
      radial-gradient(circle at 52% 80%, rgba(255, 193, 7, 0.06), transparent 20%);
    pointer-events: none;
    z-index: 0;
  }

  .galaxy-grid {
    position: absolute;
    inset: 0;
    border-radius: 34px;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(82, 145, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(82, 145, 255, 0.045) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: radial-gradient(circle at center, black 0%, rgba(0,0,0,0.82) 56%, transparent 90%);
    opacity: 0.35;
    z-index: 1;
  }

  .star-field {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .star {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    box-shadow: 0 0 6px rgba(255,255,255,0.4);
    animation: twinkle 3.2s ease-in-out infinite, drift 8s ease-in-out infinite;
  }

  .galaxy-inner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  .galaxy-stage {
    position: absolute;
    inset: 7%;
    border-radius: 50%;
  }

  .orbit-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    pointer-events: none;
    transition: all 0.3s ease;
    animation: orbit-glow 4.2s ease-in-out infinite;
    background: radial-gradient(circle at center, transparent 96%, rgba(255,255,255,0.22) 100%);
    overflow: visible;
  }

  .orbit-ring::before {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.03);
    pointer-events: none;
  }

  .orbit-ring.line1 {
    border: 2px solid rgba(89, 150, 255, 0.36);
    animation: orbit-glow 4.2s ease-in-out infinite, rotate-slow 30s linear infinite;
  }

  .orbit-ring.line2 {
    border: 2px dashed rgba(89, 150, 255, 0.26);
    animation: orbit-glow 5.2s ease-in-out infinite, rotate-reverse 48s linear infinite;
  }

  .orbit-ring.line3 {
    border: 2px dotted rgba(89, 150, 255, 0.20);
    animation: orbit-glow 6.2s ease-in-out infinite, rotate-slow 75s linear infinite;
  }

  .ring-label {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255,255,255,0.12);
    color: #dce9ff;
    padding: 5px 13px;
    border-radius: 999px;
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.3px;
    white-space: nowrap;
    pointer-events: none;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow: 0 10px 24px rgba(0,0,0,0.18);
  }

  .ring-stats {
    position: absolute;
    bottom: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255,255,255,0.10);
    color: #bfd4ff;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 700;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 10px 24px rgba(0,0,0,0.16);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(10px);
  }

  .planet-node {
    position: absolute;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.28s ease, filter 0.28s ease, border-color 0.28s ease;
    z-index: 10;
    box-shadow: 0 8px 20px rgba(0,0,0,0.28);
    border: 2px solid rgba(255,255,255,0.90);
    animation: float 4s ease-in-out infinite;
    animation-delay: calc(var(--index) * 0.12s);
    will-change: transform;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .planet-node:hover {
    transform: translate(-50%, -50%) scale(1.18);
    z-index: 100;
    box-shadow: 0 14px 32px rgba(0,0,0,0.30), 0 0 20px rgba(92, 154, 255, 0.14);
    filter: saturate(1.08) brightness(1.04);
    animation: none;
    border-color: rgba(255,255,255,1);
  }

  .galaxy-container.p39 .planet-node {
    width: 34px;
    height: 34px;
  }

  .galaxy-container.p39 .node-number {
    font-size: 13px;
  }

  .planet-my-position {
    background: linear-gradient(135deg, rgba(40, 167, 69, 0.95) 0%, rgba(32, 201, 151, 0.95) 100%);
    color: white;
    box-shadow: 0 0 20px rgba(40, 167, 69, 0.46), 0 10px 24px rgba(0,0,0,0.20);
  }

  .planet-downline {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.96) 0%, rgba(253, 126, 20, 0.96) 100%);
    color: white;
    box-shadow: 0 0 20px rgba(255, 193, 7, 0.26), 0 10px 24px rgba(0,0,0,0.20);
  }

  .planet-other {
    background: linear-gradient(135deg, rgba(0, 102, 204, 0.96) 0%, rgba(0, 153, 255, 0.96) 100%);
    color: white;
    box-shadow: 0 0 20px rgba(0, 102, 204, 0.22), 0 10px 24px rgba(0,0,0,0.20);
  }

  .planet-empty {
    background: rgba(255, 255, 255, 0.92);
    color: #dc3545;
    border: 2px solid rgba(255, 107, 107, 0.95) !important;
    box-shadow: 0 8px 20px rgba(220, 53, 69, 0.10), 0 10px 24px rgba(0,0,0,0.16);
  }

  .planet-structural-preview {
    background: linear-gradient(135deg, #ffca28 0%, #ffb300 100%);
    color: #002366;
    animation: structural-pulse 2s infinite !important;
    z-index: 50;
  }

  .planet-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .node-number {
    font-size: 16px;
    font-weight: 800;
    text-shadow: 0 1px 2px rgba(0,0,0,0.22);
    line-height: 1;
  }

  .planet-icon {
    position: absolute;
    top: -4px;
    right: -4px;
    background: linear-gradient(135deg, #ffe082 0%, #ffc107 100%);
    color: #002366;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    box-shadow: 0 4px 10px rgba(0,0,0,0.22);
    border: 1px solid white;
  }

  .planet-earn-badge {
    position: absolute;
    top: -8px;
    left: -8px;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    border-radius: 12px;
    padding: 2px 6px;
    font-size: 9px;
    font-weight: bold;
    white-space: nowrap;
    box-shadow: 0 4px 10px rgba(0,0,0,0.20);
    border: 1px solid white;
  }

  .structural-connection {
    position: absolute;
    background: linear-gradient(90deg, rgba(255, 215, 64, 0.98), rgba(255, 179, 0, 0.98));
    height: 2px;
    transform-origin: 0 0;
    z-index: 5;
    pointer-events: none;
    box-shadow: 0 0 10px rgba(255, 193, 7, 0.55);
    border-radius: 999px;
  }

  .structural-connection-grey {
    position: absolute;
    background: rgb(22, 253, 5);
    height: 1px;
    transform-origin: 0 0;
    z-index: 4;
    pointer-events: none;
    border-radius: 999px;
    border-top: 1px dashed rgba(112, 112, 140, 0.5);
  }

  .orbit-core {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 96px;
    height: 96px;
    background: radial-gradient(circle at 30% 30%, rgba(40, 129, 255, 1), rgba(0, 35, 102, 1));
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    box-shadow: 0 0 40px rgba(0,35,102,0.35);
    border: 3px solid rgba(255,255,255,0.95);
    z-index: 20;
    animation: core-pulse 3.2s ease-in-out infinite;
    backdrop-filter: blur(12px);
  }

  .orbit-core-inactive {
    background: radial-gradient(circle at 30% 30%, rgba(173, 181, 189, 0.96), rgba(73, 80, 87, 0.96));
    color: #f8f9fa;
    box-shadow: 0 0 24px rgba(108,117,125,0.24);
    border: 3px solid rgba(255,255,255,0.75);
    animation: core-pulse-inactive 3.2s ease-in-out infinite;
  }

  .orbit-core::before {
    content: '';
    position: absolute;
    inset: -7px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow: 0 0 18px rgba(0, 119, 255, 0.20);
    pointer-events: none;
  }

  .orbit-core-inactive::before {
    box-shadow: 0 0 12px rgba(108,117,125,0.18);
  }

  .core-label {
    font-size: 10px;
    text-transform: uppercase;
    opacity: 0.88;
    letter-spacing: 1.2px;
  }

  .core-value {
    font-size: 16px;
    font-weight: 800;
    text-shadow: 0 2px 4px rgba(0,0,0,0.30);
    text-align: center;
    line-height: 1.1;
  }

  .color-legend {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(248, 249, 250, 0.82);
    border-radius: 16px;
    flex-wrap: wrap;
    justify-content: center;
    border: 1px solid rgba(0,35,102,0.06);
    backdrop-filter: blur(8px);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    min-width: 0;
  }

  .legend-item span {
    word-break: break-word;
  }

  .legend-color {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    box-shadow: 0 6px 14px rgba(0,0,0,0.10);
    flex-shrink: 0;
  }

  .legend-color.green { background: #28a745; }
  .legend-color.orange { background: #fd7e14; }
  .legend-color.blue { background: #0066cc; }
  .legend-color.gold { background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%); }
  .legend-color.red { background: white; border: 2px solid #dc3545; }
  .legend-color.gray { background: linear-gradient(135deg, #adb5bd 0%, #495057 100%); }

  .energy-cell .progress {
    height: 12px;
    background: rgba(240, 244, 248, 0.8);
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.04);
    backdrop-filter: blur(6px);
  }

  .pulse-overlay {
    background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.02) 45%, rgba(0, 68, 204, 0.08) 50%, rgba(0, 35, 102, 0.02) 55%, transparent 100%);
    background-size: 200% 100%;
    animation: pulse-line 5s linear infinite;
  }

  .nav-tabs {
    flex-wrap: nowrap !important;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    scrollbar-width: thin;
    padding-bottom: 4px;
  }

  .nav-tabs::-webkit-scrollbar {
    height: 6px;
  }

  .nav-tabs::-webkit-scrollbar-thumb {
    background: rgba(0,35,102,0.18);
    border-radius: 999px;
  }

  .nav-tabs .nav-item {
    flex: 0 0 auto;
  }

  .nav-tabs .nav-link {
    border: none;
    color: #666;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 1px;
    padding: 15px 25px;
    white-space: nowrap;
  }

  .nav-tabs .nav-link.active {
    color: #002366;
    border-bottom: 3px solid #002366;
    background: transparent;
  }

  .refresh-button {
    background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 6px 16px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 10px 20px rgba(0,68,204,0.16);
    white-space: nowrap;
  }

  .refresh-button:hover {
    background: linear-gradient(135deg, #003085 0%, #0055ff 100%);
    transform: translateY(-1px);
    color: white;
  }

  .view-toggle {
    display: flex;
    gap: 10px;
    margin-left: 20px;
    flex-wrap: wrap;
  }

  .view-toggle .btn {
    border-radius: 999px;
    padding: 6px 16px;
    font-size: 0.8rem;
    box-shadow: 0 8px 18px rgba(0,0,0,0.04);
    white-space: nowrap;
  }

  .view-toggle .btn.active {
    background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
    color: white;
    border-color: #002366;
    box-shadow: 0 10px 22px rgba(0,68,204,0.18);
  }

  .position-modal .modal-dialog {
    max-width: min(680px, calc(100vw - 24px));
  }

  .position-modal .modal-content {
    border-radius: 24px;
    border: none;
    box-shadow: 0 24px 50px rgba(0,0,0,0.20);
    backdrop-filter: blur(12px);
    overflow: hidden;
  }

  .position-modal .modal-header {
    background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
    color: white;
    border-bottom: none;
    padding: 20px;
  }

  .position-modal .modal-body {
    padding: 25px;
    background: rgba(255,255,255,0.96);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    gap: 16px;
  }

  .info-label {
    font-weight: 600;
    color: #666;
    flex: 0 0 auto;
  }

  .info-value {
    font-family: monospace;
    font-weight: 700;
    color: #002366;
    text-align: right;
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .commission-breakdown {
    background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(244,247,252,0.95) 100%);
    border-radius: 16px;
    padding: 15px;
    margin: 15px 0;
    border: 1px solid rgba(0,35,102,0.05);
  }

  .commission-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    font-size: 0.9rem;
  }

  .commission-item:last-child {
    border-bottom: none;
  }

  .commission-amount {
    font-weight: 700;
    color: #002366;
    text-align: right;
  }

  .commission-amount.payout { color: #28a745; }
  .commission-amount.escrow { color: #0dcaf0; }

  .earned-caption {
    font-size: 0.78rem;
    color: #6c757d;
    line-height: 1.4;
    margin-top: 6px;
  }

  .form-control { min-width: 0; }
  .text-truncate { max-width: 100%; }
  .badge { vertical-align: middle; }

  @media (max-width: 1200px) {
    .galaxy-container { max-width: 620px; }
  }

  @media (max-width: 991.98px) {
    .container.mt-5.pt-4 {
      padding-left: 16px;
      padding-right: 16px;
    }

    .d-flex.align-items-center.justify-content-between.mt-5.mb-4 {
      flex-direction: column;
      align-items: stretch !important;
      gap: 16px;
    }

    .d-flex.align-items-center.justify-content-between.mt-5.mb-4 > div:last-child {
      justify-content: space-between;
      width: 100%;
      flex-wrap: wrap;
      gap: 12px;
    }

    .d-flex.align-items-center.justify-content-between.mt-5.mb-4 .text-muted.small.me-3 {
      margin-right: 0 !important;
    }

    .view-toggle {
      margin-left: 0;
      margin-top: 14px;
      width: 100%;
      justify-content: flex-start;
    }

    .lab-card.p-3.mb-4 .d-flex.gap-2 {
      flex-wrap: wrap;
      width: 100%;
    }

    .lab-card.p-3.mb-4 .d-flex.gap-2 .btn {
      flex: 1 1 180px;
    }

    .galaxy-container {
      max-width: 100%;
      min-height: 280px;
      border-radius: 28px;
    }

    .position-modal .modal-body {
      padding: 20px;
    }
  }

  @media (max-width: 768px) {
    .d-flex.align-items-center.justify-content-between {
      flex-direction: column;
      gap: 15px;
    }

    .view-toggle { margin-left: 0; }
    .cycle-switcher-wrap { justify-content: flex-start; }

    .orbit-header {
      font-size: 0.74rem;
      letter-spacing: 1.1px;
      padding: 10px 14px;
    }

    .lab-card { border-radius: 20px; }

    .galaxy-container {
      aspect-ratio: 1 / 1;
      min-height: 250px;
      margin: 12px auto 8px;
      border-radius: 24px;
    }

    .color-legend {
      gap: 12px;
      padding: 12px;
      justify-content: flex-start;
    }

    .legend-item {
      font-size: 0.78rem;
      flex: 1 1 220px;
    }

    .nav-tabs .nav-link {
      font-size: 0.72rem;
      padding: 12px 16px;
      letter-spacing: 0.6px;
    }

    .info-row,
    .commission-item {
      flex-direction: column;
      align-items: flex-start;
    }

    .info-value,
    .commission-amount {
      text-align: left;
    }
  }

  @media (max-width: 575.98px) {
    .container.mt-5.pt-4 {
      padding-left: 12px;
      padding-right: 12px;
    }

    .d-flex.align-items-center.justify-content-between.mt-5.mb-4 h1 {
      font-size: 1.25rem !important;
      letter-spacing: 1px !important;
      line-height: 1.2;
    }

    .d-flex.align-items-center.justify-content-between.mt-5.mb-4 > div:first-child {
      flex-direction: column;
      align-items: flex-start !important;
      gap: 12px;
      width: 100%;
    }

    .d-flex.align-items-center.justify-content-between.mt-5.mb-4 > div:first-child > div:first-child {
      align-self: stretch;
    }

    .view-toggle {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .view-toggle .btn {
      width: 100%;
      justify-content: center;
    }

    .orbit-header {
      font-size: 0.68rem;
      padding: 10px 12px;
    }

    .cycle-switcher-wrap { gap: 6px; }

    .cycle-switcher-btn {
      padding: 5px 10px !important;
      font-size: 0.7rem !important;
    }

    .history-summary-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .history-summary-value { text-align: left; }

    .galaxy-container {
      min-height: 220px;
      border-radius: 20px;
    }

    .planet-icon {
      width: 16px;
      height: 16px;
      font-size: 9px;
      top: -3px;
      right: -3px;
    }

    .core-label {
      font-size: 8px;
      letter-spacing: 0.8px;
    }

    .core-value { font-size: 13px; }

    .ring-label,
    .ring-stats {
      max-width: 86%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lab-card.p-3.mb-4 .d-flex.gap-2 {
      flex-direction: column;
    }

    .lab-card.p-3.mb-4 .d-flex.gap-2 .btn {
      width: 100%;
    }

    .p-4 { padding: 1rem !important; }

    .position-modal .modal-header { padding: 16px; }
    .position-modal .modal-body { padding: 16px; }
    .position-modal .modal-footer { padding: 12px 16px 16px; }
  }

  @media (max-width: 420px) {
    .container.mt-5.pt-4 {
      padding-left: 10px;
      padding-right: 10px;
    }

    .d-flex.align-items-center.justify-content-between.mt-5.mb-4 h1 {
      font-size: 1.08rem !important;
    }

    .orbit-header {
      font-size: 0.62rem;
      letter-spacing: 0.4px;
    }

    .nav-tabs .nav-link {
      font-size: 0.66rem;
      padding: 10px 12px;
    }

    .legend-item {
      flex: 1 1 100%;
      font-size: 0.74rem;
    }

    .galaxy-container { min-height: 200px; }

    .cycle-history-note,
    .earned-caption,
    .small,
    .form-label {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  }

  @media (max-width: 360px) {
    .d-flex.align-items-center.justify-content-between.mt-5.mb-4 h1 {
      font-size: 0.98rem !important;
    }

    .orbit-header { font-size: 0.58rem; }

    .galaxy-container {
      min-height: 190px;
      border-radius: 18px;
    }

    .color-legend { padding: 10px; }

    .ring-label,
    .ring-stats {
      font-size: 0.5rem;
    }
  }

  @media (max-width: 768px) {
    .planet-node {
      width: 28px !important;
      height: 28px !important;
    }

    .galaxy-container.p39 .planet-node {
      width: 22px !important;
      height: 22px !important;
    }

    .planet-earn-badge {
      display: none !important;
    }

    .node-number {
      font-size: 11px !important;
    }

    .galaxy-container {
      margin: 10px auto;
      padding: 0;
    }

    .galaxy-stage { inset: 5%; }

    .orbit-ring,
    .orbit-ring.line1,
    .orbit-ring.line2,
    .orbit-ring.line3 {
      border-width: 1.5px !important;
    }

    .orbit-core {
      width: 60px !important;
      height: 60px !important;
    }

    .galaxy-container.p39 .orbit-core {
      width: 50px !important;
      height: 50px !important;
    }

    .core-value { font-size: 12px !important; }
    .core-label { font-size: 7px !important; }

    .planet-icon {
      width: 14px !important;
      height: 14px !important;
      font-size: 8px !important;
      top: -3px !important;
      right: -3px !important;
    }

    .structural-connection,
    .structural-connection-grey {
      opacity: 0.8;
    }
  }

  @media (max-width: 576px) {
    .planet-node {
      width: 24px !important;
      height: 24px !important;
    }

    .galaxy-container.p39 .planet-node {
      width: 18px !important;
      height: 18px !important;
    }

    .node-number { font-size: 10px !important; }

    .orbit-core {
      width: 50px !important;
      height: 50px !important;
    }

    .galaxy-container.p39 .orbit-core {
      width: 42px !important;
      height: 42px !important;
    }

    .core-value { font-size: 10px !important; }
    .core-label { font-size: 6px !important; }
    .galaxy-stage { inset: 4%; }

    .planet-icon {
      width: 12px !important;
      height: 12px !important;
      font-size: 7px !important;
    }
  }

  @media (max-width: 480px) {
    .planet-node {
      width: 20px !important;
      height: 20px !important;
    }

    .galaxy-container.p39 .planet-node {
      width: 16px !important;
      height: 16px !important;
    }

    .node-number { font-size: 9px !important; }

    .orbit-core {
      width: 42px !important;
      height: 42px !important;
    }

    .galaxy-container.p39 .orbit-core {
      width: 36px !important;
      height: 36px !important;
    }

    .core-value { font-size: 9px !important; }
    .core-label { font-size: 5px !important; }
    .galaxy-stage { inset: 3%; }

    .planet-icon {
      width: 10px !important;
      height: 10px !important;
      font-size: 6px !important;
      top: -2px !important;
      right: -2px !important;
    }

    .orbit-ring,
    .orbit-ring.line1,
    .orbit-ring.line2,
    .orbit-ring.line3 {
      border-width: 1px !important;
    }

    .ring-label {
      font-size: 0.5rem !important;
      padding: 3px 8px !important;
      top: -10px !important;
    }

    .ring-stats {
      font-size: 0.45rem !important;
      padding: 3px 8px !important;
      bottom: -10px !important;
    }
  }

  @media (max-width: 360px) {
    .planet-node {
      width: 18px !important;
      height: 18px !important;
    }

    .galaxy-container.p39 .planet-node {
      width: 14px !important;
      height: 14px !important;
    }

    .node-number { font-size: 8px !important; }

    .orbit-core {
      width: 36px !important;
      height: 36px !important;
    }

    .galaxy-container.p39 .orbit-core {
      width: 30px !important;
      height: 30px !important;
    }

    .galaxy-stage { inset: 2%; }

    .ring-label {
      font-size: 0.4rem !important;
      padding: 2px 6px !important;
      top: -8px !important;
    }

    .ring-stats {
      font-size: 0.35rem !important;
      padding: 2px 6px !important;
      bottom: -8px !important;
    }
  }

  @media (max-height: 520px) and (orientation: landscape) {
    .galaxy-container {
      min-height: 260px;
      max-width: 560px;
    }

    .p-4 {
      padding: 0.9rem !important;
    }
  }

  @media (max-width: 991px) {
    .row > .col-lg-8,
    .row > .col-lg-4 {
      width: 100% !important;
      flex: 0 0 100% !important;
      max-width: 100% !important;
    }

    .row > .col-lg-8 {
      margin-bottom: 1.5rem;
    }

    .galaxy-container {
      max-width: 100% !important;
      width: 100% !important;
      margin: 10px auto;
    }

    .energy-cell {
      margin-top: 0;
    }
  }

  @media (max-width: 768px) {
    .row > .col-lg-8 {
      margin-bottom: 1.25rem;
    }
  }

  @media (max-width: 576px) {
    .row > .col-lg-8 {
      margin-bottom: 1rem;
    }
  }
  `

  // Early returns before render
  if (!isConnected) {
    return (
      <Container className="mt-5 pt-5">
        <style>{orbitStyles}</style>
        <Alert
          variant="primary"
          className="text-center p-5 lab-card shadow-lg"
          style={{ backgroundColor: '#002366', color: 'white', border: 'none' }}
        >
          <h4 className="fw-bold">{t('orbits.connectTitle')}</h4>
          <p className="m-0 opacity-75">{t('orbits.connectText')}</p>
        </Alert>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container className="mt-5 text-center">
        <style>{orbitStyles}</style>
        <Spinner animation="grow" variant="primary" />
        <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>
          {t('orbits.syncing')}
        </p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="mt-5">
        <style>{orbitStyles}</style>
        <Alert variant="danger" className="lab-card shadow-sm border-0">
          <strong>{t('orbits.panelError')}:</strong> {error}
        </Alert>
      </Container>
    )
  }

  if (orbitError) {
    return (
      <Container className="mt-5">
        <style>{orbitStyles}</style>
        <Alert variant="danger" className="lab-card shadow-sm border-0">
          <strong className="text-danger">{t('orbits.systemAlert')}:</strong> {orbitError}
        </Alert>
      </Container>
    )
  }

  if (isLoadingOrbits) {
    return (
      <Container className="mt-5 pt-4">
        <style>{orbitStyles}</style>
        <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
          <div className="d-flex align-items-center">
            <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
            <h1
              className="m-0 fw-black text-uppercase"
              style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}
            >
              {t('orbits.pageTitle')}
            </h1>
          </div>
        </div>

        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 fw-bold text-muted">{t('orbits.loading')}</p>
        </div>
      </Container>
    )
  }

  const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
  const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
  const isViewingSelf =
    !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()
  const highestViewedActiveLevel = getHighestViewedActiveLevel()

  // Compute receipt routing for selected position for modal
  const selectedPositionReceiptRouting = selectedPosition
    ? getReceiptBackedGlobalRouting(selectedPosition)
    : {
        founderPath: {},
        directOwner: {},
        routedSpillover: {},
        recycle: {},
        escrowTotal: 0
      }

  return (
    <Container className="mt-5 pt-4">
      <style>{orbitStyles}</style>

      <Modal
        show={showPositionModal}
        onHide={() => setShowPositionModal(false)}
        className="position-modal"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {t('orbits.positionDetails', { number: selectedPosition?.number })}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedPosition && (
            <>
              <div className="info-row">
                <span className="info-label">{t('orbits.positionType')}</span>
                <span className="info-value">
                  {(selectedPosition.truthLabel || selectedPosition.positionInfo?.type || 'unknown').toUpperCase()}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">{t('orbits.line')}</span>
                <span className="info-value">
                  {t('orbits.line')} {selectedPosition.positionInfo?.line}
                </span>
              </div>

              {selectedPosition.positionInfo?.linePaymentNumber > 0 && (
                <div className="info-row">
                  <span className="info-label">Line arrival #</span>
                  <span className="info-value">{selectedPosition.positionInfo.linePaymentNumber}</span>
                </div>
              )}

              {selectedPosition.parentPosition && (
                <div className="info-row">
                  <span className="info-label">Structural Parent</span>
                  <span className="info-value">Position {selectedPosition.parentPosition}</span>
                </div>
              )}

              {selectedPosition.occupant ? (
                <>
                  <div className="info-row">
                    <span className="info-label">{t('orbits.occupiedBy')}</span>
                    <span className="info-value">
                      {selectedPosition.occupantType === 'mine'
                        ? (isViewingSelf ? t('orbits.you') : t('orbits.viewedOwner'))
                        : shortAddress(selectedPosition.occupant)}
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">{t('orbits.fullAddress')}</span>
                    <span className="info-value" style={{ fontSize: '0.8rem' }}>
                      {selectedPosition.occupant}
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">{t('orbits.amountEntered')} (net)</span>
                    <span className="info-value">
                      {formatUsdtDisplay(getNetAmount(Number(selectedPosition.amount)))} USDT
                      <small className="text-muted d-block">
                        Gross: {formatUsdtDisplay(selectedPosition.amount)} USDT
                      </small>
                    </span>
                  </div>

                  {selectedPosition.timestamp > 0 && (
                    <div className="info-row">
                      <span className="info-label">{t('orbits.filledOn')}</span>
                      <span className="info-value">
                        {new Date(Number(selectedPosition.timestamp) * 1000).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {receiptsSupported && (
                    <>
                      <div className="info-row">
                        <span className="info-label">Truth source</span>
                        <span className="info-value">LevelManager receipts</span>
                      </div>

                      <div className="info-row">
                        <span className="info-label">Matched receipts</span>
                        <span className="info-value">
                          {selectedPosition.payoutReceiptSummary?.count || 0}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="commission-breakdown">
                    <h6 className="fw-bold mb-3">{t('orbits.routingBreakdown')}</h6>

                    {/* Global distribution section - shows ALL earners from activation receipts */}
                    {receiptsSupported && selectedPosition.payoutReceipts?.length > 0 ? (
                      <>
                        {Object.entries(selectedPositionReceiptRouting.founderPath).map(([receiver, amount]) => (
                          <div className="commission-item" key={`fp-${receiver}`}>
                            <span>
                              Founder Path: {shortAddress(receiver)}
                              {didViewerEarnPayment(receiver, amount) && (
                                <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                                  ✓ You earned this
                                </Badge>
                              )}
                            </span>
                            <span className="commission-amount payout">
                              {formatUsdtDisplay(amount)} USDT
                            </span>
                          </div>
                        ))}

                        {Object.entries(selectedPositionReceiptRouting.directOwner).map(([receiver, amount]) => (
                          <div className="commission-item" key={`do-${receiver}`}>
                            <span>
                              Owner Payment: {shortAddress(receiver)}
                              {didViewerEarnPayment(receiver, amount) && (
                                <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                                  ✓ You earned this
                                </Badge>
                              )}
                            </span>
                            <span className="commission-amount payout">
                              {formatUsdtDisplay(amount)} USDT
                            </span>
                          </div>
                        ))}

                        {Object.entries(selectedPositionReceiptRouting.routedSpillover).map(([receiver, amount], index) => (
                          <div className="commission-item" key={`rs-${receiver}`}>
                            <span>
                              Spillover {index + 1} Payment: {shortAddress(receiver)}
                              {didViewerEarnPayment(receiver, amount) && (
                                <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                                  ✓ You earned this
                                </Badge>
                              )}
                            </span>
                            <span className="commission-amount" style={{ color: '#ffc107' }}>
                              {formatUsdtDisplay(amount)} USDT
                            </span>
                          </div>
                        ))}
                      </>
                    ) : selectedPosition.positionInfo.isFounderNoReferrerPath ? (
                      <div className="commission-item">
                        <span>
                          Founder Path to ID1
                          {didViewerEarnPayment(selectedPosition.positionInfo.orbitOwner, selectedPosition.positionInfo.exactToOwner) && (
                            <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                              ✓ You earned this
                            </Badge>
                          )}
                        </span>
                        <span className="commission-amount payout">
                          {formatUsdtDisplay(selectedPosition.positionInfo.exactToOwner || 0)} USDT
                        </span>
                      </div>
                    ) : (
                      <>
                        {selectedPosition.positionInfo.exactToOwner > 0 && (
                          <div className="commission-item">
                            <span>
                              Owner Payment:{' '}
                              {selectedPosition.positionInfo.orbitOwner &&
                              selectedPosition.positionInfo.orbitOwner !== ethers.ZeroAddress
                                ? shortAddress(selectedPosition.positionInfo.orbitOwner)
                                : '—'}
                              {didViewerEarnPayment(selectedPosition.positionInfo.orbitOwner, selectedPosition.positionInfo.exactToOwner) && (
                                <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                                  ✓ You earned this
                                </Badge>
                              )}
                            </span>
                            <span className="commission-amount payout">
                              {formatUsdtDisplay(selectedPosition.positionInfo.exactToOwner)} USDT
                            </span>
                          </div>
                        )}

                        {selectedPosition.positionInfo.exactToSpillover1 > 0 && (
                          <div className="commission-item">
                            <span>
                              Spillover 1 Payment:{' '}
                              {selectedPosition.positionInfo.spillover1Recipient &&
                              selectedPosition.positionInfo.spillover1Recipient !== ethers.ZeroAddress
                                ? shortAddress(selectedPosition.positionInfo.spillover1Recipient)
                                : '—'}
                              {didViewerEarnPayment(selectedPosition.positionInfo.spillover1Recipient, selectedPosition.positionInfo.exactToSpillover1) && (
                                <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                                  ✓ You earned this
                                </Badge>
                              )}
                            </span>
                            <span className="commission-amount" style={{ color: '#ffc107' }}>
                              {formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover1)} USDT
                            </span>
                          </div>
                        )}

                        {selectedPosition.positionInfo.exactToSpillover2 > 0 && (
                          <div className="commission-item">
                            <span>
                              Spillover 2 Payment:{' '}
                              {selectedPosition.positionInfo.spillover2Recipient &&
                              selectedPosition.positionInfo.spillover2Recipient !== ethers.ZeroAddress
                                ? shortAddress(selectedPosition.positionInfo.spillover2Recipient)
                                : '—'}
                              {didViewerEarnPayment(selectedPosition.positionInfo.spillover2Recipient, selectedPosition.positionInfo.exactToSpillover2) && (
                                <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                                  ✓ You earned this
                                </Badge>
                              )}
                            </span>
                            <span className="commission-amount" style={{ color: '#ffc107' }}>
                              {formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover2)} USDT
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Escrow line */}
                    <div className="commission-item">
                      <span>
                        Escrow locked
                        {(receiptsSupported && selectedPosition.payoutReceipts?.length > 0 
                          ? selectedPositionReceiptRouting.escrowTotal > 0 && didViewerEarnPayment(viewAddress, selectedPositionReceiptRouting.escrowTotal)
                          : selectedPosition.positionInfo.exactToEscrow > 0 && didViewerEarnPayment(viewAddress, selectedPosition.positionInfo.exactToEscrow)) && (
                          <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                            ✓ You earned this
                          </Badge>
                        )}
                      </span>
                      <span className="commission-amount escrow">
                        {formatUsdtDisplay(
                          receiptsSupported && selectedPosition.payoutReceipts?.length > 0
                            ? selectedPositionReceiptRouting.escrowTotal
                            : (selectedPosition.positionInfo.exactToEscrow || 0)
                        )} USDT
                      </span>
                    </div>

                    {selectedPosition.positionInfo.exactToRecycle > 0 && (
                      <div className="commission-item">
                        <span>Recycled</span>
                        <span className="commission-amount" style={{ color: '#6c757d' }}>
                          {formatUsdtDisplay(selectedPosition.positionInfo.exactToRecycle)} USDT
                        </span>
                      </div>
                    )}

                    <hr className="my-3" />
                    <h6 className="fw-bold mb-3">What you actually received from this activation</h6>

                    {receiptsSupported ? (
                      (selectedPosition.viewerReceiptBreakdown?.count || 0) > 0 ? (
                        <>
                          <div className="commission-item">
                            <span>Your matched receipts</span>
                            <span className="commission-amount">
                              {selectedPosition.viewerReceiptBreakdown.count}
                            </span>
                          </div>

                          <div className="commission-item">
                            <span>Gross credited to you</span>
                            <span className="commission-amount payout">
                              {formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalGross)} USDT
                            </span>
                            {selectedPosition.viewerReceiptBreakdown.totalGross > 0 && (
                              <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem', background: '#28a745' }}>
                                ✓ You earned this
                              </Badge>
                            )}
                          </div>

                          <div className="commission-item">
                            <span>Liquid received</span>
                            <span className="commission-amount payout">
                              {formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalLiquid)} USDT
                            </span>
                          </div>

                          <div className="commission-item">
                            <span>Escrow locked for you</span>
                            <span className="commission-amount escrow">
                              {formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.totalEscrow)} USDT
                            </span>
                          </div>

                          {selectedPosition.viewerReceiptBreakdown.directOwnerGross > 0 && (
                            <div className="commission-item">
                              <span>Your DIRECT_OWNER share</span>
                              <span className="commission-amount payout">
                                {formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.directOwnerGross)} USDT
                              </span>
                            </div>
                          )}

                          {selectedPosition.viewerReceiptBreakdown.routedSpilloverGross > 0 && (
                            <div className="commission-item">
                              <span>Your ROUTED_SPILLOVER share</span>
                              <span className="commission-amount" style={{ color: '#ffc107' }}>
                                {formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.routedSpilloverGross)} USDT
                              </span>
                            </div>
                          )}

                          {selectedPosition.viewerReceiptBreakdown.founderPathGross > 0 && (
                            <div className="commission-item">
                              <span>Your FOUNDER_PATH share</span>
                              <span className="commission-amount payout">
                                {formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.founderPathGross)} USDT
                              </span>
                            </div>
                          )}

                          {selectedPosition.viewerReceiptBreakdown.recycleGross > 0 && (
                            <div className="commission-item">
                              <span>Your RECYCLE share</span>
                              <span className="commission-amount" style={{ color: '#6c757d' }}>
                                {formatUsdtDisplay(selectedPosition.viewerReceiptBreakdown.recycleGross)} USDT
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="alert alert-light mt-3 mb-0 small">
                          You did not receive any payment from this activation.
                        </div>
                      )
                    ) : (
                      <p className="small text-muted mt-3 mb-0">
                        Receipt verification unavailable. Showing orbit rule-view values only.
                      </p>
                    )}

                    {selectedPosition.occupantType === 'downline' && (
                      <div className="alert alert-warning mt-3 mb-0 small">
                        <strong>{t('orbits.downlineAlertTitle')}</strong><br />
                        This occupant is treated as downline for the viewed address in this orbit, either by direct referral or founder-path fallback placement.
                      </div>
                    )}

                    {selectedPosition.occupantType === 'mine' && (
                      <div className="alert alert-success mt-3 mb-0 small">
                        <strong>{t('orbits.mineAlertTitle')}</strong><br />
                        This position belongs to the viewed address.
                      </div>
                    )}

                    {selectedPosition.occupantType === 'other' && (
                      <div className="alert alert-info mt-3 mb-0 small">
                        <strong>{t('orbits.otherAlertTitle')}</strong><br />
                        This occupant is neither the viewed address nor its direct downline.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <h5 className="text-muted">{t('orbits.emptyPosition')}</h5>
                  <p className="small">{t('orbits.availableToBeFilled')}</p>

                  <div className="commission-breakdown mt-3">
                    <h6 className="fw-bold mb-2">{t('orbits.whenFilled')}</h6>
                    <p className="small mb-0">
                      This position is empty. No receipt exists yet for this slot.
                    </p>
                    {selectedPosition.parentPosition && (
                      <p className="small text-warning mt-2">
                        Structural parent: Position {selectedPosition.parentPosition}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPositionModal(false)}>
            {t('orbits.close')}
          </Button>
        </Modal.Footer>
      </Modal>

     
            <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
        <div className="d-flex align-items-center">
          <div
            style={{
              height: '35px',
              width: '8px',
              background: '#002366',
              marginRight: '15px',
              borderRadius: '8px'
            }}
          ></div>
          <h1
            className="m-0 fw-black text-uppercase"
            style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}
          >
            {t('orbits.pageTitle')}
          </h1>

          <div className="view-toggle">
            <Button
              variant={viewMode === 'global' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => handleViewModeChange('global')}
              className={viewMode === 'global' ? 'active' : ''}
            >
              {t('orbits.orbitView')}
            </Button>

            <Button
              variant={viewMode === 'downline' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => handleViewModeChange('downline')}
              className={viewMode === 'downline' ? 'active' : ''}
            >
              {t('orbits.downlineView')}
              {totalDownline > 0 && <Badge bg="warning" className="ms-1">{totalDownline}</Badge>}
              {totalSpillover > 0 && <Badge bg="info" className="ms-1">{totalSpillover} orbit</Badge>}
            </Button>
          </div>
        </div>

        <div className="d-flex align-items-center">
          <span className="text-muted small me-3">
            {t('orbits.lastSync')}: {lastUpdated}
          </span>
          <Button
            variant="link"
            className="refresh-button"
            onClick={refreshData}
            disabled={isRefreshing || !viewAddress || !ethers.isAddress(viewAddress)}
          >
            {isRefreshing ? t('orbits.refreshing') : t('orbits.refresh')}
          </Button>
        </div>
      </div>

      <div className="lab-card p-3 mb-4">
        <Row className="align-items-end g-3">
          <Col lg={8}>
            <Form.Group>
              <Form.Label className="fw-bold small text-uppercase text-muted">
                {t('orbits.addressToView')}
              </Form.Label>
              <Form.Control
                type="text"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                placeholder="0x..."
              />
              <div className="small text-muted mt-2">
                {t('orbits.currentlyViewing')}{' '}
                {viewAddress ? `${viewAddress.slice(0, 8)}...${viewAddress.slice(-6)}` : t('orbits.noAddressSelected')}
                {isViewingSelf && ` ${t('orbits.yourWallet')}`}
              </div>
              <div className="small text-muted mt-1">
                Receipt support: {receiptsSupported ? 'ON' : 'OFF'}
              </div>
            </Form.Group>
          </Col>

          <Col lg={4}>
            <div className="d-flex gap-2">
              <Button onClick={applyViewerAddress} disabled={!inputAddress || !ethers.isAddress(inputAddress)}>
                {t('orbits.loadAddress')}
              </Button>
              <Button variant="outline-secondary" onClick={viewMyOrbit} disabled={!account}>
                {t('orbits.viewMine')}
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      <div className="color-legend">
        <div className="legend-item">
          <div className="legend-color green"></div>
          <span><strong>{t('orbits.legendViewedOwner')}</strong></span>
        </div>
        <div className="legend-item">
          <div className="legend-color orange"></div>
          <span><strong>{t('orbits.legendDirectDownline')}</strong></span>
        </div>
        <div className="legend-item">
          <div className="legend-color blue"></div>
          <span><strong>{t('orbits.legendOtherUser')}</strong></span>
        </div>
        <div className="legend-item">
          <div className="legend-color gold"></div>
          <span><strong>STRUCTURAL PARENT LINK</strong></span>
        </div>
        <div className="legend-item">
          <div className="legend-color red"></div>
          <span><strong>{t('orbits.legendEmpty')}</strong></span>
        </div>
        <div className="legend-item">
          <div className="legend-color gray"></div>
          <span><strong>{t('orbits.legendInactive')}</strong></span>
        </div>
      </div>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 border-0">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
          const data = orbitData[level]
          if (!data) return null

          const { config, positions, currentIndex, autoUpgradeCompleted, totalCycles, orbitType } = data
          const downlineAtLevel = downlineData[level] || []
          const spilloverAtLevel = spilloverData[level] || []
          const levelInfo = levelConfig[level]
          const isLevelActive = !!viewedLevels[level]

          const totalCompletedCycles = Number(totalCycles || 0)
          const availableCycleNumbers = Array.from({ length: totalCompletedCycles }, (_, idx) => idx + 1)
          const selectedCycle = getHistoricalCycleSelection(level)
          const isHistoricalView = selectedCycle !== 'current'
          const historicalPositions = cycleHistoryData[level]?.[String(selectedCycle)] || []
          const displayedPositions = isHistoricalView ? historicalPositions : positions

          const positionsByLine = {}
          displayedPositions.forEach(pos => {
            const line = pos.line
            if (!positionsByLine[line]) positionsByLine[line] = []
            positionsByLine[line].push(pos)
          })

          const structure = getOrbitStructure(orbitType)
          const filledCountForDisplay = displayedPositions.filter(p => p.occupant).length
          const currentIndexForDisplay = isHistoricalView
            ? Math.min(filledCountForDisplay, config.positions)
            : (currentIndex || 1)
          const shouldShowAutoUpgradePanel = isLevelActive && level < 10 && level === highestViewedActiveLevel
          const isLoadingCycleHistory = !!loadingCycleByLevel[level]
          const hasCycleSupport = cycleHistorySupportByLevel[level]
          const showCycleButtons = totalCompletedCycles > 0
          const lineCounts = linePaymentCountsByLevel[level] || data.linePaymentCounts || { line1: 0, line2: 0, line3: 0 }

          return (
            <Tab
              key={level}
              eventKey={`level${level}`}
              title={
                <span>
                  Level {level} ({data.orbitType})
                  {!isLevelActive && <Badge bg="secondary" className="ms-2">{t('orbits.inactive')}</Badge>}
                  {downlineAtLevel.length > 0 && <Badge bg="warning" className="ms-2">{downlineAtLevel.length}</Badge>}
                  {spilloverAtLevel.length > 0 && <Badge bg="info" className="ms-2">{spilloverAtLevel.length}s</Badge>}
                  {autoUpgradeCompleted && <Badge bg="success" className="ms-2">{t('orbits.upgraded')}</Badge>}
                </span>
              }
            >
              <Row>
                <Col lg={8}>
                  <div className="lab-card mb-4">
                    <div className="orbit-header d-flex justify-content-between align-items-center">
                      <span>
                        Level {level} ({data.orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}
                        {totalCycles > 0 && (
                          <span className="cycle-badge ms-3">
                            {t('orbits.cycle', { count: Number(totalCycles) + 1 })}
                          </span>
                        )}
                        {isHistoricalView && (
                          <span className="history-indicator">
                            Viewing Cycle {selectedCycle}
                          </span>
                        )}
                      </span>
                      <div>
                        {!isLevelActive && (
                          <Badge bg="secondary" className="me-2">
                            {t('orbits.inactiveLevel')}
                          </Badge>
                        )}
                        {downlineAtLevel.length > 0 && (
                          <Badge bg="warning" className="me-2">
                            {t('orbits.downlineCount', { count: downlineAtLevel.length })}
                          </Badge>
                        )}
                        {spilloverAtLevel.length > 0 && (
                          <Badge bg="info" className="me-2">
                            {t('orbits.orbitCount', { count: spilloverAtLevel.length })}
                          </Badge>
                        )}
                        <Badge bg="info">{currentIndexForDisplay}/{config.positions} filled</Badge>
                      </div>
                    </div>

                    <div className="p-4">
                      {showCycleButtons && (
                        <div className="cycle-switcher-wrap">
                          <span className="cycle-switcher-label">Cycle View</span>

                          <Button
                            variant={selectedCycle === 'current' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            className={`cycle-switcher-btn ${selectedCycle === 'current' ? 'active' : ''}`}
                            onClick={() => setHistoricalCycleSelection(level, 'current')}
                          >
                            Current
                          </Button>

                          {availableCycleNumbers.map(cycleNumber => (
                            <Button
                              key={`cycle-btn-${level}-${cycleNumber}`}
                              variant={selectedCycle === cycleNumber ? 'primary' : 'outline-secondary'}
                              size="sm"
                              className={`cycle-switcher-btn ${selectedCycle === cycleNumber ? 'active' : ''}`}
                              onClick={() => {
                                setHistoricalCycleSelection(level, cycleNumber)
                                loadCycleHistoryForLevel(level, cycleNumber)
                              }}
                            >
                              Cycle {cycleNumber}
                            </Button>
                          ))}
                        </div>
                      )}

                      {showCycleButtons && isLoadingCycleHistory && (
                        <div className="cycle-history-note">
                          Loading cycle history...
                        </div>
                      )}

                      {showCycleButtons && !isLoadingCycleHistory && isHistoricalView && hasCycleSupport === false && (
                        <div className="cycle-history-note">
                          Stored cycle history is not available from this orbit contract build or ABI yet for this level.
                        </div>
                      )}

                      {showCycleButtons && !isLoadingCycleHistory && availableCycleNumbers.length > 0 && !isHistoricalView && (
                        <div className="cycle-history-note">
                          You can switch between the live orbit and any completed previous cycle for this level.
                        </div>
                      )}

                      <div
                        className={`galaxy-container ${orbitType.toLowerCase()}`}
                        ref={activeTab === `level${level}` ? galaxyRef : null}
                      >
                        <div className="galaxy-grid"></div>

                        <div className="star-field">
                          {starConfig.map((star) => (
                            <span
                              key={star.id}
                              className="star"
                              style={{
                                left: star.left,
                                top: star.top,
                                width: star.size,
                                height: star.size,
                                opacity: star.opacity,
                                animationDelay: `${star.delay}, ${star.delay}`,
                                animationDuration: `${star.duration}, ${star.drift}`
                              }}
                            />
                          ))}
                        </div>

                        <div className="galaxy-inner">
                          {(() => {
                            const outerWidth = containerSize.width > 0 ? containerSize.width : 560
                            const outerHeight = containerSize.height > 0 ? containerSize.height : 560
                            const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
                            const stageSize = usableSize
                            const centerX = stageSize / 2
                            const centerY = stageSize / 2

                            const planetSize = getPlanetSize(orbitType, stageSize)
                            const coreSize = getCoreSize(orbitType, stageSize)
                            const nodePadding = planetSize / 2 + 8
                            const coreClearance = coreSize / 2 + planetSize / 2 + 18

                            let ringRadiiPx = {
                              1: Math.max(coreClearance, stageSize * 0.22),
                              2: stageSize * 0.34,
                              3: stageSize * 0.45
                            }

                            if (orbitType === 'P4') {
                              ringRadiiPx = {
                                1: Math.max(coreClearance + 6, stageSize * 0.31)
                              }
                            }

                            if (orbitType === 'P12') {
                              ringRadiiPx = {
                                1: Math.max(coreClearance + 4, stageSize * 0.19),
                                2: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding)
                              }
                            }

                            if (orbitType === 'P39') {
                              ringRadiiPx = {
                                1: Math.max(coreClearance, stageSize * 0.17),
                                2: Math.min(stageSize * 0.32, (stageSize / 2) - nodePadding - 34),
                                3: Math.min(stageSize * 0.47, (stageSize / 2) - nodePadding)
                              }
                            }

                            Object.keys(ringRadiiPx).forEach(key => {
                              ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding)
                            })

                            const createEmptyPosition = (posNumber, lineNum) => ({
                              number: posNumber,
                              occupantType: 'empty',
                              occupant: null,
                              amount: '0',
                              timestamp: 0,
                              positionInfo: buildPositionInfoFromRuleView(orbitType, posNumber, level, null, viewAddress),
                              line: lineNum,
                              spillsTo: null,
                              parentPosition: getStructuralParentPosition(orbitType, posNumber),
                              payoutReceipts: [],
                              payoutReceiptSummary: {
                                count: 0,
                                gross: 0,
                                escrow: 0,
                                liquid: 0,
                                founderPathGross: 0,
                                directOwnerGross: 0,
                                routedSpilloverGross: 0,
                                recycleGross: 0
                              },
                              viewerReceipts: [],
                              viewerReceiptBreakdown: {
                                count: 0,
                                totalGross: 0,
                                totalLiquid: 0,
                                totalEscrow: 0,
                                directOwnerGross: 0,
                                directOwnerLiquid: 0,
                                directOwnerEscrow: 0,
                                routedSpilloverGross: 0,
                                routedSpilloverLiquid: 0,
                                routedSpilloverEscrow: 0,
                                founderPathGross: 0,
                                founderPathLiquid: 0,
                                founderPathEscrow: 0,
                                recycleGross: 0,
                                recycleLiquid: 0,
                                recycleEscrow: 0
                              },
                              truthLabel: 'NO_RECEIPT'
                            })

                            const allPositionMap = {}
                            structure.lines.forEach(lineNum => {
                              const linePositions = positionsByLine[lineNum] || []
                              structure.positions[lineNum].forEach(posNumber => {
                                allPositionMap[posNumber] =
                                  linePositions.find(p => p.number === posNumber) ||
                                  createEmptyPosition(posNumber, lineNum)
                              })
                            })

                            const getCoordsForPosition = (posNumber, lineNum, index) => {
                              const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
                              if (typeof customAngle === 'number') {
                                return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
                              }

                              return getPositionOnRing(
                                index,
                                structure.counts[lineNum],
                                ringRadiiPx[lineNum],
                                centerX,
                                centerY,
                                structure.startAngles[lineNum]
                              )
                            }

                            return (
                              <div
                                className="galaxy-stage"
                                style={{
                                  width: stageSize,
                                  height: stageSize,
                                  left: '50%',
                                  top: '50%',
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                <div
                                  className={`orbit-core ${!isLevelActive ? 'orbit-core-inactive' : ''}`}
                                  style={{
                                    width: coreSize,
                                    height: coreSize
                                  }}
                                >
                                  <span className="core-label">
                                    {isLevelActive ? t('orbits.owner') : t('orbits.inactiveCore')}
                                  </span>
                                  <span className="core-value">
                                    {isLevelActive
                                      ? (isViewingSelf ? t('orbits.you') : t('orbits.view'))
                                      : t('orbits.levelOff')}
                                  </span>
                                </div>

                                {structure.lines.map(lineNum => {
                                  const linePositions = positionsByLine[lineNum] || []
                                  const filledCount = linePositions.filter(p => p.occupant).length
                                  const diameter = ringRadiiPx[lineNum] * 2
                                  const arrivals =
                                    lineNum === 1
                                      ? lineCounts.line1
                                      : lineNum === 2
                                        ? lineCounts.line2
                                        : lineCounts.line3

                                  return (
                                    <div
                                      key={lineNum}
                                      className={`orbit-ring line${lineNum}`}
                                      style={{
                                        width: diameter,
                                        height: diameter
                                      }}
                                    >
                                      <span className="ring-label">LINE {lineNum}</span>
                                      <span className="ring-stats">
                                        {filledCount}/{structure.positions[lineNum].length} • arrivals: {arrivals}
                                      </span>
                                    </div>
                                  )
                                })}

                                <>
                                  {structure.lines.map(lineNum => {
                                    const positionNumbers = structure.positions[lineNum]
                                    return positionNumbers.map((posNumber) => {
                                      const parentPos = getStructuralParentPosition(orbitType, posNumber)
                                      if (!parentPos) return null

                                      const fromPos = allPositionMap[posNumber]
                                      const toPos = allPositionMap[parentPos]

                                      if (!fromPos || !toPos) return null

                                      const fromLine = fromPos.line
                                      const toLine = toPos.line
                                      const fromIndex = structure.positions[fromLine].indexOf(fromPos.number)
                                      const toIndex = structure.positions[toLine].indexOf(toPos.number)

                                      if (fromIndex < 0 || toIndex < 0) return null

                                      const fromCoords = (() => {
                                        const customAngle = structure.customAngles?.[fromLine]?.[fromPos.number]
                                        if (typeof customAngle === 'number') {
                                          return getPositionOnAngle(customAngle, ringRadiiPx[fromLine], centerX, centerY)
                                        }
                                        return getPositionOnRing(
                                          fromIndex,
                                          structure.counts[fromLine],
                                          ringRadiiPx[fromLine],
                                          centerX,
                                          centerY,
                                          structure.startAngles[fromLine]
                                        )
                                      })()

                                      const toCoords = (() => {
                                        const customAngle = structure.customAngles?.[toLine]?.[toPos.number]
                                        if (typeof customAngle === 'number') {
                                          return getPositionOnAngle(customAngle, ringRadiiPx[toLine], centerX, centerY)
                                        }
                                        return getPositionOnRing(
                                          toIndex,
                                          structure.counts[toLine],
                                          ringRadiiPx[toLine],
                                          centerX,
                                          centerY,
                                          structure.startAngles[toLine]
                                        )
                                      })()

                                      const dx = toCoords.x - fromCoords.x
                                      const dy = toCoords.y - fromCoords.y
                                      const distance = Math.sqrt(dx * dx + dy * dy)
                                      const angle = Math.atan2(dy, dx) * 180 / Math.PI

                                      return (
                                        <div key={`grey-conn-${posNumber}-${parentPos}`}>
                                          <div
                                            className="structural-connection-grey"
                                            style={{
                                              width: distance,
                                              left: fromCoords.x,
                                              top: fromCoords.y,
                                              transform: `rotate(${angle}deg)`
                                            }}
                                          />
                                        </div>
                                      )
                                    })
                                  })}

                                  {structure.lines.map(lineNum => {
                                    const positionNumbers = structure.positions[lineNum]

                                    return positionNumbers.map((posNumber, index) => {
                                      const pos = allPositionMap[posNumber]
                                      const coords = getCoordsForPosition(posNumber, lineNum, index)

                                      let planetClass = 'planet-node '
                                      if (pos.occupantType === 'mine') {
                                        planetClass += 'planet-my-position'
                                      } else if (pos.occupantType === 'downline') {
                                        planetClass += 'planet-downline'
                                      } else if (pos.occupantType === 'other') {
                                        planetClass += 'planet-other'
                                      } else {
                                        planetClass += 'planet-empty'
                                      }

                                      if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) {
                                        planetClass += ' planet-structural-preview'
                                      }

                                      const badgeValue = getPlanetBadgeValue(pos)

                                      return (
                                        <OverlayTrigger
                                          key={pos.number}
                                          placement="top"
                                          overlay={renderPositionTooltip(pos)}
                                          delay={{ show: 250, hide: 100 }}
                                        >
                                          <div
                                            className={planetClass}
                                            style={{
                                              left: coords.x,
                                              top: coords.y,
                                              width: planetSize,
                                              height: planetSize,
                                              transform: 'translate(-50%, -50%)',
                                              '--index': index
                                            }}
                                            onClick={() => handlePositionClick(pos)}
                                            onMouseEnter={() => {
                                              setHoveredPosition(pos)
                                              if (pos.parentPosition) handleStructuralPreview(pos)
                                            }}
                                            onMouseLeave={() => setHoveredPosition(null)}
                                          >
                                            <div className="planet-content">
                                              <span className="node-number">{pos.number}</span>

                                              {pos.occupant && (
                                                <span className="planet-icon">
                                                  {pos.occupantType === 'mine'
                                                    ? '👤'
                                                    : pos.occupantType === 'downline'
                                                      ? '⬇️'
                                                      : '👥'}
                                                </span>
                                              )}

                                              {Number(badgeValue || 0) > 0 && pos.occupantType !== 'mine' && (
                                                <span className="planet-earn-badge">
                                                  {formatUsdtDisplay(badgeValue)}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </OverlayTrigger>
                                      )
                                    })
                                  })}

                                  {(isHistoricalView ? [] : data.spilloverFromPositions).map((conn, idx) => {
                                    const fromPos = allPositionMap[conn.from]
                                    const toPos = allPositionMap[conn.to]

                                    if (!fromPos || !toPos || !fromPos.occupant) return null

                                    const fromLine = fromPos.line
                                    const toLine = toPos.line
                                    const fromIndex = structure.positions[fromLine].indexOf(fromPos.number)
                                    const toIndex = structure.positions[toLine].indexOf(toPos.number)

                                    if (fromIndex < 0 || toIndex < 0) return null

                                    const fromCoords = (() => {
                                      const customAngle = structure.customAngles?.[fromLine]?.[fromPos.number]
                                      if (typeof customAngle === 'number') {
                                        return getPositionOnAngle(customAngle, ringRadiiPx[fromLine], centerX, centerY)
                                      }
                                      return getPositionOnRing(
                                        fromIndex,
                                        structure.counts[fromLine],
                                        ringRadiiPx[fromLine],
                                        centerX,
                                        centerY,
                                        structure.startAngles[fromLine]
                                      )
                                    })()

                                    const toCoords = (() => {
                                      const customAngle = structure.customAngles?.[toLine]?.[toPos.number]
                                      if (typeof customAngle === 'number') {
                                        return getPositionOnAngle(customAngle, ringRadiiPx[toLine], centerX, centerY)
                                      }
                                      return getPositionOnRing(
                                        toIndex,
                                        structure.counts[toLine],
                                        ringRadiiPx[toLine],
                                        centerX,
                                        centerY,
                                        structure.startAngles[toLine]
                                      )
                                    })()

                                    const dx = toCoords.x - fromCoords.x
                                    const dy = toCoords.y - fromCoords.y
                                    const distance = Math.sqrt(dx * dx + dy * dy)
                                    const angle = Math.atan2(dy, dx) * 180 / Math.PI

                                    return (
                                      <div key={`conn-${idx}`}>
                                        <div
                                          className="structural-connection"
                                          style={{
                                            width: distance,
                                            left: fromCoords.x,
                                            top: fromCoords.y,
                                            transform: `rotate(${angle}deg)`
                                          }}
                                        />
                                      </div>
                                    )
                                  })}
                                </>
                              </div>
                            )
                          })()}
                        </div>
                      </div>

                      {isHistoricalView && hasCycleSupport !== false && (
                        <div className="history-summary-card">
                          <div className="history-summary-row">
                            <span className="history-summary-label">Viewing</span>
                            <span className="history-summary-value">Cycle {selectedCycle}</span>
                          </div>
                          <div className="history-summary-row">
                            <span className="history-summary-label">Filled positions</span>
                            <span className="history-summary-value">
                              {filledCountForDisplay}/{config.positions}
                            </span>
                          </div>
                          <div className="history-summary-row">
                            <span className="history-summary-label">History source</span>
                            <span className="history-summary-value">Stored cycle data</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Col>

                <Col lg={4}>
                  <div className="lab-card energy-cell h-100">
                    <div className="orbit-header">{t('orbits.escrowAutoUpgrade')}</div>
                    <div className="p-4 pulse-overlay">
                      {shouldShowAutoUpgradePanel && (
                        <>
                          <div className="small fw-bold text-muted text-uppercase mb-2">
                            {t('orbits.lockedForLevel', { level: levelInfo.nextLevel })}
                          </div>

                          <h3
                            className="fw-black mb-3"
                            style={{ color: '#002366', fontFamily: 'monospace' }}
                          >
                            {userLocks[level] || '0'}{' '}
                            <span className="small text-muted">
                              / {levelInfo.upgradeReq} USDT
                            </span>
                          </h3>

                          <ProgressBar
                            now={((parseFloat(userLocks[level] || '0') / levelInfo.upgradeReq) * 100) || 0}
                            variant="primary"
                            className="mb-3"
                          />

                          <div className="p-3 bg-light rounded-3 small fw-bold text-center">
                            {!isLevelActive ? (
                              <span className="text-secondary">
                                {t('orbits.levelInactiveForAddress', { level })}
                              </span>
                            ) : parseFloat(userLocks[level] || '0') >= levelInfo.upgradeReq ? (
                              autoUpgradeCompleted ? (
                                <span className="text-success">
                                  {t('orbits.levelAlreadyActivated', { level: levelInfo.nextLevel })}
                                </span>
                              ) : (
                                <span className="text-success">
                                  {t('orbits.autoUpgradeReady', { level: levelInfo.nextLevel })}
                                </span>
                              )
                            ) : (
                              t('orbits.needMoreUsdt', {
                                amount: (levelInfo.upgradeReq - parseFloat(userLocks[level] || '0')).toFixed(1)
                              })
                            )}
                          </div>

                          <hr className="my-4" />
                        </>
                      )}

                      <div className="small fw-bold text-muted text-uppercase mb-2">
                        Total Earned From This Level
                      </div>
                      <h4 className="fw-bold" style={{ color: '#28a745' }}>
                        {data.totalEarned} USDT
                      </h4>
                      <div className="earned-caption">
                        This comes from the orbit contract totalEarned value.
                      </div>

                      {viewMode === 'downline' && !isHistoricalView && (
                        <>
                          {downlineAtLevel.length > 0 && (
                            <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-3">
                              <h6 className="fw-bold mb-2">
                                {t('orbits.directDownlineAtLevel', { level })}
                              </h6>
                              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {downlineAtLevel.map((d, idx) => (
                                  <div
                                    key={idx}
                                    className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small"
                                  >
                                    <div>
                                      <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
                                        {shortAddress(d.user)}
                                      </span>
                                      <small className="text-muted">
                                        {t('orbits.positionShort', { position: d.position })}
                                      </small>
                                      <small className="text-muted d-block">
                                        {t('orbits.amountShort', { amount: d.amount })}
                                      </small>
                                    </div>
                                    <Badge bg="warning">Downline</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {spilloverAtLevel.length > 0 && (
                            <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-3">
                              <h6 className="fw-bold mb-2">
                                {t('orbits.otherParticipantsAtLevel', { level })}
                              </h6>
                              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {spilloverAtLevel.map((d, idx) => (
                                  <div
                                    key={idx}
                                    className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small"
                                  >
                                    <div>
                                      <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
                                        {shortAddress(d.user)}
                                      </span>
                                      <small className="text-muted">
                                        {t('orbits.positionShort', { position: d.position })}
                                      </small>
                                      <small className="text-muted d-block">
                                        Referrer: {d.originalReferrer && d.originalReferrer !== ethers.ZeroAddress
                                          ? shortAddress(d.originalReferrer)
                                          : 'N/A'}
                                      </small>
                                    </div>
                                    <Badge bg="info">Other occupant</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {downlineAtLevel.length === 0 && spilloverAtLevel.length === 0 && (
                            <div className="mt-4 p-3 bg-light rounded-3 text-center text-muted small">
                              {t('orbits.noDownlineYet')}
                            </div>
                          )}
                        </>
                      )}

                      {isHistoricalView && (
                        <div className="mt-4 p-3 bg-light rounded-3 text-muted small">
                          Historical cycle mode is active. The orbit view is showing the stored read-only positions for Cycle {selectedCycle}. Total earned remains the current live value for this level.
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Tab>
          )
        })}
      </Tabs>
    </Container>
  )
}