import { useState, useEffect } from 'react'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import MainApp from './components/MainApp'
import './App.css'

// Preload the 3D model as soon as this module loads
import { useGLTF } from '@react-three/drei'
import { MODEL_URL } from './components/InteractiveCard'
useGLTF.preload(MODEL_URL)

function App() {
  const [phase, setPhase] = useState('loading') // 'loading', 'onboarding', 'main'

  useEffect(() => {
    // Without the preload (a plain browser) there is nothing to await, and the
    // old chain threw here and left the app stuck on a blank loading screen.
    const loaded = window.electron?.loadConfig?.() ?? Promise.resolve(null)
    loaded
      .then((config) => setPhase(config?.onboardingComplete ? 'main' : 'onboarding'))
      .catch(() => setPhase('onboarding'))
  }, [])

  // A maximized window must not be draggable; the CSS keys off this class.
  useEffect(() => {
    window.electron?.onWindowMaximizeChange?.((isMaximized) => {
      document.body.classList.toggle('is-maximized', !!isMaximized)
    })
  }, [])

  if (phase === 'loading') {
    return <div className="app-container" />
  }

  return (
    <div className="app-container">
      {phase === 'onboarding' && (
        <OnboardingFlow onComplete={() => setPhase('main')} />
      )}
      {phase === 'main' && <MainApp />}
    </div>
  )
}

export default App
