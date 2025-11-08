import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { REGLES_2025, reglesPourNaissance } from './rules';
import { calculerPension } from './calcul-retraite';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
})
export class App {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    birthDate: [null as string | null],               // <-- NOUVEAU
    ageCible: [64, [Validators.min(50), Validators.max(70)]],
    trimestres: [0, [Validators.min(0)]],
    points: [0, [Validators.min(0)]],
    sam: [0, [Validators.min(0)]],
    enfants: [0, [Validators.min(0)]],
  });

  regles = REGLES_2025;       // règles en vigueur (base)
  reglesDerivees = REGLES_2025; // règles ajustées à la naissance (affichées)
  resultat: any = null;

  recalculerRegles() {
    const birth = this.form.get('birthDate')!.value as string | null;
    this.reglesDerivees = reglesPourNaissance(this.regles, birth);
  }

  calculer() {
    this.recalculerRegles();

    const d = this.form.value as any;
    this.resultat = calculerPension(
      {
        ageCible: Number(d.ageCible || 0),
        trimestres: Number(d.trimestres || 0),
        points: Number(d.points || 0),
        sam: Number(d.sam || 0),
        enfants: Number(d.enfants || 0),
      },
      this.reglesDerivees
    );
  }

  fmt(x: any, min = 0) {
    const v = Number(x || 0);
    return v.toLocaleString('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: min });
  }
}
