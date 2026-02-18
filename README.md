# Conquistador

[English](#english) | [中文](#中文)

---

<a name="english"></a>

## English

### Overview

Conquistador is a hexagonal turn-based strategy game built with PlayCanvas 2D rendering engine. It features a complete map editor, turn-based gameplay system, and internationalization support.

### Features

- **Hexagonal Grid System**: Efficient hex coordinate system with neighbor calculation and pathfinding
- **Map Editor**: Full-featured terrain and border editing tools
- **Turn-Based Gameplay**: Unit movement, combat, and resource management
- **Internationalization**: Supports English and Simplified Chinese
- **Modern Tech Stack**: Vue 3, TypeScript, Vite, PlayCanvas

### Tech Stack

| Technology | Purpose |
|------------|---------|
| Vue 3 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| PlayCanvas 2D | Game Rendering |
| Pinia | State Management |
| Vue Router | Routing |
| Vue I18n | Internationalization |
| TailwindCSS | Styling |

### Quick Start

```bash
# Install dependencies
npm install

# Start development server (frontend only)
npm run dev

# Start backend API server
npm run server

# Start both frontend and backend
npm run dev:all

# Build for production
npm run build

# Type checking
npm run typecheck
```

### Project Structure

```
src/
├── core/           # Core game engine and systems
│   ├── engine/     # GameEngine, Renderer
│   ├── map/        # HexGrid, Tile, Edge
│   ├── systems/    # Game systems (Map, Movement, Unit, etc.)
│   └── entity/     # Game entities (Unit, Player)
├── editor/         # Map editor components and systems
├── game/           # Game mode logic and UI
├── ui/             # Vue UI components
├── locales/        # i18n translation files
├── stores/         # Pinia state stores
└── router/         # Vue Router configuration
```

### Game Controls

| Key | Action |
|-----|--------|
| Left Click | Select tile/unit |
| Right Click | Context menu |
| Scroll | Zoom in/out |
| Drag | Pan camera |
| ESC | Open menu |

### Development

#### Adding a New Game System

1. Create a new system class extending `GameSystem`:
```typescript
export class MySystem extends GameSystem {
  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    // Initialize system
  }

  update(dt: number): void {
    // Update logic
  }

  dispose(): void {
    // Cleanup
  }
}
```

2. Register the system in `GameSetup.ts`

#### Adding Translations

1. Add keys to `src/locales/zh-CN.ts` and `src/locales/en-US.ts`
2. Use in Vue components:
```vue
<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <div>{{ t('common.start') }}</div>
</template>
```

### License

MIT

---

<a name="中文"></a>

## 中文

### 概述

Conquistador 是一款基于 PlayCanvas 2D 渲染引擎开发的六边形回合制策略游戏。具有完整的地图编辑器、回合制游戏系统和国际化支持。

### 功能特性

- **六边形网格系统**：高效的六边形坐标系统，支持邻居计算和寻路
- **地图编辑器**：完整的地形和边界编辑工具
- **回合制玩法**：单位移动、战斗和资源管理
- **国际化**：支持英文和简体中文
- **现代技术栈**：Vue 3、TypeScript、Vite、PlayCanvas

### 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| PlayCanvas 2D | 游戏渲染 |
| Pinia | 状态管理 |
| Vue Router | 路由 |
| Vue I18n | 国际化 |
| TailwindCSS | 样式 |

### 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（仅前端）
npm run dev

# 启动后端 API 服务器
npm run server

# 同时启动前端和后端
npm run dev:all

# 生产构建
npm run build

# 类型检查
npm run typecheck
```

### 项目结构

```
src/
├── core/           # 核心游戏引擎和系统
│   ├── engine/     # GameEngine, Renderer
│   ├── map/        # HexGrid, Tile, Edge
│   ├── systems/    # 游戏系统（地图、移动、单位等）
│   └── entity/     # 游戏实体（单位、玩家）
├── editor/         # 地图编辑器组件和系统
├── game/           # 游戏模式逻辑和 UI
├── ui/             # Vue UI 组件
├── locales/        # 国际化翻译文件
├── stores/         # Pinia 状态存储
└── router/         # Vue Router 配置
```

### 游戏操作

| 按键 | 操作 |
|------|------|
| 左键点击 | 选择地块/单位 |
| 右键点击 | 上下文菜单 |
| 滚轮 | 缩放 |
| 拖拽 | 移动视角 |
| ESC | 打开菜单 |

### 开发指南

#### 添加新的游戏系统

1. 创建继承 `GameSystem` 的系统类：
```typescript
export class MySystem extends GameSystem {
  constructor(engine: GameEngine) {
    super(engine);
  }

  initialize(): void {
    // 初始化系统
  }

  update(dt: number): void {
    // 更新逻辑
  }

  dispose(): void {
    // 清理资源
  }
}
```

2. 在 `GameSetup.ts` 中注册系统

#### 添加翻译

1. 在 `src/locales/zh-CN.ts` 和 `src/locales/en-US.ts` 中添加翻译键
2. 在 Vue 组件中使用：
```vue
<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <div>{{ t('common.start') }}</div>
</template>
```

### 许可证

MIT
