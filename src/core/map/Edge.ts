export type EdgeType = 'river' | 'barrier' | 'road' | 'wall';

export interface EdgeData {
  tileA: { q: number; r: number };
  tileB: { q: number; r: number };
  type: EdgeType;
  properties?: Record<string, unknown>;
}

export interface EdgeConfig {
  color: { r: number; g: number; b: number };
  width: number;
  alpha: number;
  layers: number;
}

export const EDGE_CONFIGS: Record<EdgeType, EdgeConfig> = {
  river: {
    color: { r: 0.2, g: 0.5, b: 0.8 },
    width: 0.15,
    alpha: 0.8,
    layers: 3
  },
  barrier: {
    color: { r: 0.8, g: 0.3, b: 0.2 },
    width: 0.12,
    alpha: 0.9,
    layers: 4
  },
  road: {
    color: { r: 0.6, g: 0.5, b: 0.3 },
    width: 0.18,
    alpha: 0.7,
    layers: 2
  },
  wall: {
    color: { r: 0.5, g: 0.5, b: 0.5 },
    width: 0.1,
    alpha: 1.0,
    layers: 5
  }
};

export function createEdgeKey(tileA: { q: number; r: number }, tileB: { q: number; r: number }): string {
  const keys = [
    `${tileA.q},${tileA.r}`,
    `${tileB.q},${tileB.r}`
  ].sort();
  return `${keys[0]}|${keys[1]}`;
}

export function edgeTypeFromString(type: string): EdgeType {
  if (['river', 'barrier', 'road', 'wall'].includes(type)) {
    return type as EdgeType;
  }
  return 'river';
}
