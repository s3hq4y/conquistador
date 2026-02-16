export class PathfindingSystem {
  private grid: any;
  private debug: boolean = false;

  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  setGrid(grid: any): void {
    this.grid = grid;
  }

  findPathWithParentTracking(startQ: number, startR: number, endQ: number, endR: number): { q: number; r: number }[] | null {
    if (!this.grid) {
      if (this.debug) console.log('PathfindingSystem: No grid set');
      return null;
    }

    const startTile = this.grid.getTile(startQ, startR);
    const endTile = this.grid.getTile(endQ, endR);

    if (this.debug) console.log('Start tile:', startTile, 'End tile:', endTile);

    if (!startTile || !endTile) {
      if (this.debug) console.log('Start or end tile not found');
      return null;
    }

    if (startQ === endQ && startR === endR) {
      return [{ q: startQ, r: startR }];
    }

    const getKey = (q: number, r: number): string => `${q},${r}`;

    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, string>();
    const openSet = new Set<string>();

    const startKey = getKey(startQ, startR);
    const endKey = getKey(endQ, endR);

    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(startQ, startR, endQ, endR));
    openSet.add(startKey);

    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];

    let iterations = 0;
    const maxIterations = 1000;

    while (openSet.size > 0) {
      iterations++;
      if (iterations > maxIterations) {
        if (this.debug) console.log('Max iterations reached');
        break;
      }

      let current: string | null = null;
      let minF = Infinity;

      for (const key of openSet) {
        const f = fScore.get(key) ?? Infinity;
        if (f < minF) {
          minF = f;
          current = key;
        }
      }

      if (!current) break;

      if (current === endKey) {
        if (this.debug) console.log('Path found!');
        return this.reconstructPath(cameFrom, current);
      }

      openSet.delete(current);

      const [cq, cr] = current.split(',').map(Number);
      if (this.debug) console.log('Processing current:', current, 'neighbors check:');

      for (const [dq, dr] of directions) {
        const nq = cq + dq;
        const nr = cr + dr;
        const neighbor = getKey(nq, nr);

        const neighborTile = this.grid.getTile(nq, nr);
        if (this.debug) console.log('  Neighbor', neighbor, 'tile:', neighborTile ? 'exists' : 'null');
        if (!neighborTile) continue;

        const currentG = gScore.get(current);
        const tentativeG = (currentG !== undefined ? currentG : Infinity) + 1;
        if (this.debug) console.log('  tentativeG:', tentativeG, 'current gScore:', gScore.get(neighbor));

        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG + this.heuristic(nq, nr, endQ, endR));

          if (!openSet.has(neighbor)) {
            openSet.add(neighbor);
            if (this.debug) console.log('  Added to openSet:', neighbor);
          }
        }
      }
    }

    if (this.debug) {
      console.log('No path found after', iterations, 'iterations');
      console.log('Open set size:', openSet.size);
      console.log('Came from size:', cameFrom.size);
    }
    return null;
  }

  private heuristic(q1: number, r1: number, q2: number, r2: number): number {
    const dq = q1 - q2;
    const dr = r1 - r2;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
  }

  private reconstructPath(cameFrom: Map<string, string>, current: string): { q: number; r: number }[] {
    const path: { q: number; r: number }[] = [];
    let key: string | undefined = current;

    while (key) {
      const [q, r] = key.split(',').map(Number);
      path.unshift({ q, r });
      key = cameFrom.get(key);
    }

    return path;
  }
}
