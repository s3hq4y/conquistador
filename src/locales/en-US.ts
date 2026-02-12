export default {
  common: {
    appName: 'Conquistador',
    subtitle: 'Hexagonal Turn-based Strategy Game',
    start: 'Start Game',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset'
  },
  entry: {
    title: 'Conquistador',
    subtitle: 'Hexagonal Turn-based Strategy Game',
    tags: {
      mapBuilder: 'Map Builder',
      engine: 'PlayCanvas'
    },
    description: 'Choose a mode to start the game. Supports random map generation or custom creation.',
    buttons: {
      randomMap: 'Generate Random Map',
      customMap: 'Custom Map'
    },
    tips: {
      title: 'Tip',
      content: 'In custom mode, click on empty edges of existing tiles to add new tiles'
    },
    keyboard: 'Press {key} to open menu'
  },
  game: {
    terrain: 'Terrain',
    owner: 'Owner',
    coordinates: 'Coordinates'
  }
};
