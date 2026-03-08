/**
 * Hex 方向常量
 * 
 * 定义六边形网格的6个方向及相关映射
 * 在整个代码库中统一使用这些常量，避免重复定义
 * 
 * 坐标系说明 (Axial, 尖顶六边形):
 * - 方向0: (+1, 0)   - 东南
 * - 方向1: (+1, -1)  - 东北
 * - 方向2: (0, -1)   - 北
 * - 方向3: (-1, 0)   - 西南
 * - 方向4: (-1, +1)  - 西北
 * - 方向5: (0, +1)   - 南
 */

/**
 * 6个方向的偏移量数组 (dq, dr)
 */
export const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],    // 方向0: 东南
  [1, -1],   // 方向1: 东北
  [0, -1],   // 方向2: 北
  [-1, 0],   // 方向3: 西南
  [-1, 1],   // 方向4: 西北
  [0, 1]     // 方向5: 南
] as const;

/**
 * 方向到边的映射（尖顶六边形）
 * 用于计算两个相邻地块的公共边
 */
export const DIRECTION_TO_EDGE: { readonly [key: number]: number } = {
  0: 1,  // 方向0 → 边1
  1: 0,  // 方向1 → 边0
  2: 5,  // 方向2 → 边5
  3: 4,  // 方向3 → 边4
  4: 3,  // 方向4 → 边3
  5: 2   // 方向5 → 边2
} as const;

/**
 * 获取相反方向
 * @param direction 方向索引 (0-5)
 * @returns 相反方向索引
 */
export function getOppositeDirection(direction: number): number {
  return (direction + 3) % 6;
}

/**
 * 获取顺时针方向
 * @param direction 方向索引 (0-5)
 * @returns 顺时针方向索引
 */
export function getClockwiseDirection(direction: number): number {
  return (direction + 1) % 6;
}

/**
 * 获取逆时针方向
 * @param direction 方向索引 (0-5)
 * @returns 逆时针方向索引
 */
export function getCounterClockwiseDirection(direction: number): number {
  return (direction + 5) % 6;
}

/**
 * 根据方向偏移量获取方向索引
 * @param dq q方向偏移
 * @param dr r方向偏移
 * @returns 方向索引 (0-5)，找不到返回 -1
 */
export function getDirectionFromOffset(dq: number, dr: number): number {
  for (let i = 0; i < DIRECTIONS.length; i++) {
    if (DIRECTIONS[i][0] === dq && DIRECTIONS[i][1] === dr) {
      return i;
    }
  }
  return -1;
}
