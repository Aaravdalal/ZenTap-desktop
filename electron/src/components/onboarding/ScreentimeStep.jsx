import { useState } from 'react';
import OnboardingShell from './OnboardingShell';
import './ScreentimeStep.css';

const OPTIONS = ['0-2 Hours', '2-4 Hours', '4-6 Hours', '6-8 Hours', '8-10 Hours', '10 > Hours'];

export default function ScreentimeStep({ step, totalSteps, onBack, onContinue, value, onChange }) {
  const [selected, setSelected] = useState(value || null);

  const handleSelect = (opt) => {
    setSelected(opt);
    onChange?.(opt);
  };

  return (
    <OnboardingShell title="How Much Time Do You Spend on Your Screen Everyday?" onBack={onBack} step={step} totalSteps={totalSteps}>
      <div className="screentime-step">
        <div className="screentime-grid">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`screentime-option ${selected === opt ? 'selected' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <button className="screentime-continue" disabled={!selected} onClick={onContinue}>
          Continue
        </button>
      </div>
    </OnboardingShell>
  );
}
