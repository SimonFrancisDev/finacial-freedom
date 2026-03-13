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

  useEffect(() => {
    if (isConnected) {
      loadContracts().catch(console.error)
    }
  }, [isConnected, loadContracts])

  useEffect(() => {
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

    checkRegistrationStatus()
  }, [contracts, account, isConnected])

  const customStyles = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes breathe {
      0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(255,255,255,0.3); }
      50% { opacity: 0.85; text-shadow: 0 0 20px rgba(255,255,255,0.6); }
    }
    .brand-text {
      color: #FFFFFF !important;
      font-weight: 800 !important;
      font-size: 1.6rem !important;
      letter-spacing: -0.5px;
      animation: breathe 3s infinite ease-in-out;
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
    .navbar-toggler-icon {
      filter: invert(1) grayscale(100%) brightness(200%);
    }
  `

  return (
    <>
      <style>{customStyles}</style>
      <div className="fixed-top" style={{ left: 0, right: 0, zIndex: 1030 }}>
        <Navbar
          expand="lg"
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
                {/* {t('nav.brand')} */}
                Fin Freedom Network
              </Navbar.Brand>
            </LinkContainer>

            <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0" />

            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="ms-auto align-items-center">
                <LinkContainer to="/">
                  <Nav.Link className="nav-link-custom mx-2">{t('nav.dashboard')}</Nav.Link>
                </LinkContainer>

                <LinkContainer to="/register">
                  <Nav.Link className="nav-link-custom mx-2">
                    {isRegistered ? t('nav.myLevels') : t('nav.register')}
                  </Nav.Link>
                </LinkContainer>

                <LinkContainer to="/orbits">
                  <Nav.Link className="nav-link-custom mx-2">{t('nav.orbits')}</Nav.Link>
                </LinkContainer>

                <LinkContainer to="/my-tokens">
                  <Nav.Link className="nav-link-custom mx-2">My Tokens</Nav.Link>
                </LinkContainer>

                <LinkContainer to="/founder">
                  <Nav.Link className="nav-link-custom mx-2">{t('nav.founderPanel')}</Nav.Link>
                </LinkContainer>

                <LinkContainer to="/admin">
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
