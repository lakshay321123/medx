import { create } from 'zustand';
import type { StructuredAidocResponse } from '@/lib/aidoc/structured';

export type AidocMsg = { role: string; content: string };

type StructuredSlice = {
  kind: string | null;
  intent: string | null;
  patient: StructuredAidocResponse['patient'];
  reports: StructuredAidocResponse['reports'];
  comparisons: StructuredAidocResponse['comparisons'];
  summary: string;
  nextSteps: string[];
};

type AidocStore = {
  messages: AidocMsg[];
  hasAnimated: Record<string, true>;
  structured: StructuredSlice;
  resetForThread: (id: string) => void;
  setStructured: (payload: StructuredAidocResponse | null) => void;
};

const makeDefaultStructured = (): StructuredSlice => ({
  kind: null,
  intent: null,
  patient: null,
  reports: [],
  comparisons: {},
  summary: '',
  nextSteps: [],
});

export const useAidocStore = create<AidocStore>(set => ({
  messages: [],
  hasAnimated: {},
  structured: makeDefaultStructured(),
  resetForThread: () =>
    set({
      messages: [],
      hasAnimated: {},
      structured: makeDefaultStructured(),
    }),
  setStructured: payload =>
    set(state => ({
      structured: payload
        ? {
            kind: payload.kind,
            intent: payload.intent,
            patient: payload.patient,
            reports: payload.reports,
            comparisons: payload.comparisons,
            summary: payload.summary,
            nextSteps: payload.nextSteps,
          }
        : makeDefaultStructured(),
      messages: state.messages,
      hasAnimated: state.hasAnimated,
    })),
}));
