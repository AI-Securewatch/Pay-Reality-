import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { TOUR_STEPS } from "./steps";
import { TourOverlay } from "./TourOverlay";

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
    if (index < 0 || index >= TOUR_STEPS.length) {
      setActive(false);
      return;
    }
    setStepIndex(index);
    navigate(TOUR_STEPS[index].path);
  }

  function start() {
    setActive(true);
    goTo(0);
  }

  const value: TourContextValue = {
    active,
    stepIndex,
    start,
    stop: () => setActive(false),
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
