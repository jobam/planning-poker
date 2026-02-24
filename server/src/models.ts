export interface CardDeck {
  name: string;
  values: string[];
}

export const DECKS: Record<string, CardDeck> = {
  fibonacci: {
    name: 'Fibonacci',
    values: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  },
  modifiedFibonacci: {
    name: 'Modified Fibonacci',
    values: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  },
  tshirt: {
    name: 'T-Shirt Sizes',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  },
  powersOfTwo: {
    name: 'Powers of Two',
    values: ['0', '1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  },
};

export type PlayerRole = 'facilitator' | 'player' | 'spectator';
export type GameStatus = 'voting' | 'revealed';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  vote: string | null;
  hasVoted: boolean;
}

export interface GameState {
  id: string;
  name: string;
  deck: CardDeck;
  deckType: string;
  players: Map<string, Player>;
  currentTopic: string;
  status: GameStatus;
  createdAt: Date;
}

export interface GameStateDTO {
  id: string;
  name: string;
  deck: CardDeck;
  deckType: string;
  players: PlayerDTO[];
  currentTopic: string;
  status: GameStatus;
}

export interface PlayerDTO {
  id: string;
  name: string;
  role: PlayerRole;
  vote: string | null;
  hasVoted: boolean;
}

export function toGameDTO(game: GameState): GameStateDTO {
  const players = Array.from(game.players.values()).map((p) => toPlayerDTO(p, game.status));
  return {
    id: game.id,
    name: game.name,
    deck: game.deck,
    deckType: game.deckType,
    players,
    currentTopic: game.currentTopic,
    status: game.status,
  };
}

export function toPlayerDTO(player: Player, gameStatus: GameStatus): PlayerDTO {
  return {
    id: player.id,
    name: player.name,
    role: player.role,
    vote: gameStatus === 'revealed' ? player.vote : null,
    hasVoted: player.hasVoted,
  };
}
