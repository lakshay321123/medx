import { matchFrame, fallbackFrame, FRAMES, Frame } from './frames';
import { detectYesNo, parseDuration, parseTemperature, parseSpO2, parsePainScore, parseLocation } from './nlu';
import { askRedFlags, askFollowup, urgent, plan } from './style';

export type ClientState = {
  step?: 'idle' | 'awaiting_red_flags' | 'awaiting_followups' | 'resolved';
  frame_key?: string;
  symptom_text?: string;
  flags_prompt_count?: number;
  followup_stage?: number;
  reask?: boolean;
  collected?: {
    duration?: string;
    tempC?: number;
    spo2Pct?: number;
    painScore?: number;
    location?: string;
  };
};

export function orchestrate(text: string, state: ClientState = {}, name?: string) {
  const lower = text.toLowerCase();
  const messages: { role: 'assistant'; content: string }[] = [];
  let newState: ClientState = { ...state };

  if (!state.step || state.step === 'idle' || state.step === 'resolved') {
    const match = matchFrame(lower) || fallbackFrame(lower);
    if (!match) {
      return { messages: [{ role: 'assistant', content: 'I\'m here to help with symptoms.' }], new_state: { step: 'idle' } };
    }
    const { key, frame } = match;
    const spo2 = parseSpO2(text);
    if (typeof spo2 === 'number' && spo2 <= 92) {
      messages.push({ role: 'assistant', content: urgent() });
      return { messages, new_state: { step: 'resolved' } };
    }
    const hit = frame.red_flags.some(r => lower.includes(r.toLowerCase()));
    if (hit) {
      messages.push({ role: 'assistant', content: urgent() });
      return { messages, new_state: { step: 'resolved' } };
    }
    newState = {
      step: 'awaiting_red_flags',
      frame_key: key,
      symptom_text: text,
      flags_prompt_count: 1,
      followup_stage: 0,
      collected: {}
    };
    messages.push({ role: 'assistant', content: askRedFlags(name || null, text, frame.red_flags) });
    return { messages, new_state: newState };
  }

  if (state.step === 'awaiting_red_flags' && state.frame_key) {
    const frame = FRAMES[state.frame_key];
    const yn = detectYesNo(text);
    if (yn === 'yes') {
      messages.push({ role: 'assistant', content: urgent() });
      return { messages, new_state: { step: 'resolved' } };
    }
    if (yn === 'no') {
      const fup = frame.followups[0];
      newState = { ...state, step: 'awaiting_followups', followup_stage: 0, reask: false };
      messages.push({ role: 'assistant', content: askFollowup(fup.question) });
      return { messages, new_state: newState };
    }
    if ((state.flags_prompt_count || 0) < 2) {
      newState = { ...state, flags_prompt_count: (state.flags_prompt_count || 0) + 1 };
      messages.push({ role: 'assistant', content: askRedFlags(name || null, state.symptom_text || '', frame.red_flags) });
      return { messages, new_state: newState };
    }
    // assume no
    const fup = frame.followups[0];
    newState = { ...state, step: 'awaiting_followups', followup_stage: 0, reask: false };
    messages.push({ role: 'assistant', content: askFollowup(fup.question) });
    return { messages, new_state: newState };
  }

  if (state.step === 'awaiting_followups' && state.frame_key) {
    const frame = FRAMES[state.frame_key];
    const idx = state.followup_stage || 0;
    const follow = frame.followups[idx];
    if (!follow || idx >= 2) {
      messages.push({ role: 'assistant', content: plan(state.symptom_text || '', frame.self_care, frame.tests, frame.when_to_see) });
      return { messages, new_state: { step: 'resolved' } };
    }
    let captured = false;
    const collected = { ...(state.collected || {}) };
    if (follow.key === 'duration') {
      const d = parseDuration(text);
      if (d) { collected.duration = d.raw; captured = true; }
    } else if (follow.key === 'tempC') {
      const t = parseTemperature(text);
      if (t) { collected.tempC = t.celsius; captured = true; }
    } else if (follow.key === 'spo2Pct') {
      const s = parseSpO2(text);
      if (typeof s === 'number') { collected.spo2Pct = s; captured = true; }
    } else if (follow.key === 'painScore') {
      const p = parsePainScore(text);
      if (typeof p === 'number') { collected.painScore = p; captured = true; }
    } else if (follow.key === 'location') {
      const l = parseLocation(text);
      if (l) { collected.location = l; captured = true; }
    }

    if (!captured && !state.reask) {
      newState = { ...state, reask: true };
      messages.push({ role: 'assistant', content: askFollowup(follow.question) });
      return { messages, new_state: newState };
    }

    const nextIdx = idx + 1;
    newState = { ...state, followup_stage: nextIdx, reask: false, collected };
    if (nextIdx >= frame.followups.length || nextIdx >= 2) {
      messages.push({ role: 'assistant', content: plan(state.symptom_text || '', frame.self_care, frame.tests, frame.when_to_see) });
      return { messages, new_state: { step: 'resolved' } };
    }
    const nextFollow = frame.followups[nextIdx];
    const echoes: string[] = [];
    if (collected.duration && follow.key === 'duration') echoes.push(`day ~${collected.duration}`);
    if (collected.tempC && follow.key === 'tempC') echoes.push(`~${collected.tempC}\xB0C`);
    if (collected.spo2Pct && follow.key === 'spo2Pct') echoes.push(`SpO₂ ${collected.spo2Pct}%`);
    if (collected.location && follow.key === 'location') echoes.push(collected.location);
    if (collected.painScore && follow.key === 'painScore') echoes.push(`pain ${collected.painScore}/10`);
    const ack = echoes.length ? `Got it — ${echoes.join('; ')}.` : 'Got it.';
    messages.push({ role: 'assistant', content: `${ack} ${askFollowup(nextFollow.question)}`.trim() });
    return { messages, new_state: newState };
  }

  messages.push({ role: 'assistant', content: plan(state.symptom_text || '', '', [], '') });
  return { messages, new_state: { step: 'resolved' } };
}
