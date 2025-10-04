import { z } from "zod";

export const zFamilyHistoryItem = z.object({
  relation: z.enum(["father", "mother", "sibling", "child"]),
  condition: z.string().min(2),
  onsetAge: z.number().int().min(0).max(120).optional(),
});

export const zImmunizationItem = z.object({
  vaccine: z.string().min(2),
  date: z.string().datetime(),
  lot: z.string().optional(),
  source: z.string().url().optional(),
});

export const zLifestyle = z
  .object({
    smoking: z.object({
      status: z.enum(["none", "former", "current"]),
      packsPerDay: z.number().positive().max(5).optional(),
      years: z.number().int().positive().max(80).optional(),
    }),
    alcohol: z.object({
      status: z.enum(["none", "occasional", "regular"]),
      unitsPerWeek: z.number().int().min(0).max(100).optional(),
    }),
  })
  .partial();

export const zSurgeryItem = z.object({
  procedure: z.string().min(2),
  date: z.string().datetime(),
  notes: z.string().optional(),
});

export const zAccessibility = z.object({
  mobility: z.string().optional(),
  vision: z.string().optional(),
  hearing: z.string().optional(),
  communication: z.string().optional(),
});

export const zAdvanceDirectives = z.object({
  codeStatus: z.enum(["FULL", "DNR", "DNI"]).optional(),
  surrogateName: z.string().optional(),
  surrogatePhone: z.string().optional(),
  documentUrl: z.string().url().optional(),
});
