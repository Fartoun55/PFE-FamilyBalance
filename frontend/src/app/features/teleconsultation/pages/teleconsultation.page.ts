import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TeleconsultationService } from '../../../core/services/teleconsultation.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  TeleconsultationAppointment,
  TeleconsultationMessage,
  TeleconsultationPatientSummary,
  TeleconsultationSpecialistProfile,
} from '../models/teleconsultation.models';
import { MatIconModule } from '@angular/material/icon';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IllustrationComponent } from '../../../shared/components/illustration/illustration.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/**
 * Les nouveaux messages arrivent en temps réel (Socket.IO). Ce rafraîchissement périodique
 * n'est qu'un filet de sécurité si la connexion temps réel est coupée ; un intervalle court
 * consommerait inutilement le quota du limiteur de requêtes de l'API (120 / 15 min).
 */
const MESSAGE_POLL_MS = 60000;

@Component({
  selector: 'app-teleconsultation-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, EmptyStateComponent,
    IllustrationComponent, PageHeaderComponent],
  template: `
        <div class="content">
          <app-page-header
            eyebrow="Spécialistes"
            title="Téléconsultation"
            [subtitle]="userRole() === 'specialist'
              ? 'Suivez vos patients, leurs derniers résultats et leurs alertes.'
              : 'Trouvez un spécialiste, prenez rendez-vous, rejoignez la visioconférence et échangez par messagerie sécurisée.'"
            [illustration]="userRole() === 'specialist' ? 'specialist' : 'teleconsultation'"
          >
            <span class="role-chip" [class.specialist]="userRole() === 'specialist'">
              <mat-icon>{{ userRole() === 'specialist' ? 'medical_services' : 'person' }}</mat-icon>
              {{ userRole() === 'specialist' ? 'Espace spécialiste' : 'Espace patient' }}
            </span>
          </app-page-header>

          <div class="fb-alert fb-alert--error" role="alert" *ngIf="errorMessage()">
            <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
          </div>
          <div class="fb-alert fb-alert--success" role="status" *ngIf="successMessage()">
            <mat-icon>check_circle</mat-icon><span>{{ successMessage() }}</span>
          </div>

          <!-- Two-column layout -->
          <div class="tele-grid" *ngIf="isPatient() || isSpecialist()" [class.specialist-layout]="isSpecialist()">

            <!-- LEFT column : annuaire + réservation (parents / adolescents uniquement) -->
            <div class="left-col" *ngIf="isPatient()">

              <!-- ── Annuaire ──────────────────── -->
              <div class="section-card">
                <div class="card-head">
                  <div class="card-head-icon blue">
                    <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                      <path d="M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 14a7 7 0 0 1 14 0"/>
                    </svg>
                  </div>
                  <div>
                    <h2>Annuaire de spécialistes</h2>
                    <p>Filtrez par spécialité, langue, ville ou tarif</p>
                  </div>
                </div>

                <!-- Filter form -->
                <form class="filter-form" [formGroup]="directoryForm" (ngSubmit)="loadDirectory()">
                  <div class="f-group">
                    <label>Spécialité</label>
                    <div class="f-wrap">
                      <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                        <path d="M10 2a5 5 0 1 0 0 10A5 5 0 0 0 10 2zM14 14l-2.5-2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                      <input class="f-input" formControlName="speciality" placeholder="Ex : Psychiatrie…"/>
                    </div>
                  </div>
                  <div class="f-group">
                    <label>Langue</label>
                    <div class="f-wrap">
                      <input class="f-input" formControlName="language" placeholder="fr, en…"/>
                    </div>
                  </div>
                  <div class="f-group">
                    <label>Ville</label>
                    <div class="f-wrap">
                      <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 10.5 3 7a5 5 0 0 1 5-5z" stroke="currentColor" stroke-width="1.3"/>
                        <circle cx="8" cy="7" r="1.5" stroke="currentColor" stroke-width="1.3"/>
                      </svg>
                      <input class="f-input" formControlName="city" placeholder="Paris, Lyon…"/>
                    </div>
                  </div>
                  <div class="f-group">
                    <label>Tarif max (€)</label>
                    <div class="f-wrap">
                      <svg class="f-icon" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M8 4v8M6 6h3a2 2 0 0 1 0 4H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                      <input class="f-input" type="number" formControlName="maxTariff" placeholder="100" min="0"/>
                    </div>
                  </div>
                  <button type="submit" class="btn-filter">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                    </svg>
                    Filtrer
                  </button>
                </form>

                <!-- Specialist list -->
                <div class="specialist-list" *ngIf="specialists().length > 0; else noSpecTpl">
                  <div
                    class="specialist-card"
                    *ngFor="let s of specialists()"
                    [class.selected]="selectedSpecialist()?._id === s._id"
                    role="button"
                    tabindex="0"
                    [attr.aria-pressed]="selectedSpecialist()?._id === s._id"
                    [attr.aria-label]="'Sélectionner ' + s.displayName"
                    (click)="selectSpecialist(s)"
                    (keydown.enter)="selectSpecialist(s)"
                    (keydown.space)="$event.preventDefault(); selectSpecialist(s)"
                  >
                    <div class="spec-av">{{ s.displayName.charAt(0) }}</div>
                    <div class="spec-info">
                      <strong>{{ s.displayName }}</strong>
                      <span>{{ s.specialization }} · {{ s.city || 'En ligne' }}</span>
                      <div class="spec-meta">
                        <span class="meta-pill">{{ s.languages.join(', ') || 'fr' }}</span>
                        <span class="meta-pill price">{{ s.tariff }} €</span>
                        <span class="meta-pill" [class.available]="s.hasAvailability">
                          {{ s.hasAvailability ? 'Disponible' : 'Indisponible' }}
                        </span>
                      </div>
                    </div>
                    <div class="spec-rating" *ngIf="s.averageRating">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1l1.5 3.5H14l-3.2 2.3 1.2 3.7L8 8.5 4 10.5l1.2-3.7L2 4.5h4.5z"/>
                      </svg>
                      {{ s.averageRating }}/5
                    </div>
                  </div>
                </div>
                <ng-template #noSpecTpl>
                  <app-empty-state
                    icon="person_search"
                    illustration="empty-search"
                    title="Aucun spécialiste trouvé"
                    message="Ajustez vos filtres pour élargir la recherche."
                  ></app-empty-state>
                </ng-template>
              </div>

              <!-- ── Prise de RDV ──────────────── -->
              <div class="section-card" *ngIf="selectedSpecialist() as specialist">
                <div class="card-head">
                  <div class="card-head-icon teal">
                    <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                      <rect x="2" y="3" width="16" height="15" rx="2"/>
                      <path d="M6 1v4M14 1v4M2 9h16"/>
                    </svg>
                  </div>
                  <div>
                    <h2>Prendre un rendez-vous</h2>
                    <p>avec {{ specialist.displayName }}</p>
                  </div>
                </div>

                <!-- Specialist detail -->
                <div class="spec-detail">
                  <div class="spec-av large">{{ specialist.displayName.charAt(0) }}</div>
                  <div>
                    <strong>{{ specialist.displayName }}</strong>
                    <span>{{ specialist.bio }}</span>
                  </div>
                </div>

                <!-- Available slots -->
                <div class="slots-section">
                  <label class="slots-label">Créneaux disponibles</label>
                  <div class="slot-grid" *ngIf="availableSlots().length > 0; else noSlotTpl">
                    <button
                      type="button"
                      class="slot-btn"
                      *ngFor="let slot of availableSlots()"
                      [class.picked]="bookingForm.get('slotStart')?.value === toDatetimeLocalValue(slot.start)"
                      (click)="pickSlot(slot)"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
                        <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                      </svg>
                      {{ slot.label }}
                    </button>
                  </div>
                  <ng-template #noSlotTpl>
                    <p class="no-slots">Aucun créneau disponible pour ce spécialiste.</p>
                  </ng-template>
                </div>

                <!-- Booking form -->
                <form class="booking-form" [formGroup]="bookingForm" (ngSubmit)="bookAppointment()">
                  <div class="f-group">
                    <label>Motif de consultation <span class="req">*</span></label>
                    <div class="f-wrap" [class.invalid]="bookingForm.get('reason')?.invalid && bookingForm.get('reason')?.touched">
                      <input class="f-input" formControlName="reason" placeholder="Décrivez brièvement le motif…"/>
                    </div>
                  </div>

                  <div class="f-row">
                    <div class="f-group">
                      <label>Mode de consultation</label>
                      <div class="f-wrap">
                        <select class="f-input f-select" formControlName="consultationMode">
                          <option value="video">Vidéo</option>
                          <option value="audio">Audio</option>
                          <option value="chat">Messagerie</option>
                        </select>
                      </div>
                    </div>
                    <div class="f-group">
                      <label>Plateforme</label>
                      <div class="f-wrap">
                        <select class="f-input f-select" formControlName="meetingProvider">
                          <option value="jitsi">Jitsi Meet</option>
                          <option value="daily">Daily.co</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div class="f-row">
                    <div class="f-group">
                      <label>Début <span class="req">*</span></label>
                      <div class="f-wrap">
                        <input class="f-input" type="datetime-local" formControlName="slotStart"/>
                      </div>
                    </div>
                    <div class="f-group">
                      <label>Fin <span class="req">*</span></label>
                      <div class="f-wrap">
                        <input class="f-input" type="datetime-local" formControlName="slotEnd"/>
                      </div>
                    </div>
                  </div>

                  <button type="submit" class="btn-book" [disabled]="bookingForm.invalid">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8l3 3 5-5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    Confirmer le rendez-vous
                  </button>
                </form>
              </div>

            </div>

            <!-- RIGHT column -->
            <div class="right-col">

              <!-- ── Mes rendez-vous ───────────── -->
              <div class="section-card">
                <div class="card-head">
                  <div class="card-head-icon purple">
                    <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                      <circle cx="10" cy="10" r="8"/>
                      <path d="M10 6v4l3 2"/>
                    </svg>
                  </div>
                  <div>
                    <h2>{{ isSpecialist() ? 'Demandes de téléconsultation' : 'Mes rendez-vous' }}</h2>
                    <p>{{ appointments().length }} {{ isSpecialist() ? 'demande(s) reçue(s)' : 'consultation(s)' }}</p>
                  </div>
                  <button
                    class="btn-refresh"
                    type="button"
                    [attr.aria-label]="isSpecialist() ? 'Actualiser les demandes' : 'Actualiser les rendez-vous'"
                    [disabled]="loadingAppointments()"
                    (click)="loadAppointments()"
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M14 8A6 6 0 0 1 2 8M2 4v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>

                <div class="fb-loading" *ngIf="loadingAppointments() && !appointments().length">
                  <span class="fb-spinner"></span>
                  Chargement…
                </div>
                <div class="fb-alert fb-alert--error" role="alert" *ngIf="appointmentsError()">
                  <mat-icon>error_outline</mat-icon><span>{{ appointmentsError() }}</span>
                </div>

                <div class="appt-list" *ngIf="appointments().length > 0; else noApptTpl">
                  <div
                    class="appt-card"
                    *ngFor="let appt of appointments()"
                    [class.active]="selectedAppointment()?._id === appt._id"
                    role="button"
                    tabindex="0"
                    [attr.aria-pressed]="selectedAppointment()?._id === appt._id"
                    [attr.aria-label]="'Ouvrir le rendez-vous avec ' + counterpartName(appt)"
                    (click)="openAppointment(appt)"
                    (keydown.enter)="openAppointment(appt)"
                    (keydown.space)="$event.preventDefault(); openAppointment(appt)"
                  >
                    <div class="appt-top">
                      <div class="appt-av">{{ counterpartName(appt).charAt(0) }}</div>
                      <div class="appt-info">
                        <strong>
                          {{ counterpartName(appt) }}
                          <span class="who" *ngIf="isSpecialist() && appt.patient?.role">{{ patientRoleLabel(appt.patient?.role) }}</span>
                        </strong>
                        <span>{{ formatDate(appt.slotStart) }} · {{ modeLabel(appt.consultationMode) }}</span>
                      </div>
                      <span class="status-pill" [attr.data-status]="appt.status">
                        {{ statusLabel(appt.status) }}
                      </span>
                    </div>
                    <p class="appt-reason" *ngIf="appt.reason"><strong>Motif :</strong> {{ appt.reason }}</p>
                  </div>
                </div>
                <ng-template #noApptTpl>
                  <div class="empty-state small" *ngIf="!loadingAppointments() && !appointmentsError()">
                    <app-illustration class="small-illus" name="appointments" fallbackIcon="event_available"></app-illustration>
                    <p>{{ isSpecialist() ? 'Aucune demande de téléconsultation pour le moment.' : 'Aucun rendez-vous planifié.' }}</p>
                  </div>
                </ng-template>
              </div>

              <!-- ── Salle d'attente & Visio ──── -->
              <div class="section-card waiting-card" *ngIf="selectedAppointment() as appt">
                <div class="card-head">
                  <div class="card-head-icon green">
                    <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                      <rect x="2" y="4" width="16" height="11" rx="2"/>
                      <path d="M8 22h6M11 15v3"/>
                    </svg>
                  </div>
                  <div>
                    <h2>{{ isSpecialist() ? 'Détail de la demande' : "Salle d'attente" }}</h2>
                    <p>{{ counterpartName(appt) }}</p>
                  </div>
                </div>

                <div class="waiting-info">
                  <div class="wi-row" *ngIf="isSpecialist() && appt.patient">
                    <span class="wi-label">Demandeur</span>
                    <p class="wi-msg">
                      {{ appt.patient.firstName }} {{ appt.patient.lastName }}
                      ({{ patientRoleLabel(appt.patient.role) }}) · {{ appt.patient.email }}
                    </p>
                  </div>
                  <div class="wi-row">
                    <span class="wi-label">Créneau</span>
                    <p class="wi-msg">{{ formatDate(appt.slotStart) }} → {{ formatTime(appt.slotEnd) }}</p>
                  </div>
                  <div class="wi-row">
                    <span class="wi-label">Motif</span>
                    <p class="wi-msg">{{ appt.reason || '—' }}</p>
                  </div>
                  <div class="wi-row">
                    <span class="wi-label">Mode</span>
                    <p class="wi-msg">{{ modeLabel(appt.consultationMode) }} · {{ statusLabel(appt.status) }}</p>
                  </div>
                  <div class="wi-row">
                    <span class="wi-label">Salle</span>
                    <code class="wi-value">{{ appt.meetingUrl.split('/').pop() || '—' }}</code>
                  </div>
                  <div class="wi-row" *ngIf="appt.waitingRoomMessage">
                    <span class="wi-label">Message</span>
                    <p class="wi-msg">{{ appt.waitingRoomMessage }}</p>
                  </div>
                </div>

                <button
                  class="btn-join"
                  type="button"
                  *ngIf="appt.status === 'confirmed' || appt.status === 'in-progress'"
                  (click)="joinMeeting(appt)"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                    <rect x="2" y="5" width="12" height="10" rx="2"/>
                    <path d="M14 8l4-2v6l-4-2V8z"/>
                  </svg>
                  Rejoindre la visioconférence
                </button>
                <p class="no-slots" *ngIf="appt.status === 'pending'">
                  La consultation sera accessible une fois le rendez-vous confirmé.
                </p>
                <p class="no-slots" *ngIf="appt.status === 'cancelled' || appt.status === 'completed'">
                  Ce rendez-vous est {{ appt.status === 'cancelled' ? 'annulé' : 'terminé' }} — la visioconférence n'est plus disponible.
                </p>

                <div class="appt-action-row" *ngIf="appt.status === 'pending' || appt.status === 'confirmed'">
                  <button
                    class="btn-cancel"
                    type="button"
                    [disabled]="cancelling()"
                    (click)="cancelAppointment(appt._id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    {{ cancelling() ? 'Annulation…' : 'Annuler le rendez-vous' }}
                  </button>
                  <button
                    class="btn-move"
                    type="button"
                    (click)="startReschedule(appt)"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M14 8A6 6 0 0 1 2 8M2 4v4h4M2 8a6 6 0 0 1 12 0M14 12v-4h-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Déplacer le rendez-vous
                  </button>
                </div>

                <div class="reschedule-block" *ngIf="reschedulingId() === appt._id">
                  <label class="slots-label">Nouveau créneau</label>
                  <div class="f-row">
                    <div class="f-group">
                      <label>Début</label>
                      <div class="f-wrap"><input class="f-input" type="datetime-local" [value]="rescheduleStart()" (input)="rescheduleStart.set($any($event.target).value)"/></div>
                    </div>
                    <div class="f-group">
                      <label>Fin</label>
                      <div class="f-wrap"><input class="f-input" type="datetime-local" [value]="rescheduleEnd()" (input)="rescheduleEnd.set($any($event.target).value)"/></div>
                    </div>
                  </div>
                  <div class="reschedule-actions">
                    <button type="button" class="btn-filter" [disabled]="rescheduling()" (click)="submitReschedule(appt._id)">
                      {{ rescheduling() ? 'Déplacement…' : 'Valider le nouveau créneau' }}
                    </button>
                    <button type="button" class="rule-btn-cancel" (click)="cancelReschedule()">Annuler</button>
                  </div>
                </div>

                <div class="share-block" *ngIf="userRole() !== 'specialist'">
                  <button
                    class="btn-share"
                    type="button"
                    [disabled]="appt.bilanShared"
                    (click)="shareBilan(appt._id)"
                  >
                    {{ appt.bilanShared ? 'Bilan partagé' : 'Partager mon bilan FamilyBalance' }}
                  </button>
                  <p class="share-note" *ngIf="appt.bilanShared">
                    Bilan partagé le {{ appt.bilanSharedAt ? (appt.bilanSharedAt | date:'short') : '—' }}.
                  </p>
                </div>

                <!-- Bilan partagé par le patient, visible du spécialiste -->
                <div class="share-block" *ngIf="isSpecialist()">
                  <ng-container *ngIf="appt.bilanShared && appt.sharedScoreSnapshot as bilan; else noBilan">
                    <span class="slots-label">Bilan FamilyBalance partagé</span>
                    <div class="bilan">
                      <strong>{{ bilan.globalScore }}/100</strong>
                      <span class="risk-badge" [attr.data-risk]="bilan.riskLevel">{{ riskLabel(bilan.riskLevel) }}</span>
                      <small>Comportemental {{ bilan.subScores.comportemental }} · Émotionnel {{ bilan.subScores.emotionnel }} · Social {{ bilan.subScores.social }} · Parental {{ bilan.subScores.parental }}</small>
                    </div>
                  </ng-container>
                  <ng-template #noBilan>
                    <p class="share-note">Le patient n'a pas encore partagé son bilan FamilyBalance.</p>
                  </ng-template>
                </div>
              </div>

              <!-- ── Messagerie sécurisée ──────── -->
              <div class="section-card messaging-card" *ngIf="selectedAppointment() as appt">
                <div class="card-head">
                  <div class="card-head-icon amber">
                    <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                      <path d="M2 4h16v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z"/>
                      <path d="M2 4l8 7 8-7"/>
                    </svg>
                  </div>
                  <div>
                    <h2>Messagerie sécurisée</h2>
                    <p>Avec {{ counterpartName(appt) }} · {{ messages().length }} message(s)</p>
                  </div>
                  <button class="btn-refresh" type="button" aria-label="Actualiser les messages" [disabled]="loadingMessages()" (click)="loadMessages(appt._id)">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M14 8A6 6 0 0 1 2 8M2 4v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>

                <div class="fb-alert fb-alert--error" role="alert" *ngIf="messagesError()">
                  <mat-icon>error_outline</mat-icon><span>{{ messagesError() }}</span>
                </div>

                <!-- Messages thread -->
                <div class="msg-thread" #thread aria-live="polite" *ngIf="messages().length > 0; else noMsgTpl">
                  <div class="msg-bubble" *ngFor="let msg of messages(); trackBy: trackMessage" [class.mine]="isMine(msg)">
                    <div class="msg-tag">
                      <strong class="msg-author">{{ isMine(msg) ? 'Vous' : (msg.senderName || counterpartName(appt)) }}</strong>
                      <span class="msg-type-pill" [class.pre]="msg.messageType === 'pre'">
                        {{ msg.messageType === 'pre' ? 'Pré-consultation' : 'Post-consultation' }}
                      </span>
                      <time class="msg-time">{{ formatDate(msg.createdAt) }}</time>
                    </div>
                    <p>{{ msg.content }}</p>
                  </div>
                </div>
                <ng-template #noMsgTpl>
                  <div class="fb-loading" *ngIf="loadingMessages(); else emptyThread">
                    <span class="fb-spinner"></span>
                    Chargement de la conversation…
                  </div>
                  <ng-template #emptyThread>
                    <div class="empty-state small"><app-illustration class="small-illus" name="messaging" fallbackIcon="forum"></app-illustration><p>Aucun message pour le moment. Écrivez le premier message ci-dessous.</p></div>
                  </ng-template>
                </ng-template>

                <!-- Message form -->
                <form class="msg-form" [formGroup]="messageForm" (ngSubmit)="sendMessage(appt._id)">
                  <div class="msg-type-row">
                    <button type="button" class="type-chip"
                      [class.active]="messageForm.get('messageType')?.value === 'pre'"
                      (click)="messageForm.get('messageType')?.setValue('pre')">
                      Pré-consultation
                    </button>
                    <button type="button" class="type-chip"
                      [class.active]="messageForm.get('messageType')?.value === 'post'"
                      (click)="messageForm.get('messageType')?.setValue('post')">
                      Post-consultation
                    </button>
                  </div>
                  <div class="msg-input-row">
                    <textarea
                      class="msg-textarea"
                      rows="3"
                      maxlength="2000"
                      formControlName="content"
                      [attr.aria-label]="'Message à ' + counterpartName(appt)"
                      placeholder="Rédigez votre message sécurisé…"
                    ></textarea>
                    <button type="submit" class="btn-send" aria-label="Envoyer le message" [disabled]="messageForm.invalid || sendingMessage()">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 14L14 8 2 2v5l8 1-8 1v5z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>

          <!-- ── Dashboard spécialiste ────────────── -->
          <div class="section-card specialist-dashboard" *ngIf="userRole() === 'specialist'">
            <div class="card-head">
              <div class="card-head-icon navy">
                <svg viewBox="0 0 20 20" fill="none" stroke-width="1.5">
                  <path d="M3 17V9M7 17V5M11 17v-7M15 17V3"/>
                </svg>
              </div>
              <div>
                <h2>Tableau de bord clinique</h2>
                <p>{{ specialistPatients().length }} patient(s) suivi(s)</p>
              </div>
              <button class="btn-refresh" type="button" aria-label="Actualiser le tableau de bord" (click)="loadSpecialistDashboard()">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8A6 6 0 0 1 2 8M2 4v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>

            <div class="patient-grid" *ngIf="specialistPatients().length > 0; else noPatientsTPl">
              <div class="patient-card" *ngFor="let patient of specialistPatients()">
                <div class="patient-header">
                  <div class="patient-av">{{ patient.firstName.charAt(0) }}{{ patient.lastName.charAt(0) }}</div>
                  <div class="patient-meta">
                    <strong>{{ patient.firstName }} {{ patient.lastName }}</strong>
                    <span>{{ patient.email }}</span>
                  </div>
                  <div class="alert-badge" *ngIf="patient.openAlerts.length">
                    {{ patient.openAlerts.length }}
                  </div>
                </div>
                <div class="patient-score" *ngIf="patient.latestScore">
                  <div class="score-bar-wrap">
                    <div class="score-bar-fill" [style.width.%]="patient.latestScore.globalScore"
                         [attr.data-risk]="patient.latestScore.riskLevel"></div>
                  </div>
                  <span class="score-val">{{ patient.latestScore.globalScore }}/100</span>
                  <span class="risk-badge" [attr.data-risk]="patient.latestScore.riskLevel">
                    {{ riskLabel(patient.latestScore.riskLevel) }}
                  </span>
                </div>
                <p class="no-score" *ngIf="!patient.latestScore">Aucun score disponible</p>
              </div>
            </div>
            <ng-template #noPatientsTPl>
              <div class="empty-state small"><app-illustration class="small-illus" name="family-dashboard" fallbackIcon="groups"></app-illustration><p>Aucun patient référencé pour le moment.</p></div>
            </ng-template>
          </div>

        </div>
  `,
  styles: [`
    :host { display: block; }
    .content { display: flex; flex-direction: column; gap: 20px; }
    .content > app-page-header { display: block; margin-bottom: -4px; }

    .role-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--fb-radius-pill);
      background: var(--fb-primary-soft);
      color: var(--fb-primary-strong);
      font-size: 13.5px;
      font-weight: 700;
    }
    .role-chip.specialist { background: var(--fb-accent-soft); color: var(--fb-warning-ink); }
    .role-chip mat-icon { width: 18px; height: 18px; font-size: 18px; }

    /* Mise en page */
    .tele-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
    /* Spécialiste : pas d'annuaire, la liste des demandes et la conversation côte à côte. */
    .tele-grid.specialist-layout { grid-template-columns: minmax(0, 1fr); }
    .specialist-layout .right-col { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); align-items: start; }
    .specialist-layout .right-col > :first-child { grid-row: span 2; }
    .left-col, .right-col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }

    .section-card {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: clamp(18px, 2.5vw, 26px);
      border-radius: var(--fb-radius-md);
      background: var(--fb-surface);
      box-shadow: var(--fb-elev-1);
      min-width: 0;
    }
    .card-head { display: flex; align-items: center; gap: 14px; }
    .card-head > div:not(.card-head-icon) { flex: 1; min-width: 0; }
    .card-head h2 { margin: 0; font-family: var(--fb-font-sans); font-variation-settings: normal; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
    .card-head p { margin: 2px 0 0; color: var(--fb-text-mid); font-size: 13.5px; }
    .card-head-icon {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: var(--fb-primary-soft);
      color: var(--fb-primary);
    }
    .card-head-icon svg { width: 20px; height: 20px; stroke: currentColor; fill: none; }
    .card-head-icon.amber, .card-head-icon.purple { background: var(--fb-accent-soft); color: var(--fb-accent-strong); }
    .card-head-icon.navy { background: var(--fb-ink); color: #fff; }
    .card-head-icon.green { background: rgba(var(--fb-success-rgb), 0.1); color: var(--fb-success); }

    .btn-refresh {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border: 1px solid var(--fb-border);
      border-radius: 50%;
      background: var(--fb-surface);
      color: var(--fb-text-mid);
      cursor: pointer;
    }
    .btn-refresh:hover { background: var(--fb-surface-alt); color: var(--fb-text); }

    /* Champs */
    .filter-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .filter-form .btn-filter { grid-column: 1 / -1; justify-self: start; }
    .booking-form { display: flex; flex-direction: column; gap: 14px; }
    .f-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .f-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .f-group > label { font-size: 13px; font-weight: 600; color: var(--fb-text); }
    .req { color: var(--fb-danger); }
    .f-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 44px;
      padding: 0 12px;
      border: 1.5px solid var(--fb-border);
      border-radius: var(--fb-radius-sm);
      background: var(--fb-surface);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .f-wrap:focus-within { border-color: var(--fb-primary); box-shadow: 0 0 0 4px rgba(var(--fb-primary-rgb), 0.12); }
    .f-wrap.invalid { border-color: var(--fb-danger); }
    .f-icon { flex-shrink: 0; width: 16px; height: 16px; color: var(--fb-faint); }
    .f-input { flex: 1; min-width: 0; height: 100%; border: none; outline: none; background: transparent; color: var(--fb-text); font-size: 14px; }
    .f-input::placeholder { color: var(--fb-faint); }
    .f-select { cursor: pointer; }

    /* Boutons (alignés sur .fb-btn) */
    .btn-filter, .btn-book, .btn-join, .btn-cancel, .btn-move, .btn-share, .rule-btn-cancel {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 18px;
      border: 1px solid transparent;
      border-radius: var(--fb-radius-pill);
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }
    .btn-filter, .btn-book { background: var(--fb-primary); color: #fff; }
    .btn-filter:hover:not(:disabled), .btn-book:hover:not(:disabled) { background: var(--fb-primary-strong); }
    .btn-book { width: 100%; min-height: 48px; }
    .btn-join { width: 100%; min-height: 48px; background: var(--fb-accent); color: var(--fb-ink); }
    .btn-join:hover { background: var(--fb-accent-hover); }
    .btn-move, .btn-share, .rule-btn-cancel { background: var(--fb-surface); border-color: var(--fb-border-strong); color: var(--fb-text); }
    .btn-move:hover, .btn-share:hover:not(:disabled), .rule-btn-cancel:hover { background: var(--fb-surface-alt); }
    .btn-cancel { background: var(--fb-surface); border-color: rgba(var(--fb-danger-rgb), 0.35); color: var(--fb-danger); }
    .btn-cancel:hover:not(:disabled) { background: rgba(var(--fb-danger-rgb), 0.06); }
    .btn-filter:disabled, .btn-book:disabled, .btn-cancel:disabled, .btn-share:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Annuaire */
    .specialist-list { display: flex; flex-direction: column; gap: 8px; }
    .specialist-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      border: 1.5px solid var(--fb-border);
      border-radius: 16px;
      cursor: pointer;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }
    .specialist-card:hover { border-color: var(--fb-border-strong); background: var(--fb-surface-alt); }
    .specialist-card.selected { border-color: var(--fb-primary); background: var(--fb-primary-soft); }
    .spec-av, .appt-av, .patient-av {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: var(--fb-ink);
      color: #fff;
      font-weight: 700;
    }
    .spec-av.large { width: 56px; height: 56px; border-radius: 18px; font-size: 20px; }
    .spec-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .spec-info strong { font-size: 15px; }
    .spec-info > span { color: var(--fb-text-mid); font-size: 13.5px; }
    .spec-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .meta-pill { padding: 2px 9px; border-radius: var(--fb-radius-pill); background: var(--fb-surface-alt); color: var(--fb-text-mid); font-size: 12px; font-weight: 600; }
    .meta-pill.price { background: var(--fb-accent-soft); color: var(--fb-warning-ink); }
    .meta-pill.available { background: rgba(var(--fb-success-rgb), 0.1); color: var(--fb-success-ink); }
    .spec-rating { display: inline-flex; align-items: center; gap: 4px; color: var(--fb-accent-strong); font-size: 13px; font-weight: 700; }

    /* Réservation */
    .spec-detail { display: flex; gap: 14px; padding: 14px; border-radius: 16px; background: var(--fb-surface-alt); }
    .spec-detail strong { display: block; font-size: 15.5px; }
    .spec-detail span { color: var(--fb-text-mid); font-size: 14px; line-height: 1.5; }
    .slots-label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 700; color: var(--fb-text); }
    .slot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
    .slot-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 40px;
      padding: 0 10px;
      border: 1.5px solid var(--fb-border);
      border-radius: var(--fb-radius-sm);
      background: var(--fb-surface);
      color: var(--fb-text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .slot-btn:hover { border-color: var(--fb-primary); }
    .slot-btn.picked { border-color: var(--fb-primary); background: var(--fb-primary); color: #fff; }
    .no-slots { margin: 0; color: var(--fb-muted); font-size: 14px; }

    /* Rendez-vous */
    .appt-list { display: flex; flex-direction: column; gap: 8px; }
    .appt-card { padding: 12px 14px; border: 1.5px solid var(--fb-border); border-radius: 16px; cursor: pointer; }
    .appt-card:hover { background: var(--fb-surface-alt); }
    .appt-card.active { border-color: var(--fb-primary); background: var(--fb-primary-soft); }
    .appt-top { display: flex; align-items: center; gap: 12px; }
    .appt-av { width: 38px; height: 38px; border-radius: 12px; }
    .appt-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .appt-info strong { font-size: 14.5px; }
    .appt-info span { color: var(--fb-muted); font-size: 13px; }
    .appt-reason { margin: 8px 0 0; color: var(--fb-text-mid); font-size: 13.5px; }
    .status-pill { flex-shrink: 0; padding: 3px 10px; border-radius: var(--fb-radius-pill); background: var(--fb-surface-alt); color: var(--fb-text-mid); font-size: 12px; font-weight: 700; }
    .status-pill[data-status="pending"] { background: var(--fb-accent-soft); color: var(--fb-warning-ink); }
    .status-pill[data-status="confirmed"], .status-pill[data-status="in-progress"] { background: rgba(var(--fb-success-rgb), 0.1); color: var(--fb-success-ink); }
    .status-pill[data-status="cancelled"] { background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }
    .empty-state.small { padding: 18px; border-radius: var(--fb-radius-sm); background: var(--fb-surface-alt); text-align: center; }
    .empty-state.small p { margin: 0; color: var(--fb-muted); font-size: 14px; }
    .empty-state.small .small-illus { width: min(170px, 60%); margin: 0 auto 6px; }

    /* Salle d'attente */
    .waiting-info { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: var(--fb-radius-sm); background: var(--fb-surface-alt); }
    .wi-row { display: flex; gap: 12px; align-items: baseline; }
    .wi-label { min-width: 70px; color: var(--fb-muted); font-size: 13px; }
    .wi-value { padding: 2px 8px; border-radius: 6px; background: var(--fb-surface); font-family: var(--fb-font-mono); font-size: 12.5px; overflow-wrap: anywhere; }
    .wi-msg { margin: 0; font-size: 14px; }
    .appt-action-row, .reschedule-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .reschedule-block { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px dashed var(--fb-border-strong); border-radius: var(--fb-radius-sm); }
    .share-block { padding-top: 14px; border-top: 1px solid var(--fb-border); }
    .share-note { margin: 8px 0 0; color: var(--fb-muted); font-size: 13px; }

    /* Messagerie */
    .msg-thread { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; padding: 4px; }
    .msg-bubble { max-width: 88%; padding: 10px 14px; border-radius: 16px 16px 16px 4px; background: var(--fb-surface-alt); }
    .msg-bubble.mine { align-self: flex-end; border-radius: 16px 16px 4px 16px; background: var(--fb-primary-soft); }
    .msg-bubble p { margin: 4px 0 0; font-size: 14px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
    .msg-tag { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; }
    .msg-author { font-size: 12.5px; }
    .msg-time { margin-left: auto; font-size: 11.5px; color: var(--fb-muted); }
    .who { margin-left: 6px; padding: 1px 8px; border-radius: var(--fb-radius-pill); background: var(--fb-surface-alt); color: var(--fb-text-mid); font-size: 11.5px; font-weight: 700; }
    .bilan { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 12px 14px; border-radius: var(--fb-radius-sm); background: var(--fb-surface-alt); }
    .bilan strong { font-family: var(--fb-font-serif); font-size: 22px; }
    .bilan small { flex-basis: 100%; color: var(--fb-text-mid); font-size: 12.5px; }
    .msg-type-pill { font-size: 11.5px; font-weight: 700; color: var(--fb-primary-strong); }
    .msg-type-pill.pre { color: var(--fb-accent-strong); }
    .msg-form { display: flex; flex-direction: column; gap: 10px; }
    .msg-type-row { display: inline-flex; align-self: flex-start; padding: 4px; border-radius: var(--fb-radius-pill); background: var(--fb-surface-alt); }
    .type-chip { padding: 6px 14px; border: none; border-radius: var(--fb-radius-pill); background: transparent; color: var(--fb-text-mid); font-size: 13px; font-weight: 600; cursor: pointer; }
    .type-chip.active { background: var(--fb-surface); color: var(--fb-text); box-shadow: var(--fb-elev-1); }
    .msg-input-row { display: flex; gap: 10px; align-items: flex-end; }
    .msg-textarea {
      flex: 1;
      min-width: 0;
      padding: 10px 14px;
      border: 1.5px solid var(--fb-border);
      border-radius: var(--fb-radius-sm);
      color: var(--fb-text);
      font-size: 14px;
      resize: vertical;
    }
    .msg-textarea:focus { outline: none; border-color: var(--fb-primary); box-shadow: 0 0 0 4px rgba(var(--fb-primary-rgb), 0.12); }
    .btn-send {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 46px;
      height: 46px;
      border: none;
      border-radius: 50%;
      background: var(--fb-primary);
      color: #fff;
      cursor: pointer;
    }
    .btn-send:hover:not(:disabled) { background: var(--fb-primary-strong); }
    .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Tableau de bord spécialiste */
    .patient-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .patient-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid var(--fb-border); border-radius: 16px; }
    .patient-header { display: flex; align-items: center; gap: 12px; }
    .patient-meta { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .patient-meta strong { font-size: 15px; }
    .patient-meta span { color: var(--fb-muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; }
    .alert-badge { display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 6px; border-radius: 13px; background: var(--fb-danger); color: #fff; font-size: 12.5px; font-weight: 700; }
    .patient-score { display: grid; grid-template-columns: 1fr auto; gap: 8px 12px; align-items: center; }
    .score-bar-wrap { height: 8px; border-radius: 8px; background: var(--fb-sunken); overflow: hidden; }
    .score-bar-fill { height: 100%; border-radius: 8px; background: var(--fb-text-mid); }
    .score-bar-fill[data-risk="green"] { background: var(--fb-success); }
    .score-bar-fill[data-risk="orange"] { background: var(--fb-accent); }
    .score-bar-fill[data-risk="red"] { background: var(--fb-danger); }
    .score-val { font-weight: 700; font-size: 14px; }
    .risk-badge { grid-column: 1 / -1; justify-self: start; padding: 3px 10px; border-radius: var(--fb-radius-pill); font-size: 12px; font-weight: 700; }
    .risk-badge[data-risk="green"] { background: rgba(var(--fb-success-rgb), 0.1); color: var(--fb-success-ink); }
    .risk-badge[data-risk="orange"] { background: var(--fb-accent-soft); color: var(--fb-warning-ink); }
    .risk-badge[data-risk="red"] { background: rgba(var(--fb-danger-rgb), 0.08); color: var(--fb-danger); }
    .no-score { margin: 0; color: var(--fb-muted); font-size: 13.5px; }

    @media (max-width: 1024px) {
      .tele-grid { grid-template-columns: minmax(0, 1fr); }
      .specialist-layout .right-col { grid-template-columns: minmax(0, 1fr); }
      .specialist-layout .right-col > :first-child { grid-row: auto; }
    }

    @media (max-width: 600px) {
      .filter-form, .f-row { grid-template-columns: minmax(0, 1fr); }
      .filter-form .btn-filter { justify-self: stretch; }
      .appt-action-row > button { flex: 1 1 100%; }
    }
  `],
})
export class TeleconsultationPage implements OnInit, OnDestroy {
  @ViewChild('thread') private threadRef?: ElementRef<HTMLElement>;

  readonly loadingAppointments = signal(false);
  readonly appointmentsError   = signal('');
  readonly loadingMessages     = signal(false);
  readonly messagesError       = signal('');
  readonly sendingMessage      = signal(false);
  readonly isPatient           = computed(() => this.userRole() === 'parent' || this.userRole() === 'adolescent');
  readonly isSpecialist        = computed(() => this.userRole() === 'specialist');
  private readonly currentUserId = computed(() => this.authService.currentUser()?._id ?? '');
  private messagePoll: ReturnType<typeof setInterval> | null = null;

  readonly specialists        = signal<TeleconsultationSpecialistProfile[]>([]);
  readonly appointments       = signal<TeleconsultationAppointment[]>([]);
  readonly availableSlots     = signal<Array<{ start: string; end: string; label: string }>>([]);
  readonly messages           = signal<TeleconsultationMessage[]>([]);
  readonly specialistPatients = signal<TeleconsultationPatientSummary[]>([]);
  readonly selectedSpecialist = signal<TeleconsultationSpecialistProfile | null>(null);
  readonly selectedAppointment = signal<TeleconsultationAppointment | null>(null);
  readonly userRole           = signal<string | null>(null);
  readonly errorMessage       = signal('');
  readonly successMessage     = signal('');
  readonly cancelling         = signal(false);
  readonly reschedulingId     = signal<string | null>(null);
  readonly rescheduleStart    = signal('');
  readonly rescheduleEnd      = signal('');
  readonly rescheduling       = signal(false);

  readonly directoryForm = this.fb.group({
    speciality: [''],
    language:   [''],
    city:       [''],
    maxTariff:  [''],
  });

  readonly bookingForm = this.fb.group({
    reason:            ['', [Validators.required]],
    consultationMode:  ['video' as 'video' | 'audio' | 'chat', [Validators.required]],
    meetingProvider:   ['jitsi' as 'jitsi' | 'daily', [Validators.required]],
    slotStart:         ['', [Validators.required]],
    slotEnd:           ['', [Validators.required]],
  });

  readonly messageForm = this.fb.group({
    content:     ['', [Validators.required]],
    messageType: ['pre' as 'pre' | 'post', [Validators.required]],
  });

  /** Rendez-vous à ouvrir dès qu'il est chargé (lien d'une notification : ?appointment=…). */
  private pendingAppointmentId: string | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly teleconsultationService: TeleconsultationService,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly notificationCenter: NotificationService,
    private readonly destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('appointment');
      if (!id) return;
      this.pendingAppointmentId = id;
      // Déjà sur la page (clic sur une notification) : la demande peut être nouvelle, on recharge.
      if (this.userRole()) this.loadAppointments();
    });

    // Message reçu en temps réel dans la conversation ouverte : on la relit aussitôt.
    this.notificationCenter.messageEvents$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (this.selectedAppointment()?._id === event.appointmentId) {
        this.loadMessages(event.appointmentId, true);
      }
    });

    // Nouvelle demande, annulation, déplacement, bilan partagé : la liste affichée est rafraîchie.
    this.notificationCenter.notificationEvents$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((notification) => {
      if (notification.type.startsWith('appointment-') || notification.type === 'bilan-shared') {
        this.loadAppointments();
      }
      // Message arrivé dans la conversation que l'utilisateur est en train de lire : déjà vu.
      if (
        notification.type === 'message-received'
        && !notification.read
        && notification.data?.['appointmentId'] === this.selectedAppointment()?._id
        && document.visibilityState === 'visible'
      ) {
        this.notificationCenter.markAsRead(notification);
      }
    });

    this.authService.me().subscribe({
      next: (response) => {
        this.userRole.set(response.user.role);
        const role = response.user.role;

        this.loadDirectory(); // GET /specialists n'est pas restreint par rôle, sûr pour tous.

        // GET /appointments/me ("mes rendez-vous" en tant que patient) est en revanche
        // restreint côté backend aux rôles parent/adolescent — l'appeler pour spécialiste ou
        // administrateur renvoyait systématiquement une erreur 403 ("Accès refusé pour ce
        // rôle"), affichée à l'écran même quand rien à l'affichage n'en dépendait pour ces
        // rôles (le spécialiste a son propre tableau de bord clinique, l'administrateur n'a
        // aucune section de rendez-vous du tout).
        if (role === 'parent' || role === 'adolescent') {
          this.loadAppointments();
        } else if (role === 'specialist') {
          this.loadSpecialistDashboard();
        }
      },
      error: () => this.errorMessage.set('Session invalide. Veuillez vous reconnecter.'),
    });
  }

  loadDirectory(): void {
    const raw = this.directoryForm.getRawValue();
    this.teleconsultationService.getSpecialists({
      speciality:  raw.speciality  || undefined,
      language:    raw.language    || undefined,
      city:        raw.city        || undefined,
      maxTariff:   raw.maxTariff   ? Number(raw.maxTariff) : undefined,
    }).subscribe({
      next:  (r) => this.specialists.set(r.specialists),
      error: (e) => this.errorMessage.set(e?.error?.message || 'Impossible de charger les spécialistes.'),
    });
  }

  selectSpecialist(specialist: TeleconsultationSpecialistProfile): void {
    this.selectedSpecialist.set(specialist);
    this.teleconsultationService.getSlots(specialist._id).subscribe({
      next:  (r) => this.availableSlots.set(r.slots),
      error: (e) => this.errorMessage.set(e?.error?.message || 'Impossible de charger les créneaux.'),
    });
  }

  pickSlot(slot: { start: string; end: string; label: string }): void {
    this.bookingForm.patchValue({
      slotStart: this.toDatetimeLocalValue(slot.start),
      slotEnd: this.toDatetimeLocalValue(slot.end),
    });
  }

  toDatetimeLocalValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  bookAppointment(): void {
    const specialist = this.selectedSpecialist();
    if (!specialist || this.bookingForm.invalid) return;
    const raw = this.bookingForm.getRawValue();
    this.teleconsultationService.bookAppointment({
      specialistProfileId: specialist._id,
      reason:           raw.reason           || '',
      consultationMode: raw.consultationMode || 'video',
      slotStart:        raw.slotStart ? new Date(raw.slotStart).toISOString() : '',
      slotEnd:          raw.slotEnd   ? new Date(raw.slotEnd).toISOString()   : '',
      meetingProvider:  raw.meetingProvider  || 'jitsi',
    }).subscribe({
      next: () => {
        this.bookingForm.reset({ consultationMode: 'video', meetingProvider: 'jitsi' });
        this.successMessage.set('Rendez-vous confirmé.');
        this.loadAppointments();
        // Le créneau qui vient d'être réservé ne doit plus apparaître comme disponible :
        // sans ce rafraîchissement, il restait affiché (et cliquable) jusqu'à ce que
        // l'utilisateur re-sélectionne manuellement le spécialiste.
        this.selectSpecialist(specialist);
      },
      error: (e) => this.errorMessage.set(e?.error?.message || 'Réservation impossible.'),
    });
  }

  ngOnDestroy(): void {
    this.stopMessagePolling();
  }

  /**
   * Recharge la liste selon le rôle : GET /appointments/me pour un patient, le tableau de
   * bord clinique pour un spécialiste. Auparavant, toutes les actions (annuler, déplacer,
   * actualiser…) appelaient /appointments/me, réservé aux patients : le spécialiste
   * recevait une erreur 403 après chacune d'elles.
   */
  loadAppointments(): void {
    if (this.isSpecialist()) {
      this.loadSpecialistDashboard();
      return;
    }

    this.loadingAppointments.set(true);
    this.appointmentsError.set('');
    this.teleconsultationService.myAppointments().subscribe({
      next: (r) => {
        this.loadingAppointments.set(false);
        this.setAppointments(r.appointments);
      },
      error: (e) => {
        this.loadingAppointments.set(false);
        this.appointmentsError.set(e?.error?.message || 'Impossible de charger vos rendez-vous.');
      },
    });
  }

  /** Met à jour la liste et garde le rendez-vous ouvert synchronisé (statut, bilan…). */
  private setAppointments(appointments: TeleconsultationAppointment[]): void {
    this.appointments.set(appointments);
    const selectedId = this.selectedAppointment()?._id;
    if (selectedId) {
      const fresh = appointments.find((item) => item._id === selectedId);
      if (fresh) {
        this.selectedAppointment.set(fresh);
      }
    }

    if (this.pendingAppointmentId) {
      const target = appointments.find((item) => item._id === this.pendingAppointmentId);
      this.pendingAppointmentId = null;
      if (target) {
        this.openAppointment(target);
      }
    }
  }

  openAppointment(appointment: TeleconsultationAppointment): void {
    const changed = this.selectedAppointment()?._id !== appointment._id;
    this.selectedAppointment.set(appointment);
    if (changed) {
      this.messages.set([]);
    }
    this.loadMessages(appointment._id);
    this.startMessagePolling(appointment._id);
  }

  loadMessages(appointmentId: string, silent = false): void {
    if (!silent) {
      this.loadingMessages.set(true);
      this.messagesError.set('');
    }
    this.teleconsultationService.getMessages(appointmentId).subscribe({
      next: (r) => {
        // Une réponse arrivée après un changement de conversation ne doit pas l'écraser.
        if (this.selectedAppointment()?._id !== appointmentId) return;
        this.loadingMessages.set(false);
        this.messagesError.set('');
        const hadNew = r.messages.length !== this.messages().length;
        this.messages.set(r.messages);
        if (hadNew) this.scrollThreadToBottom();
      },
      error: (e) => {
        this.loadingMessages.set(false);
        this.messagesError.set(e?.error?.message || 'Impossible de charger la conversation.');
      },
    });
  }

  sendMessage(appointmentId: string): void {
    const raw = this.messageForm.getRawValue();
    const content = (raw.content || '').trim();
    if (!content || this.sendingMessage()) return;

    this.sendingMessage.set(true);
    this.messagesError.set('');
    this.teleconsultationService.sendMessage(appointmentId, content, raw.messageType || 'pre').subscribe({
      next: () => {
        this.sendingMessage.set(false);
        this.messageForm.reset({ messageType: raw.messageType || 'pre' });
        // On relit la conversation depuis l'API (source de vérité) plutôt que d'ajouter le
        // message localement : aucun risque de doublon avec le rafraîchissement périodique.
        this.loadMessages(appointmentId, true);
      },
      error: (e) => {
        this.sendingMessage.set(false);
        this.messagesError.set(e?.error?.message || "Le message n'a pas pu être envoyé. Réessayez.");
      },
    });
  }

  private startMessagePolling(appointmentId: string): void {
    this.stopMessagePolling();
    this.messagePoll = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.sendingMessage()) {
        this.loadMessages(appointmentId, true);
      }
    }, MESSAGE_POLL_MS);
  }

  private stopMessagePolling(): void {
    if (this.messagePoll) {
      clearInterval(this.messagePoll);
      this.messagePoll = null;
    }
  }

  private scrollThreadToBottom(): void {
    setTimeout(() => {
      const el = this.threadRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  isMine(message: TeleconsultationMessage): boolean {
    return !!this.currentUserId() && message.sender === this.currentUserId();
  }

  trackMessage(_index: number, message: TeleconsultationMessage): string {
    return message._id;
  }

  shareBilan(appointmentId: string): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    this.teleconsultationService.shareBilan(appointmentId).subscribe({
      next: (response) => {
        this.successMessage.set(response.message || 'Bilan partagé avec succès.');
        this.selectedAppointment.set(response.appointment);
        this.loadAppointments();
      },
      error: (e) => this.errorMessage.set(e?.error?.message || 'Impossible de partager le bilan.'),
    });
  }

  cancelAppointment(appointmentId: string): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.cancelling.set(true);

    this.teleconsultationService.cancelAppointment(appointmentId).subscribe({
      next: (response) => {
        this.cancelling.set(false);
        this.successMessage.set(response.message || 'Rendez-vous annulé.');
        if (this.selectedAppointment()?._id === appointmentId) {
          this.selectedAppointment.set(response.appointment);
        }
        this.loadAppointments();
      },
      error: (e) => {
        this.cancelling.set(false);
        this.errorMessage.set(e?.error?.message || 'Impossible d’annuler ce rendez-vous.');
      },
    });
  }

  startReschedule(appointment: TeleconsultationAppointment): void {
    this.reschedulingId.set(appointment._id);
    this.rescheduleStart.set(this.toDatetimeLocalValue(appointment.slotStart));
    this.rescheduleEnd.set(this.toDatetimeLocalValue(appointment.slotEnd));
  }

  cancelReschedule(): void {
    this.reschedulingId.set(null);
    this.rescheduleStart.set('');
    this.rescheduleEnd.set('');
  }

  submitReschedule(appointmentId: string): void {
    const slotStart = this.rescheduleStart();
    const slotEnd = this.rescheduleEnd();
    if (!slotStart || !slotEnd) return;

    this.rescheduling.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.teleconsultationService.rescheduleAppointment(appointmentId, {
      slotStart: new Date(slotStart).toISOString(),
      slotEnd: new Date(slotEnd).toISOString(),
    }).subscribe({
      next: (response) => {
        this.rescheduling.set(false);
        this.successMessage.set(response.message || 'Rendez-vous déplacé.');
        if (this.selectedAppointment()?._id === appointmentId) {
          this.selectedAppointment.set(response.appointment);
        }
        this.cancelReschedule();
        this.loadAppointments();
      },
      error: (e) => {
        this.rescheduling.set(false);
        this.errorMessage.set(e?.error?.message || 'Impossible de déplacer ce rendez-vous.');
      },
    });
  }

  loadSpecialistDashboard(): void {
    this.loadingAppointments.set(true);
    this.appointmentsError.set('');
    this.teleconsultationService.specialistDashboard().subscribe({
      next:  (r) => {
        this.loadingAppointments.set(false);
        this.specialistPatients.set(r.patients);
        // Les demandes reçues alimentent le même bloc « rendez-vous / détail / messagerie »
        // que la vue patient (GET /appointments/me est réservé aux patients).
        this.setAppointments(r.appointments);
      },
      error: (e) => {
        this.loadingAppointments.set(false);
        this.appointmentsError.set(e?.error?.message || 'Impossible de charger vos demandes de téléconsultation.');
      },
    });
  }

  patientRoleLabel(role?: string): string {
    if (role === 'adolescent') return 'Adolescent';
    if (role === 'parent') return 'Parent';
    return 'Patient';
  }

  modeLabel(mode?: string): string {
    const map: Record<string, string> = { video: 'Vidéo', audio: 'Audio', chat: 'Messagerie' };
    return map[mode || ''] || '—';
  }

  formatTime(value: string): string {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Nom de la "contrepartie" affiché sur une carte de rendez-vous : le spécialiste pour un
   * patient (parent/adolescent), le patient pour un spécialiste consultant ses propres
   * rendez-vous — afficher son propre nom de profil spécialiste sur chaque carte n'aurait
   * aucun sens pour lui.
   */
  counterpartName(appt: TeleconsultationAppointment): string {
    if (this.userRole() === 'specialist') {
      return appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : 'Patient';
    }
    return appt.specialistProfile?.displayName || '—';
  }

  formatDate(value: string): string {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR');
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:     'En attente',
      confirmed:   'Confirmé',
      'in-progress': 'En cours',
      completed:   'Terminé',
      cancelled:   'Annulé',
    };
    return map[status] || status;
  }

  riskLabel(level: string): string {
    const map: Record<string, string> = {
      green:  'Équilibré',
      orange: 'Vigilance',
      red:    'Risque élevé',
    };
    return map[level] || level;
  }

  joinMeeting(appointment: TeleconsultationAppointment): void {
    window.open(appointment.meetingUrl, '_blank', 'noopener');
  }
}