import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import type { RawLandmark } from "../lib/danceScoring";

export type CapturedFrame = { pose: RawLandmark[]; timestampMs: number };

export type PlayerType = "solo" | "group";
export type GameMode = "pure" | "crowd";

// Hard cap, not a soft suggestion — empirically verified to fit every screen
// that lists all players (players.tsx roster, leaderboard.tsx rows) within a
// 375x667 viewport (smallest realistic phone target) with zero scrolling,
// with real margin to spare. Raising this requires re-verifying both screens.
export const MAX_PLAYERS = 10;

export type Player = {
  name: string;
  type: PlayerType;
  score: number;
  cheerScore: number;
};

export type Country = {
  name: string;
  flag: string;
  dance: string;
};

type GameState = {
  players: Player[];
  mode: GameMode | null;
  roundCount: number;
  currentRoundIndex: number;
  currentPlayerIndex: number;
  currentCountry: Country | null;
  usedCountries: string[];
  // Set once, right when a recording ends (not per-frame -- see recording.tsx)
  // and read once by reveal.tsx for the immediately following screen. Not
  // meant to persist across rounds.
  capturedFrames: CapturedFrame[];
};

type GameContextValue = GameState & {
  setPlayers: (players: Player[]) => void;
  addPlayer: (name: string, type: PlayerType) => void;
  setMode: (mode: GameMode) => void;
  setRoundCount: (count: number) => void;
  setCurrentRoundIndex: (index: number) => void;
  nextRound: () => void;
  setCurrentPlayerIndex: (index: number) => void;
  nextPlayerTurn: () => void;
  currentPlayer: Player | null;
  setCurrentCountry: (country: Country | null) => void;
  markCountryUsed: (name: string) => void;
  setCapturedFrames: (frames: CapturedFrame[]) => void;
  addScore: (playerIndex: number, points: number) => void;
  addCheerScore: (playerIndex: number, points: number) => void;
  resetGame: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

const initialState: GameState = {
  players: [],
  mode: null,
  roundCount: 0,
  currentRoundIndex: 0,
  currentPlayerIndex: 0,
  currentCountry: null,
  usedCountries: [],
  capturedFrames: [],
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>(initialState.players);
  const [mode, setMode] = useState<GameMode | null>(initialState.mode);
  const [roundCount, setRoundCount] = useState<number>(initialState.roundCount);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(initialState.currentRoundIndex);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(initialState.currentPlayerIndex);
  const [currentCountry, setCurrentCountry] = useState<Country | null>(initialState.currentCountry);
  const [usedCountries, setUsedCountries] = useState<string[]>(initialState.usedCountries);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>(initialState.capturedFrames);

  const addPlayer = (name: string, type: PlayerType) => {
    setPlayers(prev => (prev.length >= MAX_PLAYERS ? prev : [...prev, { name, type, score: 0, cheerScore: 0 }]));
  };

  const nextRound = () => {
    setCurrentRoundIndex(prev => prev + 1);
  };

  const nextPlayerTurn = () => {
    setCurrentPlayerIndex(prev => (players.length === 0 ? 0 : (prev + 1) % players.length));
  };

  const addScore = (playerIndex: number, points: number) => {
    setPlayers(prev =>
      prev.map((p, i) => (i === playerIndex ? { ...p, score: p.score + points } : p))
    );
  };

  const addCheerScore = (playerIndex: number, points: number) => {
    setPlayers(prev =>
      prev.map((p, i) => (i === playerIndex ? { ...p, cheerScore: p.cheerScore + points } : p))
    );
  };

  const markCountryUsed = (name: string) => {
    setUsedCountries(prev => (prev.includes(name) ? prev : [...prev, name]));
  };

  const resetGame = () => {
    setPlayers(initialState.players);
    setMode(initialState.mode);
    setRoundCount(initialState.roundCount);
    setCurrentRoundIndex(initialState.currentRoundIndex);
    setCurrentPlayerIndex(initialState.currentPlayerIndex);
    setCurrentCountry(initialState.currentCountry);
    setUsedCountries(initialState.usedCountries);
    setCapturedFrames(initialState.capturedFrames);
  };

  const currentPlayer = players[currentPlayerIndex] ?? null;

  const value = useMemo<GameContextValue>(
    () => ({
      players,
      mode,
      roundCount,
      currentRoundIndex,
      currentPlayerIndex,
      currentCountry,
      usedCountries,
      capturedFrames,
      currentPlayer,
      setPlayers,
      addPlayer,
      setMode,
      setRoundCount,
      setCurrentRoundIndex,
      nextRound,
      setCurrentPlayerIndex,
      nextPlayerTurn,
      setCurrentCountry,
      markCountryUsed,
      setCapturedFrames,
      addScore,
      addCheerScore,
      resetGame,
    }),
    [players, mode, roundCount, currentRoundIndex, currentPlayerIndex, currentCountry, usedCountries, capturedFrames, currentPlayer]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
