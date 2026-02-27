import * as pc from 'playcanvas';
import { debug } from './debug';

export class TextureManager {
  private app: pc.Application;
  private textureCache = new Map<string, pc.Texture>();

  constructor(app: pc.Application) {
    this.app = app;
  }

  async loadTexture(path: string, rotateDegrees: number = 0): Promise<pc.Texture | null> {
    const cacheKey = rotateDegrees > 0 ? `${path}_processed` : path;
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`/${path}`);
      if (!response.ok) {
        debug.texture(`Failed to load texture: ${path}`);
        return null;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      return new Promise<pc.Texture | null>((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          let finalImage: HTMLImageElement | HTMLCanvasElement = img;
          
          if (rotateDegrees !== 0) {
            finalImage = this.rotateImage(img, rotateDegrees);
          }
          
          const texture = new pc.Texture(this.app.graphicsDevice, {
            width: finalImage.width,
            height: finalImage.height,
            format: pc.PIXELFORMAT_RGBA8,
            mipmaps: true,
            minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
            magFilter: pc.FILTER_LINEAR,
            addressU: pc.ADDRESS_CLAMP_TO_EDGE,
            addressV: pc.ADDRESS_CLAMP_TO_EDGE
          });

          texture.setSource(finalImage);
          URL.revokeObjectURL(url);
          
          this.textureCache.set(cacheKey, texture);
          debug.texture(`Loaded texture: ${cacheKey}`);
          resolve(texture);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          debug.texture(`Failed to create texture: ${path}`);
          resolve(null);
        };
        
        img.src = url;
      });
    } catch (error) {
      debug.texture(`Error loading texture ${path}:`, error);
      return null;
    }
  }

  /**
   * 用 Canvas 旋转图片
   */
  private rotateImage(img: HTMLImageElement, degrees: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // 旋转90°需要交换宽高
    const is90Degree = degrees % 180 !== 0;
    canvas.width = is90Degree ? img.height : img.width;
    canvas.height = is90Degree ? img.width : img.height;
    
    // 移动到中心，旋转，再移回
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    
    return canvas;
  }

  getTexture(path: string, rotateDegrees: number = 0): pc.Texture | undefined {
    const cacheKey = rotateDegrees > 0 ? `${path}_processed` : path;
    return this.textureCache.get(cacheKey);
  }

  hasTexture(path: string, rotateDegrees: number = 0): boolean {
    const cacheKey = rotateDegrees > 0 ? `${path}_processed` : path;
    return this.textureCache.has(cacheKey);
  }

  clearCache(): void {
    this.textureCache.clear();
  }
}
