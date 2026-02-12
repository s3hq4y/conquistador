const UIResources = {
    update(game) {
        const curOwner = game.currentOwnerKey || 'Player';
        const snap = (curOwner === 'Player')
            ? { res: game.res, deltas: game.deltas, market: game.market, buildPowerMax: game.buildPowerMax }
            : ((game.ownerStates || {})[curOwner] || { res: {}, deltas: {}, market: {}, buildPowerMax: 0 });
        Object.keys(game.res).forEach(k => {
            const el = document.getElementById(`res-${k}`);
            if (el) {
                if (k === 'food' || k === 'metal' || k === 'precious' || k === 'consumer' || k === 'energy' || k === 'oil') {
                    const market = snap.market || { supply: {}, demand: {} };
                    const sup = Math.max(0, Math.floor((market.supply || {})[k] || 0));
                    const dem = Math.max(0, Math.floor((market.demand || {})[k] || 0));
                    const surplus = sup - dem;
                    el.innerText = surplus;
                    el.className = surplus > 0 ? 'text-green-400 font-mono' : (surplus < 0 ? 'text-red-400 font-mono' : 'text-gray-300 font-mono');
                } else {
                    el.innerText = Math.floor(((snap.res || {})[k] || 0));
                }
            }
            const dEl = document.getElementById(`delta-${k}`);
            if (dEl) {
                if (k === 'food' || k === 'metal' || k === 'precious' || k === 'consumer' || k === 'energy' || k === 'oil' || k === 'science' || k === 'social_surplus' || k === 'civilization') {
                    dEl.innerText = "";
                } else {
                    const valBase = ((snap.deltas || {})[k] || 0);
                    const opCost = (k === 'money') ? Math.max(0, Math.floor(((snap.market || {}).opCost || 0))) : 0;
                    const mint = (k === 'money' && curOwner === 'Player') ? Math.max(0, Math.floor(game.mintingAmount || 0)) : 0;
                    const val = Math.round(valBase + mint - opCost);
                    if (val === 0) { dEl.innerText = ""; }
                    else {
                        dEl.innerText = `(${val > 0 ? '+' : ''}${val})`;
                        dEl.className = `res-delta ${val > 0 ? 'text-green-500' : 'text-red-500'}`;
                    }
                }
            }
        });
        const turnEl = document.getElementById('turn-count');
        if (turnEl) turnEl.innerText = game.turn;
        const techDisplay = document.getElementById('tech-available-points');
        if (techDisplay) techDisplay.innerText = Math.floor(((snap.res || {}).science || 0));
        const stabEl = document.getElementById('res-stability');
        if (stabEl && typeof Economy !== 'undefined' && typeof Economy.computeStability === 'function') {
            const st = Economy.computeStability(game);
            stabEl.innerText = `${Math.max(0, Math.floor(st.avg || 0))}%`;
        }
        const bp = document.getElementById('build-power');
        if (bp) {
            const reserved = (curOwner === 'Player' && typeof game.computeReservedBuildPower === 'function') ? game.computeReservedBuildPower() : 0;
            const max = Math.max(0, Math.floor((curOwner === 'Player') ? (game.buildPowerMax || 0) : (snap.buildPowerMax || 0)));
            bp.innerText = `${Math.max(0, Math.floor(reserved || 0))}/${max}`;
        }
        const dp = document.getElementById('diplomacy-power');
        if (dp) {
            const left = Math.max(0, Math.floor(game.diplomacyPowerLeft || 0));
            const max = Math.max(0, Math.floor(game.diplomacyPowerMax || 0));
            dp.innerText = `${left}/${max}`;
        }
            const mPanel = document.getElementById('market-panel');
            if (mPanel) {
                const market = snap.market || { supply: {}, demand: {}, prices: {}, opCost: 0, revenueByRes: {}, profitByRes: {}, taxedProfitByRes: {}, taxedProfitTotal: 0 };
                const op = document.getElementById('market-op');
                if (op) op.innerText = Math.max(0, Math.floor(market.opCost || 0));
                const taxTotalEl = document.getElementById('market-tax-total');
                if (taxTotalEl) taxTotalEl.innerText = Math.max(0, Math.floor(market.taxIncomeTotal || 0));
                const treasuryMoney = document.getElementById('treasury-money');
                if (treasuryMoney) treasuryMoney.innerText = Math.max(0, Math.floor(((snap.res || {}).money || 0)));
                const treasuryNet = document.getElementById('treasury-net');
                if (treasuryNet) {
                    const base = Math.floor(((snap.deltas || {}).money || 0));
                    const mint = (curOwner === 'Player') ? Math.max(0, Math.floor(game.mintingAmount || 0)) : 0;
                    const govCost = Math.max(0, Math.floor(market.opCost || 0));
                    const milCost = Math.max(0, Math.floor(market.militaryCost || 0));
                    const socCost = Math.max(0, Math.floor(market.socialSecurityCost || 0));
                    const net = Math.round(base + mint - govCost - milCost - socCost);
                    treasuryNet.innerText = net;
                    treasuryNet.className = `text-cyan-300 ${net >= 0 ? 'font-mono' : 'font-mono'}`;
                }
            const consEl = document.getElementById('treasury-income-consumption');
            if (consEl) consEl.innerText = Math.max(0, Math.floor(market.taxIncomeTotal || 0));
            const basicTaxEl = document.getElementById('treasury-income-basic-tax');
            if (basicTaxEl) {
                const prop = Math.max(0, Math.floor((market.surplusTaxes || {}).proportionTotal || 0));
                const head = Math.max(0, Math.floor((market.surplusTaxes || {}).headTotal || 0));
                basicTaxEl.innerText = prop + head;
            }
            const basicIncomeEl = document.getElementById('treasury-income-basic');
            if (basicIncomeEl) {
                const base = Math.max(0, Math.floor(((snap.deltas || {}).money || 0)));
                const cons = Math.max(0, Math.floor(market.taxIncomeTotal || 0));
                const prop = Math.max(0, Math.floor((market.surplusTaxes || {}).proportionTotal || 0));
                const head = Math.max(0, Math.floor((market.surplusTaxes || {}).headTotal || 0));
                const basic = Math.max(0, Math.floor(base - cons - prop - head));
                basicIncomeEl.innerText = basic;
                const incomeCard = basicIncomeEl.parentElement ? basicIncomeEl.parentElement.parentElement : null;
                if (incomeCard && !document.getElementById('treasury-income-minting')) {
                    const rMintInc = document.createElement('div');
                    rMintInc.className = "flex justify-between";
                    const lab = document.createElement('span');
                    lab.innerText = "铸币收入";
                    const val = document.createElement('span');
                    val.id = "treasury-income-minting";
                    val.className = "font-mono text-green-400";
                    val.innerText = String(Math.max(0, Math.floor((curOwner === 'Player') ? (game.mintingAmount || 0) : 0)));
                    rMintInc.appendChild(lab); rMintInc.appendChild(val);
                    incomeCard.appendChild(rMintInc);
                } else {
                    const mintIncEl = document.getElementById('treasury-income-minting');
                    if (mintIncEl) mintIncEl.innerText = String(Math.max(0, Math.floor((curOwner === 'Player') ? (game.mintingAmount || 0) : 0)));
                }
            }
            const expOp = document.getElementById('treasury-exp-op');
            if (expOp) {
                expOp.innerText = Math.max(0, Math.floor(market.opCost || 0));
                const row = expOp.parentElement;
                if (row && row.children && row.children[0]) row.children[0].innerText = "政府维护开支";
                const card = row ? row.parentElement : null;
                if (card && !document.getElementById('treasury-exp-mil')) {
                    const r = document.createElement('div');
                    r.className = "flex justify-between";
                    const lab = document.createElement('span');
                    lab.innerText = "军事力量开支";
                    const val = document.createElement('span');
                    val.id = "treasury-exp-mil";
                    val.className = "font-mono text-red-400";
                    val.innerText = String(Math.max(0, Math.floor(market.militaryCost || 0)));
                    r.appendChild(lab); r.appendChild(val);
                    card.appendChild(r);
                } else {
                    const milEl = document.getElementById('treasury-exp-mil');
                    if (milEl) milEl.innerText = String(Math.max(0, Math.floor(market.militaryCost || 0)));
                }
                const privEl = document.getElementById('treasury-exp-private');
                if (privEl) privEl.remove();
                if (card && !document.getElementById('treasury-exp-soc')) {
                    const r2 = document.createElement('div');
                    r2.className = "flex justify-between";
                    const lab2 = document.createElement('span');
                    lab2.innerText = "社会保障开支";
                    const val2 = document.createElement('span');
                    val2.id = "treasury-exp-soc";
                    val2.className = "font-mono text-red-400";
                    val2.innerText = String(Math.max(0, Math.floor(market.socialSecurityCost || 0)));
                    r2.appendChild(lab2); r2.appendChild(val2);
                    card.appendChild(r2);
                } else {
                    const socEl = document.getElementById('treasury-exp-soc');
                    if (socEl) socEl.innerText = String(Math.max(0, Math.floor(market.socialSecurityCost || 0)));
                }
                const inflRowEl = document.getElementById('treasury-inflation-pct');
                const inflVal = (() => {
                    const f = Math.min(12, Math.max(1, Number(game.inflationFactor || 1)));
                    const vPct = Math.max(0, (f - 1) * 100);
                    return Number(vPct.toFixed(1)).toFixed(1) + '%';
                })();
                if (!inflRowEl && card) {
                    const r3 = document.createElement('div');
                    r3.className = "flex justify-between";
                    const lab3 = document.createElement('span');
                    lab3.innerText = "通货膨胀";
                    const val3 = document.createElement('span');
                    val3.id = "treasury-inflation-pct";
                    val3.className = "font-mono text-yellow-300";
                    val3.innerText = inflVal;
                    r3.appendChild(lab3); r3.appendChild(val3);
                    card.appendChild(r3);
                } else if (inflRowEl) {
                    inflRowEl.innerText = inflVal;
                }
                const base = Math.max(0, Math.floor(((snap.deltas || {}).money || 0)));
                const cons = Math.max(0, Math.floor(market.taxIncomeTotal || 0));
                const prop = Math.max(0, Math.floor((market.surplusTaxes || {}).proportionTotal || 0));
                const head = Math.max(0, Math.floor((market.surplusTaxes || {}).headTotal || 0));
                const basicIncome = Math.max(0, Math.floor(base - cons - prop - head));
                const oldPanel = document.getElementById('minting-panel');
                if (oldPanel) oldPanel.remove();
                const tContent = document.getElementById('treasury-content');
                let clip = document.getElementById('minting-clip');
                if (tContent && !clip) {
                    clip = document.createElement('div');
                    clip.id = "minting-clip";
                    clip.className = "glass-card p-3 text-[10px] text-gray-300";
                    const row = document.createElement('div');
                    row.className = "flex items-center justify-between gap-2";
                    const label = document.createElement('span');
                    label.innerText = "铸币";
                    const controls = document.createElement('div');
                    controls.className = "flex items-center gap-2 flex-1";
                    const slider = document.createElement('input');
                    slider.type = "range"; slider.min = "0"; slider.max = String(basicIncome); slider.step = "1";
                    slider.value = String(Math.max(0, Math.floor((curOwner === 'Player') ? (game.mintingAmount || 0) : 0)));
                    slider.className = "flex-1";
                    const mintVal = document.createElement('span');
                    mintVal.id = "minting-value";
                    mintVal.className = "font-mono text-yellow-300";
                    mintVal.innerText = String(Math.max(0, Math.floor((curOwner === 'Player') ? (game.mintingAmount || 0) : 0)));
                    const impact = document.createElement('span');
                    impact.id = "inflation-impact";
                    impact.className = "font-mono text-cyan-300";
                    const pct = basicIncome > 0 ? (Math.max(0, Math.floor(game.mintingAmount || 0)) / basicIncome) : 0;
                    const delta = Math.max(-0.02, Math.min(0.10, -0.02 + 0.12 * Math.pow(pct, 2)));
                    const deltaPctStr = Number((delta * 100).toFixed(1)).toFixed(1);
                    impact.innerText = `${delta >= 0 ? '+' : ''}${deltaPctStr}%`;
                    slider.oninput = () => {
                        mintVal.innerText = slider.value;
                        const curPct = basicIncome > 0 ? (Math.max(0, Math.floor(parseInt(slider.value, 10) || 0)) / basicIncome) : 0;
                        const curDelta = Math.max(-0.02, Math.min(0.10, -0.02 + 0.12 * Math.pow(curPct, 2)));
                        const curDeltaPctStr = Number((curDelta * 100).toFixed(1)).toFixed(1);
                        impact.innerText = `${curDelta >= 0 ? '+' : ''}${curDeltaPctStr}%`;
                        const inflSpan = document.getElementById('treasury-inflation-pct');
                        if (inflSpan) {
                            const curF = Math.min(12, Math.max(1, (game.inflationFactor || 1) + curDelta));
                            const curPctVal = Math.max(0, (curF - 1) * 100);
                            const curStr = Number(curPctVal.toFixed(1)).toFixed(1) + '%';
                            inflSpan.innerText = curStr;
                        }
                        // 仅预览，不改动实际系数与市场
                    };
                    slider.onchange = () => {
                        const v = Math.max(0, Math.floor(parseInt(slider.value, 10) || 0));
                        if (curOwner === 'Player') {
                            game.mintingAmount = v;
                            const pct2 = basicIncome > 0 ? (v / basicIncome) : 0;
                            const d = Math.max(-0.02, Math.min(0.10, -0.02 + 0.12 * Math.pow(pct2, 2)));
                            game.inflationImpactPct = d;
                            const dStr = Number((d * 100).toFixed(1)).toFixed(1);
                            impact.innerText = `${d >= 0 ? '+' : ''}${dStr}%`;
                            game.updateDeltas(); game.updateResourceUI();
                        } else {
                            slider.value = "0";
                            mintVal.innerText = "0";
                            impact.innerText = "+0.0%";
                        }
                    };
                    controls.appendChild(slider); controls.appendChild(mintVal); controls.appendChild(impact);
                    row.appendChild(label); row.appendChild(controls);
                    clip.appendChild(row);
                    tContent.prepend(clip);
                } else if (clip) {
                    const slider = clip.querySelector('input[type="range"]');
                    const mintVal = document.getElementById('minting-value');
                    const impact = document.getElementById('inflation-impact');
                    if (slider) slider.max = String(basicIncome);
                    if (slider) slider.value = String(Math.max(0, Math.floor((curOwner === 'Player') ? (game.mintingAmount || 0) : 0)));
                    if (mintVal) mintVal.innerText = String(Math.max(0, Math.floor((curOwner === 'Player') ? (game.mintingAmount || 0) : 0)));
                    const pct3 = basicIncome > 0 ? (Math.max(0, Math.floor(game.mintingAmount || 0)) / basicIncome) : 0;
                    const d3Raw = Math.max(-0.02, Math.min(0.10, -0.02 + 0.12 * Math.pow(pct3, 2)));
                    const d3Str = Number((d3Raw * 100).toFixed(1)).toFixed(1);
                    if (impact) impact.innerText = `${d3Raw >= 0 ? '+' : ''}${d3Str}%`;
                }
            }
            const surplusTotalEl = document.getElementById('surplus-total');
            if (surplusTotalEl) surplusTotalEl.innerText = Math.max(0, Math.floor(((snap.res || {}).social_surplus || 0)));
            const surplusDeltaEl = document.getElementById('surplus-delta');
            if (surplusDeltaEl) surplusDeltaEl.innerText = Math.max(0, Math.floor(((snap.deltas || {}).social_surplus || 0)));
            const sc = document.getElementById('surplus-content');
            if (sc) {
                const oldRow = document.getElementById('surplus-agg-row');
                if (oldRow) oldRow.remove();
                const byClassDelta = (market.socialSurplusByClassDelta || {});
                const totals = (curOwner === 'Player') ? (game.socialSurplusByClassTotal || {}) : {};
                const row = document.createElement('div');
                row.id = 'surplus-agg-row';
                row.className = "flex items-start gap-2";
                const left = document.createElement('div');
                left.id = 'surplus-class-list';
                left.className = "glass-card p-2 text-[10px] text-gray-300 flex-1";
                const e = Math.max(0, Math.floor(byClassDelta.elite || 0));
                const x = Math.max(0, Math.floor(byClassDelta.expert || 0));
                const l = Math.max(0, Math.floor(byClassDelta.labor || 0));
                const s = Math.max(0, Math.floor(byClassDelta.subsistence || 0));
                const te = Math.max(0, Math.floor(totals.elite || 0));
                const tx = Math.max(0, Math.floor(totals.expert || 0));
                const tLabor = Math.max(0, Math.floor(totals.labor || 0));
                const ts = Math.max(0, Math.floor(totals.subsistence || 0));
                left.innerHTML = `
                    <div class="flex items-center justify-between"><span>精英</span><span class="font-mono text-emerald-300">${te}</span></div>
                    <div class="flex items-center justify-between"><span>专家</span><span class="font-mono text-cyan-300">${tx}</span></div>
                    <div class="flex items-center justify-between"><span>劳工</span><span class="font-mono text-blue-300">${tLabor}</span></div>
                    <div class="flex items-center justify-between"><span>自给农</span><span class="font-mono text-gray-300">${ts}</span></div>
                `;
                const right = document.createElement('div');
                right.id = 'surplus-class-pop';
                right.className = "glass-card p-2 text-[10px] text-gray-300 flex-1";
                const agg = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                Object.keys(game.cityDistricts || {}).forEach(dk => {
                    const dist = typeof game.getDistrictClassDistribution === 'function' ? game.getDistrictClassDistribution(dk) : null;
                    if (!dist) return;
                    agg.elite += Math.max(0, Math.floor(dist.elite || 0));
                    agg.expert += Math.max(0, Math.floor(dist.expert || 0));
                    agg.labor += Math.max(0, Math.floor(dist.labor || 0));
                    agg.subsistence += Math.max(0, Math.floor(dist.subsistence || 0));
                });
                right.innerHTML = `
                    <div class="flex items-center justify-end"><span class="font-mono text-emerald-300">${agg.elite}</span></div>
                    <div class="flex items-center justify-end"><span class="font-mono text-cyan-300">${agg.expert}</span></div>
                    <div class="flex items-center justify-end"><span class="font-mono text-blue-300">${agg.labor}</span></div>
                    <div class="flex items-center justify-end"><span class="font-mono text-gray-300">${agg.subsistence}</span></div>
                `;
                left.style.flex = '5';
                right.style.flex = '3';
                row.appendChild(left);
                row.appendChild(right);
                sc.prepend(row);
                const ctlOld = document.getElementById('surplus-tax-controls');
                if (ctlOld) ctlOld.remove();
                const taxes = game.market?.surplusTaxes || { proportionTotal: 0, headTotal: 0, proportionByClass: {}, headByClass: {}, rates: (game.surplusTaxRatePerClass || {}), headRates: (game.headTaxPerClass || {}) };
                const ctl = document.createElement('div');
                ctl.id = 'surplus-tax-controls';
                ctl.className = "glass-card p-3 text-[10px] text-gray-300";
                const classes = [
                    { k: 'elite', name: '精英', color: 'text-emerald-300' },
                    { k: 'expert', name: '专家', color: 'text-cyan-300' },
                    { k: 'labor', name: '劳工', color: 'text-blue-300' }
                ];
                const law = game.taxLaw || 'consumption_tax';
                const makeRow = (cls) => {
                    const ratePct = Math.round(Math.max(0, Math.min(100, ((game.surplusTaxRatePerClass || {})[cls.k] || 0) * 100)));
                    const headValRaw = Math.max(0, Number(((game.headTaxPerClass || {})[cls.k] || 0)));
                    const headVal = (Math.round(headValRaw * 1000) / 1000).toFixed(3);
                    const propTax = Math.max(0, Math.floor((taxes.proportionByClass || {})[cls.k] || 0));
                    const headTax = Math.max(0, Math.floor((taxes.headByClass || {})[cls.k] || 0));
                    const row = document.createElement('div');
                    row.className = "grid gap-1 items-center mb-1";
                    row.style.gridTemplateColumns = "12.5% 50% 37.5%";
                    const label = document.createElement('div');
                    label.className = `font-mono ${cls.color}`;
                    label.innerText = cls.name;
                    const controls = document.createElement('div');
                    controls.className = "flex items-center gap-1";
                    const head = document.createElement('input');
                    head.type = "number"; head.step = "0.001"; head.className = "w-12 bg-white/5 border border-white/10 rounded px-1"; head.value = String(headVal);
                    const rate = document.createElement('input');
                    rate.type = "range"; rate.min = "0"; rate.max = "100"; rate.step = "1"; rate.value = String(ratePct);
                    rate.className = "h-2 flex-1";
                    rate.style.width = "100%";
                    const rateShow = document.createElement('span');
                    rateShow.className = "font-mono text-cyan-400";
                    rateShow.innerText = `${ratePct}%`;
                    const numbers = document.createElement('div');
                    numbers.className = "font-mono text-green-400";
                    numbers.innerText = `%: $${propTax} | p: $${headTax}`;
                    rate.oninput = () => { rateShow.innerText = `${rate.value}%`; };
                    rate.onchange = () => {
                        let v = Math.max(0, Math.min(1, (parseInt(rate.value, 10) || 0) / 100));
                        if (law === 'consumption_tax' || law === 'head_tax') v = 0;
                        if (law === 'proportional_tax') {
                            if (!game.surplusTaxRatePerClass) game.surplusTaxRatePerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                            game.surplusTaxRatePerClass = { elite: v, expert: v, labor: v, subsistence: 0 };
                        } else {
                            if (!game.surplusTaxRatePerClass) game.surplusTaxRatePerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                            game.surplusTaxRatePerClass[cls.k] = v;
                        }
                        game.updateDeltas(); game.updateResourceUI();
                    };
                    head.onchange = () => {
                        let v = Math.max(0, parseFloat(head.value) || 0);
                        if (law === 'consumption_tax' || law === 'proportional_tax') v = 0;
                        if (law === 'head_tax') {
                            if (!game.headTaxPerClass) game.headTaxPerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                            game.headTaxPerClass = { elite: v, expert: v, labor: v, subsistence: 0 };
                        } else {
                            if (!game.headTaxPerClass) game.headTaxPerClass = { elite: 0, expert: 0, labor: 0, subsistence: 0 };
                            game.headTaxPerClass[cls.k] = Math.round(v * 1000) / 1000;
                        }
                        game.updateDeltas(); game.updateResourceUI();
                    };
                    if (law === 'consumption_tax') { rate.value = "0"; rate.disabled = true; head.value = "0.000"; head.disabled = true; }
                    if (law === 'head_tax') { rate.value = "0"; rate.disabled = true; }
                    if (law === 'proportional_tax') { head.value = "0.000"; head.disabled = true; }
                    controls.appendChild(head); controls.appendChild(rate); controls.appendChild(rateShow);
                    row.appendChild(label); row.appendChild(controls); row.appendChild(numbers);
                    return row;
                };
                classes.forEach(c => ctl.appendChild(makeRow(c)));
                const totalRow = document.createElement('div');
                totalRow.className = "grid grid-cols-3 gap-2 items-center mt-2 pt-2 border-t border-white/10";
                const totalLabel = document.createElement('div'); totalLabel.innerText = "总计税收";
                const blank = document.createElement('div');
                const totalNum = document.createElement('div');
                totalNum.className = "font-mono text-green-400";
                totalNum.innerText = `$${Math.max(0, (taxes.proportionTotal || 0)) + Math.max(0, (taxes.headTotal || 0))}`;
                totalRow.appendChild(totalLabel); totalRow.appendChild(blank); totalRow.appendChild(totalNum);
                ctl.appendChild(totalRow);
                sc.appendChild(ctl);
                const existedDelta = document.getElementById('class-surplus-delta-box');
                if (existedDelta) existedDelta.remove();
                const deltaBox = document.createElement('div');
                deltaBox.id = 'class-surplus-delta-box';
                deltaBox.className = "glass-card p-3 text-[10px] text-gray-300 mt-2";
                const title = document.createElement('div');
                title.className = "text-[10px] font-bold text-gray-400 uppercase mb-2";
                title.innerText = "社会盈余（国有建筑税后收入/私有建筑收入/私有建筑支出/总计）";
                deltaBox.appendChild(title);
                const mkRow = (k, name, colorCls) => {
                    const stateDelta = Math.max(0, Math.floor((byClassDelta || {})[k] || 0));
                    const privateDelta = Math.max(0, Math.floor((game.privateSurplusDeltaByClass || {})[k] || 0));
                    const rate = Math.max(0, Math.min(1, ((taxes.rates || {})[k] || 0)));
                    const stateAfter = Math.max(0, Math.floor(stateDelta * (1 - rate)));
                    const privateAfter = Math.max(0, Math.floor(privateDelta * (1 - rate)));
                    const privCost = Math.max(0, Math.floor(((game.market || {}).privateMaintByClassCost || {})[k] || 0));
                    const totalAfter = Math.max(0, Math.floor(stateAfter + privateAfter - privCost));
                    const row = document.createElement('div');
                    row.className = "flex items-center justify-between mb-1";
                    const label = document.createElement('span');
                    label.className = "text-gray-300";
                    label.innerText = name;
                    const nums = document.createElement('span');
                    nums.className = `font-mono ${colorCls}`;
                    nums.innerText = `${stateAfter} | ${privateAfter} | ${privCost} | ${totalAfter}`;
                    row.appendChild(label); row.appendChild(nums);
                    return row;
                };
                deltaBox.appendChild(mkRow('elite', '精英', 'text-emerald-300'));
                deltaBox.appendChild(mkRow('expert', '专家', 'text-cyan-300'));
                deltaBox.appendChild(mkRow('labor', '劳工', 'text-blue-300'));
                sc.appendChild(deltaBox);
            }
            const list = document.getElementById('market-list');
            const empty = document.getElementById('market-empty');
            if (list) {
                list.innerHTML = '';
                const keys = ['food','metal','precious','consumer','energy','oil'];
                let hasPressure = false;
                const desc = document.createElement('div');
                desc.className = "text-[10px] text-gray-400 mb-2";
                desc.innerText = "说明：左至右依次为 价格、需求/供给、税收/税前利润";
                list.appendChild(desc);
                keys.forEach(k => {
                    const sup = Math.max(0, Math.floor((market.supply || {})[k] || 0));
                    const dem = Math.max(0, Math.floor((market.demand || {})[k] || 0));
                    const price = Math.round(((market.prices || {})[k] || 0) * 100) / 100;
                    const revenue = Math.max(0, Math.floor((market.revenueByRes || {})[k] || 0));
                    const profit = Math.max(0, Math.floor((market.profitByRes || {})[k] || 0));
                    const taxed = Math.max(0, Math.floor((market.taxedProfitByRes || {})[k] || 0));
                    const taxIncome = Math.max(0, profit - taxed);
                    if (dem > 0 || sup > 0) hasPressure = true;
                    const row = document.createElement('div');
                    row.className = "glass-card p-3 text-[10px]";
                    const wrap = document.createElement('div');
                    wrap.className = "flex items-center justify-between gap-3";
                    const leftWrap = document.createElement('div');
                    leftWrap.className = "flex items-center gap-3";
                    const iconBox = document.createElement('div');
                    iconBox.className = "w-8 h-8 flex items-center justify-center text-lg leading-none";
                    iconBox.innerHTML = (typeof YIELD_ICONS === 'object' && YIELD_ICONS[k]) ? YIELD_ICONS[k] : '';
                    const sdClip = document.createElement('div');
                    sdClip.className = "glass-card w-24 h-8 px-3 rounded-lg flex items-center justify-center gap-2";
                    const demEl = document.createElement('span');
                    demEl.className = "text-red-400 font-mono";
                    demEl.innerText = dem;
                    const supEl = document.createElement('span');
                    supEl.className = "text-green-400 font-mono";
                    supEl.innerText = sup;
                    const sep = document.createElement('span');
                    sep.className = "text-gray-500";
                    sep.innerText = "/";
                    sdClip.appendChild(demEl); sdClip.appendChild(sep); sdClip.appendChild(supEl);
                    const priceClip = document.createElement('div');
                    priceClip.className = "glass-card w-24 h-8 px-3 rounded-lg flex items-center justify-center";
                    priceClip.innerHTML = `<span class="text-yellow-400 font-mono">$${price}</span>`;
                    const taxClip = document.createElement('div');
                    taxClip.className = "glass-card w-24 h-8 px-3 rounded-lg flex items-center justify-between";
                    const taxEl = document.createElement('span');
                    taxEl.className = "text-green-400 font-mono";
                    taxEl.innerText = `$${taxIncome}`;
                    const taxedEl = document.createElement('span');
                    taxedEl.className = "text-green-400 font-mono";
                    taxedEl.innerText = `$${profit}`;
                    taxClip.appendChild(taxEl); taxClip.appendChild(taxedEl);
                    wrap.appendChild(iconBox);
                    wrap.appendChild(priceClip);
                    wrap.appendChild(sdClip);
                    wrap.appendChild(taxClip);
                    row.appendChild(wrap);
                    row.onclick = () => {
                        const existed = document.getElementById(`market-tax-${k}`);
                        if (existed) { existed.remove(); return; }
                        const curPct = Math.round(Math.max(0, Math.min(100, ((game.taxRates || {})[k] || 0) * 100)));
                        const ctl = document.createElement('div');
                        ctl.id = `market-tax-${k}`;
                        ctl.className = "glass-card p-3 mt-2 rounded-lg";
                        const inner = document.createElement('div');
                        inner.className = "flex items-center gap-3";
                        const label = document.createElement('span');
                        label.className = "text-[10px] text-gray-300";
                        const law2 = game.taxLaw || 'consumption_tax';
                        const capPct = (law2 === 'progressive_tax') ? 50 : (law2 === 'consumption_tax' ? 20 : 0);
                        if (capPct === 0) {
                            label.innerText = "当前税制不允许市场税收";
                            inner.appendChild(label);
                            ctl.appendChild(inner);
                            ctl.onclick = (e) => e.stopPropagation();
                            row.after(ctl);
                            return;
                        }
                        label.innerText = `税率（上限${capPct}%）`;
                        const slider = document.createElement('input');
                        slider.type = "range"; slider.min = "0"; slider.max = String(capPct); slider.step = "1";
                        slider.value = String(Math.min(curPct, capPct));
                        slider.className = "flex-1";
                        const pct = document.createElement('span');
                        pct.className = "text-[10px] font-mono text-cyan-400";
                        pct.innerText = `${Math.min(curPct, capPct)}%`;
                        slider.oninput = () => { pct.innerText = `${slider.value}%`; };
                        slider.onchange = () => {
                            const v = Math.max(0, Math.min(1, (parseInt(slider.value, 10) || 0) / 100));
                            if (!game.taxRates) game.taxRates = { food:0, metal:0, precious:0, consumer:0, energy:0, oil:0 };
                            game.taxRates[k] = v;
                            game.updateDeltas();
                            game.updateResourceUI();
                        };
                        ctl.onclick = (e) => e.stopPropagation();
                        inner.appendChild(label); inner.appendChild(slider); inner.appendChild(pct);
                        ctl.appendChild(inner);
                        row.after(ctl);
                    };
                    list.appendChild(row);
                });
                if (empty) empty.classList.toggle('hidden', hasPressure || ((market.supply && market.demand) && (Object.values(market.supply).some(v => v>0) || Object.values(market.demand).some(v => v>0))));
            }
        }
    }
};
