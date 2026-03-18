import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { DECKS } from '../../models/game.models';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [FormsModule],
})
export class HomeComponent {
  gameName = signal('');
  selectedDeck = signal('fibonacci');
  isCreating = signal(false);
  roleInput = signal('');
  roles = signal<string[]>([]);
  deckKeys = Object.keys(DECKS);
  decks = DECKS;

  constructor(private gameService: GameService, private router: Router) {}

  addRole(): void {
    const role = this.roleInput().trim();
    if (role && !this.roles().includes(role)) {
      this.roles.update((r) => [...r, role]);
      this.roleInput.set('');
    }
  }

  removeRole(role: string): void {
    this.roles.update((r) => r.filter((v) => v !== role));
  }

  async createGame(): Promise<void> {
    this.isCreating.set(true);
    try {
      const gameId = await this.gameService.createGame(this.gameName(), this.selectedDeck(), this.roles());
      this.router.navigate([`/game/${gameId}`]);
    } finally {
      this.isCreating.set(false);
    }
  }
}
