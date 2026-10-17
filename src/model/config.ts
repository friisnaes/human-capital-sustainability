/**
 * Modelkonfiguration for Organizational Resilience Score™ (ORS) og risikomodellen.
 *
 * Alle vægte, tærskler og normaliseringer er samlet her, så de kan
 * dokumenteres, efterregnes og senere kalibreres mod virkelige data.
 * Værdierne er faglige prototype-antagelser – ikke empirisk validerede.
 */

export type DimensionId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';

export type IndicatorId =
  | 'I1.1' | 'I1.2'
  | 'I2.1' | 'I2.2' | 'I2.3'
  | 'I3.1' | 'I3.2'
  | 'I4.1' | 'I4.2' | 'I4.3' | 'I4.4'
  | 'I5.1' | 'I5.2' | 'I5.3'
  | 'I6.1' | 'I6.2' | 'I6.3';

export interface ModelConfig {
  version: string;
  validFrom: string;
  changeNote: string;
  dimensionWeights: Record<DimensionId, number>;
  indicatorWeights: Record<IndicatorId, number>;
  /**
   * Svaghedsloft: ORS kan højst være svageste dimension + dette antal point.
   * null = intet loft (v1.0).
   */
  weaknessCapPoints: number | null;
  /** Minimumsdatadækning for at vise en dimensionsscore (0–1). */
  minDimensionCoverage: number;
  /** Minimumsandel af samlet dimensionsvægt med score for at vise ORS (0–1). */
  minOrsWeightCoverage: number;
  /** Statusgrænser (nedre grænse, inklusive). */
  thresholds: { robust: number; tilstrækkelig: number; sårbar: number };
  /** Ændringer mindre end dette antal point vises som uændret. */
  changeResolution: number;
}

const DIMENSION_WEIGHTS: Record<DimensionId, number> = {
  D1: 0.2,
  D2: 0.2,
  D3: 0.2,
  D4: 0.15,
  D5: 0.1,
  D6: 0.15,
};

const INDICATOR_WEIGHTS: Record<IndicatorId, number> = {
  'I1.1': 0.65,
  'I1.2': 0.35,
  'I2.1': 0.45,
  'I2.2': 0.3,
  'I2.3': 0.25,
  'I3.1': 0.6,
  'I3.2': 0.4,
  'I4.1': 0.3,
  'I4.2': 0.25,
  'I4.3': 0.25,
  'I4.4': 0.2,
  'I5.1': 0.4,
  'I5.2': 0.35,
  'I5.3': 0.25,
  'I6.1': 0.4,
  'I6.2': 0.35,
  'I6.3': 0.25,
};

const BASE = {
  dimensionWeights: DIMENSION_WEIGHTS,
  indicatorWeights: INDICATOR_WEIGHTS,
  minDimensionCoverage: 0.6,
  minOrsWeightCoverage: 0.75,
  thresholds: { robust: 75, tilstrækkelig: 60, sårbar: 45 },
  changeResolution: 3,
} as const;

export const MODEL_V1_0: ModelConfig = {
  ...BASE,
  version: '1.0',
  validFrom: '2025-01-01',
  changeNote: 'Første version: vægtet gennemsnit af seks dimensioner.',
  weaknessCapPoints: null,
};

export const MODEL_V1_1: ModelConfig = {
  ...BASE,
  version: '1.1',
  validFrom: '2026-04-01',
  changeNote:
    'Svaghedsloft indført: ORS kan højst være 30 point over den svageste dimension, så en høj gennemsnitsscore ikke skjuler en alvorlig enkeltstående svaghed.',
  weaknessCapPoints: 30,
};

/** Modelversioner i kronologisk rækkefølge. Den sidste er den gældende. */
export const MODEL_VERSIONS: ModelConfig[] = [MODEL_V1_0, MODEL_V1_1];

export const CURRENT_MODEL: ModelConfig = MODEL_V1_1;

/** Den modelversion, der var gældende på en given dato. */
export function modelAt(date: string): ModelConfig {
  let m: ModelConfig = MODEL_V1_0;
  for (const v of MODEL_VERSIONS) if (v.validFrom <= date) m = v;
  return m;
}

/** Normaliseringstabeller. */
export const NORMALIZATION = {
  /** Antal kvalificerede vidensholdere (ekspert eller praktiker) → score. */
  backupHolders: (q: number): number => (q >= 3 ? 100 : q === 2 ? 60 : 0),
  /** Dokumentationsniveau 0–3 → score. */
  documentation: [0, 35, 70, 100] as const,
  /** Faktor på genetableringstid ved dokumentationsniveau 0–3. */
  docRebuildFactor: [1, 0.85, 0.6, 0.45] as const,
  /** Genetableringstid i måneder, når der findes mindst to kvalificerede holdere. */
  rebuildWithBackupMonths: 2,
  /** Genetableringstid → score: ≤ best måneder = 100, ≥ worst = 0, lineært imellem. */
  rebuildBestMonths: 2,
  rebuildWorstMonths: 18,
  /** Andel lukket kapabilitetsgab over 12 måneder, der giver fuld score. */
  gapClosureFullScore: 0.5,
  /** Milepæl regnes som rettidig, hvis den er gennemført senest så mange dage efter planen. */
  milestoneToleranceDays: 30,
  /** Onboardingkvalitet → score. */
  onboarding: { struktureret: 100, delvis: 50, ingen: 0 } as const,
  /** Praksisforankring → score. */
  practiceAnchoring: { forankret: 100, delvis: 50, personbåret: 0 } as const,
  /** Gennemførelsesdata ældre end dette antal måneder regnes som manglende. */
  adherenceMaxAgeMonths: 6,
  /** Kapacitetsdata ældre end dette antal måneder regnes som manglende. */
  capacityMaxAgeMonths: 6,
} as const;

/** Afgrænsninger for, hvad der regnes som kritisk. */
export const CRITICALITY = {
  /** Roller med kritikalitet på eller over denne grænse er kritiske roller. */
  criticalRole: 4,
  /** Vidensområder med kritikalitet på eller over denne grænse indgår i D2. */
  knowledgeInScope: 3,
  /** Vidensområder med kritikalitet på eller over denne grænse kan udløse risici. */
  criticalKnowledge: 4,
  /** Kapabiliteter med fremtidig betydning på eller over denne grænse er strategiske. */
  strategicCapability: 4,
} as const;

/** Minimumsantal observationer, før en indikator vises. */
export const MIN_N = {
  'I4.4': 3,
  'I6.2': 2,
  'I6.3': 2,
} as const;

/** Tidsvinduer i måneder. */
export const WINDOWS = {
  evidenceMonths: 12,
  progressionMonths: 12,
  onboardingMonths: 12,
  gapClosureMonths: 12,
  milestoneMonths: 12,
  mobilityMonths: 24,
  /** Successionsplaner uden review i så mange måneder regnes som forældede (datakvalitet). */
  planReviewMaxAgeMonths: 13,
  /** Dokumentationsvurderinger ældre end dette regnes som forældede (datakvalitet). */
  docAssessmentMaxAgeMonths: 24,
} as const;

/** Risikomodel. */
export const RISK_MODEL = {
  version: '1.0',
  /** Prioritet = 100 × K × E × (6 − B) / 125. Bånd (nedre grænse, inklusive). */
  bands: { kritisk: 60, høj: 35, moderat: 15 },
  /** Tidshorisont ud fra næste ikke-gennemførte milepæl i berørte mål. */
  horizonMonths: { kort: 6, mellem: 18 },
} as const;

/** Grænse for, hvornår en ændring i genetableringstid fremhæves. */
export const SCENARIO = {
  /** Genetableringstid (måneder), når en efterfølger klar nu overtager. */
  readySuccessorMonths: 2,
} as const;
