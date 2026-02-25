/**
 * Camera - 游戏相机系统
 * 
 * 负责创建和管理 PlayCanvas 相机，提供：
 * - 正交俯视视角
 * - 位置控制（跟随地块）
 * - 缩放控制
 * - 屏幕/世界坐标转换
 * 
 * 视角说明：
 * - 相机位于正上方 (0, 400, 0)
 * - 垂直向下看 (绕X轴-90°)
 * - 使用正交投影，无透视变形
 * - 适合 2D 策略游戏的俯视视角
 */

import * as pc from 'playcanvas';

/**
 * Camera 类 - 游戏相机系统
 * 
 * 核心职责：
 * 1. 创建正交俯视相机
 * 2. 控制相机位置和缩放
 * 3. 提供坐标转换（屏幕 ↔ 世界）
 */
export class Camera {
  // ==================== 实体与配置 ====================
  private app: pc.Application;           // PlayCanvas 应用实例
  private entity: pc.Entity;              // 相机实体
  
  /** 相机高度 - 距离地面的高度 */
  private readonly cameraHeight: number = 400;
  /** 正交视图高度 - 决定可视范围大小 */
  private readonly baseOrthoHeight: number = 340;
  
  /** 当前缩放倍数 */
  private zoom: number = 1;
  
  /** 相机在地图上的位置（XZ平面，Y固定为0） */
  private position: pc.Vec3 = new pc.Vec3(0, 0, 0);

  // ==================== 构造函数 ====================
  /**
   * 创建游戏相机
   * 
   * 初始化配置：
   * - 位置：正上方 (0, 400, 0)
   * - 旋转：-90° X轴 → 垂直向下看
   * - 投影：正交 (Orthographic)
   * 
   * @param app - PlayCanvas 应用实例
   */
  constructor(app: pc.Application) {
    this.app = app;
    
    // 1. 创建相机实体
    this.entity = new pc.Entity('Camera');
    
    // 2. 添加相机组件
    this.entity.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,  // 正交投影（无透视）
      orthoHeight: this.baseOrthoHeight,       // 正交视图高度
      nearClip: 0.1,                          // 近裁剪面
      farClip: 2000,                          // 远裁剪面
      clearColor: new pc.Color(0.08, 0.09, 0.11)  // 背景色（深蓝灰）
    });

    // 3. 设置相机位置：正上方 400 单位
    this.entity.setLocalPosition(0, this.cameraHeight, 0);
    
    // 4. 设置相机旋转：绕X轴-90°，垂直向下看
    // 默认 Y-up 坐标系中，Y+ 是向上
    // 绕X轴旋转-90°后，相机朝向 Y- 方向（地面）
    this.entity.setLocalEulerAngles(-90, 0, 0);
    
    // 5. 将相机添加到场景
    this.app.root.addChild(this.entity);
  }

  // ==================== 位置控制 ====================
  /**
   * 设置相机位置
   * 
   * 相机在 XZ 平面上移动：
   * - X 对应屏幕左右
   * - Y 参数对应 Z 轴（世界坐标中的前后）
   * 
   * 相机高度保持不变 (cameraHeight)
   * 
   * @param x - X 坐标
   * @param y - Z 坐标（2D视图中作为Y）
   */
  setPosition(x: number, y: number): void {
    // 记录目标位置（XZ平面）
    this.position.set(x, 0, y);
    
    // 相机实际位置：X=x, Y=height, Z=y
    this.entity.setLocalPosition(x, this.cameraHeight, y);
  }

  /**
   * 获取相机位置
   * 
   * @returns 相机位置（x, z, 0）
   */
  getPosition(): pc.Vec3 {
    // 返回 XZ 平面坐标，Y 设为 0
    return new pc.Vec3(this.position.x, this.position.z, 0);
  }

  // ==================== 缩放控制 ====================
  /**
   * 设置缩放
   * 
   * 缩放范围：0.5 ~ 3.0
   * - 缩放 > 1：放大（看到更少的地块）
   * - 缩放 < 1：缩小（看到更多的地块）
   * 
   * 实现方式：调整正交视图高度
   * 
   * @param value - 缩放倍数
   */
  setZoom(value: number): void {
    // 限制缩放范围
    this.zoom = Math.max(0.5, Math.min(3, value));
    
    // 通过调整正交视图高度实现缩放
    // orthoHeight 越小，视野越窄（放大）
    // orthoHeight 越大，视野越宽（缩小）
    if (this.entity.camera) {
      this.entity.camera.orthoHeight = this.baseOrthoHeight / this.zoom;
    }
  }

  /**
   * 获取当前缩放
   */
  getZoom(): number {
    return this.zoom;
  }

  // ==================== 坐标转换 ====================
  /**
   * 屏幕坐标转世界坐标
   * 
   * 将鼠标点击位置转换为游戏世界坐标：
   * - 输入：屏幕像素坐标 (x, y)
   * - 输出：世界坐标 (x, 0, z)
   * 
   * 注意：由于是俯视视角，转换后的 Y 坐标为 0（在地面上）
   * 
   * @param screenX - 屏幕 X 坐标（像素）
   * @param screenY - 屏幕 Y 坐标（像素）
   * @returns 世界坐标 Vec3
   */
  screenToWorld(screenX: number, screenY: number): pc.Vec3 {
    const canvas = this.app.graphicsDevice.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // 计算相对于 canvas 的坐标
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    
    const worldPos = new pc.Vec3();
    if (this.entity.camera) {
      // 使用相机的 screenToWorld 方法
      // 第四个参数是深度（相机到目标点的距离）
      this.entity.camera.screenToWorld(x, y, this.cameraHeight, worldPos);
    }
    
    return worldPos;
  }

  /**
   * 世界坐标转屏幕坐标
   * 
   * 将游戏世界坐标转换为屏幕像素坐标：
   * - 输入：世界坐标 (x, 0, z)
   * - 输出：屏幕像素坐标 { x, y }
   * 
   * @param worldPos - 世界坐标
   * @returns 屏幕坐标 { x, y }
   */
  worldToScreen(worldPos: pc.Vec3): { x: number; y: number } {
    let screenPos = new pc.Vec3();
    if (this.entity.camera) {
      screenPos = this.entity.camera.worldToScreen(worldPos, new pc.Vec3());
    }
    return {
      x: screenPos.x,
      y: screenPos.y
    };
  }
}
