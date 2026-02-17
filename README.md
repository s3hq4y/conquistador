# Conquistador

一个使用 TypeScript、Vue 3 和 PlayCanvas 2D 实现的回合制/策略样例项目（游戏引擎与编辑器原型）。

## 快速开始

先安装依赖：

```bash
npm install
```

开发时同时启动前端与后端 API：

```bash
npm run dev:all
```

也可以单独运行：

```bash
npm run dev       # 启动前端 (Vite)
npm run server    # 启动后端 API
```

## 常用脚本

- `dev` — 启动前端开发服务器
- `server` — 启动本地后端 API（`server/index.ts`）
- `dev:all` — 同时启动前端与后端
- `build` — 打包生产构建
- `preview` — 预览构建产物
- `typecheck` — TypeScript 类型检查

（具体脚本请参见 `package.json`）

## 项目结构要点

- `src/`：前端源代码
  - `core/`：游戏引擎封装（`GameEngine`, `Renderer` 等）
  - `map/`：六边形网格与地块实现（`HexGrid`, `Tile`）
  - `systems/`：游戏系统（地图、相机、编辑器等）
  - `ui/`：Vue 页面与组件（如 `GamePage.vue`）
- `server/`：本地 API（`server/index.ts`），读写 `public/scenarios` 与 `public/game_saves`
- `public/`：示例场景与存档数据

关键入口：`src/main.ts` -> `startGame(mode)`，画布元素 id 为 `gameCanvas`。

## 编辑与场景数据

示例场景和存档位于 `public/scenarios` 与 `public/game_saves`，格式为 JSON，包含 `manifest.json`, `tiles.json`, `terrain_types.json` 等。

## 开发提示

- 编辑游戏/系统时遵循 `systems/*` 中的 `GameSystem` 约定：在 `initialize()` 中完成初始化，在 `update(dt)` 中处理帧逻辑。
- 渲染请通过 `Renderer` 的 layer API（例如 tile/unit/effect 层）进行实体添加/删除。
- 使用 `npm run dev:all` 同时查看前后端日志，后端会打印每个请求的时间/路径。

## 贡献

欢迎提交 PR、问题或场景示例。请在提交前运行类型检查并尽量保留代码风格一致性。

---

更多细节请查看仓库内的文档与源代码（例如 `src/core/engine/GameEngine.ts`, `server/index.ts`）。
