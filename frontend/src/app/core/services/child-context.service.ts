import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'familybalance_selected_child';

interface StoredChildContext {
  id: string;
  name: string;
  birthDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class ChildContextService {
  readonly selectedChildId = signal<string | null>(null);
  readonly selectedChildName = signal<string | null>(null);
  /** ISO date string ; utilisée pour calculer l'âge de l'enfant (ex. filtrage des ressources éducatives). */
  readonly selectedChildBirthDate = signal<string | null>(null);

  constructor() {
    this.hydrateFromStorage();
  }

  setChild(id: string, name: string, birthDate: string | null = null): void {
    this.selectedChildId.set(id);
    this.selectedChildName.set(name);
    this.selectedChildBirthDate.set(birthDate);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name, birthDate } as StoredChildContext));
  }

  clear(): void {
    this.selectedChildId.set(null);
    this.selectedChildName.set(null);
    this.selectedChildBirthDate.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private hydrateFromStorage(): void {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredChildContext;
      if (parsed?.id) {
        this.selectedChildId.set(parsed.id);
        this.selectedChildName.set(parsed.name || null);
        this.selectedChildBirthDate.set(parsed.birthDate || null);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}
