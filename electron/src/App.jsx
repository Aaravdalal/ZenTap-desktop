import { useState, useEffect } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import Dashboard from './components/Dashboard'
import HudNotification from './components/HudNotification'
import RippleCanvas from './components/RippleCanvas'
import InteractiveCard from './components/InteractiveCard'
import { Suspense } from 'react'
import './App.css'

// Preload the 3D model as soon as this module loads
import { useGLTF } from '@react-three/drei'
useGLTF.preload('/USBC_key_v2.glb')

function App() {
  const [screen, setScreen] = useState('welcome') // 'welcome', 'dashboard'
  const [hudMessage, setHudMessage] = useState(null)

  useEffect(() => {
    // Setup HUD listening
    if (window.electron && window.electron.onHudMessage) {
      window.electron.onHudMessage((msg) => {
        setHudMessage(msg)
        setTimeout(() => setHudMessage(null), 3000)
      })
    }

    // Preload app icons in the background during the splash screen
    if (window.electron && window.electron.startIconStream) {
      window.electron.startIconStream()
    }
  }, [])

  return (
    <div className="app-container">
      <RippleCanvas />
      
      {/* Persistently mounted 3D device layer for instant results */}
      <div className={`global-model-container ${screen === 'dashboard' ? 'visible' : 'hidden'}`}>
        <Suspense fallback={null}>
          <InteractiveCard />
        </Suspense>
      </div>

      {screen === 'welcome' && (
        <WelcomeScreen onContinue={() => setScreen('dashboard')} />
      )}
      {screen === 'dashboard' && (
        <Dashboard />
      )}
      {hudMessage && <HudNotification message={hudMessage} />}
    </div>
  )
}

export default App
