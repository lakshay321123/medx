import { z } from "zod";
import type { UniversalCodingAnswer, UniversalCodingMode } from "@/types/coding";

const claimLineSchema = z.object({
  cpt: z.string().trim().min(1),
  description: z.string().trim().optional(),
  modifiers: z
    .array(z.string().trim())
    .transform((list) => list.filter(Boolean))
    .optional(),
  dxPointers: z
    .array(z.string().trim())
    .min(1)
    .transform((list) => list.filter(Boolean)),
  pos: z.string().trim().min(1),
  units: z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === "number" ? String(value) : value.trim()))
    .refine((value) => value.length > 0, { message: "units required" }),
  notes: z.string().trim().optional(),
});

const referenceSchema = z
  .union([
    z.string().trim().transform((value) => ({ title: value })),
    z.object({
      title: z.string().trim(),
      url: z.string().trim().url().optional(),
      note: z.string().trim().optional(),
    }),
    z.object({
      citation: z.string().trim(),
      url: z.string().trim().url().optional(),
      note: z.string().trim().optional(),
    }).transform(({ citation, ...rest }) => ({ title: citation, ...rest })),
  ])
  .transform((value) => ({
    title: value.title,
    url: value.url,
    note: value.note,
  }));

const baseAnswerSchema = z.object({
  quickSummary: z.array(z.string().trim()).min(1),
  modifiers: z.array(z.string().trim()),
  ncciBundlingBullets: z.array(z.string().trim()),
  claimExample: z.object({
    dxCodes: z
      .array(z.string().trim())
      .max(4)
      .transform((codes) => codes.filter(Boolean).slice(0, 4)),
    claimLines: z.array(claimLineSchema).min(1),
    authBox23: z.string().trim().optional(),
  }),
  checklist: z.array(z.string().trim()).min(1),
  rationale: z.string().trim().optional(),
  payerNotes: z.array(z.string().trim()).optional(),
  icdSpecificity: z.array(z.string().trim()).optional(),
  references: z.array(referenceSchema).optional(),
});

export function validateUniversalCodingAnswer(
  raw: unknown,
  mode: UniversalCodingMode,
): UniversalCodingAnswer {
  const parsed = baseAnswerSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid coding answer shape");
  }

  const value = parsed.data;
  const ensureArray = <T>(items: T[] | undefined): T[] => (Array.isArray(items) ? items : []);

  const normalized: UniversalCodingAnswer = {
    quickSummary: value.quickSummary,
    modifiers: value.modifiers,
    ncciBundlingBullets: value.ncciBundlingBullets,
    claimExample: {
      dxCodes: value.claimExample.dxCodes,
      claimLines: value.claimExample.claimLines.map((line) => ({
        ...line,
        modifiers: line.modifiers?.filter(Boolean) ?? [],
        dxPointers: line.dxPointers.map((pointer) => pointer.replace(/[^A-Za-z0-9]/g, "")),
      })),
      authBox23: value.claimExample.authBox23,
    },
    checklist: value.checklist,
    rationale: value.rationale,
    payerNotes: ensureArray(value.payerNotes),
    icdSpecificity: ensureArray(value.icdSpecificity),
    references: value.references?.map((ref) => ({
      title: ref.title,
      url: ref.url,
      note: ref.note,
    })),
  };

  if (mode === "doctor+research") {
    normalized.rationale = value.rationale ?? "";
    normalized.payerNotes = ensureArray(value.payerNotes);
    normalized.icdSpecificity = ensureArray(value.icdSpecificity);
    normalized.references = (value.references ?? []).map((ref) => ({
      title: ref.title,
      url: ref.url,
      note: ref.note,
    }));
  } else {
    if (!normalized.rationale) delete normalized.rationale;
    if (!normalized.payerNotes?.length) delete normalized.payerNotes;
    if (!normalized.icdSpecificity?.length) delete normalized.icdSpecificity;
    if (!normalized.references?.length) delete normalized.references;
  }

  return normalized;
}
