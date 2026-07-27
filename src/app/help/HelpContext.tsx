import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type HelpTab = "getting_started" | "learn" | "search" | "troubleshooting" | "developer" | "contact";

const STORAGE_KEY = "payreality_getting_started_done";

function loadDoneSteps(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

interface HelpContextValue {
  isOpen: boolean;
  activeTab: HelpTab;
  // Set when a contextual HelpIcon or search result opens the Learn tab
  // pointed at one specific article, so that article can be expanded/
  // scrolled to automatically. Cleared once the panel has consumed it.
  focusedArticleId: string | null;
  openHelp: (tab?: HelpTab) => void;
  closeHelp: () => void;
  setActiveTab: (tab: HelpTab) => void;
  openLearnArticle: (articleId: string) => void;
  clearFocusedArticle: () => void;
  doneSteps: Set<string>;
  markStepDone: (stepId: string) => void;
  toggleStep: (stepId: string) => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<HelpTab>("getting_started");
  const [focusedArticleId, setFocusedArticleId] = useState<string | null>(null);
  const [doneSteps, setDoneSteps] = useState<Set<string>>(() => loadDoneSteps());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(doneSteps)));
  }, [doneSteps]);

  function openHelp(tab?: HelpTab) {
    if (tab) setActiveTabState(tab);
    setIsOpen(true);
  }

  function closeHelp() {
    setIsOpen(false);
  }

  function setActiveTab(tab: HelpTab) {
    setActiveTabState(tab);
  }

  function openLearnArticle(articleId: string) {
    setFocusedArticleId(articleId);
    setActiveTabState("learn");
    setIsOpen(true);
  }

  function clearFocusedArticle() {
    setFocusedArticleId(null);
  }

  function markStepDone(stepId: string) {
    setDoneSteps((prev) => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  }

  function toggleStep(stepId: string) {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }

  return (
    <HelpContext.Provider
      value={{
        isOpen,
        activeTab,
        focusedArticleId,
        openHelp,
        closeHelp,
        setActiveTab,
        openLearnArticle,
        clearFocusedArticle,
        doneSteps,
        markStepDone,
        toggleStep,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp(): HelpContextValue {
  const context = useContext(HelpContext);
  if (!context) throw new Error("useHelp must be used within HelpProvider");
  return context;
}
