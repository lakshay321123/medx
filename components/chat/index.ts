/**
 * ChatPane decomposition — Phase 1
 *
 * Extracted modules (ready to swap into ChatPane.tsx):
 * - chatConstants.ts — types, regexes, format helpers (replaces ~60 lines)
 * - useShareMessage.ts — share/export hook (replaces ~80 lines of state + callbacks)
 * - useNearbyState.ts — nearby care state machine (replaces ~40 lines of state)
 *
 * Phase 2 (next PR):
 * - Update ChatPane.tsx imports to use these modules
 * - Extract MessageCards (AnalysisCard, ChatCard, ImageCard) → ~250 lines
 * - Extract nearby synonym dictionary → ~200 lines
 * - Extract send logic to useChatSend hook → ~400 lines
 *
 * Target: 4,587 → ~3,200 lines in ChatPane after full extraction
 */
export { useShareMessage } from "./useShareMessage";
export { useNearbyState, NEARBY_PATTERNS, NEARBY_DEFAULT_RADIUS_KM } from "./useNearbyState";
export {
  type HelperLabel,
  type FormatMap,
  type AdZone,
  FORMAT_STORAGE_KEY,
  DEFAULT_FORMAT_BY_MODE,
  LABS_TREND_INTENT,
  RAW_TEXT_INTENT,
  readFormatMap,
  writeFormatMap,
  safeParseFormatMap,
} from "./chatConstants";
