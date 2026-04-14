# Conquistador

![Static Badge](https://img.shields.io/badge/PlayCanvas-red?style=flat&logo=playcanvas&logoColor=white)
![Static Badge](https://img.shields.io/badge/Vue_3-brightgreen?style=flat&logo=vue.js&logoColor=white)
![Static Badge](https://img.shields.io/badge/Vite-brightgreen?style=flat&logo=vite&logoColor=white)
![Static Badge](https://img.shields.io/badge/Pinia-yellow?style=flat&logo=pinia&logoColor=white)
![Static Badge](https://img.shields.io/badge/Vue_Router-brightgreen?style=flat&logo=vue.js&logoColor=white)
![Static Badge](https://img.shields.io/badge/TypeScript-blue?style=flat&logo=typescript&logoColor=white)
![Static Badge](https://img.shields.io/badge/Express-gray?style=flat&logo=express&logoColor=white)
![Static Badge](https://img.shields.io/badge/EventEmitter3-blue?style=flat&logo=typescript&logoColor=white)
![Static Badge](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Static Badge](https://img.shields.io/badge/PostCSS-gray?style=flat&logo=postcss&logoColor=white)

[English](#english) | [中文](#中文)

![image](/image.png)
---

## English

### Overview

Conquistador is a hexagonal strategy game engine built with PlayCanvas 2D, TypeScript, and Vue 3. It features a scene editor, turn-based combat system, building & recruitment system, and supports single-player mode with AI opponent.

### Tech Stack

- **Frontend**: TypeScript + Vue 3 + Vite
- **Renderer**: PlayCanvas 2D
- **State Management**: Pinia
- **Routing**: Vue Router
- **Backend**: Express (for scene/game save API)
- **Styling**: Tailwind CSS + PostCSS

### Quick Start

```bash
# Install dependencies
npm install

# Run development server (frontend only)
npm run dev

# Run backend API server only
npm run server

# Run both frontend and backend
npm run dev:all
```

Visit `http://localhost:5173` after starting the dev server.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run server` | Start Express API server |
| `npm run dev:all` | Run both frontend and backend |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type check |

### Key Features

- **Hexagonal Grid**: Axial coordinate system with neighbor/triangle calculations
- **Scene Editor**: Visual editor for creating terrain, units, and edges
- **Turn-based Combat**: Movement, attack range, and combat resolution
- **Building System**: Construct buildings (city, barracks) on owned tiles
- **Recruitment System**: Recruit military units from buildings (barracks)
- **Dynamic Attributes**: Unit stats scale with HP (configurable via JSON)
- **Multi-unit Stacking**: Multiple units per tile with capacity limits

### Debug Mode

Add `?debug=module` to URL to enable debug logs:

| Parameter | Description |
|-----------|-------------|
| `?debug=combat` | Combat system logs |
| `?debug=movement` | Movement system logs |
| `?debug=selection` | Selection system logs |
| `?debug=building` | Building and recruitment logs |
| `?debug=scene` | Scene loading logs |
| `?debug=ui` | UI event logs |
| `?debug=all` | All debug logs |

### Routes

| Path | Description |
|------|-------------|
| `/` | Home page - Game mode selection |
| `/game` | Game page - Play mode |
| `/editor` | Editor page - Custom map editor |
| `/beta` | Beta features entry |
| `/beta/pathfinding` | Pathfinding test |
| `/beta/movement-range` | Movement range test |
| `/beta/hex-geometry` | Hex geometry visualization |
| `/beta/terrain-viewer` | Terrain texture viewer |

### Building & Recruitment

**Buildings** can be constructed on owned tiles:
- **City**: Generates resource income per turn
- **Barracks**: Allows recruiting military units

**Recruitment** is done through buildings:
- Click on a tile with a building to see recruitment options
- Each building type defines which unit categories it can recruit
- Units cost resources (ducat) to recruit

### Project Structure

```
src/
├── core/               # Core game systems
│   ├── systems/       # Game systems (Map, Movement, Combat, etc.)
│   │   ├── movement/  # Movement system submodules
│   │   │   ├── PathfindingSystem.ts  # Pathfinding (Dijkstra)
│   │   │   ├── TerrainManager.ts     # Terrain groups & movement cost
│   │   │   ├── UnitStateManager.ts   # Unit state (moves, attack status)
│   │   │   └── UnitManager.ts        # Unit CRUD operations
│   │   └── map/     # Map system submodules
│   │       ├── BorderSystem.ts       # Border calculation (BFS)
│   │       └── TerrainRegistry.ts     # Terrain/owner definitions
│   ├── map/           # Hex grid and tile implementations
│   ├── traits/       # Unit traits and combat system
│   ├── unit/         # Unit type definitions
│   ├── constants/   # Shared constants (directions.ts)
│   └── utils/hex/   # Hex utilities (HexMeshUtils.ts)
├── game/             # Game mode implementation
│   ├── systems/      # Input, Selection, Turn systems
│   └── components/  # Game UI components
├── editor/           # Scene editor module
├── stores/           # Pinia stores (game state)
└── ui/               # Vue pages
```

---

## 中文

### 项目简介

Conquistador 是一个基于 PlayCanvas 2D 的六边形策略游戏引擎，使用 TypeScript 和 Vue 3 构建。包含场景编辑器、回合制战斗系统、建造与招募系统，支持单人模式与 AI 对战。

### 技术栈

- **前端**: TypeScript + Vue 3 + Vite
- **渲染器**: PlayCanvas 2D
- **状态管理**: Pinia
- **路由**: Vue Router
- **后端**: Express（提供场景/存档 API）
- **样式**: Tailwind CSS + PostCSS

### 快速开始

```bash
# 安装依赖
npm install

# 运行开发服务器（仅前端）
npm run dev

# 运行后端 API 服务器
npm run server

# 同时运行前端和后端
npm run dev:all
```

启动后访问 `http://localhost:5173`。

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run server` | 启动 Express API 服务器 |
| `npm run dev:all` | 同时运行前端和后端 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产版本 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |

### 核心功能

- **六边形网格**: 使用轴坐标系统，支持邻居/三角形计算
- **场景编辑器**: 可视化编辑地形、单位、边元素
- **回合制战斗**: 移动、攻击范围、战斗结算
- **建造系统**: 在己方地块建造建筑（城市、兵营）
- **招募系统**: 从建筑（兵营）招募军事单位
- **动态属性**: 单位属性随 HP 变化（通过 JSON 配置）
- **多单位堆叠**: 单地块支持多单位，有容量限制

### 调试模式

在 URL 中添加 `?debug=module` 启用调试日志：

| 参数 | 说明 |
|------|------|
| `?debug=combat` | 战斗系统日志 |
| `?debug=movement` | 移动系统日志 |
| `?debug=selection` | 选择系统日志 |
| `?debug=building` | 建造和招募日志 |
| `?debug=scene` | 场景加载日志 |
| `?debug=ui` | UI 事件日志 |
| `?debug=all` | 所有调试日志 |

### 路由

| 路径 | 说明 |
|------|------|
| `/` | 主页 - 游戏模式选择 |
| `/game` | 游戏页面 - 游戏模式 |
| `/editor` | 编辑器页面 - 自定义地图编辑器 |
| `/beta` | Beta 功能入口 |
| `/beta/pathfinding` | 路径查找测试 |
| `/beta/movement-range` | 移动力范围测试 |
| `/beta/hex-geometry` | 六边形几何可视化 |
| `/beta/terrain-viewer` | 地形纹理查看器 |

### 建造与招募

**建筑**可以在己方地块建造：
- **城市**: 每回合产生资源收入
- **兵营**: 允许招募军事单位

**招募**通过建筑进行：
- 点击有建筑的地块查看招募选项
- 每种建筑类型定义可以招募的单位类别
- 招募单位需要消耗资源（金币）

### 项目结构

```
src/
├── core/               # 核心游戏系统
│   ├── systems/       # 游戏系统（地图、移动、战斗等）
│   │   └── movement/  # 移动系统子模块
│   │       ├── PathfindingSystem.ts  # 寻路算法（Dijkstra）
│   │       ├── TerrainManager.ts     # 地形组/移动成本
│   │       ├── UnitStateManager.ts   # 单位状态管理
│   │       └── UnitManager.ts        # 单位 CRUD 操作
│   │   └── map/     # 地图系统子模块
│   │       ├── BorderSystem.ts       # 边境计算（BFS）
│   │       └── TerrainRegistry.ts     # 地形/归属定义管理
│   ├── map/           # 六边形网格和地块实现
│   ├── traits/        # 单位特性和战斗系统
│   ├── unit/          # 单位类型定义
│   ├── constants/     # 共享常量（directions.ts）
│   └── utils/hex/     # 六边形工具函数
├── game/              # 游戏模式实现
│   ├── systems/       # 输入、选择、回合系统
│   └── components/    # 游戏 UI 组件
├── editor/            # 场景编辑器模块
├── stores/            # Pinia 状态管理
└── ui/                # Vue 页面
```
