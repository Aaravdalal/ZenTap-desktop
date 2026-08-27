import PillButton from '../shared/PillButton';
import './WelcomeStep.css';

export default function WelcomeStep({ onContinue }) {
  return (
    <div className="welcome-step">
      <div className="welcome-step-card">
        <img src="/Welcome_Logo.png" alt="ZenTap" className="welcome-step-logo" />
      </div>

      <div className="welcome-step-actions">
        <PillButton variant="blue" onClick={onContinue}>Continue</PillButton>
        <PillButton variant="black" onClick={onContinue}>I don't have a ZenKey</PillButton>
        <p className="welcome-step-legal">
          By continuing, you agree to our <a href="#" onClick={(e) => e.preventDefault()}>Terms</a> and{' '}
          <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
