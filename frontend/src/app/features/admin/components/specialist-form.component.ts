import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SpecialistAdminService } from '../services/specialist-admin.service';
import { AdminSpecialist, AvailabilityRule, SpecialistPayload } from '../models/specialist-admin.models';

export const WEEK_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

/** Plage horaire valide : fin après début. */
const ruleValidator = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('startTime')?.value;
  const end = group.get('endTime')?.value;
  return start && end && start >= end ? { order: true } : null;
};

/**
 * Formulaire d'ajout / de modification d'un spécialiste (fenêtre modale).
 * Les erreurs renvoyées par l'API par champ (`errors`) sont affichées sous chaque champ.
 */
@Component({
  selector: 'app-specialist-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fb-modal-backdrop" (click)="close()">
      <div class="fb-modal form-modal" role="dialog" aria-modal="true" aria-labelledby="specialist-form-title" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <div>
            <span class="fb-eyebrow">{{ specialist ? 'Modification' : 'Nouveau compte' }}</span>
            <h2 id="specialist-form-title">{{ specialist ? specialist.firstName + ' ' + specialist.lastName : 'Ajouter un spécialiste' }}</h2>
          </div>
          <button type="button" class="icon-close" (click)="close()" aria-label="Fermer"><mat-icon>close</mat-icon></button>
        </header>

        <div class="fb-alert fb-alert--error" role="alert" *ngIf="formError()">
          <mat-icon>error_outline</mat-icon><span>{{ formError() }}</span>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <fieldset>
            <legend>Identité</legend>
            <div class="grid-2">
              <div class="fb-field">
                <label class="fb-label" for="sf-firstName">Prénom *</label>
                <input id="sf-firstName" class="fb-input" formControlName="firstName" autocomplete="off" [class.invalid]="invalid('firstName')" />
                <span class="fb-error-text" *ngIf="invalid('firstName')">{{ errorOf('firstName', 'Le prénom est obligatoire.') }}</span>
              </div>
              <div class="fb-field">
                <label class="fb-label" for="sf-lastName">Nom *</label>
                <input id="sf-lastName" class="fb-input" formControlName="lastName" autocomplete="off" [class.invalid]="invalid('lastName')" />
                <span class="fb-error-text" *ngIf="invalid('lastName')">{{ errorOf('lastName', 'Le nom est obligatoire.') }}</span>
              </div>
              <div class="fb-field">
                <label class="fb-label" for="sf-email">Adresse e-mail *</label>
                <input id="sf-email" class="fb-input" type="email" formControlName="email" autocomplete="off" [class.invalid]="invalid('email')" />
                <span class="fb-error-text" *ngIf="invalid('email')">{{ errorOf('email', 'Adresse e-mail valide requise.') }}</span>
              </div>
              <div class="fb-field">
                <label class="fb-label" for="sf-phone">Téléphone</label>
                <input id="sf-phone" class="fb-input" formControlName="phone" autocomplete="off" placeholder="+216 20 123 456" [class.invalid]="invalid('phone')" />
                <span class="fb-error-text" *ngIf="invalid('phone')">{{ errorOf('phone', 'Numéro invalide.') }}</span>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Profil professionnel</legend>
            <div class="grid-2">
              <div class="fb-field">
                <label class="fb-label" for="sf-specialization">Spécialisation *</label>
                <input id="sf-specialization" class="fb-input" formControlName="specialization" placeholder="Ex. : pédopsychiatre" [class.invalid]="invalid('specialization')" />
                <span class="fb-error-text" *ngIf="invalid('specialization')">{{ errorOf('specialization', 'La spécialisation est obligatoire.') }}</span>
              </div>
              <div class="fb-field">
                <label class="fb-label" for="sf-licenseNumber">N° de licence *</label>
                <input id="sf-licenseNumber" class="fb-input" formControlName="licenseNumber" placeholder="RPPS, Ordre…" [class.invalid]="invalid('licenseNumber')" />
                <span class="fb-error-text" *ngIf="invalid('licenseNumber')">{{ errorOf('licenseNumber', 'Le numéro de licence est obligatoire.') }}</span>
              </div>
              <div class="fb-field">
                <label class="fb-label" for="sf-city">Ville</label>
                <input id="sf-city" class="fb-input" formControlName="city" placeholder="Tunis, Sfax…" />
              </div>
              <div class="fb-field">
                <label class="fb-label" for="sf-tariff">Tarif de consultation (€)</label>
                <input id="sf-tariff" class="fb-input" type="number" min="0" max="1000" formControlName="tariff" [class.invalid]="invalid('tariff')" />
                <span class="fb-error-text" *ngIf="invalid('tariff')">{{ errorOf('tariff', 'Tarif entre 0 et 1000 €.') }}</span>
              </div>
              <div class="fb-field full">
                <label class="fb-label" for="sf-languages">Langues de consultation *</label>
                <input id="sf-languages" class="fb-input" formControlName="languages" placeholder="fr, ar, en" [class.invalid]="invalid('languages')" />
                <span class="fb-hint" *ngIf="!invalid('languages')">Codes séparés par des virgules (fr, en, ar…).</span>
                <span class="fb-error-text" *ngIf="invalid('languages')">{{ errorOf('languages', 'Indiquez au moins une langue (ex. fr).') }}</span>
              </div>
              <div class="fb-field full">
                <label class="fb-label" for="sf-bio">Présentation (visible dans l'annuaire)</label>
                <textarea id="sf-bio" class="fb-textarea" rows="3" maxlength="1000" formControlName="bio"></textarea>
                <span class="fb-error-text" *ngIf="invalid('bio')">{{ errorOf('bio', '1000 caractères maximum.') }}</span>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Disponibilités de téléconsultation</legend>
            <p class="fb-hint" *ngIf="!rules.length">Aucune plage : le spécialiste n'apparaîtra comme disponible à aucun créneau.</p>
            <div class="rules" formArrayName="availabilityRules">
              <div class="rule" *ngFor="let rule of rules.controls; let i = index" [formGroupName]="i">
                <select class="fb-select" formControlName="dayOfWeek" [attr.aria-label]="'Jour de la plage ' + (i + 1)">
                  <option *ngFor="let day of days; let d = index" [ngValue]="d">{{ day }}</option>
                </select>
                <input class="fb-input" type="time" formControlName="startTime" [attr.aria-label]="'Début de la plage ' + (i + 1)" />
                <input class="fb-input" type="time" formControlName="endTime" [attr.aria-label]="'Fin de la plage ' + (i + 1)" />
                <select class="fb-select" formControlName="slotDurationMinutes" [attr.aria-label]="'Durée des créneaux, plage ' + (i + 1)">
                  <option *ngFor="let minutes of durations" [ngValue]="minutes">{{ minutes }} min</option>
                </select>
                <button type="button" class="icon-close" (click)="removeRule(i)" [attr.aria-label]="'Supprimer la plage ' + (i + 1)"><mat-icon>delete</mat-icon></button>
                <span class="fb-error-text rule-error" *ngIf="rule.errors?.['order']">L'heure de fin doit être après l'heure de début.</span>
              </div>
            </div>
            <span class="fb-error-text" *ngIf="serverErrors()['availabilityRules']">{{ serverErrors()['availabilityRules'] }}</span>
            <button type="button" class="fb-btn fb-btn--soft fb-btn--sm add-rule" (click)="addRule()">
              <mat-icon>add</mat-icon>
              Ajouter une plage
            </button>
          </fieldset>

          <fieldset>
            <legend>Compte</legend>
            <label class="switch">
              <input type="checkbox" formControlName="isActive" />
              <span>
                <strong>Compte actif</strong>
                <small>Un compte inactif ne peut plus se connecter et n'apparaît plus dans l'annuaire.</small>
              </span>
            </label>
            <div class="grid-2">
              <div class="fb-field">
                <label class="fb-label" for="sf-password">{{ specialist ? 'Nouveau mot de passe' : 'Mot de passe *' }}</label>
                <input id="sf-password" class="fb-input" type="password" formControlName="password" autocomplete="new-password" [class.invalid]="invalid('password')" />
                <span class="fb-hint" *ngIf="!invalid('password')">{{ specialist ? 'Laisser vide pour conserver le mot de passe actuel. ' : '' }}10 caractères min., une majuscule, une minuscule, un chiffre.</span>
                <span class="fb-error-text" *ngIf="invalid('password')">{{ errorOf('password', '10 caractères min., une majuscule, une minuscule et un chiffre.') }}</span>
              </div>
              <div class="fb-field">
                <label class="fb-label" for="sf-confirmPassword">Confirmation{{ specialist ? '' : ' *' }}</label>
                <input id="sf-confirmPassword" class="fb-input" type="password" formControlName="confirmPassword" autocomplete="new-password" [class.invalid]="passwordMismatch() || !!serverErrors()['confirmPassword']" />
                <span class="fb-error-text" *ngIf="passwordMismatch() || serverErrors()['confirmPassword']">La confirmation ne correspond pas.</span>
              </div>
            </div>
          </fieldset>

          <footer class="modal-actions">
            <button type="button" class="fb-btn fb-btn--ghost" (click)="close()" [disabled]="saving()">Annuler</button>
            <button type="submit" class="fb-btn" [disabled]="saving()">
              <span class="fb-spinner light" *ngIf="saving()" aria-hidden="true"></span>
              {{ saving() ? 'Enregistrement…' : (specialist ? 'Enregistrer les modifications' : 'Créer le spécialiste') }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-modal { width: min(760px, 100%); padding: 0; }
    .modal-head {
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 22px 26px 16px;
      background: var(--fb-surface);
      border-bottom: 1px solid var(--fb-border);
    }
    .modal-head h2 { margin: 6px 0 0; font-size: 1.45rem; }
    .icon-close {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border: none;
      border-radius: 50%;
      background: var(--fb-surface-alt);
      color: var(--fb-text-mid);
      cursor: pointer;
    }
    .icon-close:hover { color: var(--fb-text); }
    .fb-alert { margin: 16px 26px 0; }
    form { padding: 8px 26px 0; }
    fieldset { margin: 0; padding: 16px 0; border: none; border-bottom: 1px solid var(--fb-border); min-width: 0; }
    legend { padding: 0; margin-bottom: 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fb-muted); }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
    .full { grid-column: 1 / -1; }
    .fb-input.invalid, .fb-select.invalid { border-color: var(--fb-danger); }

    .rules { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .rule { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr auto; gap: 8px; align-items: center; }
    .rule .fb-input, .rule .fb-select { min-height: 40px; padding: 6px 10px; }
    .rule-error { grid-column: 1 / -1; }
    .add-rule { margin-top: 2px; }

    .switch { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; cursor: pointer; }
    .switch input { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--fb-primary); }
    .switch strong { display: block; font-size: 14.5px; }
    .switch small { color: var(--fb-muted); font-size: 13px; }

    .modal-actions {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin: 0 -26px;
      padding: 16px 26px 22px;
      background: var(--fb-surface);
    }
    .fb-spinner.light { width: 18px; height: 18px; border-color: rgba(255, 255, 255, 0.35); border-top-color: #fff; }

    @media (max-width: 640px) {
      .grid-2 { grid-template-columns: minmax(0, 1fr); }
      .rule { grid-template-columns: 1fr 1fr; }
      .rule .icon-close { justify-self: end; }
      .modal-actions { flex-direction: column-reverse; }
      .modal-actions .fb-btn { width: 100%; }
    }
  `],
})
export class SpecialistFormComponent implements OnInit {
  /** Spécialiste à modifier ; null pour une création. */
  @Input() specialist: AdminSpecialist | null = null;
  @Output() readonly saved = new EventEmitter<{ specialist: AdminSpecialist; message: string }>();
  @Output() readonly cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SpecialistAdminService);

  readonly days = WEEK_DAYS;
  readonly durations = [15, 20, 30, 45, 60, 90];
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly serverErrors = signal<Record<string, string>>({});

  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[+\d][\d\s.-]{5,19}$/)]],
    specialization: ['', [Validators.required]],
    licenseNumber: ['', [Validators.required]],
    city: [''],
    tariff: [null as number | null, [Validators.min(0), Validators.max(1000)]],
    languages: ['fr', [Validators.required, Validators.pattern(/^\s*[a-zA-Z]{2,3}(\s*,\s*[a-zA-Z]{2,3})*\s*$/)]],
    bio: ['', [Validators.maxLength(1000)]],
    isActive: [true],
    availabilityRules: this.fb.array<ReturnType<SpecialistFormComponent['buildRule']>>([]),
    password: [''],
    confirmPassword: [''],
  });

  get rules(): FormArray {
    return this.form.get('availabilityRules') as FormArray;
  }

  ngOnInit(): void {
    const password = this.form.get('password')!;
    password.setValidators(this.specialist
      ? [Validators.pattern(PASSWORD_PATTERN)]
      : [Validators.required, Validators.pattern(PASSWORD_PATTERN)]);
    password.updateValueAndValidity();

    if (this.specialist) {
      const s = this.specialist;
      this.form.patchValue({
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        specialization: s.specialization,
        licenseNumber: s.licenseNumber,
        city: s.city,
        tariff: s.tariff,
        languages: s.languages.join(', '),
        bio: s.bio,
        isActive: s.isActive,
      });
      s.availabilityRules.forEach((rule) => this.rules.push(this.buildRule(rule)));
    } else {
      // Valeurs par défaut proposées pour un nouveau spécialiste (modifiables).
      this.rules.push(this.buildRule({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 }));
      this.rules.push(this.buildRule({ dayOfWeek: 3, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30 }));
    }

    // Une erreur serveur sur un champ disparaît dès que l'administrateur le corrige.
    this.form.valueChanges.subscribe(() => {
      if (Object.keys(this.serverErrors()).length) this.serverErrors.set({});
    });
  }

  buildRule(rule: AvailabilityRule) {
    return this.fb.group({
      dayOfWeek: [rule.dayOfWeek, Validators.required],
      startTime: [rule.startTime, Validators.required],
      endTime: [rule.endTime, Validators.required],
      slotDurationMinutes: [rule.slotDurationMinutes || 30, Validators.required],
    }, { validators: ruleValidator });
  }

  addRule(): void {
    this.rules.push(this.buildRule({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 }));
  }

  removeRule(index: number): void {
    this.rules.removeAt(index);
  }

  invalid(field: string): boolean {
    const control = this.form.get(field);
    return !!this.serverErrors()[field] || !!(control && control.invalid && (control.touched || control.dirty));
  }

  errorOf(field: string, fallback: string): string {
    return this.serverErrors()[field] || fallback;
  }

  passwordMismatch(): boolean {
    const { password, confirmPassword } = this.form.getRawValue();
    return !!password && (this.form.get('confirmPassword')!.touched || !!confirmPassword) && password !== confirmPassword;
  }

  close(): void {
    if (!this.saving()) this.cancelled.emit();
  }

  submit(): void {
    this.formError.set('');
    if (this.form.invalid || this.passwordMismatch()) {
      this.form.markAllAsTouched();
      this.formError.set('Vérifiez les champs signalés avant d\'enregistrer.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: SpecialistPayload = {
      firstName: raw.firstName!.trim(),
      lastName: raw.lastName!.trim(),
      email: raw.email!.trim(),
      phone: raw.phone?.trim() || '',
      specialization: raw.specialization!.trim(),
      licenseNumber: raw.licenseNumber!.trim(),
      city: raw.city?.trim() || '',
      tariff: raw.tariff === null || (raw.tariff as unknown) === '' ? null : Number(raw.tariff),
      languages: String(raw.languages || '').split(',').map((code) => code.trim().toLowerCase()).filter(Boolean),
      bio: raw.bio?.trim() || '',
      isActive: !!raw.isActive,
      availabilityRules: (raw.availabilityRules as AvailabilityRule[]).map((rule) => ({
        dayOfWeek: Number(rule.dayOfWeek),
        startTime: rule.startTime,
        endTime: rule.endTime,
        slotDurationMinutes: Number(rule.slotDurationMinutes),
      })),
    };
    if (raw.password) {
      payload.password = raw.password;
      payload.confirmPassword = raw.confirmPassword || '';
    }
    if (payload.tariff === null) delete payload.tariff;

    this.saving.set(true);
    const request = this.specialist ? this.api.update(this.specialist._id, payload) : this.api.create(payload);
    request.subscribe({
      next: (response) => {
        this.saving.set(false);
        this.saved.emit({
          specialist: response.specialist,
          message: response.message || (this.specialist ? 'Spécialiste mis à jour.' : 'Spécialiste créé.'),
        });
      },
      error: (error) => {
        this.saving.set(false);
        const described = SpecialistAdminService.describeError(error, "L'enregistrement a échoué.");
        this.formError.set(described.message);
        this.serverErrors.set(described.fields);
      },
    });
  }
}
