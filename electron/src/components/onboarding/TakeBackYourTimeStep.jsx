import OnboardingShell from './OnboardingShell';
import { yearsOnComputer, yearsSaved } from './screentime';
import './TakeBackYourTimeStep.css';

/*
 * Measured from UI References/TakeBackYourTime_Onboarding.png.
 *
 * The two numbers come from what the user just told us, not from the mock's
 * placeholders: hours a day, over a 60-year stretch of adult life, expressed
 * as whole years. ZenTap's claim is that it gives back two thirds of that.
 */
export default function TakeBackYourTimeStep({
  step,
  totalSteps,
  onBack,
  onContinue,
  hoursPerDay = 5,
}) {
  const spendYears = yearsOnComputer(hoursPerDay);
  const saveYears = yearsSaved(spendYears);
  return (
    <OnboardingShell title="Take back your Time" onBack={onBack} progress={(step + 0.5) / totalSteps}>
      <div className="tb-caption" style={{ left: 222, top: 222, width: 666 }}>You will spend:</div>
      <div className="tb-card" style={{ left: 222, top: 305, width: 666, height: 533 }}>{spendYears}</div>
      <div className="tb-legend" style={{ left: 222, top: 866, width: 666 }}>years on your computer</div>

      <div className="tb-caption" style={{ left: 1231, top: 239, width: 666 }}>ZenKey can help you save:</div>
      <div className="tb-card" style={{ left: 1231, top: 322, width: 666, height: 533 }}>{saveYears}</div>
      <div className="tb-legend" style={{ left: 1231, top: 884, width: 666 }}>years</div>

      {/* The reference has no Continue control; the flow needs one, so it matches the other steps. */}
      <button type="button" className="ob-primary" style={{ left: 859, top: 921, width: 409, height: 117 }} onClick={onContinue}>
        Continue
      </button>
    </OnboardingShell>
  );
}
