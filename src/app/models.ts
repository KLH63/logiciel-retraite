export interface Regles {
  legalAge: number;
  fullRateAutoAge: number;
  requiredQuarters: number;
  fullRate: number;
  minRate: number;
  decotePerMissingQ: number;
  decoteCapQ: number;
  surcotePerExtraQ: number; // ex: 0.0125 (1.25% par trimestre)
  childBonusPercent: number;
  pointValue: number;
  csgRate: number;

  // nouveaux / optionnels
  earlyLongCareerAge?: number;    // âge mini possible pour carrière longue (ex: 60)
  earlyDisabilityAge?: number;    // âge mini en cas d'inaptitude/invalidité
  earlyHandicapAge?: number;      // âge mini pour travailleurs handicapés (ex: 55)
  earlyIncapacityOffset?: number; // années de réduction pour incapacité 10-19% (ex: 2)
}

export interface AnneeSalaire {
  annee: number;
  salaire: number;     // brut de l'année
  coefRevalo?: number; // coefficient de revalorisation à appliquer (par ex 1.02)
}

export interface DonneesIndividuelles {
  birthISO?: string | null;
  dateDepartISO?: string | null;
  ageCible: number;               // âge lors du départ souhaité (ex: 62.25)
  trimestres: number;             // trimestres validés comptés (sans AVA/AVPF)
  trimestresAVA?: number;         // trimestres AVA à ajouter (ex: 0..4)
  trimestresAVPF?: number;        // trimestres AVPF à ajouter (ex: 0..4)
  enfants: number;
  points: number;                 // points de complémentaire
  sam?: number;                   // SAM (peut être calculé via calculerSAM)
  annees: AnneeSalaire[];         // années de salaires pour SAM
  carriereLongue?: boolean;
  invalide?: boolean;
  handicape?: boolean;            // RATH
  incapacite?: number;            // pourcentage d'incapacité (0..100)
  exposition17ans?: boolean;      // pour incapacité 10-19%: exposition >=17 ans?
  avisMed?: boolean;              // avis médecin conseil régional
  commissionOK?: boolean;         // commission pluridisciplinaire OK
}

export interface Resultat {
  taux: number;
  prorata: number;
  baseAnnual: number;
  compAnnual: number;
  gross: number;
  net: number;
  sam?: number;
  trimestresEffectifs?: number;
}
