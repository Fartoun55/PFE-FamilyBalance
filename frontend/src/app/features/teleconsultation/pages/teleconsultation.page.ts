import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TeleconsultationService } from '../../../core/services/teleconsultation.service';
import {
  TeleconsultationAppointment,
  TeleconsultationMessage,
  TeleconsultationPatientSummary,
  TeleconsultationSpecialistProfile,
} from '../models/teleconsultation.models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-teleconsultation-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EmptyStateComponent],
  template: `
        <!-- Content -->
        <div class="content">

          <div class="page-topbar">
            <div class="breadcrumb">
              <span class="bc-root">FamilyBalance</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              <span class="bc-current">Téléconsultation</span>
            </div>
            <div class="top-right">
              <span class="role-chip" [class.specialist]="userRole() === 'specialist'">
                {{ userRole() === 'specialist' ? 'Spécialiste' : 'Patient' }}
              </span>
            </div>
          </div>

          <!-- Error -->
          <div class="alert error" *ngIf="errorMessage()">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
              <path d="M8 5v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="11" r=".8" fill="currentColor"/>
            </svg>
            {{ errorMessage() }}
          </div>
          <div class="alert success" *ngIf="successMessage()">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
              <path d="M5.5 8.2l1.7 1.7 3.3-3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ successMessage() }}
          </div>

          <!-- Page hero -->
          <div class="page-hero">
            <div class="hero-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                <rect x="2" y="4" width="20" height="14" rx="3" stroke="currentColor"/>
                <path d="M8 22h8M12 18v4" stroke="currentColor" stroke-linecap="round"/>
                <circle cx="12" cy="11" r="3" stroke="currentColor"/>
                <path d="M7 11c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <h1>Téléconsultation</h1>
              <p>Annuaire, rendez-vous, visioconférence sécurisée et messagerie chiffrée E2E</p>
            </div>
            <div class="hero-badges">
              <span class="h-badge"><span class="h-dot green"></span>WebRTC E2E</span>
              <span class="h-badge"><span class="h-dot blue"></span>Jitsi / Daily.co</span>
              <span class="h-badge"><span class="h-dot purple"></span>RGPD conforme</span>
            </div>
          </div>

          <!-- Two-column layout -->
          <div class="tele-grid" *ngIf="userRole() !== 'admin'">

            <!-- LEFT column -->
            <div class="left-col">

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
                          <option value="video">📹 Vidéo</option>
                          <option value="audio">🎙️ Audio</option>
                          <option value="chat">💬 Chat</option>
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
                    <h2>Mes rendez-vous</h2>
                    <p>{{ appointments().length }} consultation(s)</p>
                  </div>
                  <button class="btn-refresh" type="button" aria-label="Actualiser les rendez-vous" (click)="loadAppointments()">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M14 8A6 6 0 0 1 2 8M2 4v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
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
                        <strong>{{ counterpartName(appt) }}</strong>
                        <span>{{ formatDate(appt.slotStart) }}</span>
                      </div>
                      <span class="status-pill" [attr.data-status]="appt.status">
                        {{ statusLabel(appt.status) }}
                      </span>
                    </div>
                    <p class="appt-reason" *ngIf="appt.reason">{{ appt.reason }}</p>
                  </div>
                </div>
                <ng-template #noApptTpl>
                  <div class="empty-state small">
                    <p>Aucun rendez-vous planifié.</p>
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
                    <h2>Salle d'attente</h2>
                    <p>{{ counterpartName(appt) }}</p>
                  </div>
                </div>

                <div class="waiting-info">
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
                    <p>Chiffrement E2E · {{ messages().length }} message(s)</p>
                  </div>
                  <button class="btn-refresh" type="button" aria-label="Actualiser les messages" (click)="loadMessages(appt._id)">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M14 8A6 6 0 0 1 2 8M2 4v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>

                <!-- Messages thread -->
                <div class="msg-thread" *ngIf="messages().length > 0; else noMsgTpl">
                  <div class="msg-bubble" *ngFor="let msg of messages()" [attr.data-type]="msg.messageType">
                    <div class="msg-tag">
                      <span class="msg-type-pill" [class.pre]="msg.messageType === 'pre'">
                        {{ msg.messageType === 'pre' ? 'Pré-consultation' : 'Post-consultation' }}
                      </span>
                    </div>
                    <p>{{ msg.content }}</p>
                  </div>
                </div>
                <ng-template #noMsgTpl>
                  <div class="empty-state small"><p>Aucun message dans cette conversation.</p></div>
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
                      formControlName="content"
                      placeholder="Rédigez votre message sécurisé…"
                    ></textarea>
                    <button type="submit" class="btn-send" aria-label="Envoyer le message" [disabled]="messageForm.invalid">
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
              <div class="empty-state small"><p>Aucun patient référencé pour le moment.</p></div>
            </ng-template>
          </div>

        </div>
  `,
  styles: [`
    :host {
      display: block;
      --navy: var(--fb-primary-strong);
      --navy2: var(--fb-primary-strong);
      --blue: var(--fb-primary);
      --blue2: var(--fb-primary);
      --teal: var(--fb-accent);
      --green: var(--fb-success);
      --purple: #7e22ce;
      --amber: var(--fb-warning);
      --red: var(--fb-danger);
      --surface: var(--fb-bg);
      --card: var(--fb-surface-strong);
      --border: var(--fb-border);
      --text: var(--fb-text);
      --muted: var(--fb-muted);
      --faint: var(--fb-muted);
      --r: 20px;
      --r-sm: 12px;
    }

    /* ── Page topbar (breadcrumb + actions, sits inside the shared shell) ── */
    .page-topbar { padding: 0 0 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid rgba(148, 163, 184, 0.18); margin-bottom: 4px; }
    .breadcrumb { display: flex; align-items: center; gap: 8px; }
    .bc-root { font-size: 12px; color: var(--faint); letter-spacing: 0.08em; text-transform: uppercase; }
    .breadcrumb svg { stroke: var(--faint); }
    .bc-current { font-size: 14px; font-weight: 700; color: var(--text); }
    .top-right { display: flex; align-items: center; gap: 10px; }
    .role-chip { background: var(--fb-primary-soft); color: var(--fb-primary-strong); border: 1px solid rgba(var(--fb-primary-rgb),.25); border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700; }
    .role-chip.specialist { background: #fdf4ff; color: var(--purple); border-color: #e9d5ff; }
    .back-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid var(--fb-border-strong); color: var(--fb-text); border-radius: 12px; padding: 10px 16px; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: var(--fb-transition); }
    .back-btn:hover { border-color: var(--blue); color: var(--blue); }

    /* Content */
    .content { display: flex; flex-direction: column; gap: 16px; }

    /* Alert */
    .alert { display: flex; align-items: flex-start; gap: 9px; padding: 10px 14px; border-radius: var(--r-sm); font-size: 13px; }
    .alert.error { background: rgba(192,57,43,.07); border: 1px solid rgba(192,57,43,.22); color: var(--red); }
    .alert.success { background: rgba(21,127,69,.08); border: 1px solid rgba(21,127,69,.22); color: var(--green); }
    .alert svg { flex-shrink: 0; }

    /* Page hero */
    .page-hero { background: linear-gradient(135deg, var(--fb-primary-strong) 0%, var(--fb-primary) 100%); border-radius: 26px; padding: 28px 28px 24px; display: grid; grid-template-columns: auto 1fr auto; gap: 18px; align-items: center; box-shadow: 0 32px 70px rgba(var(--fb-primary-rgb), 0.22); }
    .hero-icon { width: 56px; height: 56px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.23); border-radius: 18px; display: grid; place-items: center; flex-shrink: 0; }
    .hero-icon svg { stroke: #fff; }
    .page-hero h1 { font-size: clamp(2rem, 3vw, 2.8rem); font-weight: 800; color: #fff; margin: 0 0 6px; letter-spacing: -0.03em; }
    .page-hero p { font-size: 0.98rem; color: rgba(255,255,255,.88); margin: 0; line-height: 1.7; max-width: 640px; }
    .hero-badges { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .h-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,.92); background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); border-radius: 999px; padding: 8px 12px; }
    .h-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .h-dot.green { background: #4ade80; }
    .h-dot.blue { background: #60a5fa; }
    .h-dot.purple { background: #c084fc; }

    /* Grid */
    .tele-grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; align-items: start; }
    .left-col, .right-col { display: flex; flex-direction: column; gap: 14px; }

    /* Section card */
    .section-card { background: var(--card); border: 1px solid rgba(148, 163, 184, 0.12); border-radius: var(--r); overflow: hidden; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06); transition: transform .18s, box-shadow .18s; }
    .section-card:hover { transform: translateY(-1px); box-shadow: 0 22px 46px rgba(15, 23, 42, 0.08); }
    .card-head { display: flex; align-items: center; gap: 14px; padding: 18px 18px 16px; border-bottom: 1px solid rgba(148, 163, 184, 0.12); }
    .card-head-icon { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; border: 1px solid rgba(148, 163, 184, 0.12); }
    .card-head-icon svg { width: 18px; height: 18px; fill: none; stroke-width: 1.5; }
    .card-head-icon.blue { background: var(--fb-primary-soft); } .card-head-icon.blue svg { stroke: var(--blue); }
    .card-head-icon.teal { background: #ecfeff; } .card-head-icon.teal svg { stroke: var(--teal); }
    .card-head-icon.green { background: #f0fdf4; } .card-head-icon.green svg { stroke: var(--green); }
    .card-head-icon.purple { background: #fdf4ff; } .card-head-icon.purple svg { stroke: var(--purple); }
    .card-head-icon.amber { background: #fffbeb; } .card-head-icon.amber svg { stroke: var(--amber); }
    .card-head-icon.navy { background: #eef2ff; } .card-head-icon.navy svg { stroke: var(--navy); }
    .card-head h2 { font-size: 14px; font-weight: 800; color: var(--text); margin: 0 0 2px; letter-spacing: -0.02em; }
    .card-head p { font-size: 11px; color: var(--muted); margin: 0; }
    .btn-refresh { margin-left: auto; width: 34px; height: 34px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.18); background: #fff; display: grid; place-items: center; cursor: pointer; transition: all .18s; color: var(--muted); }
    .btn-refresh:hover { border-color: var(--blue); color: var(--blue); }

    /* Filter form */
    .filter-form { padding: 14px 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-bottom: 1px solid var(--border); }
    .f-group { display: flex; flex-direction: column; gap: 4px; }
    .f-group label { font-size: 11px; font-weight: 600; color: var(--muted); }
    .f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .req { color: var(--red); font-size: 11px; }
    .f-wrap { display: flex; align-items: center; gap: 6px; border: 1.5px solid var(--border); border-radius: var(--r-sm); background: var(--surface); padding: 0 9px; height: 38px; transition: border .15s, box-shadow .15s, background .15s; }
    .f-wrap:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(var(--fb-primary-rgb),.1); background: #fff; }
    .f-wrap.invalid { border-color: var(--red); }
    .f-icon { width: 13px; height: 13px; stroke: var(--faint); fill: none; flex-shrink: 0; }
    .f-wrap:focus-within .f-icon { stroke: var(--blue); }
    .f-input { flex: 1; border: none; outline: none; background: transparent; font-size: 12px; color: var(--text); font-family: inherit; min-width: 0; }
    .f-input::placeholder { color: var(--faint); }
    .f-select { appearance: none; cursor: pointer; }
    .btn-filter { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 38px; border: none; border-radius: var(--r-sm); background: var(--navy); color: #fff; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; transition: background .15s; }
    .btn-filter:hover { background: var(--navy2); }

    /* Specialist list */
    .specialist-list { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto; }
    .specialist-card { display: flex; align-items: center; gap: 12px; padding: 14px 14px; border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 18px; cursor: pointer; transition: all .18s; background: #fff; box-shadow: 0 15px 30px rgba(15, 23, 42, 0.05); }
    .specialist-card:hover { border-color: var(--blue); background: var(--fb-primary-soft); transform: translateY(-1px); }
    .specialist-card.selected { border-color: var(--blue); background: var(--fb-primary-soft); }
    .spec-av { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--blue), var(--blue2)); color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
    .spec-av.large { width: 52px; height: 52px; font-size: 16px; }
    .spec-info { flex: 1; min-width: 0; }
    .spec-info strong { display: block; font-size: 13px; font-weight: 800; color: var(--text); font-family: inherit; margin-bottom: 3px; }
    .spec-info > span { font-size: 11px; color: var(--muted); display: block; margin-bottom: 5px; }
    .spec-meta { display: flex; gap: 5px; flex-wrap: wrap; }
    .meta-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: var(--muted); border: 1px solid var(--border); }
    .meta-pill.price { background: #fffbeb; color: var(--amber); border-color: #fde68a; }
    .meta-pill.available { background: #f0fdf4; color: var(--green); border-color: #bbf7d0; }
    .spec-rating { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--amber); flex-shrink: 0; }
    .spec-rating svg { fill: var(--amber); }

    /* Booking form */
    .spec-detail { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--border); }
    .spec-detail strong { display: block; font-size: 13px; font-weight: 700; color: var(--text); font-family: inherit; margin-bottom: 2px; }
    .spec-detail > div span { font-size: 11px; color: var(--muted); }
    .slots-section { padding: 12px 16px; border-bottom: 1px solid var(--border); }
    .slots-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 8px; }
    .slot-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .slot-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--fb-primary-soft); color: var(--blue); border: 1.5px solid rgba(var(--fb-primary-rgb),.25); border-radius: 999px; padding: 8px 12px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .18s; }
    .slot-btn:hover { transform: translateY(-1px); }
    .slot-btn.picked { background: var(--blue); color: #fff; border-color: var(--blue); }
    .slot-btn svg { fill: none; stroke: currentColor; stroke-width: 1.3; }
    .no-slots { font-size: 11px; color: var(--faint); margin: 0; }
    .booking-form { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 12px; }
    .btn-book { height: 44px; background: linear-gradient(135deg, #0f766e, #14b8a6); color: #fff; border: none; border-radius: 14px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .18s, transform .18s; box-shadow: 0 10px 30px rgba(20, 163, 146, 0.28); }
    .btn-book:hover:not(:disabled) { opacity: .94; transform: translateY(-1px); }
    .btn-book:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }

    /* Appointments */
    .appt-list { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto; }
    .appt-card { padding: 14px 14px; border: 1.5px solid rgba(148, 163, 184, 0.16); border-radius: 18px; cursor: pointer; transition: all .18s; background: #fff; box-shadow: 0 16px 32px rgba(15, 23, 42, 0.04); }
    .appt-card:hover { border-color: var(--purple); background: #faf5ff; transform: translateY(-1px); }
    .appt-card.active { border-color: var(--purple); background: #faf5ff; }
    .appt-top { display: flex; align-items: center; gap: 11px; }
    .appt-av { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--purple), #9333ea); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
    .appt-info { flex: 1; min-width: 0; }
    .appt-info strong { display: block; font-size: 13px; font-weight: 800; color: var(--text); font-family: inherit; }
    .appt-info span { font-size: 11px; color: var(--faint); }
    .status-pill { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: .05em; }
    .status-pill[data-status="pending"] { background: #fffbeb; color: var(--amber); }
    .status-pill[data-status="confirmed"] { background: var(--fb-primary-soft); color: var(--blue); }
    .status-pill[data-status="completed"] { background: #f0fdf4; color: var(--green); }
    .status-pill[data-status="cancelled"] { background: #fef2f2; color: var(--red); }
    .status-pill[data-status="in-progress"] { background: #fffbeb; color: var(--amber); }
    .appt-reason { font-size: 11px; color: var(--muted); margin: 8px 0 0; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.16); }

    /* Waiting room */
    .waiting-card .waiting-info { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--border); }
    .wi-row { display: flex; align-items: baseline; gap: 8px; }
    .wi-label { font-size: 10px; font-weight: 700; color: var(--faint); text-transform: uppercase; letter-spacing: .05em; min-width: 50px; flex-shrink: 0; }
    .wi-value { font-size: 11px; font-weight: 700; font-family: 'Courier New', monospace; background: var(--surface); padding: 2px 8px; border-radius: 6px; color: var(--navy); }
    .wi-msg { font-size: 12px; color: var(--muted); margin: 0; }
    .btn-join { margin: 14px 16px; height: 44px; background: linear-gradient(135deg, var(--green), #15803d); color: #fff; border: none; border-radius: var(--r-sm); font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .15s, transform .15s; box-shadow: 0 3px 12px rgba(22,163,74,.35); }
    .btn-join:hover { opacity: .92; transform: translateY(-1px); }
    .btn-join svg { stroke: #fff; fill: none; }
    .appt-action-row { margin: 0 16px 14px; display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-cancel { flex: 1; min-width: 140px; height: 38px; background: transparent; color: var(--red); border: 1.5px solid rgba(192,57,43,.3); border-radius: var(--r-sm); font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; transition: background .15s, opacity .15s; }
    .btn-cancel:hover:not(:disabled) { background: rgba(192,57,43,.07); }
    .btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
    .btn-move { flex: 1; min-width: 140px; height: 38px; background: transparent; color: var(--blue); border: 1.5px solid rgba(var(--fb-primary-rgb),.3); border-radius: var(--r-sm); font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; transition: background .15s, opacity .15s; }
    .btn-move:hover:not(:disabled) { background: var(--fb-primary-soft); }
    .reschedule-block { margin: 0 16px 16px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
    .reschedule-actions { display: flex; gap: 8px; align-items: center; }
    .rule-btn-cancel { border: 1px solid var(--border); background: #fff; color: var(--muted); border-radius: var(--r-sm); padding: 0 16px; height: 38px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .share-block { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 10px; }
    .btn-share { height: 40px; border: none; border-radius: var(--r-sm); background: linear-gradient(135deg, var(--fb-primary-strong), var(--fb-primary)); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity .15s, transform .15s; }
    .btn-share:disabled { opacity: .5; cursor: not-allowed; }
    .share-note { margin: 0; font-size: 11px; color: var(--faint); }

    /* Messaging */
    .msg-thread { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; max-height: 190px; overflow-y: auto; border-bottom: 1px solid rgba(148, 163, 184, 0.16); }
    .msg-bubble { padding: 14px 16px; border-radius: 20px; background: #f8fbff; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 14px 30px rgba(15, 23, 42, 0.04); }
    .msg-bubble[data-type="post"] { background: #fffbeb; border-color: #fde68a; }
    .msg-tag { margin-bottom: 8px; }
    .msg-type-pill { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
    .msg-type-pill.pre { background: var(--fb-primary-soft); color: var(--blue); }
    .msg-type-pill:not(.pre) { background: #fffbeb; color: var(--amber); }
    .msg-bubble p { margin: 0; font-size: 13px; color: var(--text); line-height: 1.7; }
    .msg-form { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
    .msg-type-row { display: flex; gap: 8px; }
    .type-chip { border: 1px solid rgba(148, 163, 184, 0.16); background: #fff; color: var(--muted); border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .18s; }
    .type-chip.active { background: var(--navy); color: #fff; border-color: var(--navy); }
    .msg-input-row { display: flex; gap: 10px; align-items: flex-end; }
    .msg-textarea { flex: 1; border: 1.5px solid rgba(148, 163, 184, 0.16); border-radius: 16px; padding: 12px 14px; font-size: 13px; font-family: inherit; color: var(--text); resize: none; outline: none; background: #fff; transition: border .18s, box-shadow .18s; }
    .msg-textarea:focus { border-color: var(--blue); box-shadow: 0 0 0 4px rgba(var(--fb-primary-rgb), 0.15); }
    .msg-textarea::placeholder { color: var(--faint); }
    .btn-send { width: 44px; height: 44px; border-radius: 16px; background: var(--navy); color: #fff; border: none; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; transition: background .18s; }
    .btn-send:hover:not(:disabled) { background: var(--navy2); }
    .btn-send:disabled { opacity: .45; cursor: not-allowed; }
    .btn-send svg { fill: rgba(255,255,255,.95); }

    /* Specialist dashboard */
    .patient-grid { padding: 14px 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
    .patient-card { border: 1px solid var(--border); border-radius: var(--fb-radius-md); padding: 12px; background: var(--surface); }
    .patient-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .patient-av { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--navy), var(--blue)); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .patient-meta strong { display: block; font-size: 12px; font-weight: 700; color: var(--text); font-family: inherit; }
    .patient-meta span { font-size: 10px; color: var(--faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; max-width: 140px; }
    .alert-badge { margin-left: auto; min-width: 20px; height: 20px; background: var(--red); color: #fff; border-radius: 50%; display: grid; place-items: center; font-size: 9px; font-weight: 700; flex-shrink: 0; }
    .patient-score { display: flex; align-items: center; gap: 8px; }
    .score-bar-wrap { flex: 1; height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .score-bar-fill { height: 100%; border-radius: 3px; background: var(--green); transition: width .5s; }
    .score-bar-fill[data-risk="red"] { background: var(--red); }
    .score-bar-fill[data-risk="orange"] { background: var(--amber); }
    .score-bar-fill[data-risk="green"] { background: var(--green); }
    .score-val { font-size: 11px; font-weight: 700; color: var(--text); flex-shrink: 0; }
    .risk-badge { font-size: 9px; font-weight: 700; padding: 1px 7px; border-radius: 20px; }
    .risk-badge[data-risk="green"] { background: #f0fdf4; color: var(--green); }
    .risk-badge[data-risk="orange"] { background: #fffbeb; color: var(--amber); }
    .risk-badge[data-risk="red"] { background: #fef2f2; color: var(--red); }
    .no-score { font-size: 11px; color: var(--faint); margin: 0; }

    /* Empty states */
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; text-align: center; }
    .empty-state svg { stroke: var(--faint); }
    .empty-state p { margin: 0; font-size: 12px; color: var(--faint); line-height: 1.5; }
    .empty-state.small { padding: 16px; }
    .empty-state.small p { font-size: 11px; }

    /* Responsive */
    @media (max-width: 1024px) {
      .tele-grid { grid-template-columns: 1fr; }
      .filter-form { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 768px) {
      .page-hero { flex-direction: column; align-items: flex-start; }
      .hero-badges { margin-left: 0; flex-direction: row; flex-wrap: wrap; }
      .filter-form { grid-template-columns: 1fr; }
      .f-row { grid-template-columns: 1fr; }
      .patient-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class TeleconsultationPage implements OnInit {
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

  constructor(
    private readonly fb: FormBuilder,
    private readonly teleconsultationService: TeleconsultationService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
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

  loadAppointments(): void {
    this.teleconsultationService.myAppointments().subscribe({
      next:  (r) => this.appointments.set(r.appointments),
      error: (e) => this.errorMessage.set(e?.error?.message || 'Impossible de charger vos rendez-vous.'),
    });
  }

  openAppointment(appointment: TeleconsultationAppointment): void {
    this.selectedAppointment.set(appointment);
    this.loadMessages(appointment._id);
  }
  

  loadMessages(appointmentId: string): void {
    this.teleconsultationService.getMessages(appointmentId).subscribe({
      next:  (r) => this.messages.set(r.messages),
      error: (e) => this.errorMessage.set(e?.error?.message || 'Impossible de charger la messagerie.'),
    });
  }

  sendMessage(appointmentId: string): void {
    if (this.messageForm.invalid) return;
    const raw = this.messageForm.getRawValue();
    this.teleconsultationService.sendMessage(appointmentId, raw.content || '', raw.messageType || 'pre').subscribe({
      next: () => {
        this.messageForm.reset({ messageType: 'pre' });
        this.loadMessages(appointmentId);
      },
      error: (e) => this.errorMessage.set(e?.error?.message || 'Envoi impossible.'),
    });
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
    this.teleconsultationService.specialistDashboard().subscribe({
      next:  (r) => {
        this.specialistPatients.set(r.patients);
        // "Mes rendez-vous" / salle d'attente / messagerie sont un seul et même bloc de
        // template partagé avec la vue patient (déjà testé et fonctionnel) : on l'alimente
        // ici avec les rendez-vous du spécialiste plutôt que via GET /appointments/me, qui
        // lui est interdit (vue "patient"). Sans ce branchement, ce bloc restait vide pour
        // un compte spécialiste malgré des données bien présentes côté backend.
        this.appointments.set(r.appointments);
      },
      error: (e) => this.errorMessage.set(e?.error?.message || 'Impossible de charger le tableau de bord clinique.'),
    });
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