import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { REGLES_2025, reglesPourNaissance, rathBaremeFromBirth } from './rules';
import { calculerPension, deriveAjustements } from './calcul-retraite';

function minCotisesForAge(map: Record<number, number>, age: number): number | undefined {
  const ages = Object.keys(map).map(Number).sort((a, b) => a - b);
  if (map[age] != null) return map[age];
  // 1) on cherche le plus grand âge <= age visé
  for (let i = ages.length - 1; i >= 0; i--) {
    if (ages[i] <= age) return map[ages[i]];
  }
  // 2) sinon fallback sur le plus petit âge défini (cas où l’âge visé est < plus petite clé)
  return ages.length ? map[ages[0]] : undefined;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
})
export class App {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    // Base
    birthDate: [null as string | null, []], // date complète (YYYY-MM-DD)
    ageCible: [64, [Validators.min(50), Validators.max(70)]],
    trimestres: [0, [Validators.min(0)]],
    points: [0, [Validators.min(0)]],
    sam: [0, [Validators.min(0)]],
    enfants: [0, [Validators.min(0)]],

    // AVA / AVPF
    ava: [0, [Validators.min(0)]],
    avpf: [0, [Validators.min(0)]],

    // IPP (incapacité pro)
    incapPct: [0, [Validators.min(0)]],
    incapType: ['AUCUN'],
    atControleOK: [false],
    exp17ans: [false],
    avisMCR: [false],
    commissionOK: [false],

    // Handicap (RATH)
    handicap: [false],
    rathCotises: [0, [Validators.min(0)]],

    // C2P
    c2pPoints: [0, [Validators.min(0)]],
  });

  reglesBase = REGLES_2025;
  reglesDerivees = REGLES_2025;

  // Aides affichage
  rathMinAge?: number;
  rathMinCotises?: number;
  rathFullRef?: number;
  addAvaAvpf = 0;
  addC2P = 0;

  resultat: any = null;
  comparaison: { normal: any; rath: any } | null = null;

  recomputeInfos() {
    const v: any = this.form.value;

    // Règles "classiques" à partir de la DATE
    this.reglesDerivees = reglesPourNaissance(this.reglesBase, v.birthDate);

    // Pré-calcul (AVA/AVPF/C2P/IPP)
    const adj = deriveAjustements({
      ...v,
      birthDate: v.birthDate,
      ageCible: Number(v.ageCible || 0),
      trimestres: Number(v.trimestres || 0),
      points: Number(v.points || 0),
      sam: Number(v.sam || 0),
      enfants: Number(v.enfants || 0),
      ava: Number(v.ava || 0),
      avpf: Number(v.avpf || 0),
      incapPct: Number(v.incapPct || 0),
      incapType: v.incapType,
      atControleOK: !!v.atControleOK,
      exp17ans: !!v.exp17ans, avisMCR: !!v.avisMCR, commissionOK: !!v.commissionOK,
      c2pPoints: Number(v.c2pPoints || 0),
    }, this.reglesDerivees);

    this.addAvaAvpf = Math.min(4, Number(v.ava || 0) + Number(v.avpf || 0));
    this.addC2P = Math.max(0, adj.trimestresEff - Number(v.trimestres || 0) - this.addAvaAvpf);

    // RATH (handicap) à partir de la DATE
    if (v.handicap && v.birthDate) {
      const b = rathBaremeFromBirth(v.birthDate);
      this.rathFullRef = b.fullRef;
      this.rathMinAge = Number.isFinite(b.minAge) ? b.minAge : undefined;

      const age = Number(v.ageCible || 0);
      this.rathMinCotises = minCotisesForAge(b.mapAgeMinCot, age);
    } else {
      this.rathFullRef = this.rathMinAge = this.rathMinCotises = undefined;
    }
  }

  private buildRathParam(v: any) {
    if (!(v.handicap && v.birthDate)) return { actif: false };
    const b = rathBaremeFromBirth(v.birthDate);
    const age = Number(v.ageCible || 0);
    const minCot = minCotisesForAge(b.mapAgeMinCot, age);
    return {
      actif: true,
      fullRef: b.fullRef,
      minAge: Number.isFinite(b.minAge) ? b.minAge : undefined,
      minCotises: minCot,
      cotisesRath: Number(v.rathCotises || 0), // utilisé pour l’éligibilité + coeff
    };
  }

  calculer() {
    this.comparaison = null;
    this.recomputeInfos();
    const v: any = this.form.value;
    const rathParam = this.buildRathParam(v);

    this.resultat = calculerPension({
      birthDate: v.birthDate,
      ageCible: Number(v.ageCible || 0),
      trimestres: Number(v.trimestres || 0),
      points: Number(v.points || 0),
      sam: Number(v.sam || 0),
      enfants: Number(v.enfants || 0),
      ava: Number(v.ava || 0),
      avpf: Number(v.avpf || 0),
      incapPct: Number(v.incapPct || 0),
      incapType: v.incapType,
      atControleOK: !!v.atControleOK,
      exp17ans: !!v.exp17ans, avisMCR: !!v.avisMCR, commissionOK: !!v.commissionOK,
      c2pPoints: Number(v.c2pPoints || 0),
      rathCotises: Number(v.rathCotises || 0),
    }, this.reglesDerivees, rathParam);
  }

  comparer() {
    this.recomputeInfos();
    const v: any = this.form.value;

    // Normal
    const normal = calculerPension({
      birthDate: v.birthDate,
      ageCible: Number(v.ageCible || 0),
      trimestres: Number(v.trimestres || 0),
      points: Number(v.points || 0),
      sam: Number(v.sam || 0),
      enfants: Number(v.enfants || 0),
      ava: Number(v.ava || 0),
      avpf: Number(v.avpf || 0),
      incapPct: Number(v.incapPct || 0),
      incapType: v.incapType,
      atControleOK: !!v.atControleOK,
      exp17ans: !!v.exp17ans, avisMCR: !!v.avisMCR, commissionOK: !!v.commissionOK,
      c2pPoints: Number(v.c2pPoints || 0),
      rathCotises: Number(v.rathCotises || 0),
    }, this.reglesDerivees, { actif: false });

    // RATH
    const rathParam = this.buildRathParam(v);
    const rath = calculerPension({
      birthDate: v.birthDate,
      ageCible: Number(v.ageCible || 0),
      trimestres: Number(v.trimestres || 0),
      points: Number(v.points || 0),
      sam: Number(v.sam || 0),
      enfants: Number(v.enfants || 0),
      ava: Number(v.ava || 0),
      avpf: Number(v.avpf || 0),
      incapPct: Number(v.incapPct || 0),
      incapType: v.incapType,
      atControleOK: !!v.atControleOK,
      exp17ans: !!v.exp17ans, avisMCR: !!v.avisMCR, commissionOK: !!v.commissionOK,
      c2pPoints: Number(v.c2pPoints || 0),
      rathCotises: Number(v.rathCotises || 0),
    }, this.reglesDerivees, rathParam);

    this.comparaison = { normal, rath };
    this.resultat = null;
  }

  fmt(x: any, min = 0) {
    const v = Number(x || 0);
    return v.toLocaleString('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: min });
  }
}
