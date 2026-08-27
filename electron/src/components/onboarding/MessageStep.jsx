import OnboardingShell from './OnboardingShell';
import './MessageStep.css';

const socialIcons = [
  { key: 'instagram', path: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.8 6.2a1 1 0 1 1-1 1 1 1 0 0 1 1-1z' },
  { key: 'linkedin', path: 'M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.1 3.77-2.1 4.03 0 4.78 2.6 4.78 6V21h-4v-5.6c0-1.35-.03-3.1-1.9-3.1-1.9 0-2.2 1.5-2.2 3v5.7H9z' },
  { key: 'reddit', path: 'M22 12a2 2 0 0 0-3.4-1.4 8.7 8.7 0 0 0-4.3-1.4l.8-3.6 2.6.6a1.5 1.5 0 1 0 .2-.9l-3-.7a.5.5 0 0 0-.6.4l-.9 4.2a8.7 8.7 0 0 0-4.4 1.4A2 2 0 1 0 6.6 14a3.9 3.9 0 0 0 0 .5c0 2.5 3 4.5 6.9 4.5s6.9-2 6.9-4.5a3.9 3.9 0 0 0 0-.5A2 2 0 0 0 22 12zM8.5 13.5a1.2 1.2 0 1 1 1.2 1.2 1.2 1.2 0 0 1-1.2-1.2zm7.7 3a4.8 4.8 0 0 1-4.2 1.9 4.8 4.8 0 0 1-4.2-1.9.4.4 0 1 1 .6-.5 4 4 0 0 0 3.6 1.6 4 4 0 0 0 3.6-1.6.4.4 0 1 1 .6.5zm-.2-1.8a1.2 1.2 0 1 1 1.2-1.2 1.2 1.2 0 0 1-1.2 1.2z' },
  { key: 'x', path: 'M4 4l7.5 8.4L4.4 20H6l6-6.7 4.6 6.7H20l-7.9-8.8L19.4 4H17.8l-5.6 6.2L8 4z' },
];

function SocialIcon({ path }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d={path} />
    </svg>
  );
}

export default function MessageStep({ step, totalSteps, onBack, onFinish }) {
  return (
    <OnboardingShell title="" onBack={onBack} step={step} totalSteps={totalSteps}>
      <div className="msg-step">
        <div className="msg-image-wrap">
          <img src="/Focus_Image.png" alt="Focus" className="msg-image" />
        </div>
        <div className="msg-right">
          <p className="msg-text">
            in the real world and spend time with people that really matter.
          </p>
          <p className="msg-text">
            Everyone makes mistakes just don't make the same ones everyone made.
          </p>
          <p className="msg-signoff">
            Focus, <span className="msg-signature">— zentap team</span>
          </p>
          <div className="msg-socials">
            {socialIcons.map(({ key, path }) => <SocialIcon key={key} path={path} />)}
          </div>
          <button className="msg-home-btn" onClick={onFinish}>Home</button>
        </div>
      </div>
    </OnboardingShell>
  );
}
