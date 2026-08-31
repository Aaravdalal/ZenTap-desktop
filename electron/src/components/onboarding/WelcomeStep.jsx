import OnboardingShell from './OnboardingShell';
import { asset } from '../shared/designArtboard';
import { useLinks, openLink } from '../shared/useLinks';
import './WelcomeStep.css';

/* Measured from UI References/Welcome.png (2135 x 1281 artboard). */
export default function WelcomeStep({ onContinue, onNoKey }) {
  const links = useLinks();

  return (
    <OnboardingShell hero>
      <img
        className="ob-hero"
        src={asset('onboarding_hero')}
        alt="ZenTap"
        draggable={false}
        style={{ left: 4, top: 0, width: 2127, height: 845 }}
      />

      <button type="button" className="ob-primary" style={{ left: 326, top: 901, width: 1483, height: 111 }} onClick={onContinue}>
        Continue
      </button>
      <button type="button" className="ob-secondary" style={{ left: 326, top: 1052, width: 1483, height: 111 }} onClick={onNoKey || onContinue}>
        I don&rsquo;t have a ZenKey
      </button>

      <div className="ob-terms" style={{ left: 326, top: 1215, width: 1483 }}>
        By continuing, you agree to our <u onClick={() => openLink(links.terms)}>Terms</u> and{' '}
        <u onClick={() => openLink(links.privacyPolicy)}>Privacy Policy</u>
      </div>
    </OnboardingShell>
  );
}
