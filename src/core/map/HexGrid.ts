/**
 * HexGrid - 六边形网格数据管理
 * 
 * 负责管理六边形地图的数据层，包括：
 * - 地块存储与检索
 * - 坐标转换 (Axial ↔ Pixel)
 * - 邻居查询
 * - 距离计算
 * - 公共边计算
 * 
 * 坐标系说明：
 * - 使用 Axial 坐标系 (q, r)
 * - 使用尖顶六边形公式进行坐标转换
 * - 通过外部旋转30°实现平顶视觉效果
 */

import { Tile } from './Tile';

/**
 * HexGrid 类 - 六边形网格数据管理
 * 
 * 核心职责：
 * 1. 存储和管理所有地块数据
 * 2. 提供坐标转换 (q,r ↔ x,y)
 * 3. 计算邻居和距离
 * 4. 计算公共边信息
 */
export class HexGrid {
  // ==================== 数据存储 ====================
  /** 地块存储映射，key 格式为 "q,r" */
  private tiles: Map<string, Tile> = new Map();
  
  /** 网格半径 - 决定地图范围 */
  private radius: number;
  /** 六边形大小 - 决定地块间距 */
  private hexSize: number;

  // ==================== 构造函数 ====================
  /**
   * 创建六边形网格
   * @param radius - 网格半径（从中心到边缘的格子数）
   * @param hexSize - 六边形大小（外接圆半径）
   */
  constructor(radius: number, hexSize: number) {
    this.radius = radius;
    this.hexSize = hexSize;
  }

  // ==================== 基本操作 ====================
  /**
   * 清空所有地块
   */
  clear(): void {
    this.tiles.clear();
  }

  /**
   * 添加地块到网格
   * @param tile - 要添加的地块
   */
  addTile(tile: Tile): void {
    this.tiles.set(tile.getKey(), tile);
  }

  /**
   * 移除指定位置的地块
   * @param q - Axial q 坐标
   * @param r - Axial r 坐标
   * @returns 是否成功移除
   */
  removeTile(q: number, r: number): boolean {
    const key = `${q},${r}`;
    return this.tiles.delete(key);
  }

  /**
   * 通过 key 获取地块
   * @param key - 地块 key，格式 "q,r"
   * @returns 地块或 undefined
   */
  getTileByKey(key: string): Tile | undefined {
    return this.tiles.get(key);
  }

  /**
   * 通过坐标获取地块
   * @param q - Axial q 坐标
   * @param r - Axial r 坐标
   * @returns 地块或 undefined
   */
  getTile(q: number, r: number): Tile | undefined {
    return this.tiles.get(`${q},${r}`);
  }

  /**
   * 获取所有地块
   * @returns 地块数组
   */
  getTiles(): Tile[] {
    return Array.from(this.tiles.values());
  }

  // ==================== 地图生成 ====================
  /**
   * 生成六边形网格地图
   * 
   * 使用螺旋/圆形分布生成地图：
   * - 从中心 (0,0) 开始
   * - 向外扩展 radius 圈
   * - 遵循 Axial 坐标约束：-radius ≤ q ≤ radius, -radius ≤ r ≤ radius
   * 
   * 有效地块坐标范围：
   * q: [-radius, radius]
   * r: [max(-radius, -q-radius), min(radius, -q+radius)]
   */
  generate(): void {
    for (let q = -this.radius; q <= this.radius; q++) {
      // 计算当前 q 行有效的 r 范围
      const r1 = Math.max(-this.radius, -q - this.radius);
      const r2 = Math.min(this.radius, -q + this.radius);

      for (let r = r1; r <= r2; r++) {
        const tile = new Tile(q, r);
        this.tiles.set(tile.getKey(), tile);
      }
    }
  }

  // ==================== 坐标转换 ====================
  /**
   * Axial 坐标转像素坐标（尖顶六边形公式）
   * 
   * 用于将游戏逻辑坐标转换为屏幕渲染坐标：
   * - x 对应屏幕水平方向
   * - y 对应屏幕垂直方向（在俯视视角中实际是 Z 轴）
   * 
   * 尖顶六边形公式：
   * x = hexSize * (3/2 * q)
   * y = hexSize * (sqrt(3)/2 * q + sqrt(3) * r)
   * 
   * 注意：这是尖顶公式，需要配合外部30°旋转实现平顶效果
   * 
   * @param q - Axial q 坐标
   * @param r - Axial r 坐标
   * @returns 像素坐标 { x, y }
   */
  hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = this.hexSize * (3/2 * q);
    const y = this.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  }

  /**
   * 像素坐标转 Axial 坐标（尖顶六边形公式逆运算）
   * 
   * 用于将屏幕点击位置转换为游戏逻辑坐标：
   * q = (2/3 * x) / hexSize
   * r = (-1/3 * x + sqrt(3)/3 * y) / hexSize
   * 
   * 转换后使用 hexRound 进行舍入到最近的合法坐标
   * 
   * @param x - 像素 x 坐标
   * @param y - 像素 y 坐标
   * @returns Axial 坐标 { q, r }
   */
  pixelToHex(x: number, y: number): { q: number; r: number } {
    const q = (2/3 * x) / this.hexSize;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.hexSize;
    return this.hexRound(q, r);
  }

  /**
   * Axial 坐标舍入到最近的合法六边形坐标
   * 
   * 由于浮点数精度问题，直接转换可能得到非整数坐标。
   * 使用舍入算法将坐标转换为合法的整数 Axial 坐标：
   * 1. 分别对 q, r, s = -q-r 进行舍入
   * 2. 修正以满足 s = -q-r 的约束
   * 
   * @param q - 原始 q 坐标（可能为浮点数）
   * @param r - 原始 r 坐标（可能为浮点数）
   * @returns 舍入后的整数坐标 { q, r }
   */
  private hexRound(q: number, r: number): { q: number; r: number } {
    // 计算第三个坐标 s（Axial 坐标系中 q + r + s = 0）
    const s = -q - r;
    
    // 对三个坐标进行舍入
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);

    // 计算舍入误差
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    // 修正最大的误差，确保 q + r + s = 0
    if (qDiff > rDiff && qDiff > sDiff) {
      // q 误差最大，修正 r 和 s
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      // r 误差最大，修正 q
      rr = -rq - rs;
    }
    // 如果 s 误差最大，不需要额外修正

    return { q: rq, r: rr };
  }

  // ==================== 邻居查询 ====================
  /**
   * 邻居方向偏移量（尖顶六边形）
   * 
   * 6个邻居的方向定义（从屏幕中心看）：
   * 方向0: (+1, 0)   - 东南（屏幕右下方）
   * 方向1: (+1, -1)  - 东北（屏幕右上方）
   * 方向2: (0, -1)   - 北（屏幕上方）
   * 方向3: (-1, 0)   - 西南（屏幕左下方）
   * 方向4: (-1, +1)  - 西北（屏幕左上方）
   * 方向5: (0, +1)   - 南（屏幕下方）
   */
  private static readonly DIRECTIONS = [
    [1, 0], [1, -1], [0, -1],
    [-1, 0], [-1, 1], [0, 1]
  ] as const;

  /**
   * 获取指定位置的所有邻居地块
   * 
   * @param q - Axial q 坐标
   * @param r - Axial r 坐标
   * @returns 邻居地块数组（最多6个）
   */
  getNeighbors(q: number, r: number): Tile[] {
    const neighbors: Tile[] = [];
    
    // 遍历6个方向
    for (const [dq, dr] of HexGrid.DIRECTIONS) {
      const tile = this.getTile(q + dq, r + dr);
      if (tile) {
        neighbors.push(tile);
      }
    }

    return neighbors;
  }

  /**
   * 获取指定位置的空邻居位置（没有地块的位置）
   * 
   * 用于地图编辑器或地图扩展：
   * - 查找可以添加新地块的位置
   * 
   * @param q - Axial q 坐标
   * @param r - Axial r 坐标
   * @returns 空邻居坐标数组
   */
  getEmptyNeighbors(q: number, r: number): { q: number; r: number }[] {
    const emptyNeighbors: { q: number; r: number }[] = [];

    for (const [dq, dr] of HexGrid.DIRECTIONS) {
      const nq = q + dq;
      const nr = r + dr;
      // 检查该位置是否没有地块
      if (!this.getTile(nq, nr)) {
        emptyNeighbors.push({ q: nq, r: nr });
      }
    }

    return emptyNeighbors;
  }

  // ==================== 距离计算 ====================
  /**
   * 计算两个地块之间的距离
   * 
   * 使用 Axial 坐标系距离公式：
   * distance = (|dq| + |dq + dr| + |dr|) / 2
   * 
   * 这是六边形网格中的曼哈顿距离变体
   * 
   * @param a - 起点地块
   * @param b - 终点地块
   * @returns 两地块之间的网格距离（1表示相邻）
   */
  getDistance(a: Tile, b: Tile): number {
    const dq = a.q - b.q;
    const dr = a.r - b.r;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
  }

  // ==================== Getter 方法 ====================
  /**
   * 获取六边形大小
   */
  getHexSize(): number {
    return this.hexSize;
  }

  /**
   * 获取网格半径
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * 获取地块总数
   */
  getTileCount(): number {
    return this.tiles.size;
  }

  /**
   * 获取地图边界
   * 
   * @returns 边界范围 { minQ, maxQ, minR, maxR }
   */
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

  // ==================== 边计算 ====================
  /**
   * 获取两个相邻地块的公共边信息
   * 
   * 用于：
   * - 边元素渲染（河流、道路等）
   * - 边境计算
   * 
   * @param tileA - 第一个地块
   * @param tileB - 第二个地块（必须是相邻地块）
   * @returns 公共边信息 { edgeA, edgeB } 或 null（如果不相邻）
   */
  getSharedEdge(tileA: Tile, tileB: Tile): { edgeA: number; edgeB: number } | null {
    const dq = tileB.q - tileA.q;
    const dr = tileB.r - tileA.r;

    // 查找方向索引
    for (let i = 0; i < HexGrid.DIRECTIONS.length; i++) {
      if (HexGrid.DIRECTIONS[i][0] === dq && HexGrid.DIRECTIONS[i][1] === dr) {
        // 方向到边的映射（尖顶六边形）
        const directionToEdge: { [key: number]: number } = {
          0: 1,  // 方向0 → 边1
          1: 0,  // 方向1 → 边0
          2: 5,  // 方向2 → 边5
          3: 4,  // 方向3 → 边4
          4: 3,  // 方向4 → 边3
          5: 2   // 方向5 → 边2
        };

        const edgeA = directionToEdge[i];
        const edgeB = directionToEdge[(i + 3) % 6]; // 对边的索引 = (i + 3) % 6

        return { edgeA, edgeB };
      }
    }

    return null;
  }

  /**
   * 判断两个地块是否为邻居
   * 
   * @param tileA - 第一个地块
   * @param tileB - 第二个地块
   * @returns 是否为邻居（距离为1）
   */
  areNeighbors(tileA: Tile, tileB: Tile): boolean {
    return this.getDistance(tileA, tileB) === 1;
  }
}
