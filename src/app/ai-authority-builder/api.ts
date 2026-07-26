import { apiClient } from "../live/apiClient";
import type {
  Conflict,
  Corpus,
  Gap,
  GraphSummary,
  Operation,
  Principal,
  Question,
  Relationship,
  Resource,
} from "./types";

const BASE = "/v1/ai-authority-builder";

export const aiAuthorityBuilderApi = {
  createCorpus: (name: string, files: File[]) => {
    const form = new FormData();
    form.append("name", name);
    for (const file of files) form.append("files", file);
    return apiClient.post<Corpus>(`${BASE}/corpora`, form);
  },
  listCorpora: () => apiClient.get<Corpus[]>(`${BASE}/corpora`),
  getCorpus: (corpusId: string) => apiClient.get<Corpus>(`${BASE}/corpora/${corpusId}`),
  getSummary: (corpusId: string) => apiClient.get<GraphSummary>(`${BASE}/corpora/${corpusId}/summary`),
  getPrincipals: (corpusId: string) => apiClient.get<Principal[]>(`${BASE}/corpora/${corpusId}/principals`),
  getResources: (corpusId: string) => apiClient.get<Resource[]>(`${BASE}/corpora/${corpusId}/resources`),
  getOperations: (corpusId: string) => apiClient.get<Operation[]>(`${BASE}/corpora/${corpusId}/operations`),
  getRelationships: (corpusId: string) => apiClient.get<Relationship[]>(`${BASE}/corpora/${corpusId}/relationships`),
  getConflicts: (corpusId: string) => apiClient.get<Conflict[]>(`${BASE}/corpora/${corpusId}/conflicts`),
  getGaps: (corpusId: string) => apiClient.get<Gap[]>(`${BASE}/corpora/${corpusId}/gaps`),
  getQuestions: (corpusId: string) => apiClient.get<Question[]>(`${BASE}/corpora/${corpusId}/questions`),
  answerQuestion: (questionId: string, answer: string) =>
    apiClient.post<Question>(`${BASE}/questions/${questionId}/answer`, { answer }),
};
