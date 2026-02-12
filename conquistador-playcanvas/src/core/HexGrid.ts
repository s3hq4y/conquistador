import { Tile } from './Tile';

export class HexGrid {
  private tiles: Map<string, Tile> = new Map();
  private radius: number;
  private hexSize: number;

  constructor(radius: number, hexSize: number) {
    this.radius = radius;
    this.hexSize = hexSize;
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
}
