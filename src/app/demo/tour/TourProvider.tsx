import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { TOUR_STEPS } from "./steps";
import { TourOverlay } from "./TourOverlay";
import { track } from "../../services/analytics";

interface TourContextValue {
  active: boolean;
  stepIndex: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

// Mounted inside Layout.tsx (i.e. already within the router's tree) so
// it can navigate imperatively via useNavigate -- importing the router
// object directly here would create a cycle back through routes.tsx.
export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  function goTo(index: number) {
    if (index >= TOUR_STEPS.length) {
      track("Demo Guided Tour Completed");
      setActive(false);
      return;
    }
    if (index < 0) {
      setActive(false);
      return;
    }
    setStepIndex(index);
    navigate(TOUR_STEPS[index].path);
    track("Demo Guided Tour Step Viewed", { step: index + 1, step_name: TOUR_STEPS[index].title });
  }

  function start() {
    track("Demo Guided Tour Started");
    setActive(true);
    goTo(0);
  }

  function stop() {
    if (active) track("Demo Guided Tour Skipped", { step_at_skip: stepIndex + 1 });
    setActive(false);
  }

  const value: TourContextValue = {
    active,
    stepIndex,
    start,
    stop,
    next: () => goTo(stepIndex + 1),
    prev: () => goTo(stepIndex - 1),
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <TourOverlay
          step={TOUR_STEPS[stepIndex]}
          stepIndex={stepIndex}
          total={TOUR_STEPS.length}
          onNext={value.next}
          onPrev={value.prev}
          onStop={value.stop}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
