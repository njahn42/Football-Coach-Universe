import { useEffect, useRef } from 'react';
import { GamepadAction, GAMEPAD_BUTTON_MAP } from '@/types';

export function useGamepad(onAction: (action: GamepadAction) => void) {
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    let animationFrameId: number;
    let previousButtons: boolean[] = [];

    const poll = () => {
      const gamepads = navigator.getGamepads();
      let gp: Gamepad | null = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gp = gamepads[i];
          break;
        }
      }
      
      if (gp) {
        const currentButtons = gp.buttons.map((b) => typeof b === 'object' ? b.pressed : b === 1.0);
        currentButtons.forEach((pressed, index) => {
          if (pressed && !previousButtons[index]) {
            const action = GAMEPAD_BUTTON_MAP[index];
            if (action) {
              onActionRef.current(action);
            }
          }
        });
        previousButtons = currentButtons;
      }
      animationFrameId = requestAnimationFrame(poll);
    };

    animationFrameId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
}
