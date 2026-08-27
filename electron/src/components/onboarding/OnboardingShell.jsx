import PageShell from '../shared/PageShell';
import './OnboardingShell.css';

export default function OnboardingShell({ title, onBack, step, totalSteps, children }) {
  const pct = totalSteps > 1 ? (step / (totalSteps - 1)) * 100 : 0;
  return (
    <div className="onboarding-page">
      <div className="onboarding-card-wrap">
        <PageShell title={title} onBack={onBack}>
          {children}
        </PageShell>
      </div>
      <div className="onboarding-progress-row">
        <div className="onboarding-progress-track">
          <div className="onboarding-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="onboarding-progress-marker" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}
