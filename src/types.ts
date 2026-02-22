export type GameMode = 'classic' | 'time';

export interface Position {
  row: number;
  col: number;
}

export interface BlockData {
  id: string;
  value: number;
}

export type GridData = (BlockData | null)[][];
