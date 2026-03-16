import React, { useEffect, useState } from 'react'
import { Navbar, Nav, Container } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap'
import { ConnectButton } from '../Wallet/ConnectButton'
import { useWallet } from '../../hooks/useWallet'
import { useContracts } from '../../hooks/useContracts'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import logo from '../../assets/Fin-logo.jpg'

export const Navigation = () => {
  const { isConnected, account } = useWallet()
  const { contracts, loadContracts } = useContracts()
  const [isRegistered, setIsRegistered] = useState(false)
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  const checkRegistrationStatus = async () => {
    if (!contracts || !account || !isConnected) {
      setIsRegistered(false)
      return
    }

    try {
      const registered =
        typeof contracts.registration.isRegistered === 'function'
          ? await contracts.registration.isRegistered(account)
          : await contracts.registration.isParticipant(account)

      setIsRegistered(registered)
    } catch (err) {
      console.error('Error checking registration status:', err)
      setIsRegistered(false)
    }
  }

  useEffect(() => {
    checkRegistrationStatus()

    const setupEventListener = async () => {
      if (!contracts?.registration) return

      try {
        contracts.registration.on('Registered', (user, referrer, event) => {
          if (user.toLowerCase() === account?.toLowerCase()) {
            console.log('Registration event detected for current user')
            setIsRegistered(true)
          }
        })

        contracts.registration.on('LevelActivated', (user, level, price, event) => {
          if (level === 1 && user.toLowerCase() === account?.toLowerCase()) {
            console.log('Level 1 activation detected for current user')
            setIsRegistered(true)
          }
        })
      } catch (err) {
        console.error('Error setting up event listeners:', err)
      }
    }

    setupEventListener()

    return () => {
      if (contracts?.registration) {
        contracts.registration.removeAllListeners('Registered')
        contracts.registration.removeAllListeners('LevelActivated')
      }
    }
  }, [contracts, account, isConnected])

  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      checkRegistrationStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [contracts, account, isConnected])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setExpanded(false)
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [expanded])

  const customStyles = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes breathe {
      0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(255,255,255,0.3); }
      50% { opacity: 0.85; text-shadow: 0 0 20px rgba(255,255,255,0.6); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .brand-text {
      color: #FFFFFF !important;
      font-weight: 800 !important;
      font-size: 1.6rem !important;
      letter-spacing: -0.5px;
      animation: breathe 3s infinite ease-in-out;
      white-space: nowrap;
    }

    .nav-link-custom {
      color: #FFFFFF !important;
      opacity: 0.9;
      transition: all 0.3s ease;
      font-weight: 500 !important;
    }

    .nav-link-custom:hover {
      opacity: 1;
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
      transform: translateY(-1px);
    }

    .navbar-toggler {
      border: none !important;
      box-shadow: none !important;
      padding: 0.35rem 0.55rem !important;
      position: relative;
      z-index: 1061;
    }

    .navbar-toggler:focus {
      box-shadow: none !important;
    }

    .navbar-toggler-icon {
      filter: invert(1) grayscale(100%) brightness(200%);
      width: 1.7em;
      height: 1.7em;
    }

    .menu-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 1040;
      animation: fadeIn 0.25s ease;
    }

    .sidebar-close-btn {
      display: none;
    }

    @media (min-width: 992px) {
      .nav-link-custom {
        font-size: 0.98rem;
        padding: 0.5rem 0.2rem !important;
      }
    }

    @media (max-width: 991px) {
      .navbar-collapse {
        position: fixed !important;
        top: 1rem;
        right: 1rem;
        width: min(380px, calc(100vw - 2rem));
        height: auto !important;
        max-height: calc(100vh - 2rem);
        background: rgba(0, 34, 102, 0.78) !important;
        backdrop-filter: blur(18px) saturate(160%);
        -webkit-backdrop-filter: blur(18px) saturate(160%);
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: -18px 0 40px rgba(0, 0, 0, 0.35);
        z-index: 1050;
        padding: 5.2rem 1.2rem 1.5rem !important;
        margin-top: 0 !important;
        overflow: visible !important;
        transform: translateX(110%);
        transition: transform 0.32s ease;
        display: block !important;
        border-radius: 24px;
      }

      .navbar-collapse.show {
        transform: translateX(0);
      }

      .navbar-collapse.collapsing {
        transform: translateX(110%);
        transition: transform 0.32s ease;
        height: auto !important;
      }

      .navbar-collapse .nav {
        display: flex !important;
        flex-direction: column;
        align-items: stretch !important;
        width: 100%;
        overflow: visible !important;
      }

      .sidebar-close-btn {
        display: flex;
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #FFFFFF;
        font-size: 1.7rem;
        line-height: 1;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .sidebar-close-btn:hover {
        background: rgba(255, 255, 255, 0.22);
        transform: rotate(90deg);
      }

      .nav-link-custom {
        font-size: 1.05rem;
        padding: 0.9rem 1rem !important;
        margin: 0.3rem 0 !important;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.08);
        text-align: center;
        width: 100%;
      }

      .nav-link-custom:hover {
        background: rgba(255, 255, 255, 0.14);
        transform: translateX(4px);
      }

      .navbar-collapse .mx-2 {
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      .ms-lg-3,
      .ms-lg-4 {
        margin-left: 0 !important;
        width: 100%;
      }

      .mt-3 {
        margin-top: 0.9rem !important;
      }

      .language-switcher-container,
      .connect-button-container {
        width: 100%;
        display: flex;
        justify-content: center;
      }

      .navbar-collapse .ms-lg-3,
      .navbar-collapse .ms-lg-4 {
        display: flex;
        justify-content: center;
        padding: 0.35rem 0;
      }
    }

    @media (max-width: 768px) {
      .brand-text {
        font-size: 1.3rem !important;
      }

      .brand-text img {
        height: 50px !important;
        width: 50px !important;
      }

      .navbar {
        padding: 0.8rem 0 !important;
      }

      .px-5 {
        padding-left: 1.5rem !important;
        padding-right: 1.5rem !important;
      }
    }

    @media (max-width: 480px) {
      .brand-text {
        font-size: 1.05rem !important;
      }

      .brand-text img {
        height: 42px !important;
        width: 42px !important;
        margin-right: 8px !important;
      }

      .navbar-toggler {
        padding: 0.25rem 0.45rem !important;
      }

      .text-center.mb-4 {
        font-size: 0.65rem !important;
        letter-spacing: 1.5px !important;
        padding: 4px 0 !important;
      }

      .navbar-collapse {
        top: 0.75rem;
        right: 0.75rem;
        width: calc(100vw - 1.5rem);
        max-height: calc(100vh - 1.5rem);
        padding: 4.8rem 1rem 1.25rem !important;
        border-radius: 20px;
      }

      .nav-link-custom {
        font-size: 0.98rem;
        padding: 0.78rem 0.85rem !important;
      }

      .sidebar-close-btn {
        width: 40px;
        height: 40px;
        font-size: 1.5rem;
      }
    }

    @media (max-height: 500px) and (orientation: landscape) {
      .navbar-collapse {
        overflow-y: auto !important;
      }

      .nav-link-custom {
        padding: 0.55rem 0.8rem !important;
        font-size: 0.92rem;
      }
    }

    @media (max-width: 380px) {
      .brand-text {
        font-size: 0.95rem !important;
      }

      .brand-text img {
        height: 36px !important;
        width: 36px !important;
      }

      .px-5 {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }

      .navbar-collapse {
        width: calc(100vw - 1rem);
        right: 0.5rem;
        top: 0.5rem;
        max-height: calc(100vh - 1rem);
      }
    }
  `

  return (
    <>
      <style>{customStyles}</style>
      <div className="fixed-top" style={{ left: 0, right: 0, zIndex: 1030 }}>
        <Navbar
          expand="lg"
          expanded={expanded}
          onToggle={(value) => setExpanded(value)}
          style={{
            background: 'linear-gradient(90deg, #002366 0%, #0044cc 50%, #002366 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 10s infinite linear',
            padding: '1.2rem 0',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          <Container fluid className="px-5 mb-1">
            <LinkContainer to="/">
              <Navbar.Brand className="brand-text d-flex align-items-center">
                <img
                  src={logo}
                  alt="Fin-freedom logo"
                  style={{ height: '62px', width: '62px', marginRight: '10px', objectFit: 'cover', borderRadius: '50%' }}
                />
                Fin Freedom Network
              </Navbar.Brand>
            </LinkContainer>

            <Navbar.Toggle
              aria-controls="basic-navbar-nav"
              className="border-0"
              onClick={() => setExpanded(!expanded)}
            />

            {expanded && <div className="menu-backdrop" onClick={() => setExpanded(false)} />}

            <Navbar.Collapse id="basic-navbar-nav">
              <div
                className="sidebar-close-btn"
                onClick={() => setExpanded(false)}
                dangerouslySetInnerHTML={{ __html: '&times;' }}
              />

              <Nav className="ms-auto align-items-center">
                <LinkContainer to="/" onClick={() => setExpanded(false)}>
                  <Nav.Link className="nav-link-custom mx-2">{t('nav.dashboard')}</Nav.Link>
                </LinkContainer>

                <LinkContainer to="/register" onClick={() => setExpanded(false)}>
                  <Nav.Link className="nav-link-custom mx-2">
                    {isRegistered ? t('nav.myLevels') : t('nav.register')}
                  </Nav.Link>
                </LinkContainer>

                <LinkContainer to="/orbits" onClick={() => setExpanded(false)}>
                  <Nav.Link className="nav-link-custom mx-2">{t('nav.orbits')}</Nav.Link>
                </LinkContainer>

                <LinkContainer to="/my-tokens" onClick={() => setExpanded(false)}>
                  <Nav.Link className="nav-link-custom mx-2">My Tokens</Nav.Link>
                </LinkContainer>

                <LinkContainer to="/founder" onClick={() => setExpanded(false)}>
                  <Nav.Link className="nav-link-custom mx-2">{t('nav.founderPanel')}</Nav.Link>
                </LinkContainer>

                <LinkContainer to="/admin" onClick={() => setExpanded(false)}>
                  <Nav.Link className="nav-link-custom mx-2">{t('nav.admin')}</Nav.Link>
                </LinkContainer>

                <div className="ms-lg-3 mt-3 mt-lg-0">
                  <LanguageSwitcher />
                </div>

                <div className="ms-lg-4 mt-3 mt-lg-0">
                  <ConnectButton />
                </div>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <div
          className="text-center mb-4"
          style={{
            backgroundColor: '#FFFFFF',
            color: '#002366',
            fontSize: '0.75rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '2.5px',
            padding: '5px 0',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            borderTop: '1px solid #ddd'
          }}
        >
          {t('nav.testMessage')}
        </div>
      </div>
    </>
  )
}














// import React, { useEffect, useState } from 'react'
// import { Navbar, Nav, Container } from 'react-bootstrap'
// import { LinkContainer } from 'react-router-bootstrap'
// import { ConnectButton } from '../Wallet/ConnectButton'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { useTranslation } from 'react-i18next'
// import { LanguageSwitcher } from './LanguageSwitcher'
// import logo from '../../assets/Fin-logo.jpg'

// export const Navigation = () => {
//   const { isConnected, account } = useWallet()
//   const { contracts, loadContracts } = useContracts()
//   const [isRegistered, setIsRegistered] = useState(false)
//   const { t } = useTranslation()

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const checkRegistrationStatus = async () => {
//     if (!contracts || !account || !isConnected) {
//       setIsRegistered(false)
//       return
//     }

//     try {
//       const registered =
//         typeof contracts.registration.isRegistered === 'function'
//           ? await contracts.registration.isRegistered(account)
//           : await contracts.registration.isParticipant(account)

//       setIsRegistered(registered)
//     } catch (err) {
//       console.error('Error checking registration status:', err)
//       setIsRegistered(false)
//     }
//   }

//   useEffect(() => {
//     checkRegistrationStatus()

//     // Set up an event listener for registration events
//     const setupEventListener = async () => {
//       if (!contracts?.registration) return;

//       try {
//         // Listen for Registered events
//         contracts.registration.on('Registered', (user, referrer, event) => {
//           // Check if this registration event is for the current user
//           if (user.toLowerCase() === account?.toLowerCase()) {
//             console.log('Registration event detected for current user');
//             setIsRegistered(true);
//           }
//         });

//         // Listen for LevelActivated events (in case level 1 is activated separately)
//         contracts.registration.on('LevelActivated', (user, level, price, event) => {
//           // If level 1 is activated for current user, they are registered
//           if (level === 1 && user.toLowerCase() === account?.toLowerCase()) {
//             console.log('Level 1 activation detected for current user');
//             setIsRegistered(true);
//           }
//         });
//       } catch (err) {
//         console.error('Error setting up event listeners:', err);
//       }
//     };

//     setupEventListener();

//     // Cleanup event listeners
//     return () => {
//       if (contracts?.registration) {
//         contracts.registration.removeAllListeners('Registered');
//         contracts.registration.removeAllListeners('LevelActivated');
//       }
//     };
//   }, [contracts, account, isConnected]);

//   // Also check periodically as a fallback (every 5 seconds)
//   useEffect(() => {
//     if (!isConnected) return;

//     const interval = setInterval(() => {
//       checkRegistrationStatus();
//     }, 5000);

//     return () => clearInterval(interval);
//   }, [contracts, account, isConnected]);

//   const customStyles = `
//     @keyframes shimmer {
//       0% { background-position: -200% 0; }
//       100% { background-position: 200% 0; }
//     }
//     @keyframes breathe {
//       0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(255,255,255,0.3); }
//       50% { opacity: 0.85; text-shadow: 0 0 20px rgba(255,255,255,0.6); }
//     }
//     .brand-text {
//       color: #FFFFFF !important;
//       font-weight: 800 !important;
//       font-size: 1.6rem !important;
//       letter-spacing: -0.5px;
//       animation: breathe 3s infinite ease-in-out;
//     }
//     .nav-link-custom {
//       color: #FFFFFF !important;
//       opacity: 0.9;
//       transition: all 0.3s ease;
//       font-weight: 500 !important;
//     }
//     .nav-link-custom:hover {
//       opacity: 1;
//       text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
//       transform: translateY(-1px);
//     }
//     .navbar-toggler-icon {
//       filter: invert(1) grayscale(100%) brightness(200%);
//     }
    
//     /* ===== RESPONSIVE ENHANCEMENTS - ADDED FOR ALL DEVICES ===== */
//     @media (max-width: 991px) {
//       .navbar-collapse {
//         background: linear-gradient(135deg, #002c77 0%, #003399 100%);
//         padding: 1.5rem;
//         border-radius: 0 0 20px 20px;
//         margin-top: 1rem;
//         box-shadow: 0 20px 30px rgba(0, 0, 0, 0.3);
//         border: 1px solid rgba(255, 255, 255, 0.1);
//         border-top: none;
//       }
      
//       .nav-link-custom {
//         font-size: 1.2rem;
//         padding: 0.75rem 1rem !important;
//         margin: 0.25rem 0 !important;
//         border-radius: 12px;
//         background: rgba(255, 255, 255, 0.05);
//         text-align: center;
//         width: 100%;
//       }
      
//       .nav-link-custom:hover {
//         background: rgba(255, 255, 255, 0.15);
//         transform: translateX(5px);
//       }
      
//       .ms-lg-3, .ms-lg-4 {
//         margin-left: 0 !important;
//         width: 100%;
//       }
      
//       .mt-3 {
//         margin-top: 1rem !important;
//       }
      
//       .language-switcher-container, .connect-button-container {
//         width: 100%;
//         display: flex;
//         justify-content: center;
//       }
//     }
    
//     @media (max-width: 768px) {
//       .brand-text {
//         font-size: 1.3rem !important;
//       }
      
//       .brand-text img {
//         height: 50px !important;
//         width: 50px !important;
//       }
      
//       .navbar {
//         padding: 0.8rem 0 !important;
//       }
      
//       .px-5 {
//         padding-left: 1.5rem !important;
//         padding-right: 1.5rem !important;
//       }
//     }
    
//     @media (max-width: 480px) {
//       .brand-text {
//         font-size: 1.1rem !important;
//       }
      
//       .brand-text img {
//         height: 42px !important;
//         width: 42px !important;
//         margin-right: 8px !important;
//       }
      
//       .navbar-toggler {
//         padding: 0.4rem 0.6rem !important;
//       }
      
//       .text-center.mb-4 {
//         font-size: 0.65rem !important;
//         letter-spacing: 1.5px !important;
//         padding: 4px 0 !important;
//       }
      
//       .navbar-collapse {
//         padding: 1.2rem !important;
//       }
      
//       .nav-link-custom {
//         font-size: 1rem;
//         padding: 0.6rem 0.8rem !important;
//       }
//     }
    
//     /* Landscape mode optimizations */
//     @media (max-height: 500px) and (orientation: landscape) {
//       .navbar-collapse {
//         max-height: 80vh;
//         overflow-y: auto;
//       }
      
//       .nav-link-custom {
//         padding: 0.4rem 0.8rem !important;
//         font-size: 0.95rem;
//       }
//     }
    
//     /* Tablet optimization */
//     @media (min-width: 768px) and (max-width: 991px) {
//       .navbar-collapse {
//         display: grid !important;
//         grid-template-columns: repeat(2, 1fr);
//         gap: 0.5rem;
//       }
      
//       .navbar-collapse .nav {
//         display: contents !important;
//       }
      
//       .navbar-collapse .nav-link-custom {
//         grid-column: span 1;
//       }
      
//       .navbar-collapse .ms-lg-3,
//       .navbar-collapse .ms-lg-4 {
//         grid-column: span 2;
//       }
//     }
    
//     /* High-end mobile devices */
//     @media (max-width: 380px) {
//       .brand-text {
//         font-size: 0.95rem !important;
//       }
      
//       .brand-text img {
//         height: 36px !important;
//         width: 36px !important;
//       }
      
//       .px-5 {
//         padding-left: 1rem !important;
//         padding-right: 1rem !important;
//       }
//     }
//   `

//   return (
//     <>
//       <style>{customStyles}</style>
//       <div className="fixed-top" style={{ left: 0, right: 0, zIndex: 1030 }}>
//         <Navbar
//           expand="lg"
//           style={{
//             background: 'linear-gradient(90deg, #002366 0%, #0044cc 50%, #002366 100%)',
//             backgroundSize: '200% 100%',
//             animation: 'shimmer 10s infinite linear',
//             padding: '1.2rem 0',
//             borderBottom: '1px solid rgba(255,255,255,0.15)',
//             boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
//           }}
//         >
//           <Container fluid className="px-5 mb-1">
//             <LinkContainer to="/">
//               <Navbar.Brand className="brand-text d-flex align-items-center">
//                 <img
//                   src={logo}
//                   alt="Fin-freedom logo"
//                   style={{ height: '62px', width: '62px', marginRight: '10px', objectFit: 'cover', borderRadius: '50%' }}
//                 />
//                 Fin Freedom Network
//               </Navbar.Brand>
//             </LinkContainer>

//             <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0" />

//             <Navbar.Collapse id="basic-navbar-nav">
//               <Nav className="ms-auto align-items-center">
//                 <LinkContainer to="/">
//                   <Nav.Link className="nav-link-custom mx-2">{t('nav.dashboard')}</Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/register">
//                   <Nav.Link className="nav-link-custom mx-2">
//                     {isRegistered ? t('nav.myLevels') : t('nav.register')}
//                   </Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/orbits">
//                   <Nav.Link className="nav-link-custom mx-2">{t('nav.orbits')}</Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/my-tokens">
//                   <Nav.Link className="nav-link-custom mx-2">My Tokens</Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/founder">
//                   <Nav.Link className="nav-link-custom mx-2">{t('nav.founderPanel')}</Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/admin">
//                   <Nav.Link className="nav-link-custom mx-2">{t('nav.admin')}</Nav.Link>
//                 </LinkContainer>

//                 <div className="ms-lg-3 mt-3 mt-lg-0">
//                   <LanguageSwitcher />
//                 </div>

//                 <div className="ms-lg-4 mt-3 mt-lg-0">
//                   <ConnectButton />
//                 </div>
//               </Nav>
//             </Navbar.Collapse>
//           </Container>
//         </Navbar>

//         <div
//           className="text-center mb-4"
//           style={{
//             backgroundColor: '#FFFFFF',
//             color: '#002366',
//             fontSize: '0.75rem',
//             fontWeight: '900',
//             textTransform: 'uppercase',
//             letterSpacing: '2.5px',
//             padding: '5px 0',
//             boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
//             borderTop: '1px solid #ddd'
//           }}
//         >
//           {t('nav.testMessage')}
//         </div>
//       </div>
//     </>
//   )
// }





























// import React, { useEffect, useState } from 'react'
// import { Navbar, Nav, Container } from 'react-bootstrap'
// import { LinkContainer } from 'react-router-bootstrap'
// import { ConnectButton } from '../Wallet/ConnectButton'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { useTranslation } from 'react-i18next'
// import { LanguageSwitcher } from './LanguageSwitcher'
// import logo from '../../assets/Fin-logo.jpg'

// export const Navigation = () => {
//   const { isConnected, account } = useWallet()
//   const { contracts, loadContracts } = useContracts()
//   const [isRegistered, setIsRegistered] = useState(false)
//   const { t } = useTranslation()

//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   const checkRegistrationStatus = async () => {
//     if (!contracts || !account || !isConnected) {
//       setIsRegistered(false)
//       return
//     }

//     try {
//       const registered =
//         typeof contracts.registration.isRegistered === 'function'
//           ? await contracts.registration.isRegistered(account)
//           : await contracts.registration.isParticipant(account)

//       setIsRegistered(registered)
//     } catch (err) {
//       console.error('Error checking registration status:', err)
//       setIsRegistered(false)
//     }
//   }

//   useEffect(() => {
//     checkRegistrationStatus()

//     // Set up an event listener for registration events
//     const setupEventListener = async () => {
//       if (!contracts?.registration) return;

//       try {
//         // Listen for Registered events
//         contracts.registration.on('Registered', (user, referrer, event) => {
//           // Check if this registration event is for the current user
//           if (user.toLowerCase() === account?.toLowerCase()) {
//             console.log('Registration event detected for current user');
//             setIsRegistered(true);
//           }
//         });

//         // Listen for LevelActivated events (in case level 1 is activated separately)
//         contracts.registration.on('LevelActivated', (user, level, price, event) => {
//           // If level 1 is activated for current user, they are registered
//           if (level === 1 && user.toLowerCase() === account?.toLowerCase()) {
//             console.log('Level 1 activation detected for current user');
//             setIsRegistered(true);
//           }
//         });
//       } catch (err) {
//         console.error('Error setting up event listeners:', err);
//       }
//     };

//     setupEventListener();

//     // Cleanup event listeners
//     return () => {
//       if (contracts?.registration) {
//         contracts.registration.removeAllListeners('Registered');
//         contracts.registration.removeAllListeners('LevelActivated');
//       }
//     };
//   }, [contracts, account, isConnected]);

//   // Also check periodically as a fallback (every 5 seconds)
//   useEffect(() => {
//     if (!isConnected) return;

//     const interval = setInterval(() => {
//       checkRegistrationStatus();
//     }, 5000);

//     return () => clearInterval(interval);
//   }, [contracts, account, isConnected]);

//   const customStyles = `
//     @keyframes shimmer {
//       0% { background-position: -200% 0; }
//       100% { background-position: 200% 0; }
//     }
//     @keyframes breathe {
//       0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(255,255,255,0.3); }
//       50% { opacity: 0.85; text-shadow: 0 0 20px rgba(255,255,255,0.6); }
//     }
//     .brand-text {
//       color: #FFFFFF !important;
//       font-weight: 800 !important;
//       font-size: 1.6rem !important;
//       letter-spacing: -0.5px;
//       animation: breathe 3s infinite ease-in-out;
//     }
//     .nav-link-custom {
//       color: #FFFFFF !important;
//       opacity: 0.9;
//       transition: all 0.3s ease;
//       font-weight: 500 !important;
//     }
//     .nav-link-custom:hover {
//       opacity: 1;
//       text-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
//       transform: translateY(-1px);
//     }
//     .navbar-toggler-icon {
//       filter: invert(1) grayscale(100%) brightness(200%);
//     }
//   `

//   return (
//     <>
//       <style>{customStyles}</style>
//       <div className="fixed-top" style={{ left: 0, right: 0, zIndex: 1030 }}>
//         <Navbar
//           expand="lg"
//           style={{
//             background: 'linear-gradient(90deg, #002366 0%, #0044cc 50%, #002366 100%)',
//             backgroundSize: '200% 100%',
//             animation: 'shimmer 10s infinite linear',
//             padding: '1.2rem 0',
//             borderBottom: '1px solid rgba(255,255,255,0.15)',
//             boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
//           }}
//         >
//           <Container fluid className="px-5 mb-1">
//             <LinkContainer to="/">
//               <Navbar.Brand className="brand-text d-flex align-items-center">
//                 <img
//                   src={logo}
//                   alt="Fin-freedom logo"
//                   style={{ height: '62px', width: '62px', marginRight: '10px', objectFit: 'cover', borderRadius: '50%' }}
//                 />
//                 Fin Freedom Network
//               </Navbar.Brand>
//             </LinkContainer>

//             <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0" />

//             <Navbar.Collapse id="basic-navbar-nav">
//               <Nav className="ms-auto align-items-center">
//                 <LinkContainer to="/">
//                   <Nav.Link className="nav-link-custom mx-2">{t('nav.dashboard')}</Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/register">
//                   <Nav.Link className="nav-link-custom mx-2">
//                     {isRegistered ? t('nav.myLevels') : t('nav.register')}
//                   </Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/orbits">
//                   <Nav.Link className="nav-link-custom mx-2">{t('nav.orbits')}</Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/my-tokens">
//                   <Nav.Link className="nav-link-custom mx-2">My Tokens</Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/founder">
//                   <Nav.Link className="nav-link-custom mx-2">{t('nav.founderPanel')}</Nav.Link>
//                 </LinkContainer>

//                 <LinkContainer to="/admin">
//                   <Nav.Link className="nav-link-custom mx-2">{t('nav.admin')}</Nav.Link>
//                 </LinkContainer>

//                 <div className="ms-lg-3 mt-3 mt-lg-0">
//                   <LanguageSwitcher />
//                 </div>

//                 <div className="ms-lg-4 mt-3 mt-lg-0">
//                   <ConnectButton />
//                 </div>
//               </Nav>
//             </Navbar.Collapse>
//           </Container>
//         </Navbar>

//         <div
//           className="text-center mb-4"
//           style={{
//             backgroundColor: '#FFFFFF',
//             color: '#002366',
//             fontSize: '0.75rem',
//             fontWeight: '900',
//             textTransform: 'uppercase',
//             letterSpacing: '2.5px',
//             padding: '5px 0',
//             boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
//             borderTop: '1px solid #ddd'
//           }}
//         >
//           {t('nav.testMessage')}
//         </div>
//       </div>
//     </>
//   )
// }
