import OnboardingShell from './OnboardingShell';
import { asset } from '../shared/designArtboard';
import { DHit } from '../shared/DesignStage';
import { useLinks, openLink } from '../shared/useLinks';
import './MessageStep.css';

/* Measured from UI References/Message_Onboarding.png. */
/*
 * Hit areas over the socials strip, measured from the icons in
 * public/ui/socials.png. The URLs live in electron/links.md.
 */
const SOCIALS = [
  { id: 'instagram', x: 1251, w: 34 },
  { id: 'linkedin', x: 1293, w: 34 },
  { id: 'reddit', x: 1335, w: 39 },
  { id: 'x', x: 1380, w: 33 },
];

export default function MessageStep({ step, totalSteps, onFinish }) {
  const links = useLinks();

  return (
    <OnboardingShell progress={(step + 0.5) / totalSteps}>
      <img
        className="ms-art"
        src="Focus_Image.png"
        alt=""
        draggable={false}
        style={{ left: 83, top: 86, width: 799, height: 949 }}
      />

      <div className="ms-para" style={{ left: 966, top: 284, width: 1010 }}>
        in the real world and spend time with people that really matter.
      </div>
      <div className="ms-para" style={{ left: 966, top: 467, width: 1010 }}>
        Everyone makes mistakes &mdash; just don&rsquo;t make the same ones everyone made.
      </div>
      <div className="ms-para" style={{ left: 966, top: 651, width: 300 }}>Focus,</div>

      <img
        className="ms-sign"
        src={asset('signature')}
        alt="the ZenTap team"
        draggable={false}
        style={{ left: 1180, top: 645, width: 610, height: 150 }}
      />
      <img
        className="ms-sign"
        src={asset('socials')}
        alt=""
        draggable={false}
        style={{ left: 1240, top: 825, width: 185, height: 55 }}
      />

      {SOCIALS.map(({ id, x, w }) => (
        <DHit
          key={id}
          className="ms-social-hit"
          x={x}
          y={818}
          w={w}
          h={68}
          onClick={() => openLink(links[id])}
          aria-label={id}
        />
      ))}

      <button type="button" className="ob-primary" style={{ left: 1053, top: 924, width: 922, height: 117 }} onClick={onFinish}>
        Home
      </button>
    </OnboardingShell>
  );
}
