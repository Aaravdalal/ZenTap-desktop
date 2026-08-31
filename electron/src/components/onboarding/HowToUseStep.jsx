import OnboardingShell from './OnboardingShell';
import './HowToUseStep.css';

/* Measured from UI References/HowToUse_Onboarding.png. */
const STEPS = [
  { n: 1, y: 230, text: 'Click \u201cZen Device\u201d and insert your ZenKey.' },
  {
    n: 2,
    y: 442,
    text: 'Choose which mode you\u2019d like to use and what websites and apps you\u2019d like to block.',
  },
  { n: 3, y: 656, text: 'Then click start session and you\u2019re good to go.' },
];

export default function HowToUseStep({ step, totalSteps, onBack, onContinue }) {
  return (
    <OnboardingShell title="How to use ZenTap?" onBack={onBack} progress={(step + 0.5) / totalSteps}>
      <img
        className="ht-image"
        src="HowToUse_Image.png"
        alt=""
        draggable={false}
        style={{ left: 114, top: 231, width: 921, height: 768 }}
      />

      {STEPS.map((s) => (
        <div key={s.n} className="ht-card" style={{ left: 1267, top: s.y, width: 706, height: 135 }}>
          <span className="ht-card-n">Step {s.n}</span>
          <span className="ht-card-text">{s.text}</span>
        </div>
      ))}

      <button type="button" className="ob-secondary" style={{ left: 1267, top: 847, width: 706, height: 120 }} onClick={onContinue}>
        Start Practice
      </button>
      <button type="button" className="ht-later" style={{ left: 1267, top: 990, width: 706 }} onClick={onContinue}>
        I will try it later
      </button>
    </OnboardingShell>
  );
}
