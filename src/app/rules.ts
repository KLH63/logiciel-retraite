import { Regles } from './models';

export const REGLES_2025: Regles = {
  legalAge: 64,
  fullRateAutoAge: 67,
  requiredQuarters: 172,
  fullRate: 0.50,
  minRate: 0.425,
  decotePerMissingQ: 0.00625,
  decoteCapQ: 12,
  surcotePerExtraQ: 0.0125,
  childBonusPercent: 0.10,
  pointValue: 1.4159,
  csgRate: 0.086,
};

/** Convertit "X ans Y mois" en années décimales (ex: 62 ans 3 mois -> 62.25) */
function yPlusMonths(y: number, m: number) { return y + m / 12; }

/**
 * Applique le barème âge légal / trimestres requis selon la date de naissance.
 * Si la date est absente ou hors plage, on garde la base.
 */
export function reglesPourNaissance(base: Regles, birthISO?: string | null): Regles {
  if (!birthISO) return base;
  const d = new Date(birthISO);
  if (Number.isNaN(d.getTime())) return base;

  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1..12
  const day = d.getDate();

  const r: Regles = { ...base };

  // Tableau (hors départs anticipés) — cf. image
  if (y === 1960) {
    r.legalAge = 62;
    r.requiredQuarters = 167;
  } else if (y === 1961) {
    // Jan 1 – Aug 31 1961
    const isBeforeSep = (m < 9); // (septembre=9) -> 1 jan au 31 août
    if (isBeforeSep) {
      r.legalAge = 62;
      r.requiredQuarters = 168;
    } else {
      // 1er septembre – 31 décembre 1961
      r.legalAge = yPlusMonths(62, 3); // 62 ans et 3 mois
      r.requiredQuarters = 169;
    }
  } else if (y === 1962) {
    r.legalAge = yPlusMonths(62, 6);
    r.requiredQuarters = 169;
  } else if (y === 1963) {
    r.legalAge = yPlusMonths(62, 9);
    r.requiredQuarters = 170;
  } else if (y === 1964) {
    r.legalAge = 63;
    r.requiredQuarters = 171;
  } else if (y === 1965) {
    r.legalAge = yPlusMonths(63, 3);
    r.requiredQuarters = 172;
  } else if (y === 1966) {
    r.legalAge = yPlusMonths(63, 6);
    r.requiredQuarters = 172;
  } else if (y === 1967) {
    r.legalAge = yPlusMonths(63, 9);
    r.requiredQuarters = 172;
  } else if (y >= 1968) {
    r.legalAge = 64;
    r.requiredQuarters = 172;
  } else {
    // Hors tableau => on ne force rien
    return base;
  }

  return r;
}
