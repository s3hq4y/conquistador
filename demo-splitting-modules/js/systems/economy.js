//注意：本文件包含对已废弃字段 cost_money/cost_ind 的兼容回退，建议统一使用 cost 多资源对象
const Economy = {
    computeStability(game, ownerKey) {
        let avg = 50;
        try {
            if (typeof UIPolitics !== 'undefined' && typeof UIPolitics.getClassSatisfaction === 'function') {
                const s = UIPolitics.getClassSatisfaction(game);
                const totals = ownerKey && typeof UIPolitics.getAggClassTotalsForOwner === 'function'
                    ? UIPolitics.getAggClassTotalsForOwner(game, ownerKey)
                    : ((typeof UIPolitics.getAggClassTotals === 'function') ? UIPolitics.getAggClassTotals(game) : { elite: 0, expert: 0, labor: 0, subsistence: 0 });
                const shares = (typeof UIPolitics.getPowerShares === 'function') ? UIPolitics.getPowerShares(game, totals) : { elite: 0.25, expert: 0.25, labor: 0.25, subsistence: 0.25 };
                const sumPop = Math.max(0, Math.floor(totals.elite || 0)) + Math.max(0, Math.floor(totals.expert || 0)) + Math.max(0, Math.floor(totals.labor || 0)) + Math.max(0, Math.floor(totals.subsistence || 0));
                const popShare = sumPop > 0 ? {
                    elite: Math.max(0, Math.min(1, (Math.floor(totals.elite || 0)) / sumPop)),
                    expert: Math.max(0, Math.min(1, (Math.floor(totals.expert || 0)) / sumPop)),
                    labor: Math.max(0, Math.min(1, (Math.floor(totals.labor || 0)) / sumPop)),
                    subsistence: Math.max(0, Math.min(1, (Math.floor(totals.subsistence || 0)) / sumPop)),
                } : { elite: 0.25, expert: 0.25, labor: 0.25, subsistence: 0.25 };
                const cap = 0.15;
                const clip = (v) => Math.max(0, Math.min(1, v || 0));
                let we = Math.min(cap, clip(shares.elite), clip(popShare.elite));
                let wx = Math.min(cap, clip(shares.expert), clip(popShare.expert));
                let wl = Math.min(cap, clip(shares.labor), clip(popShare.labor));
                let ws = Math.min(cap, clip(shares.subsistence), clip(popShare.subsistence));
                const wsum = we + wx + wl + ws;
                if (wsum > 0) { we = we / wsum; wx = wx / wsum; wl = wl / wsum; ws = ws / wsum; }
                else { we = 0.25; wx = 0.25; wl = 0.25; ws = 0.25; }
                const se = Math.max(0, Math.min(100, Math.floor(s.elite || 0)));
                const sx = Math.max(0, Math.min(100, Math.floor(s.expert || 0)));
                const sl = Math.max(0, Math.min(100, Math.floor(s.labor || 0)));
                const ss = Math.max(0, Math.min(100, Math.floor(s.subsistence || 0)));
                avg = Math.floor(se * we + sx * wx + sl * wl + ss * ws);
            }
        } catch (_) { /* noop */ }
        const warActive = (typeof Diplomacy !== 'undefined' && typeof Diplomacy.isAtWar === 'function') ? Diplomacy.isAtWar(game) : Object.values(game.atWarWith || {}).some(v => !!v);
        const baseline = typeof game.warStabilityBaseline === 'number' ? game.warStabilityBaseline : null;
        if (warActive) {
            const owners = Object.entries(game.atWarWith || {}).filter(([, v]) => !!v).map(([k]) => k);
            const penalty = owners.length
                ? Math.max(...owners.map(o => ((game.warGoalByTarget || {})[o] === 'conquest') ? 10 : 50))
                : 50;
            avg = Math.max(0, avg - penalty);
        } else if (baseline !== null) {
            if (avg < baseline) {
                avg = Math.min(baseline, avg + 1);
            } else {
                game.warStabilityBaseline = null;
            }
        }
        const mul = 0.75 + Math.max(0, Math.min(100, avg)) * 0.5 / 100;
        let sciMicro = 0;
        let civMicro = 0;
        if (avg >= 85) { sciMicro += 0.05; civMicro += 0.05; }
        else if (avg >= 70) { sciMicro += 0.025; civMicro += 0.025; }
        const protestSeverity = avg < 40 ? Math.min(1, (40 - avg) / 40) : 0;
        return { avg, mul, sciMicro, civMicro, protestSeverity };
    },
    computeSnapshotForOwner(game, ownerKey) {
        const marketKeys = ['food','metal','precious','consumer','energy','oil'];
        const deltas = { money: 0, food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0, fuel: 0, industry: 0, pop: 0, science: 0, civilization: 0 };
        const rawSupply = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const rawDemand = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        (game.grid || []).forEach(t => {
            if (!t || t.owner !== ownerKey || !t.building) return;
            const b = BUILDINGS[t.building] || {};
            const mul = (typeof Research !== 'undefined' && Research.getMultiplierForOwner) ? Research.getMultiplierForOwner(game, t.building, ownerKey) : 1;
            Object.entries(b.yields || {}).forEach(([res, val]) => {
                let effBase = (val || 0);
                if (t.building === 'admin_center' && res === 'civilization') {
                    const bonusPer = Math.max(0, Math.floor(b.admin_civ_bonus_per_level || 1));
                    const lvl = (typeof Research !== 'undefined' && Research.getLevelForOwner) ? Math.max(0, Math.floor(Research.getLevelForOwner(game, 'administration', ownerKey) || 0)) : 0;
                    effBase += Math.max(0, bonusPer * lvl);
                }
                if (!marketKeys.includes(res) && effBase > 0) {
                    deltas[res] = Math.max(0, Math.floor((deltas[res] || 0) + effBase * mul));
                }
                if (marketKeys.includes(res)) {
                    if (effBase > 0) {
                        if (t.building === 'renewable_power' && res === 'energy') {
                            const base = (val || 0);
                            const bonus = (t.terrain === 'DESERT') ? Math.max(0, b.energy_desert_bonus || 0) : 0;
                            const capRef = BUILDINGS[b.energy_cap_ref || ''] || null;
                            const capMul = capRef && typeof Research !== 'undefined' && Research.getMultiplierForOwner ? Research.getMultiplierForOwner(game, b.energy_cap_ref, ownerKey) : 1;
                            const capVal = capRef && capRef.yields ? Math.max(0, (capRef.yields.energy || 0) * capMul) : Infinity;
                            const eff = Math.min((base + bonus) * mul, capVal);
                            rawSupply[res] = Math.max(0, Math.floor((rawSupply[res] || 0) + eff));
                        } else {
                            rawSupply[res] = Math.max(0, Math.floor((rawSupply[res] || 0) + effBase * mul));
                        }
                    } else if (effBase < 0) {
                        rawDemand[res] = Math.max(0, Math.floor((rawDemand[res] || 0) + Math.abs(effBase)));
                    }
                }
            });
        });
        const ratio = {};
        Object.keys(rawSupply).forEach(k => {
            const sup = Math.max(0, Math.floor(rawSupply[k] || 0));
            const dem = Math.max(0, Math.floor(rawDemand[k] || 0));
            ratio[k] = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
        });
        const supply = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const demand = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const demandPrivateByClass = { elite: { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 }, expert: { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 }, labor: { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 } };
        (game.grid || []).forEach(t => {
            if (!t || t.owner !== ownerKey || !t.building) return;
            const b = BUILDINGS[t.building] || {};
            const mul = (typeof Research !== 'undefined' && Research.getMultiplierForOwner) ? Research.getMultiplierForOwner(game, t.building, ownerKey) : 1;
            const reqRes = Object.entries(b.yields || {}).filter(([res, val]) => marketKeys.includes(res) && (val || 0) < 0).map(([res]) => res);
            let gTotal = 1;
            if (reqRes.length > 0) {
                const gs = reqRes.map(rk => {
                    const R = ratio[rk];
                    if (!isFinite(R)) return 1;
                    if (R >= 0.75) return 1;
                    const g = Math.max(0.25, Math.min(1, R + 0.25));
                    return g;
                });
                gTotal = gs.reduce((a, b) => a + b, 0) / gs.length;
            }
            Object.entries(b.yields || {}).forEach(([res, val]) => {
                let effBase = (val || 0);
                if (t.building === 'admin_center' && res === 'civilization') {
                    const bonusPer = Math.max(0, Math.floor(b.admin_civ_bonus_per_level || 1));
                    const lvl = (typeof Research !== 'undefined' && Research.getLevelForOwner) ? Math.max(0, Math.floor(Research.getLevelForOwner(game, 'administration', ownerKey) || 0)) : 0;
                    effBase += Math.max(0, bonusPer * lvl);
                }
                if (effBase > 0) effBase *= mul;
                if (t.building === 'renewable_power' && res === 'energy') {
                    const base = (val || 0);
                    const seaTerr = t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA';
                    const bonus = (t.terrain === 'DESERT' || seaTerr) ? Math.max(0, (BUILDINGS[t.building] || {}).energy_desert_bonus || 0) : 0;
                    const capRef = BUILDINGS[(BUILDINGS[t.building] || {}).energy_cap_ref || ''] || null;
                    const capMul = capRef && typeof Research !== 'undefined' && Research.getMultiplierForOwner ? Research.getMultiplierForOwner(game, (BUILDINGS[t.building] || {}).energy_cap_ref, ownerKey) : 1;
                    const capVal = capRef && capRef.yields ? Math.max(0, (capRef.yields.energy || 0) * capMul) : Infinity;
                    effBase = Math.min((base + bonus) * mul, capVal);
                }
                if (marketKeys.includes(res)) {
                    if (effBase > 0) {
                        const eff = Math.floor(effBase * gTotal);
                        supply[res] = Math.max(0, Math.floor((supply[res] || 0) + eff));
                    } else if (effBase < 0) {
                        const use = Math.floor(Math.abs(effBase));
                        demand[res] = Math.max(0, Math.floor((demand[res] || 0) + use));
                        if (t.marketOwnership === 'private') {
                            const inv = t.investorClass;
                            if (inv === 'elite' || inv === 'expert' || inv === 'labor') {
                                demandPrivateByClass[inv][res] = Math.max(0, Math.floor((demandPrivateByClass[inv][res] || 0) + use));
                            }
                        }
                    }
                } else {
                    const eff = Math.floor(effBase * gTotal);
                    deltas[res] = Math.max(0, Math.floor((deltas[res] || 0) + eff));
                }
            });
        });
        const basePrice = { food: 1, metal: 2, precious: 6, consumer: 2, energy: 2, oil: 4 };
        const prices = {};
        let opCostGov = 0;
        Object.keys(basePrice).forEach(k => {
            const sup = Math.max(0, Math.floor(supply[k] || 0));
            const dem = Math.max(0, Math.floor(demand[k] || 0));
            let factor = 1;
            if ((sup + dem) === 0) {
                factor = 1;
            } else if (dem === 0 && sup > 0) {
                factor = 0.25;
            } else {
                const R = dem > 0 ? (sup / dem) : 0;
                if (R > 1) {
                    const Rc = Math.min(R, 4);
                    factor = 1 - ((Rc - 1) / 3) * 0.75;
                    factor = Math.max(0.25, Math.min(1, factor));
                } else {
                    const Rc = Math.min(1 / Math.max(0.0001, R), 4);
                    factor = 1 + ((Rc - 1) / 3) * 0.75;
                }
            }
            const infl = (typeof game.inflationFactor === 'number') ? Math.min(12, Math.max(1, game.inflationFactor)) : 1;
            prices[k] = Math.round(basePrice[k] * factor * infl);
        });
        (game.grid || []).forEach(t => {
            if (!t || t.owner !== ownerKey || !t.building) return;
            const b = BUILDINGS[t.building] || {};
            const mul = (typeof Research !== 'undefined' && Research.getMultiplierForOwner) ? Research.getMultiplierForOwner(game, t.building, ownerKey) : 1;
            const reqRes = Object.entries(b.yields || {}).filter(([res, val]) => marketKeys.includes(res) && (val || 0) < 0);
            if (!reqRes.length) return;
            let gTotal = 1;
            const gs = reqRes.map(([rk]) => {
                const sup = Math.max(0, Math.floor(supply[rk] || 0));
                const dem = Math.max(0, Math.floor(demand[rk] || 0));
                const R = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
                if (!isFinite(R)) return 1;
                if (R >= 0.75) return 1;
                const g = Math.max(0.25, Math.min(1, R + 0.25));
                return g;
            });
            if (gs.length) gTotal = gs.reduce((a, b) => a + b, 0) / gs.length;
            reqRes.forEach(([rk, rv]) => {
                const need = Math.max(0, (-rv) * mul * gTotal);
                const price = prices[rk] || 0;
                opCostGov += Math.round(need * price);
            });
        });
        const stability = this.computeStability(game, ownerKey);
        deltas.money = Math.floor(deltas.money * stability.mul);
        deltas.civilization = Math.floor(deltas.civilization * Math.min(1.35, stability.mul + stability.civMicro));
        const taxRates = game.taxRates || { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const taxLaw = game.taxLaw || 'consumption_tax';
        const allowMarketTax = (taxLaw === 'consumption_tax' || taxLaw === 'progressive_tax');
        const marketCap = (taxLaw === 'progressive_tax') ? 0.5 : (taxLaw === 'consumption_tax' ? 0.2 : 0);
        const revenueByRes = {};
        const profitByRes = {};
        const taxedProfitByRes = {};
        const taxIncomeByRes = {};
        let taxedProfitTotal = 0;
        let taxIncomeTotal = 0;
        Object.keys(basePrice).forEach(k => {
            const sup = Math.max(0, Math.floor(supply[k] || 0));
            const dem = Math.max(0, Math.floor(demand[k] || 0));
            const revenue = sup * (prices[k] || 0);
            const traded = Math.min(sup, dem);
            const profit = Math.max(0, traded * (prices[k] || 0));
            const trRaw = Math.max(0, Math.min(1, (taxRates[k] || 0)));
            const tr = allowMarketTax ? Math.max(0, Math.min(marketCap, trRaw)) : 0;
            const taxed = Math.floor(profit * tr);
            revenueByRes[k] = Math.floor(revenue);
            profitByRes[k] = Math.floor(profit);
            taxedProfitByRes[k] = taxed;
            taxedProfitTotal += taxed;
            taxIncomeByRes[k] = taxed;
            taxIncomeTotal += taxed;
        });
        const militaryCostFloat = Array.isArray(game.units) ? game.units.reduce((sum, u) => {
            if (!u || u.owner !== ownerKey) return sum;
            const parts = Array.isArray(u.comp) ? u.comp : [].concat(u.comp?.support || [], u.comp?.main || []);
            if (!Array.isArray(parts) || parts.length === 0) return sum;
            let unitCost = 0;
            parts.forEach(k => {
                const reg = REGIMENT_TYPES[k];
                const c = reg && typeof reg.maint_cost === 'number' ? reg.maint_cost : 1;
                unitCost += Math.max(0, c || 0);
            });
            return sum + unitCost;
        }, 0) : 0;
        const militaryCost = Math.ceil(militaryCostFloat);
        const privMaintByClassCost = {
            elite: Object.keys(basePrice).reduce((s, r) => s + Math.max(0, Math.floor(demandPrivateByClass.elite[r] || 0)) * (prices[r] || 0), 0),
            expert: Object.keys(basePrice).reduce((s, r) => s + Math.max(0, Math.floor(demandPrivateByClass.expert[r] || 0)) * (prices[r] || 0), 0),
            labor: Object.keys(basePrice).reduce((s, r) => s + Math.max(0, Math.floor(demandPrivateByClass.labor[r] || 0)) * (prices[r] || 0), 0)
        };
        const totalsForOwner = (typeof UIPolitics !== 'undefined' && typeof UIPolitics.getAggClassTotalsForOwner === 'function')
            ? UIPolitics.getAggClassTotalsForOwner(game, ownerKey)
            : { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const w = POP_CLASS_SURPLUS_WEIGHTS || { elite: 3, expert: 2, labor: 1, subsistence: 0.5 };
        const wE = Math.max(0, Math.floor(totalsForOwner.elite || 0)) * (w.elite || 0);
        const wX = Math.max(0, Math.floor(totalsForOwner.expert || 0)) * (w.expert || 0);
        const wL = Math.max(0, Math.floor(totalsForOwner.labor || 0)) * (w.labor || 0);
        const wS = Math.max(0, Math.floor(totalsForOwner.subsistence || 0)) * (w.subsistence || 0);
        const sumWcw = wE + wX + wL + wS;
        const totalPop = Math.max(1, Math.floor((totalsForOwner.elite || 0) + (totalsForOwner.expert || 0) + (totalsForOwner.labor || 0) + (totalsForOwner.subsistence || 0)));
        const totalClassWeighted = wE + wX + wL + wS;
        let classMultiplier = 1;
        if (totalPop > 0) classMultiplier = Math.max(0.5, Math.min(2, totalClassWeighted / totalPop));
        const totalDelta = Math.floor(taxedProfitTotal * classMultiplier);
        let byClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        if (sumWcw > 0) {
            const shares = { elite: wE / sumWcw, expert: wX / sumWcw, labor: wL / sumWcw, subsistence: wS / sumWcw };
            byClass.elite = Math.floor(totalDelta * shares.elite);
            byClass.expert = Math.floor(totalDelta * shares.expert);
            byClass.labor = Math.floor(totalDelta * shares.labor);
            byClass.subsistence = Math.floor(totalDelta * shares.subsistence);
            const assigned = byClass.elite + byClass.expert + byClass.labor + byClass.subsistence;
            let rem = Math.max(0, totalDelta - assigned);
            const order = [
                { k: 'elite', v: byClass.elite },
                { k: 'expert', v: byClass.expert },
                { k: 'labor', v: byClass.labor },
                { k: 'subsistence', v: byClass.subsistence }
            ].sort((a, b) => b.v - a.v);
            for (let i = 0; i < order.length && rem > 0; i++) { byClass[order[i].k] += 1; rem--; }
        }
        const privMaintTotal = Math.floor(privMaintByClassCost.elite + privMaintByClassCost.expert + privMaintByClassCost.labor);
        if (privMaintTotal > 0) {
            byClass.elite = Math.max(0, Math.floor(byClass.elite - privMaintByClassCost.elite));
            byClass.expert = Math.max(0, Math.floor(byClass.expert - privMaintByClassCost.expert));
            byClass.labor = Math.max(0, Math.floor(byClass.labor - privMaintByClassCost.labor));
        }
        const market = { supply, demand, prices, opCost: Math.floor(opCostGov), militaryCost, socialSecurityCost: 0, taxIncomeTotal: Math.floor(taxIncomeTotal), revenueByRes, profitByRes, taxedProfitByRes, taxedProfitTotal: Math.floor(taxedProfitTotal), taxIncomeByRes, socialSurplusByClassDelta: byClass, privateMaintByClassCost: privMaintByClassCost };
        let bonusCap = 0;
        (game.grid || []).forEach(t => {
            if (!t || t.owner !== ownerKey || !t.building) return;
            const b = BUILDINGS[t.building] || {};
            const baseBonus = Math.max(0, Math.floor((b && b.build_power_cap_bonus) || 0));
            if (baseBonus <= 0) return;
            const reqRes = Object.entries(b.yields || {}).filter(([rk, rv]) => marketKeys.includes(rk) && (rv || 0) < 0).map(([rk]) => rk);
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
            bonusCap += baseBonus * gTotal;
        });
        const buildPowerMax = Math.max(0, Math.floor(25 + bonusCap));
        return { deltas, market, buildPowerMax };
    },
    computeDeltas(game) {
        const stability = this.computeStability(game);
        const newDeltas = { money: 0, food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0, fuel: 0, industry: 0, pop: 0, science: 0, civilization: 0 };
        const marketKeys = ['food','metal','precious','consumer','energy','oil'];
        const rawSupply = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const rawDemand = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const producerMaintenanceByRes = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        game.grid.forEach(t => {
            if (t.owner !== game.currentOwnerKey || !t.building) return;
            const b = BUILDINGS[t.building];
            const mul = Research.getMultiplier(game, t.building);
            Object.entries(b.yields).forEach(([res, val]) => {
                let eff = (val || 0);
                if (eff > 0) eff *= mul;
                if (t.building === 'renewable_power' && res === 'energy') {
                    const base = (val || 0);
                    const bonus = (t.terrain === 'DESERT') ? Math.max(0, b.energy_desert_bonus || 0) : 0;
                    const capped = base + bonus;
                    const capRef = BUILDINGS[b.energy_cap_ref || ''] || null;
                    const capMul = capRef ? Research.getMultiplier(game, b.energy_cap_ref) : 1;
                    const capVal = capRef && capRef.yields ? Math.max(0, (capRef.yields.energy || 0) * capMul) : Infinity;
                    eff = Math.min((base + bonus) * mul, capVal);
                }
                if (marketKeys.includes(res)) {
                    if (eff > 0) {
                        rawSupply[res] += eff;
                        const mCost = (b.yields && typeof b.yields.money === 'number' && b.yields.money < 0) ? Math.abs(b.yields.money) : 0;
                        if (mCost > 0) producerMaintenanceByRes[res] += mCost;
                    } else if (eff < 0) {
                        rawDemand[res] += Math.abs(eff);
                    }
                } else if (res === 'fuel') {
                    newDeltas.fuel += eff;
                }
            });
            // 不再统一消耗消费品：由各建筑 yields.consumer 负值决定
        });
        const adj = game.marketAdjust || { supply: { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 }, demand: { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 } };
        ['food','metal','precious','consumer','energy','oil'].forEach(k => {
            const supAdj = Math.floor((adj.supply || {})[k] || 0);
            const demAdj = Math.floor((adj.demand || {})[k] || 0);
            rawSupply[k] = Math.max(0, (rawSupply[k] || 0) + supAdj);
            rawDemand[k] = Math.max(0, (rawDemand[k] || 0) + demAdj);
        });
        const ratio = {};
        ['food','metal','precious','consumer','energy','oil'].forEach(k => {
            const sup = Math.max(0, Math.floor(rawSupply[k] || 0));
            const dem = Math.max(0, Math.floor(rawDemand[k] || 0));
            ratio[k] = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
        });
        const supply1 = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const demand1 = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const newDeltasStage1 = { ...newDeltas };
        game.grid.forEach(t => {
            if (t.owner !== game.currentOwnerKey || !t.building) return;
            const b = BUILDINGS[t.building];
            const mul = Research.getMultiplier(game, t.building);
            const reqRes = Object.entries(b.yields).filter(([res, val]) => marketKeys.includes(res) && (val || 0) < 0).map(([res]) => res);
            // 不再强制所有建筑需要消费品：由各建筑的需求集合决定
            let gTotal = 1;
            if (reqRes.length > 0) {
                const gs = reqRes.map(rk => {
                    const R = ratio[rk];
                    if (!isFinite(R)) return 1;
                    if (R >= 0.75) return 1;
                    const g = Math.max(0.25, Math.min(1, R + 0.25));
                    return g;
                });
                gTotal = gs.reduce((a, b) => a + b, 0) / gs.length;
            }
            Object.entries(b.yields).forEach(([res, val]) => {
                let effBase = (val || 0);
                if (t.building === 'admin_center' && res === 'civilization') {
                    const bonusPer = Math.max(0, Math.floor(b.admin_civ_bonus_per_level || 1));
                    const lvl = (typeof Research.getLevel === 'function') ? Math.max(0, Math.floor(Research.getLevel(game, 'administration') || 0)) : 0;
                    effBase += Math.max(0, bonusPer * lvl);
                }
                if (effBase > 0) effBase *= mul;
                if (res === 'civilization') {
                    const gov = game.govStructure || '';
                    const speech = game.speechLaw || 'press_censorship';
                    let civBonus = 0;
                    if (gov === 'monarchy') civBonus += 1.0;
                    else if (gov === 'presidential_republic') civBonus += 0.5;
                    if (speech === 'illegal_dissent') civBonus += 1.0;
                    else if (speech === 'press_censorship') civBonus += 0.25;
                    effBase *= (1 + civBonus);
                }
                if (res === 'science') {
                    const edu = game.educationLaw || 'none';
                    const speech = game.speechLaw || 'press_censorship';
                    let sciBonus = 0;
                    if (edu === 'private_school' || edu === 'public_school') sciBonus += 0.25;
                    if (speech === 'free_speech') sciBonus += 0.15;
                    sciBonus += stability.sciMicro;
                    effBase *= (1 + sciBonus);
                }
                if (t.building === 'city' && res === 'money' && game.economySystem === 'laissez_faire') {
                    effBase += 150;
                }
                if (t.building === 'city' && res === 'money' && game.economySystem === 'cooperative') {
                    effBase += 50;
                }
                if (t.building === 'renewable_power' && res === 'energy') {
                    const base = (val || 0);
                    const seaTerr = t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA';
                    const bonus = (t.terrain === 'DESERT' || seaTerr) ? Math.max(0, b.energy_desert_bonus || 0) : 0;
                    const capRef = BUILDINGS[b.energy_cap_ref || ''] || null;
                    const capMul = capRef ? Research.getMultiplier(game, b.energy_cap_ref) : 1;
                    const capVal = capRef && capRef.yields ? Math.max(0, (capRef.yields.energy || 0) * capMul) : Infinity;
                    effBase = Math.min((base + bonus) * mul, capVal);
                }
                if (marketKeys.includes(res)) {
                    if (effBase > 0) {
                        const eff = effBase * gTotal;
                        supply1[res] += eff;
                        newDeltasStage1[res] += eff;
                    } else if (effBase < 0) {
                        demand1[res] += Math.abs(effBase);
                    }
                } else {
                    const eff = effBase * gTotal;
                    newDeltasStage1[res] += eff;
                }
            });
            // 不再统一加入消费品需求：各建筑的负向消费已记录在 demand 中
        });
        const ratioMarket = {};
        ['food','metal','precious','consumer','energy','oil'].forEach(k => {
            const sup = Math.max(0, Math.floor(supply1[k] || 0));
            const dem = Math.max(0, Math.floor(demand1[k] || 0));
            ratioMarket[k] = dem > 0 ? (sup / dem) : (sup > 0 ? Infinity : 0);
        });
        const supply = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const supplyState = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const supplyPrivate = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const demand = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const demandState = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const demandPrivate = { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const demandPrivateByClass = {
            elite: { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 },
            expert: { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 },
            labor: { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 }
        };
        const newDeltasFinal = { money: 0, food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0, fuel: 0, industry: 0, pop: 0, science: 0, civilization: 0 };
        game.grid.forEach(t => {
            if (t.owner !== game.currentOwnerKey || !t.building) return;
            const b = BUILDINGS[t.building];
            const mul = Research.getMultiplier(game, t.building);
            const reqRes = Object.entries(b.yields).filter(([res, val]) => marketKeys.includes(res) && (val || 0) < 0).map(([res]) => res);
            let gTotal = 1;
            if (reqRes.length > 0) {
                const gs = reqRes.map(rk => {
                    const R = ratioMarket[rk];
                    if (!isFinite(R)) return 1;
                    if (R >= 0.75) return 1;
                    const g = Math.max(0.25, Math.min(1, R + 0.25));
                    return g;
                });
                gTotal = gs.reduce((a, b) => a + b, 0) / gs.length;
            }
            Object.entries(b.yields).forEach(([res, val]) => {
                let effBase = (val || 0);
                if (t.building === 'admin_center' && res === 'civilization') {
                    const bonusPer = Math.max(0, Math.floor(b.admin_civ_bonus_per_level || 1));
                    const lvl = (typeof Research.getLevel === 'function') ? Math.max(0, Math.floor(Research.getLevel(game, 'administration') || 0)) : 0;
                    effBase += Math.max(0, bonusPer * lvl);
                }
                if (effBase > 0) effBase *= mul;
                if (t.building === 'renewable_power' && res === 'energy') {
                    const base = (val || 0);
                    const seaTerr = t.terrain === 'SHALLOW_SEA' || t.terrain === 'DEEP_SEA';
                    const bonus = (t.terrain === 'DESERT' || seaTerr) ? Math.max(0, b.energy_desert_bonus || 0) : 0;
                    const capRef = BUILDINGS[b.energy_cap_ref || ''] || null;
                    const capMul = capRef ? Research.getMultiplier(game, b.energy_cap_ref) : 1;
                    const capVal = capRef && capRef.yields ? Math.max(0, (capRef.yields.energy || 0) * capMul) : Infinity;
                    effBase = Math.min((base + bonus) * mul, capVal);
                }
                if (res === 'civilization') {
                    const gov = game.govStructure || '';
                    const speech = game.speechLaw || 'press_censorship';
                    let civBonus = 0;
                    if (gov === 'monarchy') civBonus += 1.0;
                    else if (gov === 'presidential_republic') civBonus += 0.5;
                    if (speech === 'illegal_dissent') civBonus += 1.0;
                    else if (speech === 'press_censorship') civBonus += 0.25;
                    effBase *= (1 + civBonus);
                }
                if (t.building === 'city' && res === 'money' && game.economySystem === 'laissez_faire') {
                    effBase += 150;
                }
                if (t.building === 'city' && res === 'money' && game.economySystem === 'cooperative') {
                    effBase += 50;
                }
                if (res === 'science') {
                    const edu = game.educationLaw || 'none';
                    const speech = game.speechLaw || 'press_censorship';
                    let sciBonus = 0;
                    if (edu === 'private_school' || edu === 'public_school') sciBonus += 0.25;
                    if (speech === 'free_speech') sciBonus += 0.15;
                    sciBonus += stability.sciMicro;
                    effBase *= (1 + sciBonus);
                }
                if (marketKeys.includes(res)) {
                    if (effBase > 0) {
                        const eff = effBase * gTotal;
                        supply[res] += eff;
                        if (t.marketOwnership === 'private') supplyPrivate[res] += eff; else supplyState[res] += eff;
                        newDeltasFinal[res] += eff;
                    } else if (effBase < 0) {
                        const use = Math.abs(effBase);
                        demand[res] += use;
                        const isPriv = t.marketOwnership === 'private';
                        if (isPriv) {
                            demandPrivate[res] += use;
                            const inv = t.investorClass;
                            if (inv === 'elite' || inv === 'expert' || inv === 'labor') demandPrivateByClass[inv][res] += use;
                        } else {
                            demandState[res] += use;
                        }
                    }
                } else {
                    const eff = effBase * gTotal;
                    newDeltasFinal[res] += eff;
                }
            });
            if (t.building === 'barracks' && game.conscriptionLaw === 'mass_conscription') {
                demand.food += 10;
                demandState.food += 10;
            }
        });
        if (stability.protestSeverity > 0) {
            newDeltasFinal.industry = Math.floor(newDeltasFinal.industry * (1 - 0.1 * stability.protestSeverity));
        }
        newDeltasFinal.money = Math.floor(newDeltasFinal.money * stability.mul);
        const civMul = Math.min(1.35, stability.mul + stability.civMicro);
        newDeltasFinal.civilization = Math.floor(newDeltasFinal.civilization * civMul);
        Object.assign(newDeltas, newDeltasFinal);
        // 计算国内市场价格与金钱运行成本
        const basePrice = { food: 1, metal: 2, precious: 6, consumer: 2, energy: 2, oil: 4 };
        const prices = {};
        let opCostGov = 0;
        let opCostPriv = 0;
        Object.keys(basePrice).forEach(k => {
            const sup = Math.max(0, Math.floor(supply[k] || 0));
            const dem = Math.max(0, Math.floor(demand[k] || 0));
            const shortage = Math.max(0, dem - sup);
            let factor = 1;
            if ((sup + dem) === 0) {
                factor = 1;
            } else if (dem === 0 && sup > 0) {
                factor = 0.25;
            } else {
                const R = dem > 0 ? (sup / dem) : 0;
                if (R > 1) {
                    const Rc = Math.min(R, 4);
                    factor = 1 - ((Rc - 1) / 3) * 0.75;
                    factor = Math.max(0.25, Math.min(1, factor));
            } else {
                const pressure = (dem - sup) / Math.max(1, sup + dem);
                factor = 1 + Math.max(0, pressure) * 2;
            }
        }
            const infl = (typeof game.inflationFactor === 'number') ? Math.min(12, Math.max(1, game.inflationFactor)) : 1;
            const price = basePrice[k] * factor * infl;
            prices[k] = price;
            opCostGov += Math.max(0, Math.floor(demandState[k] || 0)) * price;
            opCostPriv += Math.max(0, Math.floor(demandPrivate[k] || 0)) * price;
        });
        if (stability.protestSeverity > 0) {
            opCostGov = Math.floor(opCostGov * (1 + 0.1 * stability.protestSeverity));
            opCostPriv = Math.floor(opCostPriv * (1 + 0.1 * stability.protestSeverity));
        }
        let militaryCostFloat = 0;
        if (Array.isArray(game.units)) {
            game.units.forEach(u => {
                if (!u || u.owner !== game.currentOwnerKey) return;
                const parts = Array.isArray(u.comp) ? u.comp : [].concat(u.comp?.support || [], u.comp?.main || []);
                if (!Array.isArray(parts) || parts.length === 0) return;
                let unitCost = 0;
                parts.forEach(k => {
                    const reg = REGIMENT_TYPES[k];
                    const c = reg && typeof reg.maint_cost === 'number' ? reg.maint_cost : 1;
                    unitCost += Math.max(0, c || 0);
                });
                militaryCostFloat += unitCost;
            });
        }
        const militaryCost = Math.ceil(militaryCostFloat);
        const taxRates = game.taxRates || { food: 0, metal: 0, precious: 0, consumer: 0, energy: 0, oil: 0 };
        const revenueByRes = {};
        const profitByRes = {};
        const taxedProfitByRes = {};
        const taxIncomeByRes = {};
        let taxedProfitTotal = 0;
        let taxIncomeTotal = 0;
        const taxLaw = game.taxLaw || 'consumption_tax';
        const allowMarketTax = (taxLaw === 'consumption_tax' || taxLaw === 'progressive_tax');
        const marketCap = (taxLaw === 'progressive_tax') ? 0.5 : (taxLaw === 'consumption_tax' ? 0.2 : 0);
        Object.keys(basePrice).forEach(k => {
            const sup = Math.max(0, Math.floor(supply[k] || 0));
            const dem = Math.max(0, Math.floor(demand[k] || 0));
            const revenue = sup * (prices[k] || 0);
            const maintenance = Math.max(0, Math.floor((producerMaintenanceByRes[k] || 0)));
            const traded = Math.min(sup, dem);
            const profit = Math.max(0, traded * (prices[k] || 0));
            const trRaw = Math.max(0, Math.min(1, (taxRates[k] || 0)));
            const tr = allowMarketTax ? Math.max(0, Math.min(marketCap, trRaw)) : 0;
            const stateShare = sup > 0 ? Math.max(0, Math.min(1, (supplyState[k] || 0) / sup)) : 0;
            const taxed = profit * (1 - tr) * stateShare;
            const taxIncome = profit * tr * stateShare;
            revenueByRes[k] = Math.floor(revenue);
            profitByRes[k] = Math.floor(profit);
            taxedProfitByRes[k] = Math.floor(taxed);
            taxIncomeByRes[k] = Math.floor(taxIncome);
            taxedProfitTotal += taxed;
            taxIncomeTotal += taxIncome;
        });
        newDeltas.money += Math.floor(taxIncomeTotal);
        const taxedTotalInt = Math.floor(taxedProfitTotal);
        let totalClassWeighted = 0;
        let totalPop = 0;
        let totE = 0, totX = 0, totL = 0, totS = 0;
        Object.keys(game.cityDistricts || {}).forEach(dk => {
            const dist = typeof game.getDistrictClassDistribution === 'function' ? game.getDistrictClassDistribution(dk) : null;
            if (!dist) return;
            const w = POP_CLASS_SURPLUS_WEIGHTS || { elite: 3, expert: 2, labor: 1, subsistence: 0.5 };
            const e = Math.max(0, Math.floor(dist.elite || 0));
            const x = Math.max(0, Math.floor(dist.expert || 0));
            const l = Math.max(0, Math.floor(dist.labor || 0));
            const s = Math.max(0, Math.floor(dist.subsistence || 0));
            totalClassWeighted += e * (w.elite || 0) + x * (w.expert || 0) + l * (w.labor || 0) + s * (w.subsistence || 0);
            totalPop += e + x + l + s;
            totE += e; totX += x; totL += l; totS += s;
        });
        let classMultiplier = 1;
        if (totalPop > 0) classMultiplier = Math.max(0.5, Math.min(2, totalClassWeighted / totalPop));
        const totalDelta = Math.floor(taxedTotalInt * classMultiplier);
        newDeltas.social_surplus = totalDelta;
        const w = POP_CLASS_SURPLUS_WEIGHTS || { elite: 3, expert: 2, labor: 1, subsistence: 0.5 };
        const wE = totE * (w.elite || 0);
        const wX = totX * (w.expert || 0);
        const wL = totL * (w.labor || 0);
        const wS = totS * (w.subsistence || 0);
        const sumWcw = wE + wX + wL + wS;
        let byClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        if (sumWcw > 0) {
            const shares = { elite: wE / sumWcw, expert: wX / sumWcw, labor: wL / sumWcw, subsistence: wS / sumWcw };
            byClass.elite = Math.floor(totalDelta * shares.elite);
            byClass.expert = Math.floor(totalDelta * shares.expert);
            byClass.labor = Math.floor(totalDelta * shares.labor);
            byClass.subsistence = Math.floor(totalDelta * shares.subsistence);
            const assigned = byClass.elite + byClass.expert + byClass.labor + byClass.subsistence;
            let rem = Math.max(0, totalDelta - assigned);
            const order = [
                { k: 'elite', v: shares.elite },
                { k: 'expert', v: shares.expert },
                { k: 'labor', v: shares.labor },
                { k: 'subsistence', v: shares.subsistence }
            ].sort((a, b) => b.v - a.v);
            for (let i = 0; i < order.length && rem > 0; i++) { byClass[order[i].k] += 1; rem--; }
        }
        const privMaintByClassCost = {
            elite: Object.keys(basePrice).reduce((s, r) => s + Math.max(0, Math.floor(demandPrivateByClass.elite[r] || 0)) * (prices[r] || 0), 0),
            expert: Object.keys(basePrice).reduce((s, r) => s + Math.max(0, Math.floor(demandPrivateByClass.expert[r] || 0)) * (prices[r] || 0), 0),
            labor: Object.keys(basePrice).reduce((s, r) => s + Math.max(0, Math.floor(demandPrivateByClass.labor[r] || 0)) * (prices[r] || 0), 0)
        };
        const privMaintTotal = Math.floor(privMaintByClassCost.elite + privMaintByClassCost.expert + privMaintByClassCost.labor);
        if (privMaintTotal > 0) {
            byClass.elite = Math.max(0, Math.floor(byClass.elite - privMaintByClassCost.elite));
            byClass.expert = Math.max(0, Math.floor(byClass.expert - privMaintByClassCost.expert));
            byClass.labor = Math.max(0, Math.floor(byClass.labor - privMaintByClassCost.labor));
            const newTotalDelta = Math.max(0, Math.floor(totalDelta - privMaintTotal));
            newDeltas.social_surplus = newTotalDelta;
        }
        let socialSecurityCost = 0;
        let socialSecurityByClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const baseIncomeForSS = Math.max(0, Math.floor(newDeltas.money || 0));
        const ssLaw = game.socialSecurityLaw || 'none';
        let ssPct = 0;
        let ssWeights = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        if (ssLaw === 'poor_relief') { ssPct = 0.05; ssWeights = { elite: 0, expert: 0, labor: 2, subsistence: 1 }; }
        else if (ssLaw === 'wage_subsidy') { ssPct = 0.10; ssWeights = { elite: 0, expert: 2, labor: 1, subsistence: 0 }; }
        else if (ssLaw === 'pension') { ssPct = 0.15; ssWeights = { elite: 1, expert: 1, labor: 1, subsistence: 1 }; }
        const ssCostBase = Math.floor(baseIncomeForSS * ssPct);
        if (ssCostBase > 0) {
            const sumW = Math.max(1, (ssWeights.elite || 0) + (ssWeights.expert || 0) + (ssWeights.labor || 0) + (ssWeights.subsistence || 0));
            const alloc = (k, w) => Math.floor(ssCostBase * Math.max(0, w || 0) / sumW);
            socialSecurityByClass.elite = alloc('elite', ssWeights.elite);
            socialSecurityByClass.expert = alloc('expert', ssWeights.expert);
            socialSecurityByClass.labor = alloc('labor', ssWeights.labor);
            socialSecurityByClass.subsistence = alloc('subsistence', ssWeights.subsistence);
            const assigned = socialSecurityByClass.elite + socialSecurityByClass.expert + socialSecurityByClass.labor + socialSecurityByClass.subsistence;
            let rem = Math.max(0, ssCostBase - assigned);
            const order = [
                { k: 'elite', w: ssWeights.elite || 0 },
                { k: 'expert', w: ssWeights.expert || 0 },
                { k: 'labor', w: ssWeights.labor || 0 },
                { k: 'subsistence', w: ssWeights.subsistence || 0 }
            ].sort((a, b) => b.w - a.w);
            for (let i = 0; i < order.length && rem > 0; i++) { socialSecurityByClass[order[i].k] += 1; rem--; }
        }
        let publicServicePct = 0;
        if (game.healthLaw === 'public_insurance') publicServicePct += 0.03;
        if (game.educationLaw === 'public_school') publicServicePct += 0.03;
        const publicServiceCost = Math.floor(baseIncomeForSS * publicServicePct);
        socialSecurityCost = ssCostBase + publicServiceCost;
        game.market = { supply, demand, prices, opCost: Math.floor(opCostGov), privateOpCost: Math.floor(opCostPriv), privateMaintByClassCost: privMaintByClassCost, militaryCost, revenueByRes, profitByRes, taxedProfitByRes, taxedProfitTotal: Math.floor(taxedProfitTotal), taxIncomeByRes, taxIncomeTotal: Math.floor(taxIncomeTotal), socialSecurityCost, socialSecurityByClass };
        game.market.socialSurplusByClassDelta = byClass;
        game.deltas = newDeltas;
        game.res.science = game.deltas.science;
    },
    applyTurnIncome(game) {
        Object.keys(game.res).forEach(k => {
            if (k === 'science') return;
            if (k === 'pop') return;
            if (k === 'food' || k === 'metal' || k === 'precious' || k === 'consumer' || k === 'energy' || k === 'oil') { game.res[k] = 0; return; }
            game.res[k] += game.deltas[k];
        });
        const m = game.market || {};
        const op = Math.max(0, Math.floor(m.opCost || 0));
        if (op > 0) game.res.money = Math.max(0, (game.res.money || 0) - op);
        const mil = Math.max(0, Math.floor(m.militaryCost || 0));
        if (mil > 0) game.res.money = Math.max(0, (game.res.money || 0) - mil);
        const soc = Math.max(0, Math.floor(m.socialSecurityCost || 0));
        if (soc > 0) game.res.money = Math.max(0, (game.res.money || 0) - soc);
        const minted = Math.max(0, Math.floor(game.mintingAmount || 0));
        if (minted > 0) game.res.money = Math.max(0, (game.res.money || 0) + minted);
        const byClass = m.socialSurplusByClassDelta || {};
        if (!game.socialSurplusByClassTotal) game.socialSurplusByClassTotal = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        ['elite','expert','labor','subsistence'].forEach(cls => {
            const inc = Math.max(0, Math.floor(byClass[cls] || 0));
            game.socialSurplusByClassTotal[cls] = Math.max(0, Math.floor((game.socialSurplusByClassTotal[cls] || 0) + inc));
        });
        const ss = m.socialSecurityByClass || {};
        ['elite','expert','labor','subsistence'].forEach(cls => {
            const add = Math.max(0, Math.floor(ss[cls] || 0));
            if (add > 0) game.socialSurplusByClassTotal[cls] = Math.max(0, Math.floor((game.socialSurplusByClassTotal[cls] || 0) + add));
        });
        const agg = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        Object.keys(game.cityDistricts || {}).forEach(dk => {
            const dist = typeof game.getDistrictClassDistribution === 'function' ? game.getDistrictClassDistribution(dk) : null;
            if (!dist) return;
            agg.elite += Math.max(0, Math.floor(dist.elite || 0));
            agg.expert += Math.max(0, Math.floor(dist.expert || 0));
            agg.labor += Math.max(0, Math.floor(dist.labor || 0));
            agg.subsistence += Math.max(0, Math.floor(dist.subsistence || 0));
        });
        const last = game.lastClassPopTotals || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const diff = {
            elite: Math.max(0, Math.floor(agg.elite - (last.elite || 0))),
            expert: Math.max(0, Math.floor(agg.expert - (last.expert || 0))),
            labor: Math.max(0, Math.floor(agg.labor - (last.labor || 0))),
            subsistence: Math.max(0, Math.floor(agg.subsistence - (last.subsistence || 0)))
        };
        const neg = {
            elite: Math.max(0, Math.floor((last.elite || 0) - agg.elite)),
            expert: Math.max(0, Math.floor((last.expert || 0) - agg.expert)),
            labor: Math.max(0, Math.floor((last.labor || 0) - agg.labor)),
            subsistence: Math.max(0, Math.floor((last.subsistence || 0) - agg.subsistence))
        };
        const totalPos = diff.elite + diff.expert + diff.labor + diff.subsistence;
        const totalNeg = neg.elite + neg.expert + neg.labor + neg.subsistence;
        if (totalPos > 0 && totalNeg > 0) {
            let pool = 0;
            const perCapita = {
                elite: (game.socialSurplusByClassTotal.elite || 0) / Math.max(1, (last.elite || 0)),
                expert: (game.socialSurplusByClassTotal.expert || 0) / Math.max(1, (last.expert || 0)),
                labor: (game.socialSurplusByClassTotal.labor || 0) / Math.max(1, (last.labor || 0)),
                subsistence: (game.socialSurplusByClassTotal.subsistence || 0) / Math.max(1, (last.subsistence || 0))
            };
            const takeFrom = (cls) => {
                const movePop = neg[cls];
                if (movePop <= 0) return;
                const amt = Math.min(Math.floor(movePop * Math.max(0, perCapita[cls] || 0)), Math.max(0, game.socialSurplusByClassTotal[cls] || 0));
                game.socialSurplusByClassTotal[cls] = Math.max(0, Math.floor((game.socialSurplusByClassTotal[cls] || 0) - amt));
                pool += amt;
            };
            takeFrom('elite'); takeFrom('expert'); takeFrom('labor'); takeFrom('subsistence');
            if (pool > 0) {
                const giveTo = (cls) => {
                    const share = diff[cls] / totalPos;
                    const add = Math.floor(pool * share);
                    game.socialSurplusByClassTotal[cls] = Math.max(0, Math.floor((game.socialSurplusByClassTotal[cls] || 0) + add));
                    return add;
                };
                const aE = giveTo('elite');
                const aX = giveTo('expert');
                const aL = giveTo('labor');
                const aS = giveTo('subsistence');
                const assigned = aE + aX + aL + aS;
                let rem = Math.max(0, pool - assigned);
                const order = [
                    { k: 'elite', v: diff.elite },
                    { k: 'expert', v: diff.expert },
                    { k: 'labor', v: diff.labor },
                    { k: 'subsistence', v: diff.subsistence }
                ].sort((a, b) => b.v - a.v);
                for (let i = 0; i < order.length && rem > 0; i++) { game.socialSurplusByClassTotal[order[i].k] += 1; rem--; }
            }
        }
        game.lastClassPopTotals = agg;
        const byClassDelta = m.socialSurplusByClassDelta || {};
        const ratesRaw = game.surplusTaxRatePerClass || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const headRatesRaw = game.headTaxPerClass || { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        const curLaw = game.taxLaw || 'consumption_tax';
        let rates = { ...ratesRaw };
        let headRates = { ...headRatesRaw };
        if (curLaw === 'consumption_tax') {
            rates = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
            headRates = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        } else if (curLaw === 'head_tax') {
            rates = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
            const uni = Math.max(0, headRatesRaw.elite || 0, headRatesRaw.expert || 0, headRatesRaw.labor || 0);
            headRates = { elite: uni, expert: uni, labor: uni, subsistence: 0 };
        } else if (curLaw === 'proportional_tax') {
            headRates = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
            const uni = Math.max(0, ratesRaw.elite || 0, ratesRaw.expert || 0, ratesRaw.labor || 0);
            rates = { elite: uni, expert: uni, labor: uni, subsistence: 0 };
        } else {
            rates = { elite: Math.max(0, Math.min(1, ratesRaw.elite || 0)), expert: Math.max(0, Math.min(1, ratesRaw.expert || 0)), labor: Math.max(0, Math.min(1, ratesRaw.labor || 0)), subsistence: 0 };
            headRates = { elite: Math.max(0, headRatesRaw.elite || 0), expert: Math.max(0, headRatesRaw.expert || 0), labor: Math.max(0, headRatesRaw.labor || 0), subsistence: 0 };
        }
        const proportionByClass = {
            elite: Math.floor(Math.max(0, Math.floor(byClassDelta.elite || 0)) * Math.max(0, Math.min(1, rates.elite || 0))),
            expert: Math.floor(Math.max(0, Math.floor(byClassDelta.expert || 0)) * Math.max(0, Math.min(1, rates.expert || 0))),
            labor: Math.floor(Math.max(0, Math.floor(byClassDelta.labor || 0)) * Math.max(0, Math.min(1, rates.labor || 0))),
            subsistence: 0
        };
        const headDesired = {
            elite: Math.max(0, (headRates.elite || 0)) * Math.max(0, agg.elite || 0),
            expert: Math.max(0, (headRates.expert || 0)) * Math.max(0, agg.expert || 0),
            labor: Math.max(0, (headRates.labor || 0)) * Math.max(0, agg.labor || 0),
            subsistence: 0
        };
        const headByClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
        ['elite','expert','labor'].forEach(cls => {
            const incomeAvail = Math.max(0, Math.floor((byClassDelta[cls] || 0)));
            const storedAvail = Math.max(0, Math.floor((game.socialSurplusByClassTotal?.[cls] || 0)));
            const maxCollect = incomeAvail + storedAvail;
            const collect = Math.min(Math.max(0, Math.round(headDesired[cls] || 0)), maxCollect);
            const fromIncome = Math.min(collect, incomeAvail);
            const fromStored = collect - fromIncome;
            headByClass[cls] = collect;
            if (collect > 0) {
                const curTotal = Math.max(0, Math.floor(game.socialSurplusByClassTotal[cls] || 0));
                const nextTotal = Math.max(0, curTotal - collect);
                game.socialSurplusByClassTotal[cls] = nextTotal;
            }
        });
        const proportionTotal = proportionByClass.elite + proportionByClass.expert + proportionByClass.labor;
        const headTotal = headByClass.elite + headByClass.expert + headByClass.labor;
        game.deltas.money = Math.max(0, Math.floor((game.deltas.money || 0) + proportionTotal + headTotal));
        game.res.money = Math.max(0, Math.floor((game.res.money || 0) + proportionTotal + headTotal));
        game.market.surplusTaxes = { proportionTotal, headTotal, proportionByClass, headByClass, rates, headRates };
        const owners = Object.keys(game.ownerStates || {});
        owners.forEach(o => {
            if (!o || o === game.currentOwnerKey) return;
            if (typeof Economy.computeSnapshotForOwner !== 'function') return;
            const snap = Economy.computeSnapshotForOwner(game, o);
            const res = game.ownerStates[o].res || {};
            const del = snap.deltas || {};
            const mk = snap.market || {};
            res.money = Math.max(0, Math.floor((res.money || 0) + Math.floor(del.money || 0) - Math.max(0, Math.floor(mk.opCost || 0)) - Math.max(0, Math.floor(mk.militaryCost || 0)) - Math.max(0, Math.floor(mk.socialSecurityCost || 0))));
            res.industry = Math.max(0, Math.floor((res.industry || 0) + Math.floor(del.industry || 0)));
            res.science = Math.max(0, Math.floor(del.science || 0));
            res.civilization = Math.max(0, Math.floor(del.civilization || 0));
            res.pop = Math.max(0, Math.floor(typeof game.computeOwnerPopulation === 'function' ? game.computeOwnerPopulation(o) : (res.pop || 0)));
            game.ownerStates[o].res = res;
            game.ownerStates[o].deltas = { ...del };
            game.ownerStates[o].market = { ...mk };
            game.ownerStates[o].buildPowerMax = Math.max(0, Math.floor(snap.buildPowerMax || 0));
        });
    },
    computeUnitBaseCost(unit) {
        const keys = Array.isArray(unit.comp) ? unit.comp : [].concat(unit.comp?.support || [], unit.comp?.main || []);
        const total = {};
        keys.forEach(k => {
            const reg = REGIMENT_TYPES[k];
            if (!reg) return;
            if (reg.cost && typeof reg.cost === 'object') {
                Object.entries(reg.cost).forEach(([rk, rv]) => { total[rk] = (total[rk] || 0) + (rv || 0); });
            } else {
                total.money = (total.money || 0) + (reg.cost_money || 0);
                total.industry = (total.industry || 0) + (reg.cost_ind || 0);
                if (typeof reg.pop === 'number') total.pop = (total.pop || 0) + (reg.pop || 0);
            }
        });
        return total;
    },
    computeRefillCost(unit) {
        const base = this.computeUnitBaseCost(unit);
        const max = (unit.maxHp || unit.hp || 1);
        const missing = Math.max(0, max - (unit.hp || 0));
        const ratio = missing / max;
        const scaled = {};
        Object.entries(base).forEach(([k, v]) => {
            const val = Math.ceil((v || 0) * ratio);
            if (val > 0) scaled[k] = val;
        });
        return scaled;
    },
    canRefill(game, unit) {
        if (!unit) return false;
        const tile = game.grid.find(t => t.q === unit.q && t.r === unit.r);
        if (!tile || tile.owner !== unit.owner) return false;
        const isAir = Units.isAir(unit);
        const okBuilding = isAir ? (tile.building === 'airbase') : (tile.building === 'city' || tile.building === 'barracks');
        if (!okBuilding) return false;
        const max = (unit.maxHp || unit.hp || 1);
        const missing = Math.max(0, max - (unit.hp || 0));
        if (missing <= 0) return false;
        const cost = this.computeRefillCost(unit);
        return this.canAfford(game, cost, { tile, ownerKey: unit.owner });
    },
    applyRefill(game, unit) {
        const cost = this.computeRefillCost(unit);
        const tile = game.grid.find(t => t.q === unit.q && t.r === unit.r);
        if (!this.canAfford(game, cost, { tile, ownerKey: unit.owner })) return false;
        const ok = this.applyCost(game, cost, { tile, ownerKey: unit.owner });
        if (!ok) return false;
        const max = (unit.maxHp || unit.hp || 1);
        unit.hp = Math.max(0, Math.min(max, max));
        return true;
    },
    normalizeCost(cost) {
        if (typeof cost === 'number') return { money: cost };
        if (cost && typeof cost === 'object') return { ...cost };
        return {};
    },
    resolveDistrictKey(game, opts) {
        if (opts && typeof opts.districtKey === 'string' && opts.districtKey) return opts.districtKey;
        const t = opts && opts.tile ? opts.tile : (game ? game.selectedTile : null);
        const dk = t && typeof t.districtKey === 'string' ? t.districtKey : '';
        return dk || '';
    },
    getAvailablePop(game, districtKey, ownerKey) {
        if (districtKey && game && typeof game.getDistrictPopulation === 'function') return game.getDistrictPopulation(districtKey);
        if (ownerKey && typeof game.computeOwnerPopulation === 'function') return Math.max(0, Math.floor(game.computeOwnerPopulation(ownerKey)));
        return Math.max(0, Math.floor((game && game.res && typeof game.res.pop === 'number') ? game.res.pop : 0));
    },
    canAfford(game, cost, opts) {
        const c = this.normalizeCost(cost);
        const dk = this.resolveDistrictKey(game, opts);
        const ownerKey = (opts && opts.ownerKey) || (game && game.currentOwnerKey);
        return Object.entries(c).every(([k, v]) => {
            const need = Math.max(0, Math.floor(v || 0));
            if (need <= 0) return true;
            if (k === 'pop') return this.getAvailablePop(game, dk, ownerKey) >= need;
            return (game.res[k] || 0) >= need;
        });
    },
    applyCost(game, cost, opts) {
        const c = this.normalizeCost(cost);
        const dk = this.resolveDistrictKey(game, opts);
        const ownerKey = (opts && opts.ownerKey) || (game && game.currentOwnerKey);
        if (!this.canAfford(game, c, { districtKey: dk, ownerKey })) return false;
        Object.entries(c).forEach(([k, v]) => {
            const need = Math.max(0, Math.floor(v || 0));
            if (need <= 0) return;
            if (k === 'pop') {
                if (dk && typeof game.adjustDistrictPopulation === 'function') {
                    game.adjustDistrictPopulation(dk, -need);
                } else if (ownerKey && typeof game.getDistrictTiles === 'function' && typeof game.adjustDistrictPopulation === 'function') {
                    const keys = Object.keys(game.cityDistricts || {});
                    // 优先从该所有者人口最多的辖区扣减
                    const ownerDistricts = keys.filter(key => {
                        const [q, r] = String(key).split(',').map(n => parseInt(n, 10));
                        const cityTile = (game.grid || []).find(t => t && t.q === q && t.r === r);
                        return !!cityTile && cityTile.owner === ownerKey;
                    }).sort((a, b) => game.getDistrictPopulation(b) - game.getDistrictPopulation(a));
                    let remaining = need;
                    for (let i = 0; i < ownerDistricts.length && remaining > 0; i++) {
                        const key = ownerDistricts[i];
                        const cur = Math.max(0, Math.floor(game.getDistrictPopulation(key)));
                        if (cur <= 0) continue;
                        const dec = Math.min(cur, remaining);
                        game.adjustDistrictPopulation(key, -dec);
                        remaining -= dec;
                    }
                    if (remaining > 0) {
                        game.res[k] = Math.max(0, (game.res[k] || 0) - remaining);
                    }
                } else {
                    game.res[k] = Math.max(0, (game.res[k] || 0) - need);
                }
                return;
            }
            game.res[k] = (game.res[k] || 0) - need;
        });
        return true;
    },
    formatCost(cost) {
        const c = this.normalizeCost(cost);
        const parts = [];
        const order = ['money','industry','pop','food','metal','precious'];
        order.forEach(k => {
            const v = c[k];
            if (!v || v <= 0) return;
            const icon = (typeof YIELD_ICONS === 'object' && YIELD_ICONS[k]) ? YIELD_ICONS[k] : k;
            parts.push(k === 'money' ? `$${v}` : `${icon} ${v}`);
        });
        Object.entries(c).forEach(([k, v]) => {
            if (order.includes(k)) return;
            if (!v || v <= 0) return;
            const icon = (typeof YIELD_ICONS === 'object' && YIELD_ICONS[k]) ? YIELD_ICONS[k] : k;
            parts.push(k === 'money' ? `$${v}` : `${icon} ${v}`);
        });
        return parts.join(' / ');
    }
};
if (typeof window !== 'undefined') window.Economy = Economy;
