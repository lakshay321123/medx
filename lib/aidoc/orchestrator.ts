import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyIntent, extractEntities, detectSymptomKey } from './nlu';
import { FRAMES, SymptomKey } from './rules';
import { loadEpisode, saveEpisode, saveObservationNote, saveObservationSymptom } from './episodes';

const SAFETY = '\n\nThis is educational info, not a medical diagnosis. Please consult a clinician.';

interface OrchestrateParams {
  sb: SupabaseClient;
  userId: string;
  threadId: string;
  text: string;
  name: string;
  summaryText: string;
  lastSymptom?: { value_text: string; observed_at?: string; created_at?: string } | null;
}

function within30Days(d?: string) {
  if (!d) return false;
  return Date.now() - new Date(d).getTime() < 30*24*60*60*1000;
}

export async function orchestrate({ sb, userId, threadId, text, name, summaryText, lastSymptom }: OrchestrateParams) {
  const intent = classifyIntent(text);
  const entities = extractEntities(text);
  let state = await loadEpisode(sb, userId, threadId);

  if (state.step === 'resolved') {
    state = { ...state, step: 'idle', symptom_key: null, symptom_text: null, collected: {}, flags_prompt_count: 0, followup_prompt_count: 0 };
    await saveEpisode(sb, state);
  }

  // Special intents
  if (intent === 'research') {
    return { messages: [{ role:'assistant', content:`I can help you research that in **Research Mode** so we can pull the latest sources. Click **Open Research Mode** below.${SAFETY}` }], handoff:{ mode:'research' } };
  }

  if (intent === 'danger') {
    return { messages: [{ role:'assistant', content:`I can’t diagnose conditions here. Based on your concern, consider speaking to a relevant specialist and bringing prior reports. If symptoms are severe or rapidly worsening, seek urgent care immediately.${SAFETY}` }] };
  }

  if (intent === 'medication_request') {
    return { messages: [{ role:'assistant', content:`I can’t prescribe, but I can share general information.\nFor common symptoms, people sometimes consider OTC options **as per label dosing** if appropriate and if no allergies or interactions.\nBecause individual risks differ, please speak with a clinician before starting or changing medicines.${SAFETY}` }] };
  }

  if (intent === 'summary_request') {
    return { messages: [{ role:'assistant', content:`${summaryText ? `Here’s a quick summary I have:\n${summaryText}` : `I don’t have enough info to summarize yet.`}${SAFETY}` }] };
  }

  if (intent === 'boot') {
    const lastLine = lastSymptom && within30Days(lastSymptom.observed_at || lastSymptom.created_at) ? `Hope your ${lastSymptom.value_text} is better—how are you today?` : 'How are you feeling today?';
    return { messages: [{ role:'assistant', content:`${summaryText ? `Here’s a quick summary I have:\n${summaryText}\n\n` : ''}Hi ${name}, I’m here to help. ${lastLine}${SAFETY}` }] };
  }

  if (intent === 'greet') {
    return { messages: [{ role:'assistant', content:`How can I help today, ${name}? You can describe symptoms, ask about general care, or switch to **Research Mode** for literature.${SAFETY}` }] };
  }

  // Symptom flow
  if (state.step === 'idle' && intent === 'symptom') {
    const key = detectSymptomKey(text) as SymptomKey | null;
    const k: SymptomKey = key || 'fever';
    state.symptom_key = k;
    state.symptom_text = text;
    state.step = 'await_flags';
    state.flags_prompt_count = 0;
    state.followup_prompt_count = 0;
    state.collected = {};
    await saveEpisode(sb, state);
    const flags = FRAMES[k].redFlags.join(', ');
    return { messages: [{ role:'assistant', content:`Thanks for sharing, ${name}. Before I suggest next steps—any of these: ${flags}?${SAFETY}` }] };
  }

  if (state.step === 'await_flags' && state.symptom_key) {
    const frame = FRAMES[state.symptom_key as SymptomKey];
    const txt = text.toLowerCase();
    const mentions = frame.redFlags.filter(r => txt.includes(r.toLowerCase()));
    const saidNo = entities.yesNo === 'no' || entities.negated;
    if (mentions.length) {
      state.step = 'resolved';
      await saveEpisode(sb, state);
      return { messages: [{ role:'assistant', content:`Given possible red flags, please seek urgent care or contact a clinician soon.${SAFETY}` }] };
    }
    if (saidNo) {
      state.step = 'await_followups';
      state.followup_prompt_count = 0;
      await saveEpisode(sb, state);
      const first = frame.followups[0];
      state.followup_prompt_count = 1;
      await saveEpisode(sb, state);
      return { messages: [{ role:'assistant', content:`${first.ask}${SAFETY}` }] };
    }
    if (state.flags_prompt_count === 0) {
      state.flags_prompt_count = 1;
      await saveEpisode(sb, state);
      const flags = frame.redFlags.join(', ');
      return { messages: [{ role:'assistant', content:`Just to be safe—any of these: ${flags}?${SAFETY}` }] };
    }
    state.step = 'await_followups';
    state.followup_prompt_count = 0;
    await saveEpisode(sb, state);
    const first = frame.followups[0];
    state.followup_prompt_count = 1;
    await saveEpisode(sb, state);
    return { messages: [{ role:'assistant', content:`${first.ask}${SAFETY}` }] };
  }

  if (state.step === 'await_followups' && state.symptom_key) {
    const frame = FRAMES[state.symptom_key as SymptomKey];
    const idx = state.followup_prompt_count - 1;
    if (idx >= 0 && idx < frame.followups.length) {
      const prev = frame.followups[idx];
      switch (prev.capture) {
        case 'duration':
          if (entities.duration) state.collected.duration = entities.duration;
          break;
        case 'temp':
          if (entities.tempC) state.collected.tempC = entities.tempC;
          else if (entities.tempF) state.collected.tempF = entities.tempF;
          break;
        case 'painScore':
          if (typeof entities.painScore === 'number') state.collected.painScore = entities.painScore;
          break;
        case 'location':
          if (entities.location) state.collected.location = entities.location;
          break;
      }
    }
    if (state.followup_prompt_count < frame.followups.length && state.followup_prompt_count < 2) {
      const next = frame.followups[state.followup_prompt_count];
      state.followup_prompt_count += 1;
      await saveEpisode(sb, state);
      return { messages: [{ role:'assistant', content:`${next.ask}${SAFETY}` }] };
    }
    // Ready for plan
    await saveObservationSymptom(sb, userId, state.symptom_text || text);
    await saveObservationNote(sb, userId, `Self-care and tests discussed for ${state.symptom_key}`);
    state.step = 'resolved';
    await saveEpisode(sb, state);
    const plan = `${frame.selfCare}\n${frame.tests.length ? `Tests to consider: ${frame.tests.join(', ')}.\n` : ''}${frame.whenToSee}`;
    return { messages: [{ role:'assistant', content:`${plan}${SAFETY}` }] };
  }

  // Fallback
  return { messages: [{ role:'assistant', content:`How can I help today, ${name}? You can describe symptoms, ask about general care, or switch to **Research Mode** for literature.${SAFETY}` }] };
}
