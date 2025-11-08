import { DonneesIndividuelles, Regles, Resultat } from './models';

function computeRate(trimestres: number, requis: number, age: number, R: Regles): number {
  if (age >= R.fullRateAutoAge) return R.fullRate;

  const manquants = Math.max(0, requis - trimestres);
  const decote = Math.min(manquants, R.decoteCapQ) * R.decotePerMissingQ;

  // ❌ Pas de surcote dans le taux (plafond 0,50)
  const taux = R.fullRate - decote;
  return Math.min(R.fullRate, Math.max(R.minRate, taux));
}


export function calculerPension(d: DonneesIndividuelles, R: Regles): Resultat {
  const requis = R.requiredQuarters;
  const taux = computeRate(d.trimestres, requis, d.ageCible, R);
  const prorata = Math.min(d.trimestres / requis, 1);

  // Base sans surcote
  let baseAnnual = d.sam * taux * prorata;

  // ✅ Surcote sur la base: +1,25%/trimestre acquis après âge légal ET après avoir atteint le requis
  let compAnnual = d.points * R.pointValue;

  if (d.ageCible >= R.legalAge && d.trimestres > requis) {
    const extraQ = d.trimestres - requis;
    const facteurSurcote = R.surcotePerExtraQ * extraQ; // 1.0125 ^ extraQ
    const valeurSurcote = baseAnnual * facteurSurcote;
    baseAnnual = baseAnnual + valeurSurcote;
  }

  let gross = baseAnnual + compAnnual;

  // Majoration enfants (≥3) sur le total (si tu veux l’appliquer seulement sur la base, déplace-la avant l’addition)
  if (d.enfants >= 3) gross *= (1 + R.childBonusPercent);

  const net = gross * (1 - R.csgRate);

  return { taux, prorata, baseAnnual, compAnnual, gross, net };
}

