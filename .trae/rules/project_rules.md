# Conquistador — Copilot 使用说明

目标：帮助 AI 代码代理尽快上手本仓库，理解架构、关键入口、运行/调试命令与常见代码模式。

- **主要技术栈**：TypeScript + Vue 3 + Vite + PlayCanvas 2D。项目使用 `pinia`、`vue-router`，本地 API 由 `server/index.ts` 提供（基于 Express）。

- **快速启动**:
  1. `npm install`
  2. `npm run dev:all` — 同时启动前端 (Vite) 和后端 API (`server/index.ts`)。也可单独运行 `npm run dev` 或 `npm run server`。

- **重要脚本**（见 `package.json`）: `dev`, `server`, `dev:all`, `build`, `preview`, `typecheck`, `lint`。

- **核心模块结构**：
  - `src/core`：核心数据模型与子系统的导出（`src/core/index.ts`），包含 `engine`, `map`, `camera`, `entity`, `systems`, `traits` 等子目录。
  - `src/editor`：场景编辑器模块，包含 `EditorSystem`, `SceneManager`, `EditorTools`, `EdgeEditorSystem` 等系统。
  - `src/game`：游戏逻辑模块，包含 `GameModeSystem` 处理回合制和战斗逻辑。
  - `src/ui`：Vue 页面层，包含 `EntryPage`, `GamePage` 等入口页面。
  - `src/stores/`
    - `game.ts`：Pinia store，管理游戏模式、玩家信息、回合状态
    - `gameEvent.ts`：Pinia store，管理游戏事件（单位选择、战斗结果、回合切换等），供 UI 响应式使用
  - `src/core/utils`：工具函数目录，包含 `debug.ts`（调试系统）、`IconResolver.ts`（图标解析）等
  - `src/core/config.ts`：全局配置，包含 `debugConfig` 调试开关配置
  - `src/locales`：国际化文件 (`en-US.ts`, `zh-CN.ts`)。
  - `src/core/engine`：`GameEngine`、`Renderer` 等 PlayCanvas 相关的封装（游戏循环、渲染层、输入、事件总线）。
  - `src/core/systems`：游戏系统目录，包含以下系统：
    - `MapSystem`：地图数据管理、地形渲染、边境计算
    - `CameraControlSystem`：相机控制（平移、缩放）
    - `EdgeSystem`：边元素管理（河流、道路、屏障等）
    - `MovementSystem`：单位移动范围计算
    - `UnitRenderSystem`：单位渲染
    - `GameSystem`：系统基类接口
  - `src/core/map`：六边形网格与地块实现（`HexGrid`, `Tile`, `Edge`）。
  - `src/core/traits`：特性系统（`TraitManager`, `CombatSystem`），定义单位特性如 `infantry`, `sword`, `archer` 等。
  - `server/index.ts`：提供场景与存档的 REST API，读写 `public/scenarios` 和 `public/game_saves` 下的 JSON 文件。

- **关键入口示例**：
  - 引擎启动：`src/main.ts` -> `startGame(mode)`（会创建 `GameEngine`、添加系统并调用 `engine.start()`）。
  - Canvas 元素：页面上 `id="gameCanvas"`（参见 `src/ui/GamePage.vue`），PlayCanvas 应用绑定到该画布。
  - 后端：`server/index.ts` 提供 `/api/scenes` 和 `/api/game_saves` 一系列 CRUD 接口以及示例场景生成逻辑。
  - 路由配置（`src/router/index.ts`）：
    - `/` - 主页 (`EntryPage.vue`)
    - `/game` - 游戏页面 (`GamePage.vue`)
    - `/beta` - Beta 功能入口页 (`BetaEntryPage.vue`)
    - `/beta/pathfinding` - 路径查找测试页
    - `/beta/movement-range` - 移动力范围测试页

- **系统模型**：通过 `engine.addSystem(system)` 注册，代理会调用 `system.initialize()`，每帧在 `GameEngine.update(dt)` 中调用 `system.update(dt)`。

- **事件总线**：`EventBus` 用于引擎内部跨系统事件解耦（`getEventBus()` 在 `GameEngine` 中可用）。
  - 引擎 → UI 通信使用 **Pinia store**（`src/stores/gameEvent.ts`），UI 组件通过 `watch` 监听状态变化

- **渲染分层**：`Renderer` 在 `src/core/engine/Renderer.ts` 创建 `TileLayer` / `UnitLayer` / `EffectLayer`，建议在渲染相关变更时操作这些层。

- **地图坐标**：六边形坐标转换与邻居计算位于 `src/core/map/HexGrid.ts`，使用 `hexToPixel` / `pixelToHex` / `getNeighbors()` 等方法。

- **数据文件格式**：场景与存档以 JSON 保存，`manifest.json` 包含 `settings`（例如 `hexSize`），示例位于 `public/scenarios/example_battlefield`。

- **编辑器模块** (`src/editor`)：场景编辑器核心系统
  - `EditorSystem`：编辑器主系统，处理整体编辑流程
  - `SelectionSystem`：地块/单位选择系统
  - `EditorTools`：编辑工具集（选择、绘制、擦除等）
  - `EditorInputHandler`：编辑器输入处理
  - `SceneManager`：场景数据管理
  - `EdgeEditorSystem`：边元素编辑器
  - `EditorUI`：编辑器 UI 组件（`src/editor/components/`）

- **边（Edge）相关操作**：
  - 边索引映射：六边形的边索引和方向索引之间有特殊映射关系，使用 `directionToEdge` 对象转换：
    ```typescript
    const directionToEdge: { [key: number]: number } = {
      0: 1,
      1: 0,
      2: 5,
      3: 4,
      4: 3,
      5: 2
    };
    ```
  - 公共边识别：使用 `HexGrid.getSharedEdge(tileA, tileB)` 获取两个相邻地块的公共边信息，返回 `{ edgeA: number; edgeB: number }`
  - 邻居关系：使用 `HexGrid.areNeighbors(tileA, tileB)` 判断两个地块是否相邻
  - 国家边境：在 `MapSystem.calculateBorderEdges()` 中计算地块的边境边，参考 `src/core/systems/MapSystem.ts:313-340`
  - 边境渲染：多层梯形网格渐变渲染，参考 `src/components/HexTile.ts` 中的 `createBorderTrapezoids()` 方法
  - **边（Edge）系统**：
    - ECS 架构：边元素使用 Entity-Component-System 模式，由 `EdgeSystem` (`src/core/systems/EdgeSystem.ts`) 管理
    - 边类型定义：支持 `river`（河流）、`barrier`（屏障）、`road`（道路）、`wall`（城墙）
    - 边渲染配置：通过 `getEdgeConfig(type)` 获取配置，使用 `setEdgeConfigs(configs)` 动态设置
    - 边持久化：边数据保存在 `edges.json`，格式为 `EdgeInstance[]`
    - 边类型配置：场景可自定义边的渲染样式，定义在 `edge_types.json`

- **开发与调试提示（针对 AI 代理）**：
  - 若需要同时查看前后端日志，运行 `npm run dev:all`（或分别运行 `npm run dev` 与 `npm run server`）。后端会打印每个请求的时间/路径（见 `server/index.ts` 的中间件）。
  - 直接调试游戏循环或系统逻辑时，查阅 `src/core/engine/GameEngine.ts`（游戏循环、`update(dt)` 流程）与各 `systems/*` 的 `update` 实现。
  - 编辑场景数据时优先使用 `public/scenarios/*` 下的示例结构：`manifest.json`, `terrain_types.json`, `owner_tags.json`, `tiles.json`, `edges.json`, `edge_types.json`。API 接口期望这些字段。
  - 调试公共边显示时，可使用编辑器的调试模式（在帮助面板中开启），点击两个相邻地块查看公共边
  - **调试日志**：编辑器的边相关日志可通过 URL 参数启用：
    - `?debug=edge` - EdgeSystem 日志
    - `?debug=scene` - SceneManager 日志
    - `?debug=api` - sceneApi 日志
    - `?debug=all` - 全部日志
    - 多个模块可组合使用：用逗号分隔，如 `?debug=edge,scene` 同时启用 EdgeSystem 和 SceneManager 日志

- **代码修改注意事项**：
  - 保持系统初始化与帧更新分离（不要在 `initialize()` 中执行每帧逻辑）。
  - 渲染层 API 是显式的：添加/删除实体应通过 `Renderer` 提供的 layer 实体（`getTileLayer()` 等）。
  - 不要移动 canvas 元素 id（`gameCanvas`），前端启动流程依赖该 id。
  - **数据配置分离原则**：程序代码应与数据配置分离
    - 地形类型、地块拥有者、边类型等数据应放在场景/存档 JSON 文件中（`terrain_types.json`、`owner_tags.json`、`edge_types.json`）
    - 程序只提供数据接口（如 `getTerrainDefinition()`、`getEdgeConfig()`）和加载函数（`setTerrainTypes()`、`setEdgeConfigs()`）
    - 场景加载时从 JSON 文件读取数据并通过接口注入到系统中
    - 默认配置仅作为回退（`DEFAULT_TERRAIN_TYPES`、`DEFAULT_EDGE_CONFIGS`）
  - **状态管理原则**：游戏状态使用 Pinia 管理，避免 EventBus
    - 引擎内部通信可使用 EventBus（如输入、系统间事件）
    - 引擎 → UI 通信使用 Pinia store（`src/stores/gameEvent.ts`）
    - UI 组件通过 `watch` 监听 Pinia store 变化响应游戏状态更新

- **快速例子片段**（可供 AI 参考）：
  - 启动引擎：`startGame(mode)` 在 `src/main.ts`。
  - 注册系统：`engine.addSystem(new MapSystem(engine, 50))`
  - 读取场景（后端）：`GET /api/scenes/:id` -> 返回包含 `terrainTypes`, `ownerTags`, `tiles` 的 JSON。
  - 获取公共边：
    ```typescript
    const sharedEdge = grid.getSharedEdge(tileA, tileB);
    if (sharedEdge) {
      console.log(`公共边: tileA的边${sharedEdge.edgeA} 和 tileB的边${sharedEdge.edgeB}`);
    }
    ```

- **战斗系统实现**：
  - 核心逻辑位于 `src/game/GameModeSystem.ts`，负责回合管理、攻击范围检测和单位控制
  - 攻击范围检测使用六边形距离计算（Axial 坐标系）：
    ```typescript
    // 正确的六边形距离计算公式（用于攻击范围检测）
    const distance = (Math.abs(q - unitPos.q) + Math.abs(q + r - unitPos.q - unitPos.r) + Math.abs(r - unitPos.r)) / 2;
    ```
    注意：必须除以 2 才能得到正确的六边形距离
  - 单位攻击范围通过 `getUnitRange(unit)` 方法获取，基于单位特性（traits）计算
  - 攻击目标检测：在 `highlightAttackableTiles()` 中，遍历范围内地块，检查是否有敌方单位
  - 攻击执行：点击可攻击地块时调用 `executeAttack(targetTile)` 方法处理战斗

- **热座（Hotseat）多人模式**：
  - 游戏类型定义在 `src/stores/game.ts` 的 `GameType` 枚举：`single` | `hotseat`
  - `GameModeSystem.ts` 维护 `currentPlayerIndex` 管理当前玩家
  - 回合切换：通过 `endTurn()` 方法切换当前玩家，触发 UI 更新
  - 单位行动限制：单位只能由其所有者控制，每个单位有 `hasMoved` 和 `hasAttacked` 标记

- **单位数据格式**（`units.json`）：
  ```json
  {
    "id": "unit_swordsman_01",
    "q": 2,
    "r": -1,
    "owner": "player",
    "traits": ["infantry", "sword", "chainmail", "shield"],
    "hp": 100
  }
  ```

- **调试日志**：
  - 战斗系统调试：使用统一的调试函数 `debug`（见下方调试系统规范）
  - 关键日志包括：`Unit range`、`Attackable tiles`、`Canvas clicked` 等
  - 使用 `src/core/engine/EventBus` 进行跨系统通信

- **战斗系统扩展功能**：
  - 单位一回合只能进攻一次：进攻后设置 `hasAttacked` 状态并清空移动力
    - 核心实现在 `MovementSystem.ts`：`setAttacked()`、`canAttack()`、`clearMovement()` 方法
    - `resetAllMoves()` 会同时重置 `hasAttacked` 状态
  - 战斗后攻击方深色遮罩：
    - `UnitRenderSystem.ts` 中维护 `unitOriginalColors` Map 存储原始颜色
    - `playDamageAnimation()` 结束后调用 `applyAttackedTint()` 应用深色（原始颜色 × 0.5）
    - `endTurn()` 时调用 `restoreUnitColor()` 恢复当前玩家单位颜色
  - 防守方射程不足无法反击：
    - `GameModeSystem.ts` 中 `executeAttack()` 计算攻击距离和防守方射程
    - `CombatSystem.ts` 的 `executeCombat()` 新增 `canDefenderCounterAttack` 参数
    - 防守方射程 < 距离时，反击伤害为 0

- **属性随HP变化系统**（配置驱动）：
  - 核心文件：`src/core/traits/StateCalculator.ts` - 算法实现
  - 类型定义在 `src/core/traits/types.ts`：
    - `EffectType`: `'linear' | 'threshold' | 'percentage'`
    - `StateEffect`: 状态效果接口，属性由 JSON 配置决定
  - 算法说明：
    - **linear**: `属性 = 基础值 × (当前HP/最大HP)`，结果取整
    - **threshold**: 当HP低于阈值时按比例衰减，可设置最低百分比
    - **percentage**: 每损失1%HP，属性减少指定百分比
  - 使用方式：在 `Trait` 接口中添加 `stateEffects` 数组，配置在 JSON 文件中
  - 示例配置（traits.json）：
    ```json
    "infantry": {
      "stateEffects": [
        { "state": "hp", "stat": "attack", "type": "linear" },
        { "state": "hp", "stat": "defense", "type": "linear" },
        { "state": "hp", "stat": "movement", "type": "threshold", "value": 50, "minPercent": 50 }
      ]
    }
    ```
  - 扩展性：新增其他状态（如MP、士气）只需在 JSON 中配置，程序无需修改

- **调试系统规范**（统一调试输出）：
  - 调试配置位于 `src/core/config.ts` 的 `debugConfig`
  - 调试函数位于 `src/core/utils/debug.ts`，使用 `debug.xxx()` 格式调用
  - 游戏模块：`debug.combat()`、`debug.movement()`、`debug.selection()`、`debug.ui()`
  - 编辑器模块：`debug.editor('edgeSystem', message)` 等
  
  **使用示例**：
  ```typescript
  import { debug } from '../core/utils/debug'
  
  debug.combat('Combat result:', result)
  debug.movement('Moved to', q, r)
  debug.selection('Selected unit:', unitId)
  debug.ui('Turn ended', turn)
  debug.editor('edgeSystem', 'Edge created', edgeId)
  ```
  
  **启用调试**：通过 URL 参数 `?debug=module1,module2,all`
  - 游戏：`?debug=combat` 或 `?debug=movement,selection,ui` 或 `?debug=all`
  - 编辑器：`?debug=edge` 或 `?debug=scene,api` 或 `?debug=all`
  - URL 参数会动态设置 `debugConfig` 中的开关

如果有你想补充的本地约定或遗漏的运行细节，请告诉我，我会迭代合并进这份文件。
