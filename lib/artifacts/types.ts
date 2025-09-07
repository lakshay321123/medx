export type ArtifactKind =
  | "diet_plan"
  | "workout_plan"
  | "ui_design"
  | "trials_query"
  | "travel_itinerary"
  | "generic_list";

export type Artifact =
  | { kind: "diet_plan"; meals: Array<{ name: string; items: string[]; kcal?: number; protein_g?: number }> }
  | { kind: "workout_plan"; days: Array<{ day: string; blocks: Array<{ name: string; exercises: string[] }> }> }
  | { kind: "ui_design"; palette: string[]; components?: string[]; notes?: string }
  | { kind: "trials_query"; filters: Record<string, string | string[]>; notes?: string }
  | { kind: "travel_itinerary"; days: Array<{ day: string; items: string[] }> }
  | { kind: "generic_list"; title: string; items: string[] };

export type ArtifactOps =
  | { op: "add_item"; path: string; value: string }
  | { op: "remove_item"; path: string; value?: string }
  | { op: "set_field"; path: string; value: any };
