import OnboardingShell from './OnboardingShell';
import './TakeBackYourTimeStep.css';

export default function TakeBackYourTimeStep({ step, totalSteps, onBack, onContinue }) {
  return (
    <OnboardingShell title="Take back your Time" onBack={onBack} step={step} totalSteps={totalSteps}>
      <div className="tbyt-step">
        <div className="tbyt-columns">
          <div className="tbyt-column">
            <span className="tbyt-label">You will spend:</span>
            <div className="tbyt-card">
              <span className="tbyt-number">21</span>
            </div>
            <span className="tbyt-caption">years on your phone</span>
          </div>
          <div className="tbyt-column">
            <span className="tbyt-label">ZenKey can help you save:</span>
            <div className="tbyt-card">
              <span className="tbyt-number">14</span>
            </div>
            <span className="tbyt-caption">years</span>
          </div>
        </div>
        <button className="tbyt-continue" onClick={onContinue}>Continue</button>
      </div>
    </OnboardingShell>
  );
}
