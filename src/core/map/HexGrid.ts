import { Tile } from './Tile';

export class HexGrid {
  private tiles: Map<string, Tile> = new Map();
  private radius: number;
  private hexSize: number;

  constructor(radius: number, hexSize: number) {
    this.radius = radius;
    this.hexSize = hexSize;
  }

  clear(): void {
    this.tiles.clear();
  }

  addTile(tile: Tile): void {
    this.tiles.set(tile.getKey(), tile);
  }

  removeTile(q: number, r: number): boolean {
    const key = `${q},${r}`;
    return this.tiles.delete(key);
  }

  getTileByKey(key: string): Tile | undefined {
    return this.tiles.get(key);
  }

  generate(): void {
    for (let q = -this.radius; q <= this.radius; q++) {
      const r1 = Math.max(-this.radius, -q - this.radius);
      const r2 = Math.min(this.radius, -q + this.radius);

      for (let r = r1; r <= r2; r++) {
        const tile = new Tile(q, r);
        this.tiles.set(tile.getKey(), tile);
      }
    }
  }

  getTile(q: number, r: number): Tile | undefined {
    return this.tiles.get(`${q},${r}`);
  }

  getTiles(): Tile[] {
    return Array.from(this.tiles.values());
  }

  hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = this.hexSize * (3/2 * q);
    const y = this.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  }

  pixelToHex(x: number, y: number): { q: number; r: number } {
    const q = (2/3 * x) / this.hexSize;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.hexSize;
    return this.hexRound(q, r);
  }

  private hexRound(q: number, r: number): { q: number; r: number } {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  getNeighbors(q: number, r: number): Tile[] {
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];

    const neighbors: Tile[] = [];
    for (const [dq, dr] of directions) {
      const tile = this.getTile(q + dq, r + dr);
      if (tile) {
        neighbors.push(tile);
      }
    }

    return neighbors;
  }

  getEmptyNeighbors(q: number, r: number): { q: number; r: number }[] {
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];

    const emptyNeighbors: { q: number; r: number }[] = [];
    for (const [dq, dr] of directions) {
      const nq = q + dq;
      const nr = r + dr;
      if (!this.getTile(nq, nr)) {
        emptyNeighbors.push({ q: nq, r: nr });
      }
    }

    return emptyNeighbors;
  }

  getDistance(a: Tile, b: Tile): number {
    const dq = a.q - b.q;
    const dr = a.r - b.r;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
  }

  getHexSize(): number {
    return this.hexSize;
  }

  getRadius(): number {
    return this.radius;
  }

  getTileCount(): number {
    return this.tiles.size;
  }

  getBounds(): { minQ: number; maxQ: number; minR: number; maxR: number } {
    let minQ = Infinity, maxQ = -Infinity;
    let minR = Infinity, maxR = -Infinity;

    for (const tile of this.tiles.values()) {
      minQ = Math.min(minQ, tile.q);
      maxQ = Math.max(maxQ, tile.q);
      minR = Math.min(minR, tile.r);
      maxR = Math.max(maxR, tile.r);
    }

    return { minQ, maxQ, minR, maxR };
  }

  getSharedEdge(tileA: Tile, tileB: Tile): { edgeA: number; edgeB: number } | null {
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];

    const directionToEdge: { [key: number]: number } = {
      0: 1,
      1: 0,
      2: 5,
      3: 4,
      4: 3,
      5: 2
    };

    const dq = tileB.q - tileA.q;
    const dr = tileB.r - tileA.r;

    for (let i = 0; i < directions.length; i++) {
      if (directions[i][0] === dq && directions[i][1] === dr) {
        const edgeA = directionToEdge[i];
        const edgeB = directionToEdge[(i + 3) % 6];
        return {
          edgeA,
          edgeB
        };
      }
    }

    return null;
  }

  areNeighbors(tileA: Tile, tileB: Tile): boolean {
    return this.getDistance(tileA, tileB) === 1;
  }
}
