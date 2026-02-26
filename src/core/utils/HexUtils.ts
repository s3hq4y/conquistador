/**
 * HexUtils - 六边形工具函数
 *
 * 提供六边形相关的公共计算函数，包括顶点坐标计算等
 */

export interface HexCorner {
  x: number;
  z: number;
}

/**
 * 计算六边形顶点坐标（自身坐标系）
 *
 * 使用尖顶公式计算，因为调用者通常在自身坐标系下操作
 * 地块实体通过 setLocalEulerAngles(0, 30, 0) 旋转后视觉上变为平顶
 *
 * @param index - 顶点索引 (0-5)
 * @param hexSize - 六边形大小（半径）
 * @returns 顶点 x, z 坐标
 */
export function getHexCorner(index: number, hexSize: number): HexCorner {
  const angleDeg = 60 * index - 30;
  const angleRad = Math.PI / 180 * angleDeg;
  return {
    x: hexSize * Math.cos(angleRad),
    z: hexSize * Math.sin(angleRad)
  };
}
