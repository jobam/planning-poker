import { Server, Socket } from 'socket.io';
import { GameManager } from './game-manager.js';
import { toGameDTO, toPlayerDTO } from './models.js';

const MAX_NAME_LENGTH = 50;
const MAX_GAME_NAME_LENGTH = 100;
const MAX_TOPIC_LENGTH = 200;

function sanitizeString(str: unknown, maxLen: number): string | null {
  if (typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  return trimmed;
}

export function registerSocketHandlers(io: Server, gameManager: GameManager): void {
  const playerGameMap = new Map<string, string>();

  io.on('connection', (socket: Socket) => {
    socket.on('create-game', (data: { name: string; deckType: string }, callback) => {
      const name = sanitizeString(data.name, MAX_GAME_NAME_LENGTH) ?? 'Planning Poker';
      const deckType = typeof data.deckType === 'string' ? data.deckType : 'fibonacci';
      const game = gameManager.createGame(name, deckType);
      callback({ gameId: game.id });
    });

    socket.on('join-game', (data: { gameId: string; playerName: string }, callback) => {
      const playerName = sanitizeString(data.playerName, MAX_NAME_LENGTH);
      if (!playerName) {
        callback({ error: 'Invalid player name' });
        return;
      }

      const game = gameManager.getGame(data.gameId);
      if (!game) {
        callback({ error: 'Game not found' });
        return;
      }

      const player = gameManager.addPlayer(data.gameId, playerName, socket.id);
      if (!player) {
        callback({ error: 'Could not join game' });
        return;
      }

      playerGameMap.set(socket.id, data.gameId);
      socket.join(data.gameId);

      const gameDTO = toGameDTO(game);
      callback({ game: gameDTO, playerId: socket.id });

      socket.to(data.gameId).emit('player-joined', {
        player: toPlayerDTO(player, game.status),
        game: gameDTO,
      });
    });

    socket.on('submit-vote', (data: { value: string }) => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;

      const success = gameManager.submitVote(gameId, socket.id, data.value);
      if (!success) return;

      const game = gameManager.getGame(gameId);
      if (!game) return;

      io.to(gameId).emit('vote-updated', {
        playerId: socket.id,
        game: toGameDTO(game),
      });
    });

    socket.on('reveal-votes', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;

      const gameDTO = gameManager.revealVotes(gameId);
      if (!gameDTO) return;

      io.to(gameId).emit('votes-revealed', { game: gameDTO });
    });

    socket.on('reset-round', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;

      const gameDTO = gameManager.resetRound(gameId);
      if (!gameDTO) return;

      io.to(gameId).emit('round-reset', { game: gameDTO });
    });

    socket.on('toggle-spectator', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;

      const player = gameManager.toggleSpectator(gameId, socket.id);
      if (!player) return;

      const game = gameManager.getGame(gameId);
      if (!game) return;

      io.to(gameId).emit('player-updated', {
        player: toPlayerDTO(player, game.status),
        game: toGameDTO(game),
      });
    });

    socket.on('set-topic', (data: { topic: string }) => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;

      const topic = sanitizeString(data.topic, MAX_TOPIC_LENGTH) ?? '';

      const success = gameManager.setTopic(gameId, topic);
      if (!success) return;

      io.to(gameId).emit('topic-changed', { topic });
    });

    socket.on('disconnect', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;

      gameManager.removePlayer(gameId, socket.id);
      playerGameMap.delete(socket.id);

      const game = gameManager.getGame(gameId);
      if (game) {
        io.to(gameId).emit('player-left', {
          playerId: socket.id,
          game: toGameDTO(game),
        });
      }
    });
  });
}
