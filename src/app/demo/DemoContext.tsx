import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DemoAction, DemoState, Policy } from "./demoTypes";
import { demoReducer } from "./DemoEngine";
import { clearDemoData, getInitialState, saveDemoData } from "./demoStorage";
import { runScenarioStep, runScenarioWithDelay, type ScenarioType } from "./demoScenarios";

interface DemoContextValue {
  state: DemoState;
  dispatch: (action: DemoAction) => void;
  runScenario: (scenario: ScenarioType, onProgress?: (msg: string) => void) => Promise<void>;
  resetDemo: () => void;
  approve: (approvalId: string) => void;
  reject: (approvalId: string) => void;
  togglePolicy: (policyId: string) => void;
  processDocuments: (fileNames: string[]) => void;
  addManualPolicy: (policy: Omit<Policy, "id">) => void;
  scenarioRunning: boolean;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(demoReducer, undefined, getInitialState);
  const stateRef = useRef(state);
  const [scenarioRunning, setScenarioRunning] = useState(false);
  stateRef.current = state;

  useEffect(() => {
    const t = setTimeout(() => saveDemoData(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const setState = useCallback((s: DemoState) => {
    dispatch({ type: "SET_STATE", state: s });
  }, []);

  const runScenario = useCallback(
    async (scenario: ScenarioType, onProgress?: (msg: string) => void) => {
      if (scenarioRunning) return;
      setScenarioRunning(true);
      try {
        if (scenario === "enterprise") {
          await runScenarioWithDelay(
            scenario,
            () => stateRef.current,
            setState,
            onProgress
          );
        } else {
          setState(runScenarioStep(stateRef.current, scenario));
        }
      } finally {
        setScenarioRunning(false);
      }
    },
    [scenarioRunning, setState]
  );

  const resetDemo = useCallback(() => {
    clearDemoData();
    dispatch({ type: "RESET" });
  }, []);

  const approve = useCallback((approvalId: string) => {
    dispatch({ type: "APPROVE", approvalId });
  }, []);

  const reject = useCallback((approvalId: string) => {
    dispatch({ type: "REJECT", approvalId });
  }, []);

  const togglePolicy = useCallback((policyId: string) => {
    dispatch({ type: "TOGGLE_POLICY", policyId });
  }, []);

  const processDocuments = useCallback((fileNames: string[]) => {
    dispatch({ type: "PROCESS_DOCUMENTS", fileNames });
  }, []);

  const addManualPolicy = useCallback((policy: Omit<Policy, "id">) => {
    dispatch({ type: "ADD_MANUAL_POLICY", policy });
  }, []);

  return (
    <DemoContext.Provider
      value={{
        state,
        dispatch,
        runScenario,
        resetDemo,
        approve,
        reject,
        togglePolicy,
        processDocuments,
        addManualPolicy,
        scenarioRunning,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

export function getDashboardMetrics(state: DemoState) {
  return {
    activeAgents: state.agents.filter((a) => a.status === "Active").length,
    policies: state.policies.filter((p) => p.active).length,
    intercepts: state.intercepts.length,
    pendingApprovals: state.approvals.filter((a) => a.status === "pending").length,
    evidenceRecords: state.evidence.length,
    governanceCoverage: `${Math.round(state.insurance.governanceCoverage)}%`,
    insuranceScore: state.insurance.score,
  };
}
