export default {
  common: {
    appName: 'Conquistador',
    subtitle: '六边形回合制策略游戏',
    start: '开始游戏',
    pause: '暂停',
    resume: '继续',
    reset: '重置'
  },
  entry: {
    title: 'Conquistador',
    subtitle: '六边形回合制策略游戏',
    tags: {
      mapBuilder: '地图构建器',
      engine: 'PlayCanvas'
    },
    description: '选择启动模式开始游戏，支持随机生成地图或自定义创建',
    buttons: {
      randomMap: '生成随机地图',
      customMap: '自定义地图'
    },
    tips: {
      title: '小提示',
      content: '自定义模式下，点击已有地块的空边可添加新地块'
    },
    keyboard: '按 {key} 打开菜单'
  },
  game: {
    terrain: '地形',
    owner: '所有者',
    coordinates: '坐标'
  }
};
