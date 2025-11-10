import { DonneesIndividuelles, Regles, Resultat, AnneeSalaire } from './models';
import {reglesPourNaissance} from './rules';


/**
 * Calcule le SAM : somme des 25 meilleures années revalorisées / 25.
 * Si moins de 25 années fournies, divise par le nombre d'années fournies.
 * - annees: tableau { annee, salaire, coefRevalo? }
 */
export function calculerSAM(annees: AnneeSalaire[]): number {
  if (!annees || annees.length === 0) return 0;
  const salairesReval = annees.map(a => a.salaire * (a.coefRevalo ?? 1));
  const meilleures = salairesReval.sort((a, b) => b - a).slice(0, 25);
  const denom = Math.min(25, meilleures.length);
  const somme = meilleures.reduce((acc, s) => acc + s, 0);
  return somme / denom;
}

/**
 * Calcule le taux (avec gestion décote automatique à fullRateAutoAge)
 * et avec prise en compte: suppression décote si invalide ou incap >=20,
 * plafonnement décote, taux mini.
 */
function computeRate(trimestres: number, requis: number, age: number, R: Regles, options?: { invalide?: boolean, incapacitePct?: number }): number {
  // Taux plein automatique si âge >= fullRateAutoAge
  if (age >= R.fullRateAutoAge) return R.fullRate;

  // Taux plein si invalide ou incapacité >= 20%
  if (options?.invalide) return R.fullRate;
  if ((options?.incapacitePct ?? 0) >= 20) return R.fullRate;

  // Décote
  const manquants = Math.max(0, requis - trimestres);
  const decote = Math.min(manquants, R.decoteCapQ) * R.decotePerMissingQ;

  const taux = R.fullRate - decote;
  return Math.min(R.fullRate, Math.max(R.minRate, taux));
}

/**
 * Calcul complet de la pension:
 * - prend en compte SAM (si non fourni, le calcule depuis d.annees)
 * - ajoute AVA/AVPF jusqu'à 4 trimestres (chacun)
 * - applique règles particulières: carrière longue, invalide, handicape, incapacité
 * - calcule taux, prorata, base, complémentaire, maj enfants, CSG
 */
export function calculerPension(d: DonneesIndividuelles, Rbase: Regles): Resultat {
  // 1) appliquer règles liées à la naissance pour ajuster âge légal / trimestres requis
  const R_from_birth = reglesPourNaissance(Rbase, d.birthISO);

  // 2) clone des règles que l'on pourra ajuster selon situation
  const R: Regles = { ...R_from_birth };

  // 3) SAM : si fourni utilise, sinon calcule à partir des années
  let sam = d.sam ?? 0;
  if ((!sam || sam === 0) && d.annees && d.annees.length > 0) {
    sam = calculerSAM(d.annees);
  }

  // 4) trimestres effectifs: ajouter AVA/AVPF pris en compte à hauteur de 4 trimestres
  const ava = Math.max(0, d.trimestresAVA ?? 0);
  const avpf = Math.max(0, d.trimestresAVPF ?? 0);
  const bonusTrimestres = Math.min(4, ava + avpf);
  const trimestresEffectifs = d.trimestres + bonusTrimestres;

  // 5) règles spécifiques
  // invalidité / inaptitude -> taux plein et âge min spécifique
  if (d.invalide) {
    if (R.earlyDisabilityAge) {
      R.legalAge = Math.min(R.legalAge, R.earlyDisabilityAge);
    }
    // taux plein (computeRate gère l'option)
  }

  // incapacité permanente
  if (d.incapacite && d.incapacite >= 20) {
    // départ automatique à 60 ans
    R.legalAge = Math.min(R.legalAge, 60);
    // taux plein (computeRate will return fullRate based on option)
  } else if (d.incapacite && d.incapacite >= 10 && d.incapacite < 20) {
    // possible départ 2 ans avant l'âge légal si conditions (exposition 17 ans + avis + commission)
    if (d.exposition17ans && d.avisMed && d.commissionOK && R.earlyIncapacityOffset) {
      // retire earlyIncapacityOffset years from legalAge used for eligibility check
      R.legalAge = R.legalAge - R.earlyIncapacityOffset;
    }
  }

  // travailleurs handicapés (RATH)
  if (d.handicape) {
    R.legalAge = Math.min(R.legalAge, R.earlyHandicapAge ?? R.legalAge);
    // généralement taux plein si conditions remplies; we keep computeRate logic but allow fullRateAutoAge check
  }

  // carrière longue (permet départ anticipé si les conditions sont remplies)
  if (d.carriereLongue) {
    R.legalAge = Math.min(R.legalAge, R.earlyLongCareerAge ?? R.legalAge);
  }

  // 6) calcul du taux
  const taux = computeRate(trimestresEffectifs, R.requiredQuarters, d.ageCible, R, { invalide: !!d.invalide, incapacitePct: d.incapacite });

  // prorata (si nombre de trimestres < requis)
  const prorata = Math.min(trimestresEffectifs / R.requiredQuarters, 1);

  // 7) Base annuelle (SAM * taux * prorata)
  let baseAnnual = sam * taux * prorata;

  // 8) Surcote : seulement si âge >= legalAge ET trimestresEffectifs > requis
  // Surcote appliquée multiplicativement : base * (1 + surcote) ^ extraQ
  let compAnnual = d.points * R.pointValue;

  if (d.ageCible >= R.legalAge && trimestresEffectifs > R.requiredQuarters) {
    const extraQ = trimestresEffectifs - R.requiredQuarters;
    // multiplicative (compounding) : (1 + p)^n
    const facteur = Math.pow(1 + R.surcotePerExtraQ, extraQ);
    baseAnnual = baseAnnual * facteur;
  }

  // 9) Majoration enfants (≥3) sur le total (si tu veux appliquer seulement sur base, déplacer)
  let gross = baseAnnual + compAnnual;
  if (d.enfants >= 3) {
    gross *= (1 + R.childBonusPercent);
  }

  // 10) CSG / net
  const net = gross * (1 - R.csgRate);

  return {
    taux,
    prorata,
    baseAnnual,
    compAnnual,
    gross,
    net,
    sam,
    trimestresEffectifs
  };
}
