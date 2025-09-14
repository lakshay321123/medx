import type { ActionId } from "./types";

export type Suggestion = {
  id: string;
  label: string;
  // If actionId exists → it’s an action button. Otherwise it’s a non-clickable prompt.
  actionId?: ActionId;
  payload?: unknown;
};

export const isAction = (s: Suggestion) => !!s.actionId;
