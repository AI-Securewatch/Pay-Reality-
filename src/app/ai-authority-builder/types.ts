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
  // Authority-as-a-continuous-object, Stage E: null until a reviewer
  // resolves this discovery to a real Principal (match or create).
  resolved_principal_id: string | null;
}

// A real, existing Principal offered as a possible match for a
// discovery -- suggestion only, never applied without a reviewer
// explicitly confirming via ResolvePrincipalRequest.
export interface PrincipalCandidate {
  id: string;
  name: string;
  role: string | null;
  organization_id: string | null;
}

export interface ResolvePrincipalRequest {
  action: "match" | "create";
  principal_id?: string | null;
  name?: string | null;
  role?: string | null;
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
  // Authority-as-a-continuous-object, Stage F: populated once resolution
  // matches an already-resolved Principal on each side. status stays
  // "proposed" until a reviewer explicitly activates it -- resolving
  // names into real ids and deciding a delegation should actually govern
  // live enforcement are two different, deliberately separate steps.
  from_principal_id: string | null;
  to_principal_id: string | null;
  status: "proposed" | "active";
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
