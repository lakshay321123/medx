// Lightweight helpers to fetch & normalize ClinicalTrials.gov v2 (fallback v1)

export type TrialDetails = {
  nctId: string;
  title?: string;
  conditions?: string[];
  phase?: string;
  status?: string;
  ageMin?: string;
  ageMax?: string;
  sex?: string; // All | Male | Female
  healthyVolunteers?: boolean;
  inclusion?: string[];   // bullets
  exclusion?: string[];   // bullets
  locations?: Array<{ facility?: string; city?: string; state?: string; country?: string; contact?: string; phone?: string; email?: string }>;
  source: 'ctgov-v2' | 'ctgov-v1';
};

function splitLines(s?: string) {
  if (!s) return [];
  return s.split(/\r?\n|\.\s+|\;\s+/).map(x => x.trim()).filter(Boolean);
}

function bulletsFromCriteria(text?: string) {
  const lines = splitLines(text);
  const incl: string[] = [];
  const excl: string[] = [];
  let current: 'inc'|'exc'|'none' = 'none';
  for (const l of lines) {
    const L = l.toLowerCase();
    if (/^\s*inclusion/.test(L)) { current = 'inc'; continue; }
    if (/^\s*exclusion/.test(L)) { current = 'exc'; continue; }
    if (current === 'inc') incl.push(l);
    else if (current === 'exc') excl.push(l);
    else {
      // no heading detected: try to infer
      if (/\bexclude|not eligible|contraindicat/i.test(L)) excl.push(l);
      else incl.push(l);
    }
  }
  return { inclusion: incl.slice(0, 12), exclusion: excl.slice(0, 12) };
}

// ---- v2 parsing (preferred) ----
function parseV2(json: any, nctId: string): TrialDetails | null {
  const s = json?.study;
  if (!s) return null;
  const elig = s?.protocolSection?.eligibilityModule;
  const contactLocations = s?.derivedSection?.contactsLocationsModule;
  const criteria = elig?.eligibilityCriteria;
  const { inclusion, exclusion } = bulletsFromCriteria(criteria);

  const locs = (contactLocations?.locations || []).map((l: any) => ({
    facility: l?.facility,
    city: l?.city,
    state: l?.state,
    country: l?.country,
    contact: l?.contact?.name,
    phone: l?.contact?.phone,
    email: l?.contact?.email
  }));

  return {
    nctId,
    title: s?.protocolSection?.identificationModule?.briefTitle,
    conditions: s?.protocolSection?.conditionsModule?.conditions || [],
    phase: (s?.protocolSection?.designModule?.phases || []).join(', ') || undefined,
    status: s?.protocolSection?.statusModule?.overallStatus,
    ageMin: elig?.minimumAge,
    ageMax: elig?.maximumAge,
    sex: elig?.sex || 'All',
    healthyVolunteers: Boolean(elig?.healthyVolunteers),
    inclusion,
    exclusion,
    locations: locs.slice(0, 30),
    source: 'ctgov-v2'
  };
}

// ---- v1 parsing (fallback) ----
function parseV1(json: any, nctId: string): TrialDetails | null {
  const fs = json?.FullStudiesResponse?.FullStudies?.[0]?.FullStudy;
  if (!fs) return null;
  const prot = fs?.Study?.ProtocolSection;
  const elig = prot?.EligibilityModule;
  const contacts = prot?.ContactsLocationsModule;
  const criteria = elig?.EligibilityCriteria;
  const { inclusion, exclusion } = bulletsFromCriteria(criteria);

  const locsRaw = contacts?.LocationList?.Location || [];
  const locs = locsRaw.map((l: any) => ({
    facility: l?.LocationFacility,
    city: l?.LocationCity,
    state: l?.LocationState,
    country: l?.LocationCountry,
    contact: l?.LocationContact?.LocationContactName,
    phone: l?.LocationContact?.LocationContactPhone,
    email: l?.LocationContact?.LocationContactEMail
  }));

  return {
    nctId,
    title: prot?.IdentificationModule?.BriefTitle,
    conditions: prot?.ConditionsModule?.ConditionList?.Condition || [],
    phase: prot?.DesignModule?.PhaseList?.Phase?.join(', ') || undefined,
    status: prot?.StatusModule?.OverallStatus,
    ageMin: elig?.MinimumAge,
    ageMax: elig?.MaximumAge,
    sex: elig?.Sex || 'All',
    healthyVolunteers: Boolean(elig?.HealthyVolunteers),
    inclusion,
    exclusion,
    locations: locs.slice(0, 30),
    source: 'ctgov-v1'
  };
}

export async function fetchCtgovDetails(nctId: string): Promise<TrialDetails> {
  // Try v2 JSON
  const v2 = await fetch(`https://clinicaltrials.gov/api/v2/studies/${encodeURIComponent(nctId)}?format=json`);
  if (v2.ok) {
    const j = await v2.json();
    const parsed = parseV2(j, nctId);
    if (parsed) return parsed;
  }
  // Fallback to v1 JSON
  const v1 = await fetch(`https://clinicaltrials.gov/api/query/full_studies?expr=NCTId:${encodeURIComponent(nctId)}&min_rnk=1&max_rnk=1&fmt=json`);
  if (v1.ok) {
    const j = await v1.json();
    const parsed = parseV1(j, nctId);
    if (parsed) return parsed;
  }
  throw new Error(`Unable to fetch details for ${nctId}`);
}
