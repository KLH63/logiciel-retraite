import { DonneesIndividuelles, Regles, Resultat } from './models';

function computeRate(trimestres: number, requis: number, age: number, R: Regles): number {
  if (age >= R.fullRateAutoAge) return R.fullRate;

  const manquants = Math.max(0, requis - trimestres);
  const decote = Math.min(manquants, R.decoteCapQ) * R.decotePerMissingQ;

  const extra = age >= R.legalAge ? Math.max(0, trimestres - requis) : 0;
  const surcote = extra * R.surcotePerExtraQ;

  const taux = R.fullRate - decote + surcote;
  return Math.max(R.minRate, taux);
}

export function calculerPension(d: DonneesIndividuelles, R: Regles): Resultat {
  const requis = R.requiredQuarters;
  const taux = computeRate(d.trimestres, requis, d.ageCible, R);
  const prorata = Math.min(d.trimestres / requis, 1);

  const baseAnnual = d.sam * taux * prorata;
  const compAnnual = d.points * R.pointValue;

  let gross = baseAnnual + compAnnual;
  if (d.enfants >= 3) gross *= (1 + R.childBonusPercent);

  const net = gross * (1 - R.csgRate);

  return { taux, prorata, baseAnnual, compAnnual, gross, net };
}
