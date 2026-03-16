import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import { Navigation } from './components/Layout/Navbar'
import { Dashboard } from './Pages/Dashboard.jsx'
import { Registration } from './Pages/Registration'
import { Orbits } from './Pages/Orbits'
import { FounderPanel } from './Pages/FounderPanel'
import { AdminPanel } from './Pages/AdminPanel'
import { MyTokens } from './Pages/MyTokens'
import './App.css'

function App() {
  return (
    <>
      <Navigation />
      <Container fluid className="mt-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/orbits" element={<Orbits />} />
          <Route path="/my-tokens" element={<MyTokens />} />
          <Route path="/founder" element={<FounderPanel />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Container>
    </>
  )
}

export default App


