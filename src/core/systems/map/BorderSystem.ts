/**
 * BorderSystem - 边境计算模块
 * 
 * 使用 BFS 算法计算地块的边境状态
 */

import { HexGrid, Tile } from '@core/map';
import { DIRECTIONS, DIRECTION_TO_EDGE } from '@core/constants';

export interface OwnerRegion {
  borderTiles: Set<string>;
  tileDistances: Map<string, number>;
  borderEdges: Map<string, number[]>;
}

export interface BorderTileInfo {
  getTile: () => Tile;
  setBorderState: (isBorder: boolean, distance: number, edges: number[]) => void;
}

export class BorderSystem {
  private grid: HexGrid | null = null;

  setGrid(grid: HexGrid): void {
    this.grid = grid;
  }

  getGrid(): HexGrid | null {
    return this.grid;
  }

  calculateBorderEdges(tile: Tile): number[] {
    if (!this.grid) return [];
    
    const borderEdges: number[] = [];
    
    for (let i = 0; i < DIRECTIONS.length; i++) {
      const [dq, dr] = DIRECTIONS[i];
      const neighbor = this.grid.getTile(tile.q + dq, tile.r + dr);
      
      if (!neighbor || neighbor.owner !== tile.owner) {
        borderEdges.push(DIRECTION_TO_EDGE[i]);
      }
    }
    
    return borderEdges;
  }

  private calculateBorderEdgesForOwner(q: number, r: number, ownerTiles: Set<string>): number[] {
    const borderEdges: number[] = [];
    
    for (let i = 0; i < DIRECTIONS.length; i++) {
      const [dq, dr] = DIRECTIONS[i];
      const nq = q + dq;
      const nr = r + dr;
      const nKey = `${nq},${nr}`;
      
      if (!ownerTiles.has(nKey)) {
        borderEdges.push(DIRECTION_TO_EDGE[i]);
      }
    }
    
    return borderEdges;
  }

  findOwnerRegions(): Map<string, OwnerRegion> {
    if (!this.grid) return new Map();
    
    const regions = new Map<string, OwnerRegion>();
    const tiles = this.grid.getTiles();
    const ownerGroups = new Map<string, Set<string>>();

    for (const tile of tiles) {
      if (!ownerGroups.has(tile.owner)) {
        ownerGroups.set(tile.owner, new Set());
      }
      ownerGroups.get(tile.owner)!.add(tile.getKey());
    }

    for (const [ownerId, tileKeys] of ownerGroups) {
      const borderTiles = new Set<string>();
      const tileDistances = new Map<string, number>();
      const borderEdgesMap = new Map<string, number[]>();

      for (const key of tileKeys) {
        const { q, r } = Tile.fromKey(key);
        const edges = this.calculateBorderEdgesForOwner(q, r, tileKeys);
        
        if (edges.length > 0) {
          borderTiles.add(key);
          tileDistances.set(key, 0);
          borderEdgesMap.set(key, edges);
        }
      }

      const visited = new Set<string>(borderTiles);
      let currentWave = Array.from(borderTiles);
      let distance = 1;

      while (currentWave.length > 0 && distance <= 3) {
        const nextWave: string[] = [];

        for (const key of currentWave) {
          const { q, r } = Tile.fromKey(key);
          const neighbors = this.grid!.getNeighbors(q, r);

          for (const neighbor of neighbors) {
            const nKey = neighbor.getKey();
            if (!visited.has(nKey) && tileKeys.has(nKey)) {
              visited.add(nKey);
              tileDistances.set(nKey, distance);
              const edges = this.calculateBorderEdgesForOwner(neighbor.q, neighbor.r, tileKeys);
              borderEdgesMap.set(nKey, edges);
              nextWave.push(nKey);
            }
          }
        }

        currentWave = nextWave;
        distance++;
      }

      regions.set(ownerId, { borderTiles, tileDistances, borderEdges: borderEdgesMap });
    }

    return regions;
  }

  updateAllBorderStates(tileEntities: Map<string, BorderTileInfo>): void {
    const ownerRegions = this.findOwnerRegions();
    
    for (const hexTile of tileEntities.values()) {
      const tile = hexTile.getTile();
      const key = tile.getKey();
      const region = ownerRegions.get(tile.owner);
      
      if (!region) {
        hexTile.setBorderState(false, 0, []);
        continue;
      }

      const isBorder = region.borderTiles.has(key);
      let distanceFromBorder = 0;

      if (!isBorder && region.tileDistances.has(key)) {
        distanceFromBorder = region.tileDistances.get(key)!;
      }

      const borderEdges = this.calculateBorderEdges(tile);
      hexTile.setBorderState(isBorder, distanceFromBorder, borderEdges);
    }
  }
}
