import { useState, useEffect } from 'react';
import './WelcomeScreen.css';

export default function WelcomeScreen({ onContinue }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
      setTimeout(() => setPulse(false), 2000);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="welcome-container">
       <div className="center-content">
          <div className="logo-container">
            {/* The animated rings */}
            <div className={`ring ring-1 ${pulse ? 'animate-ring' : ''}`}></div>
            <div className={`ring ring-2 ${pulse ? 'animate-ring-delay' : ''}`}></div>
            <img src="/zentap_logo.png" alt="ZenTap Logo" className="logo" />
          </div>
          
          <div className="text-content">
             <h1 className="title">ZEN TAP</h1>
             <p className="subtitle">— FOCUS • TAP • ACHIEVE —</p>
             <p className="version">1.0.1 ZEN OS</p>
          </div>
       </div>

       <button className="continue-btn" onClick={onContinue}>
          Continue &nbsp;→
       </button>
    </div>
  );
}
