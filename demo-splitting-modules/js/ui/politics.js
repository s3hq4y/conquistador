const UIPolitics = {
    open(game) {
        const m = document.getElementById('politics-modal');
        if (!m) return;
        m.classList.remove('hidden');
        if (!game.powerLaw) {
            game.powerLaw = 'universal_suffrage';
            game.powerWeights = { elite: 3, expert: 2, labor: 1, subsistence: 0.5 };
        }
        if (!game.govStructure) {
            game.govStructure = 'presidential_republic';
        }
        if (!game.economySystem) {
            game.economySystem = 'intervention';
        }
        if (!game.healthLaw) {
            game.healthLaw = 'none';
        }
        if (!game.educationLaw) {
            game.educationLaw = 'none';
        }
        if (!game.speechLaw) {
            game.speechLaw = 'press_censorship';
        }
        if (!game.socialSecurityLaw) {
            game.socialSecurityLaw = 'none';
        }
        if (!game.conscriptionLaw) {
            game.conscriptionLaw = 'demilitarized';
            game.conscriptionPct = 0.01;
            game.conscriptionGrowthPenalty = 0;
        }
        if (!game.taxLaw) {
            game.taxLaw = 'consumption_tax';
        }
        const tabStats = document.getElementById('pol-tab-stats');
        const tabStruct = document.getElementById('pol-tab-structure');
        const tabEconomy = document.getElementById('pol-tab-economy');
        const tabSocial = document.getElementById('pol-tab-social');
        if (tabStats) tabStats.onclick = () => this.setTab(game, 'stats');
        if (tabStruct) tabStruct.onclick = () => this.setTab(game, 'structure');
        if (tabEconomy) tabEconomy.onclick = () => this.setTab(game, 'economy');
        if (tabSocial) tabSocial.onclick = () => this.setTab(game, 'social');
        if (!game.politicsTab) game.politicsTab = 'stats';
        this.updateTabsUI(game);
        this.render(game);
    },
    spendCiv(game, cost) {
        const cur = Math.max(0, Math.floor(game.res.civilization || 0));
        const amt = Math.max(0, Math.floor(cost || 0));
        game.res.civilization = Math.max(0, cur - amt);
    },
    close(game) {
        const m = document.getElementById('politics-modal');
        if (!m) return;
        m.classList.add('hidden');
    },
    setTab(game, tab) {
        game.politicsTab = tab;
        this.updateTabsUI(game);
        this.render(game);
    },
    updateTabsUI(game) {
        const tabStats = document.getElementById('pol-tab-stats');
        const tabStruct = document.getElementById('pol-tab-structure');
        const tabEconomy = document.getElementById('pol-tab-economy');
        const tabSocial = document.getElementById('pol-tab-social');
        const activeCls = 'px-4 py-2 text-xs font-bold bg-violet-700 text-white';
        const normalCls = 'px-4 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300';
        if (tabStats) tabStats.className = (game.politicsTab === 'stats') ? activeCls : normalCls;
        if (tabStruct) tabStruct.className = (game.politicsTab === 'structure') ? activeCls : `${normalCls} border-l border-white/10`;
        if (tabEconomy) tabEconomy.className = (game.politicsTab === 'economy') ? activeCls : `${normalCls} border-l border-white/10`;
        if (tabSocial) tabSocial.className = (game.politicsTab === 'social') ? activeCls : `${normalCls} border-l border-white/10`;
    },
    render(game) {
        const container = document.getElementById('politics-container');
        const ptsEl = document.getElementById('politics-available-points');
        if (!container || !ptsEl) return;
        ptsEl.innerText = Math.floor(game.res.civilization || 0);
        container.innerHTML = '';
        if (game.politicsTab === 'stats') {
            this.renderStats(game, container);
        } else if (game.politicsTab === 'structure') {
            this.renderStructure(game, container);
        } else if (game.politicsTab === 'economy') {
            this.renderEconomy(game, container);
        } else {
            this.renderSocial(game, container);
        }
    },
    getAggClassTotals(game) {
        const agg = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        Object.keys(game.cityDistricts || {}).forEach(dk => {
            const dist = typeof game.getDistrictClassDistribution === 'function' ? game.getDistrictClassDistribution(dk) : null;
            if (!dist) return;
            agg.elite += Math.max(0, Math.floor(dist.elite || 0));
            agg.expert += Math.max(0, Math.floor(dist.expert || 0));
            agg.labor += Math.max(0, Math.floor(dist.labor || 0));
            agg.subsistence += Math.max(0, Math.floor(dist.subsistence || 0));
        });
        return agg;
    },
    getAggClassTotalsForOwner(game, ownerKey) {
        const agg = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const target = ownerKey || game.currentOwnerKey;
        const tileMap = new Map((game.grid || []).map(t => [`${t.q},${t.r}`, t]));
        Object.keys(game.cityDistricts || {}).forEach(dk => {
            const parts = String(dk).split(',');
            const cq = parseInt(parts[0], 10), cr = parseInt(parts[1], 10);
            const center = tileMap.get(`${cq},${cr}`) || (game.grid || []).find(t => t && t.q === cq && t.r === cr);
            const owner = center?.owner || null;
            if (owner !== target) return;
            const dist = typeof game.getDistrictClassDistribution === 'function' ? game.getDistrictClassDistribution(dk) : null;
            if (!dist) return;
            agg.elite += Math.max(0, Math.floor(dist.elite || 0));
            agg.expert += Math.max(0, Math.floor(dist.expert || 0));
            agg.labor += Math.max(0, Math.floor(dist.labor || 0));
            agg.subsistence += Math.max(0, Math.floor(dist.subsistence || 0));
        });
        return agg;
    },
    getPowerShares(game, totals) {
        const wBase = game.powerWeights || { elite: 3, expert: 2, labor: 1, subsistence: 0.5 };
        let w = { ...wBase };
        if (game.govStructure === 'monarchy') {
            w.elite = Math.max(0, (w.elite || 0) * 1.5);
        } else if (game.govStructure === 'parliamentary_republic') {
            w.expert = Math.max(0, (w.expert || 0) * 1.5);
            w.labor = Math.max(0, (w.labor || 0) * 1.5);
        }
        if (game.socialSecurityLaw === 'poor_relief') {
            w.labor = Math.max(0, (w.labor || 0) * 0.75);
            w.subsistence = Math.max(0, (w.subsistence || 0) * 0.5);
        }
        const e = Math.max(0, Math.floor(totals.elite || 0)) * Math.max(0, w.elite || 0);
        const x = Math.max(0, Math.floor(totals.expert || 0)) * Math.max(0, w.expert || 0);
        const l = Math.max(0, Math.floor(totals.labor || 0)) * Math.max(0, w.labor || 0);
        const s = Math.max(0, Math.floor(totals.subsistence || 0)) * Math.max(0, w.subsistence || 0);
        const sum = e + x + l + s;
        if (sum <= 0) return { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        return { elite: e / sum, expert: x / sum, labor: l / sum, subsistence: s / sum };
    },
    getRegimeName(game) {
        const gov = game.govStructure || 'presidential_republic';
        const pow = game.powerLaw || 'universal_suffrage';
        const econ = game.economySystem || 'intervention';
        let name = '共和国';
        if (gov === 'monarchy') {
            if (pow === 'dictatorship') {
                if (econ === 'planned') name = '君主制（计划经济）';
                else if (econ === 'laissez_faire') name = '君主制（自由放任）';
                else if (econ === 'traditionalism') name = '集权君主制';
                else name = '君主制（国家干预）';
            } else if (pow === 'qualified_suffrage') {
                if (econ === 'laissez_faire') name = '君主立宪制';
                else if (econ === 'intervention') name = '二元君主立宪制';
                else if (econ === 'planned') name = '社会君主立宪制';
                else name = '传统君主立宪制';
            } else {
                if (econ === 'laissez_faire') name = '自由主义立宪君主制';
                // else if (econ === 'planned') name = '社会立宪君主制';
                else name = '立宪君主制';
            }
        } else if (gov === 'fascist_state') {
            if (econ === 'planned') name = '指令社团主义国';
            else if (econ === 'laissez_faire') name = '资本寡头制';
            else if (econ === 'traditionalism') name = '国家社团';
            else name = '国家社会主义制';
        } else if (gov === 'presidential_republic') {
            if (pow === 'dictatorship') {
                if (econ === 'planned') name = '总统制极权国家';
                else if (econ === 'laissez_faire') name = '总统独裁制';
                else name = '总统制威权国家';
            } else if (pow === 'qualified_suffrage') {
                if (econ === 'laissez_faire') name = '自由主义共和国';
                else name = '保守共和国';
            } else {
                if (econ === 'laissez_faire') name = '自由主义共和国';
                // else if (econ === 'intervention') name = '共和国';
                else if (econ === 'planned') name = '社会主义共和国';
                else name = '共和国';
            }
        } else if (gov === 'parliamentary_republic') {
            if (pow === 'dictatorship') {
                if (econ === 'planned') name = '极权议会国家';
                else name = '威权议会制';
            } else {
                if (econ === 'laissez_faire') name = '自由市场议会制';
                else if (econ === 'intervention') name = '社会自由主义议会制';
                else if (econ === 'planned') name = '议会社会主义国家';
                else name = '议会共和制';
            }
        } else if (gov === 'committee_republic') {
            if (econ === 'planned') name = '人民委员会社会主义国家';
            else if (econ === 'intervention') name = '人民委员会共和国';
            else if (econ === 'laissez_faire') name = '特色社会主义共和国';
            else if (econ === 'cooperative') name = '苏维埃共和国';
            else name = '委员会共和国';
        }
        return name;
    },
    getRegimeColor(game) {
        const gov = game.govStructure || 'presidential_republic';
        const econ = game.economySystem || 'intervention';
        if (gov === 'fascist_state') return 'text-amber-700';
        if (gov === 'monarchy') return 'text-yellow-400';
        if (econ === 'planned') return 'text-red-400';
        if (econ === 'cooperative') return 'text-red-400';
        if (econ === 'laissez_faire') return 'text-blue-400';
        return 'text-white';
    },
    getClassSatisfaction(game) {
        const mul = (n) => Math.max(0, Math.floor(n || 0)) * 3;
        const law = game.taxLaw || 'consumption_tax';
        const gov = game.govStructure || 'presidential_republic';
        const pow = game.powerLaw || 'universal_suffrage';
        const taxOpp = {
            consumption_tax: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            head_tax: { elite: 0, expert: 0, labor: 3, subsistence: 3 },
            proportional_tax: { elite: 3, expert: 2, labor: 0, subsistence: 0 },
            progressive_tax: { elite: 2, expert: 2, labor: 0, subsistence: 0 }
        }[law] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const govOpp = {
            monarchy: { elite: 0, expert: 1, labor: 3, subsistence: 0 },
            presidential_republic: { elite: 2, expert: 0, labor: 0, subsistence: 0 },
            parliamentary_republic: { elite: 3, expert: 0, labor: 0, subsistence: 0 },
            committee_republic: { elite: 3, expert: 2, labor: 0, subsistence: 0 }
        }[gov] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const powOpp = {
            dictatorship: { elite: 0, expert: 1, labor: 3, subsistence: 0 },
            qualified_suffrage: { elite: 3, expert: 0, labor: 0, subsistence: 0 },
            universal_suffrage: { elite: 3, expert: 2, labor: 0, subsistence: 0 }
        }[pow] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const healthOpp = {
            none: { elite: 0, expert: 0, labor: 1, subsistence: 0 },
            private_insurance: { elite: 0, expert: 0, labor: 2, subsistence: 1 },
            public_insurance: { elite: 1, expert: 0, labor: 0, subsistence: 0 }
        }[game.healthLaw || 'none'] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const eduOpp = {
            none: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            private_school: { elite: 0, expert: 0, labor: 2, subsistence: 0 },
            public_school: { elite: 1, expert: 0, labor: 0, subsistence: 0 }
        }[game.educationLaw || 'none'] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const speechOpp = {
            illegal_dissent: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            press_censorship: { elite: 1, expert: 0, labor: 0, subsistence: 0 },
            free_speech: { elite: 3, expert: 0, labor: 0, subsistence: 0 }
        }[game.speechLaw || 'press_censorship'] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const ssOpp = {
            none: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            poor_relief: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            wage_subsidy: { elite: 2, expert: 0, labor: 0, subsistence: 0 },
            pension: { elite: 3, expert: 1, labor: 0, subsistence: 0 }
        }[game.socialSecurityLaw || 'none'] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const oppFactor = (game.speechLaw === 'illegal_dissent') ? 1.5 : (game.speechLaw === 'free_speech' ? 0.5 : 1.0);
        const consOpp = {
            demilitarized: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            volunteer: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            professional: { elite: 0, expert: 0, labor: 0, subsistence: 1 },
            mass_conscription: { elite: 0, expert: 0, labor: 0, subsistence: 2 }
        }[game.conscriptionLaw || 'demilitarized'] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const base = 60;
        const sats = { elite: base, expert: base, labor: base, subsistence: base };
        sats.elite = Math.max(0, Math.min(100, base - mul((taxOpp.elite || 0) * oppFactor) - mul((govOpp.elite || 0) * oppFactor) - mul((powOpp.elite || 0) * oppFactor) - mul((healthOpp.elite || 0) * oppFactor) - mul((eduOpp.elite || 0) * oppFactor) - mul((consOpp.elite || 0) * oppFactor) - mul((speechOpp.elite || 0) * oppFactor) - mul((ssOpp.elite || 0) * oppFactor)));
        sats.expert = Math.max(0, Math.min(100, base - mul((taxOpp.expert || 0) * oppFactor) - mul((govOpp.expert || 0) * oppFactor) - mul((powOpp.expert || 0) * oppFactor) - mul((healthOpp.expert || 0) * oppFactor) - mul((eduOpp.expert || 0) * oppFactor) - mul((consOpp.expert || 0) * oppFactor) - mul((speechOpp.expert || 0) * oppFactor) - mul((ssOpp.expert || 0) * oppFactor)));
        sats.labor = Math.max(0, Math.min(100, base - mul((taxOpp.labor || 0) * oppFactor) - mul((govOpp.labor || 0) * oppFactor) - mul((powOpp.labor || 0) * oppFactor) - mul((healthOpp.labor || 0) * oppFactor) - mul((eduOpp.labor || 0) * oppFactor) - mul((consOpp.labor || 0) * oppFactor) - mul((speechOpp.labor || 0) * oppFactor) - mul((ssOpp.labor || 0) * oppFactor)));
        sats.subsistence = Math.max(0, Math.min(100, base - mul((taxOpp.subsistence || 0) * oppFactor) - mul((govOpp.subsistence || 0) * oppFactor) - mul((powOpp.subsistence || 0) * oppFactor) - mul((healthOpp.subsistence || 0) * oppFactor) - mul((eduOpp.subsistence || 0) * oppFactor) - mul((consOpp.subsistence || 0) * oppFactor) - mul((speechOpp.subsistence || 0) * oppFactor) - mul((ssOpp.subsistence || 0) * oppFactor)));
        if (game.healthLaw === 'private_insurance') {
            sats.elite = Math.min(100, sats.elite + 40);
            sats.expert = Math.min(100, sats.expert + 20);
        } else if (game.healthLaw === 'public_insurance') {
            sats.elite = Math.min(100, sats.elite + 20);
            sats.expert = Math.min(100, sats.expert + 20);
            sats.labor = Math.min(100, sats.labor + 20);
            sats.subsistence = Math.min(100, sats.subsistence + 20);
        }
        if (game.socialSecurityLaw === 'wage_subsidy') {
            sats.expert = Math.min(100, sats.expert + 10);
            sats.labor = Math.min(100, sats.labor + 10);
            sats.subsistence = Math.min(100, sats.subsistence + 10);
        } else if (game.socialSecurityLaw === 'pension') {
            sats.elite = Math.min(100, sats.elite + 10);
            sats.expert = Math.min(100, sats.expert + 10);
            sats.labor = Math.min(100, sats.labor + 10);
            sats.subsistence = Math.min(100, sats.subsistence + 10);
        }
        if (game.educationLaw === 'public_school') {
            sats.expert = Math.min(100, sats.expert + 5);
            sats.labor = Math.min(100, sats.labor + 5);
        }
        const totals = this.getAggClassTotals(game);
        const sum = Math.max(1, Math.floor((totals.elite || 0) + (totals.expert || 0) + (totals.labor || 0) + (totals.subsistence || 0)));
        const shElite = Math.max(0, Math.min(1, (totals.elite || 0) / sum));
        const shExpert = Math.max(0, Math.min(1, (totals.expert || 0) / sum));
        const shLabor = Math.max(0, Math.min(1, (totals.labor || 0) / sum));
        const shSubsistence = Math.max(0, Math.min(1, (totals.subsistence || 0) / sum));
        sats.elite = Math.max(0, Math.min(100, Math.floor(sats.elite + shElite * 10)));
        sats.expert = Math.max(0, Math.min(100, Math.floor(sats.expert + shExpert * 10)));
        sats.labor = Math.max(0, Math.min(100, Math.floor(sats.labor + shLabor * 10)));
        sats.subsistence = Math.max(0, Math.min(100, Math.floor(sats.subsistence + shSubsistence * 10)));
        const pen = game.satPenaltyByClass || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        sats.elite = Math.max(0, Math.min(100, Math.floor(sats.elite + Math.floor(pen.elite || 0))));
        sats.expert = Math.max(0, Math.min(100, Math.floor(sats.expert + Math.floor(pen.expert || 0))));
        sats.labor = Math.max(0, Math.min(100, Math.floor(sats.labor + Math.floor(pen.labor || 0))));
        sats.subsistence = Math.max(0, Math.min(100, Math.floor(sats.subsistence + Math.floor(pen.subsistence || 0))));
        if (game.economySystem === 'cooperative') {
            sats.labor = Math.min(100, sats.labor + 5);
            sats.subsistence = Math.min(100, sats.subsistence + 5);
        }
        return sats;
    },
    renderStats(game, container) {
        const list = document.createElement('div');
        list.className = "space-y-4";
        const regimeBox = document.createElement('div');
        regimeBox.className = "glass-card p-4 text-[12px]";
        const colorCls = this.getRegimeColor(game);
        regimeBox.innerHTML = `<div class="flex justify-between items-center"><div class="text-gray-300">国体</div><div class="font-mono ${colorCls}">${this.getRegimeName(game)}</div></div>`;
        list.appendChild(regimeBox);
        let total = 0;
        let cityCount = 0;
        let adminCount = 0;
        let adminBonusPer = 0;
        let adminLevel = 0;
        let mulCity = 1;
        let mulAdmin = 1;
        (game.grid || []).forEach(t => {
            if (t.owner !== (game.currentOwnerKey || 'Player') || !t.building) return;
            const b = BUILDINGS[t.building];
            const mul = Research.getMultiplier(game, t.building);
            if (t.building === 'city') {
                const base = Math.max(0, b.yields.civilization || 0);
                const gov = game.govStructure || '';
                const speech = game.speechLaw || 'press_censorship';
                let civBonus = 0;
                if (gov === 'monarchy') civBonus += 1.0;
                else if (gov === 'presidential_republic') civBonus += 0.5;
                if (speech === 'illegal_dissent') civBonus += 1.0;
                else if (speech === 'press_censorship') civBonus += 0.25;
                const eff = base * mul * (1 + civBonus);
                total += eff;
                cityCount += 1;
                mulCity = mul;
            }
            if (t.building === 'admin_center') {
                const base = Math.max(0, b.yields.civilization || 0);
                const bonusPer = Math.max(0, Math.floor(b.admin_civ_bonus_per_level || 1));
                const lvl = Math.max(0, Math.floor(Research.getLevel(game, 'administration') || 0));
                const effBase = base + bonusPer * lvl;
                const gov = game.govStructure || '';
                const speech = game.speechLaw || 'press_censorship';
                let civBonus = 0;
                if (gov === 'monarchy') civBonus += 1.0;
                else if (gov === 'presidential_republic') civBonus += 0.5;
                if (speech === 'illegal_dissent') civBonus += 1.0;
                else if (speech === 'press_censorship') civBonus += 0.25;
                const eff = effBase * mul * (1 + civBonus);
                total += eff;
                adminCount += 1;
                adminBonusPer = bonusPer;
                adminLevel = lvl;
                mulAdmin = mul;
            }
        });
        const head = document.createElement('div');
        head.className = "glass-card p-4 text-[12px]";
        head.innerHTML = `<div class="flex justify-between items-center"><div class="text-gray-300">当期文明点产出</div><div class="font-mono text-violet-400">${Math.round(total)}</div></div>`;
        list.appendChild(head);
        const cityBox = document.createElement('div');
        cityBox.className = "glass-card p-4 text-[11px]";
        cityBox.innerHTML = `<div class="flex justify-between"><span>城市数量</span><span class="font-mono text-white">${cityCount}</span></div><div class="flex justify-between"><span>城市乘数</span><span class="font-mono text-cyan-400">${Math.round(mulCity * 100)}%</span></div>`;
        list.appendChild(cityBox);
        const adminBox = document.createElement('div');
        adminBox.className = "glass-card p-4 text-[11px]";
        const bonusText = adminCount > 0 ? ('+' + adminBonusPer + ' × ' + adminLevel) : '+0 × 0';
        adminBox.innerHTML = `<div class="flex justify-between"><span>行政中心数量</span><span class="font-mono text-white">${adminCount}</span></div><div class="flex justify-between"><span>行政科技加成</span><span class="font-mono text-violet-400">${bonusText}</span></div><div class="flex justify-between"><span>行政中心乘数</span><span class="font-mono text-cyan-400">${Math.round(mulAdmin * 100)}%</span></div>`;
        list.appendChild(adminBox);
        const totals = this.getAggClassTotals(game);
        const shares = this.getPowerShares(game, totals);
        const powerBox = document.createElement('div');
        powerBox.className = "glass-card p-4 text-[11px] flex-1";
        const pct = k => Math.round((shares[k] || 0) * 100);
        const sats = this.getClassSatisfaction(game);
        powerBox.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">政治力量分布</div>
            <div class="flex justify-between items-center h-6 leading-6"><span>精英</span><span class="w-16 text-center font-mono text-white">${pct('elite')}%</span></div>
            <div class="flex justify-between items-center h-6 leading-6"><span>专家</span><span class="w-16 text-center font-mono text-white">${pct('expert')}%</span></div>
            <div class="flex justify-between items-center h-6 leading-6"><span>劳工</span><span class="w-16 text-center font-mono text-white">${pct('labor')}%</span></div>
            <div class="flex justify-between items-center h-6 leading-6"><span>自给农</span><span class="w-16 text-center font-mono text-white">${pct('subsistence')}%</span></div>
        `;
        const popBox = document.createElement('div');
        popBox.className = "glass-card p-4 text-[11px] flex-1";
        popBox.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2 text-right">人口数量</div>
            <div class="flex flex-col items-end">
                <span class="w-full text-right font-mono text-emerald-300 h-6 leading-6">${Math.max(0, Math.floor((totals.elite || 0)))}</span>
                <span class="w-full text-right font-mono text-cyan-300 h-6 leading-6">${Math.max(0, Math.floor((totals.expert || 0)))}</span>
                <span class="w-full text-right font-mono text-blue-300 h-6 leading-6">${Math.max(0, Math.floor((totals.labor || 0)))}</span>
                <span class="w-full text-right font-mono text-gray-300 h-6 leading-6">${Math.max(0, Math.floor((totals.subsistence || 0)))}</span>
            </div>
        `;
        const satBox = document.createElement('div');
        satBox.className = "glass-card p-4 text-[11px] flex-1";
        satBox.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2 text-right">人口满意度</div>
            <div class="flex flex-col items-end">
                <span class="w-full text-right font-mono text-emerald-300 h-6 leading-6">${Math.round(sats.elite)}%</span>
                <span class="w-full text-right font-mono text-cyan-300 h-6 leading-6">${Math.round(sats.expert)}%</span>
                <span class="w-full text-right font-mono text-blue-300 h-6 leading-6">${Math.round(sats.labor)}%</span>
                <span class="w-full text-right font-mono text-gray-300 h-6 leading-6">${Math.round(sats.subsistence)}%</span>
            </div>
        `;
        const row = document.createElement('div');
        row.className = "flex items-stretch gap-4";
        row.appendChild(powerBox);
        row.appendChild(popBox);
        row.appendChild(satBox);
        list.appendChild(row);
        container.appendChild(list);
    },
    renderSocial(game, container) {
        const wrap = document.createElement('div');
        wrap.className = "space-y-4";
        const group = document.createElement('div');
        group.className = "glass-card p-4 text-[11px]";
        const actNone = game.healthLaw === 'none';
        const actPriv = game.healthLaw === 'private_insurance';
        const actPub = game.healthLaw === 'public_insurance';
        const activeBtnCls = "px-3 py-2 rounded-lg bg-violet-700 text-white text-[11px] font-bold";
        const normalBtnCls = "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold";
        const clsNone = actNone ? activeBtnCls : normalBtnCls;
        const clsPriv = actPriv ? activeBtnCls : normalBtnCls;
        const clsPub = actPub ? activeBtnCls : normalBtnCls;
        group.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">卫生系统</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">无卫生保障</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">无效果</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：劳工轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="health-cost-none">300</span></span>
                    <button id="health-none" class="${clsNone}">${actNone ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">私人医疗保险</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">城市人口增长率 +0.5%；精英满意度 +40；专家满意度 +20</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：劳工反对，自给农轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="health-cost-priv">300</span></span>
                    <button id="health-private" class="${clsPriv}">${actPriv ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">公共医疗保险</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">城市人口增长率 +2%；各阶层满意度 +20</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">公共服务开支：3% 收入</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="health-cost-pub">300</span></span>
                    <button id="health-public" class="${clsPub}">${actPub ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(group);
        container.appendChild(wrap);
        const ssGroup = document.createElement('div');
        ssGroup.className = "glass-card p-4 text-[11px]";
        const actSSNone = game.socialSecurityLaw === 'none';
        const actSSPoor = game.socialSecurityLaw === 'poor_relief';
        const actSSWage = game.socialSecurityLaw === 'wage_subsidy';
        const actSSPens = game.socialSecurityLaw === 'pension';
        const clsAct = "px-3 py-2 rounded-lg bg-violet-700 text-white text-[11px] font-bold";
        const clsNorm = "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold";
        const clsSSNone = actSSNone ? clsAct : clsNorm;
        const clsSSPoor = actSSPoor ? clsAct : clsNorm;
        const clsSSWage = actSSWage ? clsAct : clsNorm;
        const clsSSPens = actSSPens ? clsAct : clsNorm;
        ssGroup.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">保障系统</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">无基本保障</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">无效果</div>
                    <div class="text-[10px] text-green-400 mt-0.5">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="ss-cost-none">200</span></span>
                    <button id="ss-none" class="${clsSSNone}">${actSSNone ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">济贫法</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">政府将 5% 收入补贴劳工与自给农（劳工×2），直接补充至社会盈余；劳工权重 -25%，自给农权重 -50%</div>
                    <div class="text-[10px] text-green-400 mt-0.5">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="ss-cost-poor">200</span></span>
                    <button id="ss-poor" class="${clsSSPoor}">${actSSPoor ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">工资补贴</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">政府将 10% 收入补贴专家与劳工（专家×2），直接补充至社会盈余；除精英外各阶层满意度 +10%</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="ss-cost-wage">200</span></span>
                    <button id="ss-wage" class="${clsSSWage}">${actSSWage ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">养老保险</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">政府将 15% 收入平均补贴四阶层，直接补充至社会盈余；各阶层满意度 +10%</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英强烈反对，专家轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="ss-cost-pens">200</span></span>
                    <button id="ss-pens" class="${clsSSPens}">${actSSPens ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(ssGroup);
        container.appendChild(wrap);
        const totalsSS = this.getAggClassTotals(game);
        const sharesSS = this.getPowerShares(game, totalsSS);
        const oppSS = {
            none: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            poor_relief: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            wage_subsidy: { elite: 2, expert: 0, labor: 0, subsistence: 0 },
            pension: { elite: 3, expert: 1, labor: 0, subsistence: 0 }
        };
        const baseSSCost = 200;
        const factorSSNone = (sharesSS.elite || 0) * (oppSS.none.elite || 0) + (sharesSS.expert || 0) * (oppSS.none.expert || 0) + (sharesSS.labor || 0) * (oppSS.none.labor || 0) + (sharesSS.subsistence || 0) * (oppSS.none.subsistence || 0);
        const factorSSPoor = (sharesSS.elite || 0) * (oppSS.poor_relief.elite || 0) + (sharesSS.expert || 0) * (oppSS.poor_relief.expert || 0) + (sharesSS.labor || 0) * (oppSS.poor_relief.labor || 0) + (sharesSS.subsistence || 0) * (oppSS.poor_relief.subsistence || 0);
        const factorSSWage = (sharesSS.elite || 0) * (oppSS.wage_subsidy.elite || 0) + (sharesSS.expert || 0) * (oppSS.wage_subsidy.expert || 0) + (sharesSS.labor || 0) * (oppSS.wage_subsidy.labor || 0) + (sharesSS.subsistence || 0) * (oppSS.wage_subsidy.subsistence || 0);
        const factorSSPens = (sharesSS.elite || 0) * (oppSS.pension.elite || 0) + (sharesSS.expert || 0) * (oppSS.pension.expert || 0) + (sharesSS.labor || 0) * (oppSS.pension.labor || 0) + (sharesSS.subsistence || 0) * (oppSS.pension.subsistence || 0);
        const costSSNone = baseSSCost + Math.round(baseSSCost * factorSSNone);
        const costSSPoor = baseSSCost + Math.round(baseSSCost * factorSSPoor);
        const costSSWage = baseSSCost + Math.round(baseSSCost * factorSSWage);
        const costSSPens = baseSSCost + Math.round(baseSSCost * factorSSPens);
        const cSSNone = document.getElementById('ss-cost-none');
        const cSSPoor = document.getElementById('ss-cost-poor');
        const cSSWage = document.getElementById('ss-cost-wage');
        const cSSPens = document.getElementById('ss-cost-pens');
        if (cSSNone) cSSNone.innerText = String(costSSNone);
        if (cSSPoor) cSSPoor.innerText = String(costSSPoor);
        if (cSSWage) cSSWage.innerText = String(costSSWage);
        if (cSSPens) cSSPens.innerText = String(costSSPens);
        const ptsSS = Math.max(0, Math.floor(game.res.civilization || 0));
        const btnSSNone = document.getElementById('ss-none');
        if (btnSSNone && !actSSNone) {
            if (ptsSS < costSSNone) { btnSSNone.disabled = true; btnSSNone.onclick = null; btnSSNone.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnSSNone.onclick = () => { this.spendCiv(game, costSSNone); game.socialSecurityLaw = 'none'; game.updateDeltas(); game.updateResourceUI(); this.render(game); };
            }
        }
        const btnSSPoor = document.getElementById('ss-poor');
        if (btnSSPoor && !actSSPoor) {
            if (ptsSS < costSSPoor) { btnSSPoor.disabled = true; btnSSPoor.onclick = null; btnSSPoor.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnSSPoor.onclick = () => { this.spendCiv(game, costSSPoor); game.socialSecurityLaw = 'poor_relief'; game.updateDeltas(); game.updateResourceUI(); this.render(game); };
            }
        }
        const btnSSWage = document.getElementById('ss-wage');
        if (btnSSWage && !actSSWage) {
            if (ptsSS < costSSWage) { btnSSWage.disabled = true; btnSSWage.onclick = null; btnSSWage.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnSSWage.onclick = () => { this.spendCiv(game, costSSWage); game.socialSecurityLaw = 'wage_subsidy'; game.updateDeltas(); game.updateResourceUI(); this.render(game); };
            }
        }
        const btnSSPens = document.getElementById('ss-pens');
        if (btnSSPens && !actSSPens) {
            if (ptsSS < costSSPens) { btnSSPens.disabled = true; btnSSPens.onclick = null; btnSSPens.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnSSPens.onclick = () => { this.spendCiv(game, costSSPens); game.socialSecurityLaw = 'pension'; game.updateDeltas(); game.updateResourceUI(); this.render(game); };
            }
        }
        const totals = this.getAggClassTotals(game);
        const shares = this.getPowerShares(game, totals);
        const oppMap = {
            none: { elite: 0, expert: 0, labor: 1, subsistence: 0 },
            private_insurance: { elite: 0, expert: 0, labor: 2, subsistence: 1 },
            public_insurance: { elite: 1, expert: 0, labor: 0, subsistence: 0 }
        };
        const baseCost = 300;
        const factorNone = (shares.elite || 0) * (oppMap.none.elite || 0) + (shares.expert || 0) * (oppMap.none.expert || 0) + (shares.labor || 0) * (oppMap.none.labor || 0) + (shares.subsistence || 0) * (oppMap.none.subsistence || 0);
        const factorPriv = (shares.elite || 0) * (oppMap.private_insurance.elite || 0) + (shares.expert || 0) * (oppMap.private_insurance.expert || 0) + (shares.labor || 0) * (oppMap.private_insurance.labor || 0) + (shares.subsistence || 0) * (oppMap.private_insurance.subsistence || 0);
        const factorPub = (shares.elite || 0) * (oppMap.public_insurance.elite || 0) + (shares.expert || 0) * (oppMap.public_insurance.expert || 0) + (shares.labor || 0) * (oppMap.public_insurance.labor || 0) + (shares.subsistence || 0) * (oppMap.public_insurance.subsistence || 0);
        const costNone = baseCost + Math.round(baseCost * factorNone);
        const costPriv = baseCost + Math.round(baseCost * factorPriv);
        const costPub = baseCost + Math.round(baseCost * factorPub);
        const cNone = document.getElementById('health-cost-none');
        const cPriv = document.getElementById('health-cost-priv');
        const cPub = document.getElementById('health-cost-pub');
        if (cNone) cNone.innerText = String(costNone);
        if (cPriv) cPriv.innerText = String(costPriv);
        if (cPub) cPub.innerText = String(costPub);
        const ptsSocial = Math.max(0, Math.floor(game.res.civilization || 0));
        const btnNone = document.getElementById('health-none');
        if (btnNone && !actNone) {
            if (ptsSocial < costNone) { btnNone.disabled = true; btnNone.onclick = null; btnNone.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnNone.onclick = () => {
                    this.spendCiv(game, costNone);
                    game.healthLaw = 'none';
                    game.healthGrowthBonus = 0;
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
        const btnPriv = document.getElementById('health-private');
        if (btnPriv && !actPriv) {
            if (ptsSocial < costPriv) { btnPriv.disabled = true; btnPriv.onclick = null; btnPriv.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnPriv.onclick = () => {
                    this.spendCiv(game, costPriv);
                    game.healthLaw = 'private_insurance';
                    game.healthGrowthBonus = 0.005;
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
        const btnPub = document.getElementById('health-public');
        if (btnPub && !actPub) {
            if (ptsSocial < costPub) { btnPub.disabled = true; btnPub.onclick = null; btnPub.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnPub.onclick = () => {
                    this.spendCiv(game, costPub);
                    game.healthLaw = 'public_insurance';
                    game.healthGrowthBonus = 0.02;
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
        const edu = document.createElement('div');
        edu.className = "glass-card p-4 text-[11px]";
        const actEduNone = game.educationLaw === 'none';
        const actEduPriv = game.educationLaw === 'private_school';
        const actEduPub = game.educationLaw === 'public_school';
        const clsEduNone = actEduNone ? activeBtnCls : normalBtnCls;
        const clsEduPriv = actEduPriv ? activeBtnCls : normalBtnCls;
        const clsEduPub = actEduPub ? activeBtnCls : normalBtnCls;
        edu.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">教育系统</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">无教育系统</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">无效果</div>
                    <div class="text-[10px] text-green-400 mt-0.5">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="edu-cost-none">300</span></span>
                    <button id="edu-none" class="${clsEduNone}">${actEduNone ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">私立学校</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">科研效能 +25%</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：劳工反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="edu-cost-priv">300</span></span>
                    <button id="edu-private" class="${clsEduPriv}">${actEduPriv ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">公立学校</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">科研效能 +25%；自给农减少，劳工轻微增多，专家轻微增多</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">公共服务开支：3% 收入</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="edu-cost-pub">300</span></span>
                    <button id="edu-public" class="${clsEduPub}">${actEduPub ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(edu);
        const totalsEdu = this.getAggClassTotals(game);
        const sharesEdu = this.getPowerShares(game, totalsEdu);
        const eduOpp = {
            none: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            private_school: { elite: 0, expert: 0, labor: 2, subsistence: 0 },
            public_school: { elite: 1, expert: 0, labor: 0, subsistence: 0 }
        };
        const baseEduCost = 300;
        const factorEduNone = (sharesEdu.elite || 0) * (eduOpp.none.elite || 0) + (sharesEdu.expert || 0) * (eduOpp.none.expert || 0) + (sharesEdu.labor || 0) * (eduOpp.none.labor || 0) + (sharesEdu.subsistence || 0) * (eduOpp.none.subsistence || 0);
        const factorEduPriv = (sharesEdu.elite || 0) * (eduOpp.private_school.elite || 0) + (sharesEdu.expert || 0) * (eduOpp.private_school.expert || 0) + (sharesEdu.labor || 0) * (eduOpp.private_school.labor || 0) + (sharesEdu.subsistence || 0) * (eduOpp.private_school.subsistence || 0);
        const factorEduPub = (sharesEdu.elite || 0) * (eduOpp.public_school.elite || 0) + (sharesEdu.expert || 0) * (eduOpp.public_school.expert || 0) + (sharesEdu.labor || 0) * (eduOpp.public_school.labor || 0) + (sharesEdu.subsistence || 0) * (eduOpp.public_school.subsistence || 0);
        const costEduNone = baseEduCost + Math.round(baseEduCost * factorEduNone);
        const costEduPriv = baseEduCost + Math.round(baseEduCost * factorEduPriv);
        const costEduPub = baseEduCost + Math.round(baseEduCost * factorEduPub);
        const cEduNone = document.getElementById('edu-cost-none');
        const cEduPriv = document.getElementById('edu-cost-priv');
        const cEduPub = document.getElementById('edu-cost-pub');
        if (cEduNone) cEduNone.innerText = String(costEduNone);
        if (cEduPriv) cEduPriv.innerText = String(costEduPriv);
        if (cEduPub) cEduPub.innerText = String(costEduPub);
        const ptsEdu = Math.max(0, Math.floor(game.res.civilization || 0));
        const btnEduNone = document.getElementById('edu-none');
        if (btnEduNone && !actEduNone) {
            if (ptsEdu < costEduNone) { btnEduNone.disabled = true; btnEduNone.onclick = null; btnEduNone.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnEduNone.onclick = () => {
                    this.spendCiv(game, costEduNone);
                    game.educationLaw = 'none';
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
        const btnEduPriv = document.getElementById('edu-private');
        if (btnEduPriv && !actEduPriv) {
            if (ptsEdu < costEduPriv) { btnEduPriv.disabled = true; btnEduPriv.onclick = null; btnEduPriv.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnEduPriv.onclick = () => {
                    this.spendCiv(game, costEduPriv);
                    game.educationLaw = 'private_school';
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
        const btnEduPub = document.getElementById('edu-public');
        if (btnEduPub && !actEduPub) {
            if (ptsEdu < costEduPub) { btnEduPub.disabled = true; btnEduPub.onclick = null; btnEduPub.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnEduPub.onclick = () => {
                    this.spendCiv(game, costEduPub);
                    game.educationLaw = 'public_school';
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
        const speech = document.createElement('div');
        speech.className = "glass-card p-4 text-[11px]";
        const actSpIll = game.speechLaw === 'illegal_dissent';
        const actSpCen = game.speechLaw === 'press_censorship';
        const actSpFree = game.speechLaw === 'free_speech';
        const clsSpIll = actSpIll ? activeBtnCls : normalBtnCls;
        const clsSpCen = actSpCen ? activeBtnCls : normalBtnCls;
        const clsSpFree = actSpFree ? activeBtnCls : normalBtnCls;
        speech.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">言论自由</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">异议非法</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">文明点 +100%</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">反对效果 ×1.5</div>
                    <div class="text-[10px] mt-0.5 ${actSpIll ? 'text-green-400' : 'text-green-400'}">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="speech-cost-illegal">300</span></span>
                    <button id="speech-illegal" class="${clsSpIll}">${actSpIll ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">出版审查</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">文明点 +25%</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">反对效果 ×1.0</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="speech-cost-censor">300</span></span>
                    <button id="speech-censor" class="${clsSpCen}">${actSpCen ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">言论保护</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">科研效能 +15%</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">反对效果 ×0.5</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英强烈反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="speech-cost-free">300</span></span>
                    <button id="speech-free" class="${clsSpFree}">${actSpFree ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(speech);
        const totalsSpeech = this.getAggClassTotals(game);
        const sharesSpeech = this.getPowerShares(game, totalsSpeech);
        const speechOppMap = {
            illegal_dissent: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            press_censorship: { elite: 1, expert: 0, labor: 0, subsistence: 0 },
            free_speech: { elite: 3, expert: 0, labor: 0, subsistence: 0 }
        };
        const baseSpeechCost = 300;
        const factorSpIll = (sharesSpeech.elite || 0) * (speechOppMap.illegal_dissent.elite || 0) + (sharesSpeech.expert || 0) * (speechOppMap.illegal_dissent.expert || 0) + (sharesSpeech.labor || 0) * (speechOppMap.illegal_dissent.labor || 0) + (sharesSpeech.subsistence || 0) * (speechOppMap.illegal_dissent.subsistence || 0);
        const factorSpCen = (sharesSpeech.elite || 0) * (speechOppMap.press_censorship.elite || 0) + (sharesSpeech.expert || 0) * (speechOppMap.press_censorship.expert || 0) + (sharesSpeech.labor || 0) * (speechOppMap.press_censorship.labor || 0) + (sharesSpeech.subsistence || 0) * (speechOppMap.press_censorship.subsistence || 0);
        const factorSpFree = (sharesSpeech.elite || 0) * (speechOppMap.free_speech.elite || 0) + (sharesSpeech.expert || 0) * (speechOppMap.free_speech.expert || 0) + (sharesSpeech.labor || 0) * (speechOppMap.free_speech.labor || 0) + (sharesSpeech.subsistence || 0) * (speechOppMap.free_speech.subsistence || 0);
        const costSpIll = baseSpeechCost + Math.round(baseSpeechCost * factorSpIll);
        const costSpCen = baseSpeechCost + Math.round(baseSpeechCost * factorSpCen);
        const costSpFree = baseSpeechCost + Math.round(baseSpeechCost * factorSpFree);
        const cSpIll = document.getElementById('speech-cost-illegal');
        const cSpCen = document.getElementById('speech-cost-censor');
        const cSpFree = document.getElementById('speech-cost-free');
        if (cSpIll) cSpIll.innerText = String(costSpIll);
        if (cSpCen) cSpCen.innerText = String(costSpCen);
        if (cSpFree) cSpFree.innerText = String(costSpFree);
        const ptsSpeech = Math.max(0, Math.floor(game.res.civilization || 0));
        const btnSpIll = document.getElementById('speech-illegal');
        if (btnSpIll && !actSpIll) {
            if (ptsSpeech < costSpIll) { btnSpIll.disabled = true; btnSpIll.onclick = null; btnSpIll.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnSpIll.onclick = () => {
                    this.spendCiv(game, costSpIll);
                    game.speechLaw = 'illegal_dissent';
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
        const btnSpCen = document.getElementById('speech-censor');
        if (btnSpCen && !actSpCen) {
            if (ptsSpeech < costSpCen) { btnSpCen.disabled = true; btnSpCen.onclick = null; btnSpCen.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnSpCen.onclick = () => {
                    this.spendCiv(game, costSpCen);
                    game.speechLaw = 'press_censorship';
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
        const btnSpFree = document.getElementById('speech-free');
        if (btnSpFree && !actSpFree) {
            if (ptsSpeech < costSpFree) { btnSpFree.disabled = true; btnSpFree.onclick = null; btnSpFree.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnSpFree.onclick = () => {
                    this.spendCiv(game, costSpFree);
                    game.speechLaw = 'free_speech';
                    game.updateDeltas(); game.updateResourceUI();
                    this.render(game);
                };
            }
        }
    },
    renderStructure(game, container) {
        const wrap = document.createElement('div');
        wrap.className = "space-y-4";
        const group = document.createElement('div');
        group.className = "glass-card p-4 text-[11px]";
        const actDict = game.powerLaw === 'dictatorship';
        const actQual = game.powerLaw === 'qualified_suffrage';
        const actUniv = game.powerLaw === 'universal_suffrage';
        const govMon = game.govStructure === 'monarchy';
        const activeBtnCls = "px-3 py-2 rounded-lg bg-violet-700 text-white text-[11px] font-bold";
        const normalBtnCls = "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold";
        const clsDict = actDict ? activeBtnCls : normalBtnCls;
        const clsQual = actQual ? activeBtnCls : normalBtnCls;
        const clsUniv = actUniv ? activeBtnCls : normalBtnCls;
        group.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">权力分配</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">独裁制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">精英权重 20；专家权重 1；其他权重 0</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：专家轻微反对，劳工强烈反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="law-cost-dict">200</span></span>
                    <button id="law-dictatorship" class="${clsDict}">${actDict ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">资格性选举制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">精英权重 5；专家权重 2；劳工权重 1；自给农权重 0</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英强烈反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="law-cost-qual">200</span></span>
                    <button id="law-qualified" class="${clsQual}">${actQual ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">普选制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">精英权重 3；专家权重 2；劳工权重 1；自给农权重 0.5</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英强烈反对，专家反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="law-cost-univ">200</span></span>
                    <button id="law-universal" class="${clsUniv}">${actUniv ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(group);
        const totals = this.getAggClassTotals(game);
        const shares = this.getPowerShares(game, totals);
        const oppMap = {
            dictatorship: { elite: 0, expert: 1, labor: 3, subsistence: 0 },
            qualified_suffrage: { elite: 3, expert: 0, labor: 0, subsistence: 0 },
            universal_suffrage: { elite: 3, expert: 2, labor: 0, subsistence: 0 }
        };
        const lawLabel = {
            dictatorship: '独裁制',
            qualified_suffrage: '资格性选举制',
            universal_suffrage: '普选制'
        };
        const opp = oppMap[game.powerLaw] || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        container.appendChild(wrap);
        const baseCost = 500;
        const factorDict = (shares.elite || 0) * (oppMap.dictatorship.elite || 0) + (shares.expert || 0) * (oppMap.dictatorship.expert || 0) + (shares.labor || 0) * (oppMap.dictatorship.labor || 0) + (shares.subsistence || 0) * (oppMap.dictatorship.subsistence || 0);
        const factorQual = (shares.elite || 0) * (oppMap.qualified_suffrage.elite || 0) + (shares.expert || 0) * (oppMap.qualified_suffrage.expert || 0) + (shares.labor || 0) * (oppMap.qualified_suffrage.labor || 0) + (shares.subsistence || 0) * (oppMap.qualified_suffrage.subsistence || 0);
        const factorUniv = (shares.elite || 0) * (oppMap.universal_suffrage.elite || 0) + (shares.expert || 0) * (oppMap.universal_suffrage.expert || 0) + (shares.labor || 0) * (oppMap.universal_suffrage.labor || 0) + (shares.subsistence || 0) * (oppMap.universal_suffrage.subsistence || 0);
        const costDict = baseCost + Math.round(baseCost * factorDict);
        const costQual = baseCost + Math.round(baseCost * factorQual);
        const costUniv = baseCost + Math.round(baseCost * factorUniv);
        const cDictEl = document.getElementById('law-cost-dict');
        const cQualEl = document.getElementById('law-cost-qual');
        const cUnivEl = document.getElementById('law-cost-univ');
        if (cDictEl) cDictEl.innerText = String(costDict);
        if (cQualEl) cQualEl.innerText = String(costQual);
        if (cUnivEl) cUnivEl.innerText = String(costUniv);
        const ptsStructure = Math.max(0, Math.floor(game.res.civilization || 0));
        const btnDict = document.getElementById('law-dictatorship');
        if (btnDict && !actDict) {
            if (ptsStructure < costDict) { btnDict.disabled = true; btnDict.onclick = null; btnDict.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnDict.onclick = () => {
                    this.spendCiv(game, costDict);
                    game.powerLaw = 'dictatorship';
                    game.powerWeights = { elite: 20, expert: 1, labor: 0, subsistence: 0 };
                    this.render(game);
                };
            }
        }
        const btnQual = document.getElementById('law-qualified');
        if (btnQual && !actQual) {
            if (ptsStructure < costQual) { btnQual.disabled = true; btnQual.onclick = null; btnQual.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnQual.onclick = () => {
                    this.spendCiv(game, costQual);
                    game.powerLaw = 'qualified_suffrage';
                    game.powerWeights = { elite: 5, expert: 2, labor: 1, subsistence: 0 };
                    this.render(game);
                };
            }
        }
        const btnUniv = document.getElementById('law-universal');
        if (btnUniv) {
            const govFas = game.govStructure === 'fascist_state';
            if (govMon || govFas || ptsStructure < costUniv) { btnUniv.disabled = true; btnUniv.onclick = null; btnUniv.classList.add('opacity-40','cursor-not-allowed'); }
        }
        if (btnUniv && !actUniv && !govMon && ptsStructure >= costUniv) {
            btnUniv.onclick = () => {
                this.spendCiv(game, costUniv);
                game.powerLaw = 'universal_suffrage';
                game.powerWeights = { elite: 3, expert: 2, labor: 1, subsistence: 0.5 };
                this.render(game);
            };
        }
        const gov = document.createElement('div');
        gov.className = "glass-card p-4 text-[11px]";
        const actMon = game.govStructure === 'monarchy';
        const actPres = game.govStructure === 'presidential_republic';
        const actParl = game.govStructure === 'parliamentary_republic';
        const actComm = game.govStructure === 'committee_republic';
        const actFasc = game.govStructure === 'fascist_state';
        const clsMon = actMon ? activeBtnCls : normalBtnCls;
        const clsPres = actPres ? activeBtnCls : normalBtnCls;
        const clsParl = actParl ? activeBtnCls : normalBtnCls;
        const clsComm = actComm ? activeBtnCls : normalBtnCls;
        const clsFasc = actFasc ? activeBtnCls : normalBtnCls;
        gov.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">政府结构</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">君主制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">文明点数 +100%；精英权重 +50%；禁用普选制</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：专家轻微反对，劳工强烈反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="gov-cost-mon">500</span></span>
                    <button id="gov-monarchy" class="${clsMon}">${actMon ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">总统共和制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">文明点数 +50%</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="gov-cost-pres">500</span></span>
                    <button id="gov-presidential" class="${clsPres}">${actPres ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">法团政府</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">文明点数 +50%；禁用普选制；默认独裁制</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：专家反对，劳工反对，自给农轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="gov-cost-fasc">500</span></span>
                    <button id="gov-fascist" class="${clsFasc}">${actFasc ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">议会共和制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">专家权重 +50%；劳工权重 +50%</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英强烈反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="gov-cost-parl">500</span></span>
                    <button id="gov-parliamentary" class="${clsParl}">${actParl ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">委员会共和制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">禁用精英和专家人口；两者全部并入劳工人口</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英强烈反对，专家反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="gov-cost-comm">500</span></span>
                    <button id="gov-committee" class="${clsComm}">${actComm ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(gov);
        container.appendChild(wrap);
        const totalsGov = this.getAggClassTotals(game);
        const sharesGov = this.getPowerShares(game, totalsGov);
        const baseGovCost = 500;
        const oppGovMap = {
            monarchy: { elite: 0, expert: 1, labor: 3, subsistence: 0 },
            presidential_republic: { elite: 2, expert: 0, labor: 0, subsistence: 0 },
            parliamentary_republic: { elite: 3, expert: 0, labor: 0, subsistence: 0 },
            committee_republic: { elite: 3, expert: 2, labor: 0, subsistence: 0 },
            fascist_state: { elite: 0, expert: 2, labor: 2, subsistence: 1 }
        };
        const factorMon = (sharesGov.elite || 0) * (oppGovMap.monarchy.elite || 0) + (sharesGov.expert || 0) * (oppGovMap.monarchy.expert || 0) + (sharesGov.labor || 0) * (oppGovMap.monarchy.labor || 0) + (sharesGov.subsistence || 0) * (oppGovMap.monarchy.subsistence || 0);
        const factorPres = (sharesGov.elite || 0) * (oppGovMap.presidential_republic.elite || 0) + (sharesGov.expert || 0) * (oppGovMap.presidential_republic.expert || 0) + (sharesGov.labor || 0) * (oppGovMap.presidential_republic.labor || 0) + (sharesGov.subsistence || 0) * (oppGovMap.presidential_republic.subsistence || 0);
        const factorParl = (sharesGov.elite || 0) * (oppGovMap.parliamentary_republic.elite || 0) + (sharesGov.expert || 0) * (oppGovMap.parliamentary_republic.expert || 0) + (sharesGov.labor || 0) * (oppGovMap.parliamentary_republic.labor || 0) + (sharesGov.subsistence || 0) * (oppGovMap.parliamentary_republic.subsistence || 0);
        const factorComm = (sharesGov.elite || 0) * (oppGovMap.committee_republic.elite || 0) + (sharesGov.expert || 0) * (oppGovMap.committee_republic.expert || 0) + (sharesGov.labor || 0) * (oppGovMap.committee_republic.labor || 0) + (sharesGov.subsistence || 0) * (oppGovMap.committee_republic.subsistence || 0);
        const costMon = baseGovCost + Math.round(baseGovCost * factorMon);
        const costPres = baseGovCost + Math.round(baseGovCost * factorPres);
        const costParl = baseGovCost + Math.round(baseGovCost * factorParl);
        const costComm = baseGovCost + Math.round(baseGovCost * factorComm);
        const factorFasc = (sharesGov.elite || 0) * (oppGovMap.fascist_state.elite || 0) + (sharesGov.expert || 0) * (oppGovMap.fascist_state.expert || 0) + (sharesGov.labor || 0) * (oppGovMap.fascist_state.labor || 0) + (sharesGov.subsistence || 0) * (oppGovMap.fascist_state.subsistence || 0);
        const costFasc = baseGovCost + Math.round(baseGovCost * factorFasc);
        const cMonEl = document.getElementById('gov-cost-mon');
        const cPresEl = document.getElementById('gov-cost-pres');
        const cParlEl = document.getElementById('gov-cost-parl');
        const cCommEl = document.getElementById('gov-cost-comm');
        const cFascEl = document.getElementById('gov-cost-fasc');
        if (cMonEl) cMonEl.innerText = String(costMon);
        if (cPresEl) cPresEl.innerText = String(costPres);
        if (cParlEl) cParlEl.innerText = String(costParl);
        if (cCommEl) cCommEl.innerText = String(costComm);
        if (cFascEl) cFascEl.innerText = String(costFasc);
        const btnMon = document.getElementById('gov-monarchy');
        if (btnMon) {
            const disableMon = actMon || (game.powerLaw === 'universal_suffrage') || (Math.max(0, Math.floor(game.res.civilization || 0)) < costMon);
            if (disableMon) { btnMon.disabled = true; btnMon.onclick = null; btnMon.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnMon.onclick = () => {
                    this.spendCiv(game, costMon);
                    game.govStructure = 'monarchy';
                    this.render(game);
                };
            }
        }
        const btnPres = document.getElementById('gov-presidential');
        if (btnPres && !actPres) {
            if (ptsStructure < costPres) { btnPres.disabled = true; btnPres.onclick = null; btnPres.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnPres.onclick = () => {
                    this.spendCiv(game, costPres);
                    game.govStructure = 'presidential_republic';
                    this.render(game);
                };
            }
        }
        const btnParl = document.getElementById('gov-parliamentary');
        if (btnParl && !actParl) {
            if (ptsStructure < costParl) { btnParl.disabled = true; btnParl.onclick = null; btnParl.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnParl.onclick = () => {
                    this.spendCiv(game, costParl);
                    game.govStructure = 'parliamentary_republic';
                    this.render(game);
                };
            }
        }
        const btnComm = document.getElementById('gov-committee');
        if (btnComm && !actComm) {
            if (ptsStructure < costComm) { btnComm.disabled = true; btnComm.onclick = null; btnComm.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnComm.onclick = () => {
                    this.spendCiv(game, costComm);
                    game.govStructure = 'committee_republic';
                    this.render(game);
                };
            }
        }
        const btnFasc = document.getElementById('gov-fascist');
        if (btnFasc && !actFasc) {
            if (ptsStructure < costFasc) { btnFasc.disabled = true; btnFasc.onclick = null; btnFasc.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnFasc.onclick = () => {
                    this.spendCiv(game, costFasc);
                    game.govStructure = 'fascist_state';
                    game.powerLaw = 'dictatorship';
                    game.powerWeights = { elite: 10, expert: 2, labor: 1, subsistence: 0 };
                    this.render(game);
                };
            }
        }
        const cons = document.createElement('div');
        cons.className = "glass-card p-4 text-[11px]";
        const actDemil = game.conscriptionLaw === 'demilitarized';
        const actVolunteer = game.conscriptionLaw === 'volunteer';
        const actProfessional = game.conscriptionLaw === 'professional';
        const actMass = game.conscriptionLaw === 'mass_conscription';
        const clsDemil = actDemil ? activeBtnCls : normalBtnCls;
        const clsVolunteer = actVolunteer ? activeBtnCls : normalBtnCls;
        const clsProfessional = actProfessional ? activeBtnCls : normalBtnCls;
        const clsMass = actMass ? activeBtnCls : normalBtnCls;
        cons.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">征兵法案</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">非军事化国家</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">征兵比例 1%</div>
                    <div class="text-[10px] text-green-400 mt-0.5">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="cons-cost-demil">200</span></span>
                    <button id="cons-demil" class="${clsDemil}">${actDemil ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">志愿兵役制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">征兵比例 2.5%</div>
                    <div class="text-[10px] text-green-400 mt-0.5">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="cons-cost-vol">200</span></span>
                    <button id="cons-volunteer" class="${clsVolunteer}">${actVolunteer ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">职业军队</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">征兵比例 5%</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：自给农轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="cons-cost-pro">200</span></span>
                    <button id="cons-professional" class="${clsProfessional}">${actProfessional ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">大规模征兵</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">征兵比例 10%；人口增长率 -1.5%；军营食物消耗 +10</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：自给农反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="cons-cost-mass">200</span></span>
                    <button id="cons-mass" class="${clsMass}">${actMass ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(cons);
        const totalsCons = this.getAggClassTotals(game);
        const sharesCons = this.getPowerShares(game, totalsCons);
        const oppCons = {
            demilitarized: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            volunteer: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            professional: { elite: 0, expert: 0, labor: 0, subsistence: 1 },
            mass_conscription: { elite: 0, expert: 0, labor: 0, subsistence: 2 }
        };
        const baseConsCost = 200;
        const fcDemil = (sharesCons.elite || 0) * (oppCons.demilitarized.elite || 0) + (sharesCons.expert || 0) * (oppCons.demilitarized.expert || 0) + (sharesCons.labor || 0) * (oppCons.demilitarized.labor || 0) + (sharesCons.subsistence || 0) * (oppCons.demilitarized.subsistence || 0);
        const fcVol = (sharesCons.elite || 0) * (oppCons.volunteer.elite || 0) + (sharesCons.expert || 0) * (oppCons.volunteer.expert || 0) + (sharesCons.labor || 0) * (oppCons.volunteer.labor || 0) + (sharesCons.subsistence || 0) * (oppCons.volunteer.subsistence || 0);
        const fcPro = (sharesCons.elite || 0) * (oppCons.professional.elite || 0) + (sharesCons.expert || 0) * (oppCons.professional.expert || 0) + (sharesCons.labor || 0) * (oppCons.professional.labor || 0) + (sharesCons.subsistence || 0) * (oppCons.professional.subsistence || 0);
        const fcMass = (sharesCons.elite || 0) * (oppCons.mass_conscription.elite || 0) + (sharesCons.expert || 0) * (oppCons.mass_conscription.expert || 0) + (sharesCons.labor || 0) * (oppCons.mass_conscription.labor || 0) + (sharesCons.subsistence || 0) * (oppCons.mass_conscription.subsistence || 0);
        const costConsDemil = baseConsCost + Math.round(baseConsCost * fcDemil);
        const costConsVol = baseConsCost + Math.round(baseConsCost * fcVol);
        const costConsPro = baseConsCost + Math.round(baseConsCost * fcPro);
        const costConsMass = baseConsCost + Math.round(baseConsCost * fcMass);
        const cDemilEl = document.getElementById('cons-cost-demil');
        const cVolEl = document.getElementById('cons-cost-vol');
        const cProEl = document.getElementById('cons-cost-pro');
        const cMassEl = document.getElementById('cons-cost-mass');
        if (cDemilEl) cDemilEl.innerText = String(costConsDemil);
        if (cVolEl) cVolEl.innerText = String(costConsVol);
        if (cProEl) cProEl.innerText = String(costConsPro);
        if (cMassEl) cMassEl.innerText = String(costConsMass);
        const ptsCons = Math.max(0, Math.floor(game.res.civilization || 0));
        const btnConsDemil = document.getElementById('cons-demil');
        if (btnConsDemil && !actDemil) {
            if (ptsCons < costConsDemil) { btnConsDemil.disabled = true; btnConsDemil.onclick = null; btnConsDemil.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnConsDemil.onclick = () => {
                    game.conscriptionLaw = 'demilitarized';
                    game.conscriptionPct = 0.01;
                    game.conscriptionGrowthPenalty = 0;
                    this.render(game);
                };
            }
        }
        const btnConsVol = document.getElementById('cons-volunteer');
        if (btnConsVol && !actVolunteer) {
            if (ptsCons < costConsVol) { btnConsVol.disabled = true; btnConsVol.onclick = null; btnConsVol.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnConsVol.onclick = () => {
                    game.conscriptionLaw = 'volunteer';
                    game.conscriptionPct = 0.025;
                    game.conscriptionGrowthPenalty = 0;
                    this.render(game);
                };
            }
        }
        const btnConsPro = document.getElementById('cons-professional');
        if (btnConsPro && !actProfessional) {
            if (ptsCons < costConsPro) { btnConsPro.disabled = true; btnConsPro.onclick = null; btnConsPro.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnConsPro.onclick = () => {
                    game.conscriptionLaw = 'professional';
                    game.conscriptionPct = 0.05;
                    game.conscriptionGrowthPenalty = 0;
                    this.render(game);
                };
            }
        }
        const btnConsMass = document.getElementById('cons-mass');
        if (btnConsMass && !actMass) {
            if (ptsCons < costConsMass) { btnConsMass.disabled = true; btnConsMass.onclick = null; btnConsMass.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnConsMass.onclick = () => {
                    game.conscriptionLaw = 'mass_conscription';
                    game.conscriptionPct = 0.10;
                    game.conscriptionGrowthPenalty = 0.015;
                    this.render(game);
                };
            }
        }
    }
    ,
    renderEconomy(game, container) {
        const wrap = document.createElement('div');
        wrap.className = "space-y-4";
        const group = document.createElement('div');
        group.className = "glass-card p-4 text-[11px]";
        const actCons = game.taxLaw === 'consumption_tax';
        const actHead = game.taxLaw === 'head_tax';
        const actProp = game.taxLaw === 'proportional_tax';
        const actProg = game.taxLaw === 'progressive_tax';
        const activeBtnCls = "px-3 py-2 rounded-lg bg-violet-700 text-white text-[11px] font-bold";
        const normalBtnCls = "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold";
        const clsCons = actCons ? activeBtnCls : normalBtnCls;
        const clsHead = actHead ? activeBtnCls : normalBtnCls;
        const clsProp = actProp ? activeBtnCls : normalBtnCls;
        const clsProg = actProg ? activeBtnCls : normalBtnCls;
        group.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">税收制度</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">消费税制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">禁用阶层税收；市场税最高20%；无人反对</div>
                    <div class="text-[10px] text-green-400 mt-0.5">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="law-tax-cost-cons">200</span></span>
                    <button id="law-tax-consumption" class="${clsCons}">${actCons ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">人均税制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">禁用市场税；仅统一人头税（各阶层相同值）</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：自给农强烈反对，劳工强烈反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="law-tax-cost-head">200</span></span>
                    <button id="law-tax-head" class="${clsHead}">${actHead ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">比例税制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">禁用市场税；仅统一比例税（各阶层相同比例）</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英强烈反对，专家反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="law-tax-cost-prop">200</span></span>
                    <button id="law-tax-proportional" class="${clsProp}">${actProp ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">累进税制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">解锁全部税种；市场税最高50%</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英反对，专家反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="law-tax-cost-prog">200</span></span>
                    <button id="law-tax-progressive" class="${clsProg}">${actProg ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(group);
        const econGroup = document.createElement('div');
        econGroup.className = "glass-card p-4 text-[11px]";
        const actTrad = game.economySystem === 'traditionalism';
        const actInterv = game.economySystem === 'intervention';
        const actLaissez = game.economySystem === 'laissez_faire';
        const actPlanned = game.economySystem === 'planned';
        const actCoop = game.economySystem === 'cooperative';
        const activeBtnCls2 = "px-3 py-2 rounded-lg bg-violet-700 text-white text-[11px] font-bold";
        const normalBtnCls2 = "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold";
        const clsTrad = actTrad ? activeBtnCls2 : normalBtnCls2;
        const clsInterv = actInterv ? activeBtnCls2 : normalBtnCls2;
        const clsLaissez = actLaissez ? activeBtnCls2 : normalBtnCls2;
        const clsPlanned = actPlanned ? activeBtnCls2 : normalBtnCls2;
        econGroup.innerHTML = `
            <div class="text-[10px] font-bold text-gray-400 uppercase mb-2">经济制度</div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">传统主义</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">私有建设占用 ≤25% 建造力</div>
                    <div class="text-[10px] text-green-400 mt-0.5">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="econ-cost-trad">200</span></span>
                    <button id="econ-trad" class="${clsTrad}">${actTrad ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">合作社所有制</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">仅委员会共和制可用；私有建设占用 ≤75% 建造力；劳工与自给农满意度 +5%；城市金钱收入 +50</div>
                    <div class="text-[10px] text-green-400 mt-0.5">反对：无</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="econ-cost-coop">500</span></span>
                    <button id="econ-coop" class="${game.economySystem === 'cooperative' ? activeBtnCls2 : normalBtnCls2}">${game.economySystem === 'cooperative' ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">经济干预</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">私有建设占用 ≤50% 建造力</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：自给农轻微反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="econ-cost-interv">200</span></span>
                    <button id="econ-interv" class="${clsInterv}">${actInterv ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between mb-3">
                <div>
                    <div class="text-white font-bold">自由放任</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">私有建设占用 ≤75% 建造力；禁用国有化；城市金钱收入 +150</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：自给农反对，劳工强烈反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="econ-cost-laissez">200</span></span>
                    <button id="econ-laissez" class="${clsLaissez}">${actLaissez ? '当前' : '启用'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-white font-bold">计划经济</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">私有建设占用 ≤25% 建造力；国有化成本=建造力×5</div>
                    <div class="text-[10px] text-red-400 mt-0.5">反对：精英强烈反对，专家强烈反对</div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-cyan-400">成本: <span id="econ-cost-planned">200</span></span>
                    <button id="econ-planned" class="${clsPlanned}">${actPlanned ? '当前' : '启用'}</button>
                </div>
            </div>
        `;
        wrap.appendChild(econGroup);
        container.appendChild(wrap);
        const totals = this.getAggClassTotals(game);
        const shares = this.getPowerShares(game, totals);
        const oppMap = {
            consumption_tax: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            head_tax: { elite: 0, expert: 0, labor: 3, subsistence: 3 },
            proportional_tax: { elite: 3, expert: 2, labor: 0, subsistence: 0 },
            progressive_tax: { elite: 2, expert: 2, labor: 0, subsistence: 0 }
        };
        const baseCost = 200;
        const factorCons = (shares.elite || 0) * (oppMap.consumption_tax.elite || 0) + (shares.expert || 0) * (oppMap.consumption_tax.expert || 0) + (shares.labor || 0) * (oppMap.consumption_tax.labor || 0) + (shares.subsistence || 0) * (oppMap.consumption_tax.subsistence || 0);
        const factorHead = (shares.elite || 0) * (oppMap.head_tax.elite || 0) + (shares.expert || 0) * (oppMap.head_tax.expert || 0) + (shares.labor || 0) * (oppMap.head_tax.labor || 0) + (shares.subsistence || 0) * (oppMap.head_tax.subsistence || 0);
        const factorProp = (shares.elite || 0) * (oppMap.proportional_tax.elite || 0) + (shares.expert || 0) * (oppMap.proportional_tax.expert || 0) + (shares.labor || 0) * (oppMap.proportional_tax.labor || 0) + (shares.subsistence || 0) * (oppMap.proportional_tax.subsistence || 0);
        const factorProg = (shares.elite || 0) * (oppMap.progressive_tax.elite || 0) + (shares.expert || 0) * (oppMap.progressive_tax.expert || 0) + (shares.labor || 0) * (oppMap.progressive_tax.labor || 0) + (shares.subsistence || 0) * (oppMap.progressive_tax.subsistence || 0);
        const costCons = baseCost + Math.round(baseCost * factorCons);
        const costHead = baseCost + Math.round(baseCost * factorHead);
        const costProp = baseCost + Math.round(baseCost * factorProp);
        const costProg = baseCost + Math.round(baseCost * factorProg);
        const cCons = document.getElementById('law-tax-cost-cons');
        const cHead = document.getElementById('law-tax-cost-head');
        const cProp = document.getElementById('law-tax-cost-prop');
        const cProg = document.getElementById('law-tax-cost-prog');
        if (cCons) cCons.innerText = String(costCons);
        if (cHead) cHead.innerText = String(costHead);
        if (cProp) cProp.innerText = String(costProp);
        if (cProg) cProg.innerText = String(costProg);
        const oppEcon = {
            traditionalism: { elite: 0, expert: 0, labor: 0, subsistence: 0 },
            intervention: { elite: 0, expert: 0, labor: 0, subsistence: 1 },
            laissez_faire: { elite: 0, expert: 0, labor: 3, subsistence: 2 },
            planned: { elite: 3, expert: 3, labor: 0, subsistence: 0 },
            cooperative: { elite: 0, expert: 0, labor: 0, subsistence: 0 }
        };
        const baseCost2 = 500;
        const fTrad = (shares.elite || 0) * (oppEcon.traditionalism.elite || 0) + (shares.expert || 0) * (oppEcon.traditionalism.expert || 0) + (shares.labor || 0) * (oppEcon.traditionalism.labor || 0) + (shares.subsistence || 0) * (oppEcon.traditionalism.subsistence || 0);
        const fInterv = (shares.elite || 0) * (oppEcon.intervention.elite || 0) + (shares.expert || 0) * (oppEcon.intervention.expert || 0) + (shares.labor || 0) * (oppEcon.intervention.labor || 0) + (shares.subsistence || 0) * (oppEcon.intervention.subsistence || 0);
        const fLaissez = (shares.elite || 0) * (oppEcon.laissez_faire.elite || 0) + (shares.expert || 0) * (oppEcon.laissez_faire.expert || 0) + (shares.labor || 0) * (oppEcon.laissez_faire.labor || 0) + (shares.subsistence || 0) * (oppEcon.laissez_faire.subsistence || 0);
        const fPlanned = (shares.elite || 0) * (oppEcon.planned.elite || 0) + (shares.expert || 0) * (oppEcon.planned.expert || 0) + (shares.labor || 0) * (oppEcon.planned.labor || 0) + (shares.subsistence || 0) * (oppEcon.planned.subsistence || 0);
        const fCoop = (shares.elite || 0) * (oppEcon.cooperative.elite || 0) + (shares.expert || 0) * (oppEcon.cooperative.expert || 0) + (shares.labor || 0) * (oppEcon.cooperative.labor || 0) + (shares.subsistence || 0) * (oppEcon.cooperative.subsistence || 0);
        const costTrad = baseCost2 + Math.round(baseCost2 * fTrad);
        const costInterv = baseCost2 + Math.round(baseCost2 * fInterv);
        const costLaissez = baseCost2 + Math.round(baseCost2 * fLaissez);
        const costPlanned = baseCost2 + Math.round(baseCost2 * fPlanned);
        const costCoop = baseCost2 + Math.round(baseCost2 * fCoop);
        const ctTrad = document.getElementById('econ-cost-trad');
        const ctInterv = document.getElementById('econ-cost-interv');
        const ctLaissez = document.getElementById('econ-cost-laissez');
        const ctPlanned = document.getElementById('econ-cost-planned');
        const ctCoop = document.getElementById('econ-cost-coop');
        if (ctTrad) ctTrad.innerText = String(costTrad);
        if (ctInterv) ctInterv.innerText = String(costInterv);
        if (ctLaissez) ctLaissez.innerText = String(costLaissez);
        if (ctPlanned) ctPlanned.innerText = String(costPlanned);
        if (ctCoop) ctCoop.innerText = String(costCoop);
        const ptsEconomy = Math.max(0, Math.floor(game.res.civilization || 0));
        const btnCons = document.getElementById('law-tax-consumption');
        if (btnCons && !actCons) {
            if (ptsEconomy < costCons) { btnCons.disabled = true; btnCons.onclick = null; btnCons.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnCons.onclick = () => {
                    this.spendCiv(game, costCons);
                    game.taxLaw = 'consumption_tax';
                    game.surplusTaxRatePerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                    game.headTaxPerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                    const keys = ['food','metal','precious','consumer','energy','oil'];
                    keys.forEach(k => { if (!game.taxRates) game.taxRates = {}; game.taxRates[k] = Math.min(0.2, Math.max(0, game.taxRates[k] || 0)); });
                    this.render(game);
                };
            }
        }
        const btnHead = document.getElementById('law-tax-head');
        if (btnHead && !actHead) {
            if (ptsEconomy < costHead) { btnHead.disabled = true; btnHead.onclick = null; btnHead.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnHead.onclick = () => {
                    this.spendCiv(game, costHead);
                    game.taxLaw = 'head_tax';
                    game.surplusTaxRatePerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                    const hr = game.headTaxPerClass || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                    const uni = Math.max(0, hr.elite || 0, hr.expert || 0, hr.labor || 0);
                    game.headTaxPerClass = { elite: uni, expert: uni, labor: uni, subsistence: 0 };
                    const keys = ['food','metal','precious','consumer','energy','oil'];
                    keys.forEach(k => { if (!game.taxRates) game.taxRates = {}; game.taxRates[k] = 0; });
                    this.render(game);
                };
            }
        }
        const btnProp = document.getElementById('law-tax-proportional');
        if (btnProp && !actProp) {
            if (ptsEconomy < costProp) { btnProp.disabled = true; btnProp.onclick = null; btnProp.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnProp.onclick = () => {
                    this.spendCiv(game, costProp);
                    game.taxLaw = 'proportional_tax';
                    const rates = game.surplusTaxRatePerClass || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                    const uni = Math.max(0, rates.elite || 0, rates.expert || 0, rates.labor || 0);
                    game.surplusTaxRatePerClass = { elite: uni, expert: uni, labor: uni, subsistence: 0 };
                    game.headTaxPerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                    const keys = ['food','metal','precious','consumer','energy','oil'];
                    keys.forEach(k => { if (!game.taxRates) game.taxRates = {}; game.taxRates[k] = 0; });
                    this.render(game);
                };
            }
        }
        const btnProg = document.getElementById('law-tax-progressive');
        if (btnProg && !actProg) {
            if (ptsEconomy < costProg) { btnProg.disabled = true; btnProg.onclick = null; btnProg.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnProg.onclick = () => {
                    this.spendCiv(game, costProg);
                    game.taxLaw = 'progressive_tax';
                    const keys = ['food','metal','precious','consumer','energy','oil'];
                    keys.forEach(k => { if (!game.taxRates) game.taxRates = {}; game.taxRates[k] = Math.min(0.5, Math.max(0, game.taxRates[k] || 0)); });
                    this.render(game);
                };
            }
        }
        const btnTrad = document.getElementById('econ-trad');
        if (btnTrad && !actTrad) {
            if (ptsEconomy < costTrad) { btnTrad.disabled = true; btnTrad.onclick = null; btnTrad.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnTrad.onclick = () => { this.spendCiv(game, costTrad); game.economySystem = 'traditionalism'; this.render(game); };
            }
        }
        const btnInterv = document.getElementById('econ-interv');
        if (btnInterv && !actInterv) {
            if (ptsEconomy < costInterv) { btnInterv.disabled = true; btnInterv.onclick = null; btnInterv.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnInterv.onclick = () => { this.spendCiv(game, costInterv); game.economySystem = 'intervention'; this.render(game); };
            }
        }
        const btnCoop = document.getElementById('econ-coop');
        if (btnCoop && !actCoop) {
            const notCommittee = game.govStructure !== 'committee_republic';
            if (notCommittee || ptsEconomy < costCoop) { btnCoop.disabled = true; btnCoop.onclick = null; btnCoop.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnCoop.onclick = () => { this.spendCiv(game, costCoop); game.economySystem = 'cooperative'; this.render(game); };
            }
        }
        const btnLaissez = document.getElementById('econ-laissez');
        if (btnLaissez && !actLaissez) {
            if (ptsEconomy < costLaissez) { btnLaissez.disabled = true; btnLaissez.onclick = null; btnLaissez.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnLaissez.onclick = () => { this.spendCiv(game, costLaissez); game.economySystem = 'laissez_faire'; this.render(game); };
            }
        }
        const btnPlanned = document.getElementById('econ-planned');
        if (btnPlanned && !actPlanned) {
            if (ptsEconomy < costPlanned) { btnPlanned.disabled = true; btnPlanned.onclick = null; btnPlanned.classList.add('opacity-40','cursor-not-allowed'); }
            else {
                btnPlanned.onclick = () => { this.spendCiv(game, costPlanned); game.economySystem = 'planned'; this.render(game); };
            }
        }
    }
};
