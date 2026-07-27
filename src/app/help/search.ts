import {
  DEVELOPER_RESOURCES,
  GETTING_STARTED_STEPS,
  LEARN_ARTICLES,
  TROUBLESHOOTING_GUIDES,
} from "./content";

export type SearchCategory = "getting_started" | "learn" | "troubleshooting" | "developer";

export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  snippet: string;
  path?: string;
  href?: string;
  articleId?: string;
}

const CATEGORY_LABEL: Record<SearchCategory, string> = {
  getting_started: "Getting Started",
  learn: "Learn",
  troubleshooting: "Troubleshooting",
  developer: "Developer Resources",
};

export function categoryLabel(category: SearchCategory): string {
  return CATEGORY_LABEL[category];
}

interface Indexed {
  result: SearchResult;
  haystack: string;
  titleHaystack: string;
}

function buildIndex(): Indexed[] {
  const entries: Indexed[] = [];

  for (const step of GETTING_STARTED_STEPS) {
    entries.push({
      result: { id: step.id, category: "getting_started", title: step.label, snippet: step.description, path: step.path },
      haystack: `${step.label} ${step.description}`.toLowerCase(),
      titleHaystack: step.label.toLowerCase(),
    });
  }

  for (const article of LEARN_ARTICLES) {
    entries.push({
      result: { id: article.id, category: "learn", title: article.term, snippet: article.summary, articleId: article.id },
      haystack: `${article.term} ${article.summary} ${article.body}`.toLowerCase(),
      titleHaystack: article.term.toLowerCase(),
    });
  }

  for (const guide of TROUBLESHOOTING_GUIDES) {
    entries.push({
      result: {
        id: guide.id,
        category: "troubleshooting",
        title: guide.issue,
        snippet: guide.explanation,
        path: guide.path,
      },
      haystack: `${guide.issue} ${guide.explanation} ${guide.steps.join(" ")}`.toLowerCase(),
      titleHaystack: guide.issue.toLowerCase(),
    });
  }

  for (const resource of DEVELOPER_RESOURCES) {
    entries.push({
      result: {
        id: resource.id,
        category: "developer",
        title: resource.label,
        snippet: resource.description,
        href: resource.href,
      },
      haystack: `${resource.label} ${resource.description}`.toLowerCase(),
      titleHaystack: resource.label.toLowerCase(),
    });
  }

  return entries;
}

// Built once: the content this indexes is a static module, not fetched
// or user-editable, so there's nothing to invalidate the index over.
const INDEX = buildIndex();

// Title matches rank above body-only matches, so searching "agent"
// surfaces "Register an Agent" before an article that merely mentions
// agents in passing.
export function searchHelp(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const titleMatches: SearchResult[] = [];
  const bodyMatches: SearchResult[] = [];

  for (const entry of INDEX) {
    if (entry.titleHaystack.includes(q)) {
      titleMatches.push(entry.result);
    } else if (entry.haystack.includes(q)) {
      bodyMatches.push(entry.result);
    }
  }

  return [...titleMatches, ...bodyMatches];
}
