import OnboardingShell from './OnboardingShell';
import './HowToUseStep.css';

const STEPS = [
  { n: 1, text: 'Click "Zen Device" and insert your ZenKey.' },
  { n: 2, text: "Choose which mode you'd like to use and what websites and apps you'd like to block." },
  { n: 3, text: "Then click start session and you're good to go." },
];

export default function HowToUseStep({ step, totalSteps, onBack, onContinue }) {
  return (
    <OnboardingShell title="How to use ZenTap?" onBack={onBack} step={step} totalSteps={totalSteps}>
      <div className="htu-step">
        <div className="htu-image-wrap">
          <img src="/HowToUse_Image.png" alt="How to use ZenTap" className="htu-image" />
        </div>
        <div className="htu-right">
          <div className="htu-steps">
            {STEPS.map(({ n, text }) => (
              <div className="htu-step-card" key={n}>
                <span className="htu-step-num">Step {n}</span>
                <span className="htu-step-divider" />
                <span className="htu-step-text">{text}</span>
              </div>
            ))}
          </div>
          <button className="htu-start-btn" onClick={onContinue}>Start Practice</button>
          <button className="htu-later-btn" onClick={onContinue}>I will try it later</button>
        </div>
      </div>
    </OnboardingShell>
  );
}
