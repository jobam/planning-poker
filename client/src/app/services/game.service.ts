import { Injectable, computed, signal, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from './socket.service';
import { GameState, Player, VoteStats } from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class GameService implements OnDestroy {
  private gameState = signal<GameState | null>(null);
  private currentPlayerId = signal<string | null>(null);
  private subscriptions: Subscription[] = [];
  private eventsListening = false;

  readonly game = this.gameState.asReadonly();
  readonly playerId = this.currentPlayerId.asReadonly();

  readonly players = computed(() => this.gameState()?.players ?? []);

  readonly currentPlayer = computed(() => {
    const id = this.currentPlayerId();
    return this.players().find((p) => p.id === id) ?? null;
  });

  readonly isFacilitator = computed(() => this.currentPlayer()?.role === 'facilitator');

  readonly isRevealed = computed(() => this.gameState()?.status === 'revealed');

  readonly allVoted = computed(() => {
    const players = this.players();
    const voters = players.filter((p) => p.role !== 'spectator');
    return voters.length > 0 && voters.every((p) => p.hasVoted);
  });

  readonly voteStats = computed<VoteStats | null>(() => {
    const game = this.gameState();
    if (!game || game.status !== 'revealed') return null;

    const votes = game.players
      .filter((p) => p.role !== 'spectator' && p.vote !== null && p.vote !== '?' && p.vote !== '☕')
      .map((p) => p.vote!);

    const numericVotes = votes
      .map((v) => (v === '½' ? 0.5 : parseFloat(v)))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    const distribution = game.players
      .filter((p) => p.role !== 'spectator' && p.hasVoted && p.vote !== null)
      .reduce(
        (acc, p) => {
          const value = p.vote!;
          const existing = acc.find((d) => d.value === value);
          if (existing) existing.count++;
          else acc.push({ value, count: 1 });
          return acc;
        },
        [] as { value: string; count: number }[]
      );

    const average =
      numericVotes.length > 0
        ? Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 10) / 10
        : null;

    const median =
      numericVotes.length > 0
        ? numericVotes.length % 2 === 0
          ? (numericVotes[numericVotes.length / 2 - 1] + numericVotes[numericVotes.length / 2]) / 2
          : numericVotes[Math.floor(numericVotes.length / 2)]
        : null;

    const uniqueVotes = new Set(votes);
    const consensus = uniqueVotes.size === 1 && votes.length > 1;

    return { average, median, distribution, consensus };
  });

  constructor(private socketService: SocketService) {}

  async createGame(name: string, deckType: string): Promise<string> {
    this.socketService.connect();
    const response = await this.socketService.emitWithAck<
      { name: string; deckType: string },
      { gameId?: string; error?: string }
    >('create-game', { name, deckType });

    if (response.error || !response.gameId) {
      throw new Error(response.error ?? 'Failed to create game');
    }

    return response.gameId;
  }

  async joinGame(gameId: string, playerName: string): Promise<void> {
    this.socketService.connect();
    this.listenToEvents();

    const response = await this.socketService.emitWithAck<
      { gameId: string; playerName: string },
      { game?: GameState; playerId?: string; error?: string }
    >('join-game', { gameId, playerName });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.game && response.playerId) {
      this.gameState.set(response.game);
      this.currentPlayerId.set(response.playerId);
    }
  }

  vote(value: string): void {
    this.socketService.emit('submit-vote', { value });
  }

  reveal(): void {
    this.socketService.emit('reveal-votes');
  }

  resetRound(): void {
    this.socketService.emit('reset-round');
  }

  toggleSpectator(): void {
    this.socketService.emit('toggle-spectator');
  }

  setTopic(topic: string): void {
    this.socketService.emit('set-topic', { topic });
  }

  leaveGame(): void {
    this.teardownListeners();
    this.socketService.disconnect();
    this.gameState.set(null);
    this.currentPlayerId.set(null);
  }

  ngOnDestroy(): void {
    this.teardownListeners();
  }

  private listenToEvents(): void {
    if (this.eventsListening) return;
    this.eventsListening = true;

    this.subscriptions.push(
      this.socketService.on<{ player: Player; game: GameState }>('player-joined').subscribe(({ game }) => {
        this.gameState.set(game);
      }),
      this.socketService.on<{ playerId: string; game: GameState }>('player-left').subscribe(({ game }) => {
        this.gameState.set(game);
      }),
      this.socketService.on<{ playerId: string; game: GameState }>('vote-updated').subscribe(({ game }) => {
        this.gameState.set(game);
      }),
      this.socketService.on<{ game: GameState }>('votes-revealed').subscribe(({ game }) => {
        this.gameState.set(game);
      }),
      this.socketService.on<{ game: GameState }>('round-reset').subscribe(({ game }) => {
        this.gameState.set(game);
      }),
      this.socketService.on<{ player: Player; game: GameState }>('player-updated').subscribe(({ game }) => {
        this.gameState.set(game);
      }),
      this.socketService.on<{ topic: string }>('topic-changed').subscribe(({ topic }) => {
        const current = this.gameState();
        if (current) {
          this.gameState.set({ ...current, currentTopic: topic });
        }
      })
    );
  }

  private teardownListeners(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
    this.eventsListening = false;
  }
}
