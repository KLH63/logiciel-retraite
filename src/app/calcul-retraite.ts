import { DonneesIndividuelles, Regles, Resultat } from './models';

/** Décote "la plus favorable" (durée OU âge 67), cap 12 T, taux ∈ [min, 0.50] */
function computeRateStandard(trimestres: number, requis: number, age: number, R: Regles): number {
  if (age >= R.fullRateAutoAge) return R.fullRate;
  const missingByDuration = Math.max(0, requis - trimestres);
  const missingByAge = Math.max(0, Math.ceil((R.fullRateAutoAge - age) * 4));
  const missingEffective = Math.min(missingByDuration, missingByAge);
  const decoteQuarters = Math.min(missingEffective, R.decoteCapQ);
  const taux = R.fullRate - decoteQuarters * R.decotePerMissingQ;
  return Math.min(R.fullRate, Math.max(R.minRate, taux));
}

/** Ajustements AVA/AVPF/C2P + abaissement âge légal via IPP (utilisés pour prorata/surcote) */
export function deriveAjustements(d: DonneesIndividuelles, R: Regles) {
  // AVA + AVPF : max 4 T
  const addAvaAvpf = Math.min(4, Math.max(0, d.ava || 0) + Math.max(0, d.avpf || 0));

  // C2P : ≥55 ans ; (points - 20) / 10 (arrondi inf)
  let addC2P = 0;
  if (d.ageCible >= 55) {
    const usable = Math.max(0, Math.floor((d.c2pPoints || 0) - 20));
    addC2P = Math.max(0, Math.floor(usable / 10));
  }

  // IPP : abaissement de l’âge légal
  let legalAgeAdj = R.legalAge;
  if (d.incapPct >= 20) {
    const okAT = (d.incapType === 'AT') ? !!d.atControleOK : true;
    if (d.incapType === 'MALADIE_PRO' || okAT) legalAgeAdj = Math.min(legalAgeAdj, 60);
  } else if (d.incapPct >= 10 && d.incapPct < 20) {
    if (d.exp17ans && d.avisMCR && d.commissionOK) legalAgeAdj = Math.min(legalAgeAdj, R.legalAge - 2);
  }

  const trimestresEff = Math.max(0, (d.trimestres || 0) + addAvaAvpf + addC2P);
  return { trimestresEff, legalAgeAdj, addAvaAvpf, addC2P };
}

/** Test d’éligibilité RATH : âge ≥ minAge ET rathCotises ≥ minCotises */
function isRathEligible(params: {
  actif?: boolean;
  ageCible: number;
  minAge?: number;
  minCotises?: number;
  cotisesRath?: number;
}): boolean {
  if (!params.actif) return false;
  if (params.minAge == null || params.minCotises == null) return false;
  const rathCots = Number(params.cotisesRath || 0);
  return params.ageCible >= params.minAge && rathCots >= params.minCotises;
}

/**
 * Moteur principal :
 * 1) Si RATH éligible → taux = 0,50 (plein taux), sinon décote favorable.
 * 2) Base = SAM × taux × (trimestresEffectifs / référence).
 * 3) Surcote (si âge ≥ âge légal classique) sur la BASE.
 * 4) Si RATH coché → MAJORATION RATH : base *= (1 + coeff),
 *    coeff = arrondi_2dec( (rathCotises / trimestresCotisésBase) × 1/3 ).
 */
export function calculerPension(
  d: DonneesIndividuelles,
  R: Regles,
  rath?: {
    actif: boolean;
    minAge?: number;
    fullRef?: number;
    minCotises?: number;
    cotisesRath?: number; // trimestres RATH saisis (éligibilité + coeff)
  }
): Resultat {

  const { trimestresEff, legalAgeAdj } = deriveAjustements(d, R);

  // Référence (durée) : classique ou RATH si fourni
  const refQ = rath?.actif && rath.fullRef ? rath.fullRef : R.requiredQuarters;

  // 1) Taux : plein si RATH éligible, sinon décote
  const rathOk = isRathEligible({
    actif: rath?.actif,
    ageCible: d.ageCible,
    minAge: rath?.minAge,
    minCotises: rath?.minCotises,
    cotisesRath: rath?.cotisesRath,
  });

  const taux = rathOk
    ? R.fullRate
    : computeRateStandard(trimestresEff, refQ, d.ageCible, { ...R, requiredQuarters: refQ });

  // 2) Prorata
  const prorata = Math.min(trimestresEff / refQ, 1);

  // 2) Base SANS surcote
  let baseAnnual = d.sam * taux * prorata;

  // 3) Surcote sur la BASE si âge ≥ âge légal classique ET trimestresEff > refQ
  if (d.ageCible >= R.legalAge && trimestresEff > refQ) {
    const extraQ = trimestresEff - refQ;
    const facteurSurcote = R.surcotePerExtraQ * extraQ; // 1.0125 ^ extraQ
    const valeurSurcote = baseAnnual * facteurSurcote;
    baseAnnual = baseAnnual + valeurSurcote;

    console.log(extraQ)
  }

  // 4) Majoration RATH (si case cochée), appliquée APRÈS base/surcote
  if (rath?.actif) {
    const totalCotisesBase = Math.max(0, Number(d.trimestres || 0)); // "cotisés de base"
    const rathCot = Math.max(0, Number(rath.cotisesRath || 0));
    if (totalCotisesBase > 0 && rathCot > 0) {
      const coeffRaw = (rathCot / totalCotisesBase) / 3;   // (RATH / total cotisé) × 1/3
      const coeff = Math.round(coeffRaw * 100) / 100;      // ex. 0.28125 → 0.28
      baseAnnual *= (1 + coeff);
    }
  }

  const compAnnual = d.points * R.pointValue;

  let gross = baseAnnual + compAnnual;
  if (d.enfants >= 3) gross *= (1 + R.childBonusPercent);

  const net = gross * (1 - R.csgRate);

  return {
    legalAgeEffectif: legalAgeAdj,
    requiredQuartersEffectif: refQ,
    taux, prorata, baseAnnual, compAnnual, gross, net
  };
}
