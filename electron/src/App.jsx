import { useState, useEffect } from 'react'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import MainApp from './components/MainApp'
import './App.css'

// Preload the 3D model as soon as this module loads
import { useGLTF } from '@react-three/drei'
useGLTF.preload('/USBC_key_v2.glb')

function App() {
  const [phase, setPhase] = useState('loading') // 'loading', 'onboarding', 'main'

  useEffect(() => {
    window.electron?.loadConfig?.().then((config) => {
      setPhase(config?.onboardingComplete ? 'main' : 'onboarding')
    }).catch(() => setPhase('onboarding'))
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
