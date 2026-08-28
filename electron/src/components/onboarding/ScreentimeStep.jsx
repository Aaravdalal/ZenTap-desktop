import OnboardingShell from './OnboardingShell';
import './ScreentimeStep.css';

/* Measured from UI References/Screentime_Onboarding.png. */
const OPTIONS = [
  { id: '0-2', label: '0-2 Hours', x: 456, y: 277 },
  { id: '6-8', label: '6-8 Hours', x: 1171, y: 277 },
  { id: '2-4', label: '2-4 Hours', x: 456, y: 492 },
  { id: '8-10', label: '8-10 Hours', x: 1171, y: 492 },
  { id: '4-6', label: '4-6 Hours', x: 456, y: 707 },
  { id: '10+', label: '10 > Hours', x: 1171, y: 707 },
];

export default function ScreentimeStep({ step, totalSteps, onBack, onContinue, value, onChange }) {
  return (
    <OnboardingShell
      title="How Much Time Do You Spend on Your Screen Everyday?"
      onBack={onBack}
      progress={(step + 0.5) / totalSteps}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`ob-option ${value === o.id ? 'selected' : ''}`}
          style={{ left: o.x, top: o.y, width: 508, height: 103 }}
          onClick={() => onChange?.(o.id)}
          aria-pressed={value === o.id}
        >
          {o.label}
        </button>
      ))}

      <button
        type="button"
        className="ob-primary"
        style={{ left: 859, top: 921, width: 409, height: 117 }}
        onClick={onContinue}
        disabled={!value}
      >
        Continue
      </button>
    </OnboardingShell>
  );
}
