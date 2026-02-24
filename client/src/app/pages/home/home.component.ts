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
  deckKeys = Object.keys(DECKS);
  decks = DECKS;

  constructor(private gameService: GameService, private router: Router) {}

  async createGame(): Promise<void> {
    this.isCreating.set(true);
    try {
      const gameId = await this.gameService.createGame(this.gameName(), this.selectedDeck());
      this.router.navigate([`/game/${gameId}`]);
    } finally {
      this.isCreating.set(false);
    }
  }
}
