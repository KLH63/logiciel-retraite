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

function yPlusMonths(y: number, m: number) { return y + m / 12; }

/** Règles "classiques" selon la DATE de naissance (gère 1961 janv–août vs sept–déc) */
export function reglesPourNaissance(base: Regles, birthISO?: string | null): Regles {
  if (!birthISO) return base;
  const d = new Date(birthISO);
  if (Number.isNaN(d.getTime())) return base;

  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1..12
  const day = d.getDate();

  const r: Regles = { ...base };

  if (y === 1960) {
    r.legalAge = 62; r.requiredQuarters = 167;
  } else if (y === 1961) {
    const isBeforeSep = (m < 9) || (m === 9 && day === 0); // sécurité
    if (m <= 8) { // 1 jan – 31 août 1961
      r.legalAge = 62;
      r.requiredQuarters = 168;
    } else {      // 1 sept – 31 déc 1961
      r.legalAge = yPlusMonths(62, 3);
      r.requiredQuarters = 169;
    }
  } else if (y === 1962) {
    r.legalAge = yPlusMonths(62, 6); r.requiredQuarters = 169;
  } else if (y === 1963) {
    r.legalAge = yPlusMonths(62, 9); r.requiredQuarters = 170;
  } else if (y === 1964) {
    r.legalAge = 63; r.requiredQuarters = 171;
  } else if (y === 1965) {
    r.legalAge = yPlusMonths(63, 3); r.requiredQuarters = 172;
  } else if (y === 1966) {
    r.legalAge = yPlusMonths(63, 6); r.requiredQuarters = 172;
  } else if (y === 1967) {
    r.legalAge = yPlusMonths(63, 9); r.requiredQuarters = 172;
  } else if (y >= 1968) {
    r.legalAge = 64; r.requiredQuarters = 172;
  } else {
    return base;
  }

  return r;
}

/** Barème RATH (handicap) déduit de la DATE (1961 avant/après 1er sept) */
export function rathBaremeFromBirth(birthISO?: string | null) {
  if (!birthISO) return { fullRef: 172, minAge: Infinity, mapAgeMinCot: {} as Record<number, number> };
  const d = new Date(birthISO);
  if (Number.isNaN(d.getTime())) return { fullRef: 172, minAge: Infinity, mapAgeMinCot: {} };
  const y = d.getFullYear();
  const m = d.getMonth() + 1;

  const map: Record<number, number> = {};
  let fullRef = 172;

  if (y === 1961) {
    fullRef = 169;
    if (m <= 8) { // avant le 1er sept 1961 → départ possible à 61 ans
      map[61] = 68;
    } else {      // du 1er sept 1961 au 31 déc 1962 → départ possible à 60 ans
      map[60] = 68;
    }
  } else if (y === 1962) { fullRef = 169; map[60] = 68; map[61] = 68; }
  else if (y === 1963)   { fullRef = 170; map[59]=68; map[60]=68; map[61]=68; }
  else if (y === 1964)   { fullRef = 171; map[57]=89; map[58]=79; map[59]=69; }
  else if (y === 1965)   { fullRef = 172; map[58]=79; map[59]=69; }
  else if (y === 1966)   { fullRef = 172; map[56]=99; map[57]=89; map[58]=79; map[59]=69; }
  else if (y >= 1967 && y <= 1969) { fullRef = 172; map[55]=110; map[56]=100; map[57]=90; map[58]=80; map[59]=70; }
  else if (y >= 1970 && y <= 1972) { fullRef = 172; map[55]=111; map[56]=101; map[57]=91; map[58]=81; map[59]=71; }
  else if (y >= 1973)               { fullRef = 172; map[55]=112; map[56]=102; map[57]=92; map[58]=82; map[59]=72; }

  const minAge = Object.keys(map).length ? Math.min(...Object.keys(map).map(Number)) : Infinity;
  return { fullRef, minAge, mapAgeMinCot: map };
}
