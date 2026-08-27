import { useState } from 'react';
import WelcomeStep from './WelcomeStep';
import ScreentimeStep from './ScreentimeStep';
import TakeBackYourTimeStep from './TakeBackYourTimeStep';
import HowToUseStep from './HowToUseStep';
import MessageStep from './MessageStep';

const TOTAL_STEPS = 5;

export default function OnboardingFlow({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [screentimeBracket, setScreentimeBracket] = useState(null);

  const next = () => setStepIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const finish = () => {
    window.electron?.saveConfig?.({
      onboardingComplete: true,
      memberSince: new Date().toISOString(),
      screentimeBracket,
    });
    onComplete();
  };

  switch (stepIndex) {
    case 0:
      return <WelcomeStep onContinue={next} />;
    case 1:
      return (
        <ScreentimeStep
          step={1}
          totalSteps={TOTAL_STEPS}
          onBack={back}
          onContinue={next}
          value={screentimeBracket}
          onChange={setScreentimeBracket}
        />
      );
    case 2:
      return (
        <TakeBackYourTimeStep step={2} totalSteps={TOTAL_STEPS} onBack={back} onContinue={next} />
      );
    case 3:
      return (
        <HowToUseStep step={3} totalSteps={TOTAL_STEPS} onBack={back} onContinue={next} />
      );
    case 4:
      return (
        <MessageStep step={4} totalSteps={TOTAL_STEPS} onBack={back} onFinish={finish} />
      );
    default:
      return null;
  }
}
