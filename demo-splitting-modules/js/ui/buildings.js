const BuildingsUI = {
    canBuildHere(game, type, tile) {
        if (Array.isArray(game?.privateBuildQueue) && game.privateBuildQueue.some(it => it.q === tile?.q && it.r === tile?.r)) return false;
        if (tile?.terrain === 'BARRIER_MOUNTAIN') return false;
        const tTerr = tile?.terrain;
        const isSea = tTerr === 'SHALLOW_SEA' || tTerr === 'DEEP_SEA';
        if (isSea) {
            if (type === 'naval_base') {
                if (tTerr !== 'SHALLOW_SEA') return false;
                const ns = VHUtils.getNeighbors(game, tile.q, tile.r);
                const isSeaTile = (tt) => tt && (tt.terrain === 'SHALLOW_SEA' || tt.terrain === 'DEEP_SEA');
                const nearLand = ns.some(n => n && !isSeaTile(n));
                if (!nearLand) return false;
                return true;
            }
            if (type === 'oil_field') { return !!tile?.oilDeposit; }
            if (type === 'renewable_power') { return true; }
            return false;
        }
        if (type === 'naval_base') {
            if (!tile || tile.terrain !== 'SHALLOW_SEA') return false;
            const ns = VHUtils.getNeighbors(game, tile.q, tile.r);
            const isSea = (t) => t && (t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA');
            const nearLand = ns.some(n => n && !isSea(n));
            if (!nearLand) return false;
            return true;
        }
        if (type === 'city') {
            if (tile?.districtKey) return false;
        }
        if (type !== 'city') {
            const dk = tile?.districtKey;
            const okDistrict = !!dk && !!(game && game.cityDistricts && Array.isArray(game.cityDistricts[dk]) && game.cityDistricts[dk].length > 0);
            if (!okDistrict) return false;
        }
        const t = tile?.terrain;
        if (type === 'farm') return t === 'PLAINS';
        if (type === 'mine') return t === 'MOUNTAIN';
        if (type === 'precious_mine') return t === 'MOUNTAIN' && !!tile?.preciousDeposit;
        if (type === 'oil_field') return !!tile?.oilDeposit;
        return true;
    },
    open(game, type) {
        const b = BUILDINGS[type];
        game.pendingBuildType = type;
        game.pendingBuildTile = game.selectedTile || null;
        const iconEl = document.getElementById('b-modal-icon');
        if (iconEl) {
            const svg = (typeof UIPanels !== 'undefined' && UIPanels.renderBuildingIcon) ? UIPanels.renderBuildingIcon(type, "w-10 h-10") : null;
            if (svg) iconEl.innerHTML = svg; else iconEl.innerText = b.icon;
        }
        document.getElementById('b-modal-name').innerText = b.name;
        document.getElementById('b-modal-desc').innerText = b.desc;
        const yieldBox = document.getElementById('b-modal-yields');
        yieldBox.innerHTML = '';
        Object.entries(b.yields).forEach(([res, val]) => {
            const row = document.createElement('div');
            row.className = `flex items-center text-[10px] ${val > 0 ? 'text-green-400' : 'text-red-400'}`;
            if (type === 'renewable_power' && res === 'energy') {
                const mul = (typeof Research !== 'undefined' && typeof Research.getMultiplier === 'function') ? Research.getMultiplier(game, type) : 1;
                const base = (val || 0);
                const terr = game.selectedTile?.terrain;
                const seaTerr = terr === 'SHALLOW_SEA' || terr === 'DEEP_SEA';
                const bonus = (terr === 'DESERT' || seaTerr) ? Math.max(0, b.energy_desert_bonus || 0) : 0;
                const capRef = BUILDINGS[b.energy_cap_ref || ''] || null;
                const capMul = capRef && typeof Research.getMultiplier === 'function' ? Research.getMultiplier(game, b.energy_cap_ref) : 1;
                const capVal = capRef && capRef.yields ? Math.max(0, (capRef.yields.energy || 0) * capMul) : Infinity;
                const market = game.market || { supply: {}, demand: {} };
                const marketKeys = ['food','metal','precious','consumer','energy','oil'];
                const reqRes = Object.entries(b.yields).filter(([rk, rv]) => marketKeys.includes(rk) && (rv || 0) < 0).map(([rk]) => rk);
                let gTotal = 1;
                if (reqRes.length > 0) {
                    const gs = reqRes.map(rk => {
                        const sup = Math.max(0, Math.floor((market.supply || {})[rk] || 0));
                        const dem = Math.max(0, Math.floor((market.demand || {})[rk] || 0));
                        const R = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
                        if (!isFinite(R)) return 1;
                        if (R >= 0.75) return 1;
                        const g = Math.max(0.25, Math.min(1, R + 0.25));
                        return g;
                    });
                    gTotal = gs.reduce((a, b) => a + b, 0) / gs.length;
                }
                const effBase = Math.min((base + bonus) * mul, capVal);
                const eff = effBase * gTotal;
                row.innerHTML = `<span class="mr-2">${YIELD_ICONS[res]}</span><span class="ml-auto font-mono text-right">+${base}${bonus ? `(+${bonus})` : ''} → ${Math.round(eff)}</span>`;
            } else {
                row.innerHTML = `<span class="mr-2">${YIELD_ICONS[res]}</span><span class="ml-auto font-mono text-right">${val > 0 ? '+' : ''}${val}</span>`;
            }
            yieldBox.appendChild(row);
        });
        const market = game.market || { supply: {}, demand: {} };
        const marketKeys = ['food','metal','precious','consumer','energy','oil'];
        const reqRes = Object.entries(b.yields).filter(([res, val]) => marketKeys.includes(res) && (val || 0) < 0).map(([res]) => res);
        let gTotal = 1;
        if (reqRes.length > 0) {
            const gs = reqRes.map(rk => {
                const sup = Math.max(0, Math.floor((market.supply || {})[rk] || 0));
                const dem = Math.max(0, Math.floor((market.demand || {})[rk] || 0));
                const R = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
                if (!isFinite(R)) return 1;
                if (R >= 0.75) return 1;
                const g = Math.max(0.25, Math.min(1, R + 0.25));
                return g;
            });
            gTotal = gs.reduce((a, b) => a + b, 0) / gs.length;
        }
        const effRow = document.createElement('div');
        effRow.className = "flex items中心 text-[10px] text-blue-400 mt-1";
        effRow.innerHTML = `<span>资源效能乘数</span> <span class="ml-auto font-mono text-right">${(Math.round(gTotal * 100) / 100).toFixed(2)}</span>`;
        yieldBox.appendChild(effRow);
        if (type === 'renewable_power') {
            const bonusRow = document.createElement('div');
            bonusRow.className = "flex items-center text-[10px] text-teal-300 mt-1";
            const terr = game.selectedTile?.terrain;
            const seaTerr = terr === 'SHALLOW_SEA' || terr === 'DEEP_SEA';
            const isDesertOrSea = terr === 'DESERT' || seaTerr;
            const bonus = isDesertOrSea ? Math.max(0, b.energy_desert_bonus || 0) : 0;
            bonusRow.innerHTML = `<span>地形加成</span> <span class="ml-auto font-mono text-right">${bonus}</span>`;
            yieldBox.appendChild(bonusRow);
        }
        if (Math.max(0, b.build_power_cap_bonus || 0) > 0) {
            const bpRow = document.createElement('div');
            bpRow.className = "flex items-center text-[10px] text-amber-300 mt-1";
            const effCap = Math.round(Math.max(0, b.build_power_cap_bonus || 0) * Math.max(0, gTotal || 0));
            bpRow.innerHTML = `<span>建造力上限</span> <span class="ml-auto font-mono text-right">+${Math.max(0, b.build_power_cap_bonus || 0)} → +${effCap}</span>`;
            yieldBox.appendChild(bpRow);
        }
        const costEl = document.getElementById('b-modal-cost');
        if (costEl) {
            const req = BuildingsUI.computeRequirement(b);
            const label = document.createElement('div');
            label.className = "text-[10px] text-gray-400";
            label.innerText = `总需建造力: ${req}（队列自动分配）`;
            costEl.innerHTML = '';
            costEl.appendChild(label);
        }
        const confirmBtn = document.getElementById('b-modal-confirm');
        const okHere = game.selectedTile ? BuildingsUI.canBuildHere(game, type, game.selectedTile) : false;
        if (confirmBtn) {
            confirmBtn.disabled = !okHere;
            confirmBtn.title = okHere ? "" : "请选择己方地块或当前地形不允许建设";
        }
        const modal = document.getElementById('build-modal');
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('active'), 10);
    },
    close(game) {
        const modal = document.getElementById('build-modal');
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 200);
        game.pendingBuildType = null;
        game.pendingBuildTile = null;
        game.buildContinuous = false;
    },
    confirm(game) {
        if (!game.pendingBuildType || !game.pendingBuildTile || game.pendingBuildTile.building) return;
        const b = BUILDINGS[game.pendingBuildType];
        if (game.pendingBuildTile.owner !== game.currentOwnerKey) { this.close(game); return; }
        const okHere = BuildingsUI.canBuildHere(game, game.pendingBuildType, game.pendingBuildTile);
        if (!okHere) { this.close(game); return; }
        if (game.cheatInstantBuild) {
            const tile = game.pendingBuildTile;
            tile.building = game.pendingBuildType;
            const bb = BUILDINGS[game.pendingBuildType] || {};
            const mKeys = ['food','metal','precious','consumer','energy','oil'];
            const isMarket = Object.keys(bb.yields || {}).some(k => mKeys.includes(k));
            if (isMarket) tile.marketOwnership = 'state';
            if (game.pendingBuildType === 'city' && typeof game.initCityDistrict === 'function') game.initCityDistrict(tile);
            game.updateDeltas();
            game.updateResourceUI();
            game.updateTilePanel();
            this.close(game);
            return;
        }
        const req = BuildingsUI.computeRequirement(b);
        game.enqueueBuild(game.pendingBuildTile, game.pendingBuildType, req);
        game.updateResourceUI();
        game.updateTilePanel();
        this.close(game);
    },
    renderStrip(game) {
        const cont = document.getElementById('build-strip-list');
        if (!cont) return;
        cont.innerHTML = '';
        const page = Math.max(0, game.buildStripPage || 0);
        const pageSize = 8;
        const entries = Object.entries(BUILDINGS);
        const start = page * pageSize;
        const end = Math.min(entries.length, start + pageSize);
        const pageEntries = entries.slice(start, end);
        pageEntries.forEach(([key, b]) => {
            const clip = document.createElement('button');
            clip.className = "glass-card px-2 py-1 text-[10px] rounded-lg flex flex-col items-center hover:bg-white/10 transition";
            clip.style.width = `${Math.max(40, Math.floor(game.buildClipWidth || 120))}px`;
            const iconHTML = (typeof UIPanels !== 'undefined' && UIPanels.renderBuildingIcon) ? UIPanels.renderBuildingIcon(key, "w-6 h-6") : `<span class='text-[12px]'>${b.icon}</span>`;
            const req = BuildingsUI.computeRequirement(b);
            clip.innerHTML = `<div>${iconHTML}</div><div class="mt-1 font-bold text-center leading-tight break-words whitespace-normal">${b.name}</div><div class="mt-0.5 text-yellow-500 font-mono">${req}</div>`;
            clip.onclick = (e) => { e.stopPropagation(); if (typeof game.selectBuildType === 'function') game.selectBuildType(key); };
            cont.appendChild(clip);
        });
        const prevBtn = document.getElementById('build-strip-prev');
        const nextBtn = document.getElementById('build-strip-next');
        if (prevBtn) prevBtn.disabled = page <= 0;
        if (nextBtn) nextBtn.disabled = end >= entries.length;
    },
    computeRequirement(b) {
        const c = (b && b.cost && typeof b.cost === 'object') ? b.cost : {};
        let total = 0;
        Object.values(c).forEach(v => { if (typeof v === 'number') total += Math.max(0, v || 0); });
        return Math.max(10, Math.floor(total * 0.1));
    }
};
