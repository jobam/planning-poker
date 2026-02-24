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
  players: Player[];
  currentTopic: string;
  status: GameStatus;
}

export interface VoteStats {
  average: number | null;
  median: number | null;
  distribution: { value: string; count: number }[];
  consensus: boolean;
}
