import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { PokerCardComponent } from '../../components/poker-card/poker-card.component';
import { PlayerCardComponent } from '../../components/player-card/player-card.component';
import { VotingResultsComponent } from '../../components/voting-results/voting-results.component';
import { TimerComponent } from '../../components/timer/timer.component';
import { InviteDialogComponent } from '../../components/invite-dialog/invite-dialog.component';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrl: './game.component.css',
  imports: [
    FormsModule,
    PokerCardComponent,
    PlayerCardComponent,
    VotingResultsComponent,
    TimerComponent,
    InviteDialogComponent,
  ],
})
export class GameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected gameService = inject(GameService);

  gameId = '';
  playerName = signal(localStorage.getItem('pp_player_name') ?? '');
  showInviteDialog = signal(false);
  selectedCard = signal<string | null>(null);
  joined = signal(false);
  error = signal('');

  game = this.gameService.game;
  players = this.gameService.players;
  isFacilitator = this.gameService.isFacilitator;
  isRevealed = this.gameService.isRevealed;
  allVoted = this.gameService.allVoted;
  voteStats = this.gameService.voteStats;
  currentPlayer = this.gameService.currentPlayer;

  ngOnInit(): void {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  ngOnDestroy(): void {
    this.gameService.leaveGame();
  }

  async joinGame(): Promise<void> {
    const name = this.playerName();
    if (!name.trim()) return;

    localStorage.setItem('pp_player_name', name);

    try {
      await this.gameService.joinGame(this.gameId, name);
      this.joined.set(true);
      this.error.set('');
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to join game');
    }
  }

  selectCard(value: string): void {
    this.selectedCard.set(value);
    this.gameService.vote(value);
  }

  revealVotes(): void {
    this.gameService.reveal();
  }

  resetRound(): void {
    this.selectedCard.set(null);
    this.gameService.resetRound();
  }

  toggleSpectator(): void {
    this.gameService.toggleSpectator();
  }

  updateTopic(topic: string): void {
    this.gameService.setTopic(topic);
  }

  openInviteDialog(): void {
    this.showInviteDialog.set(true);
  }
}
