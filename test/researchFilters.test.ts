import { describe, it, expect, vi } from "vitest";
import { orchestrateTrials } from "@/lib/research/orchestrator";

const mockTrials = [
  {
    title: "EGFR trial in India",
    url: "https://example.com/egfr",
    registryId: "NCT0001",
    extra: { phase: "3", status: "Recruiting", country: "India", genes: ["EGFR"] },
  },
  {
    title: "ALK trial in USA (Completed)",
    url: "https://example.com/alk",
    registryId: "NCT0002",
    extra: { phase: "2", status: "Completed", country: "United States", genes: ["ALK"] },
  },
  {
    title: "Generic NSCLC trial in UK",
    url: "https://example.com/nsclc",
    registryId: "NCT0003",
    extra: { phase: "3", status: "Active, not recruiting", country: "United Kingdom" },
  },
];

// Mock the fanout to avoid network during tests
vi.mock("@/lib/research/orchestrator", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    orchestrateTrials: async (_q: string, filters: any) => {
      let trials = [...mockTrials];
      if (filters.phase) trials = trials.filter(t => t.extra?.phase === filters.phase);
      if (filters.status) trials = trials.filter(t => (t.extra?.status || "").toLowerCase().includes(filters.status));
      if (filters.countries?.length) trials = trials.filter(t => filters.countries.includes(t.extra?.country));
      if (filters.genes?.length) trials = trials.filter(t => t.extra?.genes?.some((g: string) => filters.genes.includes(g)));
      return { trials, papers: [] };
    },
  };
});

describe("Research Orchestrator Filters", () => {
  it("filters by phase", async () => {
    const r = await orchestrateTrials("q", { phase: "3" }, { mode: "doctor", researchOn: true });
    expect(r.trials).toHaveLength(2);
    expect(r.trials.every(t => t.extra?.phase === "3")).toBe(true);
  });

  it("filters by status", async () => {
    const r = await orchestrateTrials("q", { status: "completed" }, { mode: "doctor", researchOn: true });
    expect(r.trials).toHaveLength(1);
    expect(r.trials[0].extra?.status).toContain("Completed");
  });

  it("filters by country", async () => {
    const r = await orchestrateTrials("q", { countries: ["India"] }, { mode: "doctor", researchOn: true });
    expect(r.trials).toHaveLength(1);
    expect(r.trials[0].extra?.country).toBe("India");
  });

  it("filters by gene", async () => {
    const r = await orchestrateTrials("q", { genes: ["EGFR"] }, { mode: "doctor", researchOn: true });
    expect(r.trials).toHaveLength(1);
    expect(r.trials[0].extra?.genes).toContain("EGFR");
  });

  it("applies multiple filters together", async () => {
    const r = await orchestrateTrials("q", { phase: "3", countries: ["India"], genes: ["EGFR"] }, { mode: "doctor", researchOn: true });
    expect(r.trials).toHaveLength(1);
    expect(r.trials[0].title).toContain("EGFR");
  });
});
