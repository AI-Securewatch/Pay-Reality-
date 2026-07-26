export interface Corpus {
  corpus_id: string;
  name: string;
  status: "uploaded" | "extracted" | "failed";
  error: string | null;
  document_count: number;
  created_at: string;
}

export interface Principal {
  id: string;
  name: string;
  role: string | null;
  reports_to: string | null;
  confidence: number;
  source_excerpt: string | null;
  source_location: string | null;
}

export interface Resource {
  id: string;
  name: string;
  description: string | null;
  confidence: number;
  source_excerpt: string | null;
  source_location: string | null;
}

export interface Operation {
  id: string;
  name: string;
  description: string | null;
  confidence: number;
  source_excerpt: string | null;
  source_location: string | null;
}

export interface Relationship {
  id: string;
  kind: "delegation" | "escalation" | "inheritance";
  from_principal: string;
  to_principal: string;
  description: string | null;
  confidence: number;
  source_excerpt: string | null;
  source_location: string | null;
}

export interface Conflict {
  id: string;
  description: string;
  reasoning: string | null;
  confidence: number;
}

export interface Gap {
  id: string;
  description: string;
  confidence: number;
  source_excerpt: string | null;
  source_location: string | null;
}

export interface Question {
  id: string;
  question: string;
  context: string | null;
  answered: boolean;
  answer: string | null;
}

export interface GraphSummary {
  policy_count: number;
  principal_count: number;
  resource_count: number;
  operation_count: number;
  relationship_count: number;
  conflict_count: number;
  gap_count: number;
  question_count: number;
}
