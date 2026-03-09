/**
 * PathfindingSystem - 寻路算法模块
 * 
 * 使用 Dijkstra 算法计算单位移动路径
 */

import { HexGrid } from '../../map';
import type { UnitInstance } from '../../map/SceneData';

export type UnitType = 'land' | 'sea' | 'air';

export interface MovementNode {
  q: number;
  r: number;
  cost: number;
}

export interface PathfindingResult {
  path: MovementNode[];
  totalCost: number;
}

export class PathfindingSystem {
  private grid: HexGrid | null = null;

  setGrid(grid: HexGrid): void {
    this.grid = grid;
  }

  getGrid(): HexGrid | null {
    return this.grid;
  }

  findPath(
    unit: UnitInstance,
    unitType: UnitType,
    maxMoves: number,
    getTerrainCost: (terrain: string) => number,
    canEnter: (terrain: string, unitType: UnitType) => boolean,
    getOccupant: (q: number, r: number) => UnitInstance | undefined,
    targetQ: number,
    targetR: number
  ): MovementNode[] | null {
    if (!this.grid) return null;

    const targetKey = `${targetQ},${targetR}`;
    const startKey = `${unit.q},${unit.r}`;

    if (startKey === targetKey) return [];

    const dist: Map<string, number> = new Map();
    const prev: Map<string, { q: number; r: number }> = new Map();
    const visited = new Set<string>();

    dist.set(startKey, 0);
    const queue: MovementNode[] = [{ q: unit.q, r: unit.r, cost: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      const currentKey = `${current.q},${current.r}`;

      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      if (current.cost > maxMoves) continue;
      if (currentKey === targetKey) break;

      const neighbors = this.grid.getNeighbors(current.q, current.r);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        if (visited.has(neighborKey)) continue;

        const occ = getOccupant(neighbor.q, neighbor.r);
        if (occ && occ.id !== unit.id) continue;

        if (!canEnter(neighbor.terrain, unitType)) continue;

        const moveCost = getTerrainCost(neighbor.terrain);
        const newCost = current.cost + moveCost;

        if (newCost > maxMoves) continue;

        const existingDist = dist.get(neighborKey);
        if (existingDist === undefined || newCost < existingDist) {
          dist.set(neighborKey, newCost);
          prev.set(neighborKey, { q: current.q, r: current.r });
          queue.push({ q: neighbor.q, r: neighbor.r, cost: newCost });
        }
      }
    }

    if (!dist.has(targetKey)) return null;

    const path: MovementNode[] = [];
    let current: { q: number; r: number } | undefined = { q: targetQ, r: targetR };

    while (current) {
      const key = `${current.q},${current.r}`;
      const cost = dist.get(key) || 0;
      path.unshift({ q: current.q, r: current.r, cost });

      if (key === startKey) break;
      current = prev.get(key);
    }

    return path;
  }

  computeReachableTiles(
    unit: UnitInstance,
    unitType: UnitType,
    maxMoves: number,
    getTerrainCost: (terrain: string) => number,
    canEnter: (terrain: string, unitType: UnitType) => boolean,
    getOccupant: (q: number, r: number) => UnitInstance | undefined
  ): Set<string> {
    if (!this.grid || maxMoves <= 0) {
      return new Set();
    }

    const reachable = new Set<string>();
    const dist: Map<string, number> = new Map();
    const startKey = `${unit.q},${unit.r}`;
    dist.set(startKey, 0);

    const visited = new Set<string>();
    const queue: MovementNode[] = [{ q: unit.q, r: unit.r, cost: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      const currentKey = `${current.q},${current.r}`;

      if (visited.has(currentKey)) continue;
      visited.add(currentKey);

      if (current.cost > maxMoves) continue;
      if (current.cost > 0) {
        reachable.add(currentKey);
      }

      const neighbors = this.grid.getNeighbors(current.q, current.r);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        if (visited.has(neighborKey)) continue;

        const occ = getOccupant(neighbor.q, neighbor.r);
        if (occ && occ.id !== unit.id) continue;

        if (!canEnter(neighbor.terrain, unitType)) continue;

        const moveCost = getTerrainCost(neighbor.terrain);
        const newCost = current.cost + moveCost;

        const existingDist = dist.get(neighborKey);
        if (existingDist === undefined || newCost < existingDist) {
          dist.set(neighborKey, newCost);
          if (newCost <= maxMoves) {
            queue.push({ q: neighbor.q, r: neighbor.r, cost: newCost });
          }
        }
      }
    }

    return reachable;
  }
}
