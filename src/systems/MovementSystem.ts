import { GameSystem } from './GameSystem';
import { Unit } from '../core/Unit';
import { HexGrid } from '../core/HexGrid';
import type { GameEngine } from '../engine/GameEngine';

export class MovementSystem extends GameSystem {
  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
  }

  update(_dt: number): void {
  }

  dispose(): void {
  }

  moveUnit(unit: Unit, targetQ: number, targetR: number, grid: HexGrid): boolean {
    if (!unit.hasMoves()) {
      return false;
    }

    const currentTile = grid.getTile(unit.q, unit.r);
    const targetTile = grid.getTile(targetQ, targetR);

    if (!currentTile || !targetTile) {
      return false;
    }

    const distance = grid.getDistance(currentTile, targetTile);
    if (distance > unit.moves) {
      return false;
    }

    unit.setPosition(targetQ, targetR);
    unit.useMoves(distance);

    return true;
  }

  getReachableTiles(unit: Unit, grid: HexGrid): Array<{ q: number; r: number }> {
    const reachable: Array<{ q: number; r: number }> = [];
    const startTile = grid.getTile(unit.q, unit.r);

    if (!startTile) {
      return reachable;
    }

    const visited = new Set<string>();
    const queue: Array<{ q: number; r: number; cost: number }> = [
      { q: unit.q, r: unit.r, cost: 0 }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.q},${current.r}`;

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      if (current.cost > 0 && current.cost <= unit.moves) {
        reachable.push({ q: current.q, r: current.r });
      }

      if (current.cost >= unit.moves) {
        continue;
      }

      const neighbors = grid.getNeighbors(current.q, current.r);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        if (!visited.has(neighborKey)) {
          queue.push({
            q: neighbor.q,
            r: neighbor.r,
            cost: current.cost + 1
          });
        }
      }
    }

    return reachable;
  }
}
