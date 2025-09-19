export type LabSeriesPoint = {
  sample_date: string;
  value: number;
};

export type LabTestSeries = {
  test_code: string;
  test_name?: string;
  unit?: string;
  series: LabSeriesPoint[];
};

export type LabsSummaryMeta = {
  total_reports?: number;
  [key: string]: unknown;
};

export type LabsSummaryResponse = {
  ok?: boolean;
  trend: LabTestSeries[];
  meta?: LabsSummaryMeta;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchLabsSummary(): Promise<LabsSummaryResponse> {
  try {
    const response = await fetch('/api/labs/summary', { cache: 'no-store' });
    const json = await safeJson(response);
    if (json && json.ok && Array.isArray(json.trend) && json.trend.length) {
      return json as LabsSummaryResponse;
    }
  } catch {
    // Swallow network/parse errors and fall back to fixture below.
  }

  const fallback = await fetch('/fixtures/labs-summary.json', { cache: 'no-store' });
  const json = await safeJson(fallback);
  if (json && Array.isArray(json.trend)) {
    return json as LabsSummaryResponse;
  }

  return { ok: false, trend: [], meta: { total_reports: 0 } };
}

