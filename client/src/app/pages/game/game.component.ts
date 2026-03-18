import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket.service';
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
  private socketService = inject(SocketService);
  protected gameService = inject(GameService);

  private reconnectSub: Subscription | null = null;

  gameId = '';
  playerName = signal(localStorage.getItem('pp_player_name') ?? '');
  selectedRole = signal<string | null>(null);
  availableRoles = signal<string[]>([]);
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

  async ngOnInit(): Promise<void> {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';

    try {
      const info = await this.gameService.getGameInfo(this.gameId);
      this.availableRoles.set(info.roles);
    } catch {
      // Game may not exist yet, will show error on join
    }

    // Auto-rejoin from session if available
    const session = this.loadSession();
    if (session && session.gameId === this.gameId) {
      this.playerName.set(session.playerName);
      this.selectedRole.set(session.customRole);
      await this.joinGame();
    }

    // On socket reconnection (e.g. phone lock/unlock), rejoin automatically
    this.reconnectSub = this.socketService.onReconnect().subscribe(() => {
      const s = this.loadSession();
      if (s && s.gameId === this.gameId && this.joined()) {
        this.gameService
          .rejoinGame(this.gameId, s.playerName, s.customRole)
          .catch(() => {
            // Rejoin failed — session may have expired, force re-join
            this.joined.set(false);
            this.clearSession();
          });
      }
    });
  }

  ngOnDestroy(): void {
    this.reconnectSub?.unsubscribe();
    this.gameService.leaveGame();
  }

  async joinGame(): Promise<void> {
    const name = this.playerName();
    if (!name.trim()) return;

    try {
      await this.gameService.joinGame(this.gameId, name, this.selectedRole());
      this.joined.set(true);
      this.error.set('');
      this.saveSession();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to join game');
      this.clearSession();
    }
  }

  selectCard(value: string): void {
    if (this.currentPlayer()?.role === 'spectator') return;
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

  private saveSession(): void {
    const data = {
      gameId: this.gameId,
      playerName: this.playerName(),
      customRole: this.selectedRole(),
    };
    sessionStorage.setItem('pp_session', JSON.stringify(data));
    localStorage.setItem('pp_player_name', this.playerName());
  }

  private loadSession(): { gameId: string; playerName: string; customRole: string | null } | null {
    try {
      const raw = sessionStorage.getItem('pp_session');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.gameId && data.playerName) return data;
      return null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    sessionStorage.removeItem('pp_session');
  }
}
