import { Icon, IconDefinition, parseIcon } from '../map';

export interface ResolvedIcon {
  type: 'emoji' | 'svg' | 'image';
  content: string;
  isExternal: boolean;
}

export class IconResolver {
  private cache: Map<string, ResolvedIcon> = new Map();
  private basePath: string;

  constructor(basePath: string = '') {
    this.basePath = basePath;
  }

  setBasePath(path: string): void {
    this.basePath = path;
  }

  resolve(icon: Icon): ResolvedIcon {
    const def = parseIcon(icon);
    const cacheKey = JSON.stringify(def);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const resolved = this.resolveIcon(def);
    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  private resolveIcon(def: IconDefinition): ResolvedIcon {
    switch (def.type) {
      case 'emoji':
        return {
          type: 'emoji',
          content: def.value || '',
          isExternal: false
        };

      case 'svg':
        if (def.path) {
          return {
            type: 'svg',
            content: this.resolvePath(def.path),
            isExternal: true
          };
        }
        return {
          type: 'svg',
          content: def.value || '',
          isExternal: false
        };

      case 'image':
        return {
          type: 'image',
          content: this.resolvePath(def.path || ''),
          isExternal: true
        };

      default:
        return {
          type: 'emoji',
          content: '',
          isExternal: false
        };
    }
  }

  private resolvePath(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      return path;
    }
    return this.basePath ? `${this.basePath}/${path}` : path;
  }

  toHTMLElement(icon: Icon, options: { size?: number; className?: string } = {}): HTMLElement {
    const { size = 24, className = '' } = options;
    const resolved = this.resolve(icon);
    const element = document.createElement('span');
    
    if (className) {
      element.className = className;
    }

    switch (resolved.type) {
      case 'emoji':
        element.textContent = resolved.content;
        element.style.fontSize = `${size}px`;
        element.style.lineHeight = '1';
        break;

      case 'svg':
        if (resolved.isExternal) {
          const img = document.createElement('img');
          img.src = resolved.content;
          img.width = size;
          img.height = size;
          element.appendChild(img);
        } else {
          element.innerHTML = resolved.content;
          const svg = element.querySelector('svg');
          if (svg) {
            svg.setAttribute('width', String(size));
            svg.setAttribute('height', String(size));
          }
        }
        break;

      case 'image':
        const img = document.createElement('img');
        img.src = resolved.content;
        img.width = size;
        img.height = size;
        element.appendChild(img);
        break;
    }

    return element;
  }

  toHTML(icon: Icon, options: { size?: number; className?: string } = {}): string {
    const element = this.toHTMLElement(icon, options);
    return element.outerHTML;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const iconResolver = new IconResolver();
