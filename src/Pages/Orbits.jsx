import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Container, Row, Col, Tabs, Tab, Alert, Spinner, ProgressBar, Button, Badge, Modal, OverlayTrigger, Tooltip, Form } from 'react-bootstrap'
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

  const galaxyRef = useRef(null)
  const referrerCacheRef = useRef(new Map())
  const viewedLevelsCacheRef = useRef(new Map())
  const fetchIdRef = useRef(0)

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

  const getCachedReferrer = useCallback(async (address) => {
    const key = address.toLowerCase()
    if (referrerCacheRef.current.has(key)) {
      return referrerCacheRef.current.get(key)
    }

    const referrer = await withRetry(() => contracts.registration.getReferrer(address))
    referrerCacheRef.current.set(key, referrer)
    return referrer
  }, [contracts, withRetry])

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
  }, [activeTab, orbitData, containerSize.width, containerSize.height])

  useEffect(() => {
    if (Object.keys(orbitData).length > 0 && galaxyRef.current) {
      const { width, height } = galaxyRef.current.getBoundingClientRect()
      if (width > 0 && height > 0) {
        setContainerSize({ width, height })
      }
    }
  }, [orbitData, activeTab])

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
    @media (max-width: 768px) {
      .planet-node {
        width: 36px;
        height: 36px;
      }
      .galaxy-container.p39 .planet-node {
        width: 26px;
        height: 26px;
      }
    }
    @media (max-width: 480px) {
      .planet-node {
        width: 30px;
        height: 30px;
      }
      .galaxy-container.p39 .planet-node {
        width: 22px;
        height: 22px;
      }
      .ring-label,
      .ring-stats {
        font-size: 0.56rem;
        padding: 3px 8px;
      }
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
      
    .connection-label {
      position: absolute;
      background: rgba(255, 215, 64, 0.98);
      color: #002366;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: bold;
      transform: translate(-50%, -50%);
      white-space: nowrap;
      z-index: 6;
      border: 1px solid white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.18);
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
    @media (max-width: 768px) {
      .orbit-core {
        width: 74px;
        height: 74px;
      }
    }
    .galaxy-container.p39 .orbit-core {
      width: 80px;
      height: 80px;
    }
    @media (max-width: 768px) {
      .galaxy-container.p39 .orbit-core {
        width: 64px;
        height: 64px;
      }
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
    }
    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      box-shadow: 0 6px 14px rgba(0,0,0,0.10);
    }
    .legend-color.green { background: #28a745; }
    .legend-color.orange { background: #fd7e14; }
    .legend-color.blue { background: #0066cc; }
    .legend-color.gold { background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%); }
    .legend-color.red {
      background: white;
      border: 2px solid #dc3545;
    }
    .legend-color.gray {
      background: linear-gradient(135deg, #adb5bd 0%, #495057 100%);
    }
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
    .nav-tabs .nav-link {
      border: none;
      color: #666;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 1px;
      padding: 15px 25px;
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
    }
    .view-toggle .btn.active {
      background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
      color: white;
      border-color: #002366;
      box-shadow: 0 10px 22px rgba(0,68,204,0.18);
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
    }
    .info-value {
      font-family: monospace;
      font-weight: 700;
      color: #002366;
      text-align: right;
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
    }
    .commission-amount.payout {
      color: #28a745;
    }
    .commission-amount.escrow {
      color: #0dcaf0;
    }
    .hover-tooltip {
      background: #002366 !important;
      color: white !important;
      font-size: 0.75rem !important;
      padding: 8px 12px !important;
      border-radius: 10px !important;
      opacity: 1 !important;
    }
    .earned-caption {
      font-size: 0.78rem;
      color: #6c757d;
      line-height: 1.4;
      margin-top: 6px;
    }
    @media (max-width: 768px) {
      .d-flex.align-items-center.justify-content-between {
        flex-direction: column;
        gap: 15px;
      }
      .view-toggle {
        margin-left: 0;
      }
    }
  `

  const orbitTypeConfig = {
    P4: {
      name: 'P4',
      contract: 'p4Orbit',
      positions: 4,
      lines: 1,
      lineSizes: [4],
      linePayouts: ['Owner / escrow / recycle by position'],
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
      linePayouts: ['40% owner', '50% owner or 50% escrow'],
      lineSpillovers: ['50% eligible upline', '40% structural parent'],
      levels: [2, 5, 8],
      description: 'Two-line orbit'
    },
    P39: {
      name: 'P39',
      contract: 'p39Orbit',
      positions: 39,
      lines: 3,
      lineSizes: [3, 9, 27],
      linePayouts: ['20% owner or 20% escrow', '20% owner or 20% escrow', '50% owner or 50% escrow'],
      lineSpillovers: ['20% eligible upline + 50% next eligible upline', '20% structural parent + 50% orbit owner', '20% structural parent + 20% structural grandparent'],
      levels: [3, 6, 9],
      description: 'Three-line orbit'
    }
  }

  const levelToOrbitType = {
    1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
    6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
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
                // Group under parent 4
                13: -145, 22: -133, 31: -121,
                // Group under parent 5
                14: -25,  23: -13,  32: -1,
                // Group under parent 6
                15: 95,   24: 107,  33: 119,
                // Group under parent 7
                16: -109, 25: -97,  34: -85,
                // Group under parent 8
                17: 11,   26: 23,   35: 35,
                // Group under parent 9
                18: 131,  27: 143,  36: 155,
                // Group under parent 10
                19: -73,  28: -61,  37: -49,
                // Group under parent 11
                20: 47,   29: 59,   38: 71,
                // Group under parent 12
                21: 167,  30: 179,  39: 191
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

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  const fetchViewedLevels = useCallback(async () => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

    const key = viewAddress.toLowerCase()
    if (viewedLevelsCacheRef.current.has(key)) {
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

  const applyViewerAddress = async () => {
    if (!inputAddress || !ethers.isAddress(inputAddress)) {
      setOrbitError(t('orbits.enterValidAddress'))
      return
    }

    setOrbitError('')
    const normalized = ethers.getAddress(inputAddress)
    setInputAddress(normalized)
    setViewAddress(normalized)
    setViewMode('global')
  }

  const viewMyOrbit = () => {
    if (!account) return
    setOrbitError('')
    setInputAddress(account)
    setViewAddress(account)
    setViewMode('global')
  }

  const getPositionInfo = (orbitType, position, level, autoUpgradeCompleted = false) => {
    const parentPosition = getStructuralParentPosition(orbitType, position)

    const info = {
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
      parentPosition
    }

    if (orbitType === 'P4') {
      info.line = 1
      info.isRecyclePosition = position === 4

      if (!autoUpgradeCompleted) {
        if (position === 1) {
          info.type = 'payout-escrow'
          info.payout = 70
          info.escrow = 20
          info.spillover = 0
          info.description = 'Position 1: 70% to orbit owner and 20% locked for auto-upgrade.'
          info.toUpline = true
          info.isAutoUpgradeSource = true
        } else if (position === 2 || position === 3) {
          info.type = 'escrow'
          info.payout = 0
          info.escrow = 90
          info.spillover = 0
          info.description = `Position ${position}: 90% locked for auto-upgrade.`
          info.toUpline = false
          info.isAutoUpgradeSource = true
        } else if (position === 4) {
          info.type = 'recycle'
          info.description = 'Position 4: recycle position.'
        }
      } else {
        if (position === 1 || position === 2 || position === 3) {
          info.type = 'payout'
          info.payout = 90
          info.description = `Position ${position}: 90% to orbit owner.`
          info.toUpline = true
        } else if (position === 4) {
          info.type = 'recycle'
          info.description = 'Position 4: recycle position.'
        }
      }
    } else if (orbitType === 'P12') {
      if (position <= 3) {
        info.line = 1
        info.type = 'payout'
        info.payout = 40
        info.spillover = 50
        info.description = `Position ${position}: 40% to orbit owner and 50% to eligible upline.`
        info.toUpline = true
      } else if (position >= 4 && position <= 7) {
        info.line = 2
        info.type = 'escrow'
        info.escrow = 50
        info.spillover = 40
        info.description = `Position ${position}: 50% locked for auto-upgrade and 40% to structural parent position ${parentPosition}.`
        info.isAutoUpgradeSource = true
      } else if (position >= 8 && position <= 10) {
        info.line = 2
        info.type = 'payout'
        info.payout = 50
        info.spillover = 40
        info.description = `Position ${position}: 50% to orbit owner and 40% to structural parent position ${parentPosition}.`
        info.toUpline = true
      } else if (position === 11 || position === 12) {
        info.line = 2
        info.type = 'recycle'
        info.isRecyclePosition = true
        info.description = `Position ${position}: recycle position under structural parent ${parentPosition}.`
      }
    } else if (orbitType === 'P39') {
      if (position <= 3) {
        info.line = 1
        if (position <= 2) {
          info.type = 'payout'
          info.payout = 20
          info.spillover = 70
          info.description = `Position ${position}: 20% to orbit owner, 20% to eligible upline, and 50% to next eligible upline.`
          info.toUpline = true
        } else if (position === 3) {
          info.type = 'escrow'
          info.escrow = 20
          info.spillover = 70
          info.description = 'Position 3: 20% locked for auto-upgrade, 20% to eligible upline, and 50% to next eligible upline.'
          info.isAutoUpgradeSource = true
        }
      } else if (position >= 4 && position <= 12) {
        info.line = 2
        if (position >= 4 && position <= 7) {
          info.type = 'escrow'
          info.escrow = 20
          info.spillover = 70
          info.description = `Position ${position}: 20% locked for auto-upgrade, 20% to structural parent position ${parentPosition}, and 50% to orbit owner.`
          info.isAutoUpgradeSource = true
        } else {
          info.type = 'payout'
          info.payout = 20
          info.spillover = 70
          info.description = `Position ${position}: 20% to orbit owner, 20% to structural parent position ${parentPosition}, and 50% to orbit owner.`
          info.toUpline = true
        }
      } else if (position >= 13 && position <= 39) {
        info.line = 3
        const grandParentPosition = (() => {
          if (parentPosition === 4 || parentPosition === 7 || parentPosition === 10) return 1
          if (parentPosition === 5 || parentPosition === 8 || parentPosition === 11) return 2
          return 3
        })()

        if (position >= 13 && position <= 14) {
          info.type = 'escrow'
          info.escrow = 50
          info.spillover = 40
          info.description = `Position ${position}: 50% locked for auto-upgrade, 20% to structural parent position ${parentPosition}, and 20% to structural grandparent position ${grandParentPosition}.`
          info.isAutoUpgradeSource = true
        } else if (position >= 15 && position <= 37) {
          info.type = 'payout'
          info.payout = 50
          info.spillover = 40
          info.description = `Position ${position}: 50% to orbit owner, 20% to structural parent position ${parentPosition}, and 20% to structural grandparent position ${grandParentPosition}.`
          info.toUpline = true
        } else if (position === 38 || position === 39) {
          info.type = 'recycle'
          info.isRecyclePosition = true
          info.description = `Position ${position}: recycle position under structural parent ${parentPosition}.`
        }
      }
    }

    return info
  }

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
                    const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])

                    let occupantType = 'empty'

                    if (occupantAddress && occupantAddress !== ethers.ZeroAddress) {
                      if (occupantAddress.toLowerCase() === viewAddress.toLowerCase()) {
                        occupantType = 'mine'
                        myPositions.push(pos)
                      } else {
                        const referrer = await getCachedReferrer(occupantAddress)

                        if (referrer.toLowerCase() === viewAddress.toLowerCase()) {
                          occupantType = 'downline'
                          downlinePositions.push({
                            position: pos,
                            user: occupantAddress,
                            amount: ethers.formatUnits(amountRaw, 6),
                            timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
                            level,
                            activated: false,
                            positionInfo: posInfo
                          })
                        } else {
                          occupantType = 'other'
                          otherOccupants.push({
                            position: pos,
                            user: occupantAddress,
                            amount: ethers.formatUnits(amountRaw, 6),
                            timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
                            level,
                            positionInfo: posInfo,
                            originalReferrer: referrer
                          })
                        }
                      }
                    }

                    return {
                      number: pos,
                      occupantType,
                      occupant: occupantAddress !== ethers.ZeroAddress ? occupantAddress : null,
                      amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
                      timestamp: timestampRaw,
                      positionInfo: posInfo,
                      line: posInfo.line,
                      spillsTo: posInfo.spillsTo,
                      parentPosition: posInfo.parentPosition
                    }
                  } catch {
                    const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])
                    return {
                      number: pos,
                      occupantType: 'empty',
                      occupant: null,
                      amount: '0',
                      timestamp: 0,
                      positionInfo: posInfo,
                      line: posInfo.line,
                      spillsTo: posInfo.spillsTo,
                      parentPosition: posInfo.parentPosition
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
                  const lockedAmount = await withRetry(() => contracts.escrow.getLockedAmount(viewAddress, level, level + 1))
                  escrowLock = ethers.formatUnits(lockedAmount, 6)
                } catch {}
              }

              return {
                level,
                data: {
                  orbitType,
                  config,
                  currentIndex: orbitState[0],
                  escrowBalance: ethers.formatUnits(orbitState[1], 6),
                  autoUpgradeCompleted: orbitState[2],
                  positionsInLine1: orbitState[3],
                  positionsInLine2: orbitState[4],
                  positionsInLine3: orbitState[5],
                  totalCycles: orbitState[6],
                  totalEarned: ethers.formatUnits(orbitState[7], 6),
                  positions,
                  myPositions,
                  downlinePositions,
                  otherOccupants,
                  spilloverFromPositions: structuralLinks
                },
                escrowLock
              }
            } catch {
              const positions = []
              for (let pos = 1; pos <= config.positions; pos++) {
                const posInfo = getPositionInfo(orbitType, pos, level)
                positions.push({
                  number: pos,
                  occupantType: 'empty',
                  occupant: null,
                  amount: '0',
                  timestamp: 0,
                  positionInfo: posInfo,
                  line: posInfo.line,
                  spillsTo: posInfo.spillsTo,
                  parentPosition: posInfo.parentPosition
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
                  spilloverFromPositions: []
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
    } catch (err) {
      console.error('Orbit sync error:', err)
      setOrbitError(t('orbits.loadFailed'))
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoadingOrbits(false)
      }
    }
  }, [contracts, viewAddress, getCachedReferrer, withRetry, t])

  const refreshData = async () => {
    if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
    setIsRefreshing(true)

    try {
      await fetchViewedLevels()
      await fetchAllOrbitData()
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (contracts && viewAddress && ethers.isAddress(viewAddress)) {
      fetchViewedLevels()
      fetchAllOrbitData()
    }
  }, [contracts, viewAddress, fetchViewedLevels, fetchAllOrbitData])

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

  const renderPositionTooltip = (position) => {
    if (!position.occupant) {
      return (
        <Tooltip id="tooltip-empty">
          <strong>{t('orbits.emptyPosition')}</strong>
          <div>{t('orbits.availableToBeFilled')}</div>
          <div className="mt-1 small">{position.positionInfo.description}</div>
          {position.parentPosition && (
            <div className="text-warning mt-1">
              {t('orbits.structuralParent', { position: position.parentPosition })}
            </div>
          )}
        </Tooltip>
      )
    }

    return (
      <Tooltip id={`tooltip-${position.number}`}>
        <div><strong>Position #{position.number}</strong> ({t('orbits.line')} {position.line})</div>
        <div>Occupied by: {position.occupant.slice(0, 8)}...{position.occupant.slice(-6)}</div>
        <div>Amount: {position.amount} USDT</div>
        <div className="mt-1 small">{position.positionInfo.description}</div>

        {position.parentPosition && (
          <div className="text-warning mt-1">
            Structural parent: Position {position.parentPosition}
          </div>
        )}

        {position.occupantType === 'downline' && (
          <div className="text-warning mt-1">{t('orbits.directDownlineViewedAddress')}</div>
        )}

        {position.occupantType === 'mine' && (
          <div className="text-success mt-1">{t('orbits.belongsToViewedAddress')}</div>
        )}

        {position.positionInfo.payout > 0 && (
          <div className="text-success mt-1">{t('orbits.directPayoutSlice', { value: position.positionInfo.payout })}</div>
        )}

        {position.positionInfo.spillover > 0 && position.occupantType !== 'mine' && (
          <div className="text-warning mt-1">{t('orbits.routedPayoutSlicesExist')}</div>
        )}

        {position.positionInfo.escrow > 0 && (
          <div className="text-info mt-1">{t('orbits.escrowLocked', { value: position.positionInfo.escrow })}</div>
        )}
      </Tooltip>
    )
  }

  if (!isConnected) {
    return (
      <Container className="mt-5 pt-5">
        <style>{orbitStyles}</style>
        <Alert variant="primary" className="text-center p-5 lab-card shadow-lg" style={{ backgroundColor: '#002366', color: 'white', border: 'none' }}>
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
        <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>{t('orbits.syncing')}</p>
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
            <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
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
  const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()

  return (
    <Container className="mt-5 pt-4">
      <style>{orbitStyles}</style>

      <Modal show={showPositionModal} onHide={() => setShowPositionModal(false)} className="position-modal" centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('orbits.positionDetails', { number: selectedPosition?.number })}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedPosition && (
            <>
              <div className="info-row">
                <span className="info-label">{t('orbits.positionType')}</span>
                <span className="info-value">{selectedPosition.positionInfo?.type?.toUpperCase()}</span>
              </div>

              <div className="info-row">
                <span className="info-label">{t('orbits.line')}</span>
                <span className="info-value">{t('orbits.line')} {selectedPosition.positionInfo?.line}</span>
              </div>

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
                        : selectedPosition.occupant.slice(0, 10) + '...' + selectedPosition.occupant.slice(-8)}
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">{t('orbits.fullAddress')}</span>
                    <span className="info-value" style={{ fontSize: '0.8rem' }}>
                      {selectedPosition.occupant}
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">{t('orbits.amountEntered')}</span>
                    <span className="info-value">{selectedPosition.amount} USDT</span>
                  </div>

                  {selectedPosition.timestamp > 0 && (
                    <div className="info-row">
                      <span className="info-label">{t('orbits.filledOn')}</span>
                      <span className="info-value">
                        {new Date(Number(selectedPosition.timestamp) * 1000).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="commission-breakdown">
                    <h6 className="fw-bold mb-3">{t('orbits.routingBreakdown')}</h6>
                    <p className="small text-muted mb-3">{selectedPosition.positionInfo?.description}</p>

                    {selectedPosition.positionInfo?.payout > 0 && (
                      <div className="commission-item">
                        <span>{t('orbits.directRecipientSlice')}</span>
                        <span className="commission-amount payout">
                          {selectedPosition.positionInfo.payout}% of orbit amount
                        </span>
                      </div>
                    )}

                    {selectedPosition.positionInfo?.escrow > 0 && (
                      <div className="commission-item">
                        <span>{t('orbits.lockedInEscrow')}</span>
                        <span className="commission-amount escrow">
                          {selectedPosition.positionInfo.escrow}% of orbit amount
                        </span>
                      </div>
                    )}

                    {selectedPosition.positionInfo?.spillover > 0 && (
                      <div className="commission-item">
                        <span>{t('orbits.otherRoutedSlices')}</span>
                        <span className="commission-amount" style={{ color: '#ffc107' }}>
                          {t('orbits.seePositionRule')}
                        </span>
                      </div>
                    )}

                    {selectedPosition.positionInfo?.type === 'recycle' && (
                      <div className="commission-item">
                        <span>{t('orbits.status')}</span>
                        <span className="commission-amount" style={{ color: '#6c757d' }}>
                          {t('orbits.recyclePosition')}
                        </span>
                      </div>
                    )}

                    {selectedPosition.occupantType === 'downline' && (
                      <div className="alert alert-warning mt-3 mb-0 small">
                        <strong>{t('orbits.downlineAlertTitle')}</strong><br />
                        {selectedPosition.positionInfo?.toUpline
                          ? t('orbits.downlineAlertPayout')
                          : t('orbits.downlineAlertEscrow')}
                      </div>
                    )}

                    {selectedPosition.occupantType === 'mine' && (
                      <div className="alert alert-success mt-3 mb-0 small">
                        <strong>{t('orbits.mineAlertTitle')}</strong><br />
                        {t('orbits.mineAlertText')}
                      </div>
                    )}

                    {selectedPosition.occupantType === 'other' && selectedPosition.positionInfo?.spillover > 0 && (
                      <div className="alert alert-info mt-3 mb-0 small">
                        <strong>{t('orbits.otherAlertTitle')}</strong><br />
                        {t('orbits.otherAlertText')}
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
                    <p className="small mb-0">{selectedPosition.positionInfo?.description}</p>
                    {selectedPosition.parentPosition && (
                      <p className="small text-warning mt-2">
                        {t('orbits.structuralParent', { position: selectedPosition.parentPosition })}
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
          <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px', borderRadius: '8px' }}></div>
          <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
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
          <span className="text-muted small me-3">{t('orbits.lastSync')}: {lastUpdated}</span>
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
              <Form.Label className="fw-bold small text-uppercase text-muted">{t('orbits.addressToView')}</Form.Label>
              <Form.Control
                type="text"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                placeholder="0x..."
              />
              <div className="small text-muted mt-2">
                {t('orbits.currentlyViewing')} {viewAddress ? `${viewAddress.slice(0, 8)}...${viewAddress.slice(-6)}` : t('orbits.noAddressSelected')}
                {isViewingSelf && ` ${t('orbits.yourWallet')}`}
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

          const positionsByLine = {}
          positions.forEach(pos => {
            const line = pos.line
            if (!positionsByLine[line]) positionsByLine[line] = []
            positionsByLine[line].push(pos)
          })

          const structure = getOrbitStructure(orbitType)

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
                        {totalCycles > 0 && <span className="cycle-badge ms-3">{t('orbits.cycle', { count: Number(totalCycles) + 1 })}</span>}
                      </span>
                      <div>
                        {!isLevelActive && <Badge bg="secondary" className="me-2">{t('orbits.inactiveLevel')}</Badge>}
                        {downlineAtLevel.length > 0 && <Badge bg="warning" className="me-2">{t('orbits.downlineCount', { count: downlineAtLevel.length })}</Badge>}
                        {spilloverAtLevel.length > 0 && <Badge bg="info" className="me-2">{t('orbits.orbitCount', { count: spilloverAtLevel.length })}</Badge>}
                        <Badge bg="info">{currentIndex || 1}/{config.positions} filled</Badge>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className={`galaxy-container ${orbitType.toLowerCase()}`} ref={activeTab === `level${level}` ? galaxyRef : null}>
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
                              positionInfo: getPositionInfo(orbitType, posNumber, level, autoUpgradeCompleted),
                              line: lineNum,
                              spillsTo: null,
                              parentPosition: getStructuralParentPosition(orbitType, posNumber)
                            })

                            const allPositionMap = {}
                            structure.lines.forEach(lineNum => {
                              const linePositions = positionsByLine[lineNum] || []
                              structure.positions[lineNum].forEach(posNumber => {
                                allPositionMap[posNumber] = linePositions.find(p => p.number === posNumber) || createEmptyPosition(posNumber, lineNum)
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
                                  <span className="core-label">{isLevelActive ? t('orbits.owner') : t('orbits.inactiveCore')}</span>
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
                                        {filledCount}/{structure.positions[lineNum].length} • {config.linePayouts[lineNum - 1]} • {config.lineSpillovers[lineNum - 1]}
                                      </span>
                                    </div>
                                  )
                                })}

                                <>
                                  {/* Grey structural lines - show ALL potential parent-child connections */}
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
                                                  {pos.occupantType === 'mine' ? '👤' : pos.occupantType === 'downline' ? '⬇️' : '👥'}
                                                </span>
                                              )}

                                              {pos.positionInfo.payout > 0 && pos.occupantType !== 'mine' && (
                                                <span className="planet-earn-badge">
                                                  {pos.positionInfo.payout}%
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </OverlayTrigger>
                                      )
                                    })
                                  })}

                                  {data.spilloverFromPositions.map((conn, idx) => {
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
                    </div>
                  </div>
                </Col>

                <Col lg={4}>
                  <div className="lab-card energy-cell h-100">
                    <div className="orbit-header">{t('orbits.escrowAutoUpgrade')}</div>
                    <div className="p-4 pulse-overlay">
                      <div className="small fw-bold text-muted text-uppercase mb-2">
                        {t('orbits.lockedForLevel', { level: levelInfo.nextLevel })}
                      </div>

                      <h3 className="fw-black mb-3" style={{ color: '#002366', fontFamily: 'monospace' }}>
                        {userLocks[level] || '0'} <span className="small text-muted">/ {levelInfo.upgradeReq} USDT</span>
                      </h3>

                      <ProgressBar
                        now={((parseFloat(userLocks[level] || '0') / levelInfo.upgradeReq) * 100) || 0}
                        variant="primary"
                        className="mb-3"
                      />

                      <div className="p-3 bg-light rounded-3 small fw-bold text-center">
                        {!isLevelActive ? (
                          <span className="text-secondary">{t('orbits.levelInactiveForAddress', { level })}</span>
                        ) : parseFloat(userLocks[level] || '0') >= levelInfo.upgradeReq ? (
                          autoUpgradeCompleted ? (
                            <span className="text-success">{t('orbits.levelAlreadyActivated', { level: levelInfo.nextLevel })}</span>
                          ) : (
                            <span className="text-success">{t('orbits.autoUpgradeReady', { level: levelInfo.nextLevel })}</span>
                          )
                        ) : (
                          t('orbits.needMoreUsdt', {
                            amount: (levelInfo.upgradeReq - parseFloat(userLocks[level] || '0')).toFixed(1)
                          })
                        )}
                      </div>

                      <hr className="my-4" />

                      <div className="small fw-bold text-muted text-uppercase mb-2">Total Earned From This Level</div>
                      <h4 className="fw-bold" style={{ color: '#28a745' }}>{data.totalEarned} USDT</h4>
                      <div className="earned-caption">
                        Includes every amount credited to this orbit owner at this level from eligible direct placements, spillover receipts, and recycle-related receipts tracked in the contract total.
                      </div>

                      {viewMode === 'downline' && (
                        <>
                          {downlineAtLevel.length > 0 && (
                            <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-3">
                              <h6 className="fw-bold mb-2">{t('orbits.directDownlineAtLevel', { level })}</h6>
                              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {downlineAtLevel.map((d, idx) => (
                                  <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
                                    <div>
                                      <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
                                        {d.user.slice(0, 8)}...{d.user.slice(-6)}
                                      </span>
                                      <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
                                      <small className="text-muted d-block">{t('orbits.amountShort', { amount: d.amount })}</small>
                                    </div>
                                    <Badge bg={d.positionInfo.toUpline ? 'success' : 'secondary'}>
                                      {d.positionInfo.toUpline ? '💰' : '🔒'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {spilloverAtLevel.length > 0 && (
                            <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-3">
                              <h6 className="fw-bold mb-2">{t('orbits.otherParticipantsAtLevel', { level })}</h6>
                              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {spilloverAtLevel.map((d, idx) => (
                                  <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
                                    <div>
                                      <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
                                        {d.user.slice(0, 8)}...{d.user.slice(-6)}
                                      </span>
                                      <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
                                      <small className="text-muted d-block">From: {d.originalReferrer?.slice(0, 6)}...</small>
                                    </div>
                                    <Badge bg="info">
                                      {t('orbits.routedByRule')}
                                    </Badge>
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
















// import React, { useState, useEffect, useRef, useCallback } from 'react'
// import { Container, Row, Col, Tabs, Tab, Alert, Spinner, ProgressBar, Button, Badge, Modal, OverlayTrigger, Tooltip, Form } from 'react-bootstrap'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'
// import { ethers } from 'ethers'
// import { useTranslation } from 'react-i18next'

// export const Orbits = () => {
//   console.log('Debug: This is the new file')

//   const { isConnected, account } = useWallet()
//   const { contracts, isLoading, error, loadContracts } = useContracts()
//   const { t } = useTranslation()

//   const [orbitData, setOrbitData] = useState({})
//   const [userLocks, setUserLocks] = useState({})
//   const [downlineData, setDownlineData] = useState({})
//   const [spilloverData, setSpilloverData] = useState({})
//   const [orbitError, setOrbitError] = useState('')
//   const [viewMode, setViewMode] = useState('global')
//   const [selectedPosition, setSelectedPosition] = useState(null)
//   const [showPositionModal, setShowPositionModal] = useState(false)
//   const [hoveredPosition, setHoveredPosition] = useState(null)
//   const [showStructuralPreview, setShowStructuralPreview] = useState(false)
//   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
//   const [viewAddress, setViewAddress] = useState('')
//   const [inputAddress, setInputAddress] = useState('')
//   const [viewedLevels, setViewedLevels] = useState({})

//   const galaxyRef = useRef(null)
//   const referrerCacheRef = useRef(new Map())
//   const viewedLevelsCacheRef = useRef(new Map())
//   const fetchIdRef = useRef(0)

//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [isRefreshing, setIsRefreshing] = useState(false)
//   const [activeTab, setActiveTab] = useState('level1')
//   const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)

//   const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

//   const chunkArray = (arr, size) => {
//     const chunks = []
//     for (let i = 0; i < arr.length; i += size) {
//       chunks.push(arr.slice(i, i + size))
//     }
//     return chunks
//   }

//   const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
//     try {
//       return await fn()
//     } catch (err) {
//       const code = err?.code || err?.info?.error?.code
//       const msg = String(err?.message || '')
//       const isRateLimited =
//         code === -32005 ||
//         err?.status === 429 ||
//         msg.includes('rate limited') ||
//         msg.includes('429')

//       if (!isRateLimited || retries <= 0) {
//         throw err
//       }

//       await delay(wait)
//       return withRetry(fn, retries - 1, wait * 2)
//     }
//   }, [])

//   const getCachedReferrer = useCallback(async (address) => {
//     const key = address.toLowerCase()
//     if (referrerCacheRef.current.has(key)) {
//       return referrerCacheRef.current.get(key)
//     }

//     const referrer = await withRetry(() => contracts.registration.getReferrer(address))
//     referrerCacheRef.current.set(key, referrer)
//     return referrer
//   }, [contracts, withRetry])

//   useEffect(() => {
//     if (account && !viewAddress) {
//       setViewAddress(account)
//       setInputAddress(account)
//     }
//   }, [account, viewAddress])

//   useEffect(() => {
//     const updateSize = () => {
//       if (galaxyRef.current) {
//         const { width, height } = galaxyRef.current.getBoundingClientRect()
//         if (width > 0 && height > 0 && (width !== containerSize.width || height !== containerSize.height)) {
//           setContainerSize({ width, height })
//         }
//       }
//     }

//     const timer = setTimeout(updateSize, 120)
//     window.addEventListener('resize', updateSize)

//     let resizeObserver
//     if (window.ResizeObserver) {
//       resizeObserver = new ResizeObserver(updateSize)
//       if (galaxyRef.current) {
//         resizeObserver.observe(galaxyRef.current)
//       }
//     }

//     return () => {
//       window.removeEventListener('resize', updateSize)
//       if (resizeObserver) resizeObserver.disconnect()
//       clearTimeout(timer)
//     }
//   }, [activeTab, orbitData, containerSize.width, containerSize.height])

//   useEffect(() => {
//     if (Object.keys(orbitData).length > 0 && galaxyRef.current) {
//       const { width, height } = galaxyRef.current.getBoundingClientRect()
//       if (width > 0 && height > 0) {
//         setContainerSize({ width, height })
//       }
//     }
//   }, [orbitData, activeTab])

//   const orbitStyles = `
//     @keyframes pulse-line {
//       0% { background-position: 0% 50%; }
//       100% { background-position: 200% 50%; }
//     }
//     @keyframes orbit-glow {
//       0%, 100% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.08), 0 0 12px rgba(0, 68, 204, 0.08) inset; }
//       50% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.15), 0 0 20px rgba(0, 68, 204, 0.12) inset; }
//     }
//     @keyframes structural-pulse {
//       0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.75); }
//       70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
//       100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
//     }
//     @keyframes rotate-slow {
//       from { transform: translate(-50%, -50%) rotate(0deg); }
//       to { transform: translate(-50%, -50%) rotate(360deg); }
//     }
//     @keyframes rotate-reverse {
//       from { transform: translate(-50%, -50%) rotate(360deg); }
//       to { transform: translate(-50%, -50%) rotate(0deg); }
//     }
//     @keyframes float {
//       0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
//       50% { transform: translate(-50%, -50%) translateY(-4px); }
//     }
//     @keyframes core-pulse {
//       0%, 100% { box-shadow: 0 0 28px rgba(0,35,102,0.35), 0 0 60px rgba(0,68,204,0.12); }
//       50% { box-shadow: 0 0 36px rgba(0,35,102,0.45), 0 0 75px rgba(0,68,204,0.18); }
//     }
//     @keyframes core-pulse-inactive {
//       0%, 100% { box-shadow: 0 0 18px rgba(108,117,125,0.18), 0 0 36px rgba(108,117,125,0.08); }
//       50% { box-shadow: 0 0 24px rgba(108,117,125,0.22), 0 0 48px rgba(108,117,125,0.12); }
//     }
//     @keyframes twinkle {
//       0%, 100% { opacity: 0.18; transform: scale(1); }
//       50% { opacity: 0.95; transform: scale(1.55); }
//     }
//     @keyframes drift {
//       0% { transform: translateY(0px) translateX(0px); }
//       50% { transform: translateY(-3px) translateX(2px); }
//       100% { transform: translateY(0px) translateX(0px); }
//     }
//     @keyframes glow-border {
//       0%, 100% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 18px 50px rgba(0,35,102,0.05); }
//       50% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 22px 60px rgba(0,35,102,0.08); }
//     }
//     .lab-card {
//       background: rgba(255, 255, 255, 0.82);
//       border: 1px solid rgba(255, 255, 255, 0.45);
//       border-radius: 24px;
//       box-shadow: 0 14px 40px rgba(0, 35, 102, 0.06);
//       overflow: hidden;
//       backdrop-filter: blur(14px);
//       -webkit-backdrop-filter: blur(14px);
//     }
//     .orbit-header {
//       background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
//       color: white;
//       font-family: 'monospace';
//       font-size: 0.85rem;
//       padding: 10px 20px;
//       text-transform: uppercase;
//       letter-spacing: 2px;
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       box-shadow: inset 0 -1px 0 rgba(255,255,255,0.08);
//     }
//     .cycle-badge {
//       background: linear-gradient(135deg, #ffd54f 0%, #ffc107 100%);
//       color: #002366;
//       font-weight: bold;
//       padding: 2px 8px;
//       border-radius: 12px;
//       font-size: 0.7rem;
//       box-shadow: 0 4px 10px rgba(255,193,7,0.25);
//     }
//     .galaxy-container {
//       position: relative;
//       width: 100%;
//       aspect-ratio: 1 / 1;
//       max-width: 660px;
//       margin: 20px auto;
//       min-height: 320px;
//       border-radius: 34px;
//       overflow: hidden;
//       background:
//         radial-gradient(circle at 50% 50%, rgba(27, 75, 196, 0.08) 0%, rgba(5, 22, 62, 0.06) 28%, rgba(2, 10, 33, 0.94) 74%, rgba(0, 7, 24, 0.98) 100%);
//       border: 1px solid rgba(255,255,255,0.08);
//       box-shadow:
//         inset 0 0 80px rgba(0, 119, 255, 0.06),
//         inset 0 0 24px rgba(255,255,255,0.03),
//         0 24px 60px rgba(0,35,102,0.12);
//       animation: glow-border 6s ease-in-out infinite;
//     }
//     .galaxy-container::before {
//       content: '';
//       position: absolute;
//       inset: 0;
//       background:
//         radial-gradient(circle at 20% 18%, rgba(0, 174, 255, 0.10), transparent 16%),
//         radial-gradient(circle at 82% 24%, rgba(132, 94, 255, 0.08), transparent 18%),
//         radial-gradient(circle at 52% 80%, rgba(255, 193, 7, 0.06), transparent 20%);
//       pointer-events: none;
//       z-index: 0;
//     }
//     .galaxy-grid {
//       position: absolute;
//       inset: 0;
//       border-radius: 34px;
//       pointer-events: none;
//       background-image:
//         linear-gradient(rgba(82, 145, 255, 0.045) 1px, transparent 1px),
//         linear-gradient(90deg, rgba(82, 145, 255, 0.045) 1px, transparent 1px);
//       background-size: 28px 28px;
//       mask-image: radial-gradient(circle at center, black 0%, rgba(0,0,0,0.82) 56%, transparent 90%);
//       opacity: 0.35;
//       z-index: 1;
//     }
//     .star-field {
//       position: absolute;
//       inset: 0;
//       pointer-events: none;
//       z-index: 1;
//     }
//     .star {
//       position: absolute;
//       border-radius: 50%;
//       background: rgba(255,255,255,0.95);
//       box-shadow: 0 0 6px rgba(255,255,255,0.4);
//       animation: twinkle 3.2s ease-in-out infinite, drift 8s ease-in-out infinite;
//     }
//     .galaxy-inner {
//       position: absolute;
//       inset: 0;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       z-index: 2;
//     }
//     .galaxy-stage {
//       position: absolute;
//       inset: 7%;
//       border-radius: 50%;
//     }
//     .orbit-ring {
//       position: absolute;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       border-radius: 50%;
//       pointer-events: none;
//       transition: all 0.3s ease;
//       animation: orbit-glow 4.2s ease-in-out infinite;
//       background: radial-gradient(circle at center, transparent 96%, rgba(255,255,255,0.22) 100%);
//       overflow: visible;
//     }
//     .orbit-ring::before {
//       content: '';
//       position: absolute;
//       inset: -10px;
//       border-radius: 50%;
//       border: 1px solid rgba(255,255,255,0.03);
//       pointer-events: none;
//     }
//     .orbit-ring.line1 {
//       border: 2px solid rgba(89, 150, 255, 0.36);
//       animation: orbit-glow 4.2s ease-in-out infinite, rotate-slow 30s linear infinite;
//     }
//     .orbit-ring.line2 {
//       border: 2px dashed rgba(89, 150, 255, 0.26);
//       animation: orbit-glow 5.2s ease-in-out infinite, rotate-reverse 48s linear infinite;
//     }
//     .orbit-ring.line3 {
//       border: 2px dotted rgba(89, 150, 255, 0.20);
//       animation: orbit-glow 6.2s ease-in-out infinite, rotate-slow 75s linear infinite;
//     }
//     .ring-label {
//       position: absolute;
//       top: -14px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: rgba(255,255,255,0.12);
//       color: #dce9ff;
//       padding: 5px 13px;
//       border-radius: 999px;
//       font-size: 0.66rem;
//       font-weight: 700;
//       text-transform: uppercase;
//       letter-spacing: 1.3px;
//       white-space: nowrap;
//       pointer-events: none;
//       backdrop-filter: blur(10px);
//       border: 1px solid rgba(255,255,255,0.10);
//       box-shadow: 0 10px 24px rgba(0,0,0,0.18);
//     }
//     .ring-stats {
//       position: absolute;
//       bottom: -14px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: rgba(255,255,255,0.10);
//       color: #bfd4ff;
//       padding: 5px 12px;
//       border-radius: 999px;
//       font-size: 0.62rem;
//       font-weight: 700;
//       white-space: nowrap;
//       pointer-events: none;
//       box-shadow: 0 10px 24px rgba(0,0,0,0.16);
//       border: 1px solid rgba(255,255,255,0.08);
//       backdrop-filter: blur(10px);
//     }
//     .planet-node {
//       position: absolute;
//       width: 44px;
//       height: 44px;
//       border-radius: 50%;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       cursor: pointer;
//       transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.28s ease, filter 0.28s ease, border-color 0.28s ease;
//       z-index: 10;
//       box-shadow: 0 8px 20px rgba(0,0,0,0.28);
//       border: 2px solid rgba(255,255,255,0.90);
//       animation: float 4s ease-in-out infinite;
//       animation-delay: calc(var(--index) * 0.12s);
//       will-change: transform;
//       backdrop-filter: blur(8px);
//       -webkit-backdrop-filter: blur(8px);
//     }
//     .planet-node:hover {
//       transform: translate(-50%, -50%) scale(1.18);
//       z-index: 100;
//       box-shadow: 0 14px 32px rgba(0,0,0,0.30), 0 0 20px rgba(92, 154, 255, 0.14);
//       filter: saturate(1.08) brightness(1.04);
//       animation: none;
//       border-color: rgba(255,255,255,1);
//     }
//     @media (max-width: 768px) {
//       .planet-node {
//         width: 36px;
//         height: 36px;
//       }
//       .galaxy-container.p39 .planet-node {
//         width: 26px;
//         height: 26px;
//       }
//     }
//     @media (max-width: 480px) {
//       .planet-node {
//         width: 30px;
//         height: 30px;
//       }
//       .galaxy-container.p39 .planet-node {
//         width: 22px;
//         height: 22px;
//       }
//       .ring-label,
//       .ring-stats {
//         font-size: 0.56rem;
//         padding: 3px 8px;
//       }
//     }
//     .galaxy-container.p39 .planet-node {
//       width: 34px;
//       height: 34px;
//     }
//     .galaxy-container.p39 .node-number {
//       font-size: 13px;
//     }
//     .planet-my-position {
//       background: linear-gradient(135deg, rgba(40, 167, 69, 0.95) 0%, rgba(32, 201, 151, 0.95) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(40, 167, 69, 0.46), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-downline {
//       background: linear-gradient(135deg, rgba(255, 193, 7, 0.96) 0%, rgba(253, 126, 20, 0.96) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(255, 193, 7, 0.26), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-other {
//       background: linear-gradient(135deg, rgba(0, 102, 204, 0.96) 0%, rgba(0, 153, 255, 0.96) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(0, 102, 204, 0.22), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-empty {
//       background: rgba(255, 255, 255, 0.92);
//       color: #dc3545;
//       border: 2px solid rgba(255, 107, 107, 0.95) !important;
//       box-shadow: 0 8px 20px rgba(220, 53, 69, 0.10), 0 10px 24px rgba(0,0,0,0.16);
//     }
//     .planet-structural-preview {
//       background: linear-gradient(135deg, #ffca28 0%, #ffb300 100%);
//       color: #002366;
//       animation: structural-pulse 2s infinite !important;
//       z-index: 50;
//     }
//     .planet-content {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       width: 100%;
//       height: 100%;
//       position: relative;
//     }
//     .node-number {
//       font-size: 16px;
//       font-weight: 800;
//       text-shadow: 0 1px 2px rgba(0,0,0,0.22);
//       line-height: 1;
//     }
//     .planet-icon {
//       position: absolute;
//       top: -4px;
//       right: -4px;
//       background: linear-gradient(135deg, #ffe082 0%, #ffc107 100%);
//       color: #002366;
//       border-radius: 50%;
//       width: 18px;
//       height: 18px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-size: 10px;
//       font-weight: bold;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.22);
//       border: 1px solid white;
//     }
//     .planet-earn-badge {
//       position: absolute;
//       top: -8px;
//       left: -8px;
//       background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
//       color: white;
//       border-radius: 12px;
//       padding: 2px 6px;
//       font-size: 9px;
//       font-weight: bold;
//       white-space: nowrap;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.20);
//       border: 1px solid white;
//     }
//     .structural-connection {
//       position: absolute;
//       background: linear-gradient(90deg, rgba(255, 215, 64, 0.98), rgba(255, 179, 0, 0.98));
//       height: 2px;
//       transform-origin: 0 0;
//       z-index: 5;
//       pointer-events: none;
//       box-shadow: 0 0 10px rgba(255, 193, 7, 0.55);
//       border-radius: 999px;
//     }
//     .connection-label {
//       position: absolute;
//       background: rgba(255, 215, 64, 0.98);
//       color: #002366;
//       padding: 2px 6px;
//       border-radius: 10px;
//       font-size: 8px;
//       font-weight: bold;
//       transform: translate(-50%, -50%);
//       white-space: nowrap;
//       z-index: 6;
//       border: 1px solid white;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.18);
//     }
//     .orbit-core {
//       position: absolute;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       width: 96px;
//       height: 96px;
//       background: radial-gradient(circle at 30% 30%, rgba(40, 129, 255, 1), rgba(0, 35, 102, 1));
//       border-radius: 50%;
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       color: white;
//       font-weight: bold;
//       box-shadow: 0 0 40px rgba(0,35,102,0.35);
//       border: 3px solid rgba(255,255,255,0.95);
//       z-index: 20;
//       animation: core-pulse 3.2s ease-in-out infinite;
//       backdrop-filter: blur(12px);
//     }
//     .orbit-core-inactive {
//       background: radial-gradient(circle at 30% 30%, rgba(173, 181, 189, 0.96), rgba(73, 80, 87, 0.96));
//       color: #f8f9fa;
//       box-shadow: 0 0 24px rgba(108,117,125,0.24);
//       border: 3px solid rgba(255,255,255,0.75);
//       animation: core-pulse-inactive 3.2s ease-in-out infinite;
//     }
//     .orbit-core::before {
//       content: '';
//       position: absolute;
//       inset: -7px;
//       border-radius: 50%;
//       border: 1px solid rgba(255,255,255,0.10);
//       box-shadow: 0 0 18px rgba(0, 119, 255, 0.20);
//       pointer-events: none;
//     }
//     .orbit-core-inactive::before {
//       box-shadow: 0 0 12px rgba(108,117,125,0.18);
//     }
//     @media (max-width: 768px) {
//       .orbit-core {
//         width: 74px;
//         height: 74px;
//       }
//     }
//     .galaxy-container.p39 .orbit-core {
//       width: 80px;
//       height: 80px;
//     }
//     @media (max-width: 768px) {
//       .galaxy-container.p39 .orbit-core {
//         width: 64px;
//         height: 64px;
//       }
//     }
//     .core-label {
//       font-size: 10px;
//       text-transform: uppercase;
//       opacity: 0.88;
//       letter-spacing: 1.2px;
//     }
//     .core-value {
//       font-size: 16px;
//       font-weight: 800;
//       text-shadow: 0 2px 4px rgba(0,0,0,0.30);
//       text-align: center;
//       line-height: 1.1;
//     }
//     .color-legend {
//       display: flex;
//       gap: 20px;
//       margin-bottom: 20px;
//       padding: 15px;
//       background: rgba(248, 249, 250, 0.82);
//       border-radius: 16px;
//       flex-wrap: wrap;
//       justify-content: center;
//       border: 1px solid rgba(0,35,102,0.06);
//       backdrop-filter: blur(8px);
//     }
//     .legend-item {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       font-size: 0.85rem;
//     }
//     .legend-color {
//       width: 20px;
//       height: 20px;
//       border-radius: 50%;
//       box-shadow: 0 6px 14px rgba(0,0,0,0.10);
//     }
//     .legend-color.green { background: #28a745; }
//     .legend-color.orange { background: #fd7e14; }
//     .legend-color.blue { background: #0066cc; }
//     .legend-color.gold { background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%); }
//     .legend-color.red {
//       background: white;
//       border: 2px solid #dc3545;
//     }
//     .legend-color.gray {
//       background: linear-gradient(135deg, #adb5bd 0%, #495057 100%);
//     }
//     .energy-cell .progress {
//       height: 12px;
//       background: rgba(240, 244, 248, 0.8);
//       border-radius: 10px;
//       overflow: hidden;
//       border: 1px solid rgba(0,0,0,0.04);
//       backdrop-filter: blur(6px);
//     }
//     .pulse-overlay {
//       background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.02) 45%, rgba(0, 68, 204, 0.08) 50%, rgba(0, 35, 102, 0.02) 55%, transparent 100%);
//       background-size: 200% 100%;
//       animation: pulse-line 5s linear infinite;
//     }
//     .nav-tabs .nav-link {
//       border: none;
//       color: #666;
//       font-weight: 700;
//       text-transform: uppercase;
//       font-size: 0.8rem;
//       letter-spacing: 1px;
//       padding: 15px 25px;
//     }
//     .nav-tabs .nav-link.active {
//       color: #002366;
//       border-bottom: 3px solid #002366;
//       background: transparent;
//     }
//     .refresh-button {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white;
//       border: none;
//       border-radius: 10px;
//       padding: 6px 16px;
//       font-size: 0.8rem;
//       cursor: pointer;
//       transition: all 0.3s ease;
//       box-shadow: 0 10px 20px rgba(0,68,204,0.16);
//     }
//     .refresh-button:hover {
//       background: linear-gradient(135deg, #003085 0%, #0055ff 100%);
//       transform: translateY(-1px);
//       color: white;
//     }
//     .view-toggle {
//       display: flex;
//       gap: 10px;
//       margin-left: 20px;
//       flex-wrap: wrap;
//     }
//     .view-toggle .btn {
//       border-radius: 999px;
//       padding: 6px 16px;
//       font-size: 0.8rem;
//       box-shadow: 0 8px 18px rgba(0,0,0,0.04);
//     }
//     .view-toggle .btn.active {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white;
//       border-color: #002366;
//       box-shadow: 0 10px 22px rgba(0,68,204,0.18);
//     }
//     .position-modal .modal-content {
//       border-radius: 24px;
//       border: none;
//       box-shadow: 0 24px 50px rgba(0,0,0,0.20);
//       backdrop-filter: blur(12px);
//       overflow: hidden;
//     }
//     .position-modal .modal-header {
//       background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
//       color: white;
//       border-bottom: none;
//       padding: 20px;
//     }
//     .position-modal .modal-body {
//       padding: 25px;
//       background: rgba(255,255,255,0.96);
//     }
//     .info-row {
//       display: flex;
//       justify-content: space-between;
//       padding: 12px 0;
//       border-bottom: 1px solid #f0f0f0;
//       gap: 16px;
//     }
//     .info-label {
//       font-weight: 600;
//       color: #666;
//     }
//     .info-value {
//       font-family: monospace;
//       font-weight: 700;
//       color: #002366;
//       text-align: right;
//     }
//     .commission-breakdown {
//       background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(244,247,252,0.95) 100%);
//       border-radius: 16px;
//       padding: 15px;
//       margin: 15px 0;
//       border: 1px solid rgba(0,35,102,0.05);
//     }
//     .commission-item {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       gap: 12px;
//       padding: 8px 0;
//       border-bottom: 1px solid rgba(0,0,0,0.05);
//       font-size: 0.9rem;
//     }
//     .commission-item:last-child {
//       border-bottom: none;
//     }
//     .commission-amount {
//       font-weight: 700;
//       color: #002366;
//     }
//     .commission-amount.payout {
//       color: #28a745;
//     }
//     .commission-amount.escrow {
//       color: #0dcaf0;
//     }
//     .hover-tooltip {
//       background: #002366 !important;
//       color: white !important;
//       font-size: 0.75rem !important;
//       padding: 8px 12px !important;
//       border-radius: 10px !important;
//       opacity: 1 !important;
//     }
//     .earned-caption {
//       font-size: 0.78rem;
//       color: #6c757d;
//       line-height: 1.4;
//       margin-top: 6px;
//     }
//     @media (max-width: 768px) {
//       .d-flex.align-items-center.justify-content-between {
//         flex-direction: column;
//         gap: 15px;
//       }
//       .view-toggle {
//         margin-left: 0;
//       }
//     }
//   `

//   const orbitTypeConfig = {
//     P4: {
//       name: 'P4',
//       contract: 'p4Orbit',
//       positions: 4,
//       lines: 1,
//       lineSizes: [4],
//       linePayouts: ['Owner / escrow / recycle by position'],
//       lineSpillovers: ['No structural child line'],
//       levels: [1, 4, 7, 10],
//       description: 'Single-line orbit'
//     },
//     P12: {
//       name: 'P12',
//       contract: 'p12Orbit',
//       positions: 12,
//       lines: 2,
//       lineSizes: [3, 9],
//       linePayouts: ['40% owner', '50% owner or 50% escrow'],
//       lineSpillovers: ['50% eligible upline', '40% structural parent'],
//       levels: [2, 5, 8],
//       description: 'Two-line orbit'
//     },
//     P39: {
//       name: 'P39',
//       contract: 'p39Orbit',
//       positions: 39,
//       lines: 3,
//       lineSizes: [3, 9, 27],
//       linePayouts: ['20% owner or 20% escrow', '20% owner or 20% escrow', '50% owner or 50% escrow'],
//       lineSpillovers: ['20% eligible upline + 50% next eligible upline', '20% structural parent + 50% orbit owner', '20% structural parent + 20% structural grandparent'],
//       levels: [3, 6, 9],
//       description: 'Three-line orbit'
//     }
//   }

//   const levelToOrbitType = {
//     1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
//     6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
//   }

//   const levelConfig = {
//     1: { price: 10, upgradeReq: 20, nextLevel: 2 },
//     2: { price: 20, upgradeReq: 40, nextLevel: 3 },
//     3: { price: 40, upgradeReq: 80, nextLevel: 4 },
//     4: { price: 80, upgradeReq: 160, nextLevel: 5 },
//     5: { price: 160, upgradeReq: 320, nextLevel: 6 },
//     6: { price: 320, upgradeReq: 640, nextLevel: 7 },
//     7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
//     8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
//     9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
//     10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
//   }

//   const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
//     const angle = (index / total) * 360 + startAngle
//     const radian = (angle * Math.PI) / 180
//     return {
//       x: centerX + radiusPx * Math.cos(radian),
//       y: centerY + radiusPx * Math.sin(radian),
//       angle
//     }
//   }

//   const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
//     const radian = (angle * Math.PI) / 180
//     return {
//       x: centerX + radiusPx * Math.cos(radian),
//       y: centerY + radiusPx * Math.sin(radian),
//       angle
//     }
//   }

//   const getPlanetSize = (orbitType, stageSize) => {
//     const base = orbitType === 'P39' ? 34 : 44
//     if (stageSize <= 260) return orbitType === 'P39' ? 22 : 30
//     if (stageSize <= 420) return orbitType === 'P39' ? 26 : 36
//     return base
//   }

//   const getCoreSize = (orbitType, stageSize) => {
//     if (stageSize <= 260) return orbitType === 'P39' ? 64 : 74
//     if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
//     return orbitType === 'P39' ? 80 : 96
//   }

//   const getStructuralParentPosition = (orbitType, position) => {
//     if (orbitType === 'P4') {
//       return null
//     }

//     if (orbitType === 'P12') {
//       if (position === 4 || position === 7 || position === 10) return 1
//       if (position === 5 || position === 8 || position === 11) return 2
//       if (position === 6 || position === 9 || position === 12) return 3
//       return null
//     }

//     if (orbitType === 'P39') {
//       if (position === 4 || position === 7 || position === 10) return 1
//       if (position === 5 || position === 8 || position === 11) return 2
//       if (position === 6 || position === 9 || position === 12) return 3
//       if (position === 13 || position === 22 || position === 31) return 4
//       if (position === 14 || position === 23 || position === 32) return 5
//       if (position === 15 || position === 24 || position === 33) return 6
//       if (position === 16 || position === 25 || position === 34) return 7
//       if (position === 17 || position === 26 || position === 35) return 8
//       if (position === 18 || position === 27 || position === 36) return 9
//       if (position === 19 || position === 28 || position === 37) return 10
//       if (position === 20 || position === 29 || position === 38) return 11
//       if (position === 21 || position === 30 || position === 39) return 12
//       return null
//     }

//     return null
//   }

//   const getOrbitStructure = (orbitType) => {
//     return {
//       P4: {
//         lines: [1],
//         counts: { 1: 4 },
//         positions: { 1: [1, 2, 3, 4] },
//         startAngles: { 1: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 0, 3: 90, 4: 180 }
//         }
//       },
//       P12: {
//         lines: [1, 2],
//         counts: { 1: 3, 2: 9 },
//         positions: {
//           1: [1, 2, 3],
//           2: [4, 5, 6, 7, 8, 9, 10, 11, 12]
//         },
//         startAngles: { 1: -90, 2: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: {
//             4: -138, 7: -102, 10: -66,
//             5: -18, 8: 18, 11: 54,
//             6: 102, 9: 138, 12: 174
//           }
//         }
//       },
//       P39: {
//         lines: [1, 2, 3],
//         counts: { 1: 3, 2: 9, 3: 27 },
//         positions: {
//           1: [1, 2, 3],
//           2: [4, 5, 6, 7, 8, 9, 10, 11, 12],
//           3: Array.from({ length: 27 }, (_, i) => i + 13)
//         },
//         startAngles: { 1: -90, 2: -90, 3: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: {
//             4: -138, 7: -102, 10: -66,
//             5: -18, 8: 18, 11: 54,
//             6: 102, 9: 138, 12: 174
//           },

//           3: {
//                 // Group under parent 4
//                 13: -145, 22: -133, 31: -121,
//                 // Group under parent 5
//                 14: -25,  23: -13,  32: -1,
//                 // Group under parent 6
//                 15: 95,   24: 107,  33: 119,
//                 // Group under parent 7
//                 16: -109, 25: -97,  34: -85,
//                 // Group under parent 8
//                 17: 11,   26: 23,   35: 35,
//                 // Group under parent 9
//                 18: 131,  27: 143,  36: 155,
//                 // Group under parent 10
//                 19: -73,  28: -61,  37: -49,
//                 // Group under parent 11
//                 20: 47,   29: 59,   38: 71,
//                 // Group under parent 12
//                 21: 167,  30: 179,  39: 191
//                 }
//         }
//       }
//     }[orbitType] || {
//       lines: [1],
//       counts: { 1: 4 },
//       positions: { 1: [1, 2, 3, 4] },
//       startAngles: { 1: -90 },
//       customAngles: {
//         1: { 1: -90, 2: 0, 3: 90, 4: 180 }
//       }
//     }
//   }

//   const getStarConfig = (count = 36) => {
//     return Array.from({ length: count }, (_, i) => ({
//       id: i,
//       left: `${((i * 17.73) % 100).toFixed(2)}%`,
//       top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
//       size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
//       delay: `${(i * 0.27).toFixed(2)}s`,
//       duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
//       drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
//       opacity: i % 4 === 0 ? 0.65 : 0.35
//     }))
//   }

//   const starConfig = getStarConfig(40)

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const fetchViewedLevels = useCallback(async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

//     const key = viewAddress.toLowerCase()
//     if (viewedLevelsCacheRef.current.has(key)) {
//       setViewedLevels(viewedLevelsCacheRef.current.get(key))
//       return
//     }

//     try {
//       const levels = {}
//       for (let i = 1; i <= 10; i++) {
//         try {
//           levels[i] = await withRetry(() => contracts.registration.isLevelActivated(viewAddress, i))
//         } catch {
//           levels[i] = false
//         }
//       }

//       viewedLevelsCacheRef.current.set(key, levels)
//       setViewedLevels(levels)
//     } catch (err) {
//       console.error('Error fetching viewed levels:', err)
//     }
//   }, [contracts, viewAddress, withRetry])

//   const applyViewerAddress = async () => {
//     if (!inputAddress || !ethers.isAddress(inputAddress)) {
//       setOrbitError(t('orbits.enterValidAddress'))
//       return
//     }

//     setOrbitError('')
//     const normalized = ethers.getAddress(inputAddress)
//     setInputAddress(normalized)
//     setViewAddress(normalized)
//     setViewMode('global')
//   }

//   const viewMyOrbit = () => {
//     if (!account) return
//     setOrbitError('')
//     setInputAddress(account)
//     setViewAddress(account)
//     setViewMode('global')
//   }

//   const getPositionInfo = (orbitType, position, level, autoUpgradeCompleted = false) => {
//     const parentPosition = getStructuralParentPosition(orbitType, position)

//     const info = {
//       type: 'unknown',
//       payout: 0,
//       escrow: 0,
//       spillover: 0,
//       description: '',
//       toUpline: false,
//       line: 1,
//       isAutoUpgradeSource: false,
//       isRecyclePosition: false,
//       spillsTo: parentPosition,
//       parentPosition
//     }

//     if (orbitType === 'P4') {
//       info.line = 1
//       info.isRecyclePosition = position === 4

//       if (!autoUpgradeCompleted) {
//         if (position === 1) {
//           info.type = 'payout-escrow'
//           info.payout = 70
//           info.escrow = 20
//           info.spillover = 0
//           info.description = 'Position 1: 70% to orbit owner and 20% locked for auto-upgrade.'
//           info.toUpline = true
//           info.isAutoUpgradeSource = true
//         } else if (position === 2 || position === 3) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 90
//           info.spillover = 0
//           info.description = `Position ${position}: 90% locked for auto-upgrade.`
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         } else if (position === 4) {
//           info.type = 'recycle'
//           info.description = 'Position 4: recycle position.'
//         }
//       } else {
//         if (position === 1 || position === 2 || position === 3) {
//           info.type = 'payout'
//           info.payout = 90
//           info.description = `Position ${position}: 90% to orbit owner.`
//           info.toUpline = true
//         } else if (position === 4) {
//           info.type = 'recycle'
//           info.description = 'Position 4: recycle position.'
//         }
//       }
//     } else if (orbitType === 'P12') {
//       if (position <= 3) {
//         info.line = 1
//         info.type = 'payout'
//         info.payout = 40
//         info.spillover = 50
//         info.description = `Position ${position}: 40% to orbit owner and 50% to eligible upline.`
//         info.toUpline = true
//       } else if (position >= 4 && position <= 7) {
//         info.line = 2
//         info.type = 'escrow'
//         info.escrow = 50
//         info.spillover = 40
//         info.description = `Position ${position}: 50% locked for auto-upgrade and 40% to structural parent position ${parentPosition}.`
//         info.isAutoUpgradeSource = true
//       } else if (position >= 8 && position <= 10) {
//         info.line = 2
//         info.type = 'payout'
//         info.payout = 50
//         info.spillover = 40
//         info.description = `Position ${position}: 50% to orbit owner and 40% to structural parent position ${parentPosition}.`
//         info.toUpline = true
//       } else if (position === 11 || position === 12) {
//         info.line = 2
//         info.type = 'recycle'
//         info.isRecyclePosition = true
//         info.description = `Position ${position}: recycle position under structural parent ${parentPosition}.`
//       }
//     } else if (orbitType === 'P39') {
//       if (position <= 3) {
//         info.line = 1
//         if (position <= 2) {
//           info.type = 'payout'
//           info.payout = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% to orbit owner, 20% to eligible upline, and 50% to next eligible upline.`
//           info.toUpline = true
//         } else if (position === 3) {
//           info.type = 'escrow'
//           info.escrow = 20
//           info.spillover = 70
//           info.description = 'Position 3: 20% locked for auto-upgrade, 20% to eligible upline, and 50% to next eligible upline.'
//           info.isAutoUpgradeSource = true
//         }
//       } else if (position >= 4 && position <= 12) {
//         info.line = 2
//         if (position >= 4 && position <= 7) {
//           info.type = 'escrow'
//           info.escrow = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% locked for auto-upgrade, 20% to structural parent position ${parentPosition}, and 50% to orbit owner.`
//           info.isAutoUpgradeSource = true
//         } else {
//           info.type = 'payout'
//           info.payout = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% to orbit owner, 20% to structural parent position ${parentPosition}, and 50% to orbit owner.`
//           info.toUpline = true
//         }
//       } else if (position >= 13 && position <= 39) {
//         info.line = 3
//         const grandParentPosition = (() => {
//           if (parentPosition === 4 || parentPosition === 7 || parentPosition === 10) return 1
//           if (parentPosition === 5 || parentPosition === 8 || parentPosition === 11) return 2
//           return 3
//         })()

//         if (position >= 13 && position <= 14) {
//           info.type = 'escrow'
//           info.escrow = 50
//           info.spillover = 40
//           info.description = `Position ${position}: 50% locked for auto-upgrade, 20% to structural parent position ${parentPosition}, and 20% to structural grandparent position ${grandParentPosition}.`
//           info.isAutoUpgradeSource = true
//         } else if (position >= 15 && position <= 37) {
//           info.type = 'payout'
//           info.payout = 50
//           info.spillover = 40
//           info.description = `Position ${position}: 50% to orbit owner, 20% to structural parent position ${parentPosition}, and 20% to structural grandparent position ${grandParentPosition}.`
//           info.toUpline = true
//         } else if (position === 38 || position === 39) {
//           info.type = 'recycle'
//           info.isRecyclePosition = true
//           info.description = `Position ${position}: recycle position under structural parent ${parentPosition}.`
//         }
//       }
//     }

//     return info
//   }

//   const fetchAllOrbitData = useCallback(async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

//     const fetchId = ++fetchIdRef.current
//     setOrbitError('')
//     setIsLoadingOrbits(true)

//     try {
//       const newOrbitData = {}
//       const newUserLocks = {}
//       const derivedDownline = {}
//       const derivedSpillover = {}

//       const BATCH_SIZE = 2
//       const BATCH_DELAY = 700
//       const POSITION_CHUNK_SIZE = 5

//       for (let batchStart = 1; batchStart <= 10; batchStart += BATCH_SIZE) {
//         const batchPromises = []

//         for (let level = batchStart; level < batchStart + BATCH_SIZE && level <= 10; level++) {
//           const orbitType = levelToOrbitType[level]
//           const config = orbitTypeConfig[orbitType]
//           const orbitContract = contracts[config.contract]

//           if (!orbitContract) continue

//           const levelPromise = (async () => {
//             try {
//               const orbitState = await withRetry(() => orbitContract.getUserOrbit(viewAddress, level))

//               const positions = []
//               const myPositions = []
//               const downlinePositions = []
//               const otherOccupants = []
//               const positionTasks = []

//               for (let pos = 1; pos <= config.positions; pos++) {
//                 positionTasks.push(async () => {
//                   try {
//                     const position = await withRetry(() => orbitContract.getPosition(viewAddress, level, pos))
//                     const occupantAddress = position[0]
//                     const amountRaw = position[1]
//                     const timestampRaw = position[2]
//                     const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])

//                     let occupantType = 'empty'

//                     if (occupantAddress && occupantAddress !== ethers.ZeroAddress) {
//                       if (occupantAddress.toLowerCase() === viewAddress.toLowerCase()) {
//                         occupantType = 'mine'
//                         myPositions.push(pos)
//                       } else {
//                         const referrer = await getCachedReferrer(occupantAddress)

//                         if (referrer.toLowerCase() === viewAddress.toLowerCase()) {
//                           occupantType = 'downline'
//                           downlinePositions.push({
//                             position: pos,
//                             user: occupantAddress,
//                             amount: ethers.formatUnits(amountRaw, 6),
//                             timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
//                             level,
//                             activated: false,
//                             positionInfo: posInfo
//                           })
//                         } else {
//                           occupantType = 'other'
//                           otherOccupants.push({
//                             position: pos,
//                             user: occupantAddress,
//                             amount: ethers.formatUnits(amountRaw, 6),
//                             timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
//                             level,
//                             positionInfo: posInfo,
//                             originalReferrer: referrer
//                           })
//                         }
//                       }
//                     }

//                     return {
//                       number: pos,
//                       occupantType,
//                       occupant: occupantAddress !== ethers.ZeroAddress ? occupantAddress : null,
//                       amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
//                       timestamp: timestampRaw,
//                       positionInfo: posInfo,
//                       line: posInfo.line,
//                       spillsTo: posInfo.spillsTo,
//                       parentPosition: posInfo.parentPosition
//                     }
//                   } catch {
//                     const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])
//                     return {
//                       number: pos,
//                       occupantType: 'empty',
//                       occupant: null,
//                       amount: '0',
//                       timestamp: 0,
//                       positionInfo: posInfo,
//                       line: posInfo.line,
//                       spillsTo: posInfo.spillsTo,
//                       parentPosition: posInfo.parentPosition
//                     }
//                   }
//                 })
//               }

//               const positionResults = []
//               for (const chunk of chunkArray(positionTasks, POSITION_CHUNK_SIZE)) {
//                 const chunkResults = await Promise.all(chunk.map(task => task()))
//                 positionResults.push(...chunkResults)
//                 await delay(120)
//               }

//               positions.push(...positionResults)

//               const structuralLinks = positions
//                 .filter((p) => p.parentPosition && p.occupant)
//                 .map((p) => ({
//                   from: p.number,
//                   to: p.parentPosition,
//                   user: p.occupant,
//                   amount: p.amount
//                 }))

//               let escrowLock = '0'
//               if (level < 10) {
//                 try {
//                   const lockedAmount = await withRetry(() => contracts.escrow.getLockedAmount(viewAddress, level, level + 1))
//                   escrowLock = ethers.formatUnits(lockedAmount, 6)
//                 } catch {}
//               }

//               return {
//                 level,
//                 data: {
//                   orbitType,
//                   config,
//                   currentIndex: orbitState[0],
//                   escrowBalance: ethers.formatUnits(orbitState[1], 6),
//                   autoUpgradeCompleted: orbitState[2],
//                   positionsInLine1: orbitState[3],
//                   positionsInLine2: orbitState[4],
//                   positionsInLine3: orbitState[5],
//                   totalCycles: orbitState[6],
//                   totalEarned: ethers.formatUnits(orbitState[7], 6),
//                   positions,
//                   myPositions,
//                   downlinePositions,
//                   otherOccupants,
//                   spilloverFromPositions: structuralLinks
//                 },
//                 escrowLock
//               }
//             } catch {
//               const positions = []
//               for (let pos = 1; pos <= config.positions; pos++) {
//                 const posInfo = getPositionInfo(orbitType, pos, level)
//                 positions.push({
//                   number: pos,
//                   occupantType: 'empty',
//                   occupant: null,
//                   amount: '0',
//                   timestamp: 0,
//                   positionInfo: posInfo,
//                   line: posInfo.line,
//                   spillsTo: posInfo.spillsTo,
//                   parentPosition: posInfo.parentPosition
//                 })
//               }

//               return {
//                 level,
//                 data: {
//                   orbitType,
//                   config,
//                   currentIndex: 1,
//                   escrowBalance: '0',
//                   autoUpgradeCompleted: false,
//                   positionsInLine1: 0,
//                   positionsInLine2: 0,
//                   positionsInLine3: 0,
//                   totalCycles: 0,
//                   totalEarned: '0',
//                   positions,
//                   myPositions: [],
//                   downlinePositions: [],
//                   otherOccupants: [],
//                   spilloverFromPositions: []
//                 },
//                 escrowLock: '0'
//               }
//             }
//           })()

//           batchPromises.push(levelPromise)
//         }

//         const batchResults = await Promise.all(batchPromises)

//         batchResults.forEach(result => {
//           if (result) {
//             newOrbitData[result.level] = result.data
//             derivedDownline[result.level] = result.data.downlinePositions || derivedDownline[result.level] || []
//             derivedSpillover[result.level] = result.data.otherOccupants || derivedSpillover[result.level] || []

//             if (result.level < 10) {
//               newUserLocks[result.level] = result.escrowLock
//             }
//           }
//         })

//         if (batchStart + BATCH_SIZE <= 10) {
//           await delay(BATCH_DELAY)
//         }
//       }

//       if (fetchId !== fetchIdRef.current) return

//       setOrbitData(newOrbitData)
//       setUserLocks(newUserLocks)
//       setDownlineData(derivedDownline)
//       setSpilloverData(derivedSpillover)
//     } catch (err) {
//       console.error('Orbit sync error:', err)
//       setOrbitError(t('orbits.loadFailed'))
//     } finally {
//       if (fetchId === fetchIdRef.current) {
//         setIsLoadingOrbits(false)
//       }
//     }
//   }, [contracts, viewAddress, getCachedReferrer, withRetry, t])

//   const refreshData = async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
//     setIsRefreshing(true)

//     try {
//       await fetchViewedLevels()
//       await fetchAllOrbitData()
//       setLastUpdated(new Date().toLocaleTimeString())
//     } catch (err) {
//       console.error('Refresh error:', err)
//     } finally {
//       setIsRefreshing(false)
//     }
//   }

//   useEffect(() => {
//     if (contracts && viewAddress && ethers.isAddress(viewAddress)) {
//       fetchViewedLevels()
//       fetchAllOrbitData()
//     }
//   }, [contracts, viewAddress, fetchViewedLevels, fetchAllOrbitData])

//   const handleViewModeChange = (mode) => {
//     setViewMode(mode)
//   }

//   const handlePositionClick = (position) => {
//     setSelectedPosition(position)
//     setShowPositionModal(true)
//   }

//   const handleStructuralPreview = (position) => {
//     if (position.parentPosition) {
//       setShowStructuralPreview(true)
//       setTimeout(() => setShowStructuralPreview(false), 2000)
//     }
//   }

//   const renderPositionTooltip = (position) => {
//     if (!position.occupant) {
//       return (
//         <Tooltip id="tooltip-empty">
//           <strong>{t('orbits.emptyPosition')}</strong>
//           <div>{t('orbits.availableToBeFilled')}</div>
//           <div className="mt-1 small">{position.positionInfo.description}</div>
//           {position.parentPosition && (
//             <div className="text-warning mt-1">
//               {t('orbits.structuralParent', { position: position.parentPosition })}
//             </div>
//           )}
//         </Tooltip>
//       )
//     }

//     return (
//       <Tooltip id={`tooltip-${position.number}`}>
//         <div><strong>Position #{position.number}</strong> ({t('orbits.line')} {position.line})</div>
//         <div>Occupied by: {position.occupant.slice(0, 8)}...{position.occupant.slice(-6)}</div>
//         <div>Amount: {position.amount} USDT</div>
//         <div className="mt-1 small">{position.positionInfo.description}</div>

//         {position.parentPosition && (
//           <div className="text-warning mt-1">
//             Structural parent: Position {position.parentPosition}
//           </div>
//         )}

//         {position.occupantType === 'downline' && (
//           <div className="text-warning mt-1">{t('orbits.directDownlineViewedAddress')}</div>
//         )}

//         {position.occupantType === 'mine' && (
//           <div className="text-success mt-1">{t('orbits.belongsToViewedAddress')}</div>
//         )}

//         {position.positionInfo.payout > 0 && (
//           <div className="text-success mt-1">{t('orbits.directPayoutSlice', { value: position.positionInfo.payout })}</div>
//         )}

//         {position.positionInfo.spillover > 0 && position.occupantType !== 'mine' && (
//           <div className="text-warning mt-1">{t('orbits.routedPayoutSlicesExist')}</div>
//         )}

//         {position.positionInfo.escrow > 0 && (
//           <div className="text-info mt-1">{t('orbits.escrowLocked', { value: position.positionInfo.escrow })}</div>
//         )}
//       </Tooltip>
//     )
//   }

//   if (!isConnected) {
//     return (
//       <Container className="mt-5 pt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="primary" className="text-center p-5 lab-card shadow-lg" style={{ backgroundColor: '#002366', color: 'white', border: 'none' }}>
//           <h4 className="fw-bold">{t('orbits.connectTitle')}</h4>
//           <p className="m-0 opacity-75">{t('orbits.connectText')}</p>
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoading) {
//     return (
//       <Container className="mt-5 text-center">
//         <style>{orbitStyles}</style>
//         <Spinner animation="grow" variant="primary" />
//         <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>{t('orbits.syncing')}</p>
//       </Container>
//     )
//   }

//   if (error) {
//     return (
//       <Container className="mt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="danger" className="lab-card shadow-sm border-0">
//           <strong>{t('orbits.panelError')}:</strong> {error}
//         </Alert>
//       </Container>
//     )
//   }

//   if (orbitError) {
//     return (
//       <Container className="mt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="danger" className="lab-card shadow-sm border-0">
//           <strong className="text-danger">{t('orbits.systemAlert')}:</strong> {orbitError}
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoadingOrbits) {
//     return (
//       <Container className="mt-5 pt-4">
//         <style>{orbitStyles}</style>
//         <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
//           <div className="d-flex align-items-center">
//             <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
//             <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//               {t('orbits.pageTitle')}
//             </h1>
//           </div>
//         </div>

//         <div className="text-center py-5">
//           <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
//           <p className="mt-3 fw-bold text-muted">{t('orbits.loading')}</p>
//         </div>
//       </Container>
//     )
//   }

//   const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
//   const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
//   const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()

//   return (
//     <Container className="mt-5 pt-4">
//       <style>{orbitStyles}</style>

//       <Modal show={showPositionModal} onHide={() => setShowPositionModal(false)} className="position-modal" centered>
//         <Modal.Header closeButton>
//           <Modal.Title>{t('orbits.positionDetails', { number: selectedPosition?.number })}</Modal.Title>
//         </Modal.Header>

//         <Modal.Body>
//           {selectedPosition && (
//             <>
//               <div className="info-row">
//                 <span className="info-label">{t('orbits.positionType')}</span>
//                 <span className="info-value">{selectedPosition.positionInfo?.type?.toUpperCase()}</span>
//               </div>

//               <div className="info-row">
//                 <span className="info-label">{t('orbits.line')}</span>
//                 <span className="info-value">{t('orbits.line')} {selectedPosition.positionInfo?.line}</span>
//               </div>

//               {selectedPosition.parentPosition && (
//                 <div className="info-row">
//                   <span className="info-label">Structural Parent</span>
//                   <span className="info-value">Position {selectedPosition.parentPosition}</span>
//                 </div>
//               )}

//               {selectedPosition.occupant ? (
//                 <>
//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.occupiedBy')}</span>
//                     <span className="info-value">
//                       {selectedPosition.occupantType === 'mine'
//                         ? (isViewingSelf ? t('orbits.you') : t('orbits.viewedOwner'))
//                         : selectedPosition.occupant.slice(0, 10) + '...' + selectedPosition.occupant.slice(-8)}
//                     </span>
//                   </div>

//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.fullAddress')}</span>
//                     <span className="info-value" style={{ fontSize: '0.8rem' }}>
//                       {selectedPosition.occupant}
//                     </span>
//                   </div>

//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.amountEntered')}</span>
//                     <span className="info-value">{selectedPosition.amount} USDT</span>
//                   </div>

//                   {selectedPosition.timestamp > 0 && (
//                     <div className="info-row">
//                       <span className="info-label">{t('orbits.filledOn')}</span>
//                       <span className="info-value">
//                         {new Date(Number(selectedPosition.timestamp) * 1000).toLocaleString()}
//                       </span>
//                     </div>
//                   )}

//                   <div className="commission-breakdown">
//                     <h6 className="fw-bold mb-3">{t('orbits.routingBreakdown')}</h6>
//                     <p className="small text-muted mb-3">{selectedPosition.positionInfo?.description}</p>

//                     {selectedPosition.positionInfo?.payout > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.directRecipientSlice')}</span>
//                         <span className="commission-amount payout">
//                           {selectedPosition.positionInfo.payout}% of orbit amount
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.escrow > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.lockedInEscrow')}</span>
//                         <span className="commission-amount escrow">
//                           {selectedPosition.positionInfo.escrow}% of orbit amount
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.spillover > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.otherRoutedSlices')}</span>
//                         <span className="commission-amount" style={{ color: '#ffc107' }}>
//                           {t('orbits.seePositionRule')}
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.type === 'recycle' && (
//                       <div className="commission-item">
//                         <span>{t('orbits.status')}</span>
//                         <span className="commission-amount" style={{ color: '#6c757d' }}>
//                           {t('orbits.recyclePosition')}
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'downline' && (
//                       <div className="alert alert-warning mt-3 mb-0 small">
//                         <strong>{t('orbits.downlineAlertTitle')}</strong><br />
//                         {selectedPosition.positionInfo?.toUpline
//                           ? t('orbits.downlineAlertPayout')
//                           : t('orbits.downlineAlertEscrow')}
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'mine' && (
//                       <div className="alert alert-success mt-3 mb-0 small">
//                         <strong>{t('orbits.mineAlertTitle')}</strong><br />
//                         {t('orbits.mineAlertText')}
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'other' && selectedPosition.positionInfo?.spillover > 0 && (
//                       <div className="alert alert-info mt-3 mb-0 small">
//                         <strong>{t('orbits.otherAlertTitle')}</strong><br />
//                         {t('orbits.otherAlertText')}
//                       </div>
//                     )}
//                   </div>
//                 </>
//               ) : (
//                 <div className="text-center p-4">
//                   <h5 className="text-muted">{t('orbits.emptyPosition')}</h5>
//                   <p className="small">{t('orbits.availableToBeFilled')}</p>

//                   <div className="commission-breakdown mt-3">
//                     <h6 className="fw-bold mb-2">{t('orbits.whenFilled')}</h6>
//                     <p className="small mb-0">{selectedPosition.positionInfo?.description}</p>
//                     {selectedPosition.parentPosition && (
//                       <p className="small text-warning mt-2">
//                         {t('orbits.structuralParent', { position: selectedPosition.parentPosition })}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </Modal.Body>

//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowPositionModal(false)}>
//             {t('orbits.close')}
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
//         <div className="d-flex align-items-center">
//           <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px', borderRadius: '8px' }}></div>
//           <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//             {t('orbits.pageTitle')}
//           </h1>

//           <div className="view-toggle">
//             <Button
//               variant={viewMode === 'global' ? 'primary' : 'outline-secondary'}
//               size="sm"
//               onClick={() => handleViewModeChange('global')}
//               className={viewMode === 'global' ? 'active' : ''}
//             >
//               {t('orbits.orbitView')}
//             </Button>

//             <Button
//               variant={viewMode === 'downline' ? 'primary' : 'outline-secondary'}
//               size="sm"
//               onClick={() => handleViewModeChange('downline')}
//               className={viewMode === 'downline' ? 'active' : ''}
//             >
//               {t('orbits.downlineView')}
//               {totalDownline > 0 && <Badge bg="warning" className="ms-1">{totalDownline}</Badge>}
//               {totalSpillover > 0 && <Badge bg="info" className="ms-1">{totalSpillover} orbit</Badge>}
//             </Button>
//           </div>
//         </div>

//         <div className="d-flex align-items-center">
//           <span className="text-muted small me-3">{t('orbits.lastSync')}: {lastUpdated}</span>
//           <Button
//             variant="link"
//             className="refresh-button"
//             onClick={refreshData}
//             disabled={isRefreshing || !viewAddress || !ethers.isAddress(viewAddress)}
//           >
//             {isRefreshing ? t('orbits.refreshing') : t('orbits.refresh')}
//           </Button>
//         </div>
//       </div>

//       <div className="lab-card p-3 mb-4">
//         <Row className="align-items-end g-3">
//           <Col lg={8}>
//             <Form.Group>
//               <Form.Label className="fw-bold small text-uppercase text-muted">{t('orbits.addressToView')}</Form.Label>
//               <Form.Control
//                 type="text"
//                 value={inputAddress}
//                 onChange={(e) => setInputAddress(e.target.value)}
//                 placeholder="0x..."
//               />
//               <div className="small text-muted mt-2">
//                 {t('orbits.currentlyViewing')} {viewAddress ? `${viewAddress.slice(0, 8)}...${viewAddress.slice(-6)}` : t('orbits.noAddressSelected')}
//                 {isViewingSelf && ` ${t('orbits.yourWallet')}`}
//               </div>
//             </Form.Group>
//           </Col>

//           <Col lg={4}>
//             <div className="d-flex gap-2">
//               <Button onClick={applyViewerAddress} disabled={!inputAddress || !ethers.isAddress(inputAddress)}>
//                 {t('orbits.loadAddress')}
//               </Button>
//               <Button variant="outline-secondary" onClick={viewMyOrbit} disabled={!account}>
//                 {t('orbits.viewMine')}
//               </Button>
//             </div>
//           </Col>
//         </Row>
//       </div>

//       <div className="color-legend">
//         <div className="legend-item">
//           <div className="legend-color green"></div>
//           <span><strong>{t('orbits.legendViewedOwner')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color orange"></div>
//           <span><strong>{t('orbits.legendDirectDownline')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color blue"></div>
//           <span><strong>{t('orbits.legendOtherUser')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color gold"></div>
//           <span><strong>STRUCTURAL PARENT LINK</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color red"></div>
//           <span><strong>{t('orbits.legendEmpty')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color gray"></div>
//           <span><strong>{t('orbits.legendInactive')}</strong></span>
//         </div>
//       </div>

//       <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 border-0">
//         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//           const data = orbitData[level]
//           if (!data) return null

//           const { config, positions, currentIndex, autoUpgradeCompleted, totalCycles, orbitType } = data
//           const downlineAtLevel = downlineData[level] || []
//           const spilloverAtLevel = spilloverData[level] || []
//           const levelInfo = levelConfig[level]
//           const isLevelActive = !!viewedLevels[level]

//           const positionsByLine = {}
//           positions.forEach(pos => {
//             const line = pos.line
//             if (!positionsByLine[line]) positionsByLine[line] = []
//             positionsByLine[line].push(pos)
//           })

//           const structure = getOrbitStructure(orbitType)

//           return (
//             <Tab
//               key={level}
//               eventKey={`level${level}`}
//               title={
//                 <span>
//                   Level {level} ({data.orbitType})
//                   {!isLevelActive && <Badge bg="secondary" className="ms-2">{t('orbits.inactive')}</Badge>}
//                   {downlineAtLevel.length > 0 && <Badge bg="warning" className="ms-2">{downlineAtLevel.length}</Badge>}
//                   {spilloverAtLevel.length > 0 && <Badge bg="info" className="ms-2">{spilloverAtLevel.length}s</Badge>}
//                   {autoUpgradeCompleted && <Badge bg="success" className="ms-2">{t('orbits.upgraded')}</Badge>}
//                 </span>
//               }
//             >
//               <Row>
//                 <Col lg={8}>
//                   <div className="lab-card mb-4">
//                     <div className="orbit-header d-flex justify-content-between align-items-center">
//                       <span>
//                         Level {level} ({data.orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}
//                         {totalCycles > 0 && <span className="cycle-badge ms-3">{t('orbits.cycle', { count: Number(totalCycles) + 1 })}</span>}
//                       </span>
//                       <div>
//                         {!isLevelActive && <Badge bg="secondary" className="me-2">{t('orbits.inactiveLevel')}</Badge>}
//                         {downlineAtLevel.length > 0 && <Badge bg="warning" className="me-2">{t('orbits.downlineCount', { count: downlineAtLevel.length })}</Badge>}
//                         {spilloverAtLevel.length > 0 && <Badge bg="info" className="me-2">{t('orbits.orbitCount', { count: spilloverAtLevel.length })}</Badge>}
//                         <Badge bg="info">{currentIndex || 1}/{config.positions} filled</Badge>
//                       </div>
//                     </div>

//                     <div className="p-4">
//                       <div className={`galaxy-container ${orbitType.toLowerCase()}`} ref={activeTab === `level${level}` ? galaxyRef : null}>
//                         <div className="galaxy-grid"></div>

//                         <div className="star-field">
//                           {starConfig.map((star) => (
//                             <span
//                               key={star.id}
//                               className="star"
//                               style={{
//                                 left: star.left,
//                                 top: star.top,
//                                 width: star.size,
//                                 height: star.size,
//                                 opacity: star.opacity,
//                                 animationDelay: `${star.delay}, ${star.delay}`,
//                                 animationDuration: `${star.duration}, ${star.drift}`
//                               }}
//                             />
//                           ))}
//                         </div>

//                         <div className="galaxy-inner">
//                           {(() => {
//                             const outerWidth = containerSize.width > 0 ? containerSize.width : 560
//                             const outerHeight = containerSize.height > 0 ? containerSize.height : 560
//                             const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
//                             const stageSize = usableSize
//                             const centerX = stageSize / 2
//                             const centerY = stageSize / 2

//                             const planetSize = getPlanetSize(orbitType, stageSize)
//                             const coreSize = getCoreSize(orbitType, stageSize)
//                             const nodePadding = planetSize / 2 + 8
//                             const coreClearance = coreSize / 2 + planetSize / 2 + 18

//                             let ringRadiiPx = {
//                               1: Math.max(coreClearance, stageSize * 0.22),
//                               2: stageSize * 0.34,
//                               3: stageSize * 0.45
//                             }

//                             if (orbitType === 'P4') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance + 6, stageSize * 0.31)
//                               }
//                             }

//                             if (orbitType === 'P12') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance + 4, stageSize * 0.19),
//                                 2: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding)
//                               }
//                             }

//                             if (orbitType === 'P39') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance, stageSize * 0.17),
//                                 2: Math.min(stageSize * 0.32, (stageSize / 2) - nodePadding - 34),
//                                 3: Math.min(stageSize * 0.47, (stageSize / 2) - nodePadding)
//                               }
//                             }

//                             Object.keys(ringRadiiPx).forEach(key => {
//                               ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding)
//                             })

//                             const createEmptyPosition = (posNumber, lineNum) => ({
//                               number: posNumber,
//                               occupantType: 'empty',
//                               occupant: null,
//                               amount: '0',
//                               timestamp: 0,
//                               positionInfo: getPositionInfo(orbitType, posNumber, level, autoUpgradeCompleted),
//                               line: lineNum,
//                               spillsTo: null,
//                               parentPosition: getStructuralParentPosition(orbitType, posNumber)
//                             })

//                             const allPositionMap = {}
//                             structure.lines.forEach(lineNum => {
//                               const linePositions = positionsByLine[lineNum] || []
//                               structure.positions[lineNum].forEach(posNumber => {
//                                 allPositionMap[posNumber] = linePositions.find(p => p.number === posNumber) || createEmptyPosition(posNumber, lineNum)
//                               })
//                             })

//                             const getCoordsForPosition = (posNumber, lineNum, index) => {
//                               const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
//                               if (typeof customAngle === 'number') {
//                                 return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
//                               }

//                               return getPositionOnRing(
//                                 index,
//                                 structure.counts[lineNum],
//                                 ringRadiiPx[lineNum],
//                                 centerX,
//                                 centerY,
//                                 structure.startAngles[lineNum]
//                               )
//                             }

//                             return (
//                               <div
//                                 className="galaxy-stage"
//                                 style={{
//                                   width: stageSize,
//                                   height: stageSize,
//                                   left: '50%',
//                                   top: '50%',
//                                   transform: 'translate(-50%, -50%)'
//                                 }}
//                               >
//                                 <div
//                                   className={`orbit-core ${!isLevelActive ? 'orbit-core-inactive' : ''}`}
//                                   style={{
//                                     width: coreSize,
//                                     height: coreSize
//                                   }}
//                                 >
//                                   <span className="core-label">{isLevelActive ? t('orbits.owner') : t('orbits.inactiveCore')}</span>
//                                   <span className="core-value">
//                                     {isLevelActive
//                                       ? (isViewingSelf ? t('orbits.you') : t('orbits.view'))
//                                       : t('orbits.levelOff')}
//                                   </span>
//                                 </div>

//                                 {structure.lines.map(lineNum => {
//                                   const linePositions = positionsByLine[lineNum] || []
//                                   const filledCount = linePositions.filter(p => p.occupant).length
//                                   const diameter = ringRadiiPx[lineNum] * 2

//                                   return (
//                                     <div
//                                       key={lineNum}
//                                       className={`orbit-ring line${lineNum}`}
//                                       style={{
//                                         width: diameter,
//                                         height: diameter
//                                       }}
//                                     >
//                                       <span className="ring-label">LINE {lineNum}</span>
//                                       <span className="ring-stats">
//                                         {filledCount}/{structure.positions[lineNum].length} • {config.linePayouts[lineNum - 1]} • {config.lineSpillovers[lineNum - 1]}
//                                       </span>
//                                     </div>
//                                   )
//                                 })}

//                                 <>
//                                   {structure.lines.map(lineNum => {
//                                     const positionNumbers = structure.positions[lineNum]

//                                     return positionNumbers.map((posNumber, index) => {
//                                       const pos = allPositionMap[posNumber]
//                                       const coords = getCoordsForPosition(posNumber, lineNum, index)

//                                       let planetClass = 'planet-node '
//                                       if (pos.occupantType === 'mine') {
//                                         planetClass += 'planet-my-position'
//                                       } else if (pos.occupantType === 'downline') {
//                                         planetClass += 'planet-downline'
//                                       } else if (pos.occupantType === 'other') {
//                                         planetClass += 'planet-other'
//                                       } else {
//                                         planetClass += 'planet-empty'
//                                       }

//                                       if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) {
//                                         planetClass += ' planet-structural-preview'
//                                       }

//                                       return (
//                                         <OverlayTrigger
//                                           key={pos.number}
//                                           placement="top"
//                                           overlay={renderPositionTooltip(pos)}
//                                           delay={{ show: 250, hide: 100 }}
//                                         >
//                                           <div
//                                             className={planetClass}
//                                             style={{
//                                               left: coords.x,
//                                               top: coords.y,
//                                               width: planetSize,
//                                               height: planetSize,
//                                               transform: 'translate(-50%, -50%)',
//                                               '--index': index
//                                             }}
//                                             onClick={() => handlePositionClick(pos)}
//                                             onMouseEnter={() => {
//                                               setHoveredPosition(pos)
//                                               if (pos.parentPosition) handleStructuralPreview(pos)
//                                             }}
//                                             onMouseLeave={() => setHoveredPosition(null)}
//                                           >
//                                             <div className="planet-content">
//                                               <span className="node-number">{pos.number}</span>

//                                               {pos.occupant && (
//                                                 <span className="planet-icon">
//                                                   {pos.occupantType === 'mine' ? '👤' : pos.occupantType === 'downline' ? '⬇️' : '👥'}
//                                                 </span>
//                                               )}

//                                               {pos.positionInfo.payout > 0 && pos.occupantType !== 'mine' && (
//                                                 <span className="planet-earn-badge">
//                                                   {pos.positionInfo.payout}%
//                                                 </span>
//                                               )}
//                                             </div>
//                                           </div>
//                                         </OverlayTrigger>
//                                       )
//                                     })
//                                   })}

//                                   {data.spilloverFromPositions.map((conn, idx) => {
//                                     const fromPos = allPositionMap[conn.from]
//                                     const toPos = allPositionMap[conn.to]

//                                     if (!fromPos || !toPos || !fromPos.occupant) return null

//                                     const fromLine = fromPos.line
//                                     const toLine = toPos.line
//                                     const fromIndex = structure.positions[fromLine].indexOf(fromPos.number)
//                                     const toIndex = structure.positions[toLine].indexOf(toPos.number)

//                                     if (fromIndex < 0 || toIndex < 0) return null

//                                     const fromCoords = (() => {
//                                       const customAngle = structure.customAngles?.[fromLine]?.[fromPos.number]
//                                       if (typeof customAngle === 'number') {
//                                         return getPositionOnAngle(customAngle, ringRadiiPx[fromLine], centerX, centerY)
//                                       }
//                                       return getPositionOnRing(
//                                         fromIndex,
//                                         structure.counts[fromLine],
//                                         ringRadiiPx[fromLine],
//                                         centerX,
//                                         centerY,
//                                         structure.startAngles[fromLine]
//                                       )
//                                     })()

//                                     const toCoords = (() => {
//                                       const customAngle = structure.customAngles?.[toLine]?.[toPos.number]
//                                       if (typeof customAngle === 'number') {
//                                         return getPositionOnAngle(customAngle, ringRadiiPx[toLine], centerX, centerY)
//                                       }
//                                       return getPositionOnRing(
//                                         toIndex,
//                                         structure.counts[toLine],
//                                         ringRadiiPx[toLine],
//                                         centerX,
//                                         centerY,
//                                         structure.startAngles[toLine]
//                                       )
//                                     })()

//                                     const dx = toCoords.x - fromCoords.x
//                                     const dy = toCoords.y - fromCoords.y
//                                     const distance = Math.sqrt(dx * dx + dy * dy)
//                                     const angle = Math.atan2(dy, dx) * 180 / Math.PI

//                                     return (
//                                       <div key={`conn-${idx}`}>
//                                         <div
//                                           className="structural-connection"
//                                           style={{
//                                             width: distance,
//                                             left: fromCoords.x,
//                                             top: fromCoords.y,
//                                             transform: `rotate(${angle}deg)`
//                                           }}
//                                         />
//                                       </div>
//                                     )
//                                   })}
//                                 </>
//                               </div>
//                             )
//                           })()}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </Col>

//                 <Col lg={4}>
//                   <div className="lab-card energy-cell h-100">
//                     <div className="orbit-header">{t('orbits.escrowAutoUpgrade')}</div>
//                     <div className="p-4 pulse-overlay">
//                       <div className="small fw-bold text-muted text-uppercase mb-2">
//                         {t('orbits.lockedForLevel', { level: levelInfo.nextLevel })}
//                       </div>

//                       <h3 className="fw-black mb-3" style={{ color: '#002366', fontFamily: 'monospace' }}>
//                         {userLocks[level] || '0'} <span className="small text-muted">/ {levelInfo.upgradeReq} USDT</span>
//                       </h3>

//                       <ProgressBar
//                         now={((parseFloat(userLocks[level] || '0') / levelInfo.upgradeReq) * 100) || 0}
//                         variant="primary"
//                         className="mb-3"
//                       />

//                       <div className="p-3 bg-light rounded-3 small fw-bold text-center">
//                         {!isLevelActive ? (
//                           <span className="text-secondary">{t('orbits.levelInactiveForAddress', { level })}</span>
//                         ) : parseFloat(userLocks[level] || '0') >= levelInfo.upgradeReq ? (
//                           autoUpgradeCompleted ? (
//                             <span className="text-success">{t('orbits.levelAlreadyActivated', { level: levelInfo.nextLevel })}</span>
//                           ) : (
//                             <span className="text-success">{t('orbits.autoUpgradeReady', { level: levelInfo.nextLevel })}</span>
//                           )
//                         ) : (
//                           t('orbits.needMoreUsdt', {
//                             amount: (levelInfo.upgradeReq - parseFloat(userLocks[level] || '0')).toFixed(1)
//                           })
//                         )}
//                       </div>

//                       <hr className="my-4" />

//                       <div className="small fw-bold text-muted text-uppercase mb-2">Total Earned From This Level</div>
//                       <h4 className="fw-bold" style={{ color: '#28a745' }}>{data.totalEarned} USDT</h4>
//                       <div className="earned-caption">
//                         Includes every amount credited to this orbit owner at this level from eligible direct placements, spillover receipts, and recycle-related receipts tracked in the contract total.
//                       </div>

//                       {viewMode === 'downline' && (
//                         <>
//                           {downlineAtLevel.length > 0 && (
//                             <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-3">
//                               <h6 className="fw-bold mb-2">{t('orbits.directDownlineAtLevel', { level })}</h6>
//                               <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
//                                 {downlineAtLevel.map((d, idx) => (
//                                   <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
//                                     <div>
//                                       <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
//                                         {d.user.slice(0, 8)}...{d.user.slice(-6)}
//                                       </span>
//                                       <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
//                                       <small className="text-muted d-block">{t('orbits.amountShort', { amount: d.amount })}</small>
//                                     </div>
//                                     <Badge bg={d.positionInfo.toUpline ? 'success' : 'secondary'}>
//                                       {d.positionInfo.toUpline ? '💰' : '🔒'}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           )}

//                           {spilloverAtLevel.length > 0 && (
//                             <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-3">
//                               <h6 className="fw-bold mb-2">{t('orbits.otherParticipantsAtLevel', { level })}</h6>
//                               <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
//                                 {spilloverAtLevel.map((d, idx) => (
//                                   <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
//                                     <div>
//                                       <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
//                                         {d.user.slice(0, 8)}...{d.user.slice(-6)}
//                                       </span>
//                                       <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
//                                       <small className="text-muted d-block">From: {d.originalReferrer?.slice(0, 6)}...</small>
//                                     </div>
//                                     <Badge bg="info">
//                                       {t('orbits.routedByRule')}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           )}

//                           {downlineAtLevel.length === 0 && spilloverAtLevel.length === 0 && (
//                             <div className="mt-4 p-3 bg-light rounded-3 text-center text-muted small">
//                               {t('orbits.noDownlineYet')}
//                             </div>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </Col>
//               </Row>
//             </Tab>
//           )
//         })}
//       </Tabs>
//     </Container>
//   )
// }














// // //THIS IS THE LAST CODE YOU ARE USING AND IT IS STABLE JUST THE ORBIT STRUCTURE
// import React, { useState, useEffect, useRef, useCallback } from 'react'
// import { Container, Row, Col, Tabs, Tab, Alert, Spinner, ProgressBar, Button, Badge, Modal, OverlayTrigger, Tooltip, Form } from 'react-bootstrap'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'
// import { ethers } from 'ethers'
// import { useTranslation } from 'react-i18next'

// export const Orbits = () => {
//   console.log('Debug: This is the new file')

//   const { isConnected, account } = useWallet()
//   const { contracts, isLoading, error, loadContracts } = useContracts()
//   const { t } = useTranslation()

//   const [orbitData, setOrbitData] = useState({})
//   const [userLocks, setUserLocks] = useState({})
//   const [downlineData, setDownlineData] = useState({})
//   const [spilloverData, setSpilloverData] = useState({})
//   const [orbitError, setOrbitError] = useState('')
//   const [viewMode, setViewMode] = useState('global')
//   const [selectedPosition, setSelectedPosition] = useState(null)
//   const [showPositionModal, setShowPositionModal] = useState(false)
//   const [hoveredPosition, setHoveredPosition] = useState(null)
//   const [showStructuralPreview, setShowStructuralPreview] = useState(false)
//   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
//   const [viewAddress, setViewAddress] = useState('')
//   const [inputAddress, setInputAddress] = useState('')
//   const [viewedLevels, setViewedLevels] = useState({})

//   const galaxyRef = useRef(null)
//   const referrerCacheRef = useRef(new Map())
//   const viewedLevelsCacheRef = useRef(new Map())
//   const fetchIdRef = useRef(0)

//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [isRefreshing, setIsRefreshing] = useState(false)
//   const [activeTab, setActiveTab] = useState('level1')
//   const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)

//   const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

//   const chunkArray = (arr, size) => {
//     const chunks = []
//     for (let i = 0; i < arr.length; i += size) {
//       chunks.push(arr.slice(i, i + size))
//     }
//     return chunks
//   }

//   const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
//     try {
//       return await fn()
//     } catch (err) {
//       const code = err?.code || err?.info?.error?.code
//       const msg = String(err?.message || '')
//       const isRateLimited =
//         code === -32005 ||
//         err?.status === 429 ||
//         msg.includes('rate limited') ||
//         msg.includes('429')

//       if (!isRateLimited || retries <= 0) {
//         throw err
//       }

//       await delay(wait)
//       return withRetry(fn, retries - 1, wait * 2)
//     }
//   }, [])

//   const getCachedReferrer = useCallback(async (address) => {
//     const key = address.toLowerCase()
//     if (referrerCacheRef.current.has(key)) {
//       return referrerCacheRef.current.get(key)
//     }

//     const referrer = await withRetry(() => contracts.registration.getReferrer(address))
//     referrerCacheRef.current.set(key, referrer)
//     return referrer
//   }, [contracts, withRetry])

//   useEffect(() => {
//     if (account && !viewAddress) {
//       setViewAddress(account)
//       setInputAddress(account)
//     }
//   }, [account, viewAddress])

//   useEffect(() => {
//     const updateSize = () => {
//       if (galaxyRef.current) {
//         const { width, height } = galaxyRef.current.getBoundingClientRect()
//         if (width > 0 && height > 0 && (width !== containerSize.width || height !== containerSize.height)) {
//           setContainerSize({ width, height })
//         }
//       }
//     }

//     const timer = setTimeout(updateSize, 120)
//     window.addEventListener('resize', updateSize)

//     let resizeObserver
//     if (window.ResizeObserver) {
//       resizeObserver = new ResizeObserver(updateSize)
//       if (galaxyRef.current) {
//         resizeObserver.observe(galaxyRef.current)
//       }
//     }

//     return () => {
//       window.removeEventListener('resize', updateSize)
//       if (resizeObserver) resizeObserver.disconnect()
//       clearTimeout(timer)
//     }
//   }, [activeTab, orbitData, containerSize.width, containerSize.height])

//   useEffect(() => {
//     if (Object.keys(orbitData).length > 0 && galaxyRef.current) {
//       const { width, height } = galaxyRef.current.getBoundingClientRect()
//       if (width > 0 && height > 0) {
//         setContainerSize({ width, height })
//       }
//     }
//   }, [orbitData, activeTab])

//   const orbitStyles = `
//     @keyframes pulse-line {
//       0% { background-position: 0% 50%; }
//       100% { background-position: 200% 50%; }
//     }
//     @keyframes orbit-glow {
//       0%, 100% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.08), 0 0 12px rgba(0, 68, 204, 0.08) inset; }
//       50% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.15), 0 0 20px rgba(0, 68, 204, 0.12) inset; }
//     }
//     @keyframes structural-pulse {
//       0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.75); }
//       70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
//       100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
//     }
//     @keyframes rotate-slow {
//       from { transform: translate(-50%, -50%) rotate(0deg); }
//       to { transform: translate(-50%, -50%) rotate(360deg); }
//     }
//     @keyframes rotate-reverse {
//       from { transform: translate(-50%, -50%) rotate(360deg); }
//       to { transform: translate(-50%, -50%) rotate(0deg); }
//     }
//     @keyframes float {
//       0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
//       50% { transform: translate(-50%, -50%) translateY(-4px); }
//     }
//     @keyframes core-pulse {
//       0%, 100% { box-shadow: 0 0 28px rgba(0,35,102,0.35), 0 0 60px rgba(0,68,204,0.12); }
//       50% { box-shadow: 0 0 36px rgba(0,35,102,0.45), 0 0 75px rgba(0,68,204,0.18); }
//     }
//     @keyframes core-pulse-inactive {
//       0%, 100% { box-shadow: 0 0 18px rgba(108,117,125,0.18), 0 0 36px rgba(108,117,125,0.08); }
//       50% { box-shadow: 0 0 24px rgba(108,117,125,0.22), 0 0 48px rgba(108,117,125,0.12); }
//     }
//     @keyframes twinkle {
//       0%, 100% { opacity: 0.18; transform: scale(1); }
//       50% { opacity: 0.95; transform: scale(1.55); }
//     }
//     @keyframes drift {
//       0% { transform: translateY(0px) translateX(0px); }
//       50% { transform: translateY(-3px) translateX(2px); }
//       100% { transform: translateY(0px) translateX(0px); }
//     }
//     @keyframes glow-border {
//       0%, 100% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 18px 50px rgba(0,35,102,0.05); }
//       50% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 22px 60px rgba(0,35,102,0.08); }
//     }
//     .lab-card {
//       background: rgba(255, 255, 255, 0.82);
//       border: 1px solid rgba(255, 255, 255, 0.45);
//       border-radius: 24px;
//       box-shadow: 0 14px 40px rgba(0, 35, 102, 0.06);
//       overflow: hidden;
//       backdrop-filter: blur(14px);
//       -webkit-backdrop-filter: blur(14px);
//     }
//     .orbit-header {
//       background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
//       color: white;
//       font-family: 'monospace';
//       font-size: 0.85rem;
//       padding: 10px 20px;
//       text-transform: uppercase;
//       letter-spacing: 2px;
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       box-shadow: inset 0 -1px 0 rgba(255,255,255,0.08);
//     }
//     .cycle-badge {
//       background: linear-gradient(135deg, #ffd54f 0%, #ffc107 100%);
//       color: #002366;
//       font-weight: bold;
//       padding: 2px 8px;
//       border-radius: 12px;
//       font-size: 0.7rem;
//       box-shadow: 0 4px 10px rgba(255,193,7,0.25);
//     }
//     .galaxy-container {
//       position: relative;
//       width: 100%;
//       aspect-ratio: 1 / 1;
//       max-width: 660px;
//       margin: 20px auto;
//       min-height: 320px;
//       border-radius: 34px;
//       overflow: hidden;
//       background:
//         radial-gradient(circle at 50% 50%, rgba(27, 75, 196, 0.08) 0%, rgba(5, 22, 62, 0.06) 28%, rgba(2, 10, 33, 0.94) 74%, rgba(0, 7, 24, 0.98) 100%);
//       border: 1px solid rgba(255,255,255,0.08);
//       box-shadow:
//         inset 0 0 80px rgba(0, 119, 255, 0.06),
//         inset 0 0 24px rgba(255,255,255,0.03),
//         0 24px 60px rgba(0,35,102,0.12);
//       animation: glow-border 6s ease-in-out infinite;
//     }
//     .galaxy-container::before {
//       content: '';
//       position: absolute;
//       inset: 0;
//       background:
//         radial-gradient(circle at 20% 18%, rgba(0, 174, 255, 0.10), transparent 16%),
//         radial-gradient(circle at 82% 24%, rgba(132, 94, 255, 0.08), transparent 18%),
//         radial-gradient(circle at 52% 80%, rgba(255, 193, 7, 0.06), transparent 20%);
//       pointer-events: none;
//       z-index: 0;
//     }
//     .galaxy-grid {
//       position: absolute;
//       inset: 0;
//       border-radius: 34px;
//       pointer-events: none;
//       background-image:
//         linear-gradient(rgba(82, 145, 255, 0.045) 1px, transparent 1px),
//         linear-gradient(90deg, rgba(82, 145, 255, 0.045) 1px, transparent 1px);
//       background-size: 28px 28px;
//       mask-image: radial-gradient(circle at center, black 0%, rgba(0,0,0,0.82) 56%, transparent 90%);
//       opacity: 0.35;
//       z-index: 1;
//     }
//     .star-field {
//       position: absolute;
//       inset: 0;
//       pointer-events: none;
//       z-index: 1;
//     }
//     .star {
//       position: absolute;
//       border-radius: 50%;
//       background: rgba(255,255,255,0.95);
//       box-shadow: 0 0 6px rgba(255,255,255,0.4);
//       animation: twinkle 3.2s ease-in-out infinite, drift 8s ease-in-out infinite;
//     }
//     .galaxy-inner {
//       position: absolute;
//       inset: 0;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       z-index: 2;
//     }
//     .galaxy-stage {
//       position: absolute;
//       inset: 7%;
//       border-radius: 50%;
//     }
//     .orbit-ring {
//       position: absolute;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       border-radius: 50%;
//       pointer-events: none;
//       transition: all 0.3s ease;
//       animation: orbit-glow 4.2s ease-in-out infinite;
//       background: radial-gradient(circle at center, transparent 96%, rgba(255,255,255,0.22) 100%);
//       overflow: visible;
//     }
//     .orbit-ring::before {
//       content: '';
//       position: absolute;
//       inset: -10px;
//       border-radius: 50%;
//       border: 1px solid rgba(255,255,255,0.03);
//       pointer-events: none;
//     }
//     .orbit-ring.line1 {
//       border: 2px solid rgba(89, 150, 255, 0.36);
//       animation: orbit-glow 4.2s ease-in-out infinite, rotate-slow 30s linear infinite;
//     }
//     .orbit-ring.line2 {
//       border: 2px dashed rgba(89, 150, 255, 0.26);
//       animation: orbit-glow 5.2s ease-in-out infinite, rotate-reverse 48s linear infinite;
//     }
//     .orbit-ring.line3 {
//       border: 2px dotted rgba(89, 150, 255, 0.20);
//       animation: orbit-glow 6.2s ease-in-out infinite, rotate-slow 75s linear infinite;
//     }
//     .ring-label {
//       position: absolute;
//       top: -14px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: rgba(255,255,255,0.12);
//       color: #dce9ff;
//       padding: 5px 13px;
//       border-radius: 999px;
//       font-size: 0.66rem;
//       font-weight: 700;
//       text-transform: uppercase;
//       letter-spacing: 1.3px;
//       white-space: nowrap;
//       pointer-events: none;
//       backdrop-filter: blur(10px);
//       border: 1px solid rgba(255,255,255,0.10);
//       box-shadow: 0 10px 24px rgba(0,0,0,0.18);
//     }
//     .ring-stats {
//       position: absolute;
//       bottom: -14px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: rgba(255,255,255,0.10);
//       color: #bfd4ff;
//       padding: 5px 12px;
//       border-radius: 999px;
//       font-size: 0.62rem;
//       font-weight: 700;
//       white-space: nowrap;
//       pointer-events: none;
//       box-shadow: 0 10px 24px rgba(0,0,0,0.16);
//       border: 1px solid rgba(255,255,255,0.08);
//       backdrop-filter: blur(10px);
//     }
//     .planet-node {
//       position: absolute;
//       width: 44px;
//       height: 44px;
//       border-radius: 50%;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       cursor: pointer;
//       transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.28s ease, filter 0.28s ease, border-color 0.28s ease;
//       z-index: 10;
//       box-shadow: 0 8px 20px rgba(0,0,0,0.28);
//       border: 2px solid rgba(255,255,255,0.90);
//       animation: float 4s ease-in-out infinite;
//       animation-delay: calc(var(--index) * 0.12s);
//       will-change: transform;
//       backdrop-filter: blur(8px);
//       -webkit-backdrop-filter: blur(8px);
//     }
//     .planet-node:hover {
//       transform: translate(-50%, -50%) scale(1.18);
//       z-index: 100;
//       box-shadow: 0 14px 32px rgba(0,0,0,0.30), 0 0 20px rgba(92, 154, 255, 0.14);
//       filter: saturate(1.08) brightness(1.04);
//       animation: none;
//       border-color: rgba(255,255,255,1);
//     }
//     @media (max-width: 768px) {
//       .planet-node {
//         width: 36px;
//         height: 36px;
//       }
//       .galaxy-container.p39 .planet-node {
//         width: 28px;
//         height: 28px;
//       }
//     }
//     @media (max-width: 480px) {
//       .planet-node {
//         width: 30px;
//         height: 30px;
//       }
//       .galaxy-container.p39 .planet-node {
//         width: 24px;
//         height: 24px;
//       }
//       .ring-label,
//       .ring-stats {
//         font-size: 0.56rem;
//         padding: 3px 8px;
//       }
//     }
//     .galaxy-container.p39 .planet-node {
//       width: 38px;
//       height: 38px;
//     }
//     .galaxy-container.p39 .node-number {
//       font-size: 14px;
//     }
//     .planet-my-position {
//       background: linear-gradient(135deg, rgba(40, 167, 69, 0.95) 0%, rgba(32, 201, 151, 0.95) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(40, 167, 69, 0.46), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-downline {
//       background: linear-gradient(135deg, rgba(255, 193, 7, 0.96) 0%, rgba(253, 126, 20, 0.96) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(255, 193, 7, 0.26), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-other {
//       background: linear-gradient(135deg, rgba(0, 102, 204, 0.96) 0%, rgba(0, 153, 255, 0.96) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(0, 102, 204, 0.22), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-empty {
//       background: rgba(255, 255, 255, 0.92);
//       color: #dc3545;
//       border: 2px solid rgba(255, 107, 107, 0.95) !important;
//       box-shadow: 0 8px 20px rgba(220, 53, 69, 0.10), 0 10px 24px rgba(0,0,0,0.16);
//     }
//     .planet-structural-preview {
//       background: linear-gradient(135deg, #ffca28 0%, #ffb300 100%);
//       color: #002366;
//       animation: structural-pulse 2s infinite !important;
//       z-index: 50;
//     }
//     .planet-content {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       width: 100%;
//       height: 100%;
//       position: relative;
//     }
//     .node-number {
//       font-size: 16px;
//       font-weight: 800;
//       text-shadow: 0 1px 2px rgba(0,0,0,0.22);
//       line-height: 1;
//     }
//     .planet-icon {
//       position: absolute;
//       top: -4px;
//       right: -4px;
//       background: linear-gradient(135deg, #ffe082 0%, #ffc107 100%);
//       color: #002366;
//       border-radius: 50%;
//       width: 18px;
//       height: 18px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-size: 10px;
//       font-weight: bold;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.22);
//       border: 1px solid white;
//     }
//     .planet-earn-badge {
//       position: absolute;
//       top: -8px;
//       left: -8px;
//       background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
//       color: white;
//       border-radius: 12px;
//       padding: 2px 6px;
//       font-size: 9px;
//       font-weight: bold;
//       white-space: nowrap;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.20);
//       border: 1px solid white;
//     }
//     .structural-connection {
//       position: absolute;
//       background: linear-gradient(90deg, rgba(255, 215, 64, 0.98), rgba(255, 179, 0, 0.98));
//       height: 3px;
//       transform-origin: 0 0;
//       z-index: 5;
//       pointer-events: none;
//       box-shadow: 0 0 12px rgba(255, 193, 7, 0.65);
//       border-radius: 999px;
//     }
//     .connection-label {
//       position: absolute;
//       background: rgba(255, 215, 64, 0.98);
//       color: #002366;
//       padding: 2px 6px;
//       border-radius: 10px;
//       font-size: 8px;
//       font-weight: bold;
//       transform: translate(-50%, -50%);
//       white-space: nowrap;
//       z-index: 6;
//       border: 1px solid white;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.18);
//     }
//     .orbit-core {
//       position: absolute;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       width: 96px;
//       height: 96px;
//       background: radial-gradient(circle at 30% 30%, rgba(40, 129, 255, 1), rgba(0, 35, 102, 1));
//       border-radius: 50%;
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       color: white;
//       font-weight: bold;
//       box-shadow: 0 0 40px rgba(0,35,102,0.35);
//       border: 3px solid rgba(255,255,255,0.95);
//       z-index: 20;
//       animation: core-pulse 3.2s ease-in-out infinite;
//       backdrop-filter: blur(12px);
//     }
//     .orbit-core-inactive {
//       background: radial-gradient(circle at 30% 30%, rgba(173, 181, 189, 0.96), rgba(73, 80, 87, 0.96));
//       color: #f8f9fa;
//       box-shadow: 0 0 24px rgba(108,117,125,0.24);
//       border: 3px solid rgba(255,255,255,0.75);
//       animation: core-pulse-inactive 3.2s ease-in-out infinite;
//     }
//     .orbit-core::before {
//       content: '';
//       position: absolute;
//       inset: -7px;
//       border-radius: 50%;
//       border: 1px solid rgba(255,255,255,0.10);
//       box-shadow: 0 0 18px rgba(0, 119, 255, 0.20);
//       pointer-events: none;
//     }
//     .orbit-core-inactive::before {
//       box-shadow: 0 0 12px rgba(108,117,125,0.18);
//     }
//     @media (max-width: 768px) {
//       .orbit-core {
//         width: 74px;
//         height: 74px;
//       }
//     }
//     .galaxy-container.p39 .orbit-core {
//       width: 82px;
//       height: 82px;
//     }
//     @media (max-width: 768px) {
//       .galaxy-container.p39 .orbit-core {
//         width: 66px;
//         height: 66px;
//       }
//     }
//     .core-label {
//       font-size: 10px;
//       text-transform: uppercase;
//       opacity: 0.88;
//       letter-spacing: 1.2px;
//     }
//     .core-value {
//       font-size: 16px;
//       font-weight: 800;
//       text-shadow: 0 2px 4px rgba(0,0,0,0.30);
//       text-align: center;
//       line-height: 1.1;
//     }
//     .color-legend {
//       display: flex;
//       gap: 20px;
//       margin-bottom: 20px;
//       padding: 15px;
//       background: rgba(248, 249, 250, 0.82);
//       border-radius: 16px;
//       flex-wrap: wrap;
//       justify-content: center;
//       border: 1px solid rgba(0,35,102,0.06);
//       backdrop-filter: blur(8px);
//     }
//     .legend-item {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       font-size: 0.85rem;
//     }
//     .legend-color {
//       width: 20px;
//       height: 20px;
//       border-radius: 50%;
//       box-shadow: 0 6px 14px rgba(0,0,0,0.10);
//     }
//     .legend-color.green { background: #28a745; }
//     .legend-color.orange { background: #fd7e14; }
//     .legend-color.blue { background: #0066cc; }
//     .legend-color.gold { background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%); }
//     .legend-color.red {
//       background: white;
//       border: 2px solid #dc3545;
//     }
//     .legend-color.gray {
//       background: linear-gradient(135deg, #adb5bd 0%, #495057 100%);
//     }
//     .energy-cell .progress {
//       height: 12px;
//       background: rgba(240, 244, 248, 0.8);
//       border-radius: 10px;
//       overflow: hidden;
//       border: 1px solid rgba(0,0,0,0.04);
//       backdrop-filter: blur(6px);
//     }
//     .pulse-overlay {
//       background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.02) 45%, rgba(0, 68, 204, 0.08) 50%, rgba(0, 35, 102, 0.02) 55%, transparent 100%);
//       background-size: 200% 100%;
//       animation: pulse-line 5s linear infinite;
//     }
//     .nav-tabs .nav-link {
//       border: none;
//       color: #666;
//       font-weight: 700;
//       text-transform: uppercase;
//       font-size: 0.8rem;
//       letter-spacing: 1px;
//       padding: 15px 25px;
//     }
//     .nav-tabs .nav-link.active {
//       color: #002366;
//       border-bottom: 3px solid #002366;
//       background: transparent;
//     }
//     .refresh-button {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white;
//       border: none;
//       border-radius: 10px;
//       padding: 6px 16px;
//       font-size: 0.8rem;
//       cursor: pointer;
//       transition: all 0.3s ease;
//       box-shadow: 0 10px 20px rgba(0,68,204,0.16);
//     }
//     .refresh-button:hover {
//       background: linear-gradient(135deg, #003085 0%, #0055ff 100%);
//       transform: translateY(-1px);
//       color: white;
//     }
//     .view-toggle {
//       display: flex;
//       gap: 10px;
//       margin-left: 20px;
//       flex-wrap: wrap;
//     }
//     .view-toggle .btn {
//       border-radius: 999px;
//       padding: 6px 16px;
//       font-size: 0.8rem;
//       box-shadow: 0 8px 18px rgba(0,0,0,0.04);
//     }
//     .view-toggle .btn.active {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white;
//       border-color: #002366;
//       box-shadow: 0 10px 22px rgba(0,68,204,0.18);
//     }
//     .position-modal .modal-content {
//       border-radius: 24px;
//       border: none;
//       box-shadow: 0 24px 50px rgba(0,0,0,0.20);
//       backdrop-filter: blur(12px);
//       overflow: hidden;
//     }
//     .position-modal .modal-header {
//       background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
//       color: white;
//       border-bottom: none;
//       padding: 20px;
//     }
//     .position-modal .modal-body {
//       padding: 25px;
//       background: rgba(255,255,255,0.96);
//     }
//     .info-row {
//       display: flex;
//       justify-content: space-between;
//       padding: 12px 0;
//       border-bottom: 1px solid #f0f0f0;
//       gap: 16px;
//     }
//     .info-label {
//       font-weight: 600;
//       color: #666;
//     }
//     .info-value {
//       font-family: monospace;
//       font-weight: 700;
//       color: #002366;
//       text-align: right;
//     }
//     .commission-breakdown {
//       background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(244,247,252,0.95) 100%);
//       border-radius: 16px;
//       padding: 15px;
//       margin: 15px 0;
//       border: 1px solid rgba(0,35,102,0.05);
//     }
//     .commission-item {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       gap: 12px;
//       padding: 8px 0;
//       border-bottom: 1px solid rgba(0,0,0,0.05);
//       font-size: 0.9rem;
//     }
//     .commission-item:last-child {
//       border-bottom: none;
//     }
//     .commission-amount {
//       font-weight: 700;
//       color: #002366;
//     }
//     .commission-amount.payout {
//       color: #28a745;
//     }
//     .commission-amount.escrow {
//       color: #0dcaf0;
//     }
//     .hover-tooltip {
//       background: #002366 !important;
//       color: white !important;
//       font-size: 0.75rem !important;
//       padding: 8px 12px !important;
//       border-radius: 10px !important;
//       opacity: 1 !important;
//     }
//     .earned-caption {
//       font-size: 0.78rem;
//       color: #6c757d;
//       line-height: 1.4;
//       margin-top: 6px;
//     }
//     @media (max-width: 768px) {
//       .d-flex.align-items-center.justify-content-between {
//         flex-direction: column;
//         gap: 15px;
//       }
//       .view-toggle {
//         margin-left: 0;
//       }
//     }
//   `

//   const orbitTypeConfig = {
//     P4: {
//       name: 'P4',
//       contract: 'p4Orbit',
//       positions: 4,
//       lines: 1,
//       lineSizes: [4],
//       linePayouts: ['Owner / escrow / recycle by position'],
//       lineSpillovers: ['No structural child line'],
//       levels: [1, 4, 7, 10],
//       description: 'Single-line orbit'
//     },
//     P12: {
//       name: 'P12',
//       contract: 'p12Orbit',
//       positions: 12,
//       lines: 2,
//       lineSizes: [3, 9],
//       linePayouts: ['40% owner', '50% owner or 50% escrow'],
//       lineSpillovers: ['50% eligible upline', '40% structural parent'],
//       levels: [2, 5, 8],
//       description: 'Two-line orbit'
//     },
//     P39: {
//       name: 'P39',
//       contract: 'p39Orbit',
//       positions: 39,
//       lines: 3,
//       lineSizes: [3, 9, 27],
//       linePayouts: ['20% owner or 20% escrow', '20% owner or 20% escrow', '50% owner or 50% escrow'],
//       lineSpillovers: ['20% eligible upline + 50% next eligible upline', '20% structural parent + 50% orbit owner', '20% structural parent + 20% structural grandparent'],
//       levels: [3, 6, 9],
//       description: 'Three-line orbit'
//     }
//   }

//   const levelToOrbitType = {
//     1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
//     6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
//   }

//   const levelConfig = {
//     1: { price: 10, upgradeReq: 20, nextLevel: 2 },
//     2: { price: 20, upgradeReq: 40, nextLevel: 3 },
//     3: { price: 40, upgradeReq: 80, nextLevel: 4 },
//     4: { price: 80, upgradeReq: 160, nextLevel: 5 },
//     5: { price: 160, upgradeReq: 320, nextLevel: 6 },
//     6: { price: 320, upgradeReq: 640, nextLevel: 7 },
//     7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
//     8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
//     9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
//     10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
//   }

//   const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
//     const angle = (index / total) * 360 + startAngle
//     const radian = (angle * Math.PI) / 180
//     return {
//       x: centerX + radiusPx * Math.cos(radian),
//       y: centerY + radiusPx * Math.sin(radian),
//       angle
//     }
//   }

//   const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
//     const radian = (angle * Math.PI) / 180
//     return {
//       x: centerX + radiusPx * Math.cos(radian),
//       y: centerY + radiusPx * Math.sin(radian),
//       angle
//     }
//   }

//   const getPlanetSize = (orbitType, stageSize) => {
//     const base = orbitType === 'P39' ? 38 : 44
//     if (stageSize <= 260) return orbitType === 'P39' ? 24 : 30
//     if (stageSize <= 420) return orbitType === 'P39' ? 28 : 36
//     return base
//   }

//   const getCoreSize = (orbitType, stageSize) => {
//     if (stageSize <= 260) return orbitType === 'P39' ? 66 : 74
//     if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
//     return orbitType === 'P39' ? 82 : 96
//   }

//   const getStructuralParentPosition = (orbitType, position) => {
//     if (orbitType === 'P4') {
//       return null
//     }

//     if (orbitType === 'P12') {
//       if (position === 4 || position === 7 || position === 10) return 1
//       if (position === 5 || position === 8 || position === 11) return 2
//       if (position === 6 || position === 9 || position === 12) return 3
//       return null
//     }

//     if (orbitType === 'P39') {
//       if (position === 4 || position === 7 || position === 10) return 1
//       if (position === 5 || position === 8 || position === 11) return 2
//       if (position === 6 || position === 9 || position === 12) return 3
//       if (position === 13 || position === 22 || position === 31) return 4
//       if (position === 14 || position === 23 || position === 32) return 5
//       if (position === 15 || position === 24 || position === 33) return 6
//       if (position === 16 || position === 25 || position === 34) return 7
//       if (position === 17 || position === 26 || position === 35) return 8
//       if (position === 18 || position === 27 || position === 36) return 9
//       if (position === 19 || position === 28 || position === 37) return 10
//       if (position === 20 || position === 29 || position === 38) return 11
//       if (position === 21 || position === 30 || position === 39) return 12
//       return null
//     }

//     return null
//   }

//   const getOrbitStructure = (orbitType) => {
//     return {
//       P4: {
//         lines: [1],
//         counts: { 1: 4 },
//         positions: { 1: [1, 2, 3, 4] },
//         startAngles: { 1: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 0, 3: 90, 4: 180 }
//         }
//       },
//       P12: {
//         lines: [1, 2],
//         counts: { 1: 3, 2: 9 },
//         positions: {
//           1: [1, 2, 3],
//           2: [4, 5, 6, 7, 8, 9, 10, 11, 12]
//         },
//         startAngles: { 1: -90, 2: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: {
//             4: -138, 7: -102, 10: -66,
//             5: -18, 8: 18, 11: 54,
//             6: 102, 9: 138, 12: 174
//           }
//         }
//       },
//       P39: {
//         lines: [1, 2, 3],
//         counts: { 1: 3, 2: 9, 3: 27 },
//         positions: {
//           1: [1, 2, 3],
//           2: [4, 5, 6, 7, 8, 9, 10, 11, 12],
//           3: Array.from({ length: 27 }, (_, i) => i + 13)
//         },
//         startAngles: { 1: -90, 2: -90, 3: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: {
//             4: -138, 7: -102, 10: -66,
//             5: -18, 8: 18, 11: 54,
//             6: 102, 9: 138, 12: 174
//           },
//           3: {
//             13: -148, 22: -126, 31: -104,
//             14: -28, 23: -6, 32: 16,
//             15: 92, 24: 114, 33: 136,
//             16: -118, 25: -96, 34: -74,
//             17: 2, 26: 24, 35: 46,
//             18: 122, 27: 144, 36: 166,
//             19: -88, 28: -66, 37: -44,
//             20: 32, 29: 54, 38: 76,
//             21: 152, 30: 174, 39: 196
//           }
//         }
//       }
//     }[orbitType] || {
//       lines: [1],
//       counts: { 1: 4 },
//       positions: { 1: [1, 2, 3, 4] },
//       startAngles: { 1: -90 },
//       customAngles: {
//         1: { 1: -90, 2: 0, 3: 90, 4: 180 }
//       }
//     }
//   }

//   const getStarConfig = (count = 36) => {
//     return Array.from({ length: count }, (_, i) => ({
//       id: i,
//       left: `${((i * 17.73) % 100).toFixed(2)}%`,
//       top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
//       size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
//       delay: `${(i * 0.27).toFixed(2)}s`,
//       duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
//       drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
//       opacity: i % 4 === 0 ? 0.65 : 0.35
//     }))
//   }

//   const starConfig = getStarConfig(40)

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const fetchViewedLevels = useCallback(async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

//     const key = viewAddress.toLowerCase()
//     if (viewedLevelsCacheRef.current.has(key)) {
//       setViewedLevels(viewedLevelsCacheRef.current.get(key))
//       return
//     }

//     try {
//       const levels = {}
//       for (let i = 1; i <= 10; i++) {
//         try {
//           levels[i] = await withRetry(() => contracts.registration.isLevelActivated(viewAddress, i))
//         } catch {
//           levels[i] = false
//         }
//       }

//       viewedLevelsCacheRef.current.set(key, levels)
//       setViewedLevels(levels)
//     } catch (err) {
//       console.error('Error fetching viewed levels:', err)
//     }
//   }, [contracts, viewAddress, withRetry])

//   const applyViewerAddress = async () => {
//     if (!inputAddress || !ethers.isAddress(inputAddress)) {
//       setOrbitError(t('orbits.enterValidAddress'))
//       return
//     }

//     setOrbitError('')
//     const normalized = ethers.getAddress(inputAddress)
//     setInputAddress(normalized)
//     setViewAddress(normalized)
//     setViewMode('global')
//   }

//   const viewMyOrbit = () => {
//     if (!account) return
//     setOrbitError('')
//     setInputAddress(account)
//     setViewAddress(account)
//     setViewMode('global')
//   }

//   const getPositionInfo = (orbitType, position, level, autoUpgradeCompleted = false) => {
//     const parentPosition = getStructuralParentPosition(orbitType, position)

//     const info = {
//       type: 'unknown',
//       payout: 0,
//       escrow: 0,
//       spillover: 0,
//       description: '',
//       toUpline: false,
//       line: 1,
//       isAutoUpgradeSource: false,
//       isRecyclePosition: false,
//       spillsTo: parentPosition,
//       parentPosition
//     }

//     if (orbitType === 'P4') {
//       info.line = 1
//       info.isRecyclePosition = position === 4

//       if (!autoUpgradeCompleted) {
//         if (position === 1) {
//           info.type = 'payout-escrow'
//           info.payout = 70
//           info.escrow = 20
//           info.spillover = 0
//           info.description = 'Position 1: 70% to orbit owner and 20% locked for auto-upgrade.'
//           info.toUpline = true
//           info.isAutoUpgradeSource = true
//         } else if (position === 2 || position === 3) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 90
//           info.spillover = 0
//           info.description = `Position ${position}: 90% locked for auto-upgrade.`
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         } else if (position === 4) {
//           info.type = 'recycle'
//           info.description = 'Position 4: recycle position.'
//         }
//       } else {
//         if (position === 1 || position === 2 || position === 3) {
//           info.type = 'payout'
//           info.payout = 90
//           info.description = `Position ${position}: 90% to orbit owner.`
//           info.toUpline = true
//         } else if (position === 4) {
//           info.type = 'recycle'
//           info.description = 'Position 4: recycle position.'
//         }
//       }
//     } else if (orbitType === 'P12') {
//       if (position <= 3) {
//         info.line = 1
//         info.type = 'payout'
//         info.payout = 40
//         info.spillover = 50
//         info.description = `Position ${position}: 40% to orbit owner and 50% to eligible upline.`
//         info.toUpline = true
//       } else if (position >= 4 && position <= 7) {
//         info.line = 2
//         info.type = 'escrow'
//         info.escrow = 50
//         info.spillover = 40
//         info.description = `Position ${position}: 50% locked for auto-upgrade and 40% to structural parent position ${parentPosition}.`
//         info.isAutoUpgradeSource = true
//       } else if (position >= 8 && position <= 10) {
//         info.line = 2
//         info.type = 'payout'
//         info.payout = 50
//         info.spillover = 40
//         info.description = `Position ${position}: 50% to orbit owner and 40% to structural parent position ${parentPosition}.`
//         info.toUpline = true
//       } else if (position === 11 || position === 12) {
//         info.line = 2
//         info.type = 'recycle'
//         info.isRecyclePosition = true
//         info.description = `Position ${position}: recycle position under structural parent ${parentPosition}.`
//       }
//     } else if (orbitType === 'P39') {
//       if (position <= 3) {
//         info.line = 1
//         if (position <= 2) {
//           info.type = 'payout'
//           info.payout = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% to orbit owner, 20% to eligible upline, and 50% to next eligible upline.`
//           info.toUpline = true
//         } else if (position === 3) {
//           info.type = 'escrow'
//           info.escrow = 20
//           info.spillover = 70
//           info.description = 'Position 3: 20% locked for auto-upgrade, 20% to eligible upline, and 50% to next eligible upline.'
//           info.isAutoUpgradeSource = true
//         }
//       } else if (position >= 4 && position <= 12) {
//         info.line = 2
//         if (position >= 4 && position <= 7) {
//           info.type = 'escrow'
//           info.escrow = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% locked for auto-upgrade, 20% to structural parent position ${parentPosition}, and 50% to orbit owner.`
//           info.isAutoUpgradeSource = true
//         } else {
//           info.type = 'payout'
//           info.payout = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% to orbit owner, 20% to structural parent position ${parentPosition}, and 50% to orbit owner.`
//           info.toUpline = true
//         }
//       } else if (position >= 13 && position <= 39) {
//         info.line = 3
//         const grandParentPosition = (() => {
//           if (parentPosition === 4 || parentPosition === 7 || parentPosition === 10) return 1
//           if (parentPosition === 5 || parentPosition === 8 || parentPosition === 11) return 2
//           return 3
//         })()

//         if (position >= 13 && position <= 14) {
//           info.type = 'escrow'
//           info.escrow = 50
//           info.spillover = 40
//           info.description = `Position ${position}: 50% locked for auto-upgrade, 20% to structural parent position ${parentPosition}, and 20% to structural grandparent position ${grandParentPosition}.`
//           info.isAutoUpgradeSource = true
//         } else if (position >= 15 && position <= 37) {
//           info.type = 'payout'
//           info.payout = 50
//           info.spillover = 40
//           info.description = `Position ${position}: 50% to orbit owner, 20% to structural parent position ${parentPosition}, and 20% to structural grandparent position ${grandParentPosition}.`
//           info.toUpline = true
//         } else if (position === 38 || position === 39) {
//           info.type = 'recycle'
//           info.isRecyclePosition = true
//           info.description = `Position ${position}: recycle position under structural parent ${parentPosition}.`
//         }
//       }
//     }

//     return info
//   }

//   const fetchAllOrbitData = useCallback(async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

//     const fetchId = ++fetchIdRef.current
//     setOrbitError('')
//     setIsLoadingOrbits(true)

//     try {
//       const newOrbitData = {}
//       const newUserLocks = {}
//       const derivedDownline = {}
//       const derivedSpillover = {}

//       const BATCH_SIZE = 2
//       const BATCH_DELAY = 700
//       const POSITION_CHUNK_SIZE = 5

//       for (let batchStart = 1; batchStart <= 10; batchStart += BATCH_SIZE) {
//         const batchPromises = []

//         for (let level = batchStart; level < batchStart + BATCH_SIZE && level <= 10; level++) {
//           const orbitType = levelToOrbitType[level]
//           const config = orbitTypeConfig[orbitType]
//           const orbitContract = contracts[config.contract]

//           if (!orbitContract) continue

//           const levelPromise = (async () => {
//             try {
//               const orbitState = await withRetry(() => orbitContract.getUserOrbit(viewAddress, level))

//               const positions = []
//               const myPositions = []
//               const downlinePositions = []
//               const otherOccupants = []
//               const positionTasks = []

//               for (let pos = 1; pos <= config.positions; pos++) {
//                 positionTasks.push(async () => {
//                   try {
//                     const position = await withRetry(() => orbitContract.getPosition(viewAddress, level, pos))
//                     const occupantAddress = position[0]
//                     const amountRaw = position[1]
//                     const timestampRaw = position[2]
//                     const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])

//                     let occupantType = 'empty'

//                     if (occupantAddress && occupantAddress !== ethers.ZeroAddress) {
//                       if (occupantAddress.toLowerCase() === viewAddress.toLowerCase()) {
//                         occupantType = 'mine'
//                         myPositions.push(pos)
//                       } else {
//                         const referrer = await getCachedReferrer(occupantAddress)

//                         if (referrer.toLowerCase() === viewAddress.toLowerCase()) {
//                           occupantType = 'downline'
//                           downlinePositions.push({
//                             position: pos,
//                             user: occupantAddress,
//                             amount: ethers.formatUnits(amountRaw, 6),
//                             timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
//                             level,
//                             activated: false,
//                             positionInfo: posInfo
//                           })
//                         } else {
//                           occupantType = 'other'
//                           otherOccupants.push({
//                             position: pos,
//                             user: occupantAddress,
//                             amount: ethers.formatUnits(amountRaw, 6),
//                             timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
//                             level,
//                             positionInfo: posInfo,
//                             originalReferrer: referrer
//                           })
//                         }
//                       }
//                     }

//                     return {
//                       number: pos,
//                       occupantType,
//                       occupant: occupantAddress !== ethers.ZeroAddress ? occupantAddress : null,
//                       amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
//                       timestamp: timestampRaw,
//                       positionInfo: posInfo,
//                       line: posInfo.line,
//                       spillsTo: posInfo.spillsTo,
//                       parentPosition: posInfo.parentPosition
//                     }
//                   } catch {
//                     const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])
//                     return {
//                       number: pos,
//                       occupantType: 'empty',
//                       occupant: null,
//                       amount: '0',
//                       timestamp: 0,
//                       positionInfo: posInfo,
//                       line: posInfo.line,
//                       spillsTo: posInfo.spillsTo,
//                       parentPosition: posInfo.parentPosition
//                     }
//                   }
//                 })
//               }

//               const positionResults = []
//               for (const chunk of chunkArray(positionTasks, POSITION_CHUNK_SIZE)) {
//                 const chunkResults = await Promise.all(chunk.map(task => task()))
//                 positionResults.push(...chunkResults)
//                 await delay(120)
//               }

//               positions.push(...positionResults)

//               const structuralLinks = positions
//                 .filter((p) => p.parentPosition && p.occupant)
//                 .map((p) => ({
//                   from: p.number,
//                   to: p.parentPosition,
//                   user: p.occupant,
//                   amount: p.amount
//                 }))

//               let escrowLock = '0'
//               if (level < 10) {
//                 try {
//                   const lockedAmount = await withRetry(() => contracts.escrow.getLockedAmount(viewAddress, level, level + 1))
//                   escrowLock = ethers.formatUnits(lockedAmount, 6)
//                 } catch {}
//               }

//               return {
//                 level,
//                 data: {
//                   orbitType,
//                   config,
//                   currentIndex: orbitState[0],
//                   escrowBalance: ethers.formatUnits(orbitState[1], 6),
//                   autoUpgradeCompleted: orbitState[2],
//                   positionsInLine1: orbitState[3],
//                   positionsInLine2: orbitState[4],
//                   positionsInLine3: orbitState[5],
//                   totalCycles: orbitState[6],
//                   totalEarned: ethers.formatUnits(orbitState[7], 6),
//                   positions,
//                   myPositions,
//                   downlinePositions,
//                   otherOccupants,
//                   spilloverFromPositions: structuralLinks
//                 },
//                 escrowLock
//               }
//             } catch {
//               const positions = []
//               for (let pos = 1; pos <= config.positions; pos++) {
//                 const posInfo = getPositionInfo(orbitType, pos, level)
//                 positions.push({
//                   number: pos,
//                   occupantType: 'empty',
//                   occupant: null,
//                   amount: '0',
//                   timestamp: 0,
//                   positionInfo: posInfo,
//                   line: posInfo.line,
//                   spillsTo: posInfo.spillsTo,
//                   parentPosition: posInfo.parentPosition
//                 })
//               }

//               return {
//                 level,
//                 data: {
//                   orbitType,
//                   config,
//                   currentIndex: 1,
//                   escrowBalance: '0',
//                   autoUpgradeCompleted: false,
//                   positionsInLine1: 0,
//                   positionsInLine2: 0,
//                   positionsInLine3: 0,
//                   totalCycles: 0,
//                   totalEarned: '0',
//                   positions,
//                   myPositions: [],
//                   downlinePositions: [],
//                   otherOccupants: [],
//                   spilloverFromPositions: []
//                 },
//                 escrowLock: '0'
//               }
//             }
//           })()

//           batchPromises.push(levelPromise)
//         }

//         const batchResults = await Promise.all(batchPromises)

//         batchResults.forEach(result => {
//           if (result) {
//             newOrbitData[result.level] = result.data
//             derivedDownline[result.level] = result.data.downlinePositions || derivedDownline[result.level] || []
//             derivedSpillover[result.level] = result.data.otherOccupants || derivedSpillover[result.level] || []

//             if (result.level < 10) {
//               newUserLocks[result.level] = result.escrowLock
//             }
//           }
//         })

//         if (batchStart + BATCH_SIZE <= 10) {
//           await delay(BATCH_DELAY)
//         }
//       }

//       if (fetchId !== fetchIdRef.current) return

//       setOrbitData(newOrbitData)
//       setUserLocks(newUserLocks)
//       setDownlineData(derivedDownline)
//       setSpilloverData(derivedSpillover)
//     } catch (err) {
//       console.error('Orbit sync error:', err)
//       setOrbitError(t('orbits.loadFailed'))
//     } finally {
//       if (fetchId === fetchIdRef.current) {
//         setIsLoadingOrbits(false)
//       }
//     }
//   }, [contracts, viewAddress, getCachedReferrer, withRetry, t])

//   const refreshData = async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
//     setIsRefreshing(true)

//     try {
//       await fetchViewedLevels()
//       await fetchAllOrbitData()
//       setLastUpdated(new Date().toLocaleTimeString())
//     } catch (err) {
//       console.error('Refresh error:', err)
//     } finally {
//       setIsRefreshing(false)
//     }
//   }

//   useEffect(() => {
//     if (contracts && viewAddress && ethers.isAddress(viewAddress)) {
//       fetchViewedLevels()
//       fetchAllOrbitData()
//     }
//   }, [contracts, viewAddress, fetchViewedLevels, fetchAllOrbitData])

//   const handleViewModeChange = (mode) => {
//     setViewMode(mode)
//   }

//   const handlePositionClick = (position) => {
//     setSelectedPosition(position)
//     setShowPositionModal(true)
//   }

//   const handleStructuralPreview = (position) => {
//     if (position.parentPosition) {
//       setShowStructuralPreview(true)
//       setTimeout(() => setShowStructuralPreview(false), 2000)
//     }
//   }

//   const renderPositionTooltip = (position) => {
//     if (!position.occupant) {
//       return (
//         <Tooltip id="tooltip-empty">
//           <strong>{t('orbits.emptyPosition')}</strong>
//           <div>{t('orbits.availableToBeFilled')}</div>
//           <div className="mt-1 small">{position.positionInfo.description}</div>
//           {position.parentPosition && (
//             <div className="text-warning mt-1">
//               {t('orbits.structuralParent', { position: position.parentPosition })}
//             </div>
//           )}
//         </Tooltip>
//       )
//     }

//     return (
//       <Tooltip id={`tooltip-${position.number}`}>
//         <div><strong>Position #{position.number}</strong> ({t('orbits.line')} {position.line})</div>
//         <div>Occupied by: {position.occupant.slice(0, 8)}...{position.occupant.slice(-6)}</div>
//         <div>Amount: {position.amount} USDT</div>
//         <div className="mt-1 small">{position.positionInfo.description}</div>

//         {position.parentPosition && (
//           <div className="text-warning mt-1">
//             Structural parent: Position {position.parentPosition}
//           </div>
//         )}

//         {position.occupantType === 'downline' && (
//           <div className="text-warning mt-1">{t('orbits.directDownlineViewedAddress')}</div>
//         )}

//         {position.occupantType === 'mine' && (
//           <div className="text-success mt-1">{t('orbits.belongsToViewedAddress')}</div>
//         )}

//         {position.positionInfo.payout > 0 && (
//           <div className="text-success mt-1">{t('orbits.directPayoutSlice', { value: position.positionInfo.payout })}</div>
//         )}

//         {position.positionInfo.spillover > 0 && position.occupantType !== 'mine' && (
//           <div className="text-warning mt-1">{t('orbits.routedPayoutSlicesExist')}</div>
//         )}

//         {position.positionInfo.escrow > 0 && (
//           <div className="text-info mt-1">{t('orbits.escrowLocked', { value: position.positionInfo.escrow })}</div>
//         )}
//       </Tooltip>
//     )
//   }

//   if (!isConnected) {
//     return (
//       <Container className="mt-5 pt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="primary" className="text-center p-5 lab-card shadow-lg" style={{ backgroundColor: '#002366', color: 'white', border: 'none' }}>
//           <h4 className="fw-bold">{t('orbits.connectTitle')}</h4>
//           <p className="m-0 opacity-75">{t('orbits.connectText')}</p>
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoading) {
//     return (
//       <Container className="mt-5 text-center">
//         <style>{orbitStyles}</style>
//         <Spinner animation="grow" variant="primary" />
//         <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>{t('orbits.syncing')}</p>
//       </Container>
//     )
//   }

//   if (error) {
//     return (
//       <Container className="mt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="danger" className="lab-card shadow-sm border-0">
//           <strong>{t('orbits.panelError')}:</strong> {error}
//         </Alert>
//       </Container>
//     )
//   }

//   if (orbitError) {
//     return (
//       <Container className="mt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="danger" className="lab-card shadow-sm border-0">
//           <strong className="text-danger">{t('orbits.systemAlert')}:</strong> {orbitError}
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoadingOrbits) {
//     return (
//       <Container className="mt-5 pt-4">
//         <style>{orbitStyles}</style>
//         <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
//           <div className="d-flex align-items-center">
//             <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
//             <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//               {t('orbits.pageTitle')}
//             </h1>
//           </div>
//         </div>

//         <div className="text-center py-5">
//           <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
//           <p className="mt-3 fw-bold text-muted">{t('orbits.loading')}</p>
//         </div>
//       </Container>
//     )
//   }

//   const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
//   const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
//   const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()

//   return (
//     <Container className="mt-5 pt-4">
//       <style>{orbitStyles}</style>

//       <Modal show={showPositionModal} onHide={() => setShowPositionModal(false)} className="position-modal" centered>
//         <Modal.Header closeButton>
//           <Modal.Title>{t('orbits.positionDetails', { number: selectedPosition?.number })}</Modal.Title>
//         </Modal.Header>

//         <Modal.Body>
//           {selectedPosition && (
//             <>
//               <div className="info-row">
//                 <span className="info-label">{t('orbits.positionType')}</span>
//                 <span className="info-value">{selectedPosition.positionInfo?.type?.toUpperCase()}</span>
//               </div>

//               <div className="info-row">
//                 <span className="info-label">{t('orbits.line')}</span>
//                 <span className="info-value">{t('orbits.line')} {selectedPosition.positionInfo?.line}</span>
//               </div>

//               {selectedPosition.parentPosition && (
//                 <div className="info-row">
//                   <span className="info-label">Structural Parent</span>
//                   <span className="info-value">Position {selectedPosition.parentPosition}</span>
//                 </div>
//               )}

//               {selectedPosition.occupant ? (
//                 <>
//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.occupiedBy')}</span>
//                     <span className="info-value">
//                       {selectedPosition.occupantType === 'mine'
//                         ? (isViewingSelf ? t('orbits.you') : t('orbits.viewedOwner'))
//                         : selectedPosition.occupant.slice(0, 10) + '...' + selectedPosition.occupant.slice(-8)}
//                     </span>
//                   </div>

//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.fullAddress')}</span>
//                     <span className="info-value" style={{ fontSize: '0.8rem' }}>
//                       {selectedPosition.occupant}
//                     </span>
//                   </div>

//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.amountEntered')}</span>
//                     <span className="info-value">{selectedPosition.amount} USDT</span>
//                   </div>

//                   {selectedPosition.timestamp > 0 && (
//                     <div className="info-row">
//                       <span className="info-label">{t('orbits.filledOn')}</span>
//                       <span className="info-value">
//                         {new Date(Number(selectedPosition.timestamp) * 1000).toLocaleString()}
//                       </span>
//                     </div>
//                   )}

//                   <div className="commission-breakdown">
//                     <h6 className="fw-bold mb-3">{t('orbits.routingBreakdown')}</h6>
//                     <p className="small text-muted mb-3">{selectedPosition.positionInfo?.description}</p>

//                     {selectedPosition.positionInfo?.payout > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.directRecipientSlice')}</span>
//                         <span className="commission-amount payout">
//                           {selectedPosition.positionInfo.payout}% of orbit amount
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.escrow > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.lockedInEscrow')}</span>
//                         <span className="commission-amount escrow">
//                           {selectedPosition.positionInfo.escrow}% of orbit amount
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.spillover > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.otherRoutedSlices')}</span>
//                         <span className="commission-amount" style={{ color: '#ffc107' }}>
//                           {t('orbits.seePositionRule')}
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.type === 'recycle' && (
//                       <div className="commission-item">
//                         <span>{t('orbits.status')}</span>
//                         <span className="commission-amount" style={{ color: '#6c757d' }}>
//                           {t('orbits.recyclePosition')}
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'downline' && (
//                       <div className="alert alert-warning mt-3 mb-0 small">
//                         <strong>{t('orbits.downlineAlertTitle')}</strong><br />
//                         {selectedPosition.positionInfo?.toUpline
//                           ? t('orbits.downlineAlertPayout')
//                           : t('orbits.downlineAlertEscrow')}
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'mine' && (
//                       <div className="alert alert-success mt-3 mb-0 small">
//                         <strong>{t('orbits.mineAlertTitle')}</strong><br />
//                         {t('orbits.mineAlertText')}
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'other' && selectedPosition.positionInfo?.spillover > 0 && (
//                       <div className="alert alert-info mt-3 mb-0 small">
//                         <strong>{t('orbits.otherAlertTitle')}</strong><br />
//                         {t('orbits.otherAlertText')}
//                       </div>
//                     )}
//                   </div>
//                 </>
//               ) : (
//                 <div className="text-center p-4">
//                   <h5 className="text-muted">{t('orbits.emptyPosition')}</h5>
//                   <p className="small">{t('orbits.availableToBeFilled')}</p>

//                   <div className="commission-breakdown mt-3">
//                     <h6 className="fw-bold mb-2">{t('orbits.whenFilled')}</h6>
//                     <p className="small mb-0">{selectedPosition.positionInfo?.description}</p>
//                     {selectedPosition.parentPosition && (
//                       <p className="small text-warning mt-2">
//                         {t('orbits.structuralParent', { position: selectedPosition.parentPosition })}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </Modal.Body>

//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowPositionModal(false)}>
//             {t('orbits.close')}
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
//         <div className="d-flex align-items-center">
//           <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px', borderRadius: '8px' }}></div>
//           <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//             {t('orbits.pageTitle')}
//           </h1>

//           <div className="view-toggle">
//             <Button
//               variant={viewMode === 'global' ? 'primary' : 'outline-secondary'}
//               size="sm"
//               onClick={() => handleViewModeChange('global')}
//               className={viewMode === 'global' ? 'active' : ''}
//             >
//               {t('orbits.orbitView')}
//             </Button>

//             <Button
//               variant={viewMode === 'downline' ? 'primary' : 'outline-secondary'}
//               size="sm"
//               onClick={() => handleViewModeChange('downline')}
//               className={viewMode === 'downline' ? 'active' : ''}
//             >
//               {t('orbits.downlineView')}
//               {totalDownline > 0 && <Badge bg="warning" className="ms-1">{totalDownline}</Badge>}
//               {totalSpillover > 0 && <Badge bg="info" className="ms-1">{totalSpillover} orbit</Badge>}
//             </Button>
//           </div>
//         </div>

//         <div className="d-flex align-items-center">
//           <span className="text-muted small me-3">{t('orbits.lastSync')}: {lastUpdated}</span>
//           <Button
//             variant="link"
//             className="refresh-button"
//             onClick={refreshData}
//             disabled={isRefreshing || !viewAddress || !ethers.isAddress(viewAddress)}
//           >
//             {isRefreshing ? t('orbits.refreshing') : t('orbits.refresh')}
//           </Button>
//         </div>
//       </div>

//       <div className="lab-card p-3 mb-4">
//         <Row className="align-items-end g-3">
//           <Col lg={8}>
//             <Form.Group>
//               <Form.Label className="fw-bold small text-uppercase text-muted">{t('orbits.addressToView')}</Form.Label>
//               <Form.Control
//                 type="text"
//                 value={inputAddress}
//                 onChange={(e) => setInputAddress(e.target.value)}
//                 placeholder="0x..."
//               />
//               <div className="small text-muted mt-2">
//                 {t('orbits.currentlyViewing')} {viewAddress ? `${viewAddress.slice(0, 8)}...${viewAddress.slice(-6)}` : t('orbits.noAddressSelected')}
//                 {isViewingSelf && ` ${t('orbits.yourWallet')}`}
//               </div>
//             </Form.Group>
//           </Col>

//           <Col lg={4}>
//             <div className="d-flex gap-2">
//               <Button onClick={applyViewerAddress} disabled={!inputAddress || !ethers.isAddress(inputAddress)}>
//                 {t('orbits.loadAddress')}
//               </Button>
//               <Button variant="outline-secondary" onClick={viewMyOrbit} disabled={!account}>
//                 {t('orbits.viewMine')}
//               </Button>
//             </div>
//           </Col>
//         </Row>
//       </div>

//       <div className="color-legend">
//         <div className="legend-item">
//           <div className="legend-color green"></div>
//           <span><strong>{t('orbits.legendViewedOwner')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color orange"></div>
//           <span><strong>{t('orbits.legendDirectDownline')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color blue"></div>
//           <span><strong>{t('orbits.legendOtherUser')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color gold"></div>
//           <span><strong>STRUCTURAL PARENT LINK</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color red"></div>
//           <span><strong>{t('orbits.legendEmpty')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color gray"></div>
//           <span><strong>{t('orbits.legendInactive')}</strong></span>
//         </div>
//       </div>

//       <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 border-0">
//         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//           const data = orbitData[level]
//           if (!data) return null

//           const { config, positions, currentIndex, autoUpgradeCompleted, totalCycles, orbitType } = data
//           const downlineAtLevel = downlineData[level] || []
//           const spilloverAtLevel = spilloverData[level] || []
//           const levelInfo = levelConfig[level]
//           const isLevelActive = !!viewedLevels[level]

//           const positionsByLine = {}
//           positions.forEach(pos => {
//             const line = pos.line
//             if (!positionsByLine[line]) positionsByLine[line] = []
//             positionsByLine[line].push(pos)
//           })

//           const structure = getOrbitStructure(orbitType)

//           return (
//             <Tab
//               key={level}
//               eventKey={`level${level}`}
//               title={
//                 <span>
//                   Level {level} ({data.orbitType})
//                   {!isLevelActive && <Badge bg="secondary" className="ms-2">{t('orbits.inactive')}</Badge>}
//                   {downlineAtLevel.length > 0 && <Badge bg="warning" className="ms-2">{downlineAtLevel.length}</Badge>}
//                   {spilloverAtLevel.length > 0 && <Badge bg="info" className="ms-2">{spilloverAtLevel.length}s</Badge>}
//                   {autoUpgradeCompleted && <Badge bg="success" className="ms-2">{t('orbits.upgraded')}</Badge>}
//                 </span>
//               }
//             >
//               <Row>
//                 <Col lg={8}>
//                   <div className="lab-card mb-4">
//                     <div className="orbit-header d-flex justify-content-between align-items-center">
//                       <span>
//                         Level {level} ({data.orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}
//                         {totalCycles > 0 && <span className="cycle-badge ms-3">{t('orbits.cycle', { count: Number(totalCycles) + 1 })}</span>}
//                       </span>
//                       <div>
//                         {!isLevelActive && <Badge bg="secondary" className="me-2">{t('orbits.inactiveLevel')}</Badge>}
//                         {downlineAtLevel.length > 0 && <Badge bg="warning" className="me-2">{t('orbits.downlineCount', { count: downlineAtLevel.length })}</Badge>}
//                         {spilloverAtLevel.length > 0 && <Badge bg="info" className="me-2">{t('orbits.orbitCount', { count: spilloverAtLevel.length })}</Badge>}
//                         <Badge bg="info">{currentIndex || 1}/{config.positions} filled</Badge>
//                       </div>
//                     </div>

//                     <div className="p-4">
//                       <div className={`galaxy-container ${orbitType.toLowerCase()}`} ref={activeTab === `level${level}` ? galaxyRef : null}>
//                         <div className="galaxy-grid"></div>

//                         <div className="star-field">
//                           {starConfig.map((star) => (
//                             <span
//                               key={star.id}
//                               className="star"
//                               style={{
//                                 left: star.left,
//                                 top: star.top,
//                                 width: star.size,
//                                 height: star.size,
//                                 opacity: star.opacity,
//                                 animationDelay: `${star.delay}, ${star.delay}`,
//                                 animationDuration: `${star.duration}, ${star.drift}`
//                               }}
//                             />
//                           ))}
//                         </div>

//                         <div className="galaxy-inner">
//                           {(() => {
//                             const outerWidth = containerSize.width > 0 ? containerSize.width : 560
//                             const outerHeight = containerSize.height > 0 ? containerSize.height : 560
//                             const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
//                             const stageSize = usableSize
//                             const centerX = stageSize / 2
//                             const centerY = stageSize / 2

//                             const planetSize = getPlanetSize(orbitType, stageSize)
//                             const coreSize = getCoreSize(orbitType, stageSize)
//                             const nodePadding = planetSize / 2 + 8
//                             const coreClearance = coreSize / 2 + planetSize / 2 + 16

//                             let ringRadiiPx = {
//                               1: Math.max(coreClearance, stageSize * 0.22),
//                               2: stageSize * 0.34,
//                               3: stageSize * 0.45
//                             }

//                             if (orbitType === 'P4') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance + 6, stageSize * 0.31)
//                               }
//                             }

//                             if (orbitType === 'P12') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance + 4, stageSize * 0.19),
//                                 2: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding)
//                               }
//                             }

//                             if (orbitType === 'P39') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance, stageSize * 0.16),
//                                 2: stageSize * 0.30,
//                                 3: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding)
//                               }
//                             }

//                             Object.keys(ringRadiiPx).forEach(key => {
//                               ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding)
//                             })

//                             const createEmptyPosition = (posNumber, lineNum) => ({
//                               number: posNumber,
//                               occupantType: 'empty',
//                               occupant: null,
//                               amount: '0',
//                               timestamp: 0,
//                               positionInfo: getPositionInfo(orbitType, posNumber, level, autoUpgradeCompleted),
//                               line: lineNum,
//                               spillsTo: null,
//                               parentPosition: getStructuralParentPosition(orbitType, posNumber)
//                             })

//                             const allPositionMap = {}
//                             structure.lines.forEach(lineNum => {
//                               const linePositions = positionsByLine[lineNum] || []
//                               structure.positions[lineNum].forEach(posNumber => {
//                                 allPositionMap[posNumber] = linePositions.find(p => p.number === posNumber) || createEmptyPosition(posNumber, lineNum)
//                               })
//                             })

//                             const getCoordsForPosition = (posNumber, lineNum, index) => {
//                               const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
//                               if (typeof customAngle === 'number') {
//                                 return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
//                               }

//                               return getPositionOnRing(
//                                 index,
//                                 structure.counts[lineNum],
//                                 ringRadiiPx[lineNum],
//                                 centerX,
//                                 centerY,
//                                 structure.startAngles[lineNum]
//                               )
//                             }

//                             return (
//                               <div
//                                 className="galaxy-stage"
//                                 style={{
//                                   width: stageSize,
//                                   height: stageSize,
//                                   left: '50%',
//                                   top: '50%',
//                                   transform: 'translate(-50%, -50%)'
//                                 }}
//                               >
//                                 <div
//                                   className={`orbit-core ${!isLevelActive ? 'orbit-core-inactive' : ''}`}
//                                   style={{
//                                     width: coreSize,
//                                     height: coreSize
//                                   }}
//                                 >
//                                   <span className="core-label">{isLevelActive ? t('orbits.owner') : t('orbits.inactiveCore')}</span>
//                                   <span className="core-value">
//                                     {isLevelActive
//                                       ? (isViewingSelf ? t('orbits.you') : t('orbits.view'))
//                                       : t('orbits.levelOff')}
//                                   </span>
//                                 </div>

//                                 {structure.lines.map(lineNum => {
//                                   const linePositions = positionsByLine[lineNum] || []
//                                   const filledCount = linePositions.filter(p => p.occupant).length
//                                   const diameter = ringRadiiPx[lineNum] * 2

//                                   return (
//                                     <div
//                                       key={lineNum}
//                                       className={`orbit-ring line${lineNum}`}
//                                       style={{
//                                         width: diameter,
//                                         height: diameter
//                                       }}
//                                     >
//                                       <span className="ring-label">LINE {lineNum}</span>
//                                       <span className="ring-stats">
//                                         {filledCount}/{structure.positions[lineNum].length} • {config.linePayouts[lineNum - 1]} • {config.lineSpillovers[lineNum - 1]}
//                                       </span>
//                                     </div>
//                                   )
//                                 })}

//                                 <>
//                                   {structure.lines.map(lineNum => {
//                                     const positionNumbers = structure.positions[lineNum]

//                                     return positionNumbers.map((posNumber, index) => {
//                                       const pos = allPositionMap[posNumber]
//                                       const coords = getCoordsForPosition(posNumber, lineNum, index)

//                                       let planetClass = 'planet-node '
//                                       if (pos.occupantType === 'mine') {
//                                         planetClass += 'planet-my-position'
//                                       } else if (pos.occupantType === 'downline') {
//                                         planetClass += 'planet-downline'
//                                       } else if (pos.occupantType === 'other') {
//                                         planetClass += 'planet-other'
//                                       } else {
//                                         planetClass += 'planet-empty'
//                                       }

//                                       if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) {
//                                         planetClass += ' planet-structural-preview'
//                                       }

//                                       return (
//                                         <OverlayTrigger
//                                           key={pos.number}
//                                           placement="top"
//                                           overlay={renderPositionTooltip(pos)}
//                                           delay={{ show: 250, hide: 100 }}
//                                         >
//                                           <div
//                                             className={planetClass}
//                                             style={{
//                                               left: coords.x,
//                                               top: coords.y,
//                                               width: planetSize,
//                                               height: planetSize,
//                                               transform: 'translate(-50%, -50%)',
//                                               '--index': index
//                                             }}
//                                             onClick={() => handlePositionClick(pos)}
//                                             onMouseEnter={() => {
//                                               setHoveredPosition(pos)
//                                               if (pos.parentPosition) handleStructuralPreview(pos)
//                                             }}
//                                             onMouseLeave={() => setHoveredPosition(null)}
//                                           >
//                                             <div className="planet-content">
//                                               <span className="node-number">{pos.number}</span>

//                                               {pos.occupant && (
//                                                 <span className="planet-icon">
//                                                   {pos.occupantType === 'mine' ? '👤' : pos.occupantType === 'downline' ? '⬇️' : '👥'}
//                                                 </span>
//                                               )}

//                                               {pos.positionInfo.payout > 0 && pos.occupantType !== 'mine' && (
//                                                 <span className="planet-earn-badge">
//                                                   {pos.positionInfo.payout}%
//                                                 </span>
//                                               )}
//                                             </div>
//                                           </div>
//                                         </OverlayTrigger>
//                                       )
//                                     })
//                                   })}

//                                   {data.spilloverFromPositions.map((conn, idx) => {
//                                     const fromPos = allPositionMap[conn.from]
//                                     const toPos = allPositionMap[conn.to]

//                                     if (!fromPos || !toPos || !fromPos.occupant || !toPos) return null

//                                     const fromLine = fromPos.line
//                                     const toLine = toPos.line
//                                     const fromIndex = structure.positions[fromLine].indexOf(fromPos.number)
//                                     const toIndex = structure.positions[toLine].indexOf(toPos.number)

//                                     if (fromIndex < 0 || toIndex < 0) return null

//                                     const fromCoords = (() => {
//                                       const customAngle = structure.customAngles?.[fromLine]?.[fromPos.number]
//                                       if (typeof customAngle === 'number') {
//                                         return getPositionOnAngle(customAngle, ringRadiiPx[fromLine], centerX, centerY)
//                                       }
//                                       return getPositionOnRing(
//                                         fromIndex,
//                                         structure.counts[fromLine],
//                                         ringRadiiPx[fromLine],
//                                         centerX,
//                                         centerY,
//                                         structure.startAngles[fromLine]
//                                       )
//                                     })()

//                                     const toCoords = (() => {
//                                       const customAngle = structure.customAngles?.[toLine]?.[toPos.number]
//                                       if (typeof customAngle === 'number') {
//                                         return getPositionOnAngle(customAngle, ringRadiiPx[toLine], centerX, centerY)
//                                       }
//                                       return getPositionOnRing(
//                                         toIndex,
//                                         structure.counts[toLine],
//                                         ringRadiiPx[toLine],
//                                         centerX,
//                                         centerY,
//                                         structure.startAngles[toLine]
//                                       )
//                                     })()

//                                     const dx = toCoords.x - fromCoords.x
//                                     const dy = toCoords.y - fromCoords.y
//                                     const distance = Math.sqrt(dx * dx + dy * dy)
//                                     const angle = Math.atan2(dy, dx) * 180 / Math.PI

//                                     return (
//                                       <div key={`conn-${idx}`}>
//                                         <div
//                                           className="structural-connection"
//                                           style={{
//                                             width: distance,
//                                             left: fromCoords.x,
//                                             top: fromCoords.y,
//                                             transform: `rotate(${angle}deg)`
//                                           }}
//                                         />
//                                       </div>
//                                     )
//                                   })}
//                                 </>
//                               </div>
//                             )
//                           })()}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </Col>

//                 <Col lg={4}>
//                   <div className="lab-card energy-cell h-100">
//                     <div className="orbit-header">{t('orbits.escrowAutoUpgrade')}</div>
//                     <div className="p-4 pulse-overlay">
//                       <div className="small fw-bold text-muted text-uppercase mb-2">
//                         {t('orbits.lockedForLevel', { level: levelInfo.nextLevel })}
//                       </div>

//                       <h3 className="fw-black mb-3" style={{ color: '#002366', fontFamily: 'monospace' }}>
//                         {userLocks[level] || '0'} <span className="small text-muted">/ {levelInfo.upgradeReq} USDT</span>
//                       </h3>

//                       <ProgressBar
//                         now={((parseFloat(userLocks[level] || '0') / levelInfo.upgradeReq) * 100) || 0}
//                         variant="primary"
//                         className="mb-3"
//                       />

//                       <div className="p-3 bg-light rounded-3 small fw-bold text-center">
//                         {!isLevelActive ? (
//                           <span className="text-secondary">{t('orbits.levelInactiveForAddress', { level })}</span>
//                         ) : parseFloat(userLocks[level] || '0') >= levelInfo.upgradeReq ? (
//                           autoUpgradeCompleted ? (
//                             <span className="text-success">{t('orbits.levelAlreadyActivated', { level: levelInfo.nextLevel })}</span>
//                           ) : (
//                             <span className="text-success">{t('orbits.autoUpgradeReady', { level: levelInfo.nextLevel })}</span>
//                           )
//                         ) : (
//                           t('orbits.needMoreUsdt', {
//                             amount: (levelInfo.upgradeReq - parseFloat(userLocks[level] || '0')).toFixed(1)
//                           })
//                         )}
//                       </div>

//                       <hr className="my-4" />

//                       <div className="small fw-bold text-muted text-uppercase mb-2">Total Earned From This Level</div>
//                       <h4 className="fw-bold" style={{ color: '#28a745' }}>{data.totalEarned} USDT</h4>
//                       <div className="earned-caption">
//                         Includes every amount credited to this orbit owner at this level from eligible direct placements, spillover receipts, and recycle-related receipts tracked in the contract total.
//                       </div>

//                       {viewMode === 'downline' && (
//                         <>
//                           {downlineAtLevel.length > 0 && (
//                             <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-3">
//                               <h6 className="fw-bold mb-2">{t('orbits.directDownlineAtLevel', { level })}</h6>
//                               <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
//                                 {downlineAtLevel.map((d, idx) => (
//                                   <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
//                                     <div>
//                                       <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
//                                         {d.user.slice(0, 8)}...{d.user.slice(-6)}
//                                       </span>
//                                       <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
//                                       <small className="text-muted d-block">{t('orbits.amountShort', { amount: d.amount })}</small>
//                                     </div>
//                                     <Badge bg={d.positionInfo.toUpline ? 'success' : 'secondary'}>
//                                       {d.positionInfo.toUpline ? '💰' : '🔒'}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           )}

//                           {spilloverAtLevel.length > 0 && (
//                             <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-3">
//                               <h6 className="fw-bold mb-2">{t('orbits.otherParticipantsAtLevel', { level })}</h6>
//                               <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
//                                 {spilloverAtLevel.map((d, idx) => (
//                                   <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
//                                     <div>
//                                       <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
//                                         {d.user.slice(0, 8)}...{d.user.slice(-6)}
//                                       </span>
//                                       <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
//                                       <small className="text-muted d-block">From: {d.originalReferrer?.slice(0, 6)}...</small>
//                                     </div>
//                                     <Badge bg="info">
//                                       {t('orbits.routedByRule')}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           )}

//                           {downlineAtLevel.length === 0 && spilloverAtLevel.length === 0 && (
//                             <div className="mt-4 p-3 bg-light rounded-3 text-center text-muted small">
//                               {t('orbits.noDownlineYet')}
//                             </div>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </Col>
//               </Row>
//             </Tab>
//           )
//         })}
//       </Tabs>
//     </Container>
//   )
// }
















//CHECK THE CODE ABOVE
// import React, { useState, useEffect, useRef, useCallback } from 'react'
// import { Container, Row, Col, Tabs, Tab, Alert, Spinner, ProgressBar, Button, Badge, Modal, OverlayTrigger, Tooltip, Form } from 'react-bootstrap'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'
// import { ethers } from 'ethers'
// import { useTranslation } from 'react-i18next'

// export const Orbits = () => {
//   console.log('Debug: This is the new file')

//   const { isConnected, account } = useWallet()
//   const { contracts, isLoading, error, loadContracts } = useContracts()
//   const { t } = useTranslation()

//   const [orbitData, setOrbitData] = useState({})
//   const [userLocks, setUserLocks] = useState({})
//   const [downlineData, setDownlineData] = useState({})
//   const [spilloverData, setSpilloverData] = useState({})
//   const [orbitError, setOrbitError] = useState('')
//   const [viewMode, setViewMode] = useState('global')
//   const [selectedPosition, setSelectedPosition] = useState(null)
//   const [showPositionModal, setShowPositionModal] = useState(false)
//   const [hoveredPosition, setHoveredPosition] = useState(null)
//   const [showStructuralPreview, setShowStructuralPreview] = useState(false)
//   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
//   const [viewAddress, setViewAddress] = useState('')
//   const [inputAddress, setInputAddress] = useState('')
//   const [viewedLevels, setViewedLevels] = useState({})

//   const galaxyRef = useRef(null)
//   const referrerCacheRef = useRef(new Map())
//   const viewedLevelsCacheRef = useRef(new Map())
//   const fetchIdRef = useRef(0)

//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [isRefreshing, setIsRefreshing] = useState(false)
//   const [activeTab, setActiveTab] = useState('level1')
//   const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)

//   const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

//   const chunkArray = (arr, size) => {
//     const chunks = []
//     for (let i = 0; i < arr.length; i += size) {
//       chunks.push(arr.slice(i, i + size))
//     }
//     return chunks
//   }

//   const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
//     try {
//       return await fn()
//     } catch (err) {
//       const code = err?.code || err?.info?.error?.code
//       const msg = String(err?.message || '')
//       const isRateLimited =
//         code === -32005 ||
//         err?.status === 429 ||
//         msg.includes('rate limited') ||
//         msg.includes('429')

//       if (!isRateLimited || retries <= 0) {
//         throw err
//       }

//       await delay(wait)
//       return withRetry(fn, retries - 1, wait * 2)
//     }
//   }, [])

//   const getCachedReferrer = useCallback(async (address) => {
//     const key = address.toLowerCase()
//     if (referrerCacheRef.current.has(key)) {
//       return referrerCacheRef.current.get(key)
//     }

//     const referrer = await withRetry(() => contracts.registration.getReferrer(address))
//     referrerCacheRef.current.set(key, referrer)
//     return referrer
//   }, [contracts, withRetry])

//   useEffect(() => {
//     if (account && !viewAddress) {
//       setViewAddress(account)
//       setInputAddress(account)
//     }
//   }, [account, viewAddress])

//   useEffect(() => {
//     const updateSize = () => {
//       if (galaxyRef.current) {
//         const { width, height } = galaxyRef.current.getBoundingClientRect()
//         if (width > 0 && height > 0 && (width !== containerSize.width || height !== containerSize.height)) {
//           setContainerSize({ width, height })
//         }
//       }
//     }

//     const timer = setTimeout(updateSize, 120)
//     window.addEventListener('resize', updateSize)

//     let resizeObserver
//     if (window.ResizeObserver) {
//       resizeObserver = new ResizeObserver(updateSize)
//       if (galaxyRef.current) {
//         resizeObserver.observe(galaxyRef.current)
//       }
//     }

//     return () => {
//       window.removeEventListener('resize', updateSize)
//       if (resizeObserver) resizeObserver.disconnect()
//       clearTimeout(timer)
//     }
//   }, [activeTab, orbitData, containerSize.width, containerSize.height])

//   useEffect(() => {
//     if (Object.keys(orbitData).length > 0 && galaxyRef.current) {
//       const { width, height } = galaxyRef.current.getBoundingClientRect()
//       if (width > 0 && height > 0) {
//         setContainerSize({ width, height })
//       }
//     }
//   }, [orbitData, activeTab])

//   const orbitStyles = `
//     @keyframes pulse-line {
//       0% { background-position: 0% 50%; }
//       100% { background-position: 200% 50%; }
//     }
//     @keyframes orbit-glow {
//       0%, 100% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.08), 0 0 12px rgba(0, 68, 204, 0.08) inset; }
//       50% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.15), 0 0 20px rgba(0, 68, 204, 0.12) inset; }
//     }
//     @keyframes structural-pulse {
//       0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.75); }
//       70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
//       100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
//     }
//     @keyframes rotate-slow {
//       from { transform: translate(-50%, -50%) rotate(0deg); }
//       to { transform: translate(-50%, -50%) rotate(360deg); }
//     }
//     @keyframes rotate-reverse {
//       from { transform: translate(-50%, -50%) rotate(360deg); }
//       to { transform: translate(-50%, -50%) rotate(0deg); }
//     }
//     @keyframes float {
//       0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
//       50% { transform: translate(-50%, -50%) translateY(-4px); }
//     }
//     @keyframes core-pulse {
//       0%, 100% { box-shadow: 0 0 28px rgba(0,35,102,0.35), 0 0 60px rgba(0,68,204,0.12); }
//       50% { box-shadow: 0 0 36px rgba(0,35,102,0.45), 0 0 75px rgba(0,68,204,0.18); }
//     }
//     @keyframes core-pulse-inactive {
//       0%, 100% { box-shadow: 0 0 18px rgba(108,117,125,0.18), 0 0 36px rgba(108,117,125,0.08); }
//       50% { box-shadow: 0 0 24px rgba(108,117,125,0.22), 0 0 48px rgba(108,117,125,0.12); }
//     }
//     @keyframes twinkle {
//       0%, 100% { opacity: 0.18; transform: scale(1); }
//       50% { opacity: 0.95; transform: scale(1.55); }
//     }
//     @keyframes drift {
//       0% { transform: translateY(0px) translateX(0px); }
//       50% { transform: translateY(-3px) translateX(2px); }
//       100% { transform: translateY(0px) translateX(0px); }
//     }
//     @keyframes glow-border {
//       0%, 100% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 18px 50px rgba(0,35,102,0.05); }
//       50% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 22px 60px rgba(0,35,102,0.08); }
//     }
//     .lab-card {
//       background: rgba(255, 255, 255, 0.82);
//       border: 1px solid rgba(255, 255, 255, 0.45);
//       border-radius: 24px;
//       box-shadow: 0 14px 40px rgba(0, 35, 102, 0.06);
//       overflow: hidden;
//       backdrop-filter: blur(14px);
//       -webkit-backdrop-filter: blur(14px);
//     }
//     .orbit-header {
//       background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
//       color: white;
//       font-family: 'monospace';
//       font-size: 0.85rem;
//       padding: 10px 20px;
//       text-transform: uppercase;
//       letter-spacing: 2px;
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       box-shadow: inset 0 -1px 0 rgba(255,255,255,0.08);
//     }
//     .cycle-badge {
//       background: linear-gradient(135deg, #ffd54f 0%, #ffc107 100%);
//       color: #002366;
//       font-weight: bold;
//       padding: 2px 8px;
//       border-radius: 12px;
//       font-size: 0.7rem;
//       box-shadow: 0 4px 10px rgba(255,193,7,0.25);
//     }
//     .galaxy-container {
//       position: relative;
//       width: 100%;
//       aspect-ratio: 1 / 1;
//       max-width: 660px;
//       margin: 20px auto;
//       min-height: 320px;
//       border-radius: 34px;
//       overflow: hidden;
//       background:
//         radial-gradient(circle at 50% 50%, rgba(27, 75, 196, 0.08) 0%, rgba(5, 22, 62, 0.06) 28%, rgba(2, 10, 33, 0.94) 74%, rgba(0, 7, 24, 0.98) 100%);
//       border: 1px solid rgba(255,255,255,0.08);
//       box-shadow:
//         inset 0 0 80px rgba(0, 119, 255, 0.06),
//         inset 0 0 24px rgba(255,255,255,0.03),
//         0 24px 60px rgba(0,35,102,0.12);
//       animation: glow-border 6s ease-in-out infinite;
//     }
//     .galaxy-container::before {
//       content: '';
//       position: absolute;
//       inset: 0;
//       background:
//         radial-gradient(circle at 20% 18%, rgba(0, 174, 255, 0.10), transparent 16%),
//         radial-gradient(circle at 82% 24%, rgba(132, 94, 255, 0.08), transparent 18%),
//         radial-gradient(circle at 52% 80%, rgba(255, 193, 7, 0.06), transparent 20%);
//       pointer-events: none;
//       z-index: 0;
//     }
//     .galaxy-grid {
//       position: absolute;
//       inset: 0;
//       border-radius: 34px;
//       pointer-events: none;
//       background-image:
//         linear-gradient(rgba(82, 145, 255, 0.045) 1px, transparent 1px),
//         linear-gradient(90deg, rgba(82, 145, 255, 0.045) 1px, transparent 1px);
//       background-size: 28px 28px;
//       mask-image: radial-gradient(circle at center, black 0%, rgba(0,0,0,0.82) 56%, transparent 90%);
//       opacity: 0.35;
//       z-index: 1;
//     }
//     .star-field {
//       position: absolute;
//       inset: 0;
//       pointer-events: none;
//       z-index: 1;
//     }
//     .star {
//       position: absolute;
//       border-radius: 50%;
//       background: rgba(255,255,255,0.95);
//       box-shadow: 0 0 6px rgba(255,255,255,0.4);
//       animation: twinkle 3.2s ease-in-out infinite, drift 8s ease-in-out infinite;
//     }
//     .galaxy-inner {
//       position: absolute;
//       inset: 0;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       z-index: 2;
//     }
//     .galaxy-stage {
//       position: absolute;
//       inset: 7%;
//       border-radius: 50%;
//     }
//     .orbit-ring {
//       position: absolute;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       border-radius: 50%;
//       pointer-events: none;
//       transition: all 0.3s ease;
//       animation: orbit-glow 4.2s ease-in-out infinite;
//       background: radial-gradient(circle at center, transparent 96%, rgba(255,255,255,0.22) 100%);
//       overflow: visible;
//     }
//     .orbit-ring::before {
//       content: '';
//       position: absolute;
//       inset: -10px;
//       border-radius: 50%;
//       border: 1px solid rgba(255,255,255,0.03);
//       pointer-events: none;
//     }
//     .orbit-ring.line1 {
//       border: 2px solid rgba(89, 150, 255, 0.36);
//       animation: orbit-glow 4.2s ease-in-out infinite, rotate-slow 30s linear infinite;
//     }
//     .orbit-ring.line2 {
//       border: 2px dashed rgba(89, 150, 255, 0.26);
//       animation: orbit-glow 5.2s ease-in-out infinite, rotate-reverse 48s linear infinite;
//     }
//     .orbit-ring.line3 {
//       border: 2px dotted rgba(89, 150, 255, 0.20);
//       animation: orbit-glow 6.2s ease-in-out infinite, rotate-slow 75s linear infinite;
//     }
//     .ring-label {
//       position: absolute;
//       top: -14px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: rgba(255,255,255,0.12);
//       color: #dce9ff;
//       padding: 5px 13px;
//       border-radius: 999px;
//       font-size: 0.66rem;
//       font-weight: 700;
//       text-transform: uppercase;
//       letter-spacing: 1.3px;
//       white-space: nowrap;
//       pointer-events: none;
//       backdrop-filter: blur(10px);
//       border: 1px solid rgba(255,255,255,0.10);
//       box-shadow: 0 10px 24px rgba(0,0,0,0.18);
//     }
//     .ring-stats {
//       position: absolute;
//       bottom: -14px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: rgba(255,255,255,0.10);
//       color: #bfd4ff;
//       padding: 5px 12px;
//       border-radius: 999px;
//       font-size: 0.62rem;
//       font-weight: 700;
//       white-space: nowrap;
//       pointer-events: none;
//       box-shadow: 0 10px 24px rgba(0,0,0,0.16);
//       border: 1px solid rgba(255,255,255,0.08);
//       backdrop-filter: blur(10px);
//     }
//     .planet-node {
//       position: absolute;
//       width: 44px;
//       height: 44px;
//       border-radius: 50%;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       cursor: pointer;
//       transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.28s ease, filter 0.28s ease, border-color 0.28s ease;
//       z-index: 10;
//       box-shadow: 0 8px 20px rgba(0,0,0,0.28);
//       border: 2px solid rgba(255,255,255,0.90);
//       animation: float 4s ease-in-out infinite;
//       animation-delay: calc(var(--index) * 0.12s);
//       will-change: transform;
//       backdrop-filter: blur(8px);
//       -webkit-backdrop-filter: blur(8px);
//     }
//     .planet-node:hover {
//       transform: translate(-50%, -50%) scale(1.18);
//       z-index: 100;
//       box-shadow: 0 14px 32px rgba(0,0,0,0.30), 0 0 20px rgba(92, 154, 255, 0.14);
//       filter: saturate(1.08) brightness(1.04);
//       animation: none;
//       border-color: rgba(255,255,255,1);
//     }
//     @media (max-width: 768px) {
//       .planet-node {
//         width: 36px;
//         height: 36px;
//       }
//       .galaxy-container.p39 .planet-node {
//         width: 28px;
//         height: 28px;
//       }
//     }
//     @media (max-width: 480px) {
//       .planet-node {
//         width: 30px;
//         height: 30px;
//       }
//       .galaxy-container.p39 .planet-node {
//         width: 24px;
//         height: 24px;
//       }
//       .ring-label,
//       .ring-stats {
//         font-size: 0.56rem;
//         padding: 3px 8px;
//       }
//     }
//     .galaxy-container.p39 .planet-node {
//       width: 38px;
//       height: 38px;
//     }
//     .galaxy-container.p39 .node-number {
//       font-size: 14px;
//     }
//     .planet-my-position {
//       background: linear-gradient(135deg, rgba(40, 167, 69, 0.95) 0%, rgba(32, 201, 151, 0.95) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(40, 167, 69, 0.46), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-downline {
//       background: linear-gradient(135deg, rgba(255, 193, 7, 0.96) 0%, rgba(253, 126, 20, 0.96) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(255, 193, 7, 0.26), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-other {
//       background: linear-gradient(135deg, rgba(0, 102, 204, 0.96) 0%, rgba(0, 153, 255, 0.96) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(0, 102, 204, 0.22), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-empty {
//       background: rgba(255, 255, 255, 0.92);
//       color: #dc3545;
//       border: 2px solid rgba(255, 107, 107, 0.95) !important;
//       box-shadow: 0 8px 20px rgba(220, 53, 69, 0.10), 0 10px 24px rgba(0,0,0,0.16);
//     }
//     .planet-structural-preview {
//       background: linear-gradient(135deg, #ffca28 0%, #ffb300 100%);
//       color: #002366;
//       animation: structural-pulse 2s infinite !important;
//       z-index: 50;
//     }
//     .planet-content {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       width: 100%;
//       height: 100%;
//       position: relative;
//     }
//     .node-number {
//       font-size: 16px;
//       font-weight: 800;
//       text-shadow: 0 1px 2px rgba(0,0,0,0.22);
//       line-height: 1;
//     }
//     .planet-icon {
//       position: absolute;
//       top: -4px;
//       right: -4px;
//       background: linear-gradient(135deg, #ffe082 0%, #ffc107 100%);
//       color: #002366;
//       border-radius: 50%;
//       width: 18px;
//       height: 18px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-size: 10px;
//       font-weight: bold;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.22);
//       border: 1px solid white;
//     }
//     .planet-earn-badge {
//       position: absolute;
//       top: -8px;
//       left: -8px;
//       background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
//       color: white;
//       border-radius: 12px;
//       padding: 2px 6px;
//       font-size: 9px;
//       font-weight: bold;
//       white-space: nowrap;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.20);
//       border: 1px solid white;
//     }
//     .structural-connection {
//       position: absolute;
//       background: linear-gradient(90deg, rgba(255, 215, 64, 0.98), rgba(255, 179, 0, 0.98));
//       height: 3px;
//       transform-origin: 0 0;
//       z-index: 5;
//       pointer-events: none;
//       box-shadow: 0 0 12px rgba(255, 193, 7, 0.65);
//       border-radius: 999px;
//     }
//     .connection-label {
//       position: absolute;
//       background: rgba(255, 215, 64, 0.98);
//       color: #002366;
//       padding: 2px 6px;
//       border-radius: 10px;
//       font-size: 8px;
//       font-weight: bold;
//       transform: translate(-50%, -50%);
//       white-space: nowrap;
//       z-index: 6;
//       border: 1px solid white;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.18);
//     }
//     .orbit-core {
//       position: absolute;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       width: 96px;
//       height: 96px;
//       background: radial-gradient(circle at 30% 30%, rgba(40, 129, 255, 1), rgba(0, 35, 102, 1));
//       border-radius: 50%;
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       color: white;
//       font-weight: bold;
//       box-shadow: 0 0 40px rgba(0,35,102,0.35);
//       border: 3px solid rgba(255,255,255,0.95);
//       z-index: 20;
//       animation: core-pulse 3.2s ease-in-out infinite;
//       backdrop-filter: blur(12px);
//     }
//     .orbit-core-inactive {
//       background: radial-gradient(circle at 30% 30%, rgba(173, 181, 189, 0.96), rgba(73, 80, 87, 0.96));
//       color: #f8f9fa;
//       box-shadow: 0 0 24px rgba(108,117,125,0.24);
//       border: 3px solid rgba(255,255,255,0.75);
//       animation: core-pulse-inactive 3.2s ease-in-out infinite;
//     }
//     .orbit-core::before {
//       content: '';
//       position: absolute;
//       inset: -7px;
//       border-radius: 50%;
//       border: 1px solid rgba(255,255,255,0.10);
//       box-shadow: 0 0 18px rgba(0, 119, 255, 0.20);
//       pointer-events: none;
//     }
//     .orbit-core-inactive::before {
//       box-shadow: 0 0 12px rgba(108,117,125,0.18);
//     }
//     @media (max-width: 768px) {
//       .orbit-core {
//         width: 74px;
//         height: 74px;
//       }
//     }
//     .galaxy-container.p39 .orbit-core {
//       width: 82px;
//       height: 82px;
//     }
//     @media (max-width: 768px) {
//       .galaxy-container.p39 .orbit-core {
//         width: 66px;
//         height: 66px;
//       }
//     }
//     .core-label {
//       font-size: 10px;
//       text-transform: uppercase;
//       opacity: 0.88;
//       letter-spacing: 1.2px;
//     }
//     .core-value {
//       font-size: 16px;
//       font-weight: 800;
//       text-shadow: 0 2px 4px rgba(0,0,0,0.30);
//       text-align: center;
//       line-height: 1.1;
//     }
//     .color-legend {
//       display: flex;
//       gap: 20px;
//       margin-bottom: 20px;
//       padding: 15px;
//       background: rgba(248, 249, 250, 0.82);
//       border-radius: 16px;
//       flex-wrap: wrap;
//       justify-content: center;
//       border: 1px solid rgba(0,35,102,0.06);
//       backdrop-filter: blur(8px);
//     }
//     .legend-item {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       font-size: 0.85rem;
//     }
//     .legend-color {
//       width: 20px;
//       height: 20px;
//       border-radius: 50%;
//       box-shadow: 0 6px 14px rgba(0,0,0,0.10);
//     }
//     .legend-color.green { background: #28a745; }
//     .legend-color.orange { background: #fd7e14; }
//     .legend-color.blue { background: #0066cc; }
//     .legend-color.gold { background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%); }
//     .legend-color.red {
//       background: white;
//       border: 2px solid #dc3545;
//     }
//     .legend-color.gray {
//       background: linear-gradient(135deg, #adb5bd 0%, #495057 100%);
//     }
//     .energy-cell .progress {
//       height: 12px;
//       background: rgba(240, 244, 248, 0.8);
//       border-radius: 10px;
//       overflow: hidden;
//       border: 1px solid rgba(0,0,0,0.04);
//       backdrop-filter: blur(6px);
//     }
//     .pulse-overlay {
//       background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.02) 45%, rgba(0, 68, 204, 0.08) 50%, rgba(0, 35, 102, 0.02) 55%, transparent 100%);
//       background-size: 200% 100%;
//       animation: pulse-line 5s linear infinite;
//     }
//     .nav-tabs .nav-link {
//       border: none;
//       color: #666;
//       font-weight: 700;
//       text-transform: uppercase;
//       font-size: 0.8rem;
//       letter-spacing: 1px;
//       padding: 15px 25px;
//     }
//     .nav-tabs .nav-link.active {
//       color: #002366;
//       border-bottom: 3px solid #002366;
//       background: transparent;
//     }
//     .refresh-button {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white;
//       border: none;
//       border-radius: 10px;
//       padding: 6px 16px;
//       font-size: 0.8rem;
//       cursor: pointer;
//       transition: all 0.3s ease;
//       box-shadow: 0 10px 20px rgba(0,68,204,0.16);
//     }
//     .refresh-button:hover {
//       background: linear-gradient(135deg, #003085 0%, #0055ff 100%);
//       transform: translateY(-1px);
//       color: white;
//     }
//     .view-toggle {
//       display: flex;
//       gap: 10px;
//       margin-left: 20px;
//       flex-wrap: wrap;
//     }
//     .view-toggle .btn {
//       border-radius: 999px;
//       padding: 6px 16px;
//       font-size: 0.8rem;
//       box-shadow: 0 8px 18px rgba(0,0,0,0.04);
//     }
//     .view-toggle .btn.active {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white;
//       border-color: #002366;
//       box-shadow: 0 10px 22px rgba(0,68,204,0.18);
//     }
//     .position-modal .modal-content {
//       border-radius: 24px;
//       border: none;
//       box-shadow: 0 24px 50px rgba(0,0,0,0.20);
//       backdrop-filter: blur(12px);
//       overflow: hidden;
//     }
//     .position-modal .modal-header {
//       background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
//       color: white;
//       border-bottom: none;
//       padding: 20px;
//     }
//     .position-modal .modal-body {
//       padding: 25px;
//       background: rgba(255,255,255,0.96);
//     }
//     .info-row {
//       display: flex;
//       justify-content: space-between;
//       padding: 12px 0;
//       border-bottom: 1px solid #f0f0f0;
//       gap: 16px;
//     }
//     .info-label {
//       font-weight: 600;
//       color: #666;
//     }
//     .info-value {
//       font-family: monospace;
//       font-weight: 700;
//       color: #002366;
//       text-align: right;
//     }
//     .commission-breakdown {
//       background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(244,247,252,0.95) 100%);
//       border-radius: 16px;
//       padding: 15px;
//       margin: 15px 0;
//       border: 1px solid rgba(0,35,102,0.05);
//     }
//     .commission-item {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       gap: 12px;
//       padding: 8px 0;
//       border-bottom: 1px solid rgba(0,0,0,0.05);
//       font-size: 0.9rem;
//     }
//     .commission-item:last-child {
//       border-bottom: none;
//     }
//     .commission-amount {
//       font-weight: 700;
//       color: #002366;
//     }
//     .commission-amount.payout {
//       color: #28a745;
//     }
//     .commission-amount.escrow {
//       color: #0dcaf0;
//     }
//     .hover-tooltip {
//       background: #002366 !important;
//       color: white !important;
//       font-size: 0.75rem !important;
//       padding: 8px 12px !important;
//       border-radius: 10px !important;
//       opacity: 1 !important;
//     }
//     @media (max-width: 768px) {
//       .d-flex.align-items-center.justify-content-between {
//         flex-direction: column;
//         gap: 15px;
//       }
//       .view-toggle {
//         margin-left: 0;
//       }
//     }
//   `

//   const orbitTypeConfig = {
//     P4: {
//       name: 'P4',
//       contract: 'p4Orbit',
//       positions: 4,
//       lines: 1,
//       lineSizes: [4],
//       linePayouts: ['Owner / escrow / recycle by position'],
//       lineSpillovers: ['No structural child line'],
//       levels: [1, 4, 7, 10],
//       description: 'Single-line orbit'
//     },
//     P12: {
//       name: 'P12',
//       contract: 'p12Orbit',
//       positions: 12,
//       lines: 2,
//       lineSizes: [3, 9],
//       linePayouts: ['40% owner', '50% owner or 50% escrow'],
//       lineSpillovers: ['50% eligible upline', '40% structural parent'],
//       levels: [2, 5, 8],
//       description: 'Two-line orbit'
//     },
//     P39: {
//       name: 'P39',
//       contract: 'p39Orbit',
//       positions: 39,
//       lines: 3,
//       lineSizes: [3, 9, 27],
//       linePayouts: ['20% owner or 20% escrow', '20% owner or 20% escrow', '50% owner or 50% escrow'],
//       lineSpillovers: ['20% eligible upline + 50% next eligible upline', '20% structural parent + 50% orbit owner', '20% structural parent + 20% structural grandparent'],
//       levels: [3, 6, 9],
//       description: 'Three-line orbit'
//     }
//   }

//   const levelToOrbitType = {
//     1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
//     6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
//   }

//   const levelConfig = {
//     1: { price: 10, upgradeReq: 20, nextLevel: 2 },
//     2: { price: 20, upgradeReq: 40, nextLevel: 3 },
//     3: { price: 40, upgradeReq: 80, nextLevel: 4 },
//     4: { price: 80, upgradeReq: 160, nextLevel: 5 },
//     5: { price: 160, upgradeReq: 320, nextLevel: 6 },
//     6: { price: 320, upgradeReq: 640, nextLevel: 7 },
//     7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
//     8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
//     9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
//     10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
//   }

//   const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
//     const angle = (index / total) * 360 + startAngle
//     const radian = (angle * Math.PI) / 180

//     return {
//       x: centerX + radiusPx * Math.cos(radian),
//       y: centerY + radiusPx * Math.sin(radian),
//       angle
//     }
//   }

//   const getPositionOnAngle = (angle, radiusPx, centerX, centerY) => {
//     const radian = (angle * Math.PI) / 180
//     return {
//       x: centerX + radiusPx * Math.cos(radian),
//       y: centerY + radiusPx * Math.sin(radian),
//       angle
//     }
//   }

//   const getPlanetSize = (orbitType, stageSize) => {
//     const base = orbitType === 'P39' ? 38 : 44
//     if (stageSize <= 260) return orbitType === 'P39' ? 24 : 30
//     if (stageSize <= 420) return orbitType === 'P39' ? 28 : 36
//     return base
//   }

//   const getCoreSize = (orbitType, stageSize) => {
//     if (stageSize <= 260) return orbitType === 'P39' ? 66 : 74
//     if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
//     return orbitType === 'P39' ? 82 : 96
//   }

//   const getStructuralParentPosition = (orbitType, position) => {
//     if (orbitType === 'P4') {
//       return null
//     }

//     if (orbitType === 'P12') {
//       if (position === 4 || position === 7 || position === 10) return 1
//       if (position === 5 || position === 8 || position === 11) return 2
//       if (position === 6 || position === 9 || position === 12) return 3
//       return null
//     }

//     if (orbitType === 'P39') {
//       if (position === 4 || position === 7 || position === 10) return 1
//       if (position === 5 || position === 8 || position === 11) return 2
//       if (position === 6 || position === 9 || position === 12) return 3

//       if (position === 13 || position === 22 || position === 31) return 4
//       if (position === 14 || position === 23 || position === 32) return 5
//       if (position === 15 || position === 24 || position === 33) return 6
//       if (position === 16 || position === 25 || position === 34) return 7
//       if (position === 17 || position === 26 || position === 35) return 8
//       if (position === 18 || position === 27 || position === 36) return 9
//       if (position === 19 || position === 28 || position === 37) return 10
//       if (position === 20 || position === 29 || position === 38) return 11
//       if (position === 21 || position === 30 || position === 39) return 12

//       return null
//     }

//     return null
//   }

//   const getOrbitStructure = (orbitType) => {
//     return {
//       P4: {
//         lines: [1],
//         counts: { 1: 4 },
//         positions: { 1: [1, 2, 3, 4] },
//         startAngles: { 1: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 0, 3: 90, 4: 180 }
//         }
//       },
//       P12: {
//         lines: [1, 2],
//         counts: { 1: 3, 2: 9 },
//         positions: {
//           1: [1, 2, 3],
//           2: [4, 5, 6, 7, 8, 9, 10, 11, 12]
//         },
//         startAngles: { 1: -90, 2: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: {
//             4: -120, 7: -90, 10: -60,
//             5: 0, 8: 30, 11: 60,
//             6: 120, 9: 150, 12: 180
//           }
//         }
//       },
//       P39: {
//         lines: [1, 2, 3],
//         counts: { 1: 3, 2: 9, 3: 27 },
//         positions: {
//           1: [1, 2, 3],
//           2: [4, 5, 6, 7, 8, 9, 10, 11, 12],
//           3: Array.from({ length: 27 }, (_, i) => i + 13)
//         },
//         startAngles: { 1: -90, 2: -90, 3: -90 },
//         customAngles: {
//           1: { 1: -90, 2: 30, 3: 150 },
//           2: {
//             4: -120, 7: -90, 10: -60,
//             5: 0, 8: 30, 11: 60,
//             6: 120, 9: 150, 12: 180
//           },
//           3: {
//             13: -132, 22: -120, 31: -108,
//             14: -12, 23: 0, 32: 12,
//             15: 108, 24: 120, 33: 132,

//             16: -102, 25: -90, 34: -78,
//             17: 18, 26: 30, 35: 42,
//             18: 138, 27: 150, 36: 162,

//             19: -72, 28: -60, 37: -48,
//             20: 48, 29: 60, 38: 72,
//             21: 168, 30: 180, 39: 192
//           }
//         }
//       }
//     }[orbitType] || {
//       lines: [1],
//       counts: { 1: 4 },
//       positions: { 1: [1, 2, 3, 4] },
//       startAngles: { 1: -90 },
//       customAngles: {
//         1: { 1: -90, 2: 0, 3: 90, 4: 180 }
//       }
//     }
//   }

//   const getStarConfig = (count = 36) => {
//     return Array.from({ length: count }, (_, i) => ({
//       id: i,
//       left: `${((i * 17.73) % 100).toFixed(2)}%`,
//       top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
//       size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
//       delay: `${(i * 0.27).toFixed(2)}s`,
//       duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
//       drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
//       opacity: i % 4 === 0 ? 0.65 : 0.35
//     }))
//   }

//   const starConfig = getStarConfig(40)

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const fetchViewedLevels = useCallback(async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

//     const key = viewAddress.toLowerCase()
//     if (viewedLevelsCacheRef.current.has(key)) {
//       setViewedLevels(viewedLevelsCacheRef.current.get(key))
//       return
//     }

//     try {
//       const levels = {}
//       for (let i = 1; i <= 10; i++) {
//         try {
//           levels[i] = await withRetry(() => contracts.registration.isLevelActivated(viewAddress, i))
//         } catch {
//           levels[i] = false
//         }
//       }

//       viewedLevelsCacheRef.current.set(key, levels)
//       setViewedLevels(levels)
//     } catch (err) {
//       console.error('Error fetching viewed levels:', err)
//     }
//   }, [contracts, viewAddress, withRetry])

//   const applyViewerAddress = async () => {
//     if (!inputAddress || !ethers.isAddress(inputAddress)) {
//       setOrbitError(t('orbits.enterValidAddress'))
//       return
//     }

//     setOrbitError('')
//     const normalized = ethers.getAddress(inputAddress)
//     setInputAddress(normalized)
//     setViewAddress(normalized)
//     setViewMode('global')
//   }

//   const viewMyOrbit = () => {
//     if (!account) return
//     setOrbitError('')
//     setInputAddress(account)
//     setViewAddress(account)
//     setViewMode('global')
//   }

//   const getPositionInfo = (orbitType, position, level, autoUpgradeCompleted = false) => {
//     const parentPosition = getStructuralParentPosition(orbitType, position)

//     const info = {
//       type: 'unknown',
//       payout: 0,
//       escrow: 0,
//       spillover: 0,
//       description: '',
//       toUpline: false,
//       line: 1,
//       isAutoUpgradeSource: false,
//       isRecyclePosition: false,
//       spillsTo: parentPosition,
//       parentPosition
//     }

//     if (orbitType === 'P4') {
//       info.line = 1
//       info.isRecyclePosition = (position === 4)

//       if (!autoUpgradeCompleted) {
//         if (position === 1) {
//           info.type = 'payout-escrow'
//           info.payout = 70
//           info.escrow = 20
//           info.spillover = 0
//           info.description = 'Position 1: 70% to orbit owner and 20% locked for auto-upgrade.'
//           info.toUpline = true
//           info.isAutoUpgradeSource = true
//         } else if (position === 2 || position === 3) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 90
//           info.spillover = 0
//           info.description = `Position ${position}: 90% locked for auto-upgrade.`
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         } else if (position === 4) {
//           info.type = 'recycle'
//           info.payout = 0
//           info.escrow = 0
//           info.spillover = 0
//           info.description = 'Position 4: recycle position.'
//           info.toUpline = false
//         }
//       } else {
//         if (position === 1 || position === 2 || position === 3) {
//           info.type = 'payout'
//           info.payout = 90
//           info.escrow = 0
//           info.spillover = 0
//           info.description = `Position ${position}: 90% to orbit owner.`
//           info.toUpline = true
//         } else if (position === 4) {
//           info.type = 'recycle'
//           info.payout = 0
//           info.escrow = 0
//           info.spillover = 0
//           info.description = 'Position 4: recycle position.'
//           info.toUpline = false
//         }
//       }
//     } else if (orbitType === 'P12') {
//       if (position <= 3) {
//         info.line = 1
//         info.type = 'payout'
//         info.payout = 40
//         info.spillover = 50
//         info.description = `Position ${position}: 40% to orbit owner and 50% to eligible upline.`
//         info.toUpline = true
//       } else if (position >= 4 && position <= 7) {
//         info.line = 2
//         info.type = 'escrow'
//         info.payout = 0
//         info.escrow = 50
//         info.spillover = 40
//         info.description = `Position ${position}: 50% locked for auto-upgrade and 40% to structural parent position ${parentPosition}.`
//         info.toUpline = false
//         info.isAutoUpgradeSource = true
//       } else if (position >= 8 && position <= 10) {
//         info.line = 2
//         info.type = 'payout'
//         info.payout = 50
//         info.spillover = 40
//         info.description = `Position ${position}: 50% to orbit owner and 40% to structural parent position ${parentPosition}.`
//         info.toUpline = true
//       } else if (position === 11 || position === 12) {
//         info.line = 2
//         info.type = 'recycle'
//         info.payout = 0
//         info.spillover = 0
//         info.description = `Position ${position}: recycle position under structural parent ${parentPosition}.`
//         info.toUpline = false
//         info.isRecyclePosition = true
//       }
//     } else if (orbitType === 'P39') {
//       if (position <= 3) {
//         info.line = 1
//         if (position <= 2) {
//           info.type = 'payout'
//           info.payout = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% to orbit owner, 20% to eligible upline, and 50% to next eligible upline.`
//           info.toUpline = true
//         } else if (position === 3) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 20
//           info.spillover = 70
//           info.description = 'Position 3: 20% locked for auto-upgrade, 20% to eligible upline, and 50% to next eligible upline.'
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         }
//       } else if (position >= 4 && position <= 12) {
//         info.line = 2
//         if (position >= 4 && position <= 7) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% locked for auto-upgrade, 20% to structural parent position ${parentPosition}, and 50% to orbit owner.`
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         } else {
//           info.type = 'payout'
//           info.payout = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% to orbit owner, 20% to structural parent position ${parentPosition}, and 50% to orbit owner path.`
//           info.toUpline = true
//         }
//       } else if (position >= 13 && position <= 39) {
//         info.line = 3
//         const grandParentPosition = (() => {
//           if (parentPosition === 4 || parentPosition === 7 || parentPosition === 10) return 1
//           if (parentPosition === 5 || parentPosition === 8 || parentPosition === 11) return 2
//           return 3
//         })()

//         if (position >= 13 && position <= 14) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 50
//           info.spillover = 40
//           info.description = `Position ${position}: 50% locked for auto-upgrade, 20% to structural parent position ${parentPosition}, and 20% to structural grandparent position ${grandParentPosition}.`
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         } else if (position >= 15 && position <= 37) {
//           info.type = 'payout'
//           info.payout = 50
//           info.spillover = 40
//           info.description = `Position ${position}: 50% to orbit owner, 20% to structural parent position ${parentPosition}, and 20% to structural grandparent position ${grandParentPosition}.`
//           info.toUpline = true
//         } else if (position === 38 || position === 39) {
//           info.type = 'recycle'
//           info.payout = 0
//           info.spillover = 0
//           info.description = `Position ${position}: recycle position under structural parent ${parentPosition}.`
//           info.toUpline = false
//           info.isRecyclePosition = true
//         }
//       }
//     }

//     return info
//   }

//   const fetchAllOrbitData = useCallback(async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

//     const fetchId = ++fetchIdRef.current
//     setOrbitError('')
//     setIsLoadingOrbits(true)

//     try {
//       const newOrbitData = {}
//       const newUserLocks = {}
//       const derivedDownline = {}
//       const derivedSpillover = {}

//       const BATCH_SIZE = 2
//       const BATCH_DELAY = 700
//       const POSITION_CHUNK_SIZE = 5

//       for (let batchStart = 1; batchStart <= 10; batchStart += BATCH_SIZE) {
//         const batchPromises = []

//         for (let level = batchStart; level < batchStart + BATCH_SIZE && level <= 10; level++) {
//           const orbitType = levelToOrbitType[level]
//           const config = orbitTypeConfig[orbitType]
//           const orbitContract = contracts[config.contract]

//           if (!orbitContract) continue

//           const levelPromise = (async () => {
//             try {
//               const orbitState = await withRetry(() => orbitContract.getUserOrbit(viewAddress, level))

//               const positions = []
//               const myPositions = []
//               const downlinePositions = []
//               const otherOccupants = []

//               const positionTasks = []
//               for (let pos = 1; pos <= config.positions; pos++) {
//                 positionTasks.push(async () => {
//                   try {
//                     const position = await withRetry(() => orbitContract.getPosition(viewAddress, level, pos))
//                     const occupantAddress = position[0]
//                     const amountRaw = position[1]
//                     const timestampRaw = position[2]
//                     const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])

//                     let occupantType = 'empty'

//                     if (occupantAddress && occupantAddress !== ethers.ZeroAddress) {
//                       if (occupantAddress.toLowerCase() === viewAddress.toLowerCase()) {
//                         occupantType = 'mine'
//                         myPositions.push(pos)
//                       } else {
//                         const referrer = await getCachedReferrer(occupantAddress)

//                         if (referrer.toLowerCase() === viewAddress.toLowerCase()) {
//                           occupantType = 'downline'
//                           downlinePositions.push({
//                             position: pos,
//                             user: occupantAddress,
//                             amount: ethers.formatUnits(amountRaw, 6),
//                             timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
//                             level,
//                             activated: false,
//                             positionInfo: posInfo
//                           })
//                         } else {
//                           occupantType = 'other'
//                           otherOccupants.push({
//                             position: pos,
//                             user: occupantAddress,
//                             amount: ethers.formatUnits(amountRaw, 6),
//                             timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
//                             level,
//                             positionInfo: posInfo,
//                             originalReferrer: referrer
//                           })
//                         }
//                       }
//                     }

//                     return {
//                       number: pos,
//                       occupantType,
//                       occupant: occupantAddress !== ethers.ZeroAddress ? occupantAddress : null,
//                       amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
//                       timestamp: timestampRaw,
//                       positionInfo: posInfo,
//                       line: posInfo.line,
//                       spillsTo: posInfo.spillsTo,
//                       parentPosition: posInfo.parentPosition
//                     }
//                   } catch {
//                     const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])
//                     return {
//                       number: pos,
//                       occupantType: 'empty',
//                       occupant: null,
//                       amount: '0',
//                       timestamp: 0,
//                       positionInfo: posInfo,
//                       line: posInfo.line,
//                       spillsTo: posInfo.spillsTo,
//                       parentPosition: posInfo.parentPosition
//                     }
//                   }
//                 })
//               }

//               const positionResults = []
//               for (const chunk of chunkArray(positionTasks, POSITION_CHUNK_SIZE)) {
//                 const chunkResults = await Promise.all(chunk.map(task => task()))
//                 positionResults.push(...chunkResults)
//                 await delay(120)
//               }

//               positions.push(...positionResults)

//               const structuralLinks = positions
//                 .filter((p) => p.parentPosition && p.occupant)
//                 .map((p) => ({
//                   from: p.number,
//                   to: p.parentPosition,
//                   user: p.occupant,
//                   amount: p.amount
//                 }))

//               let escrowLock = '0'
//               if (level < 10) {
//                 try {
//                   const lockedAmount = await withRetry(() => contracts.escrow.getLockedAmount(viewAddress, level, level + 1))
//                   escrowLock = ethers.formatUnits(lockedAmount, 6)
//                 } catch {}
//               }

//               return {
//                 level,
//                 data: {
//                   orbitType,
//                   config,
//                   currentIndex: orbitState[0],
//                   escrowBalance: ethers.formatUnits(orbitState[1], 6),
//                   autoUpgradeCompleted: orbitState[2],
//                   positionsInLine1: orbitState[3],
//                   positionsInLine2: orbitState[4],
//                   positionsInLine3: orbitState[5],
//                   totalCycles: orbitState[6],
//                   totalEarned: ethers.formatUnits(orbitState[7], 6),
//                   positions,
//                   myPositions,
//                   downlinePositions,
//                   otherOccupants,
//                   spilloverFromPositions: structuralLinks
//                 },
//                 escrowLock
//               }
//             } catch {
//               const positions = []
//               for (let pos = 1; pos <= config.positions; pos++) {
//                 const posInfo = getPositionInfo(orbitType, pos, level)
//                 positions.push({
//                   number: pos,
//                   occupantType: 'empty',
//                   occupant: null,
//                   amount: '0',
//                   timestamp: 0,
//                   positionInfo: posInfo,
//                   line: posInfo.line,
//                   spillsTo: posInfo.spillsTo,
//                   parentPosition: posInfo.parentPosition
//                 })
//               }

//               return {
//                 level,
//                 data: {
//                   orbitType,
//                   config,
//                   currentIndex: 1,
//                   escrowBalance: '0',
//                   autoUpgradeCompleted: false,
//                   positionsInLine1: 0,
//                   positionsInLine2: 0,
//                   positionsInLine3: 0,
//                   totalCycles: 0,
//                   totalEarned: '0',
//                   positions,
//                   myPositions: [],
//                   downlinePositions: [],
//                   otherOccupants: [],
//                   spilloverFromPositions: []
//                 },
//                 escrowLock: '0'
//               }
//             }
//           })()

//           batchPromises.push(levelPromise)
//         }

//         const batchResults = await Promise.all(batchPromises)

//         batchResults.forEach(result => {
//           if (result) {
//             newOrbitData[result.level] = result.data
//             derivedDownline[result.level] = result.data.downlinePositions || derivedDownline[result.level] || []
//             derivedSpillover[result.level] = result.data.otherOccupants || derivedSpillover[result.level] || []

//             if (result.level < 10) {
//               newUserLocks[result.level] = result.escrowLock
//             }
//           }
//         })

//         if (batchStart + BATCH_SIZE <= 10) {
//           await delay(BATCH_DELAY)
//         }
//       }

//       if (fetchId !== fetchIdRef.current) return

//       setOrbitData(newOrbitData)
//       setUserLocks(newUserLocks)
//       setDownlineData(derivedDownline)
//       setSpilloverData(derivedSpillover)
//     } catch (err) {
//       console.error('Orbit sync error:', err)
//       setOrbitError(t('orbits.loadFailed'))
//     } finally {
//       if (fetchId === fetchIdRef.current) {
//         setIsLoadingOrbits(false)
//       }
//     }
//   }, [contracts, viewAddress, getCachedReferrer, withRetry, t])

//   const refreshData = async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
//     setIsRefreshing(true)

//     try {
//       await fetchViewedLevels()
//       await fetchAllOrbitData()
//       setLastUpdated(new Date().toLocaleTimeString())
//     } catch (err) {
//       console.error('Refresh error:', err)
//     } finally {
//       setIsRefreshing(false)
//     }
//   }

//   useEffect(() => {
//     if (contracts && viewAddress && ethers.isAddress(viewAddress)) {
//       fetchViewedLevels()
//       fetchAllOrbitData()
//     }
//   }, [contracts, viewAddress, fetchViewedLevels, fetchAllOrbitData])

//   const handleViewModeChange = (mode) => {
//     setViewMode(mode)
//   }

//   const handlePositionClick = (position) => {
//     setSelectedPosition(position)
//     setShowPositionModal(true)
//   }

//   const handleStructuralPreview = (position) => {
//     if (position.parentPosition) {
//       setShowStructuralPreview(true)
//       setTimeout(() => setShowStructuralPreview(false), 2000)
//     }
//   }

//   const renderPositionTooltip = (position) => {
//     if (!position.occupant) {
//       return (
//         <Tooltip id="tooltip-empty">
//           <strong>{t('orbits.emptyPosition')}</strong>
//           <div>{t('orbits.availableToBeFilled')}</div>
//           <div className="mt-1 small">{position.positionInfo.description}</div>
//           {position.parentPosition && (
//             <div className="text-warning mt-1">
//               {t('orbits.structuralParent', { position: position.parentPosition })}
//             </div>
//           )}
//         </Tooltip>
//       )
//     }

//     return (
//       <Tooltip id={`tooltip-${position.number}`}>
//         <div><strong>Position #{position.number}</strong> ({t('orbits.line')} {position.line})</div>
//         <div>Occupied by: {position.occupant.slice(0, 8)}...{position.occupant.slice(-6)}</div>
//         <div>Amount: {position.amount} USDT</div>
//         <div className="mt-1 small">{position.positionInfo.description}</div>

//         {position.parentPosition && (
//           <div className="text-warning mt-1">
//             Structural parent: Position {position.parentPosition}
//           </div>
//         )}

//         {position.occupantType === 'downline' && (
//           <div className="text-warning mt-1">{t('orbits.directDownlineViewedAddress')}</div>
//         )}

//         {position.occupantType === 'mine' && (
//           <div className="text-success mt-1">{t('orbits.belongsToViewedAddress')}</div>
//         )}

//         {position.positionInfo.payout > 0 && (
//           <div className="text-success mt-1">{t('orbits.directPayoutSlice', { value: position.positionInfo.payout })}</div>
//         )}

//         {position.positionInfo.spillover > 0 && position.occupantType !== 'mine' && (
//           <div className="text-warning mt-1">{t('orbits.routedPayoutSlicesExist')}</div>
//         )}

//         {position.positionInfo.escrow > 0 && (
//           <div className="text-info mt-1">{t('orbits.escrowLocked', { value: position.positionInfo.escrow })}</div>
//         )}
//       </Tooltip>
//     )
//   }

//   if (!isConnected) {
//     return (
//       <Container className="mt-5 pt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="primary" className="text-center p-5 lab-card shadow-lg" style={{ backgroundColor: '#002366', color: 'white', border: 'none' }}>
//           <h4 className="fw-bold">{t('orbits.connectTitle')}</h4>
//           <p className="m-0 opacity-75">{t('orbits.connectText')}</p>
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoading) {
//     return (
//       <Container className="mt-5 text-center">
//         <style>{orbitStyles}</style>
//         <Spinner animation="grow" variant="primary" />
//         <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>{t('orbits.syncing')}</p>
//       </Container>
//     )
//   }

//   if (error) {
//     return (
//       <Container className="mt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="danger" className="lab-card shadow-sm border-0">
//           <strong>{t('orbits.panelError')}:</strong> {error}
//         </Alert>
//       </Container>
//     )
//   }

//   if (orbitError) {
//     return (
//       <Container className="mt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="danger" className="lab-card shadow-sm border-0">
//           <strong className="text-danger">{t('orbits.systemAlert')}:</strong> {orbitError}
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoadingOrbits) {
//     return (
//       <Container className="mt-5 pt-4">
//         <style>{orbitStyles}</style>
//         <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
//           <div className="d-flex align-items-center">
//             <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
//             <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//               {t('orbits.pageTitle')}
//             </h1>
//           </div>
//         </div>

//         <div className="text-center py-5">
//           <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
//           <p className="mt-3 fw-bold text-muted">{t('orbits.loading')}</p>
//         </div>
//       </Container>
//     )
//   }

//   const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
//   const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
//   const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()

//   return (
//     <Container className="mt-5 pt-4">
//       <style>{orbitStyles}</style>

//       <Modal show={showPositionModal} onHide={() => setShowPositionModal(false)} className="position-modal" centered>
//         <Modal.Header closeButton>
//           <Modal.Title>{t('orbits.positionDetails', { number: selectedPosition?.number })}</Modal.Title>
//         </Modal.Header>

//         <Modal.Body>
//           {selectedPosition && (
//             <>
//               <div className="info-row">
//                 <span className="info-label">{t('orbits.positionType')}</span>
//                 <span className="info-value">{selectedPosition.positionInfo?.type?.toUpperCase()}</span>
//               </div>

//               <div className="info-row">
//                 <span className="info-label">{t('orbits.line')}</span>
//                 <span className="info-value">{t('orbits.line')} {selectedPosition.positionInfo?.line}</span>
//               </div>

//               {selectedPosition.parentPosition && (
//                 <div className="info-row">
//                   <span className="info-label">Structural Parent</span>
//                   <span className="info-value">Position {selectedPosition.parentPosition}</span>
//                 </div>
//               )}

//               {selectedPosition.occupant ? (
//                 <>
//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.occupiedBy')}</span>
//                     <span className="info-value">
//                       {selectedPosition.occupantType === 'mine'
//                         ? (isViewingSelf ? t('orbits.you') : t('orbits.viewedOwner'))
//                         : selectedPosition.occupant.slice(0, 10) + '...' + selectedPosition.occupant.slice(-8)}
//                     </span>
//                   </div>

//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.fullAddress')}</span>
//                     <span className="info-value" style={{ fontSize: '0.8rem' }}>
//                       {selectedPosition.occupant}
//                     </span>
//                   </div>

//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.amountEntered')}</span>
//                     <span className="info-value">{selectedPosition.amount} USDT</span>
//                   </div>

//                   {selectedPosition.timestamp > 0 && (
//                     <div className="info-row">
//                       <span className="info-label">{t('orbits.filledOn')}</span>
//                       <span className="info-value">
//                         {new Date(Number(selectedPosition.timestamp) * 1000).toLocaleString()}
//                       </span>
//                     </div>
//                   )}

//                   <div className="commission-breakdown">
//                     <h6 className="fw-bold mb-3">{t('orbits.routingBreakdown')}</h6>
//                     <p className="small text-muted mb-3">{selectedPosition.positionInfo?.description}</p>

//                     {selectedPosition.positionInfo?.payout > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.directRecipientSlice')}</span>
//                         <span className="commission-amount payout">
//                           {selectedPosition.positionInfo.payout}% of orbit amount
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.escrow > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.lockedInEscrow')}</span>
//                         <span className="commission-amount escrow">
//                           {selectedPosition.positionInfo.escrow}% of orbit amount
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.spillover > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.otherRoutedSlices')}</span>
//                         <span className="commission-amount" style={{ color: '#ffc107' }}>
//                           {t('orbits.seePositionRule')}
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.type === 'recycle' && (
//                       <div className="commission-item">
//                         <span>{t('orbits.status')}</span>
//                         <span className="commission-amount" style={{ color: '#6c757d' }}>
//                           {t('orbits.recyclePosition')}
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'downline' && (
//                       <div className="alert alert-warning mt-3 mb-0 small">
//                         <strong>{t('orbits.downlineAlertTitle')}</strong><br />
//                         {selectedPosition.positionInfo?.toUpline
//                           ? t('orbits.downlineAlertPayout')
//                           : t('orbits.downlineAlertEscrow')}
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'mine' && (
//                       <div className="alert alert-success mt-3 mb-0 small">
//                         <strong>{t('orbits.mineAlertTitle')}</strong><br />
//                         {t('orbits.mineAlertText')}
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'other' && selectedPosition.positionInfo?.spillover > 0 && (
//                       <div className="alert alert-info mt-3 mb-0 small">
//                         <strong>{t('orbits.otherAlertTitle')}</strong><br />
//                         {t('orbits.otherAlertText')}
//                       </div>
//                     )}
//                   </div>
//                 </>
//               ) : (
//                 <div className="text-center p-4">
//                   <h5 className="text-muted">{t('orbits.emptyPosition')}</h5>
//                   <p className="small">{t('orbits.availableToBeFilled')}</p>

//                   <div className="commission-breakdown mt-3">
//                     <h6 className="fw-bold mb-2">{t('orbits.whenFilled')}</h6>
//                     <p className="small mb-0">{selectedPosition.positionInfo?.description}</p>
//                     {selectedPosition.parentPosition && (
//                       <p className="small text-warning mt-2">
//                         {t('orbits.structuralParent', { position: selectedPosition.parentPosition })}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </Modal.Body>

//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowPositionModal(false)}>
//             {t('orbits.close')}
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
//         <div className="d-flex align-items-center">
//           <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px', borderRadius: '8px' }}></div>
//           <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//             {t('orbits.pageTitle')}
//           </h1>

//           <div className="view-toggle">
//             <Button
//               variant={viewMode === 'global' ? 'primary' : 'outline-secondary'}
//               size="sm"
//               onClick={() => handleViewModeChange('global')}
//               className={viewMode === 'global' ? 'active' : ''}
//             >
//               {t('orbits.orbitView')}
//             </Button>

//             <Button
//               variant={viewMode === 'downline' ? 'primary' : 'outline-secondary'}
//               size="sm"
//               onClick={() => handleViewModeChange('downline')}
//               className={viewMode === 'downline' ? 'active' : ''}
//             >
//               {t('orbits.downlineView')}
//               {totalDownline > 0 && <Badge bg="warning" className="ms-1">{totalDownline}</Badge>}
//               {totalSpillover > 0 && <Badge bg="info" className="ms-1">{totalSpillover} orbit</Badge>}
//             </Button>
//           </div>
//         </div>

//         <div className="d-flex align-items-center">
//           <span className="text-muted small me-3">{t('orbits.lastSync')}: {lastUpdated}</span>
//           <Button
//             variant="link"
//             className="refresh-button"
//             onClick={refreshData}
//             disabled={isRefreshing || !viewAddress || !ethers.isAddress(viewAddress)}
//           >
//             {isRefreshing ? t('orbits.refreshing') : t('orbits.refresh')}
//           </Button>
//         </div>
//       </div>

//       <div className="lab-card p-3 mb-4">
//         <Row className="align-items-end g-3">
//           <Col lg={8}>
//             <Form.Group>
//               <Form.Label className="fw-bold small text-uppercase text-muted">{t('orbits.addressToView')}</Form.Label>
//               <Form.Control
//                 type="text"
//                 value={inputAddress}
//                 onChange={(e) => setInputAddress(e.target.value)}
//                 placeholder="0x..."
//               />
//               <div className="small text-muted mt-2">
//                 {t('orbits.currentlyViewing')} {viewAddress ? `${viewAddress.slice(0, 8)}...${viewAddress.slice(-6)}` : t('orbits.noAddressSelected')}
//                 {isViewingSelf && ` ${t('orbits.yourWallet')}`}
//               </div>
//             </Form.Group>
//           </Col>

//           <Col lg={4}>
//             <div className="d-flex gap-2">
//               <Button onClick={applyViewerAddress} disabled={!inputAddress || !ethers.isAddress(inputAddress)}>
//                 {t('orbits.loadAddress')}
//               </Button>
//               <Button variant="outline-secondary" onClick={viewMyOrbit} disabled={!account}>
//                 {t('orbits.viewMine')}
//               </Button>
//             </div>
//           </Col>
//         </Row>
//       </div>

//       <div className="color-legend">
//         <div className="legend-item">
//           <div className="legend-color green"></div>
//           <span><strong>{t('orbits.legendViewedOwner')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color orange"></div>
//           <span><strong>{t('orbits.legendDirectDownline')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color blue"></div>
//           <span><strong>{t('orbits.legendOtherUser')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color gold"></div>
//           <span><strong>STRUCTURAL PARENT LINK</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color red"></div>
//           <span><strong>{t('orbits.legendEmpty')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color gray"></div>
//           <span><strong>{t('orbits.legendInactive')}</strong></span>
//         </div>
//       </div>

//       <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 border-0">
//         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//           const data = orbitData[level]
//           if (!data) return null

//           const { config, positions, currentIndex, autoUpgradeCompleted, totalCycles, orbitType } = data
//           const downlineAtLevel = downlineData[level] || []
//           const spilloverAtLevel = spilloverData[level] || []
//           const levelInfo = levelConfig[level]
//           const isLevelActive = !!viewedLevels[level]

//           const positionsByLine = {}
//           positions.forEach(pos => {
//             const line = pos.line
//             if (!positionsByLine[line]) positionsByLine[line] = []
//             positionsByLine[line].push(pos)
//           })

//           const structure = getOrbitStructure(orbitType)

//           return (
//             <Tab
//               key={level}
//               eventKey={`level${level}`}
//               title={
//                 <span>
//                   Level {level} ({data.orbitType})
//                   {!isLevelActive && <Badge bg="secondary" className="ms-2">{t('orbits.inactive')}</Badge>}
//                   {downlineAtLevel.length > 0 && <Badge bg="warning" className="ms-2">{downlineAtLevel.length}</Badge>}
//                   {spilloverAtLevel.length > 0 && <Badge bg="info" className="ms-2">{spilloverAtLevel.length}s</Badge>}
//                   {autoUpgradeCompleted && <Badge bg="success" className="ms-2">{t('orbits.upgraded')}</Badge>}
//                 </span>
//               }
//             >
//               <Row>
//                 <Col lg={8}>
//                   <div className="lab-card mb-4">
//                     <div className="orbit-header d-flex justify-content-between align-items-center">
//                       <span>
//                         Level {level} ({data.orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}
//                         {totalCycles > 0 && <span className="cycle-badge ms-3">{t('orbits.cycle', { count: Number(totalCycles) + 1 })}</span>}
//                       </span>
//                       <div>
//                         {!isLevelActive && <Badge bg="secondary" className="me-2">{t('orbits.inactiveLevel')}</Badge>}
//                         {downlineAtLevel.length > 0 && <Badge bg="warning" className="me-2">{t('orbits.downlineCount', { count: downlineAtLevel.length })}</Badge>}
//                         {spilloverAtLevel.length > 0 && <Badge bg="info" className="me-2">{t('orbits.orbitCount', { count: spilloverAtLevel.length })}</Badge>}
//                         <Badge bg="info">{currentIndex || 1}/{config.positions} filled</Badge>
//                       </div>
//                     </div>

//                     <div className="p-4">
//                       <div className={`galaxy-container ${orbitType.toLowerCase()}`} ref={activeTab === `level${level}` ? galaxyRef : null}>
//                         <div className="galaxy-grid"></div>

//                         <div className="star-field">
//                           {starConfig.map((star) => (
//                             <span
//                               key={star.id}
//                               className="star"
//                               style={{
//                                 left: star.left,
//                                 top: star.top,
//                                 width: star.size,
//                                 height: star.size,
//                                 opacity: star.opacity,
//                                 animationDelay: `${star.delay}, ${star.delay}`,
//                                 animationDuration: `${star.duration}, ${star.drift}`
//                               }}
//                             />
//                           ))}
//                         </div>

//                         <div className="galaxy-inner">
//                           {(() => {
//                             const outerWidth = containerSize.width > 0 ? containerSize.width : 560
//                             const outerHeight = containerSize.height > 0 ? containerSize.height : 560
//                             const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
//                             const stageSize = usableSize
//                             const centerX = stageSize / 2
//                             const centerY = stageSize / 2

//                             const planetSize = getPlanetSize(orbitType, stageSize)
//                             const coreSize = getCoreSize(orbitType, stageSize)
//                             const nodePadding = planetSize / 2 + 8
//                             const coreClearance = coreSize / 2 + planetSize / 2 + 16

//                             let ringRadiiPx = {
//                               1: Math.max(coreClearance, stageSize * 0.22),
//                               2: stageSize * 0.34,
//                               3: stageSize * 0.45
//                             }

//                             if (orbitType === 'P4') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance + 6, stageSize * 0.31)
//                               }
//                             }

//                             if (orbitType === 'P12') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance + 2, stageSize * 0.21),
//                                 2: Math.min(stageSize * 0.39, (stageSize / 2) - nodePadding)
//                               }
//                             }

//                             if (orbitType === 'P39') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance, stageSize * 0.16),
//                                 2: stageSize * 0.28,
//                                 3: Math.min(stageSize * 0.40, (stageSize / 2) - nodePadding)
//                               }
//                             }

//                             Object.keys(ringRadiiPx).forEach(key => {
//                               ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding)
//                             })

//                             const createEmptyPosition = (posNumber, lineNum) => ({
//                               number: posNumber,
//                               occupantType: 'empty',
//                               occupant: null,
//                               amount: '0',
//                               timestamp: 0,
//                               positionInfo: getPositionInfo(orbitType, posNumber, level, autoUpgradeCompleted),
//                               line: lineNum,
//                               spillsTo: null,
//                               parentPosition: getStructuralParentPosition(orbitType, posNumber)
//                             })

//                             const allPositionMap = {}
//                             structure.lines.forEach(lineNum => {
//                               const linePositions = positionsByLine[lineNum] || []
//                               structure.positions[lineNum].forEach(posNumber => {
//                                 allPositionMap[posNumber] = linePositions.find(p => p.number === posNumber) || createEmptyPosition(posNumber, lineNum)
//                               })
//                             })

//                             const getCoordsForPosition = (posNumber, lineNum, index) => {
//                               const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
//                               if (typeof customAngle === 'number') {
//                                 return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
//                               }

//                               return getPositionOnRing(
//                                 index,
//                                 structure.counts[lineNum],
//                                 ringRadiiPx[lineNum],
//                                 centerX,
//                                 centerY,
//                                 structure.startAngles[lineNum]
//                               )
//                             }

//                             return (
//                               <div
//                                 className="galaxy-stage"
//                                 style={{
//                                   width: stageSize,
//                                   height: stageSize,
//                                   left: '50%',
//                                   top: '50%',
//                                   transform: 'translate(-50%, -50%)'
//                                 }}
//                               >
//                                 <div
//                                   className={`orbit-core ${!isLevelActive ? 'orbit-core-inactive' : ''}`}
//                                   style={{
//                                     width: coreSize,
//                                     height: coreSize
//                                   }}
//                                 >
//                                   <span className="core-label">{isLevelActive ? t('orbits.owner') : t('orbits.inactiveCore')}</span>
//                                   <span className="core-value">
//                                     {isLevelActive
//                                       ? (isViewingSelf ? t('orbits.you') : t('orbits.view'))
//                                       : t('orbits.levelOff')}
//                                   </span>
//                                 </div>

//                                 {structure.lines.map(lineNum => {
//                                   const linePositions = positionsByLine[lineNum] || []
//                                   const filledCount = linePositions.filter(p => p.occupant).length
//                                   const diameter = ringRadiiPx[lineNum] * 2

//                                   return (
//                                     <div
//                                       key={lineNum}
//                                       className={`orbit-ring line${lineNum}`}
//                                       style={{
//                                         width: diameter,
//                                         height: diameter
//                                       }}
//                                     >
//                                       <span className="ring-label">LINE {lineNum}</span>
//                                       <span className="ring-stats">
//                                         {filledCount}/{structure.positions[lineNum].length} • {config.linePayouts[lineNum - 1]} • {config.lineSpillovers[lineNum - 1]}
//                                       </span>
//                                     </div>
//                                   )
//                                 })}

//                                 <>
//                                   {structure.lines.map(lineNum => {
//                                     const positionNumbers = structure.positions[lineNum]

//                                     return positionNumbers.map((posNumber, index) => {
//                                       const pos = allPositionMap[posNumber]
//                                       const coords = getCoordsForPosition(posNumber, lineNum, index)

//                                       let planetClass = 'planet-node '
//                                       if (pos.occupantType === 'mine') {
//                                         planetClass += 'planet-my-position'
//                                       } else if (pos.occupantType === 'downline') {
//                                         planetClass += 'planet-downline'
//                                       } else if (pos.occupantType === 'other') {
//                                         planetClass += 'planet-other'
//                                       } else {
//                                         planetClass += 'planet-empty'
//                                       }

//                                       if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) {
//                                         planetClass += ' planet-structural-preview'
//                                       }

//                                       return (
//                                         <OverlayTrigger
//                                           key={pos.number}
//                                           placement="top"
//                                           overlay={renderPositionTooltip(pos)}
//                                           delay={{ show: 250, hide: 100 }}
//                                         >
//                                           <div
//                                             className={planetClass}
//                                             style={{
//                                               left: coords.x,
//                                               top: coords.y,
//                                               width: planetSize,
//                                               height: planetSize,
//                                               transform: 'translate(-50%, -50%)',
//                                               '--index': index
//                                             }}
//                                             onClick={() => handlePositionClick(pos)}
//                                             onMouseEnter={() => {
//                                               setHoveredPosition(pos)
//                                               if (pos.parentPosition) handleStructuralPreview(pos)
//                                             }}
//                                             onMouseLeave={() => setHoveredPosition(null)}
//                                           >
//                                             <div className="planet-content">
//                                               <span className="node-number">{pos.number}</span>

//                                               {pos.occupant && (
//                                                 <span className="planet-icon">
//                                                   {pos.occupantType === 'mine' ? '👤' : pos.occupantType === 'downline' ? '⬇️' : '👥'}
//                                                 </span>
//                                               )}

//                                               {pos.positionInfo.payout > 0 && pos.occupantType !== 'mine' && (
//                                                 <span className="planet-earn-badge">
//                                                   {pos.positionInfo.payout}%
//                                                 </span>
//                                               )}
//                                             </div>
//                                           </div>
//                                         </OverlayTrigger>
//                                       )
//                                     })
//                                   })}

//                                   {data.spilloverFromPositions.map((conn, idx) => {
//                                     const fromPos = allPositionMap[conn.from]
//                                     const toPos = allPositionMap[conn.to]

//                                     if (!fromPos || !toPos || !fromPos.occupant || !toPos) return null

//                                     const fromLine = fromPos.line
//                                     const toLine = toPos.line
//                                     const fromIndex = structure.positions[fromLine].indexOf(fromPos.number)
//                                     const toIndex = structure.positions[toLine].indexOf(toPos.number)

//                                     if (fromIndex < 0 || toIndex < 0) return null

//                                     const fromCoords = (() => {
//                                       const customAngle = structure.customAngles?.[fromLine]?.[fromPos.number]
//                                       if (typeof customAngle === 'number') {
//                                         return getPositionOnAngle(customAngle, ringRadiiPx[fromLine], centerX, centerY)
//                                       }
//                                       return getPositionOnRing(
//                                         fromIndex,
//                                         structure.counts[fromLine],
//                                         ringRadiiPx[fromLine],
//                                         centerX,
//                                         centerY,
//                                         structure.startAngles[fromLine]
//                                       )
//                                     })()

//                                     const toCoords = (() => {
//                                       const customAngle = structure.customAngles?.[toLine]?.[toPos.number]
//                                       if (typeof customAngle === 'number') {
//                                         return getPositionOnAngle(customAngle, ringRadiiPx[toLine], centerX, centerY)
//                                       }
//                                       return getPositionOnRing(
//                                         toIndex,
//                                         structure.counts[toLine],
//                                         ringRadiiPx[toLine],
//                                         centerX,
//                                         centerY,
//                                         structure.startAngles[toLine]
//                                       )
//                                     })()

//                                     const dx = toCoords.x - fromCoords.x
//                                     const dy = toCoords.y - fromCoords.y
//                                     const distance = Math.sqrt(dx * dx + dy * dy)
//                                     const angle = Math.atan2(dy, dx) * 180 / Math.PI

//                                     return (
//                                       <div key={`conn-${idx}`}>
//                                         <div
//                                           className="structural-connection"
//                                           style={{
//                                             width: distance,
//                                             left: fromCoords.x,
//                                             top: fromCoords.y,
//                                             transform: `rotate(${angle}deg)`
//                                           }}
//                                         />
//                                       </div>
//                                     )
//                                   })}
//                                 </>
//                               </div>
//                             )
//                           })()}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </Col>

//                 <Col lg={4}>
//                   <div className="lab-card energy-cell h-100">
//                     <div className="orbit-header">{t('orbits.escrowAutoUpgrade')}</div>
//                     <div className="p-4 pulse-overlay">
//                       <div className="small fw-bold text-muted text-uppercase mb-2">
//                         {t('orbits.lockedForLevel', { level: levelInfo.nextLevel })}
//                       </div>

//                       <h3 className="fw-black mb-3" style={{ color: '#002366', fontFamily: 'monospace' }}>
//                         {userLocks[level] || '0'} <span className="small text-muted">/ {levelInfo.upgradeReq} USDT</span>
//                       </h3>

//                       <ProgressBar
//                         now={((parseFloat(userLocks[level] || '0') / levelInfo.upgradeReq) * 100) || 0}
//                         variant="primary"
//                         className="mb-3"
//                       />

//                       <div className="p-3 bg-light rounded-3 small fw-bold text-center">
//                         {!isLevelActive ? (
//                           <span className="text-secondary">{t('orbits.levelInactiveForAddress', { level })}</span>
//                         ) : parseFloat(userLocks[level] || '0') >= levelInfo.upgradeReq ? (
//                           autoUpgradeCompleted ? (
//                             <span className="text-success">{t('orbits.levelAlreadyActivated', { level: levelInfo.nextLevel })}</span>
//                           ) : (
//                             <span className="text-success">{t('orbits.autoUpgradeReady', { level: levelInfo.nextLevel })}</span>
//                           )
//                         ) : (
//                           t('orbits.needMoreUsdt', {
//                             amount: (levelInfo.upgradeReq - parseFloat(userLocks[level] || '0')).toFixed(1)
//                           })
//                         )}
//                       </div>

//                       <hr className="my-4" />

//                       <div className="small fw-bold text-muted text-uppercase mb-2">{t('orbits.totalDirectEarned')}</div>
//                       <h4 className="fw-bold" style={{ color: '#28a745' }}>{data.totalEarned} USDT</h4>

//                       {viewMode === 'downline' && (
//                         <>
//                           {downlineAtLevel.length > 0 && (
//                             <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-3">
//                               <h6 className="fw-bold mb-2">{t('orbits.directDownlineAtLevel', { level })}</h6>
//                               <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
//                                 {downlineAtLevel.map((d, idx) => (
//                                   <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
//                                     <div>
//                                       <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
//                                         {d.user.slice(0, 8)}...{d.user.slice(-6)}
//                                       </span>
//                                       <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
//                                       <small className="text-muted d-block">{t('orbits.amountShort', { amount: d.amount })}</small>
//                                     </div>
//                                     <Badge bg={d.positionInfo.toUpline ? 'success' : 'secondary'}>
//                                       {d.positionInfo.toUpline ? '💰' : '🔒'}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           )}

//                           {spilloverAtLevel.length > 0 && (
//                             <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-3">
//                               <h6 className="fw-bold mb-2">{t('orbits.otherParticipantsAtLevel', { level })}</h6>
//                               <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
//                                 {spilloverAtLevel.map((d, idx) => (
//                                   <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
//                                     <div>
//                                       <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
//                                         {d.user.slice(0, 8)}...{d.user.slice(-6)}
//                                       </span>
//                                       <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
//                                       <small className="text-muted d-block">From: {d.originalReferrer?.slice(0, 6)}...</small>
//                                     </div>
//                                     <Badge bg="info">
//                                       {t('orbits.routedByRule')}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           )}

//                           {downlineAtLevel.length === 0 && spilloverAtLevel.length === 0 && (
//                             <div className="mt-4 p-3 bg-light rounded-3 text-center text-muted small">
//                               {t('orbits.noDownlineYet')}
//                             </div>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </Col>
//               </Row>
//             </Tab>
//           )
//         })}
//       </Tabs>
//     </Container>
//   )
// }




















//THIS IS ALSO GOOD BUT THE CODE ABOVE THIS ONE IS PREFERABLE
// import React, { useState, useEffect, useRef, useCallback } from 'react'
// import { Container, Row, Col, Tabs, Tab, Alert, Spinner, ProgressBar, Button, Badge, Modal, OverlayTrigger, Tooltip, Form } from 'react-bootstrap'
// import { useWallet } from '../hooks/useWallet'
// import { useContracts } from '../hooks/useContracts'
// import { ethers } from 'ethers'
// import { useTranslation } from 'react-i18next'

// export const Orbits = () => {
//   console.log('Debug: This is the new file')

//   const { isConnected, account } = useWallet()
//   const { contracts, isLoading, error, loadContracts } = useContracts()
//   const { t } = useTranslation()

//   const [orbitData, setOrbitData] = useState({})
//   const [userLocks, setUserLocks] = useState({})
//   const [downlineData, setDownlineData] = useState({})
//   const [spilloverData, setSpilloverData] = useState({})
//   const [orbitError, setOrbitError] = useState('')
//   const [viewMode, setViewMode] = useState('global')
//   const [selectedPosition, setSelectedPosition] = useState(null)
//   const [showPositionModal, setShowPositionModal] = useState(false)
//   const [hoveredPosition, setHoveredPosition] = useState(null)
//   const [showSpilloverPreview, setShowSpilloverPreview] = useState(false)
//   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
//   const [viewAddress, setViewAddress] = useState('')
//   const [inputAddress, setInputAddress] = useState('')
//   const [viewedLevels, setViewedLevels] = useState({})

//   const galaxyRef = useRef(null)
//   const referrerCacheRef = useRef(new Map())
//   const viewedLevelsCacheRef = useRef(new Map())
//   const fetchIdRef = useRef(0)

//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
//   const [isRefreshing, setIsRefreshing] = useState(false)
//   const [activeTab, setActiveTab] = useState('level1')
//   const [isLoadingOrbits, setIsLoadingOrbits] = useState(true)

//   const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

//   const chunkArray = (arr, size) => {
//     const chunks = []
//     for (let i = 0; i < arr.length; i += size) {
//       chunks.push(arr.slice(i, i + size))
//     }
//     return chunks
//   }

//   const withRetry = useCallback(async (fn, retries = 2, wait = 700) => {
//     try {
//       return await fn()
//     } catch (err) {
//       const code = err?.code || err?.info?.error?.code
//       const msg = String(err?.message || '')
//       const isRateLimited =
//         code === -32005 ||
//         err?.status === 429 ||
//         msg.includes('rate limited') ||
//         msg.includes('429')

//       if (!isRateLimited || retries <= 0) {
//         throw err
//       }

//       await delay(wait)
//       return withRetry(fn, retries - 1, wait * 2)
//     }
//   }, [])

//   const getCachedReferrer = useCallback(async (address) => {
//     const key = address.toLowerCase()
//     if (referrerCacheRef.current.has(key)) {
//       return referrerCacheRef.current.get(key)
//     }

//     const referrer = await withRetry(() => contracts.registration.getReferrer(address))
//     referrerCacheRef.current.set(key, referrer)
//     return referrer
//   }, [contracts, withRetry])

//   useEffect(() => {
//     if (account && !viewAddress) {
//       setViewAddress(account)
//       setInputAddress(account)
//     }
//   }, [account, viewAddress])

//   useEffect(() => {
//     const updateSize = () => {
//       if (galaxyRef.current) {
//         const { width, height } = galaxyRef.current.getBoundingClientRect()
//         if (width > 0 && height > 0 && (width !== containerSize.width || height !== containerSize.height)) {
//           setContainerSize({ width, height })
//         }
//       }
//     }

//     const timer = setTimeout(updateSize, 120)
//     window.addEventListener('resize', updateSize)

//     let resizeObserver
//     if (window.ResizeObserver) {
//       resizeObserver = new ResizeObserver(updateSize)
//       if (galaxyRef.current) {
//         resizeObserver.observe(galaxyRef.current)
//       }
//     }

//     return () => {
//       window.removeEventListener('resize', updateSize)
//       if (resizeObserver) resizeObserver.disconnect()
//       clearTimeout(timer)
//     }
//   }, [activeTab, orbitData, containerSize.width, containerSize.height])

//   useEffect(() => {
//     if (Object.keys(orbitData).length > 0 && galaxyRef.current) {
//       const { width, height } = galaxyRef.current.getBoundingClientRect()
//       if (width > 0 && height > 0) {
//         setContainerSize({ width, height })
//       }
//     }
//   }, [orbitData, activeTab])

//   const orbitStyles = `
//     @keyframes pulse-line {
//       0% { background-position: 0% 50%; }
//       100% { background-position: 200% 50%; }
//     }
//     @keyframes orbit-glow {
//       0%, 100% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.08), 0 0 12px rgba(0, 68, 204, 0.08) inset; }
//       50% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.15), 0 0 20px rgba(0, 68, 204, 0.12) inset; }
//     }
//     @keyframes spillover-pulse {
//       0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
//       70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
//       100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
//     }
//     @keyframes rotate-slow {
//       from { transform: translate(-50%, -50%) rotate(0deg); }
//       to { transform: translate(-50%, -50%) rotate(360deg); }
//     }
//     @keyframes rotate-reverse {
//       from { transform: translate(-50%, -50%) rotate(360deg); }
//       to { transform: translate(-50%, -50%) rotate(0deg); }
//     }
//     @keyframes float {
//       0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
//       50% { transform: translate(-50%, -50%) translateY(-4px); }
//     }
//     @keyframes core-pulse {
//       0%, 100% { box-shadow: 0 0 28px rgba(0,35,102,0.35), 0 0 60px rgba(0,68,204,0.12); }
//       50% { box-shadow: 0 0 36px rgba(0,35,102,0.45), 0 0 75px rgba(0,68,204,0.18); }
//     }
//     @keyframes core-pulse-inactive {
//       0%, 100% { box-shadow: 0 0 18px rgba(108,117,125,0.18), 0 0 36px rgba(108,117,125,0.08); }
//       50% { box-shadow: 0 0 24px rgba(108,117,125,0.22), 0 0 48px rgba(108,117,125,0.12); }
//     }
//     @keyframes twinkle {
//       0%, 100% { opacity: 0.18; transform: scale(1); }
//       50% { opacity: 0.95; transform: scale(1.55); }
//     }
//     @keyframes drift {
//       0% { transform: translateY(0px) translateX(0px); }
//       50% { transform: translateY(-3px) translateX(2px); }
//       100% { transform: translateY(0px) translateX(0px); }
//     }
//     @keyframes glow-border {
//       0%, 100% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 18px 50px rgba(0,35,102,0.05); }
//       50% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 22px 60px rgba(0,35,102,0.08); }
//     }
//     .lab-card {
//       background: rgba(255, 255, 255, 0.82);
//       border: 1px solid rgba(255, 255, 255, 0.45);
//       border-radius: 24px;
//       box-shadow: 0 14px 40px rgba(0, 35, 102, 0.06);
//       overflow: hidden;
//       backdrop-filter: blur(14px);
//       -webkit-backdrop-filter: blur(14px);
//     }
//     .orbit-header {
//       background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
//       color: white;
//       font-family: 'monospace';
//       font-size: 0.85rem;
//       padding: 10px 20px;
//       text-transform: uppercase;
//       letter-spacing: 2px;
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       box-shadow: inset 0 -1px 0 rgba(255,255,255,0.08);
//     }
//     .cycle-badge {
//       background: linear-gradient(135deg, #ffd54f 0%, #ffc107 100%);
//       color: #002366;
//       font-weight: bold;
//       padding: 2px 8px;
//       border-radius: 12px;
//       font-size: 0.7rem;
//       box-shadow: 0 4px 10px rgba(255,193,7,0.25);
//     }
//     .galaxy-container {
//       position: relative;
//       width: 100%;
//       aspect-ratio: 1 / 1;
//       max-width: 660px;
//       margin: 20px auto;
//       min-height: 320px;
//       border-radius: 34px;
//       overflow: hidden;
//       background:
//         radial-gradient(circle at 50% 50%, rgba(27, 75, 196, 0.08) 0%, rgba(5, 22, 62, 0.06) 28%, rgba(2, 10, 33, 0.94) 74%, rgba(0, 7, 24, 0.98) 100%);
//       border: 1px solid rgba(255,255,255,0.08);
//       box-shadow:
//         inset 0 0 80px rgba(0, 119, 255, 0.06),
//         inset 0 0 24px rgba(255,255,255,0.03),
//         0 24px 60px rgba(0,35,102,0.12);
//       animation: glow-border 6s ease-in-out infinite;
//     }
//     .galaxy-container::before {
//       content: '';
//       position: absolute;
//       inset: 0;
//       background:
//         radial-gradient(circle at 20% 18%, rgba(0, 174, 255, 0.10), transparent 16%),
//         radial-gradient(circle at 82% 24%, rgba(132, 94, 255, 0.08), transparent 18%),
//         radial-gradient(circle at 52% 80%, rgba(255, 193, 7, 0.06), transparent 20%);
//       pointer-events: none;
//       z-index: 0;
//     }
//     .galaxy-grid {
//       position: absolute;
//       inset: 0;
//       border-radius: 34px;
//       pointer-events: none;
//       background-image:
//         linear-gradient(rgba(82, 145, 255, 0.045) 1px, transparent 1px),
//         linear-gradient(90deg, rgba(82, 145, 255, 0.045) 1px, transparent 1px);
//       background-size: 28px 28px;
//       mask-image: radial-gradient(circle at center, black 0%, rgba(0,0,0,0.82) 56%, transparent 90%);
//       opacity: 0.35;
//       z-index: 1;
//     }
//     .star-field {
//       position: absolute;
//       inset: 0;
//       pointer-events: none;
//       z-index: 1;
//     }
//     .star {
//       position: absolute;
//       border-radius: 50%;
//       background: rgba(255,255,255,0.95);
//       box-shadow: 0 0 6px rgba(255,255,255,0.4);
//       animation: twinkle 3.2s ease-in-out infinite, drift 8s ease-in-out infinite;
//     }
//     .galaxy-inner {
//       position: absolute;
//       inset: 0;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       z-index: 2;
//     }
//     .galaxy-stage {
//       position: absolute;
//       inset: 7%;
//       border-radius: 50%;
//     }
//     .orbit-ring {
//       position: absolute;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       border-radius: 50%;
//       pointer-events: none;
//       transition: all 0.3s ease;
//       animation: orbit-glow 4.2s ease-in-out infinite;
//       background: radial-gradient(circle at center, transparent 96%, rgba(255,255,255,0.22) 100%);
//       overflow: visible;
//     }
//     .orbit-ring::before {
//       content: '';
//       position: absolute;
//       inset: -10px;
//       border-radius: 50%;
//       border: 1px solid rgba(255,255,255,0.03);
//       pointer-events: none;
//     }
//     .orbit-ring.line1 {
//       border: 2px solid rgba(89, 150, 255, 0.36);
//       animation: orbit-glow 4.2s ease-in-out infinite, rotate-slow 30s linear infinite;
//     }
//     .orbit-ring.line2 {
//       border: 2px dashed rgba(89, 150, 255, 0.26);
//       animation: orbit-glow 5.2s ease-in-out infinite, rotate-reverse 48s linear infinite;
//     }
//     .orbit-ring.line3 {
//       border: 2px dotted rgba(89, 150, 255, 0.20);
//       animation: orbit-glow 6.2s ease-in-out infinite, rotate-slow 75s linear infinite;
//     }
//     .ring-label {
//       position: absolute;
//       top: -14px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: rgba(255,255,255,0.12);
//       color: #dce9ff;
//       padding: 5px 13px;
//       border-radius: 999px;
//       font-size: 0.66rem;
//       font-weight: 700;
//       text-transform: uppercase;
//       letter-spacing: 1.3px;
//       white-space: nowrap;
//       pointer-events: none;
//       backdrop-filter: blur(10px);
//       border: 1px solid rgba(255,255,255,0.10);
//       box-shadow: 0 10px 24px rgba(0,0,0,0.18);
//     }
//     .ring-stats {
//       position: absolute;
//       bottom: -14px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: rgba(255,255,255,0.10);
//       color: #bfd4ff;
//       padding: 5px 12px;
//       border-radius: 999px;
//       font-size: 0.62rem;
//       font-weight: 700;
//       white-space: nowrap;
//       pointer-events: none;
//       box-shadow: 0 10px 24px rgba(0,0,0,0.16);
//       border: 1px solid rgba(255,255,255,0.08);
//       backdrop-filter: blur(10px);
//     }
//     .planet-node {
//       position: absolute;
//       width: 44px;
//       height: 44px;
//       border-radius: 50%;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       cursor: pointer;
//       transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.28s ease, filter 0.28s ease, border-color 0.28s ease;
//       z-index: 10;
//       box-shadow: 0 8px 20px rgba(0,0,0,0.28);
//       border: 2px solid rgba(255,255,255,0.90);
//       animation: float 4s ease-in-out infinite;
//       animation-delay: calc(var(--index) * 0.12s);
//       will-change: transform;
//       backdrop-filter: blur(8px);
//       -webkit-backdrop-filter: blur(8px);
//     }
//     .planet-node:hover {
//       transform: translate(-50%, -50%) scale(1.18);
//       z-index: 100;
//       box-shadow: 0 14px 32px rgba(0,0,0,0.30), 0 0 20px rgba(92, 154, 255, 0.14);
//       filter: saturate(1.08) brightness(1.04);
//       animation: none;
//       border-color: rgba(255,255,255,1);
//     }
//     @media (max-width: 768px) {
//       .planet-node {
//         width: 36px;
//         height: 36px;
//       }
//       .galaxy-container.p39 .planet-node {
//         width: 28px;
//         height: 28px;
//       }
//     }
//     @media (max-width: 480px) {
//       .planet-node {
//         width: 30px;
//         height: 30px;
//       }
//       .galaxy-container.p39 .planet-node {
//         width: 24px;
//         height: 24px;
//       }
//       .ring-label,
//       .ring-stats {
//         font-size: 0.56rem;
//         padding: 3px 8px;
//       }
//     }
//     .galaxy-container.p39 .planet-node {
//       width: 38px;
//       height: 38px;
//     }
//     .galaxy-container.p39 .node-number {
//       font-size: 14px;
//     }
//     .planet-my-position {
//       background: linear-gradient(135deg, rgba(40, 167, 69, 0.95) 0%, rgba(32, 201, 151, 0.95) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(40, 167, 69, 0.46), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-downline {
//       background: linear-gradient(135deg, rgba(255, 193, 7, 0.96) 0%, rgba(253, 126, 20, 0.96) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(255, 193, 7, 0.26), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-other {
//       background: linear-gradient(135deg, rgba(0, 102, 204, 0.96) 0%, rgba(0, 153, 255, 0.96) 100%);
//       color: white;
//       box-shadow: 0 0 20px rgba(0, 102, 204, 0.22), 0 10px 24px rgba(0,0,0,0.20);
//     }
//     .planet-empty {
//       background: rgba(255, 255, 255, 0.92);
//       color: #dc3545;
//       border: 2px solid rgba(255, 107, 107, 0.95) !important;
//       box-shadow: 0 8px 20px rgba(220, 53, 69, 0.10), 0 10px 24px rgba(0,0,0,0.16);
//     }
//     .planet-spillover-preview {
//       background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%);
//       color: white;
//       animation: spillover-pulse 2s infinite !important;
//       z-index: 50;
//     }
//     .planet-content {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       width: 100%;
//       height: 100%;
//       position: relative;
//     }
//     .node-number {
//       font-size: 16px;
//       font-weight: 800;
//       text-shadow: 0 1px 2px rgba(0,0,0,0.22);
//       line-height: 1;
//     }
//     .planet-icon {
//       position: absolute;
//       top: -4px;
//       right: -4px;
//       background: linear-gradient(135deg, #ffe082 0%, #ffc107 100%);
//       color: #002366;
//       border-radius: 50%;
//       width: 18px;
//       height: 18px;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-size: 10px;
//       font-weight: bold;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.22);
//       border: 1px solid white;
//     }
//     .planet-earn-badge {
//       position: absolute;
//       top: -8px;
//       left: -8px;
//       background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
//       color: white;
//       border-radius: 12px;
//       padding: 2px 6px;
//       font-size: 9px;
//       font-weight: bold;
//       white-space: nowrap;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.20);
//       border: 1px solid white;
//     }
//     .spillover-connection {
//       position: absolute;
//       background: linear-gradient(90deg, rgba(255,193,7,0.96), rgba(253,126,20,0.96));
//       height: 2px;
//       transform-origin: 0 0;
//       z-index: 5;
//       pointer-events: none;
//       box-shadow: 0 0 10px rgba(255,193,7,0.52);
//       border-radius: 999px;
//     }
//     .connection-label {
//       position: absolute;
//       background: rgba(255, 193, 7, 0.96);
//       color: #002366;
//       padding: 2px 6px;
//       border-radius: 10px;
//       font-size: 8px;
//       font-weight: bold;
//       transform: translate(-50%, -50%);
//       white-space: nowrap;
//       z-index: 6;
//       border: 1px solid white;
//       box-shadow: 0 4px 10px rgba(0,0,0,0.18);
//     }
//     .orbit-core {
//       position: absolute;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       width: 96px;
//       height: 96px;
//       background: radial-gradient(circle at 30% 30%, rgba(40, 129, 255, 1), rgba(0, 35, 102, 1));
//       border-radius: 50%;
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       color: white;
//       font-weight: bold;
//       box-shadow: 0 0 40px rgba(0,35,102,0.35);
//       border: 3px solid rgba(255,255,255,0.95);
//       z-index: 20;
//       animation: core-pulse 3.2s ease-in-out infinite;
//       backdrop-filter: blur(12px);
//     }
//     .orbit-core-inactive {
//       background: radial-gradient(circle at 30% 30%, rgba(173, 181, 189, 0.96), rgba(73, 80, 87, 0.96));
//       color: #f8f9fa;
//       box-shadow: 0 0 24px rgba(108,117,125,0.24);
//       border: 3px solid rgba(255,255,255,0.75);
//       animation: core-pulse-inactive 3.2s ease-in-out infinite;
//     }
//     .orbit-core::before {
//       content: '';
//       position: absolute;
//       inset: -7px;
//       border-radius: 50%;
//       border: 1px solid rgba(255,255,255,0.10);
//       box-shadow: 0 0 18px rgba(0, 119, 255, 0.20);
//       pointer-events: none;
//     }
//     .orbit-core-inactive::before {
//       box-shadow: 0 0 12px rgba(108,117,125,0.18);
//     }
//     @media (max-width: 768px) {
//       .orbit-core {
//         width: 74px;
//         height: 74px;
//       }
//     }
//     .galaxy-container.p39 .orbit-core {
//       width: 82px;
//       height: 82px;
//     }
//     @media (max-width: 768px) {
//       .galaxy-container.p39 .orbit-core {
//         width: 66px;
//         height: 66px;
//       }
//     }
//     .core-label {
//       font-size: 10px;
//       text-transform: uppercase;
//       opacity: 0.88;
//       letter-spacing: 1.2px;
//     }
//     .core-value {
//       font-size: 16px;
//       font-weight: 800;
//       text-shadow: 0 2px 4px rgba(0,0,0,0.30);
//       text-align: center;
//       line-height: 1.1;
//     }
//     .color-legend {
//       display: flex;
//       gap: 20px;
//       margin-bottom: 20px;
//       padding: 15px;
//       background: rgba(248, 249, 250, 0.82);
//       border-radius: 16px;
//       flex-wrap: wrap;
//       justify-content: center;
//       border: 1px solid rgba(0,35,102,0.06);
//       backdrop-filter: blur(8px);
//     }
//     .legend-item {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       font-size: 0.85rem;
//     }
//     .legend-color {
//       width: 20px;
//       height: 20px;
//       border-radius: 50%;
//       box-shadow: 0 6px 14px rgba(0,0,0,0.10);
//     }
//     .legend-color.green { background: #28a745; }
//     .legend-color.orange { background: #fd7e14; }
//     .legend-color.blue { background: #0066cc; }
//     .legend-color.purple { background: #9c27b0; }
//     .legend-color.red {
//       background: white;
//       border: 2px solid #dc3545;
//     }
//     .legend-color.gray {
//       background: linear-gradient(135deg, #adb5bd 0%, #495057 100%);
//     }
//     .energy-cell .progress {
//       height: 12px;
//       background: rgba(240, 244, 248, 0.8);
//       border-radius: 10px;
//       overflow: hidden;
//       border: 1px solid rgba(0,0,0,0.04);
//       backdrop-filter: blur(6px);
//     }
//     .pulse-overlay {
//       background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.02) 45%, rgba(0, 68, 204, 0.08) 50%, rgba(0, 35, 102, 0.02) 55%, transparent 100%);
//       background-size: 200% 100%;
//       animation: pulse-line 5s linear infinite;
//     }
//     .nav-tabs .nav-link {
//       border: none;
//       color: #666;
//       font-weight: 700;
//       text-transform: uppercase;
//       font-size: 0.8rem;
//       letter-spacing: 1px;
//       padding: 15px 25px;
//     }
//     .nav-tabs .nav-link.active {
//       color: #002366;
//       border-bottom: 3px solid #002366;
//       background: transparent;
//     }
//     .refresh-button {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white;
//       border: none;
//       border-radius: 10px;
//       padding: 6px 16px;
//       font-size: 0.8rem;
//       cursor: pointer;
//       transition: all 0.3s ease;
//       box-shadow: 0 10px 20px rgba(0,68,204,0.16);
//     }
//     .refresh-button:hover {
//       background: linear-gradient(135deg, #003085 0%, #0055ff 100%);
//       transform: translateY(-1px);
//       color: white;
//     }
//     .view-toggle {
//       display: flex;
//       gap: 10px;
//       margin-left: 20px;
//       flex-wrap: wrap;
//     }
//     .view-toggle .btn {
//       border-radius: 999px;
//       padding: 6px 16px;
//       font-size: 0.8rem;
//       box-shadow: 0 8px 18px rgba(0,0,0,0.04);
//     }
//     .view-toggle .btn.active {
//       background: linear-gradient(135deg, #002366 0%, #0044cc 100%);
//       color: white;
//       border-color: #002366;
//       box-shadow: 0 10px 22px rgba(0,68,204,0.18);
//     }
//     .position-modal .modal-content {
//       border-radius: 24px;
//       border: none;
//       box-shadow: 0 24px 50px rgba(0,0,0,0.20);
//       backdrop-filter: blur(12px);
//       overflow: hidden;
//     }
//     .position-modal .modal-header {
//       background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
//       color: white;
//       border-bottom: none;
//       padding: 20px;
//     }
//     .position-modal .modal-body {
//       padding: 25px;
//       background: rgba(255,255,255,0.96);
//     }
//     .info-row {
//       display: flex;
//       justify-content: space-between;
//       padding: 12px 0;
//       border-bottom: 1px solid #f0f0f0;
//       gap: 16px;
//     }
//     .info-label {
//       font-weight: 600;
//       color: #666;
//     }
//     .info-value {
//       font-family: monospace;
//       font-weight: 700;
//       color: #002366;
//       text-align: right;
//     }
//     .commission-breakdown {
//       background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(244,247,252,0.95) 100%);
//       border-radius: 16px;
//       padding: 15px;
//       margin: 15px 0;
//       border: 1px solid rgba(0,35,102,0.05);
//     }
//     .commission-item {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       gap: 12px;
//       padding: 8px 0;
//       border-bottom: 1px solid rgba(0,0,0,0.05);
//       font-size: 0.9rem;
//     }
//     .commission-item:last-child {
//       border-bottom: none;
//     }
//     .commission-amount {
//       font-weight: 700;
//       color: #002366;
//     }
//     .commission-amount.payout {
//       color: #28a745;
//     }
//     .commission-amount.escrow {
//       color: #0dcaf0;
//     }
//     .hover-tooltip {
//       background: #002366 !important;
//       color: white !important;
//       font-size: 0.75rem !important;
//       padding: 8px 12px !important;
//       border-radius: 10px !important;
//       opacity: 1 !important;
//     }
//     @media (max-width: 768px) {
//       .d-flex.align-items-center.justify-content-between {
//         flex-direction: column;
//         gap: 15px;
//       }
//       .view-toggle {
//         margin-left: 0;
//       }
//     }
//   `

//   const orbitTypeConfig = {
//     P4: {
//       name: 'P4',
//       contract: 'p4Orbit',
//       positions: 4,
//       lines: 1,
//       lineSizes: [4],
//       linePayouts: ['70/90% owner'],
//       lineSpillovers: ['No spillover'],
//       levels: [1, 4, 7, 10],
//       description: 'Single line orbit'
//     },
//     P12: {
//       name: 'P12',
//       contract: 'p12Orbit',
//       positions: 12,
//       lines: 2,
//       lineSizes: [3, 9],
//       linePayouts: ['40% owner', '0/50% owner'],
//       lineSpillovers: ['50% eligible upline', '40% parent position'],
//       levels: [2, 5, 8],
//       description: 'Two line orbit'
//     },
//     P39: {
//       name: 'P39',
//       contract: 'p39Orbit',
//       positions: 39,
//       lines: 3,
//       lineSizes: [3, 9, 27],
//       linePayouts: ['0/20% owner', '0/20% owner', '0/50% owner'],
//       lineSpillovers: ['20% eligible upline + 50% next eligible upline', '20% parent + 50% owner', '20% parent + 20% grandparent'],
//       levels: [3, 6, 9],
//       description: 'Three line orbit'
//     }
//   }

//   const levelToOrbitType = {
//     1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
//     6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
//   }

//   const levelConfig = {
//     1: { price: 10, upgradeReq: 20, nextLevel: 2 },
//     2: { price: 20, upgradeReq: 40, nextLevel: 3 },
//     3: { price: 40, upgradeReq: 80, nextLevel: 4 },
//     4: { price: 80, upgradeReq: 160, nextLevel: 5 },
//     5: { price: 160, upgradeReq: 320, nextLevel: 6 },
//     6: { price: 320, upgradeReq: 640, nextLevel: 7 },
//     7: { price: 640, upgradeReq: 1280, nextLevel: 8 },
//     8: { price: 1280, upgradeReq: 2560, nextLevel: 9 },
//     9: { price: 2560, upgradeReq: 5120, nextLevel: 10 },
//     10: { price: 5120, upgradeReq: 10240, nextLevel: 11 }
//   }

//   const getPositionOnRing = (index, total, radiusPx, centerX, centerY, startAngle = -90) => {
//     const angle = (index / total) * 360 + startAngle
//     const radian = (angle * Math.PI) / 180

//     return {
//       x: centerX + radiusPx * Math.cos(radian),
//       y: centerY + radiusPx * Math.sin(radian),
//       angle
//     }
//   }

//   const getPlanetSize = (orbitType, stageSize) => {
//     const base = orbitType === 'P39' ? 38 : 44
//     if (stageSize <= 260) return orbitType === 'P39' ? 24 : 30
//     if (stageSize <= 420) return orbitType === 'P39' ? 28 : 36
//     return base
//   }

//   const getCoreSize = (orbitType, stageSize) => {
//     if (stageSize <= 260) return orbitType === 'P39' ? 66 : 74
//     if (stageSize <= 420) return orbitType === 'P39' ? 72 : 82
//     return orbitType === 'P39' ? 82 : 96
//   }

//   const getOrbitStructure = (orbitType) => {
//     return {
//       P4: {
//         lines: [1],
//         counts: { 1: 4 },
//         positions: { 1: [1, 2, 3, 4] },
//         startAngles: { 1: -90 }
//       },
//       P12: {
//         lines: [1, 2],
//         counts: { 1: 3, 2: 9 },
//         positions: {
//           1: [1, 2, 3],
//           2: [4, 5, 6, 7, 8, 9, 10, 11, 12]
//         },
//         startAngles: { 1: -90, 2: -90 }
//       },
//       P39: {
//         lines: [1, 2, 3],
//         counts: { 1: 3, 2: 9, 3: 27 },
//         positions: {
//           1: [1, 2, 3],
//           2: [4, 5, 6, 7, 8, 9, 10, 11, 12],
//           3: Array.from({ length: 27 }, (_, i) => i + 13)
//         },
//         startAngles: { 1: -90, 2: -90, 3: -90 }
//       }
//     }[orbitType] || {
//       lines: [1],
//       counts: { 1: 4 },
//       positions: { 1: [1, 2, 3, 4] },
//       startAngles: { 1: -90 }
//     }
//   }

//   const getStarConfig = (count = 36) => {
//     return Array.from({ length: count }, (_, i) => ({
//       id: i,
//       left: `${((i * 17.73) % 100).toFixed(2)}%`,
//       top: `${((i * 11.41 + 23) % 100).toFixed(2)}%`,
//       size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
//       delay: `${(i * 0.27).toFixed(2)}s`,
//       duration: `${(2.8 + (i % 5) * 0.7).toFixed(2)}s`,
//       drift: `${(7 + (i % 6) * 1.2).toFixed(2)}s`,
//       opacity: i % 4 === 0 ? 0.65 : 0.35
//     }))
//   }

//   const starConfig = getStarConfig(40)

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const fetchViewedLevels = useCallback(async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

//     const key = viewAddress.toLowerCase()
//     if (viewedLevelsCacheRef.current.has(key)) {
//       setViewedLevels(viewedLevelsCacheRef.current.get(key))
//       return
//     }

//     try {
//       const levels = {}
//       for (let i = 1; i <= 10; i++) {
//         try {
//           levels[i] = await withRetry(() => contracts.registration.isLevelActivated(viewAddress, i))
//         } catch {
//           levels[i] = false
//         }
//       }

//       viewedLevelsCacheRef.current.set(key, levels)
//       setViewedLevels(levels)
//     } catch (err) {
//       console.error('Error fetching viewed levels:', err)
//     }
//   }, [contracts, viewAddress, withRetry])

//   const applyViewerAddress = async () => {
//     if (!inputAddress || !ethers.isAddress(inputAddress)) {
//       setOrbitError(t('orbits.enterValidAddress'))
//       return
//     }

//     setOrbitError('')
//     const normalized = ethers.getAddress(inputAddress)
//     setInputAddress(normalized)
//     setViewAddress(normalized)
//     setViewMode('global')
//   }

//   const viewMyOrbit = () => {
//     if (!account) return
//     setOrbitError('')
//     setInputAddress(account)
//     setViewAddress(account)
//     setViewMode('global')
//   }

//   const getPositionInfo = (orbitType, position, level, autoUpgradeCompleted = false) => {
//     const info = {
//       type: 'unknown',
//       payout: 0,
//       escrow: 0,
//       spillover: 0,
//       description: '',
//       toUpline: false,
//       line: 1,
//       isAutoUpgradeSource: false,
//       isRecyclePosition: false,
//       spillsTo: null
//     }

//     if (orbitType === 'P4') {
//       info.line = 1
//       info.isRecyclePosition = (position === 4)

//       if (!autoUpgradeCompleted) {
//         if (position === 1) {
//           info.type = 'payout-escrow'
//           info.payout = 70
//           info.escrow = 20
//           info.spillover = 0
//           info.description = 'Position 1: 70% to orbit owner, 20% locked for auto-upgrade'
//           info.toUpline = true
//           info.isAutoUpgradeSource = true
//         } else if (position === 2 || position === 3) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 90
//           info.spillover = 0
//           info.description = `Position ${position}: 90% locked for auto-upgrade`
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         } else if (position === 4) {
//           info.type = 'recycle'
//           info.payout = 0
//           info.escrow = 0
//           info.spillover = 0
//           info.description = 'Position 4: recycle position'
//           info.toUpline = false
//         }
//       } else {
//         if (position === 1 || position === 2 || position === 3) {
//           info.type = 'payout'
//           info.payout = 90
//           info.escrow = 0
//           info.spillover = 0
//           info.description = `Position ${position}: 90% to orbit owner`
//           info.toUpline = true
//         } else if (position === 4) {
//           info.type = 'recycle'
//           info.payout = 0
//           info.escrow = 0
//           info.spillover = 0
//           info.description = 'Position 4: recycle position'
//           info.toUpline = false
//         }
//       }
//     } else if (orbitType === 'P12') {
//       if (position <= 3) {
//         info.line = 1
//         info.type = 'payout'
//         info.payout = 40
//         info.spillover = 50
//         info.description = `Position ${position}: 40% to orbit owner, 50% to eligible upline`
//         info.toUpline = true
//         info.spillsTo = null
//       } else if (position >= 4 && position <= 7) {
//         info.line = 2
//         info.type = 'escrow'
//         info.payout = 0
//         info.escrow = 50
//         info.spillover = 40
//         info.description = `Position ${position}: 50% locked for auto-upgrade, 40% to parent position`
//         info.toUpline = false
//         info.isAutoUpgradeSource = true
//         const underIndex = (position - 4) % 3
//         info.spillsTo = underIndex + 1
//       } else if (position >= 8 && position <= 10) {
//         info.line = 2
//         info.type = 'payout'
//         info.payout = 50
//         info.spillover = 40
//         info.description = `Position ${position}: 50% to orbit owner, 40% to parent position`
//         info.toUpline = true
//         const underIndex = (position - 4) % 3
//         info.spillsTo = underIndex + 1
//       } else if (position === 11 || position === 12) {
//         info.line = 2
//         info.type = 'recycle'
//         info.payout = 0
//         info.spillover = 0
//         info.description = `Position ${position}: recycle position`
//         info.toUpline = false
//         info.isRecyclePosition = true
//       }
//     } else if (orbitType === 'P39') {
//       if (position <= 3) {
//         info.line = 1
//         if (position <= 2) {
//           info.type = 'payout'
//           info.payout = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% to orbit owner, 20% to eligible upline, 50% to next eligible upline`
//           info.toUpline = true
//         } else if (position === 3) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 20
//           info.spillover = 70
//           info.description = 'Position 3: 20% locked for auto-upgrade, 20% to eligible upline, 50% to next eligible upline'
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         }
//       } else if (position >= 4 && position <= 12) {
//         info.line = 2
//         if (position >= 4 && position <= 7) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% locked for auto-upgrade, 20% to parent position, 50% to orbit owner`
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         } else {
//           info.type = 'payout'
//           info.payout = 20
//           info.spillover = 70
//           info.description = `Position ${position}: 20% to orbit owner, 20% to parent position, 50% to owner path`
//           info.toUpline = true
//         }
//         const underIndex = Math.floor((position - 4) / 3)
//         info.spillsTo = underIndex + 1
//       } else if (position >= 13 && position <= 39) {
//         info.line = 3
//         if (position >= 13 && position <= 14) {
//           info.type = 'escrow'
//           info.payout = 0
//           info.escrow = 50
//           info.spillover = 40
//           info.description = `Position ${position}: 50% locked for auto-upgrade, 20% to parent position, 20% to grandparent position`
//           info.toUpline = false
//           info.isAutoUpgradeSource = true
//         } else if (position >= 15 && position <= 37) {
//           info.type = 'payout'
//           info.payout = 50
//           info.spillover = 40
//           info.description = `Position ${position}: 50% to orbit owner, 20% to parent position, 20% to grandparent position`
//           info.toUpline = true
//         } else if (position === 38 || position === 39) {
//           info.type = 'recycle'
//           info.payout = 0
//           info.spillover = 0
//           info.description = `Position ${position}: recycle position`
//           info.toUpline = false
//           info.isRecyclePosition = true
//         }
//         const line2Index = Math.floor((position - 13) / 3)
//         info.spillsTo = 4 + line2Index
//       }
//     }

//     return info
//   }

//   const fetchAllOrbitData = useCallback(async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return

//     const fetchId = ++fetchIdRef.current
//     setOrbitError('')
//     setIsLoadingOrbits(true)

//     try {
//       const newOrbitData = {}
//       const newUserLocks = {}
//       const derivedDownline = {}
//       const derivedSpillover = {}

//       const BATCH_SIZE = 2
//       const BATCH_DELAY = 700
//       const POSITION_CHUNK_SIZE = 5

//       for (let batchStart = 1; batchStart <= 10; batchStart += BATCH_SIZE) {
//         const batchPromises = []

//         for (let level = batchStart; level < batchStart + BATCH_SIZE && level <= 10; level++) {
//           const orbitType = levelToOrbitType[level]
//           const config = orbitTypeConfig[orbitType]
//           const orbitContract = contracts[config.contract]

//           if (!orbitContract) continue

//           const levelPromise = (async () => {
//             try {
//               const orbitState = await withRetry(() => orbitContract.getUserOrbit(viewAddress, level))

//               const positions = []
//               const myPositions = []
//               const downlinePositions = []
//               const otherOccupants = []
//               const spilloverFromPositions = []

//               const positionTasks = []
//               for (let pos = 1; pos <= config.positions; pos++) {
//                 positionTasks.push(async () => {
//                   try {
//                     const position = await withRetry(() => orbitContract.getPosition(viewAddress, level, pos))
//                     const occupantAddress = position[0]
//                     const amountRaw = position[1]
//                     const timestampRaw = position[2]
//                     const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])

//                     let occupantType = 'empty'

//                     if (occupantAddress && occupantAddress !== ethers.ZeroAddress) {
//                       if (occupantAddress.toLowerCase() === viewAddress.toLowerCase()) {
//                         occupantType = 'mine'
//                         myPositions.push(pos)
//                       } else {
//                         const referrer = await getCachedReferrer(occupantAddress)

//                         if (referrer.toLowerCase() === viewAddress.toLowerCase()) {
//                           occupantType = 'downline'
//                           downlinePositions.push({
//                             position: pos,
//                             user: occupantAddress,
//                             amount: ethers.formatUnits(amountRaw, 6),
//                             timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
//                             level,
//                             activated: false,
//                             positionInfo: posInfo
//                           })
//                         } else {
//                           occupantType = 'other'
//                           otherOccupants.push({
//                             position: pos,
//                             user: occupantAddress,
//                             amount: ethers.formatUnits(amountRaw, 6),
//                             timestamp: new Date(Number(timestampRaw) * 1000).toLocaleString(),
//                             level,
//                             positionInfo: posInfo,
//                             originalReferrer: referrer
//                           })

//                           if (posInfo.spillsTo) {
//                             spilloverFromPositions.push({
//                               from: pos,
//                               to: posInfo.spillsTo,
//                               user: occupantAddress,
//                               amount: amountRaw
//                             })
//                           }
//                         }
//                       }
//                     }

//                     return {
//                       number: pos,
//                       occupantType,
//                       occupant: occupantAddress !== ethers.ZeroAddress ? occupantAddress : null,
//                       amount: amountRaw ? ethers.formatUnits(amountRaw, 6) : '0',
//                       timestamp: timestampRaw,
//                       positionInfo: posInfo,
//                       line: posInfo.line,
//                       spillsTo: posInfo.spillsTo
//                     }
//                   } catch {
//                     const posInfo = getPositionInfo(orbitType, pos, level, orbitState[2])
//                     return {
//                       number: pos,
//                       occupantType: 'empty',
//                       occupant: null,
//                       amount: '0',
//                       timestamp: 0,
//                       positionInfo: posInfo,
//                       line: posInfo.line,
//                       spillsTo: posInfo.spillsTo
//                     }
//                   }
//                 })
//               }

//               const positionResults = []
//               for (const chunk of chunkArray(positionTasks, POSITION_CHUNK_SIZE)) {
//                 const chunkResults = await Promise.all(chunk.map(task => task()))
//                 positionResults.push(...chunkResults)
//                 await delay(120)
//               }

//               positions.push(...positionResults)

//               let escrowLock = '0'
//               if (level < 10) {
//                 try {
//                   const lockedAmount = await withRetry(() => contracts.escrow.getLockedAmount(viewAddress, level, level + 1))
//                   escrowLock = ethers.formatUnits(lockedAmount, 6)
//                 } catch {}
//               }

//               return {
//                 level,
//                 data: {
//                   orbitType,
//                   config,
//                   currentIndex: orbitState[0],
//                   escrowBalance: ethers.formatUnits(orbitState[1], 6),
//                   autoUpgradeCompleted: orbitState[2],
//                   positionsInLine1: orbitState[3],
//                   positionsInLine2: orbitState[4],
//                   positionsInLine3: orbitState[5],
//                   totalCycles: orbitState[6],
//                   totalEarned: ethers.formatUnits(orbitState[7], 6),
//                   positions,
//                   myPositions,
//                   downlinePositions,
//                   otherOccupants,
//                   spilloverFromPositions
//                 },
//                 escrowLock
//               }
//             } catch {
//               const positions = []
//               for (let pos = 1; pos <= config.positions; pos++) {
//                 const posInfo = getPositionInfo(orbitType, pos, level)
//                 positions.push({
//                   number: pos,
//                   occupantType: 'empty',
//                   occupant: null,
//                   amount: '0',
//                   timestamp: 0,
//                   positionInfo: posInfo,
//                   line: posInfo.line,
//                   spillsTo: posInfo.spillsTo
//                 })
//               }

//               return {
//                 level,
//                 data: {
//                   orbitType,
//                   config,
//                   currentIndex: 1,
//                   escrowBalance: '0',
//                   autoUpgradeCompleted: false,
//                   positionsInLine1: 0,
//                   positionsInLine2: 0,
//                   positionsInLine3: 0,
//                   totalCycles: 0,
//                   totalEarned: '0',
//                   positions,
//                   myPositions: [],
//                   downlinePositions: [],
//                   otherOccupants: [],
//                   spilloverFromPositions: []
//                 },
//                 escrowLock: '0'
//               }
//             }
//           })()

//           batchPromises.push(levelPromise)
//         }

//         const batchResults = await Promise.all(batchPromises)

//         batchResults.forEach(result => {
//           if (result) {
//             newOrbitData[result.level] = result.data
//             derivedDownline[result.level] = result.data.downlinePositions || derivedDownline[result.level] || []
//             derivedSpillover[result.level] = result.data.otherOccupants || derivedSpillover[result.level] || []

//             if (result.level < 10) {
//               newUserLocks[result.level] = result.escrowLock
//             }
//           }
//         })

//         if (batchStart + BATCH_SIZE <= 10) {
//           await delay(BATCH_DELAY)
//         }
//       }

//       if (fetchId !== fetchIdRef.current) return

//       setOrbitData(newOrbitData)
//       setUserLocks(newUserLocks)
//       setDownlineData(derivedDownline)
//       setSpilloverData(derivedSpillover)
//     } catch (err) {
//       console.error('Orbit sync error:', err)
//       setOrbitError(t('orbits.loadFailed'))
//     } finally {
//       if (fetchId === fetchIdRef.current) {
//         setIsLoadingOrbits(false)
//       }
//     }
//   }, [contracts, viewAddress, getCachedReferrer, withRetry, t])

//   const refreshData = async () => {
//     if (!contracts || !viewAddress || !ethers.isAddress(viewAddress)) return
//     setIsRefreshing(true)

//     try {
//       await fetchViewedLevels()
//       await fetchAllOrbitData()
//       setLastUpdated(new Date().toLocaleTimeString())
//     } catch (err) {
//       console.error('Refresh error:', err)
//     } finally {
//       setIsRefreshing(false)
//     }
//   }

//   useEffect(() => {
//     if (contracts && viewAddress && ethers.isAddress(viewAddress)) {
//       fetchViewedLevels()
//       fetchAllOrbitData()
//     }
//   }, [contracts, viewAddress, fetchViewedLevels, fetchAllOrbitData])

//   const handleViewModeChange = (mode) => {
//     setViewMode(mode)
//   }

//   const handlePositionClick = (position) => {
//     setSelectedPosition(position)
//     setShowPositionModal(true)
//   }

//   const handleSpilloverPreview = (position) => {
//     if (position.spillsTo) {
//       setShowSpilloverPreview(true)
//       setTimeout(() => setShowSpilloverPreview(false), 2000)
//     }
//   }

//   const renderPositionTooltip = (position) => {
//     if (!position.occupant) {
//       return (
//         <Tooltip id="tooltip-empty">
//           <strong>{t('orbits.emptyPosition')}</strong>
//           <div>{t('orbits.availableToBeFilled')}</div>
//           <div className="mt-1 small">{position.positionInfo.description}</div>
//           {position.spillsTo && (
//             <div className="text-warning mt-1">{t('orbits.structuralParent', { position: position.spillsTo })}</div>
//           )}
//         </Tooltip>
//       )
//     }

//     return (
//       <Tooltip id={`tooltip-${position.number}`}>
//         <div><strong>Position #{position.number}</strong> ({t('orbits.line')} {position.line})</div>
//         <div>Occupied by: {position.occupant.slice(0, 8)}...{position.occupant.slice(-6)}</div>
//         <div>Amount: {position.amount} USDT</div>
//         <div className="mt-1 small">{position.positionInfo.description}</div>

//         {position.occupantType === 'downline' && (
//           <div className="text-warning mt-1">{t('orbits.directDownlineViewedAddress')}</div>
//         )}

//         {position.occupantType === 'mine' && (
//           <div className="text-success mt-1">{t('orbits.belongsToViewedAddress')}</div>
//         )}

//         {position.positionInfo.payout > 0 && (
//           <div className="text-success mt-1">{t('orbits.directPayoutSlice', { value: position.positionInfo.payout })}</div>
//         )}

//         {position.positionInfo.spillover > 0 && position.occupantType !== 'mine' && (
//           <div className="text-warning mt-1">{t('orbits.routedPayoutSlicesExist')}</div>
//         )}

//         {position.positionInfo.escrow > 0 && (
//           <div className="text-info mt-1">{t('orbits.escrowLocked', { value: position.positionInfo.escrow })}</div>
//         )}
//       </Tooltip>
//     )
//   }

//   if (!isConnected) {
//     return (
//       <Container className="mt-5 pt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="primary" className="text-center p-5 lab-card shadow-lg" style={{ backgroundColor: '#002366', color: 'white', border: 'none' }}>
//           <h4 className="fw-bold">{t('orbits.connectTitle')}</h4>
//           <p className="m-0 opacity-75">{t('orbits.connectText')}</p>
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoading) {
//     return (
//       <Container className="mt-5 text-center">
//         <style>{orbitStyles}</style>
//         <Spinner animation="grow" variant="primary" />
//         <p className="mt-3 fw-bold text-muted" style={{ letterSpacing: '2px' }}>{t('orbits.syncing')}</p>
//       </Container>
//     )
//   }

//   if (error) {
//     return (
//       <Container className="mt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="danger" className="lab-card shadow-sm border-0">
//           <strong>{t('orbits.panelError')}:</strong> {error}
//         </Alert>
//       </Container>
//     )
//   }

//   if (orbitError) {
//     return (
//       <Container className="mt-5">
//         <style>{orbitStyles}</style>
//         <Alert variant="danger" className="lab-card shadow-sm border-0">
//           <strong className="text-danger">{t('orbits.systemAlert')}:</strong> {orbitError}
//         </Alert>
//       </Container>
//     )
//   }

//   if (isLoadingOrbits) {
//     return (
//       <Container className="mt-5 pt-4">
//         <style>{orbitStyles}</style>
//         <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
//           <div className="d-flex align-items-center">
//             <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px' }}></div>
//             <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//               {t('orbits.pageTitle')}
//             </h1>
//           </div>
//         </div>

//         <div className="text-center py-5">
//           <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
//           <p className="mt-3 fw-bold text-muted">{t('orbits.loading')}</p>
//         </div>
//       </Container>
//     )
//   }

//   const totalDownline = Object.values(downlineData).reduce((sum, arr) => sum + arr.length, 0)
//   const totalSpillover = Object.values(spilloverData).reduce((sum, arr) => sum + arr.length, 0)
//   const isViewingSelf = !!account && !!viewAddress && account.toLowerCase() === viewAddress.toLowerCase()

//   return (
//     <Container className="mt-5 pt-4">
//       <style>{orbitStyles}</style>

//       <Modal show={showPositionModal} onHide={() => setShowPositionModal(false)} className="position-modal" centered>
//         <Modal.Header closeButton>
//           <Modal.Title>{t('orbits.positionDetails', { number: selectedPosition?.number })}</Modal.Title>
//         </Modal.Header>

//         <Modal.Body>
//           {selectedPosition && (
//             <>
//               <div className="info-row">
//                 <span className="info-label">{t('orbits.positionType')}</span>
//                 <span className="info-value">{selectedPosition.positionInfo?.type?.toUpperCase()}</span>
//               </div>

//               <div className="info-row">
//                 <span className="info-label">{t('orbits.line')}</span>
//                 <span className="info-value">{t('orbits.line')} {selectedPosition.positionInfo?.line}</span>
//               </div>

//               {selectedPosition.occupant ? (
//                 <>
//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.occupiedBy')}</span>
//                     <span className="info-value">
//                       {selectedPosition.occupantType === 'mine'
//                         ? (isViewingSelf ? t('orbits.you') : t('orbits.viewedOwner'))
//                         : selectedPosition.occupant.slice(0, 10) + '...' + selectedPosition.occupant.slice(-8)}
//                     </span>
//                   </div>

//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.fullAddress')}</span>
//                     <span className="info-value" style={{ fontSize: '0.8rem' }}>
//                       {selectedPosition.occupant}
//                     </span>
//                   </div>

//                   <div className="info-row">
//                     <span className="info-label">{t('orbits.amountEntered')}</span>
//                     <span className="info-value">{selectedPosition.amount} USDT</span>
//                   </div>

//                   {selectedPosition.timestamp > 0 && (
//                     <div className="info-row">
//                       <span className="info-label">{t('orbits.filledOn')}</span>
//                       <span className="info-value">
//                         {new Date(Number(selectedPosition.timestamp) * 1000).toLocaleString()}
//                       </span>
//                     </div>
//                   )}

//                   <div className="commission-breakdown">
//                     <h6 className="fw-bold mb-3">{t('orbits.routingBreakdown')}</h6>
//                     <p className="small text-muted mb-3">{selectedPosition.positionInfo?.description}</p>

//                     {selectedPosition.positionInfo?.payout > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.directRecipientSlice')}</span>
//                         <span className="commission-amount payout">
//                           {selectedPosition.positionInfo.payout}% of orbit amount
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.escrow > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.lockedInEscrow')}</span>
//                         <span className="commission-amount escrow">
//                           {selectedPosition.positionInfo.escrow}% of orbit amount
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.spillover > 0 && (
//                       <div className="commission-item">
//                         <span>{t('orbits.otherRoutedSlices')}</span>
//                         <span className="commission-amount" style={{ color: '#ffc107' }}>
//                           {t('orbits.seePositionRule')}
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.positionInfo?.type === 'recycle' && (
//                       <div className="commission-item">
//                         <span>{t('orbits.status')}</span>
//                         <span className="commission-amount" style={{ color: '#6c757d' }}>
//                           {t('orbits.recyclePosition')}
//                         </span>
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'downline' && (
//                       <div className="alert alert-warning mt-3 mb-0 small">
//                         <strong>{t('orbits.downlineAlertTitle')}</strong><br />
//                         {selectedPosition.positionInfo?.toUpline
//                           ? t('orbits.downlineAlertPayout')
//                           : t('orbits.downlineAlertEscrow')}
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'mine' && (
//                       <div className="alert alert-success mt-3 mb-0 small">
//                         <strong>{t('orbits.mineAlertTitle')}</strong><br />
//                         {t('orbits.mineAlertText')}
//                       </div>
//                     )}

//                     {selectedPosition.occupantType === 'other' && selectedPosition.positionInfo?.spillover > 0 && (
//                       <div className="alert alert-info mt-3 mb-0 small">
//                         <strong>{t('orbits.otherAlertTitle')}</strong><br />
//                         {t('orbits.otherAlertText')}
//                       </div>
//                     )}
//                   </div>
//                 </>
//               ) : (
//                 <div className="text-center p-4">
//                   <h5 className="text-muted">{t('orbits.emptyPosition')}</h5>
//                   <p className="small">{t('orbits.availableToBeFilled')}</p>

//                   <div className="commission-breakdown mt-3">
//                     <h6 className="fw-bold mb-2">{t('orbits.whenFilled')}</h6>
//                     <p className="small mb-0">{selectedPosition.positionInfo?.description}</p>
//                     {selectedPosition.spillsTo && (
//                       <p className="small text-warning mt-2">
//                         {t('orbits.structuralParent', { position: selectedPosition.spillsTo })}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </Modal.Body>

//         <Modal.Footer>
//           <Button variant="secondary" onClick={() => setShowPositionModal(false)}>
//             {t('orbits.close')}
//           </Button>
//         </Modal.Footer>
//       </Modal>

//       <div className="d-flex align-items-center justify-content-between mt-5 mb-4">
//         <div className="d-flex align-items-center">
//           <div style={{ height: '35px', width: '8px', background: '#002366', marginRight: '15px', borderRadius: '8px' }}></div>
//           <h1 className="m-0 fw-black text-uppercase" style={{ color: '#002366', letterSpacing: '2px', fontSize: '2rem' }}>
//             {t('orbits.pageTitle')}
//           </h1>

//           <div className="view-toggle">
//             <Button
//               variant={viewMode === 'global' ? 'primary' : 'outline-secondary'}
//               size="sm"
//               onClick={() => handleViewModeChange('global')}
//               className={viewMode === 'global' ? 'active' : ''}
//             >
//               {t('orbits.orbitView')}
//             </Button>

//             <Button
//               variant={viewMode === 'downline' ? 'primary' : 'outline-secondary'}
//               size="sm"
//               onClick={() => handleViewModeChange('downline')}
//               className={viewMode === 'downline' ? 'active' : ''}
//             >
//               {t('orbits.downlineView')}
//               {totalDownline > 0 && <Badge bg="warning" className="ms-1">{totalDownline}</Badge>}
//               {totalSpillover > 0 && <Badge bg="info" className="ms-1">{totalSpillover} orbit</Badge>}
//             </Button>
//           </div>
//         </div>

//         <div className="d-flex align-items-center">
//           <span className="text-muted small me-3">{t('orbits.lastSync')}: {lastUpdated}</span>
//           <Button
//             variant="link"
//             className="refresh-button"
//             onClick={refreshData}
//             disabled={isRefreshing || !viewAddress || !ethers.isAddress(viewAddress)}
//           >
//             {isRefreshing ? t('orbits.refreshing') : t('orbits.refresh')}
//           </Button>
//         </div>
//       </div>

//       <div className="lab-card p-3 mb-4">
//         <Row className="align-items-end g-3">
//           <Col lg={8}>
//             <Form.Group>
//               <Form.Label className="fw-bold small text-uppercase text-muted">{t('orbits.addressToView')}</Form.Label>
//               <Form.Control
//                 type="text"
//                 value={inputAddress}
//                 onChange={(e) => setInputAddress(e.target.value)}
//                 placeholder="0x..."
//               />
//               <div className="small text-muted mt-2">
//                 {t('orbits.currentlyViewing')} {viewAddress ? `${viewAddress.slice(0, 8)}...${viewAddress.slice(-6)}` : t('orbits.noAddressSelected')}
//                 {isViewingSelf && ` ${t('orbits.yourWallet')}`}
//               </div>
//             </Form.Group>
//           </Col>

//           <Col lg={4}>
//             <div className="d-flex gap-2">
//               <Button onClick={applyViewerAddress} disabled={!inputAddress || !ethers.isAddress(inputAddress)}>
//                 {t('orbits.loadAddress')}
//               </Button>
//               <Button variant="outline-secondary" onClick={viewMyOrbit} disabled={!account}>
//                 {t('orbits.viewMine')}
//               </Button>
//             </div>
//           </Col>
//         </Row>
//       </div>

//       <div className="color-legend">
//         <div className="legend-item">
//           <div className="legend-color green"></div>
//           <span><strong>{t('orbits.legendViewedOwner')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color orange"></div>
//           <span><strong>{t('orbits.legendDirectDownline')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color blue"></div>
//           <span><strong>{t('orbits.legendOtherUser')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color purple"></div>
//           <span><strong>{t('orbits.legendStructuralLink')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color red"></div>
//           <span><strong>{t('orbits.legendEmpty')}</strong></span>
//         </div>
//         <div className="legend-item">
//           <div className="legend-color gray"></div>
//           <span><strong>{t('orbits.legendInactive')}</strong></span>
//         </div>
//       </div>

//       <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4 border-0">
//         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//           const data = orbitData[level]
//           if (!data) return null

//           const { config, positions, currentIndex, autoUpgradeCompleted, totalCycles, orbitType } = data
//           const downlineAtLevel = downlineData[level] || []
//           const spilloverAtLevel = spilloverData[level] || []
//           const levelInfo = levelConfig[level]
//           const isLevelActive = !!viewedLevels[level]

//           const positionsByLine = {}
//           positions.forEach(pos => {
//             const line = pos.line
//             if (!positionsByLine[line]) positionsByLine[line] = []
//             positionsByLine[line].push(pos)
//           })

//           const structure = getOrbitStructure(orbitType)

//           return (
//             <Tab
//               key={level}
//               eventKey={`level${level}`}
//               title={
//                 <span>
//                   Level {level} ({data.orbitType})
//                   {!isLevelActive && <Badge bg="secondary" className="ms-2">{t('orbits.inactive')}</Badge>}
//                   {downlineAtLevel.length > 0 && <Badge bg="warning" className="ms-2">{downlineAtLevel.length}</Badge>}
//                   {spilloverAtLevel.length > 0 && <Badge bg="info" className="ms-2">{spilloverAtLevel.length}s</Badge>}
//                   {autoUpgradeCompleted && <Badge bg="success" className="ms-2">{t('orbits.upgraded')}</Badge>}
//                 </span>
//               }
//             >
//               <Row>
//                 <Col lg={8}>
//                   <div className="lab-card mb-4">
//                     <div className="orbit-header d-flex justify-content-between align-items-center">
//                       <span>
//                         Level {level} ({data.orbitType}) - {viewMode === 'global' ? 'Orbit View' : 'Downline View'}
//                         {totalCycles > 0 && <span className="cycle-badge ms-3">{t('orbits.cycle', { count: Number(totalCycles) + 1 })}</span>}
//                       </span>
//                       <div>
//                         {!isLevelActive && <Badge bg="secondary" className="me-2">{t('orbits.inactiveLevel')}</Badge>}
//                         {downlineAtLevel.length > 0 && <Badge bg="warning" className="me-2">{t('orbits.downlineCount', { count: downlineAtLevel.length })}</Badge>}
//                         {spilloverAtLevel.length > 0 && <Badge bg="info" className="me-2">{t('orbits.orbitCount', { count: spilloverAtLevel.length })}</Badge>}
//                         <Badge bg="info">{currentIndex || 1}/{config.positions} filled</Badge>
//                       </div>
//                     </div>

//                     <div className="p-4">
//                       <div className={`galaxy-container ${orbitType.toLowerCase()}`} ref={activeTab === `level${level}` ? galaxyRef : null}>
//                         <div className="galaxy-grid"></div>

//                         <div className="star-field">
//                           {starConfig.map((star) => (
//                             <span
//                               key={star.id}
//                               className="star"
//                               style={{
//                                 left: star.left,
//                                 top: star.top,
//                                 width: star.size,
//                                 height: star.size,
//                                 opacity: star.opacity,
//                                 animationDelay: `${star.delay}, ${star.delay}`,
//                                 animationDuration: `${star.duration}, ${star.drift}`
//                               }}
//                             />
//                           ))}
//                         </div>

//                         <div className="galaxy-inner">
//                           {(() => {
//                             const outerWidth = containerSize.width > 0 ? containerSize.width : 560
//                             const outerHeight = containerSize.height > 0 ? containerSize.height : 560
//                             const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
//                             const stageSize = usableSize
//                             const centerX = stageSize / 2
//                             const centerY = stageSize / 2

//                             const planetSize = getPlanetSize(orbitType, stageSize)
//                             const coreSize = getCoreSize(orbitType, stageSize)
//                             const nodePadding = planetSize / 2 + 8
//                             const coreClearance = coreSize / 2 + planetSize / 2 + 16

//                             let ringRadiiPx = {
//                               1: Math.max(coreClearance, stageSize * 0.22),
//                               2: stageSize * 0.34,
//                               3: stageSize * 0.45
//                             }

//                             if (orbitType === 'P4') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance + 6, stageSize * 0.31)
//                               }
//                             }

//                             if (orbitType === 'P12') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance + 2, stageSize * 0.21),
//                                 2: Math.min(stageSize * 0.41, (stageSize / 2) - nodePadding)
//                               }
//                             }

//                             if (orbitType === 'P39') {
//                               ringRadiiPx = {
//                                 1: Math.max(coreClearance, stageSize * 0.16),
//                                 2: stageSize * 0.29,
//                                 3: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding)
//                               }
//                             }

//                             Object.keys(ringRadiiPx).forEach(key => {
//                               ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding)
//                             })

//                             const createEmptyPosition = (posNumber, lineNum) => ({
//                               number: posNumber,
//                               occupantType: 'empty',
//                               occupant: null,
//                               amount: '0',
//                               timestamp: 0,
//                               positionInfo: getPositionInfo(orbitType, posNumber, level, autoUpgradeCompleted),
//                               line: lineNum,
//                               spillsTo: null
//                             })

//                             const allPositionMap = {}
//                             structure.lines.forEach(lineNum => {
//                               const linePositions = positionsByLine[lineNum] || []
//                               structure.positions[lineNum].forEach(posNumber => {
//                                 allPositionMap[posNumber] = linePositions.find(p => p.number === posNumber) || createEmptyPosition(posNumber, lineNum)
//                               })
//                             })

//                             return (
//                               <div
//                                 className="galaxy-stage"
//                                 style={{
//                                   width: stageSize,
//                                   height: stageSize,
//                                   left: '50%',
//                                   top: '50%',
//                                   transform: 'translate(-50%, -50%)'
//                                 }}
//                               >
//                                 <div
//                                   className={`orbit-core ${!isLevelActive ? 'orbit-core-inactive' : ''}`}
//                                   style={{
//                                     width: coreSize,
//                                     height: coreSize
//                                   }}
//                                 >
//                                   <span className="core-label">{isLevelActive ? t('orbits.owner') : t('orbits.inactiveCore')}</span>
//                                   <span className="core-value">
//                                     {isLevelActive
//                                       ? (isViewingSelf ? t('orbits.you') : t('orbits.view'))
//                                       : t('orbits.levelOff')}
//                                   </span>
//                                 </div>

//                                 {structure.lines.map(lineNum => {
//                                   const linePositions = positionsByLine[lineNum] || []
//                                   const filledCount = linePositions.filter(p => p.occupant).length
//                                   const diameter = ringRadiiPx[lineNum] * 2

//                                   return (
//                                     <div
//                                       key={lineNum}
//                                       className={`orbit-ring line${lineNum}`}
//                                       style={{
//                                         width: diameter,
//                                         height: diameter
//                                       }}
//                                     >
//                                       <span className="ring-label">LINE {lineNum}</span>
//                                       <span className="ring-stats">
//                                         {filledCount}/{structure.positions[lineNum].length} • {config.linePayouts[lineNum - 1]} • {config.lineSpillovers[lineNum - 1]}
//                                       </span>
//                                     </div>
//                                   )
//                                 })}

//                                 <>
//                                   {structure.lines.map(lineNum => {
//                                     const totalPlanets = structure.counts[lineNum]
//                                     const radiusPx = ringRadiiPx[lineNum]
//                                     const positionNumbers = structure.positions[lineNum]
//                                     const startAngle = structure.startAngles[lineNum]

//                                     return positionNumbers.map((posNumber, index) => {
//                                       const pos = allPositionMap[posNumber]

//                                       const coords = getPositionOnRing(
//                                         index,
//                                         totalPlanets,
//                                         radiusPx,
//                                         centerX,
//                                         centerY,
//                                         startAngle
//                                       )

//                                       let planetClass = 'planet-node '
//                                       if (pos.occupantType === 'mine') {
//                                         planetClass += 'planet-my-position'
//                                       } else if (pos.occupantType === 'downline') {
//                                         planetClass += 'planet-downline'
//                                       } else if (pos.occupantType === 'other') {
//                                         planetClass += 'planet-other'
//                                       } else {
//                                         planetClass += 'planet-empty'
//                                       }

//                                       if (showSpilloverPreview && hoveredPosition?.spillsTo === pos.number) {
//                                         planetClass += ' planet-spillover-preview'
//                                       }

//                                       return (
//                                         <OverlayTrigger
//                                           key={pos.number}
//                                           placement="top"
//                                           overlay={renderPositionTooltip(pos)}
//                                           delay={{ show: 250, hide: 100 }}
//                                         >
//                                           <div
//                                             className={planetClass}
//                                             style={{
//                                               left: coords.x,
//                                               top: coords.y,
//                                               width: planetSize,
//                                               height: planetSize,
//                                               transform: 'translate(-50%, -50%)',
//                                               '--index': index
//                                             }}
//                                             onClick={() => handlePositionClick(pos)}
//                                             onMouseEnter={() => {
//                                               setHoveredPosition(pos)
//                                               if (pos.spillsTo) handleSpilloverPreview(pos)
//                                             }}
//                                             onMouseLeave={() => setHoveredPosition(null)}
//                                           >
//                                             <div className="planet-content">
//                                               <span className="node-number">{pos.number}</span>

//                                               {pos.occupant && (
//                                                 <span className="planet-icon">
//                                                   {pos.occupantType === 'mine' ? '👤' : pos.occupantType === 'downline' ? '⬇️' : '👥'}
//                                                 </span>
//                                               )}

//                                               {pos.positionInfo.payout > 0 && pos.occupantType !== 'mine' && (
//                                                 <span className="planet-earn-badge">
//                                                   {pos.positionInfo.payout}%
//                                                 </span>
//                                               )}
//                                             </div>
//                                           </div>
//                                         </OverlayTrigger>
//                                       )
//                                     })
//                                   })}

//                                   {data.spilloverFromPositions.map((conn, idx) => {
//                                     const fromPos = allPositionMap[conn.from]
//                                     const toPos = allPositionMap[conn.to]

//                                     if (!fromPos || !toPos) return null

//                                     const fromLine = fromPos.line
//                                     const toLine = toPos.line
//                                     const fromIndex = structure.positions[fromLine].indexOf(fromPos.number)
//                                     const toIndex = structure.positions[toLine].indexOf(toPos.number)
//                                     const fromStartAngle = structure.startAngles[fromLine]
//                                     const toStartAngle = structure.startAngles[toLine]

//                                     if (fromIndex < 0 || toIndex < 0) return null

//                                     const fromCoords = getPositionOnRing(
//                                       fromIndex,
//                                       structure.counts[fromLine],
//                                       ringRadiiPx[fromLine],
//                                       centerX,
//                                       centerY,
//                                       fromStartAngle
//                                     )

//                                     const toCoords = getPositionOnRing(
//                                       toIndex,
//                                       structure.counts[toLine],
//                                       ringRadiiPx[toLine],
//                                       centerX,
//                                       centerY,
//                                       toStartAngle
//                                     )

//                                     const dx = toCoords.x - fromCoords.x
//                                     const dy = toCoords.y - fromCoords.y
//                                     const distance = Math.sqrt(dx * dx + dy * dy)
//                                     const angle = Math.atan2(dy, dx) * 180 / Math.PI

//                                     return (
//                                       <div key={`conn-${idx}`}>
//                                         <div
//                                           className="spillover-connection"
//                                           style={{
//                                             width: distance,
//                                             left: fromCoords.x,
//                                             top: fromCoords.y,
//                                             transform: `rotate(${angle}deg)`
//                                           }}
//                                         />
//                                         <div
//                                           className="connection-label"
//                                           style={{
//                                             left: (fromCoords.x + toCoords.x) / 2,
//                                             top: (fromCoords.y + toCoords.y) / 2
//                                           }}
//                                         >
//                                           {conn.amount ? `${parseFloat(ethers.formatUnits(conn.amount, 6)).toFixed(1)} USDT` : ''}
//                                         </div>
//                                       </div>
//                                     )
//                                   })}
//                                 </>
//                               </div>
//                             )
//                           })()}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </Col>

//                 <Col lg={4}>
//                   <div className="lab-card energy-cell h-100">
//                     <div className="orbit-header">{t('orbits.escrowAutoUpgrade')}</div>
//                     <div className="p-4 pulse-overlay">
//                       <div className="small fw-bold text-muted text-uppercase mb-2">
//                         {t('orbits.lockedForLevel', { level: levelInfo.nextLevel })}
//                       </div>

//                       <h3 className="fw-black mb-3" style={{ color: '#002366', fontFamily: 'monospace' }}>
//                         {userLocks[level] || '0'} <span className="small text-muted">/ {levelInfo.upgradeReq} USDT</span>
//                       </h3>

//                       <ProgressBar
//                         now={((parseFloat(userLocks[level] || '0') / levelInfo.upgradeReq) * 100) || 0}
//                         variant="primary"
//                         className="mb-3"
//                       />

//                       <div className="p-3 bg-light rounded-3 small fw-bold text-center">
//                         {!isLevelActive ? (
//                           <span className="text-secondary">{t('orbits.levelInactiveForAddress', { level })}</span>
//                         ) : parseFloat(userLocks[level] || '0') >= levelInfo.upgradeReq ? (
//                           autoUpgradeCompleted ? (
//                             <span className="text-success">{t('orbits.levelAlreadyActivated', { level: levelInfo.nextLevel })}</span>
//                           ) : (
//                             <span className="text-success">{t('orbits.autoUpgradeReady', { level: levelInfo.nextLevel })}</span>
//                           )
//                         ) : (
//                           t('orbits.needMoreUsdt', {
//                             amount: (levelInfo.upgradeReq - parseFloat(userLocks[level] || '0')).toFixed(1)
//                           })
//                         )}
//                       </div>

//                       <hr className="my-4" />

//                       <div className="small fw-bold text-muted text-uppercase mb-2">{t('orbits.totalDirectEarned')}</div>
//                       <h4 className="fw-bold" style={{ color: '#28a745' }}>{data.totalEarned} USDT</h4>

//                       {viewMode === 'downline' && (
//                         <>
//                           {downlineAtLevel.length > 0 && (
//                             <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded-3">
//                               <h6 className="fw-bold mb-2">{t('orbits.directDownlineAtLevel', { level })}</h6>
//                               <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
//                                 {downlineAtLevel.map((d, idx) => (
//                                   <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
//                                     <div>
//                                       <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
//                                         {d.user.slice(0, 8)}...{d.user.slice(-6)}
//                                       </span>
//                                       <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
//                                       <small className="text-muted d-block">{t('orbits.amountShort', { amount: d.amount })}</small>
//                                     </div>
//                                     <Badge bg={d.positionInfo.toUpline ? 'success' : 'secondary'}>
//                                       {d.positionInfo.toUpline ? '💰' : '🔒'}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           )}

//                           {spilloverAtLevel.length > 0 && (
//                             <div className="mt-3 p-3 bg-info bg-opacity-10 rounded-3">
//                               <h6 className="fw-bold mb-2">{t('orbits.otherParticipantsAtLevel', { level })}</h6>
//                               <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
//                                 {spilloverAtLevel.map((d, idx) => (
//                                   <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded-2 small">
//                                     <div>
//                                       <span className="text-truncate d-block" style={{ maxWidth: '120px' }}>
//                                         {d.user.slice(0, 8)}...{d.user.slice(-6)}
//                                       </span>
//                                       <small className="text-muted">{t('orbits.positionShort', { position: d.position })}</small>
//                                       <small className="text-muted d-block">From: {d.originalReferrer?.slice(0, 6)}...</small>
//                                     </div>
//                                     <Badge bg="info">
//                                       {t('orbits.routedByRule')}
//                                     </Badge>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           )}

//                           {downlineAtLevel.length === 0 && spilloverAtLevel.length === 0 && (
//                             <div className="mt-4 p-3 bg-light rounded-3 text-center text-muted small">
//                               {t('orbits.noDownlineYet')}
//                             </div>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </Col>
//               </Row>
//             </Tab>
//           )
//         })}
//       </Tabs>
//     </Container>
//   )
// }