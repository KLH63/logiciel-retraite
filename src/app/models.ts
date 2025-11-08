export interface DonneesIndividuelles {
  ageCible: number;   // âge au départ (ex: 64)
  trimestres: number; // trimestres validés (rachat inclus)
  points: number;     // points complémentaires (Agirc-Arrco)
  sam: number;        // Salaire Annuel Moyen
  enfants: number;    // nb d'enfants
}

export interface Regles {
  legalAge: number;          // âge légal en années (ex: 62, 62.25 = 62 ans 3 mois)
  fullRateAutoAge: number;   // âge du plein taux auto (ex: 67)
  requiredQuarters: number;  // trimestres requis (167..172)
  fullRate: number;          // 0.50
  minRate: number;           // 0.425
  decotePerMissingQ: number; // 0.00625
  decoteCapQ: number;        // 12
  surcotePerExtraQ: number;  // 0.0125
  childBonusPercent: number; // +10% si >=3 enfants
  pointValue: number;        // valeur du point (€/an)
  csgRate: number;           // prélèvements estimés (0..1)
}

export interface Resultat {
  taux: number;
  prorata: number;
  baseAnnual: number;
  compAnnual: number;
  gross: number;
  net: number;
}
