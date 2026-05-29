import './WelcomeScreen.css';

export default function WelcomeScreen({ onContinue }) {
  return (
    <div className="welcome-container">
       <div className="center-content">
          <div className="logo-container">
            <img src="/zentap_logo.png" alt="ZenTap Logo" className="logo" />
          </div>
          
          <div className="text-content">
             <img src="/zentap_text.jpg" className="title-image" alt="ZenTap" />
             <p className="subtitle">— FOCUS • TAP • ACHIEVE —</p>
             <p className="version">1.0.0 ZEN OS</p>
          </div>
       </div>

       <button className="continue-btn" onClick={onContinue}>
          Continue &nbsp;→
       </button>
    </div>
  );
}
