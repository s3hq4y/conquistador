/**
 * HexTile - 六边形地块渲染组件
 * 
 * 负责创建和管理单个六边形地块的视觉表现，包括：
 * - 六边形几何体创建
 * - 地形颜色/贴图渲染
 * - 边框高亮效果（国家边境、选中状态）
 * - 移动/攻击范围高亮
 * 
 * 坐标系说明：
 * - 使用 PlayCanvas Y-up 坐标系
 * - 相机从正上方垂直向下渲染 (绕X轴-90°)
 * - 六边形通过 Y轴旋转30° 实现平顶效果 (尖顶公式 + 旋转 = 平顶视觉)
 */

import * as pc from 'playcanvas';
import { Tile, TerrainTypeDefinition, OwnerTagDefinition, hexToRgb } from '../core/map';

/**
 * 将十六进制颜色转换为 PlayCanvas Color 对象
 * @param hex - 十六进制颜色字符串，如 "#59a640"
 * @returns PlayCanvas Color 对象，RGB 值归一化到 0-1
 */
function hexToPlayCanvas(hex: string): pc.Color {
  const rgb = hexToRgb(hex);
  return new pc.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
}

/**
 * HexTile 类 - 六边形地块渲染组件
 * 
 * 核心职责：
 * 1. 创建六边形几何体 (CylinderGeometry with 6 segments)
 * 2. 应用地形颜色/贴图材质
 * 3. 管理边框渲染 (国家边境、选中高亮)
 * 4. 管理移动/攻击范围高亮
 */
export class HexTile {
  // ==================== 实体与数据 ====================
  private entity: pc.Entity;                    // PlayCanvas 实体
  private material: pc.StandardMaterial;          // 地块材质
  private meshInstance!: pc.MeshInstance;        // 网格实例
  private tile: Tile;                            // 地块数据模型
  private selected: boolean = false;              // 选中状态
  private hovered: boolean = false;               // 悬停状态

  // ==================== 边框相关 ====================
  private borderEntities: pc.Entity[] = [];     // 国家边境边框实体列表
  private selectedBorderEntities: pc.Entity[] = []; // 选中边框实体列表

  // ==================== 高亮相关 ====================
  private reachableHighlight: pc.Entity | null = null;   // 可移动范围高亮
  private attackableHighlight: pc.Entity | null = null; // 可攻击范围高亮

  // ==================== 地形与归属 ====================
  private ownerDef: OwnerTagDefinition | null = null;   // 地块归属定义
  private borderEdges: number[] = [];                  // 边境边索引列表
  private hexSize: number = 0;                         // 六边形大小
  private graphicsDevice: pc.GraphicsDevice | null = null; // 图形设备

  // ==================== 常量配置 ====================
  /** 边框层数 - 用于创建渐变效果 */
  private static readonly BORDER_LAYERS = 6;
  /** 边框步长因子 - 相对于六边形大小 */
  private static readonly BORDER_STEP_FACTOR = 0.05;
  /** 边框起始透明度 */
  private static readonly BORDER_ALPHA_START = 0.45;

  // ==================== 构造函数 ====================
  /**
   * 创建六边形地块渲染组件
   * @param app - PlayCanvas 应用实例
   * @param tile - 地块数据模型
   * @param hexSize - 六边形大小（半径）
   * @param terrainDef - 地形类型定义（颜色、贴图等）
   * @param ownerDef - 归属标签定义（颜色、ID等）
   */
  constructor(
    app: pc.Application, 
    tile: Tile, 
    hexSize: number,
    terrainDef: TerrainTypeDefinition,
    ownerDef: OwnerTagDefinition
  ) {
    // 1. 初始化基本属性
    this.entity = new pc.Entity(`Tile_${tile.q}_${tile.r}`);
    this.tile = tile;
    this.ownerDef = ownerDef;
    this.hexSize = hexSize;
    this.graphicsDevice = app.graphicsDevice;
    
    // 2. 创建材质 - 使用自发光颜色实现纯色效果
    const terrainColor = hexToPlayCanvas(terrainDef.color);
    
    this.material = new pc.StandardMaterial();
    this.material.diffuse = terrainColor.clone();    // 漫反射颜色
    this.material.useLighting = false;               // 不使用光照（纯色）
    this.material.emissive = terrainColor.clone();   // 自发光颜色
    this.material.emissiveIntensity = 1;            // 自发光强度
    this.material.opacity = 1.0;                    // 不透明
    this.material.update();

    // 3. 创建平顶六边形几何体（包含旋转）
    this.createHexGeometry(app.graphicsDevice, hexSize);

    // 4. 添加渲染组件到实体
    this.entity.addComponent('render', {
      meshInstances: [this.meshInstance],
      castShadows: false,
      receiveShadows: false
    });

    // 5. 创建标签实体（用于未来扩展，如显示地块坐标）
    const label = new pc.Entity();
    label.name = `label_${tile.q}_${tile.r}`;
    this.entity.addChild(label);
  }

  // ==================== 几何体创建 ====================
  /**
   * 创建六边形几何体
   * 
   * 使用 PlayCanvas CylinderGeometry 创建6边形柱体：
   * - radius: 六边形外接圆半径
   * - height: 柱体高度（很薄，作为地块厚度）
   * - capSegments: 6 边形顶面
   * 
   * 注意：CylinderGeometry 默认创建尖顶六边形（顶点朝上）
   * 创建后立即旋转30°将尖顶转为平顶
   */
  private createHexGeometry(device: pc.GraphicsDevice, hexSize: number): void {
    const geometry = new pc.CylinderGeometry({
      radius: hexSize,
      height: Math.max(2, hexSize * 0.08),  // 地块厚度 = hexSize * 8%
      heightSegments: 1,
      capSegments: 6  // 6边形顶面
    });
    const mesh = pc.Mesh.fromGeometry(device, geometry);

    this.meshInstance = new pc.MeshInstance(mesh, this.material);
    
    // Y轴旋转30° 将尖顶六边形转为平顶六边形
    // 原始 CylinderGeometry 是尖顶朝上，旋转30°后变成平顶朝上
    this.entity.setLocalEulerAngles(0, 30, 0);
  }

  /**
   * 计算六边形顶点坐标
   * 
   * @param index - 顶点索引 (0-5)
   * @returns 顶点 x, z 坐标（在 XZ 平面上）
   */
  private getHexCorner(index: number): { x: number; z: number } {
    // 平顶六边形角度公式：60° * index
    const angleDeg = 60 * index;
    const angleRad = Math.PI / 180 * angleDeg;
    return {
      x: this.hexSize * Math.cos(angleRad),
      z: this.hexSize * Math.sin(angleRad)
    };
  }

  // ==================== 梯形网格创建 ====================
  /**
   * 创建梯形网格（用于边框渲染）
   * 
   * 梯形用于在地块边缘创建渐变边框效果：
   * - p0, p1: 梯形的外侧顶点（靠近地块中心）
   * - q0, q1: 梯形的内侧顶点（靠近地块边缘）
   * 
   * 顶点顺序（四边形）：
   *   p0 ---- p1
   *    |      |
   *   q0 ---- q1
   */
  private createTrapezoidMesh(
    p0x: number, p0z: number,  // 外侧点1
    p1x: number, p1z: number,  // 外侧点2
    q0x: number, q0z: number,  // 内侧点1
    q1x: number, q1z: number   // 内侧点2
  ): pc.Mesh {
    // 定义4个顶点的位置（Y=0，在地图平面上）
    const positions = new Float32Array([
      p0x, 0, p0z,
      p1x, 0, p1z,
      q1x, 0, q1z,
      q0x, 0, q0z
    ]);

    // 法线全部朝上（Y+ 方向）
    const normals = new Float32Array([
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0
    ]);

    // 两个三角形组成一个四边形
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    // 创建顶点格式（位置 + 法线）
    const vertexFormat = new pc.VertexFormat(this.graphicsDevice!, [
      { semantic: pc.SEMANTIC_POSITION, components: 3, type: pc.TYPE_FLOAT32 },
      { semantic: pc.SEMANTIC_NORMAL, components: 3, type: pc.TYPE_FLOAT32 }
    ]);

    // 创建顶点缓冲区
    const vertexBuffer = new pc.VertexBuffer(this.graphicsDevice!, vertexFormat, 4);
    const vertexData = new Float32Array(vertexBuffer.lock());
    
    // 填充顶点数据
    for (let i = 0; i < 4; i++) {
      vertexData[i * 6 + 0] = positions[i * 3 + 0];
      vertexData[i * 6 + 1] = positions[i * 3 + 1];
      vertexData[i * 6 + 2] = positions[i * 3 + 2];
      vertexData[i * 6 + 3] = normals[i * 3 + 0];
      vertexData[i * 6 + 4] = normals[i * 3 + 1];
      vertexData[i * 6 + 5] = normals[i * 3 + 2];
    }
    vertexBuffer.unlock();

    // 创建索引缓冲区
    const indexBuffer = new pc.IndexBuffer(this.graphicsDevice!, pc.INDEXFORMAT_UINT16, 6);
    const indexData = new Uint16Array(indexBuffer.lock());
    indexData.set(indices);
    indexBuffer.unlock();

    // 创建 Mesh 对象
    const mesh = new pc.Mesh(this.graphicsDevice!);
    mesh.vertexBuffer = vertexBuffer;
    mesh.indexBuffer[0] = indexBuffer;
    mesh.primitive[0] = {
      type: pc.PRIMITIVE_TRIANGLES,
      base: 0,
      baseVertex: 0,
      count: 6,
      indexed: true
    };
    mesh.aabb = new pc.BoundingBox();

    return mesh;
  }

  // ==================== 边框创建 （可能还需要修改）====================
  /**
   * 创建单条边的多层渐变边框
   * 
   * 在地块的指定边创建多层梯形，形成边境渐变效果：
   * - 从地块边缘向内多层渐变
   * - 每层透明度递减
   * - 使用 BORDER_LAYERS 控制层数
   * 
   * @param edgeIndex - 边索引 (0-5)
   * @param ownerColor - 归属颜色
   * @param overrideAlpha - 可选的透明度覆盖值（用于选中状态）
   * @returns 边框实体列表
   */
  private createBorderTrapezoids(edgeIndex: number, ownerColor: pc.Color, overrideAlpha?: number): pc.Entity[] {
    const entities: pc.Entity[] = [];
    
    // 获取边的两个端点
    const p0 = this.getHexCorner(edgeIndex);
    const p1 = this.getHexCorner((edgeIndex + 1) % 6);
    
    // 获取相邻两边（用于计算延伸方向）
    const prevCorner = this.getHexCorner((edgeIndex + 5) % 6);
    const nextCorner = this.getHexCorner((edgeIndex + 2) % 6);
    
    // 计算边的方向向量
    const ex = p1.x - p0.x;
    const ez = p1.z - p0.z;
    const edgeLen = Math.max(1e-6, Math.hypot(ex, ez));
    
    // 计算边的外法线方向（垂直于边指向外）
    let nx = -ez / edgeLen;
    let nz = ex / edgeLen;
    
    // 确保法线指向地块中心（用于确定梯形方向）
    const centerX = 0;
    const centerZ = 0;
    const midX = (p0.x + p1.x) / 2;
    const midZ = (p0.z + p1.z) / 2;
    const dot = nx * (centerX - midX) + nz * (centerZ - midZ);
    
    if (dot < 0) {
      nx = -nx;
      nz = -nz;
    }
    
    // 边的切线方向
    const tx = ex / edgeLen;
    const tz = ez / edgeLen;
    
    // 创建多层渐变边框
    const step = this.hexSize * HexTile.BORDER_STEP_FACTOR;
    const layers = HexTile.BORDER_LAYERS;
    
    for (let k = 1; k <= layers; k++) {
      const offset = k * step;
      // 透明度从外到内递减
      const alpha = overrideAlpha !== undefined ? overrideAlpha : HexTile.BORDER_ALPHA_START * (1 - (k - 1) / layers);
      
      // 计算梯形外侧点（沿法线方向偏移）
      const a0x = p0.x + nx * offset;
      const a0z = p0.z + nz * offset;
      
      // 计算梯形顶点（使用相似三角形原理）
      const d0x = p0.x - prevCorner.x;
      const d0z = p0.z - prevCorner.z;
      const d1x = nextCorner.x - p1.x;
      const d1z = nextCorner.z - p1.z;
      
      const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx;
      const denom0 = cross(tx, tz, d0x, d0z);
      const denom1 = cross(tx, tz, d1x, d1z);
      
      let u0 = denom0 !== 0 ? cross(p0.x - a0x, p0.z - a0z, d0x, d0z) / denom0 : 0;
      let u1 = denom1 !== 0 ? cross(p1.x - a0x, p1.z - a0z, d1x, d1z) / denom1 : 0;
      
      // 计算梯形内侧点
      let q0x = a0x + tx * u0;
      let q0z = a0z + tz * u0;
      let q1x = a0x + tx * u1;
      let q1z = a0z + tz * u1;
      
      // 边界情况处理
      if (!isFinite(u0)) {
        q0x = p0.x + nx * offset;
        q0z = p0.z + nz * offset;
      }
      if (!isFinite(u1)) {
        q1x = p1.x + nx * offset;
        q1z = p1.z + nz * offset;
      }
      
      // 创建梯形网格
      const mesh = this.createTrapezoidMesh(
        q0x, q0z,
        q1x, q1z,
        p0.x, p0.z,
        p1.x, p1.z
      );
      
      // 创建半透明材质
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(ownerColor.r, ownerColor.g, ownerColor.b);
      material.useLighting = false;
      material.emissive = new pc.Color(ownerColor.r, ownerColor.g, ownerColor.b);
      material.emissiveIntensity = 1;
      material.opacity = alpha;
      material.blendType = pc.BLEND_NORMAL;
      material.depthWrite = false;
      material.update();
      
      const meshInstance = new pc.MeshInstance(mesh, material);
      
      // 创建实体并添加到场景
      const entity = new pc.Entity(`BorderTrapezoid_${this.tile.q}_${this.tile.r}_${edgeIndex}_${k}`);
      entity.addComponent('render', {
        meshInstances: [meshInstance],
        castShadows: false,
        receiveShadows: false
      });
      
      // 边框略高于地块表面
      entity.setLocalPosition(0, 2, 0);
      // 视觉上逆时针旋转了30度（象限角定义）

      /*
      ## 为什么要修正角度？
      ### 问题的本质
      边框渲染和地块主体使用 不同的方式 计算顶点：

      组件 顶点计算方式 旋转 地块主体 CylinderGeometry （尖顶） +30° → 平顶 边框 getHexCorner() 继承父实体 +30°

      ### 如果不改 getHexCorner（保持尖顶公式）
      1. getHexCorner 使用 60 * index - 30 （尖顶公式）
      2. 边框实体继承父实体 +30° 旋转
      3. 最终效果 = 尖顶公式 + 30° = 尖顶 + 30° = 错误的视觉方向
      ### 修正后的正确流程
      1. getHexCorner 改为 60 * index （平顶公式）
      2. 边框实体额外 +30° 旋转
      3. 最终效果 = 平顶公式 + 30° = 平顶公式 + 30° = 正确的平顶
      ### 总结
      组件 公式 父旋转 最终效果 地块主体 CylinderGeometry (尖顶) +30° ✓ 平顶 边框（修正前） 60*index - 30 (尖顶) +30° ✗ 错误 边框（修正后） 60*index (平顶) +30° ✓ 平顶

      核心原因 ：边框的顶点计算和父实体的旋转是 叠加 的，不是抵消的，所以需要让公式本身变成平顶公式，才能在旋转后得到正确的平顶效果。
      */

      entity.setLocalEulerAngles(0, 30, 0);
      entity.enabled = true;
      
      entities.push(entity);
    }
    
    return entities;
  }

  /**
   * 清除所有边框实体
   */
  private clearBorderEntities(): void {
    this.borderEntities.forEach(entity => entity.destroy());
    this.borderEntities = [];
  }

  /**
   * 确保边框实体存在
   * 
   * 根据当前归属和边境状态创建/更新边框：
   * - 只对非中立地块显示边框
   * - 只在有边境边时创建
   */
  private ensureBorderEntities(): void {
    this.clearBorderEntities();
    
    // 跳过中立地块或无归属的地块
    if (!this.graphicsDevice || !this.ownerDef || this.ownerDef.id === 'neutral') {
      return;
    }
    
    // 跳过无边境界的地块
    if (this.borderEdges.length === 0) {
      return;
    }
    
    // 获取归属颜色并创建边框
    const ownerColor = hexToPlayCanvas(this.ownerDef.color);
    
    for (const edgeIndex of this.borderEdges) {
      const trapezoids = this.createBorderTrapezoids(edgeIndex, ownerColor);
      trapezoids.forEach(entity => {
        this.entity.addChild(entity);
        this.borderEntities.push(entity);
      });
    }
  }

  // ==================== 公共方法 ====================
  /**
   * 设置地块在世界中的位置
   * @param x - X 坐标
   * @param y - Z 坐标（在 2D 视图中作为 Y）
   */
  setPosition(x: number, y: number): void {
    this.entity.setLocalPosition(x, 0, y);
  }

  /**
   * 设置地块选中状态
   * @param selected - 是否选中
   */
  setSelected(selected: boolean): void {
    this.selected = selected;
    if (selected) {
      this.showSelectedBorder();
    } else {
      this.hideSelectedBorder();
    }
  }

  /**
   * 设置地块悬停状态
   * @param hovered - 是否悬停
   */
  setHovered(hovered: boolean): void {
    this.hovered = hovered;
    this.updateEmissive();
  }

  /**
   * 更新自发光强度
   * 
   * 根据选中/悬停状态调整自发光强度：
   * - 正常: 1.0
   * - 悬停: 1.2
   * - 选中: 1.5
   */
  private updateEmissive(): void {
    let intensity = 1;
    if (this.selected) {
      intensity = 1.5;
    } else if (this.hovered) {
      intensity = 1.2;
    }
    this.material.emissiveIntensity = intensity;
    this.material.update();
  }

  /**
   * 设置地块地形类型
   * @param terrainDef - 地形类型定义
   */
  setTerrain(terrainDef: TerrainTypeDefinition): void {
    this.tile.terrain = terrainDef.id;
    const terrainColor = hexToPlayCanvas(terrainDef.color);
    this.material.diffuse = terrainColor.clone();
    this.material.emissive = terrainColor.clone();
    this.updateEmissive();
  }

  /**
   * 设置地块归属
   * @param ownerDef - 归属标签定义
   */
  setOwner(ownerDef: OwnerTagDefinition): void {
    this.tile.owner = ownerDef.id;
    this.ownerDef = ownerDef;
  }

  /**
   * 设置边境状态
   * @param _isBorder - 是否边境（未使用）
   * @param _distanceFromBorder - 距边境距离（未使用）
   * @param borderEdges - 边境边索引列表
   */
  setBorderState(_isBorder: boolean, _distanceFromBorder: number, borderEdges?: number[]): void {
    this.borderEdges = borderEdges || [];
    this.ensureBorderEntities();
  }

  /**
   * 设置可移动范围高亮
   * @param enabled - 是否显示高亮
   */
  setReachableHighlight(enabled: boolean): void {
    if (!this.graphicsDevice) return;

    if (enabled && !this.reachableHighlight) {
      // 创建半透明绿色材质
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0, 0.8, 0);
      material.useLighting = false;
      material.emissive = new pc.Color(0, 0.8, 0);
      material.emissiveIntensity = 0.5;
      material.opacity = 0.3;
      material.blendType = pc.BLEND_NORMAL;
      material.depthWrite = false;
      material.update();

      // 创建稍小的六边形
      const geometry = new pc.CylinderGeometry({
        radius: this.hexSize * 0.85,
        height: 1,
        heightSegments: 1,
        capSegments: 6
      });
      const mesh = pc.Mesh.fromGeometry(this.graphicsDevice, geometry);
      const meshInstance = new pc.MeshInstance(mesh, material);

      this.reachableHighlight = new pc.Entity(`Reachable_${this.tile.q}_${this.tile.r}`);
      this.reachableHighlight.addComponent('render', {
        meshInstances: [meshInstance],
        castShadows: false,
        receiveShadows: false
      });
      this.reachableHighlight.setLocalPosition(0, 1.5, 0);
      this.entity.addChild(this.reachableHighlight);
    } else if (!enabled && this.reachableHighlight) {
      this.reachableHighlight.destroy();
      this.reachableHighlight = null;
    }
  }

  /**
   * 设置可攻击范围高亮
   * @param enabled - 是否显示高亮
   */
  setAttackableHighlight(enabled: boolean): void {
    if (!this.graphicsDevice) return;

    if (enabled && !this.attackableHighlight) {
      // 创建半透明红色材质
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(1, 0.2, 0);
      material.useLighting = false;
      material.emissive = new pc.Color(1, 0.2, 0);
      material.emissiveIntensity = 0.5;
      material.opacity = 0.4;
      material.blendType = pc.BLEND_NORMAL;
      material.depthWrite = false;
      material.update();

      // 创建稍小的六边形
      const geometry = new pc.CylinderGeometry({
        radius: this.hexSize * 0.85,
        height: 1,
        heightSegments: 1,
        capSegments: 6
      });
      const mesh = pc.Mesh.fromGeometry(this.graphicsDevice, geometry);
      const meshInstance = new pc.MeshInstance(mesh, material);

      this.attackableHighlight = new pc.Entity(`Attackable_${this.tile.q}_${this.tile.r}`);
      this.attackableHighlight.addComponent('render', {
        meshInstances: [meshInstance],
        castShadows: false,
        receiveShadows: false
      });
      this.attackableHighlight.setLocalPosition(0, 1.5, 0);
      this.entity.addChild(this.attackableHighlight);
    } else if (!enabled && this.attackableHighlight) {
      this.attackableHighlight.destroy();
      this.attackableHighlight = null;
    }
  }

  /**
   * 显示选中边框（黄色，6条边全覆盖）
   */
  private showSelectedBorder(): void {
    this.hideSelectedBorder();
    if (!this.graphicsDevice) return;

    const selectedColor = new pc.Color(1, 1, 0);

    // 选中时显示全部6条边的边框
    for (let edgeIndex = 0; edgeIndex < 6; edgeIndex++) {
      const trapezoids = this.createBorderTrapezoids(edgeIndex, selectedColor, 0.7);
      trapezoids.forEach(entity => {
        this.entity.addChild(entity);
        this.selectedBorderEntities.push(entity);
      });
    }
  }

  /**
   * 隐藏选中边框
   */
  private hideSelectedBorder(): void {
    this.selectedBorderEntities.forEach(entity => entity.destroy());
    this.selectedBorderEntities = [];
  }

  // ==================== Getter 方法 ====================
  getTile(): Tile {
    return this.tile;
  }

  getEntity(): pc.Entity {
    return this.entity;
  }

  // ==================== 销毁 ====================
  /**
   * 销毁地块及其所有子实体
   * 清理所有边框、高亮等实体
   */
  destroy(): void {
    this.clearBorderEntities();
    this.hideSelectedBorder();
    if (this.reachableHighlight) {
      this.reachableHighlight.destroy();
      this.reachableHighlight = null;
    }
    if (this.attackableHighlight) {
      this.attackableHighlight.destroy();
      this.attackableHighlight = null;
    }
    this.entity.destroy();
  }
}
