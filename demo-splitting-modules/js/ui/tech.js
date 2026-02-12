const UITech = {
    open(game) {
        document.getElementById('tech-modal').classList.remove('hidden');
        const tabDev = document.getElementById('tech-tab-dev');
        const tabMil = document.getElementById('tech-tab-mil');
        const tabDoc = document.getElementById('tech-tab-doc');
        if (tabDev) tabDev.onclick = () => this.setTab(game, 'development');
        if (tabMil) tabMil.onclick = () => this.setTab(game, 'military');
        if (tabDoc) tabDoc.onclick = () => this.setTab(game, 'doctrine');
        this.updateTabsUI(game);
        this.renderSubtabs(game);
        this.renderTree(game);
    },
    close(game) { document.getElementById('tech-modal').classList.add('hidden'); this.closeDetail(); },
    setTab(game, tab) {
        game.techTab = tab;
        const devKeys = ['natural','industry_energy','urban'];
        const milKeys = ['infantry','artillery','armor','support','naval','air'];
        if (tab === 'development' && !devKeys.includes(game.techSubtab)) game.techSubtab = 'natural';
        if (tab === 'military' && !milKeys.includes(game.techSubtab)) game.techSubtab = 'infantry';
        if (tab === 'doctrine') game.techSubtab = 'doctrine';
        this.updateTabsUI(game);
        this.renderSubtabs(game);
        this.renderTree(game);
    },
    updateTabsUI(game) {
        const tabDev = document.getElementById('tech-tab-dev');
        const tabMil = document.getElementById('tech-tab-mil');
        const tabDoc = document.getElementById('tech-tab-doc');
        if (!tabDev || !tabMil || !tabDoc) return;
        const activeCls = 'bg-cyan-700 text-white';
        const normalCls = 'bg-white/5 hover:bg-white/10 text-gray-300';
        tabDev.className = `px-4 py-2 text-xs font-bold ${game.techTab === 'development' ? activeCls : normalCls}`;
        tabMil.className = `px-4 py-2 text-xs font-bold border-l border-white/10 ${game.techTab === 'military' ? activeCls : normalCls}`;
        tabDoc.className = `px-4 py-2 text-xs font-bold border-l border-white/10 ${game.techTab === 'doctrine' ? activeCls : normalCls}`;
        const subTabs = document.getElementById('tech-subtabs');
        if (subTabs) subTabs.classList.toggle('hidden', !(game.techTab === 'development' || game.techTab === 'military' || game.techTab === 'doctrine'));
        if (game.techTab === 'development' || game.techTab === 'military' || game.techTab === 'doctrine') this.updateSubtabsUI(game);
    },
    renderSubtabs(game) {
        const cont = document.getElementById('tech-subtabs');
        if (!cont) return;
        cont.innerHTML = '';
        const btns = (game.techTab === 'military')
            ? [
                { key: 'infantry', name: '步兵' },
                { key: 'artillery', name: '炮兵' },
                { key: 'armor', name: '装甲' },
                { key: 'support', name: '支援' },
                { key: 'naval', name: '海军' },
                { key: 'air', name: '空军' }
              ]
            : (game.techTab === 'doctrine')
            ? [
                { key: 'doctrine', name: '陆军学说' },
                { key: 'naval_doctrine', name: '海军学说' }
              ]
            : [
                { key: 'natural', name: '自然开发' },
                { key: 'industry_energy', name: '工业能源' },
                { key: 'urban', name: '城建体系' }
              ];
        btns.forEach((b, idx) => {
            const btn = document.createElement('button');
            btn.id = `tech-sub-${b.key}`;
            btn.className = `px-3 py-2 text-[10px] font-bold ${idx > 0 ? 'border-l border-white/10' : ''}`;
            btn.innerText = b.name;
            btn.onclick = () => this.setSubtab(game, b.key);
            cont.appendChild(btn);
        });
        this.updateSubtabsUI(game);
    },
    updateSubtabsUI(game) {
        const activeCls = 'bg-cyan-700 text-white';
        const normalCls = 'bg-white/5 hover:bg-white/10 text-gray-300';
        const keys = (game.techTab === 'military')
            ? ['infantry','artillery','armor','support','naval','air']
            : (game.techTab === 'doctrine')
            ? ['doctrine','naval_doctrine']
            : ['natural','industry_energy','urban'];
        keys.forEach(key => {
            const el = document.getElementById(`tech-sub-${key}`);
            if (!el) return;
            const def = (game.techTab === 'military') ? 'infantry' : (game.techTab === 'doctrine' ? 'doctrine' : 'natural');
            el.className = `px-3 py-2 text-[10px] font-bold ${key === (game.techSubtab || def) ? activeCls : normalCls}`;
        });
    },
    setSubtab(game, sub) { game.techSubtab = sub; this.updateSubtabsUI(game); this.renderTree(game); },
    renderTree(game) {
        const container = document.getElementById('tech-tree-container');
        container.innerHTML = '';
        let keys = ['city','industry','farm','mine','precious_mine'];
        if (game.techTab === 'development') {
            const sub = game.techSubtab || 'natural';
            if (sub === 'natural') keys = ['farm','mine','precious_mine','oil_field'];
            else if (sub === 'industry_energy') keys = ['civilian_factory','refinery','fossil_power','renewable_power'];
            else if (sub === 'urban') keys = ['city','industry','construction_dept','administration'];
        }
        if (game.techTab === 'military') {
            const sub = game.techSubtab || 'infantry';
            if (sub === 'infantry') keys = ['infanty','infantry_sf'];
            else if (sub === 'artillery') keys = ['artillery','sp_artillery'];
            else if (sub === 'armor') keys = ['armor'];
            else if (sub === 'support') keys = ['engineer','support_aux'];
            else if (sub === 'naval') keys = ['naval','naval_cruiser','naval_capital'];
            else if (sub === 'air') keys = ['air_tech'];
        }
        if (game.techTab === 'doctrine') {
            const sub = game.techSubtab || 'doctrine';
            if (sub === 'doctrine') keys = ['doctrine'];
            else if (sub === 'naval_doctrine') keys = ['naval_doctrine'];
        }
        keys.forEach((catKey) => {
            const category = TECH_TREE[catKey];
            if (!category) return;
            const catDiv = document.createElement('div');
            catDiv.className = "space-y-4";
            const iconEl = (catKey === 'industry' && typeof UIPanels !== 'undefined' && UIPanels.renderBuildingIcon)
                ? UIPanels.renderBuildingIcon('industry', 'w-8 h-8')
                : `<span class="text-2xl">${category.icon}</span>`;
            catDiv.innerHTML = `<h3 class="flex items-center gap-2 text-white font-bold">${iconEl} ${category.name} 研究线</h3>`;
            const grid = document.createElement('div');
            grid.className = "grid grid-cols-4 gap-4";
            category.steps.forEach((tech, index) => {
                const isResearched = game.researchedTechs.includes(tech.id);
                const chainOk = (tech.chain === false) ? true : (index === 0 || game.researchedTechs.includes(category.steps[index-1].id));
                const prereqOk = Array.isArray(tech.prereq) ? tech.prereq.every(id => game.researchedTechs.includes(id)) : true;
                const prevResearched = chainOk && prereqOk;
                const isActive = game.activeTechId === tech.id;
                const progress = game.researchProgress[tech.id] || 0;
                let state = "locked";
                if (isResearched) state = "researched";
                else if (prevResearched) state = isActive ? "researching" : "available";
                const node = document.createElement('div');
                node.className = `tech-node p-4 rounded-xl flex flex-col justify-between h-32 ${state}`;
                const nodeIcon = (catKey === 'industry' && typeof UIPanels !== 'undefined' && UIPanels.renderBuildingIcon) ? UIPanels.renderBuildingIcon('industry', 'w-5 h-5') : '';
                node.innerHTML = `
                    <div>
                        <div class="text-xs font-black text-white uppercase mb-1 flex items-center gap-1">${nodeIcon}${tech.name}</div>
                        <p class="text-[10px] text-gray-400 leading-tight">${tech.desc}</p>
                    </div>
                    <div class="flex justify-between items-end mt-2">
                        <span class="text-[10px] font-mono text-cyan-400">成本: ${tech.cost} 🧪</span>
                        <span class="text-[9px] font-bold uppercase">${
                            state === 'researched' ? '已完成' : (state === 'available' ? '可研发' : (state === 'researching' ? `研发中` : '锁定'))
                        }</span>
                    </div>
                    ${!isResearched ? `<div class="text-[9px] text-gray-400 font-mono mt-1">进度: ${Math.min(progress, tech.cost)}/${tech.cost} 🧪</div>` : ``}
                `;
                if (state === 'available') {
                    node.onclick = () => { Research.start(game, tech.id, tech.cost); this.renderTree(game); };
                }
                grid.appendChild(node);
            });
            catDiv.appendChild(grid);
            container.appendChild(catDiv);
        });
    },
    openDetail(game, id) {
        const tech = Research.findById(id);
        if (!tech) return;
        let catKey = null, idx = -1;
        for (const [k, category] of Object.entries(TECH_TREE)) {
            const i = category.steps.findIndex(s => s.id === id);
            if (i !== -1) { catKey = k; idx = i; break; }
        }
        const isResearched = game.researchedTechs.includes(id);
        const chainOk = (tech.chain === false) ? true : (idx === 0 || (catKey && game.researchedTechs.includes(TECH_TREE[catKey].steps[idx-1].id)));
        const prereqOk = Array.isArray(tech.prereq) ? tech.prereq.every(tid => game.researchedTechs.includes(tid)) : true;
        const prevResearched = chainOk && prereqOk;
        const isActive = game.activeTechId === id;
        const progress = game.researchProgress[id] || 0;
        let state = "锁定";
        if (isResearched) state = "已完成";
        else if (prevResearched) state = isActive ? "研发中" : "可研发";
        document.getElementById('td-name').innerText = tech.name;
        document.getElementById('td-desc').innerText = tech.desc;
        document.getElementById('td-cost').innerText = tech.cost;
        document.getElementById('td-state').innerText = state;
        const progWrap = document.getElementById('td-progress-wrap');
        const progEl = document.getElementById('td-progress');
        if (isResearched) { progWrap.style.display = 'none'; } else { progWrap.style.display = 'block'; progEl.innerText = `${Math.min(progress, tech.cost)}/${tech.cost}`; }
        const confirmBtn = document.getElementById('td-confirm');
        confirmBtn.disabled = !(prevResearched && !isResearched);
        confirmBtn.onclick = () => this.confirmResearch(game, id);
        document.getElementById('tech-detail-modal').classList.remove('hidden');
    },
    closeDetail() { const m = document.getElementById('tech-detail-modal'); if (m) m.classList.add('hidden'); },
    confirmResearch(game, id) {
        const tech = Research.findById(id);
        if (!tech) { this.closeDetail(); return; }
        Research.start(game, id, tech.cost);
        this.closeDetail();
        this.renderTree(game);
    }
};
