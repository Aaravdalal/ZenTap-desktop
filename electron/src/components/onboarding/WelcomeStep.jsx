import OnboardingShell from './OnboardingShell';
import { asset } from '../shared/designArtboard';
import { useLinks, openLink } from '../shared/useLinks';
import './WelcomeStep.css';

/*
 * Measured from UI References/Welcome.png (2135 x 1281 artboard).
 *
 * `returning` is the same screen shown on every later launch: the hero and a
 * single Continue, with the ZenKey alternative and the terms line dropped.
 * Continue moves to the middle of the band, which would otherwise sit empty
 * below it.
 */
const CONTINUE = { x: 326, w: 1483, h: 111, first: 901, alone: 1084 };

/*
 * On the returning screen the band only has to hold one button, so the card
 * grows to take the space back. The artwork keeps its own size at the top of
 * a taller panel - the rest is the flat #F0F0F0 its bottom rows already are -
 * so the wordmark is untouched and the rounded corners stay put.
 */
const RETURNING_HERO_BOTTOM = 1000;
const HERO = { x: 4, w: 2127, h: 845 };

export default function WelcomeStep({ onContinue, onNoKey, returning = false }) {
  const links = useLinks();

  return (
    <OnboardingShell
      hero
      heroBottom={returning ? RETURNING_HERO_BOTTOM : undefined}
      showClose={false}
    >
      {returning ? (
        <div
          className="ob-hero-panel"
          style={{ left: HERO.x, top: 0, width: HERO.w, height: RETURNING_HERO_BOTTOM }}
        >
          <img src={asset('onboarding_hero')} alt="ZenTap" draggable={false} />
        </div>
      ) : (
        <img
          className="ob-hero"
          src={asset('onboarding_hero')}
          alt="ZenTap"
          draggable={false}
          style={{ left: HERO.x, top: 0, width: HERO.w, height: HERO.h }}
        />
      )}

      <button
        type="button"
        className="ob-primary"
        style={{
          left: CONTINUE.x,
          top: returning ? CONTINUE.alone : CONTINUE.first,
          width: CONTINUE.w,
          height: CONTINUE.h,
        }}
        onClick={onContinue}
      >
        Continue
      </button>

      {!returning && (
        <>
          <button type="button" className="ob-secondary" style={{ left: 326, top: 1052, width: 1483, height: 111 }} onClick={onNoKey || onContinue}>
            I don&rsquo;t have a ZenKey
          </button>

          <div className="ob-terms" style={{ left: 326, top: 1219, width: 1483 }}>
            By continuing, you agree to our <u onClick={() => openLink(links.terms)}>Terms</u> and{' '}
            <u onClick={() => openLink(links.privacyPolicy)}>Privacy Policy</u>
          </div>
        </>
      )}
    </OnboardingShell>
  );
}
