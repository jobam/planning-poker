import { v4 as uuidv4 } from 'uuid';
import { DECKS, GameState, Player, toGameDTO, type GameStateDTO } from './models.js';

interface DisconnectedPlayer {
  player: Player;
  gameId: string;
  timer: ReturnType<typeof setTimeout>;
}

export class GameManager {
  private games = new Map<string, GameState>();
  private disconnectedPlayers = new Map<string, DisconnectedPlayer>();

  createGame(name: string, deckType: string, roles: string[] = []): GameState {
    const deck = DECKS[deckType] ?? DECKS['fibonacci'];
    const id = uuidv4().slice(0, 8);

    const game: GameState = {
      id,
      name: name || 'Planning Poker',
      deck,
      deckType,
      roles,
      votingRoles: [...roles],
      players: new Map(),
      currentTopic: '',
      status: 'voting',
      createdAt: new Date(),
    };

    this.games.set(id, game);
    return game;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  removeGame(gameId: string): void {
    this.games.delete(gameId);
  }

  getGameDTO(gameId: string): GameStateDTO | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    return toGameDTO(game);
  }

  addPlayer(gameId: string, playerName: string, socketId: string, customRole: string | null = null): Player | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    const isFirstPlayer = game.players.size === 0;
    const isObserver = customRole === 'observer';
    const player: Player = {
      id: socketId,
      name: playerName,
      role: isObserver ? 'spectator' : isFirstPlayer ? 'facilitator' : 'player',
      isAdmin: isFirstPlayer,
      isObserver,
      customRole: isObserver ? null : customRole,
      vote: null,
      hasVoted: false,
    };

    game.players.set(socketId, player);
    return player;
  }

  removePlayer(gameId: string, playerId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    const player = game.players.get(playerId);
    if (!player) return false;

    const wasAdmin = player.isAdmin;
    const wasFacilitator = player.role === 'facilitator';
    game.players.delete(playerId);

    if (game.players.size === 0) {
      this.games.delete(gameId);
      return true;
    }

    if (wasAdmin || wasFacilitator) {
      const nextPlayer = Array.from(game.players.values()).find((p) => p.role !== 'spectator');
      if (nextPlayer) {
        nextPlayer.role = 'facilitator';
        nextPlayer.isAdmin = true;
      } else {
        const anyPlayer = Array.from(game.players.values())[0];
        if (anyPlayer) {
          anyPlayer.isAdmin = true;
        }
      }
    }

    return true;
  }

  submitVote(gameId: string, playerId: string, value: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'voting') return false;

    const player = game.players.get(playerId);
    if (!player || player.role === 'spectator') return false;

    // If votingRoles filter is active, only allow players whose customRole is included
    if (game.votingRoles.length > 0 && player.customRole && !game.votingRoles.includes(player.customRole)) {
      return false;
    }

    if (!game.deck.values.includes(value)) return false;

    player.vote = value;
    player.hasVoted = true;
    return true;
  }

  revealVotes(gameId: string): GameStateDTO | undefined {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'voting') return undefined;

    game.status = 'revealed';
    return toGameDTO(game);
  }

  resetRound(gameId: string): GameStateDTO | undefined {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'revealed') return undefined;

    game.status = 'voting';
    game.votingRoles = [...game.roles];
    for (const player of game.players.values()) {
      player.vote = null;
      player.hasVoted = false;
    }
    return toGameDTO(game);
  }

  toggleSpectator(gameId: string, playerId: string): Player | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    const player = game.players.get(playerId);
    if (!player || player.isObserver) return undefined;

    if (player.role === 'spectator') {
      player.role = player.isAdmin ? 'facilitator' : 'player';
    } else {
      player.role = 'spectator';
      player.vote = null;
      player.hasVoted = false;
    }

    return player;
  }

  setVotingRoles(gameId: string, playerId: string, votingRoles: string[]): GameStateDTO | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    const player = game.players.get(playerId);
    if (!player || !player.isAdmin) return undefined;

    // Only allow roles that exist in the game's role list
    game.votingRoles = votingRoles.filter((r) => game.roles.includes(r));
    return toGameDTO(game);
  }

  setTopic(gameId: string, topic: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    game.currentTopic = topic;
    return true;
  }

  markDisconnected(gameId: string, playerId: string, onExpire: () => void, timeoutMs = 45_000): void {
    const game = this.games.get(gameId);
    if (!game) return;

    const player = game.players.get(playerId);
    if (!player) return;

    const key = `${gameId}:${player.name}`;

    // Store player data and remove from active game
    const timer = setTimeout(onExpire, timeoutMs);
    this.disconnectedPlayers.set(key, { player: { ...player }, gameId, timer });
    game.players.delete(playerId);
  }

  rejoinPlayer(gameId: string, playerName: string, newSocketId: string): Player | undefined {
    const key = `${gameId}:${playerName}`;
    const entry = this.disconnectedPlayers.get(key);
    if (!entry) return undefined;

    const game = this.games.get(gameId);
    if (!game) return undefined;

    clearTimeout(entry.timer);
    this.disconnectedPlayers.delete(key);

    const player: Player = { ...entry.player, id: newSocketId };
    game.players.set(newSocketId, player);
    return player;
  }

  cancelDisconnect(gameId: string, playerName: string): void {
    const key = `${gameId}:${playerName}`;
    const entry = this.disconnectedPlayers.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      this.disconnectedPlayers.delete(key);
    }
  }

  isDisconnected(gameId: string, playerName: string): boolean {
    return this.disconnectedPlayers.has(`${gameId}:${playerName}`);
  }
}
