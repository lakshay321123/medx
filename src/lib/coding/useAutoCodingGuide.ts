import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  UniversalCodingAnswer,
  UniversalCodingInput,
  UniversalCodingMode
} from '@/lib/coding/generateUniversalAnswer';
import type { CaseCodingInput } from '@/lib/coding/collectCaseInput';

type HookMode = UniversalCodingMode;

type UseAutoCodingGuideArgs = {
  mode: HookMode;
  getCaseInput: () => CaseCodingInput | null;
};

type AutoCodingState = {
  data: UniversalCodingAnswer | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
};

type CacheEntry = {
  data?: UniversalCodingAnswer;
  error?: Error;
  promise?: Promise<UniversalCodingAnswer> | null;
};

const CACHE = new Map<string, CacheEntry>();
const FLAG_ENABLED = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ENABLE_AUTO_CODES === 'true' : false;
const DEBOUNCE_MS = 500;

async function requestUniversalAnswer(input: UniversalCodingInput, mode: HookMode): Promise<UniversalCodingAnswer> {
  const response = await fetch('/api/coding/universal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, mode })
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((body) => (typeof body?.error === 'string' ? body.error : null))
      .catch(() => null);
    throw new Error(message || 'Failed to load coding guidance');
  }

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || !payload.data) {
    throw new Error('Unexpected response from coding guide');
  }

  return payload.data as UniversalCodingAnswer;
}

function hasRequiredFields(input: CaseCodingInput | null): input is CaseCodingInput {
  if (!input) return false;
  const hasProcedure = typeof input.procedureName === 'string' && input.procedureName.trim().length > 0;
  const hasPos = typeof input.siteOfService === 'string' && input.siteOfService.trim().length > 0;
  const hasDxNarrative = typeof input.dxFreeText === 'string' && input.dxFreeText.trim().length > 0;
  const hasDxCodes = Array.isArray(input.dxCodes) && input.dxCodes.length > 0;
  return hasProcedure && hasPos && (hasDxNarrative || hasDxCodes);
}

function buildCaseKey(input: CaseCodingInput, mode: HookMode): string {
  const parts = [
    input.procedureName.trim().toLowerCase(),
    input.siteOfService.trim(),
    input.dxFreeText.trim().toLowerCase(),
    Array.isArray(input.dxCodes) ? input.dxCodes.join('|') : '',
    input.specialty ?? '',
    input.side ?? '',
    input.payer ?? '',
    mode,
  ];
  return parts.join('::');
}

function toUniversalInput(input: CaseCodingInput): UniversalCodingInput {
  const { procedureName, siteOfService, dxFreeText, dxCodes, specialty, side, payer } = input;
  const dxLabel = Array.isArray(dxCodes) && dxCodes.length > 0 ? `ICD-10: ${dxCodes.join(', ')}` : dxFreeText;

  const contextBits = [
    `Procedure: ${procedureName}${side ? ` (${side})` : ''}`,
    `Place of service: ${siteOfService}`,
    `Diagnosis focus: ${dxLabel}`,
  ];

  const additionalNotes: string[] = [];
  if (dxCodes?.length) {
    additionalNotes.push(`ICD-10 codes: ${dxCodes.join(', ')}`);
  }
  if (dxFreeText && dxCodes?.length) {
    additionalNotes.push(`Narrative dx: ${dxFreeText}`);
  }

  return {
    clinicalContext: contextBits.join(' | '),
    specialty,
    suspectedDiagnosis: dxFreeText,
    procedureDetails: side ? `Laterality: ${side}` : procedureName,
    payer,
    placeOfService: siteOfService,
    additionalNotes: additionalNotes.length > 0 ? additionalNotes.join(' | ') : undefined,
  };
}

const DEFAULT_STATE: AutoCodingState = {
  data: null,
  loading: false,
  error: null,
  refresh: () => undefined,
};

export function useAutoCodingGuide({ mode, getCaseInput }: UseAutoCodingGuideArgs): AutoCodingState {
  const enabled = FLAG_ENABLED;
  const [data, setData] = useState<UniversalCodingAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeKeyRef = useRef<string | null>(null);

  const snapshot = useMemo(() => {
    if (!enabled) return null;
    try {
      return getCaseInput();
    } catch (err) {
      console.error('collectCaseInput threw', err);
      return null;
    }
  }, [enabled, getCaseInput]);

  const caseKey = useMemo(() => {
    if (!enabled || !hasRequiredFields(snapshot)) {
      return null;
    }
    return buildCaseKey(snapshot, mode);
  }, [snapshot, enabled, mode]);

  const runFetch = useCallback(
    async (force = false) => {
      if (!enabled || !snapshot || !hasRequiredFields(snapshot) || !caseKey) {
        return;
      }

      const cached = CACHE.get(caseKey);
      if (!force && cached?.data) {
        setData(cached.data);
        setError(null);
        setLoading(false);
        return;
      }

      if (!force && cached?.promise) {
        setLoading(true);
        cached.promise
          .then((answer) => {
            if (activeKeyRef.current !== caseKey) return;
            setData(answer);
            setError(null);
            setLoading(false);
          })
          .catch((err) => {
            if (activeKeyRef.current !== caseKey) return;
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setLoading(false);
          });
        return;
      }

      const universalInput = toUniversalInput(snapshot);
      const promise = requestUniversalAnswer(universalInput, mode);
      CACHE.set(caseKey, { promise });
      setLoading(true);
      setError(null);

      promise
        .then((answer) => {
          CACHE.set(caseKey, { data: answer });
          if (activeKeyRef.current !== caseKey) return;
          setData(answer);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          const errorObj = err instanceof Error ? err : new Error('Failed to load coding guidance');
          CACHE.set(caseKey, { error: errorObj });
          if (activeKeyRef.current !== caseKey) return;
          setError(errorObj);
          setLoading(false);
        });
    },
    [enabled, snapshot, caseKey, mode],
  );

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!snapshot || !hasRequiredFields(snapshot) || !caseKey) {
      setData(null);
      setError(null);
      setLoading(false);
      activeKeyRef.current = null;
      return;
    }

    activeKeyRef.current = caseKey;

    const cached = CACHE.get(caseKey);
    if (cached?.data) {
      setData(cached.data);
      setError(null);
      setLoading(false);
      return;
    }

    if (cached?.error && !cached.promise) {
      setError(cached.error);
      setLoading(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      runFetch();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [enabled, snapshot, caseKey, runFetch]);

  const refresh = useCallback(() => {
    if (!enabled || !snapshot || !hasRequiredFields(snapshot) || !caseKey) return;
    CACHE.delete(caseKey);
    runFetch(true);
  }, [enabled, snapshot, caseKey, runFetch]);

  if (!enabled) {
    return DEFAULT_STATE;
  }

  return {
    data,
    loading,
    error,
    refresh,
  };
}
