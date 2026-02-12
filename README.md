# Conquistador PlayCanvas

基于 PlayCanvas 2D 的六边形回合制策略游戏引擎。

## 项目结构

```
src/
├── engine/          # 引擎核心层
│   ├── GameEngine.ts      # 主引擎
│   ├── Renderer.ts        # 渲染器
│   ├── Camera.ts          # 相机
│   ├── InputManager.ts    # 输入管理
│   └── EventBus.ts        # 事件总线
├── core/            # 核心数据模型
│   ├── HexGrid.ts         # 六边形网格
│   ├── Tile.ts            # 地块
│   ├── Unit.ts            # 单位
│   └── Player.ts          # 玩家
├── systems/         # 游戏系统
│   ├── GameSystem.ts      # 系统基类
│   ├── MapSystem.ts       # 地图系统
│   ├── EconomySystem.ts   # 经济系统
│   ├── CombatSystem.ts    # 战斗系统
│   ├── DiplomacySystem.ts # 外交系统
│   ├── ResearchSystem.ts   # 研究系统
│   └── MovementSystem.ts  # 移动系统
├── components/      # PlayCanvas 组件
└── main.ts          # 入口文件
```

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 技术栈

- PlayCanvas 2D
- TypeScript
- Vite
