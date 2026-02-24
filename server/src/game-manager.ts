import { v4 as uuidv4 } from 'uuid';
import { DECKS, GameState, Player, toGameDTO, type GameStateDTO } from './models.js';

export class GameManager {
  private games = new Map<string, GameState>();

  createGame(name: string, deckType: string): GameState {
    const deck = DECKS[deckType] ?? DECKS['fibonacci'];
    const id = uuidv4().slice(0, 8);

    const game: GameState = {
      id,
      name: name || 'Planning Poker',
      deck,
      deckType,
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

  getGameDTO(gameId: string): GameStateDTO | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    return toGameDTO(game);
  }

  addPlayer(gameId: string, playerName: string, socketId: string): Player | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    const isFirstPlayer = game.players.size === 0;
    const player: Player = {
      id: socketId,
      name: playerName,
      role: isFirstPlayer ? 'facilitator' : 'player',
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

    const wasFacilitator = player.role === 'facilitator';
    game.players.delete(playerId);

    if (game.players.size === 0) {
      this.games.delete(gameId);
      return true;
    }

    if (wasFacilitator) {
      const nextPlayer = Array.from(game.players.values()).find((p) => p.role !== 'spectator');
      if (nextPlayer) {
        nextPlayer.role = 'facilitator';
      } else {
        const anyPlayer = Array.from(game.players.values())[0];
        if (anyPlayer) anyPlayer.role = 'facilitator';
      }
    }

    return true;
  }

  submitVote(gameId: string, playerId: string, value: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'voting') return false;

    const player = game.players.get(playerId);
    if (!player || player.role === 'spectator') return false;

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
    if (!player) return undefined;

    if (player.role === 'spectator') {
      player.role = 'player';
    } else if (player.role !== 'facilitator') {
      player.role = 'spectator';
      player.vote = null;
      player.hasVoted = false;
    }

    return player;
  }

  setTopic(gameId: string, topic: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    game.currentTopic = topic;
    return true;
  }
}
