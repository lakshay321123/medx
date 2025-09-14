export type AdaptiveResponse = {
  text: string;
  suggestions: string[];
};

// Simple rule-based demo to return structured responses for back pain.
export function generateAdaptiveAnswer(prompt: string): AdaptiveResponse {
  const q = prompt.trim().toLowerCase();

  if (q === 'what is back pain?' || q === 'what is back pain' || q === 'back pain') {
    return {
      text: `**What it is**\n- Discomfort or stiffness anywhere from the neck to the tailbone.\n- Often involves muscles, ligaments, discs, or vertebrae.\n- May stay local or radiate into hips or legs.\n\n**Types**\n- *Acute*: lasts days to weeks after a strain or minor injury.\n- *Chronic*: persists beyond three months, often linked to disc or joint changes.\n- *Axial*: localized mechanical pain.\n- *Radicular*: follows a nerve path, such as sciatica.`,
      suggestions: ['Symptoms', 'Causes', 'Home care', 'When to see a doctor', 'More detail']
    };
  }

  if (q === 'symptoms') {
    return {
      text: `**Symptoms**\n- Dull ache or sharp, shooting pain.\n- Limited range of motion or flexibility.\n- Numbness or tingling if nerves are involved.`,
      suggestions: ['Causes', 'Home care', 'When to see a doctor', 'More detail']
    };
  }

  if (q === 'causes') {
    return {
      text: `**Causes**\n- Muscle or ligament strain from lifting or sudden movement.\n- Disc degeneration or herniation.\n- Arthritis or spinal irregularities.`,
      suggestions: ['Symptoms', 'Home care', 'When to see a doctor', 'More detail']
    };
  }

  if (q === 'home care') {
    return {
      text: `**Home care**\n- Stay active with gentle stretching.\n- Use heat or cold packs for short-term relief.\n- Over-the-counter pain relievers can help temporarily.`,
      suggestions: ['Symptoms', 'Causes', 'When to see a doctor', 'More detail']
    };
  }

  if (q === 'when to see a doctor') {
    return {
      text: `**When to see a doctor**\n- Pain lasts more than a few weeks.\n- Numbness, weakness, or bladder issues.\n- History of trauma, cancer, or osteoporosis.`,
      suggestions: ['Symptoms', 'Causes', 'Home care', 'More detail']
    };
  }

  if (q === 'more detail') {
    return {
      text: `**More detail**\n- Back pain is extremely common and often resolves with conservative care.\n- Risk factors include age, poor posture, obesity, and inactivity.\n- Most cases are mechanical; serious causes are rare but require evaluation.`,
      suggestions: ['Symptoms', 'Causes', 'Home care', 'When to see a doctor']
    };
  }

  return {
    text: "I'm not sure about that topic yet.",
    suggestions: []
  };
}

