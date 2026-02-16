export class MovementRangeSystem {
  private grid: any;
  private terrainTypes: Map<string, { movementCost: number; isPassable: boolean }> = new Map();
  private debug: boolean = false;

  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  setGrid(grid: any): void {
    this.grid = grid;
  }

  setTerrainTypes(terrainTypes: Map<string, { movementCost?: number; isPassable?: boolean }>): void {
    this.terrainTypes = new Map();
    terrainTypes.forEach((value, key) => {
      this.terrainTypes.set(key, {
        movementCost: value.movementCost ?? 1,
        isPassable: value.isPassable ?? true
      });
    });
  }

  getReachableTiles(startQ: number, startR: number, movementPoints: number): Map<string, { q: number; r: number; cost: number }> {
    const reachable = new Map<string, { q: number; r: number; cost: number }>();
    
    if (!this.grid) {
      if (this.debug) console.log('MovementRangeSystem: No grid set');
      return reachable;
    }

    const startTile = this.grid.getTile(startQ, startR);
    if (!startTile) {
      if (this.debug) console.log('MovementRangeSystem: Start tile not found');
      return reachable;
    }

    const getKey = (q: number, r: number): string => `${q},${r}`;
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];

    const costs = new Map<string, number>();
    const queue: { q: number; r: number; cost: number }[] = [];

    const startKey = getKey(startQ, startR);
    costs.set(startKey, 0);
    queue.push({ q: startQ, r: startR, cost: 0 });

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      const currentKey = getKey(current.q, current.r);

      if (current.cost > movementPoints) continue;

      if (!reachable.has(currentKey) || reachable.get(currentKey)!.cost > current.cost) {
        reachable.set(currentKey, { q: current.q, r: current.r, cost: current.cost });
      }

      for (const [dq, dr] of directions) {
        const nq = current.q + dq;
        const nr = current.r + dr;
        const neighborKey = getKey(nq, nr);

        const neighborTile = this.grid.getTile(nq, nr);
        if (!neighborTile) continue;

        const terrainDef = this.terrainTypes.get(neighborTile.terrain);
        if (!terrainDef || !terrainDef.isPassable) continue;

        const moveCost = terrainDef.movementCost || 1;
        const newCost = current.cost + moveCost;

        if (newCost <= movementPoints) {
          const existingCost = costs.get(neighborKey);
          if (existingCost === undefined || newCost < existingCost) {
            costs.set(neighborKey, newCost);
            queue.push({ q: nq, r: nr, cost: newCost });
          }
        }
      }
    }

    if (this.debug) {
      console.log(`Found ${reachable.size} reachable tiles within ${movementPoints} movement points`);
    }

    return reachable;
  }
}
