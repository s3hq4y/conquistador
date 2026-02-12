import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3003;
const SCENES_DIR = path.join(__dirname, '..', 'scenes');

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

async function ensureScenesDir() {
  try {
    await fs.mkdir(SCENES_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create scenes directory:', error);
  }
}

app.get('/api/scenes', async (req, res) => {
  try {
    const dirs = await fs.readdir(SCENES_DIR);
    const scenes = [];
    
    for (const dir of dirs) {
      const scenePath = path.join(SCENES_DIR, dir);
      const stat = await fs.stat(scenePath);
      
      if (stat.isDirectory()) {
        try {
          const manifestPath = path.join(scenePath, 'manifest.json');
          const manifestData = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestData);
          scenes.push({
            id: dir,
            name: manifest.name,
            description: manifest.description,
            author: manifest.author,
            modifiedAt: manifest.modifiedAt
          });
        } catch {
          scenes.push({
            id: dir,
            name: dir,
            description: '',
            author: 'Unknown',
            modifiedAt: stat.mtime.toISOString()
          });
        }
      }
    }
    
    res.json({ success: true, scenes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list scenes' });
  }
});

app.get('/api/scenes/:id', async (req, res) => {
  try {
    const sceneId = req.params.id;
    const scenePath = path.join(SCENES_DIR, sceneId);
    
    const [manifestData, terrainData, ownerData, tilesData] = await Promise.all([
      fs.readFile(path.join(scenePath, 'manifest.json'), 'utf-8'),
      fs.readFile(path.join(scenePath, 'terrain_types.json'), 'utf-8'),
      fs.readFile(path.join(scenePath, 'owner_tags.json'), 'utf-8'),
      fs.readFile(path.join(scenePath, 'tiles.json'), 'utf-8')
    ]);
    
    const manifest = JSON.parse(manifestData);
    const terrainTypes = JSON.parse(terrainData);
    const ownerTags = JSON.parse(ownerData);
    const tiles = JSON.parse(tilesData);
    
    res.json({
      success: true,
      scene: {
        ...manifest,
        terrainTypes,
        ownerTags,
        tiles
      }
    });
  } catch (error) {
    res.status(404).json({ success: false, error: 'Scene not found' });
  }
});

app.post('/api/scenes', async (req, res) => {
  try {
    const { id, name, description, author, settings, terrainTypes, ownerTags, tiles } = req.body;
    
    const sceneId = id || `scene_${Date.now()}`;
    const scenePath = path.join(SCENES_DIR, sceneId);
    
    await fs.mkdir(scenePath, { recursive: true });
    
    const now = new Date().toISOString();
    
    const manifest = {
      version: '2.0.0',
      id: sceneId,
      name: name || '新场景',
      description: description || '',
      author: author || 'Anonymous',
      createdAt: now,
      modifiedAt: now,
      settings: settings || {
        hexSize: 50,
        defaultTerrain: 'plains',
        defaultOwner: 'neutral'
      }
    };
    
    await Promise.all([
      fs.writeFile(path.join(scenePath, 'manifest.json'), JSON.stringify(manifest, null, 2)),
      fs.writeFile(path.join(scenePath, 'terrain_types.json'), JSON.stringify(terrainTypes || [], null, 2)),
      fs.writeFile(path.join(scenePath, 'owner_tags.json'), JSON.stringify(ownerTags || [], null, 2)),
      fs.writeFile(path.join(scenePath, 'tiles.json'), JSON.stringify(tiles || [], null, 2))
    ]);
    
    res.json({ success: true, sceneId, message: 'Scene saved successfully' });
  } catch (error) {
    console.error('Failed to save scene:', error);
    res.status(500).json({ success: false, error: 'Failed to save scene' });
  }
});

app.put('/api/scenes/:id', async (req, res) => {
  try {
    const sceneId = req.params.id;
    const { name, description, author, settings, terrainTypes, ownerTags, tiles } = req.body;
    
    const scenePath = path.join(SCENES_DIR, sceneId);
    
    const manifestData = await fs.readFile(path.join(scenePath, 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestData);
    
    const now = new Date().toISOString();
    
    const updatedManifest = {
      ...manifest,
      name: name || manifest.name,
      description: description !== undefined ? description : manifest.description,
      author: author || manifest.author,
      modifiedAt: now,
      settings: settings || manifest.settings
    };
    
    await Promise.all([
      fs.writeFile(path.join(scenePath, 'manifest.json'), JSON.stringify(updatedManifest, null, 2)),
      fs.writeFile(path.join(scenePath, 'terrain_types.json'), JSON.stringify(terrainTypes || [], null, 2)),
      fs.writeFile(path.join(scenePath, 'owner_tags.json'), JSON.stringify(ownerTags || [], null, 2)),
      fs.writeFile(path.join(scenePath, 'tiles.json'), JSON.stringify(tiles || [], null, 2))
    ]);
    
    res.json({ success: true, message: 'Scene updated successfully' });
  } catch (error) {
    console.error('Failed to update scene:', error);
    res.status(500).json({ success: false, error: 'Failed to update scene' });
  }
});

app.delete('/api/scenes/:id', async (req, res) => {
  try {
    const sceneId = req.params.id;
    const scenePath = path.join(SCENES_DIR, sceneId);
    
    await fs.rm(scenePath, { recursive: true, force: true });
    
    res.json({ success: true, message: 'Scene deleted successfully' });
  } catch (error) {
    console.error('Failed to delete scene:', error);
    res.status(500).json({ success: false, error: 'Failed to delete scene' });
  }
});

async function createExampleScene() {
  const examplePath = path.join(SCENES_DIR, 'example_battlefield');
  
  try {
    await fs.access(examplePath);
    console.log('Example scene already exists');
    return;
  } catch {
    // 目录不存在，继续创建
  }
  
  await fs.mkdir(examplePath, { recursive: true });
  
  const now = new Date().toISOString();
  
  const manifest = {
    version: '2.0.0',
    id: 'example_battlefield',
    name: '示例战场',
    description: '一个包含多种地形和势力的示例场景，展示场景编辑器的功能',
    author: 'System',
    createdAt: now,
    modifiedAt: now,
    settings: {
      hexSize: 50,
      defaultTerrain: 'plains',
      defaultOwner: 'neutral'
    }
  };
  
  const terrainTypes = [
    { id: 'plains', name: 'Plains', nameZh: '平原', color: '#59a640', description: '基础地形，适合建造和发展', icon: '🌾', isPassable: true, movementCost: 1 },
    { id: 'forest', name: 'Forest', nameZh: '森林', color: '#266b2e', description: '提供木材资源，隐蔽加成', icon: '🌲', isPassable: true, movementCost: 2 },
    { id: 'mountain', name: 'Mountain', nameZh: '山地', color: '#7f786b', description: '提供防御加成，限制移动', icon: '⛰️', isPassable: true, movementCost: 3 },
    { id: 'shallow_sea', name: 'Shallow Sea', nameZh: '浅海', color: '#3884b8', description: '可航行，可建造港口', icon: '🌊', isWater: true, isPassable: true, movementCost: 2 }
  ];
  
  const ownerTags = [
    { id: 'neutral', name: 'Neutral', nameZh: '中立', color: '#808080', description: '中立区域', icon: '⚪', isPlayer: false, isAI: false },
    { id: 'player', name: 'Player', nameZh: '玩家', color: '#268ceb', description: '玩家控制区域', icon: '🔵', isPlayer: true, isAI: false },
    { id: 'enemy', name: 'Enemy', nameZh: '敌人', color: '#eb3838', description: '敌方控制区域', icon: '🔴', isPlayer: false, isAI: true }
  ];
  
  const tiles: any[] = [];
  const radius = 4;
  
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    
    for (let r = r1; r <= r2; r++) {
      let terrainId = 'plains';
      let ownerId = 'neutral';
      
      const distFromCenter = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      
      if (q < -2) {
        ownerId = 'enemy';
      } else if (q > 2) {
        ownerId = 'player';
      }
      
      if (distFromCenter >= radius - 1) {
        if (Math.random() > 0.5) {
          terrainId = 'forest';
        }
      }
      
      if (q === 0 && r === 0) {
        terrainId = 'mountain';
      }
      
      if (r < -radius + 2) {
        terrainId = 'shallow_sea';
        ownerId = 'neutral';
      }
      
      tiles.push({
        q, r,
        terrainId,
        ownerId,
        building: null,
        districtKey: null,
        preciousDeposit: false,
        oilDeposit: false
      });
    }
  }
  
  await Promise.all([
    fs.writeFile(path.join(examplePath, 'manifest.json'), JSON.stringify(manifest, null, 2)),
    fs.writeFile(path.join(examplePath, 'terrain_types.json'), JSON.stringify(terrainTypes, null, 2)),
    fs.writeFile(path.join(examplePath, 'owner_tags.json'), JSON.stringify(ownerTags, null, 2)),
    fs.writeFile(path.join(examplePath, 'tiles.json'), JSON.stringify(tiles, null, 2))
  ]);
  
  console.log('Example scene created: example_battlefield');
}

async function main() {
  await ensureScenesDir();
  await createExampleScene();
  
  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
    console.log(`Scenes directory: ${SCENES_DIR}`);
  });
}

main().catch(console.error);
