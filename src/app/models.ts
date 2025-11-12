export interface DonneesIndividuelles {
  // Saisie principale
  birthDate: string | null;  // ← nouvelle saisie (YYYY-MM-DD)
  ageCible: number;          // âge au départ (ex: 64)
  trimestres: number;        // trimestres "de base" (cotisés/validés, rachat inclus)
  points: number;            // points complémentaires (Agirc-Arrco)
  sam: number;               // Salaire Annuel Moyen
  enfants: number;           // nb d'enfants

  // AVA / AVPF (plafond global 4 trimestres pris en compte)
  ava: number;
  avpf: number;

  // Incapacité permanente d'origine professionnelle (IPP)
  incapPct: number;                           // %
  incapType: 'AUCUN'|'MALADIE_PRO'|'AT';
  atControleOK: boolean;

  // IPP 10–19% : 3 conditions
  exp17ans: boolean;
  avisMCR: boolean;
  commissionOK: boolean;

  // C2P
  c2pPoints: number;      // 10 points = 1 trimestre (après 20 pts formation)

  // Saisie dédiée RATH : trimestres "cotisés RATH" (pour vérifier l'éligibilité)
  rathCotises?: number;   // ex: 90
}

export interface Regles {
  legalAge: number;          // âge légal (ex: 62, 62.25 = 62 ans 3 mois)
  fullRateAutoAge: number;   // 67
  requiredQuarters: number;  // 167..172
  fullRate: number;          // 0.50
  minRate: number;           // 0.425
  decotePerMissingQ: number; // 0.00625
  decoteCapQ: number;        // 12
  surcotePerExtraQ: number;  // 0.0125 (sur la base)
  childBonusPercent: number; // +10% si ≥ 3 enfants
  pointValue: number;        // €
  csgRate: number;           // 0..1
}

export interface Resultat {
  legalAgeEffectif: number;        // après IPP/C2P/RATH éventuels (pour info)
  requiredQuartersEffectif: number;

  taux: number;          // ≤ 0,50
  prorata: number;       // min(trimestresEff / ref, 1)
  baseAnnual: number;    // €
  compAnnual: number;    // €
  gross: number;         // €
  net: number;           // €
}
