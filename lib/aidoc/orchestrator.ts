import { SymptomKey, RED_FLAGS, FOLLOWUPS, SELF_CARE, TESTS } from "./rules";
import { extractEntities, SAID_NO_RX, Entities } from "./nlu";
import * as style from "./style";

type State = {
  step: 'idle'|'awaiting_red_flags'|'await_followups'|'resolved';
  symptom_key?: SymptomKey|null;
  symptom_text?: string|null;
  flags_prompt_count?: number;
  followup_stage?: number;   // which followup index we’re on
  collected?: Entities;
};

export function detectSymptomKey(text: string): SymptomKey | null {
  const t = text.toLowerCase();
  if (/\bback pain|low back|lumbar\b/.test(t)) return 'back_pain';
  if (/\bfever\b/.test(t)) return 'fever';
  if (/\bheadache|migraine\b/.test(t)) return 'headache';
  if (/\bcough\b/.test(t)) return 'cough';
  if (/\bsore throat|throat pain\b/.test(t)) return 'sore_throat';
  if (/\bcold|runny nose\b/.test(t)) return 'cold';
  return null;
}

export function nextTurn(userText: string, name: string, summary: string|undefined, state: State, opts?: {isBoot?: boolean, heard?: string[]}) {
  const text = userText || "";

  // Boot greeting (summary once)
  if (opts?.isBoot) {
    return { msg: style.hello(name, summary), newState: state };
  }

  // 1) If awaiting red flags, resolve or proceed
  if (state.step === 'awaiting_red_flags' && state.symptom_key) {
    const key = state.symptom_key;
    const saidNo = SAID_NO_RX.test(text.toLowerCase());
    const mentionsFlag = RED_FLAGS[key].some(f => text.toLowerCase().includes(f.split(' ')[0].toLowerCase()));

    if (!saidNo && mentionsFlag) {
      return { msg: style.urgent(), newState: { step:'resolved' } };
    }

    if (saidNo || (state.flags_prompt_count||0) >= 1) {
      // move to followups
      return {
        msg: style.askFollowup(FOLLOWUPS[key][0].ask),
        newState: { ...state, step:'await_followups', followup_stage: 1, collected: state.collected||{} }
      };
    }

    // re-ask once
    return {
      msg: style.askRedFlags(name, key.replace('_',' '), RED_FLAGS[key]),
      newState: { ...state, flags_prompt_count: (state.flags_prompt_count||0)+1 }
    };
  }

  // 2) If in followups, capture entities; ask next; or plan
  if (state.step === 'await_followups' && state.symptom_key) {
    const key = state.symptom_key;
    const ents = extractEntities(text);
    const collected = { ...(state.collected||{}), ...ents };
    const stage = state.followup_stage || 1;
    const fups = FOLLOWUPS[key];

    // if current required missing, ask it again in simpler wording once
    const need = fups[Math.min(stage-1, fups.length-1)];
    const have = !!collected[need.capture];
    if (!have) {
      return { msg: style.askFollowup(need.ask), newState: { ...state, collected, followup_stage: stage } };
    }

    // move to next followup or plan after max 2 followups
    const nextIdx = stage;
    if (nextIdx < fups.length && stage < 2) {
      return { msg: style.askFollowup(fups[nextIdx].ask), newState: { ...state, collected, followup_stage: stage+1 } };
    }

    // Ready to plan
    return {
      msg: style.plan(key.replace('_',' '), SELF_CARE[key], TESTS[key]),
      newState: { step:'resolved' }
    };
  }

  // 3) New symptom: choose focus & ask flags
  const key = detectSymptomKey(text);
  if (key) {
    const preface = style.pickedOne(opts?.heard||[], key.replace('_',' '));
    return {
      msg: preface + style.askRedFlags(name, key.replace('_',' '), RED_FLAGS[key]),
      newState: { step:'awaiting_red_flags', symptom_key:key, symptom_text:text, flags_prompt_count:0 }
    };
  }

  // 4) Small talk/general
  return {
    msg: `How can I help today, ${name}? You can describe symptoms, ask about general care, or switch to **Research Mode** for literature.\n\n${style.safety}`,
    newState: state
  };
}

