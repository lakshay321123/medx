import type { SupabaseClient } from '@supabase/supabase-js';

export interface EpisodeState {
  user_id: string;
  thread_id: string;
  episode_id?: string;
  step: string;
  symptom_key?: string | null;
  symptom_text?: string | null;
  collected: Record<string, any>;
  flags_prompt_count: number;
  followup_prompt_count: number;
}

export async function loadEpisode(sb: SupabaseClient, userId: string, threadId: string): Promise<EpisodeState> {
  const { data } = await sb.from('aidoc_conversation_state').select('*').eq('user_id', userId).eq('thread_id', threadId).maybeSingle();
  if (data) {
    return {
      user_id: userId,
      thread_id: threadId,
      episode_id: data.episode_id,
      step: data.step || 'idle',
      symptom_key: data.symptom_key,
      symptom_text: data.symptom_text,
      collected: data.collected || {},
      flags_prompt_count: data.flags_prompt_count || 0,
      followup_prompt_count: data.followup_prompt_count || 0
    };
  }
  return {
    user_id: userId,
    thread_id: threadId,
    step: 'idle',
    collected: {},
    flags_prompt_count: 0,
    followup_prompt_count: 0
  };
}

export async function saveEpisode(sb: SupabaseClient, state: EpisodeState) {
  await sb.from('aidoc_conversation_state').upsert({
    user_id: state.user_id,
    thread_id: state.thread_id,
    episode_id: state.episode_id,
    step: state.step,
    symptom_key: state.symptom_key,
    symptom_text: state.symptom_text,
    collected: state.collected,
    flags_prompt_count: state.flags_prompt_count,
    followup_prompt_count: state.followup_prompt_count,
    updated_at: new Date().toISOString()
  });
}

export async function saveObservationSymptom(sb: SupabaseClient, userId: string, text: string) {
  await sb.from('observations').insert({
    user_id: userId,
    kind: 'symptom',
    value_text: text,
    observed_at: new Date().toISOString(),
    meta: { source: 'aidoc' }
  });
}

export async function saveObservationNote(sb: SupabaseClient, userId: string, text: string) {
  await sb.from('observations').insert({
    user_id: userId,
    kind: 'note',
    value_text: text,
    observed_at: new Date().toISOString(),
    meta: { source: 'aidoc' }
  });
}
