const BUILDINGS = {
    city: { name: '城市', icon: '🏙️', cost: { money: 800, industry: 200, metal: 80, food: 120 }, desc: '提供金钱产出，并使辖区人口按增长率增长。', yields: { money: 200, civilization: 4, food: -5, metal: -2, consumer: -4, energy: -6 } },
    industry: { name: '军用工厂', icon: '🏭', cost: { money: 1000, metal: 120, pop: 40 }, desc: '制造中心，产出大量军工产值。', yields: { industry: 150, metal: -10, precious: -2, consumer: -6, energy: -6 } },
    barracks: { name: '军营', icon: '⛺', cost: { money: 500, metal: 60, food: 80, industry: 100, pop: 30 }, desc: '允许部署军事编制。', yields: { consumer: -2, energy: -3 } },
    lab: { name: '科研所', icon: '🧪', cost: { money: 600, food: 60, metal: 50, precious: 30, industry: 300, pop: 40 }, desc: '产生研究效能。', yields: { science: 20, money: -40, consumer: -3, energy: -4 } },
    farm: { name: '农场', icon: '🌾', cost: { money: 300, metal: 20, food: 10, pop: 30 }, desc: '产出基础粮食。', yields: { food: 15, consumer: -2, energy: -2 } },
    mine: { name: '矿山', icon: '⛏️', cost: { money: 400, metal: 80, industry: 60, pop: 30 }, desc: '挖掘基础金属。', yields: { metal: 12, consumer: -2, energy: -3 } },
    precious_mine: { name: '贵金属矿', icon: '💎', cost: { money: 1200, metal: 100, industry: 120, pop: 40 }, desc: '开采稀有的贵金属。', yields: { precious: 8, money: 50, consumer: -3, energy: -4 } },
    oil_field: { name: '油田', icon: '🛢️', cost: { money: 800, metal: 80, industry: 120, pop: 30 }, desc: '开采原油，增加国内油供给。', yields: { oil: 12, consumer: -2, energy: -3 } },
    refinery: { name: '炼油厂', icon: '⛽', cost: { money: 900, metal: 100, industry: 160, pop: 40 }, desc: '消耗原油，产出可累积的燃料。', yields: { oil: -10, fuel: 10, consumer: -2, energy: -5 } },
    fossil_power: { name: '化石燃料发电厂', icon: '⚡', cost: { money: 900, metal: 120, industry: 160, pop: 40 }, desc: '消耗化石燃料产生电能。', yields: { oil: -12, energy: 26, consumer: -3 } },
    renewable_power: { name: '可再生能源发电厂', icon: '☀️', cost: { money: 800, metal: 80, industry: 140, pop: 35 }, desc: '产生电能；沙漠和海洋地区产出更多，但不超过化石燃料发电厂。', yields: { energy: 10, consumer: -5 }, energy_desert_bonus: 4, energy_cap_ref: 'fossil_power' },
    civilian_factory: { name: '民用工厂', icon: '🏭', cost: { money: 700, metal: 60, industry: 120, pop: 35 }, desc: '生产生活消费品，消耗金属。', yields: { consumer: 12, metal: -6, energy: -4 } },
    construction_dept: { name: '建造部门', icon: '🏗️', cost: { money: 600, metal: 60, industry: 120, pop: 30 }, desc: '消耗金属和消费品，提高建造力上限。', yields: { metal: -6, consumer: -6, energy: -3 }, build_power_cap_bonus: 30 },
    airbase: { name: '空军基地', icon: '✈️', cost: { money: 900, industry: 200, precious: 40, metal: 100, pop: 50 }, desc: '供空军起降与整备，允许空军在基地之间传送。', yields: { money: -60, industry: -30, consumer: -4, energy: -5 } },
    naval_base: { name: '海军基地', icon: '⚓', cost: { money: 800, industry: 160, metal: 80, pop: 40 }, desc: '靠近陆地的浅海上建设，供海军整备与补给。', yields: { consumer: -3, energy: -4 } },
    admin_center: { name: '行政中心', icon: '🏛️', cost: { money: 500, industry: 120, metal: 40, pop: 20 }, desc: '集中行政力量，提升文明产出（仅精英权重）。', yields: { civilization: 2, consumer: -2, energy: -2 }, admin_civ_bonus_per_level: 1 }
};//建造力成本倍数调整在js\ui\buildings.js:174-179

const TECH_TREE = {
    city: { name: "城市", icon: "🏙️", steps: [
        { id: "city_1", name: "城市规划", cost: 50, desc: "基础产量 +25%" },
        { id: "city_2", name: "城市规划 II", cost: 150, desc: "基础产量 +50%" },
        { id: "city_3", name: "城市规划 III", cost: 400, desc: "基础产量 +75%" },
        { id: "city_4", name: "城市规划 IV", cost: 1000, desc: "基础产量 +100%" }
    ]},
    naval_cruiser: { name: "巡洋舰", icon: "⚓", steps: [
        { id: "naval_cruiser_1", name: "轻巡洋舰", cost: 320, desc: "解锁轻巡洋舰（具有防空能力）" },
        { id: "naval_cruiser_2", name: "重巡洋舰", cost: 500, desc: "解锁重巡洋舰（远程打击，射程2）" },
        { id: "naval_cruiser_3", name: "导弹巡洋舰", cost: 800, desc: "解锁导弹巡洋舰（远程打击，射程4）" }
    ]},
    naval_capital: { name: "主力舰", icon: "⚓", steps: [
        { id: "naval_capital_1", name: "战列舰", cost: 700, desc: "解锁战列舰（远程打击，射程2）" },
        { id: "naval_capital_2", name: "轻型航母", cost: 900, desc: "解锁轻型航母（可搭载 2 个飞机团）" },
        { id: "naval_capital_3", name: "航空母舰", cost: 1200, desc: "解锁航空母舰（可搭载 4 个飞机团）" }
    ]},
    industry: { name: "军用工厂", icon: "🏭", steps: [
        { id: "industry_1", name: "基础机床", cost: 80, desc: "基础产量 +25%" },
        { id: "industry_2", name: "改进机床", cost: 200, desc: "基础产量 +50%" },
        { id: "industry_3", name: "流水线", cost: 500, desc: "基础产量 +75%" },
        { id: "industry_4", name: "一体化生产线", cost: 1200, desc: "基础产量 +100%" }
    ]},
    farm: { name: "农业", icon: "🌾", steps: [
        { id: "farm_1", name: "选种优化", cost: 40, desc: "基础产量 +25%" },
        { id: "farm_2", name: "化肥应用", cost: 120, desc: "基础产量 +50%" },
        { id: "farm_3", name: "机械化耕作", cost: 300, desc: "基础产量 +75%" },
        { id: "farm_4", name: "遗传改良", cost: 800, desc: "基础产量 +100%" }
    ]},
    mine: { name: "采矿技术", icon: "⛏️", steps: [
        { id: "mine_1", name: "挖掘技术 I", cost: 40, desc: "基础产量 +25%" },
        { id: "mine_2", name: "挖掘技术 II", cost: 120, desc: "基础产量 +50%" },
        { id: "mine_3", name: "挖掘技术 III", cost: 300, desc: "基础产量 +75%" },
        { id: "mine_4", name: "挖掘技术 IV", cost: 800, desc: "基础产量 +100%" }
    ]},
    precious_mine: { name: "精炼工艺", icon: "💎", steps: [
        { id: "precious_1", name: "化学提纯", cost: 100, desc: "基础产量 +25%" },
        { id: "precious_2", name: "氰化法", cost: 300, desc: "基础产量 +50%" },
        { id: "precious_3", name: "电解精炼", cost: 700, desc: "基础产量 +75%" },
        { id: "precious_4", name: "同位素分离", cost: 1500, desc: "基础产量 +100%" }
    ]},
    oil_field: { name: "油田", icon: "🛢️", steps: [
        { id: "oil_field_1", name: "勘探技术", cost: 80, desc: "基础产量 +25%" },
        { id: "oil_field_2", name: "钻井工艺", cost: 200, desc: "基础产量 +50%" },
        { id: "oil_field_3", name: "增产技术", cost: 500, desc: "基础产量 +75%" },
        { id: "oil_field_4", name: "复合采油", cost: 1200, desc: "基础产量 +100%" }
    ]},
    refinery: { name: "炼油厂", icon: "⛽", steps: [
        { id: "refinery_1", name: "常压蒸馏", cost: 100, desc: "基础产量 +25%" },
        { id: "refinery_2", name: "催化裂化", cost: 260, desc: "基础产量 +50%" },
        { id: "refinery_3", name: "加氢精制", cost: 600, desc: "基础产量 +75%" },
        { id: "refinery_4", name: "一体化炼化", cost: 1400, desc: "基础产量 +100%" }
    ]},
    fossil_power: { name: "化石燃料发电", icon: "⚡", steps: [
        { id: "fossil_power_1", name: "燃烧效率 I", cost: 90, desc: "基础产量 +25%" },
        { id: "fossil_power_2", name: "涡轮技术 II", cost: 240, desc: "基础产量 +50%" },
        { id: "fossil_power_3", name: "联合循环 III", cost: 520, desc: "基础产量 +75%" },
        { id: "fossil_power_4", name: "清洁高效 IV", cost: 1250, desc: "基础产量 +100%" }
    ]},
    renewable_power: { name: "可再生发电", icon: "☀️", steps: [
        { id: "renewable_power_1", name: "组件效率 I", cost: 80, desc: "基础产量 +25%" },
        { id: "renewable_power_2", name: "阵列优化 II", cost: 220, desc: "基础产量 +50%" },
        { id: "renewable_power_3", name: "储能耦合 III", cost: 500, desc: "基础产量 +75%" },
        { id: "renewable_power_4", name: "电网协同 IV", cost: 1200, desc: "基础产量 +100%" }
    ]},
    civilian_factory: { name: "民用工厂", icon: "🏭", steps: [
        { id: "civilian_factory_1", name: "轻工技改 I", cost: 80, desc: "基础产量 +25%" },
        { id: "civilian_factory_2", name: "标准化生产 II", cost: 200, desc: "基础产量 +50%" },
        { id: "civilian_factory_3", name: "品质控制 III", cost: 480, desc: "基础产量 +75%" },
        { id: "civilian_factory_4", name: "智能制造 IV", cost: 1200, desc: "基础产量 +100%" }
    ]},
    construction_dept: { name: "建造部门", icon: "🏗️", steps: [
        { id: "construction_dept_1", name: "工程组织 I", cost: 90, desc: "基础产量 +25%" },
        { id: "construction_dept_2", name: "项目管理 II", cost: 240, desc: "基础产量 +50%" },
        { id: "construction_dept_3", name: "工序优化 III", cost: 520, desc: "基础产量 +75%" },
        { id: "construction_dept_4", name: "总装协同 IV", cost: 1250, desc: "基础产量 +100%" }
    ]},
    administration: { name: "行政科技", icon: "🏛️", steps: [
        { id: "admin_1", name: "行政效率 I", cost: 60, desc: "行政中心文明点 +1", chain: true },
        { id: "admin_2", name: "行政效率 II", cost: 160, desc: "行政中心文明点 +1", chain: true },
        { id: "admin_3", name: "行政效率 III", cost: 360, desc: "行政中心文明点 +1", chain: true },
        { id: "admin_4", name: "行政效率 IV", cost: 800, desc: "行政中心文明点 +1", chain: true }
    ]},
    infanty: { name: "步兵编制", icon: "🪖", steps: [
        { id: "infanty_1", name: "摩托化步兵", cost: 200, desc: "解锁摩托化步兵团" },
        { id: "infanty_2", name: "机械化步兵", cost: 350, desc: "解锁机械化步兵团" },
        { id: "infanty_3", name: "装甲步兵", cost: 500, desc: "解锁装甲步兵团" },
        { id: "infanty_4", name: "特种步兵", cost: 450, desc: "解锁特种步兵团" }
    ]},
    infantry_sf: { name: "特种部队强化", icon: "🎯", steps: [
        { id: "infantry_sf_river", name: "跨河作战", cost: 350, desc: "携带特种步兵时，跨河惩罚减少 25%", chain: false, prereq: ["infanty_4"] },
        { id: "infantry_sf_amphib", name: "登陆作战", cost: 420, desc: "携带特种步兵时，登陆惩罚减少 45%", chain: false, prereq: ["infanty_4"] }
    ]},
    armor: { name: "装甲编制", icon: "🚜", steps: [
        { id: "armor_1", name: "中型坦克", cost: 300, desc: "解锁中型坦克团" },
        { id: "armor_2", name: "重型坦克", cost: 600, desc: "解锁重型坦克团" },
        { id: "armor_3", name: "主战坦克", cost: 1000, desc: "解锁主战坦克团" },
        { id: "armor_4", name: "超级坦克", cost: 1500, desc: "解锁超级坦克团" }
    ]},
    naval: { name: "驱逐舰", icon: "⚓", steps: [
        { id: "naval_destroyer", name: "驱逐舰", cost: 280, desc: "解锁驱逐舰编制" },
        { id: "naval_aa_destroyer", name: "防空驱逐舰", cost: 420, desc: "解锁防空驱逐舰（具有防空能力）", chain: false, prereq: ["naval_destroyer"] },
        { id: "naval_missile_destroyer", name: "导弹驱逐舰", cost: 600, desc: "解锁导弹驱逐舰（远程打击，射程3）", chain: false, prereq: ["naval_destroyer"] }
    ]},
    artillery: { name: "火炮编制", icon: "💥", steps: [
        { id: "artillery_howitz", name: "榴弹炮", cost: 180, desc: "解锁榴弹炮支援单位", chain: false },
        { id: "artillery_at", name: "反坦克炮", cost: 220, desc: "解锁反坦克炮支援单位", chain: false },
        { id: "artillery_aa", name: "防空炮", cost: 200, desc: "解锁防空炮支援单位", chain: false },
        { id: "artillery_rocket", name: "火箭炮", cost: 260, desc: "解锁火箭炮支援单位", chain: false }
    ]},
    sp_artillery: { name: "自行火炮科技", icon: "💥", steps: [
        { id: "sp_art_1", name: "自行火炮 · 摩托化", cost: 300, desc: "解锁摩托化自行火炮编制", prereq: ["infanty_1"] },
        { id: "sp_art_2", name: "自行火炮 · 装甲化", cost: 600, desc: "解锁装甲化自行火炮编制" }
    ]},
    engineer: { name: "工兵连科技", icon: "🛠️", steps: [
        { id: "eng_company_1", name: "工兵连", cost: 150, desc: "解锁工兵连编制" },
        { id: "eng_company_2", name: "突击工兵连", cost: 300, desc: "解锁突击工兵连编制" },
        { id: "eng_company_3", name: "装甲工兵连", cost: 600, desc: "解锁装甲工兵连编制" }
    ]},
    support_aux: { name: "辅助支援连科技", icon: "🧰", steps: [
        { id: "aux_hospital", name: "野战医院", cost: 200, desc: "解锁野战医院支援连", chain: false },
        { id: "aux_recon", name: "侦查连", cost: 220, desc: "解锁侦查连支援连", chain: false },
        { id: "aux_maintenance", name: "维修连", cost: 220, desc: "解锁维修连支援连", chain: false },
        { id: "aux_logistics", name: "后勤连", cost: 240, desc: "解锁后勤连支援连", chain: false }
    ]},
    doctrine: { name: "陆军组织", icon: "🎖️", steps: [
        { id: "doctrine_org_1", name: "陆军组织 I", cost: 200, desc: "组织格子变为 3×4" },
        { id: "doctrine_org_2", name: "陆军组织 II", cost: 500, desc: "组织格子变为 4×4" },
        { id: "doctrine_org_3", name: "陆军组织 III", cost: 900, desc: "组织格子变为 4×5" },
        { id: "doctrine_org_4", name: "陆军组织 IV", cost: 1400, desc: "组织格子变为 5×5" }
    ]},
    naval_doctrine: { name: "海军学说", icon: "⚓", steps: [
        { id: "naval_org_1", name: "海军组织 I", cost: 200, desc: "组织格子变为 3×4" },
        { id: "naval_org_2", name: "海军组织 II", cost: 500, desc: "组织格子变为 4×4" },
        { id: "naval_org_3", name: "海军组织 III", cost: 900, desc: "组织格子变为 4×5" },
        { id: "naval_org_4", name: "海军组织 IV", cost: 1400, desc: "组织格子变为 5×5" }
    ]},
    air_tech: { name: "空军科技", icon: "✈️", steps: [
        { id: "air_transport", name: "运输机", cost: 300, desc: "解锁空运：空军基地允许陆军空运与伞降" },
        { id: "air_heavy_fighter", name: "重型战斗机", cost: 420, desc: "解锁重型战斗机（更强火力，更远航程）" },
        { id: "air_strategic_bomber", name: "战略轰炸机", cost: 520, desc: "解锁战略轰炸机（更强轰炸，更远航程）" }
    ]}
};

//注意：旧字段 cost_money/cost_ind 已废弃并移除，请统一使用 cost 多资源对象
//cost_money 和 cost_ind 已被新的多资源 cost 对象取代，当前代码对它们的使用仅作为缺省回退。
const REGIMENT_TYPES = {
    INFANTRY: { name: '步兵', icon: '🪖', maint_cost: 0.5, soft: 10, hard: 5, break: 10, def: 50, hp: 150, moves: 6, fuel_req: 0, cost: { money: 75, pop: 50 } },
    MOTORIZED: { name: '摩托化步兵', icon: '🪖', icon_sub: '🚚', maint_cost: 0.6, soft: 12, hard: 6, break: 20, def: 30, hp: 135, moves: 12, fuel_req: 1, cost: { money: 90, industry: 40, pop: 50 } },
    MECHANIZED: { name: '机械化步兵', icon: '🪖', icon_sub: '🚙', maint_cost: 0.75, soft: 25, hard: 14, break: 45, def: 40, hp: 135, moves: 11, armor: 0.25, fuel_req: 1, cost: { money: 110, industry: 110, pop: 50 } },
    ARMORED_INFANTRY: { name: '装甲步兵', icon: '🪖', icon_sub: '🛡️', maint_cost: 1, soft: 28, hard: 20, break: 55, def: 40, hp: 120, moves: 10, armor: 0.4, fuel_req: 1, cost: { money: 120, industry: 140, pop: 50 } },
    SPECIAL_FORCES: { name: '特种步兵', icon: '🪖', icon_sub: '🎯', maint_cost: 2, soft: 35, hard: 30, break: 100, def: 35, hp: 120, moves: 9, armor: 0.1, cost: { money: 225, industry: 150, pop: 50 } },

    ARTILLERY: { name: '步兵炮', icon: '💥', maint_cost: 0.75, soft: 50, hard: 25, break: 20, def: 20, hp: 3, moves: 6, fuel_req: 0, cost: { money: 75, industry: 100, pop: 20 } },
    HOWITZER: { name: '榴弹炮', icon: '💥', icon_sub: '🪖', soft: 90, hard: 5, break: 25, def: 15, hp: 3, moves: 3, fuel_req: 0, cost: { money: 120, industry: 140, pop: 20 } },
    AT_GUN: { name: '反坦克炮', icon: '💥', icon_sub: '🎯', soft: 20, hard: 75, break: 30, def: 10, hp: 3, moves: 6, fuel_req: 0, cost: { money: 130, industry: 160, pop: 20 } },
    AA_GUN: { name: '防空炮', icon: '💥', icon_sub: '🛡️', soft: 10, hard: 20, break: 10, def: 25, hp: 3, moves: 6, aa: true, fuel_req: 0, cost: { money: 110, industry: 130, pop: 20 } },
    ROCKET_ARTILLERY: { name: '火箭炮', icon: '💥', icon_sub: '🚀', maint_cost: 1.25, soft: 110, hard: 25, break: 45, def: 10, hp: 3, moves: 3, fuel_req: 0, cost: { money: 150, industry: 180, pop: 20 } },
    
    MOTORIZED_HOWITZER: { name: '摩托化榴弹炮', icon: '🚚', icon_sub: '🪖', maint_cost: 1.25, soft: 90, hard: 5, break: 25, def: 20, hp: 3, moves: 12, fuel_req: 1, cost: { money: 150, industry: 180, pop: 20 } },
    SP_HOWITZER: { name: '自行榴弹炮', icon: '🚜', icon_sub: '🪖', maint_cost: 1.5, soft: 95, hard: 8, break: 28, def: 25, hp: 4, moves: 9, armor: 0.6, fuel_req: 1, cost: { money: 200, industry: 240, pop: 20 } },
    MOTORIZED_AT_GUN: { name: '摩托化反坦克炮', icon: '🚚', icon_sub: '🎯', maint_cost: 1.25, soft: 20, hard: 75, break: 30, def: 15, hp: 3, moves: 12, fuel_req: 1, cost: { money: 160, industry: 190, pop: 20 } },
    SP_AT_GUN: { name: '自行反坦克炮', icon: '🚜', icon_sub: '🎯', maint_cost: 1.5, soft: 22, hard: 85, break: 35, def: 25, hp: 4, moves: 9, armor: 0.6, fuel_req: 1, cost: { money: 220, industry: 260, pop: 20 } },
    MOTORIZED_AA_GUN: { name: '摩托化防空炮', icon: '🚚', icon_sub: '🛡️', maint_cost: 1.25, soft: 10, hard: 20, break: 10, def: 20, hp: 3, moves: 12, aa: true, fuel_req: 1, cost: { money: 140, industry: 170, pop: 20 } },
    SP_AA_GUN: { name: '自行防空炮', icon: '🚜', icon_sub: '🛡️', maint_cost: 1.5, soft: 12, hard: 25, break: 12, def: 28, hp: 4, moves: 9, aa: true, armor: 0.6, fuel_req: 1, cost: { money: 200, industry: 230, pop: 20 } },
    MOTORIZED_ROCKET_ARTILLERY: { name: '摩托化火箭炮', icon: '🚚', icon_sub: '🚀', maint_cost: 1.5, soft: 110, hard: 25, break: 45, def: 12, hp: 3, moves: 12, fuel_req: 1, cost: { money: 170, industry: 220, pop: 20 } },
    SP_ROCKET_ARTILLERY: { name: '自行火箭炮', icon: '🚜', icon_sub: '🚀', maint_cost: 2, soft: 120, hard: 30, break: 50, def: 15, hp: 4, moves: 9, armor: 0.6, fuel_req: 1, cost: { money: 230, industry: 280, pop: 20 } },
    
    CAS: { name: '近距支援机', icon: '🛩️', soft: 30, hard: 25, break: 35, def: 0, hp: 30, moves: 1, armor: 0, is_air: true, attack_range: 8, teleport_airbase: true, air_role: 'cas', cost: { money: 300, industry: 250, pop: 50 } },
    FIGHTER: { name: '战斗机', icon: '✈️',  soft: 35, hard: 35, break: 30, def: 25, hp: 60, moves: 1, armor: 0.5, is_air: true, attack_range: 10, teleport_airbase: true, air_role: 'fighter', cost: { money: 320, industry: 260, pop: 50 } },
    HEAVY_FIGHTER: { name: '重型战斗机', icon: '✈️', icon_sub: '🎯', soft: 55, hard: 55, break: 40, def: 30, hp: 90, moves: 1, armor: 0.7, is_air: true, attack_range: 14, teleport_airbase: true, air_role: 'fighter', cost: { money: 420, industry: 360, pop: 60 } },
    STRATEGIC_BOMBER: { name: '战略轰炸机', icon: '🛩️', icon_sub: '🎯', soft: 85, hard: 45, break: 60, def: 0, hp: 80, moves: 1, armor: 0.2, is_air: true, attack_range: 16, teleport_airbase: true, air_role: 'bomber', cost: { money: 520, industry: 420, pop: 60 } },
    TRANSPORT_PLANE: { name: '运输机', icon: '🛩️', soft: 0, hard: 0, break: 0, def: 0, hp: 50, moves: 1, armor: 0, is_air: true, attack_range: 12, teleport_airbase: true, air_role: 'transport', cost: { money: 0, industry: 0, pop: 0 } },

    TANK_LIGHT: { name: '轻型坦克', icon: '🚜', icon_sub: 'I', soft: 45, hard: 20, break: 65, def: 15, hp: 2, moves: 12, armor: 0.7, fuel_req: 1, cost: { money: 150, industry: 200, pop: 50 } },
    TANK_MEDIUM: { name: '中型坦克', icon: '🚜', icon_sub: 'II', maint_cost: 1.5, soft: 55, hard: 30, break: 80, def: 20, hp: 3, moves: 10, armor: 0.8, fuel_req: 1, cost: { money: 200, industry: 300, pop: 50 } },
    TANK_HEAVY: { name: '重型坦克', icon: '🚜', icon_sub: 'III', maint_cost: 2, soft: 70, hard: 40, break: 100, def: 25, hp: 4, moves: 9, armor: 0.9, fuel_req: 1, cost: { money: 250, industry: 500, pop: 50 } },
    TANK_MBT: { name: '主战坦克', icon: '🚜', icon_sub: 'IV', maint_cost: 2, soft: 50, hard: 80, break: 90, def: 22, hp: 5, moves: 11, armor: 0.85, fuel_req: 1, cost: { money: 250, industry: 400, pop: 50 } },
    TANK_SUPER: { name: '超级坦克', icon: '🚜', icon_sub: 'V', maint_cost: 3, soft: 120, hard: 90, break: 130, def: 30, hp: 10, moves: 9, armor: 1, fuel_req: 1, cost: { money: 500, industry: 500, pop: 50 } },
    
    ENGINEER_COMPANY: { name: '工兵连', icon: '🛠️', icon_sub: '🧱', soft: 0, hard: 0, break: 0, def: 0, hp: 0, moves: null, cost: { money: 50, pop: 5 }, modifiers: { moveCostFixed: 2, hpMaxPct: -0.05 } },
    ASSAULT_ENGINEER_COMPANY: { name: '突击工兵连', icon: '🛠️', icon_sub: '🎯', soft: 0, hard: 0, break: 0, def: 0, hp: 0, moves: null, cost: { money: 60, industry: 20, pop: 5 }, modifiers: { moveCostFixed: 2, hpMaxPct: -0.05, breakPct: 0.15, riverPenaltyReduce: 0.10, amphibPenaltyReduce: 0.15 } },
    ARMORED_ENGINEER_COMPANY: { name: '装甲工兵连', icon: '🛠️', icon_sub: '🛡️', soft: 0, hard: 0, break: 0, def: 0, hp: 0, moves: null, cost: { money: 60, industry: 60, pop: 5 }, modifiers: { moveCostFixed: 2, hpMaxPct: -0.05, breakPct: 0.10, armorDelta: 0.10, riverPenaltyReduce: 0.10, amphibPenaltyReduce: 0.15 } }
    ,
    FIELD_HOSPITAL: { name: '野战医院', icon: '🧰', icon_sub: '⛑️', soft: 0, hard: 0, break: 0, def: 0, hp: 0, moves: null, cost: { money: 70, industry: 60, pop: 5 }, modifiers: { enemySoftPct: -0.10 } },
    RECON_COMPANY: { name: '侦查连', icon: '🧰', icon_sub: '🔭', soft: 0, hard: 0, break: 0, def: 0, hp: 0, moves: null, cost: { money: 80, industry: 50, pop: 5 }, modifiers: { movesPct: 0.25, hpMaxPct: -0.03 } },
    MAINTENANCE_COMPANY: { name: '维修连', icon: '🧰', icon_sub: '🔧', soft: 0, hard: 0, break: 0, def: 0, hp: 0, moves: null, cost: { money: 85, industry: 80, pop: 5 }, modifiers: { enemyHardPct: -0.15, hpMaxPct: -0.03 } },
    LOGISTICS_COMPANY: { name: '后勤连', icon: '🧰', icon_sub: '📦', soft: 0, hard: 0, break: 0, def: 0, hp: 0, moves: null, cost: { money: 90, industry: 90, pop: 5 }, modifiers: { endTurnHealFromMoves: true } }
    ,
    SUBMARINE: { name: '潜艇', icon: '🛥️', soft: 240, hard: 80, break: 100, def: 25, hp: 90, moves: 12, armor: 0.3,is_naval: true, naval_role: 'submarine', attack_range: 0, cost: { money: 180, industry: 160, pop: 40 } },
    FRIGATE: { name: '护卫舰', icon: '🚢', soft: 55, hard: 45, break: 25, def: 120, hp: 100, moves: 12, armor: 0.9,is_naval: true, naval_role: 'frigate', attack_range: 1, cost: { money: 220, industry: 200, pop: 45 } }
    ,
    DESTROYER: { name: '驱逐舰', icon: '🚢', icon_sub: '⚓', soft: 60, hard: 50, break: 28, def: 150, hp: 125, moves: 11, armor: 1,is_naval: true, naval_role: 'destroyer', attack_range: 1, cost: { money: 260, industry: 220, pop: 45 } },
    AA_DESTROYER: { name: '防空驱逐舰', icon: '🚢', icon_sub: '🛡️', maint_cost: 1.25, soft: 35, hard: 35, break: 26, def: 100, hp: 100, moves: 11, armor: 0.8,is_naval: true, naval_role: 'destroyer', attack_range: 1, cost: { money: 300, industry: 240, pop: 45 } },
    MISSILE_DESTROYER: { name: '导弹驱逐舰', icon: '🚢', icon_sub: '🚀', maint_cost: 1.5, soft: 50, hard: 40, break: 30, def: 60, hp: 90, moves: 11, armor: 0.4,is_naval: true, naval_role: 'destroyer', attack_range: 3, cost: { money: 360, industry: 300, pop: 50 } }
    ,
    L_CRUISER: { name: '轻巡洋舰', icon: '🛳️', icon_sub: '🛡️', maint_cost: 2, soft: 50, hard: 35, break: 90, def: 44, hp: 180, moves: 9, armor: 0.4,is_naval: true, naval_role: 'cruiser', attack_range: 1, cost: { money: 320, industry: 260, pop: 50 } },
    H_CRUISER: { name: '重巡洋舰', icon: '🛳️', icon_sub: '⚓', maint_cost: 2.25, soft: 60, hard: 50, break: 120, def: 56, hp: 200, moves: 9, armor: 0.4,is_naval: true, naval_role: 'cruiser', attack_range: 2, cost: { money: 420, industry: 340, pop: 55 } },
    M_CRUISER: { name: '导弹巡洋舰', icon: '🛳️', icon_sub: '🚀', maint_cost: 2.5, soft: 70, hard: 60, break: 45, def: 44, hp: 160, moves: 9, armor: 0.2,is_naval: true, naval_role: 'cruiser', attack_range: 4, cost: { money: 520, industry: 420, pop: 60 } }
    ,
    BATTLESHIP: { name: '战列舰', icon: '🛳️', icon_sub: '🎯', maint_cost: 5, soft: 120, hard: 120, break: 160, def: 80, hp: 240, moves: 7, armor: 0.2,is_naval: true, naval_role: 'capital', attack_range: 2, cost: { money: 700, industry: 600, pop: 70 } }
    ,
    LIGHT_CARRIER: { name: '轻型航母', icon: '🛳️', icon_sub: '✈️×2', maint_cost: 8, soft: 0, hard: 0, break: 0, def: 45, hp: 8, moves: 7, is_naval: true, naval_role: 'carrier', attack_range: 0, plane_capacity: 2, cost: { money: 900, industry: 800, pop: 80 } }
    ,
    CARRIER: { name: '航空母舰', icon: '🛳️', icon_sub: '✈️×4', maint_cost: 20, soft: 0, hard: 0, break: 0, def: 50, hp: 10, moves: 7, is_naval: true, naval_role: 'carrier', attack_range: 0, plane_capacity: 4, cost: { money: 1200, industry: 1000, pop: 90 } }
};

const REGIMENT_CATEGORIES = {
    infantry: { name: '步兵类', items: ['INFANTRY'] },
    support: { name: '炮兵类', items: ['ARTILLERY'] },
    support_company: { name: '支援连类', items: [] },
    armor: { name: '装甲类', items: ['TANK_LIGHT'] },
    air: { name: '空军类', items: ['CAS','FIGHTER'] },
    naval: { name: '海军类', items: ['SUBMARINE','FRIGATE'] }
};

const REGIMENT_CLASSES = {
    anti_air: ['AA_GUN', 'MOTORIZED_AA_GUN', 'SP_AA_GUN', 'AA_DESTROYER', 'L_CRUISER']
};

const TERRAINS = {
    PLAINS: { name: '平原', color: '#2d441c' },
    FOREST: { name: '森林', color: '#1a331c' },
    MOUNTAIN: { name: '山地', color: '#3d251a' },
    DESERT: { name: '沙漠', color: '#6b5521' },
    BARRIER_MOUNTAIN: { name: '屏障山脉', color: '#4a3b2a' },
    SHALLOW_SEA: { name: '浅海', color: '#1e3a5f' },
    DEEP_SEA: { name: '深海', color: '#0b2545' }
};
const OWNER_COLORS = { 'Player': '#3b82f6', 'Enemy': '#ef4444', 'Neutral': '#4b5563' };
const YIELD_ICONS = { money: '💰', food: '🌾', metal: '⚙️', precious: '💎', consumer: '🛍️', energy: '⚡', oil: '🛢️', fuel: '⛽', industry: '🔨', pop: '👥', science: '🧪', civilization: '🏛️', social_surplus: '🏦' };
const MAP_CONFIG = {
    radius: 10,
    playerQMax: -4,
    enemyQMin: 4,
    ownerBands: null,
    terrainProbabilities: {
        PLAINS: 0.5,
        FOREST: 0.25,
        MOUNTAIN: 0.15,
        DESERT: 0.05,
        SHALLOW_SEA: 0.04,
        DEEP_SEA: 0.01,
        BARRIER_MOUNTAIN: 0.0
    },
    seaPatchEnabled: true,
    seaPatch: { seedCount: 2, minSize: 18, maxSize: 36, shallowWidth: 1 },
    desertPatchEnabled: true,
    desertPatch: { seedCount: 2, minSize: 12, maxSize: 24 },
    preciousDepositProb: 0.25,
    oilDepositProbDesert: 0.35,
    oilDepositProbPlains: 0.05,
    oilDepositProbDeepSea: 0.08
};
const POP_CLASS_KEYS = ['elite','expert','labor','subsistence'];
const POP_CLASS_WEIGHTS = {
    elite: { precious_mine: 2, airbase: 2, admin_center: 4 },
    expert: { lab: 5, refinery: 3, fossil_power: 3, renewable_power: 2, construction_dept: 2 },
    labor: { city: 3, industry: 5, civilian_factory: 4, mine: 4, oil_field: 4, barracks: 3, farm: 5, refinery: 2 },
    subsistence: {}
};
const POP_CLASS_BASELINE = { elite: 0.01, expert: 0.09, labor: 0.2, subsistence: 0.7 };
const POP_CLASS_SURPLUS_WEIGHTS = { elite: 10, expert: 2, labor: 0.5, subsistence: 0.1 };
