import { Server, Socket } from 'socket.io';
import { GameManager } from './game-manager.js';
import { toGameDTO, toPlayerDTO } from './models.js';

const MAX_NAME_LENGTH = 50;
const MAX_GAME_NAME_LENGTH = 100;
const MAX_TOPIC_LENGTH = 200;
const MAX_ROLE_LENGTH = 30;
const MAX_ROLES = 20;

function sanitizeString(str: unknown, maxLen: number): string | null {
  if (typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  return trimmed;
}

export function registerSocketHandlers(io: Server, gameManager: GameManager): void {
  const playerGameMap = new Map<string, string>();

  io.on('connection', (socket: Socket) => {
    socket.on('create-game', (data: { name: string; deckType: string; roles?: string[] }, callback) => {
      const name = sanitizeString(data.name, MAX_GAME_NAME_LENGTH) ?? 'Planning Poker';
      const deckType = typeof data.deckType === 'string' ? data.deckType : 'fibonacci';
      const roles = Array.isArray(data.roles)
        ? data.roles
            .map((r) => sanitizeString(r, MAX_ROLE_LENGTH))
            .filter((r): r is string => r !== null)
            .slice(0, MAX_ROLES)
        : [];
      const game = gameManager.createGame(name, deckType, roles);
      callback({ gameId: game.id });
    });

    socket.on('get-game-info', (data: { gameId: string }, callback) => {
      const game = gameManager.getGame(data.gameId);
      if (!game) {
        callback({ error: 'Game not found' });
        return;
      }
      callback({ roles: game.roles, name: game.name });
    });

    socket.on('join-game', (data: { gameId: string; playerName: string; customRole?: string }, callback) => {
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

      const customRole = data.customRole ? sanitizeString(data.customRole, MAX_ROLE_LENGTH) : null;
      const player = gameManager.addPlayer(data.gameId, playerName, socket.id, customRole);
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

    socket.on('rejoin-game', (data: { gameId: string; playerName: string; customRole?: string }, callback) => {
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

      // Try to reclaim disconnected slot
      const rejoined = gameManager.rejoinPlayer(data.gameId, playerName, socket.id);
      if (rejoined) {
        playerGameMap.set(socket.id, data.gameId);
        socket.join(data.gameId);

        const gameDTO = toGameDTO(game);
        callback({ game: gameDTO, playerId: socket.id });

        socket.to(data.gameId).emit('player-joined', {
          player: toPlayerDTO(rejoined, game.status),
          game: gameDTO,
        });
        return;
      }

      // No disconnected slot found — do a normal join
      const customRole = data.customRole ? sanitizeString(data.customRole, MAX_ROLE_LENGTH) : null;
      const player = gameManager.addPlayer(data.gameId, playerName, socket.id, customRole);
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

    socket.on('disconnect', () => {
      const gameId = playerGameMap.get(socket.id);
      if (!gameId) return;

      const game = gameManager.getGame(gameId);
      const player = game?.players.get(socket.id);
      const playerName = player?.name;

      // Mark as disconnected with a grace period instead of removing immediately
      gameManager.markDisconnected(gameId, socket.id, () => {
        // Timer expired — player didn't reconnect, finalize removal
        if (playerName) {
          gameManager.cancelDisconnect(gameId, playerName);
        }

        // If no active players remain, clean up the game
        const currentGame = gameManager.getGame(gameId);
        if (currentGame && currentGame.players.size === 0) {
          gameManager.removeGame(gameId);
        }
      });

      playerGameMap.delete(socket.id);

      // Notify other players that this player is temporarily disconnected
      if (game) {
        io.to(gameId).emit('player-left', {
          playerId: socket.id,
          game: toGameDTO(game),
        });
      }
    });
  });
}
