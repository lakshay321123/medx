export type LabResult = {
  name: string;
  value: number;
  unit: string;
  normalLow: number;
  normalHigh: number;
  flag: 'low' | 'high' | 'normal';
};

// Reference ranges for a few common labs
const LABS: { name: string; regex: RegExp; unit: string; low: number; high: number }[] = [
  {
    name: 'Hemoglobin',
    regex: /Hemoglobin\s*(\d+(?:\.\d+)?)\s*g\/dL/i,
    unit: 'g/dL',
    low: 12,
    high: 16,
  },
  {
    name: 'WBC',
    regex: /WBC\s*(\d+(?:\.\d+)?)\s*10\^3\/?\s*?\u03bc?L/i,
    unit: '10^3/uL',
    low: 4,
    high: 11,
  },
  {
    name: 'Platelets',
    regex: /Platelets?\s*(\d+(?:\.\d+)?)\s*10\^3\/?\s*?\u03bc?L/i,
    unit: '10^3/uL',
    low: 150,
    high: 450,
  },
  {
    name: 'Glucose',
    regex: /Glucose\s*(\d+(?:\.\d+)?)\s*mg\/dL/i,
    unit: 'mg/dL',
    low: 70,
    high: 99,
  },
];

export function parseLabValues(text: string): LabResult[] {
  const results: LabResult[] = [];
  for (const lab of LABS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(lab.regex.source, 'gi');
    while ((match = re.exec(text))) {
      const value = parseFloat(match[1]);
      const flag: LabResult['flag'] = value < lab.low ? 'low' : value > lab.high ? 'high' : 'normal';
      results.push({
        name: lab.name,
        value,
        unit: lab.unit,
        normalLow: lab.low,
        normalHigh: lab.high,
        flag,
      });
    }
  }
  return results;
}
