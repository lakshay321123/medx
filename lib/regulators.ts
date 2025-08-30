export function officialBodiesFor(countryCode: string) {
  const cc = countryCode.toUpperCase();
  if (cc === 'IN') {
    return [
      { name: 'National Medical Commission (NMC) – Indian Medical Register', url: 'https://www.nmc.org.in' },
      { name: 'Tata Memorial Centre', url: 'https://tmc.gov.in' },
      { name: 'AIIMS Delhi – Cancer Centre', url: 'https://www.aiims.edu' },
      { name: 'Indian Council of Medical Research (ICMR)', url: 'https://www.icmr.gov.in' },
    ];
  }
  if (cc === 'GB') {
    return [
      { name: 'General Medical Council (GMC) register', url: 'https://www.gmc-uk.org' },
      { name: 'NHS Find services', url: 'https://www.nhs.uk/service-search' },
      { name: 'Royal College of Physicians / Surgeons / Oncologists', url: 'https://www.rcr.ac.uk' },
    ];
  }
  if (cc === 'US') {
    return [
      { name: 'NPI Registry (Centers for Medicare & Medicaid Services)', url: 'https://npiregistry.cms.hhs.gov' },
      { name: 'NCI Comprehensive Cancer Centers', url: 'https://www.cancer.gov/research/infrastructure/cancer-centers/find' },
      { name: 'ASCO – Find an Oncologist', url: 'https://www.asco.org' },
    ];
  }
  // Default global anchors
  return [
    { name: 'World Health Organization', url: 'https://www.who.int' }
  ];
}
