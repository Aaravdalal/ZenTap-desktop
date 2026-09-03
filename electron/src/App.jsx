import { useState, useEffect } from 'react'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import WelcomeStep from './components/onboarding/WelcomeStep'
import MainApp from './components/MainApp'
import './App.css'

// Preload the 3D model as soon as this module loads
import { useGLTF } from '@react-three/drei'
import { MODEL_URL } from './components/shared/modelUrl'
import { preloadArtwork } from './components/shared/designArtboard'
useGLTF.preload(MODEL_URL)

function App() {
  // 'loading' | 'onboarding' | 'welcome' (returning users) | 'main'
  const [phase, setPhase] = useState('loading')

  useEffect(() => {
    // Without the preload (a plain browser) there is nothing to await, and the
    // old chain threw here and left the app stuck on a blank loading screen.
    const loaded = window.electron?.loadConfig?.() ?? Promise.resolve(null)
    loaded
      .then((config) => setPhase(config?.onboardingComplete ? 'welcome' : 'onboarding'))
      .catch(() => setPhase('onboarding'))
  }, [])

  // Warm the artwork while the welcome screen is on screen, so the app itself
  // does not fill in piece by piece after Continue.
  useEffect(() => {
    preloadArtwork()
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

  /*
   * The app is mounted underneath the welcome screen rather than after it. By
   * the time Continue is pressed the 3D device has been fetched, parsed and
   * had its shaders compiled, the app icons have streamed in, and the config
   * and usage figures are loaded - so the Home screen is simply uncovered
   * instead of being built.
   */
  const warming = phase === 'welcome'

  return (
    <div className="app-container">
      {phase === 'onboarding' && (
        <OnboardingFlow onComplete={() => setPhase('main')} />
      )}
      {(phase === 'main' || warming) && <MainApp />}
      {warming && (
        <div className="app-warming">
          <WelcomeStep returning onContinue={() => setPhase('main')} />
        </div>
      )}
    </div>
  )
}

export default App
