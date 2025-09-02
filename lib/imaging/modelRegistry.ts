export type InputFmt = "bytes" | "json_base64";
export type Task = "classify-bone" | "classify-chest" | "gen-report-any" | "gen-report-chest" | "gen-report-general";

export type HFModel = {
  id: string;
  task: Task;
  input: InputFmt;
  family: "bone" | "chest" | "any";
  notes?: string;
};

export const MODELS: HFModel[] = [
  { id: process.env.HF_BONE_MODEL  || "prithivMLmods/Bone-Fracture-Detection", task: "classify-bone",  input: "bytes", family: "bone" },
  { id: process.env.HF_CHEST_MODEL || "keremberke/yolov8m-chest-xray-classification", task: "classify-chest", input: "bytes", family: "chest" },

  { id: process.env.HF_GEN_ANY     || "google/medgemma-4b-it",            task: "gen-report-any",     input: "bytes", family: "any"   },
  { id: process.env.HF_GEN_CHEST   || "microsoft/maira-2",                task: "gen-report-chest",   input: "bytes", family: "chest" },
  { id: process.env.HF_GEN_GENERAL || "prithivMLmods/Radiology-Infer-Mini", task: "gen-report-general", input: "bytes", family: "any"   },
];

export function guessFamily(hint = "", fileName = ""): "bone" | "chest" {
  const s = `${hint} ${fileName}`.toLowerCase();
  if (/(chest|cxr|lung|thorax|pa|ap)/.test(s)) return "chest";
  if (/(wrist|hand|finger|elbow|shoulder|humerus|tibia|fibula|knee|ankle|forearm|bone|fracture|mura|leg)/.test(s)) return "bone";
  return "bone"; // default
}

export function pickCandidates(family: "bone"|"chest") {
  if (family === "chest") {
    return {
      classifiers: MODELS.filter(m => m.task === "classify-chest"),
      generators:  MODELS.filter(m => m.task === "gen-report-chest").concat(MODELS.filter(m => m.task === "gen-report-any"))
    };
  }
  return {
    classifiers: MODELS.filter(m => m.task === "classify-bone"),
    generators:  MODELS.filter(m => m.task === "gen-report-general").concat(MODELS.filter(m => m.task === "gen-report-any"))
  };
}
