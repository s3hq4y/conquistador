/**
 * HexMeshUtils - 六边形网格工具函数
 * 
 * 提供六边形几何创建相关的工具函数：
 * - 梯形网格创建（用于边框渲染）
 * - 顶点计算
 */

import * as pc from 'playcanvas';

/**
 * 创建梯形网格（用于边框渲染）
 * 
 * @param device - PlayCanvas 图形设备
 * @param p0x, p0z - 外侧点1
 * @param p1x, p1z - 外侧点2
 * @param q0x, q0z - 内侧点1
 * @param q1x, q1z - 内侧点2
 * @returns 梯形网格
 */
export function createTrapezoidMesh(
  device: pc.GraphicsDevice,
  p0x: number, p0z: number,
  p1x: number, p1z: number,
  q0x: number, q0z: number,
  q1x: number, q1z: number
): pc.Mesh {
  const positions = new Float32Array([
    p0x, 0, p0z,
    p1x, 0, p1z,
    q1x, 0, q1z,
    q0x, 0, q0z
  ]);

  const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0
  ]);

  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const vertexFormat = new pc.VertexFormat(device, [
    { semantic: pc.SEMANTIC_POSITION, components: 3, type: pc.TYPE_FLOAT32 },
    { semantic: pc.SEMANTIC_NORMAL, components: 3, type: pc.TYPE_FLOAT32 }
  ]);

  const vertexBuffer = new pc.VertexBuffer(device, vertexFormat, 4);
  const vertexData = new Float32Array(vertexBuffer.lock());
  
  for (let i = 0; i < 4; i++) {
    vertexData[i * 6 + 0] = positions[i * 3 + 0];
    vertexData[i * 6 + 1] = positions[i * 3 + 1];
    vertexData[i * 6 + 2] = positions[i * 3 + 2];
    vertexData[i * 6 + 3] = normals[i * 3 + 0];
    vertexData[i * 6 + 4] = normals[i * 3 + 1];
    vertexData[i * 6 + 5] = normals[i * 3 + 2];
  }
  vertexBuffer.unlock();

  const indexBuffer = new pc.IndexBuffer(device, pc.INDEXFORMAT_UINT16, 6);
  const indexData = new Uint16Array(indexBuffer.lock());
  indexData.set(indices);
  indexBuffer.unlock();

  const mesh = new pc.Mesh(device);
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

/**
 * 创建半透明材质
 * 
 * @param _device - PlayCanvas 图形设备（保留以备将来使用）
 * @param color - 颜色
 * @param alpha - 透明度
 * @returns 材质
 */
export function createTransparentMaterial(
  _device: pc.GraphicsDevice,
  color: pc.Color,
  alpha: number
): pc.StandardMaterial {
  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(color.r, color.g, color.b);
  material.useLighting = false;
  material.emissive = new pc.Color(color.r, color.g, color.b);
  material.emissiveIntensity = 1;
  material.opacity = alpha;
  material.blendType = pc.BLEND_NORMAL;
  material.depthWrite = false;
  material.update();
  return material;
}

/**
 * 创建高亮用的六边形网格
 * 
 * @param device - PlayCanvas 图形设备
 * @param hexSize - 六边形大小
 * @param color - 高亮颜色
 * @param alpha - 透明度
 * @returns 高亮实体
 */
export function createHighlightHex(
  device: pc.GraphicsDevice,
  hexSize: number,
  color: pc.Color,
  alpha: number
): pc.Entity {
  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(color.r, color.g, color.b);
  material.useLighting = false;
  material.emissive = new pc.Color(color.r, color.g, color.b);
  material.emissiveIntensity = 0.5;
  material.opacity = alpha;
  material.blendType = pc.BLEND_NORMAL;
  material.depthWrite = false;
  material.update();

  const geometry = new pc.CylinderGeometry({
    radius: hexSize * 0.85,
    height: 1,
    heightSegments: 1,
    capSegments: 6
  });
  const mesh = pc.Mesh.fromGeometry(device, geometry);
  const meshInstance = new pc.MeshInstance(mesh, material);

  const entity = new pc.Entity('HighlightHex');
  entity.addComponent('render', {
    meshInstances: [meshInstance],
    castShadows: false,
    receiveShadows: false
  });
  entity.setLocalPosition(0, 1.5, 0);

  return entity;
}
