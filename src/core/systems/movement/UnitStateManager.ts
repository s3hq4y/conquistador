/**
 * UnitStateManager - 单位状态管理模块
 * 
 * 管理单位的移动点、攻击状态等运行时状态
 */

import type { UnitInstance } from '../../map/SceneData';

interface UnitState {
  moves: number;
  maxMoves: number;
  hasAttacked: boolean;
}

export class UnitStateManager {
  private unitStates: Map<string, UnitState> = new Map();

  getState(id: string): UnitState | undefined {
    return this.unitStates.get(id);
  }

  createState(unit: UnitInstance, maxMoves: number): UnitState {
    const state: UnitState = { moves: maxMoves, maxMoves, hasAttacked: false };
    this.unitStates.set(unit.id, state);
    return state;
  }

  getOrCreateState(unit: UnitInstance, calculateMaxMoves: (traits: string[]) => number): UnitState {
    let state = this.unitStates.get(unit.id);
    if (!state) {
      const maxMoves = calculateMaxMoves(unit.traits);
      state = this.createState(unit, maxMoves);
    }
    return state;
  }

  setMoves(id: string, moves: number): void {
    const state = this.unitStates.get(id);
    if (state) {
      state.moves = moves;
    }
  }

  setMaxMoves(id: string, maxMoves: number): void {
    const state = this.unitStates.get(id);
    if (state) {
      state.maxMoves = maxMoves;
    }
  }

  useMoves(id: string, cost: number): boolean {
    const state = this.unitStates.get(id);
    if (!state || state.moves < cost) {
      return false;
    }
    state.moves -= cost;
    return true;
  }

  setAttacked(id: string): void {
    const state = this.unitStates.get(id);
    if (state) {
      state.hasAttacked = true;
    }
  }

  canAttack(id: string): boolean {
    const state = this.unitStates.get(id);
    return state ? !state.hasAttacked : false;
  }

  clearMovement(id: string): void {
    const state = this.unitStates.get(id);
    if (state) {
      state.moves = 0;
    }
  }

  resetAll(): void {
    for (const state of this.unitStates.values()) {
      state.moves = state.maxMoves;
      state.hasAttacked = false;
    }
  }

  remove(id: string): void {
    this.unitStates.delete(id);
  }

  clear(): void {
    this.unitStates.clear();
  }

  hasMoves(id: string): boolean {
    const state = this.unitStates.get(id);
    return state ? state.moves > 0 : false;
  }

  getMoves(id: string): number {
    const state = this.unitStates.get(id);
    return state?.moves ?? 0;
  }

  getMaxMoves(id: string): number {
    const state = this.unitStates.get(id);
    return state?.maxMoves ?? 0;
  }
}
