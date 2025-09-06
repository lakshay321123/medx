import { matchFrame, fallbackFrame, Frame } from "./frames";
import { extractEntities, SAID_NO_RX, Entities } from "./nlu";
import * as style from "./style";

type State = {
  step: 'idle'|'awaiting_red_flags'|'await_followups'|'resolved';
  frame_key?: string|null;
  symptom_text?: string|null;
  flags_prompt_count?: number;
  followup_stage?: number;
  collected?: Entities;
};

export function nextTurn(userText: string, name: string, summary: string|undefined, state: State, opts?: {isBoot?: boolean, heard?: string[]}) {
  const text = userText || "";

  if (opts?.isBoot) {
    return { msg: style.hello(name, summary), newState: state };
  }

  // Awaiting red flags?
  if (state.step === 'awaiting_red_flags' && state.frame_key) {
    const frame: Frame | undefined = matchFrame(state.symptom_text || "")?.frame || fallbackFrame(state.symptom_text || "")?.frame;
    const saidNo = SAID_NO_RX.test(text.toLowerCase());
    const mentionsFlag = (frame?.red_flags || []).some(f => text.toLowerCase().includes(f.split(' ')[0].toLowerCase()));
    if (!saidNo && mentionsFlag) {
      return { msg: style.urgent(), newState: { step: 'resolved' } };
    }
    if (saidNo || (state.flags_prompt_count || 0) >= 1) {
      const firstAsk = frame?.followups?.[0]?.ask || "How long has this been going on?";
      return { msg: style.askFollowup(firstAsk), newState: { ...state, step: 'await_followups', followup_stage: 1, collected: state.collected || {} } };
    }
    const flags = frame?.red_flags || [];
    return { msg: style.askRedFlags(name, state.frame_key.replace(/^_/, '').replace('_',' '), flags), newState: { ...state, flags_prompt_count: (state.flags_prompt_count || 0) + 1 } };
  }

  // Awaiting followups?
  if (state.step === 'await_followups' && state.frame_key) {
    const frame: Frame | undefined = matchFrame(state.symptom_text || "")?.frame || fallbackFrame(state.symptom_text || "")?.frame;
    const ents = extractEntities(text);
    const collected = { ...(state.collected || {}), ...ents };
    const stage = state.followup_stage || 1;
    const fups = frame?.followups || [];
    const need = fups[Math.min(stage - 1, Math.max(0, fups.length - 1))];
    if (need && !(collected as any)[need.capture]) {
      return { msg: style.askFollowup(need.ask), newState: { ...state, collected, followup_stage: stage } };
    }
    const nextIdx = stage;
    if (nextIdx < fups.length && stage < 2) {
      return { msg: style.askFollowup(fups[nextIdx].ask), newState: { ...state, collected, followup_stage: stage + 1 } };
    }
    const msg = style.plan(state.frame_key.replace(/^_/, '').replace('_',' '), frame?.self_care || "", frame?.tests || []);
    return { msg, newState: { step: 'resolved' } };
  }

  // New symptom: pick frame
  const match = matchFrame(text) || fallbackFrame(text);
  if (match) {
    const pre = opts?.heard && opts.heard.length > 1 ? style.pickedOne(opts.heard, match.key.replace(/^_/, '').replace('_',' ')) : '';
    return {
      msg: pre + style.askRedFlags(name, match.key.replace(/^_/, '').replace('_',' '), match.frame.red_flags || []),
      newState: { step: 'awaiting_red_flags', frame_key: match.key, symptom_text: text, flags_prompt_count: 0 }
    };
  }

  return {
    msg: `How can I help today, ${name}? You can describe symptoms, ask about general care, or switch to **Research Mode** for literature.\n\n${style.safety}`,
    newState: state
  };
}
