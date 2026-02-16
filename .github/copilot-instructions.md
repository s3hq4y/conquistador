# Conquistador — Copilot 使用说明

目标：帮助 AI 代码代理尽快上手本仓库，理解架构、关键入口、运行/调试命令与常见代码模式。

- **主要技术栈**：TypeScript + Vue 3 + Vite + PlayCanvas 2D。项目使用 `pinia`、`vue-router`，本地 API 由 `server/index.ts` 提供（基于 Express）。

- **快速启动**:
  1. `npm install`
  2. `npm run dev:all` — 同时启动前端 (Vite) 和后端 API (`server/index.ts`)。也可单独运行 `npm run dev` 或 `npm run server`。

- **重要脚本**（见 `package.json`）: `dev`, `server`, `dev:all`, `build`, `preview`, `typecheck`。

- **项目高层架构**：
  - `src/core`：核心数据模型与子系统的导出（`src/core/index.ts`），包含 `engine`, `map`, `camera`, `entity`, `systems` 等子目录。
  - `src/core/engine`：`GameEngine`、`Renderer` 等 PlayCanvas 相关的封装（游戏循环、渲染层、输入、事件总线）。
  - `src/core/map`：六边形网格与地块实现（`HexGrid`, `Tile`）。
  - `src/systems`：游戏系统（地图、经济、战斗、外交等），每个系统遵循 `GameSystem` 基类接口，具有 `initialize()` 和 `update(dt)`。
  - `server/index.ts`：提供场景与存档的 REST API，读写 `public/scenarios` 和 `public/game_saves` 下的 JSON 文件。
  - `src/ui` / `src/game`：Vue 层，UI 与游戏逻辑的桥梁。`src/ui/GamePage.vue` 挂载画布并在 `onMounted` 时通过 `startGame` 启动引擎。

- **关键入口示例**：
  - 引擎启动：`src/main.ts` -> `startGame(mode)`（会创建 `GameEngine`、添加系统并调用 `engine.start()`）。
  - Canvas 元素：页面上 `id="gameCanvas"`（参见 `src/ui/GamePage.vue`），PlayCanvas 应用绑定到该画布。
  - 后端：`server/index.ts` 提供 `/api/scenes` 和 `/api/game_saves` 一系列 CRUD 接口以及示例场景生成逻辑。

- **常见代码模式 / 约定**：
  - 系统模型：通过 `engine.addSystem(system)` 注册，代理会调用 `system.initialize()`，每帧在 `GameEngine.update(dt)` 中调用 `system.update(dt)`。
  - 事件总线：`EventBus` 用于跨系统、UI 与引擎的事件解耦（`getEventBus()` 在 `GameEngine` 中可用）。
  - 渲染分层：`Renderer` 在 `src/core/engine/Renderer.ts` 创建 `TileLayer` / `UnitLayer` / `EffectLayer`，建议在渲染相关变更时操作这些层。
  - 地图坐标：六边形坐标转换与邻居计算位于 `src/core/map/HexGrid.ts`，使用 `hexToPixel` / `pixelToHex` / `getNeighbors()` 等方法。
  - 数据文件格式：场景与存档以 JSON 保存，`manifest.json` 包含 `settings`（例如 `hexSize`），示例位于 `public/scenarios/example_battlefield`。
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

- **开发与调试提示（针对 AI 代理）**：
  - 若需要同时查看前后端日志，运行 `npm run dev:all`（或分别运行 `npm run dev` 与 `npm run server`）。后端会打印每个请求的时间/路径（见 `server/index.ts` 的中间件）。
  - 直接调试游戏循环或系统逻辑时，查阅 `src/core/engine/GameEngine.ts`（游戏循环、`update(dt)` 流程）与各 `systems/*` 的 `update` 实现。
  - 编辑场景数据时优先使用 `public/scenarios/*` 下的示例结构：`manifest.json`, `terrain_types.json`, `owner_tags.json`, `tiles.json`。API 接口期望这些字段。
  - 调试公共边显示时，可使用编辑器的调试模式（在帮助面板中开启），点击两个相邻地块查看公共边

- **代码修改注意事项**：
  - 保持系统初始化与帧更新分离（不要在 `initialize()` 中执行每帧逻辑）。
  - 渲染层 API 是显式的：添加/删除实体应通过 `Renderer` 提供的 layer 实体（`getTileLayer()` 等）。
  - 不要移动 canvas 元素 id（`gameCanvas`），前端启动流程依赖该 id。

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

如果有你想补充的本地约定或遗漏的运行细节，请告诉我，我会迭代合并进这份文件。
