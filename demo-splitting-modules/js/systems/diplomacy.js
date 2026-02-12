const Diplomacy = {
    openPanelForSelected(game) {
        const t = game.selectedTile;
        if (!t || t.owner === game.currentOwnerKey || t.owner === 'Neutral') return;
        this.openPanel(game, t.owner);
    },
    isAtWarWith(game, ownerKey) {
        if (!ownerKey) return false;
        return !!((game.atWarWith || {})[ownerKey]);
    },
    openPanel(game, ownerKey) {
        game.dipTargetOwner = ownerKey;
        const panel = document.getElementById('diplomacy-panel');
        if (!panel) return;
        const nameEl = document.getElementById('dip-target-name');
        if (nameEl) nameEl.innerText = ownerKey === 'Enemy' ? '敌国' : ownerKey;
        const btnWar = document.getElementById('dip-declare-war');
        if (btnWar) {
            btnWar.onclick = () => { this.openDeclarePicker(game); };
        }
        const btnJustify = document.getElementById('dip-justify');
        if (btnJustify) {
            btnJustify.onclick = () => { this.openJustifyPicker(game); };
        }
        panel.classList.remove('hidden');
        this.renderStatus(game);
    },
    closePanel() {
        const panel = document.getElementById('diplomacy-panel');
        if (panel) panel.classList.add('hidden');
    },
    declareWar(game, ownerKey, goalKey) {
        if (!ownerKey) return;
        const pre = Economy.computeStability(game).avg;
        if (typeof game.atWarWith !== 'object' || !game.atWarWith) game.atWarWith = {};
        game.atWarWith[ownerKey] = true;
        this.declareWarBetween(game, game.currentOwnerKey, ownerKey, game.currentOwnerKey, goalKey || 'none');
        if (typeof game.warStabilityBaseline !== 'number') game.warStabilityBaseline = pre;
        if (!game.warGoalByTarget) game.warGoalByTarget = {};
        game.warGoalByTarget[ownerKey] = goalKey || 'none';
        game.updateDeltas();
        game.updateResourceUI();
        game.updateTilePanel();
    },
    endWar(game, ownerKey) {
        if (!ownerKey || !game.atWarWith) return;
        game.atWarWith[ownerKey] = false;
        this.endWarBetween(game, game.currentOwnerKey, ownerKey);
        game.updateDeltas();
        game.updateResourceUI();
        game.updateTilePanel();
    },
    isAtWar(game) {
        return Object.values(game.atWarWith || {}).some(v => !!v);
    },
    startJustification(game, ownerKey, type) {
        if (!ownerKey || !type) return false;
        if (type === 'ideology' && !this.isRegimeColorDifferent(game, ownerKey)) return false;
        if (type === 'hegemony' && !this.canHegemonyJustify(game, ownerKey)) return false;
        if (!game.justifications) game.justifications = {};
        const key = `${ownerKey}:${type}`;
        if (game.justifications[key] && game.justifications[key].turnsLeft > 0) return false;
        const cost = 1;
        if (Math.max(0, Math.floor(game.diplomacyPowerLeft || 0)) < cost) return false;
        game.diplomacyPowerLeft = Math.max(0, Math.floor(game.diplomacyPowerLeft || 0) - cost);
        let baseTurns = 30;
        if (type === 'ideology') baseTurns = 10;
        if (type === 'hegemony') baseTurns = 20;
        game.justifications[key] = { target: ownerKey, type, turnsLeft: baseTurns };
        game.updateResourceUI();
        return true;
    },
    cancelJustification(game, ownerKey, type) {
        if (!ownerKey || !type) return false;
        const key = `${ownerKey}:${type}`;
        if (!game.justifications || !game.justifications[key]) return false;
        delete game.justifications[key];
        game.updateResourceUI();
        return true;
    },
    processTurn(game) {
        if (game.justifications) {
            Object.keys(game.justifications).forEach(k => {
                const j = game.justifications[k];
                if (!j) return;
                if (j.turnsLeft > 0) j.turnsLeft = Math.max(0, j.turnsLeft - 1);
            });
        }
        this.processRelationActions(game);
        const panel = document.getElementById('diplomacy-panel');
        if (panel && !panel.classList.contains('hidden')) {
            this.renderStatus(game);
        }
    },
    isJustified(game, ownerKey, type) {
        const key = `${ownerKey}:${type}`;
        const j = (game.justifications || {})[key];
        return !!j && Math.max(0, Math.floor(j.turnsLeft || 0)) === 0;
    },
    renderStatus(game) {
        const panel = document.getElementById('diplomacy-panel');
        if (!panel) return;
        let status = document.getElementById('dip-status');
        if (!status) {
            status = document.createElement('div');
            status.id = 'dip-status';
            status.className = "mt-3 glass-card p-3 text-[10px] text-gray-300";
            const btnWar = document.getElementById('dip-declare-war');
            const wrap = btnWar ? btnWar.parentElement : null;
            if (wrap && wrap.parentElement === panel) panel.insertBefore(status, wrap);
            else panel.appendChild(status);
        } else {
            const btnWar = document.getElementById('dip-declare-war');
            const wrap = btnWar ? btnWar.parentElement : null;
            if (wrap && wrap.parentElement === panel) {
                if (status.nextSibling !== wrap) panel.insertBefore(status, wrap);
            }
        }
        status.innerHTML = "";
        const ownerKey = game.dipTargetOwner;
        const j1 = (game.justifications || {})[`${ownerKey}:conquest`];
        const j2 = (game.justifications || {})[`${ownerKey}:ideology`];
        const j3 = (game.justifications || {})[`${ownerKey}:hegemony`];
        const msgs = [];
        if (j1) {
            const l = Math.max(0, Math.floor(j1.turnsLeft || 0));
            msgs.push(l > 0 ? `征服 正当化中：剩余${l}回合` : "征服 已正当化");
        }
        if (j2) {
            const l = Math.max(0, Math.floor(j2.turnsLeft || 0));
            msgs.push(l > 0 ? `意识形态不同 正当化中：剩余${l}回合` : "意识形态不同 已正当化");
        }
        if (j3) {
            const l = Math.max(0, Math.floor(j3.turnsLeft || 0));
            msgs.push(l > 0 ? `展示霸权 正当化中：剩余${l}回合` : "展示霸权 已正当化");
        }
        const justifyRow = document.createElement('div');
        justifyRow.className = "text-[10px]";
        justifyRow.innerText = msgs.length ? msgs.join('；') : "未进行正当化";
        status.appendChild(justifyRow);
        const relMeToThem = this.getRelation(game, game.currentOwnerKey, ownerKey);
        const relThemToMe = this.getRelation(game, ownerKey, game.currentOwnerKey);
        const relBox = document.createElement('div');
        relBox.className = "mt-2 p-2 rounded bg-white/5 text-[10px] text-gray-300";
        relBox.innerText = `关系：我们对他们 ${relMeToThem}；他们对我们 ${relThemToMe}`;
        status.appendChild(relBox);
        let actions = document.getElementById('dip-actions');
        const anchorBtn = document.getElementById('dip-justify');
        const anchorParent = anchorBtn ? anchorBtn.parentElement : null;
        if (actions) actions.remove();
        actions = document.createElement('div');
        actions.id = 'dip-actions';
        actions.className = "mt-3 space-y-2";
        // Relation actions (each on its own row)
        const act = (game.relationActions || {})[ownerKey];
        if (act && act.type) {
            const rowCancel = document.createElement('div');
            const btnCancel = document.createElement('button');
            btnCancel.id = "dip-rel-cancel";
            btnCancel.className = "w-full px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold";
            btnCancel.innerText = "取消行动";
            btnCancel.onclick = () => { this.cancelRelationAction(game, ownerKey); this.renderStatus(game); };
            rowCancel.appendChild(btnCancel);
            actions.appendChild(rowCancel);
        } else {
            const canStart = Math.max(0, Math.floor(game.diplomacyPowerLeft || 0)) >= 1;
            const rowImprove = document.createElement('div');
            const btnImprove = document.createElement('button');
            btnImprove.id = "dip-rel-improve";
            btnImprove.className = "w-full px-3 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] font-bold disabled:opacity-40";
            btnImprove.innerText = "改善关系（占用1外交能力）";
            btnImprove.disabled = !canStart;
            btnImprove.onclick = () => { if (this.startRelationAction(game, ownerKey, 'improve')) this.renderStatus(game); };
            rowImprove.appendChild(btnImprove);
            actions.appendChild(rowImprove);
            const rowDamage = document.createElement('div');
            const btnDamage = document.createElement('button');
            btnDamage.id = "dip-rel-damage";
            btnDamage.className = "w-full px-3 py-2 rounded bg-red-700 hover:bg-red-600 text-white text-[10px] font-bold disabled:opacity-40";
            btnDamage.innerText = "损害关系（占用1外交能力）";
            btnDamage.disabled = !canStart;
            btnDamage.onclick = () => { if (this.startRelationAction(game, ownerKey, 'damage')) this.renderStatus(game); };
            rowDamage.appendChild(btnDamage);
            actions.appendChild(rowDamage);
        }
        // Military access request (Player -> target) and grant (target -> Player)
        const hasGain = this.hasMilitaryAccess(game, game.currentOwnerKey, ownerKey);
        const hasGive = this.hasMilitaryAccess(game, ownerKey, game.currentOwnerKey);
        const rowRequest = document.createElement('div');
        const btnGain = document.createElement('button');
        btnGain.id = "dip-request-mil-access";
        btnGain.className = "w-full px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold";
        btnGain.innerText = hasGain ? "取消获得的军事通行权" : "要求对方提供军事通行权";
        btnGain.onclick = () => { if (hasGain) { this.revokeMilitaryAccess(game, game.currentOwnerKey, ownerKey, game.currentOwnerKey); } else { this.grantMilitaryAccess(game, game.currentOwnerKey, ownerKey); } this.renderStatus(game); };
        rowRequest.appendChild(btnGain);
        actions.appendChild(rowRequest);
        const rowGrant = document.createElement('div');
        const btnGive = document.createElement('button');
        btnGive.id = "dip-grant-mil-access";
        btnGive.className = "w-full px-3 py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-bold";
        btnGive.innerText = hasGive ? "撕毁我方提供的军事通行权" : "给予对方军事通行权";
        btnGive.onclick = () => { if (hasGive) { this.revokeMilitaryAccess(game, ownerKey, game.currentOwnerKey, game.currentOwnerKey); } else { this.grantMilitaryAccess(game, ownerKey, game.currentOwnerKey); } this.renderStatus(game); };
        rowGrant.appendChild(btnGive);
        actions.appendChild(rowGrant);
        // Defense pact
        const hasPact = !!((game.defensePacts || {})[ownerKey]);
        const canStartPact = Math.max(0, Math.floor(game.diplomacyPowerLeft || 0)) >= 1;
        const rowPact = document.createElement('div');
        const btnPact = document.createElement('button');
        btnPact.id = "dip-defense-pact";
        btnPact.className = "w-full px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-40";
        btnPact.innerText = hasPact ? "取消共同防御条约" : "缔结共同防御条约（占用1外交能力）";
        btnPact.disabled = !hasPact && !canStartPact;
        btnPact.onclick = () => { if (hasPact) { this.cancelDefensePact(game, ownerKey); } else { this.startDefensePact(game, ownerKey); } this.renderStatus(game); };
        rowPact.appendChild(btnPact);
        actions.appendChild(rowPact);
        if (anchorParent && anchorBtn) {
            anchorParent.insertBefore(actions, anchorBtn.nextSibling);
        } else {
            panel.appendChild(actions);
        }
    },
    getWarGoalOptions(game, ownerKey) {
        const opts = [{ key: 'none', label: '无战争目标', enabled: true }];
        const ok1 = this.isJustified(game, ownerKey, 'conquest');
        const ok2 = this.isJustified(game, ownerKey, 'ideology');
        const ok3 = this.isJustified(game, ownerKey, 'hegemony');
        opts.push({ key: 'conquest', label: '征服', enabled: ok1 });
        opts.push({ key: 'ideology', label: '意识形态不同', enabled: ok2 });
        opts.push({ key: 'hegemony', label: '展示霸权', enabled: ok3 });
        return opts;
    },
    canHegemonyJustify(game, ownerKey) {
        const v = this.getRelation(game, ownerKey, game.currentOwnerKey);
        return Math.floor(v || 0) <= -30;
    },
    isRegimeColorDifferent(game, ownerKey) {
        const p = (typeof UIPolitics !== 'undefined' && UIPolitics.getRegimeColor) ? UIPolitics.getRegimeColor(game) : null;
        const t = (OWNER_COLORS && OWNER_COLORS[ownerKey]) ? OWNER_COLORS[ownerKey] : null;
        if (!p || !t) return false;
        return p !== t;
    },
    clampRelation(v) {
        return Math.max(-100, Math.min(100, Math.floor(v)));
    },
    getRelation(game, fromOwner, toOwner) {
        const rels = game.relations || {};
        const row = rels[fromOwner] || {};
        const v = row[toOwner];
        return typeof v === 'number' ? v : 0;
    },
    setRelation(game, fromOwner, toOwner, value) {
        if (!fromOwner || !toOwner) return;
        if (!game.relations) game.relations = {};
        if (!game.relations[fromOwner]) game.relations[fromOwner] = {};
        game.relations[fromOwner][toOwner] = this.clampRelation(value);
    },
    initRelations(game) {
        const owners = new Set((game.grid || []).map(t => t.owner).filter(o => o && o !== 'Neutral'));
        const list = Array.from(owners);
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i], b = list[j];
                const same = !this.isRegimeColorDifferent(game, b);
                const base = same ? 10 : -10;
                if (typeof this.getRelation(game, a, b) !== 'number' || this.getRelation(game, a, b) === 0) {
                    this.setRelation(game, a, b, base);
                }
                if (typeof this.getRelation(game, b, a) !== 'number' || this.getRelation(game, b, a) === 0) {
                    this.setRelation(game, b, a, base);
                }
            }
        }
    },
    startRelationAction(game, ownerKey, type) {
        if (!ownerKey || (type !== 'improve' && type !== 'damage')) return false;
        if (!game.relationActions) game.relationActions = {};
        if (game.relationActions[ownerKey]) return false;
        const cost = 1;
        const left = Math.max(0, Math.floor(game.diplomacyPowerLeft || 0));
        if (left < cost) return false;
        game.diplomacyPowerLeft = Math.max(0, left - cost);
        game.relationActions[ownerKey] = { type };
        game.updateResourceUI();
        return true;
    },
    cancelRelationAction(game, ownerKey) {
        if (!ownerKey) return false;
        if (!game.relationActions || !game.relationActions[ownerKey]) return false;
        delete game.relationActions[ownerKey];
        const max = Math.max(0, Math.floor(game.diplomacyPowerMax || 0));
        const cur = Math.max(0, Math.floor(game.diplomacyPowerLeft || 0));
        game.diplomacyPowerLeft = Math.min(max, cur + 1);
        game.updateResourceUI();
        return true;
    },
    processRelationActions(game) {
        const acts = game.relationActions || {};
        Object.keys(acts).forEach(ownerKey => {
            const a = acts[ownerKey];
            if (!a || !a.type) return;
            const delta = a.type === 'improve' ? 2 : -2;
            const cur = this.getRelation(game, ownerKey, game.currentOwnerKey);
            this.setRelation(game, ownerKey, game.currentOwnerKey, cur + delta);
        });
    },
    openJustifyPicker(game) {
        const panel = document.getElementById('diplomacy-panel');
        if (!panel) return;
        let picker = document.getElementById('dip-justify-picker');
        if (picker) picker.remove();
        picker = document.createElement('div');
        picker.id = 'dip-justify-picker';
        picker.className = "mt-3 glass-card p-3";
        const list = document.createElement('div');
        list.className = "space-y-2";
        const ownerKey = game.dipTargetOwner;
        const canIdeo = this.isRegimeColorDifferent(game, ownerKey);
        const canHeg = this.canHegemonyJustify(game, ownerKey);
        const types = [
            { key: 'conquest', label: '征服', enabled: true },
            { key: 'ideology', label: '意识形态不同', enabled: canIdeo },
            { key: 'hegemony', label: '展示霸权', enabled: canHeg }
        ];
        let selected = 'conquest';
        types.forEach(o => {
            const row = document.createElement('label');
            row.className = `flex items-center gap-2 text-[10px] ${o.enabled ? 'text-gray-300' : 'text-gray-500'}`;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'dip-justify';
            radio.value = o.key;
            radio.disabled = !o.enabled;
            radio.checked = o.key === selected;
            radio.onchange = () => { selected = o.key; };
            const span = document.createElement('span');
            span.innerText = o.label;
            row.appendChild(radio);
            row.appendChild(span);
            list.appendChild(row);
        });
        picker.appendChild(list);
        const activeWrap = document.createElement('div');
        activeWrap.className = "mt-2 space-y-2";
        const active = ['conquest','ideology','hegemony'].map(t => {
            const j = (game.justifications || {})[`${ownerKey}:${t}`];
            return j && j.turnsLeft > 0 ? { type: t, left: Math.max(0, Math.floor(j.turnsLeft || 0)) } : null;
        }).filter(x => x);
        if (active.length) {
            const title = document.createElement('div');
            title.className = "text-[10px] text-gray-400";
            title.innerText = "进行中的正当化";
            activeWrap.appendChild(title);
            active.forEach(it => {
                const row = document.createElement('div');
                row.className = "flex items-center justify-between text-[10px]";
                const label = document.createElement('span');
                label.className = "text-gray-300";
                label.innerText = `${it.type === 'conquest' ? '征服' : (it.type === 'ideology' ? '意识形态不同' : '展示霸权')}：剩余${it.left}回合`;
                const btn = document.createElement('button');
                btn.className = "px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300";
                btn.innerText = "取消正当化";
                btn.onclick = () => {
                    this.cancelJustification(game, ownerKey, it.type);
                    this.renderStatus(game);
                    if (row && row.parentNode) row.parentNode.removeChild(row);
                };
                row.appendChild(label);
                row.appendChild(btn);
                activeWrap.appendChild(row);
            });
        }
        picker.appendChild(activeWrap);
        const controls = document.createElement('div');
        controls.className = "mt-2 flex items-center gap-2";
        const confirm = document.createElement('button');
        confirm.className = "px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold";
        confirm.innerText = "开始正当化";
        confirm.onclick = () => { this.startJustification(game, ownerKey, selected); this.renderStatus(game); const p = document.getElementById('dip-justify-picker'); if (p) p.remove(); };
        const cancel = document.createElement('button');
        cancel.className = "px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold";
        cancel.innerText = "取消";
        cancel.onclick = () => { const p = document.getElementById('dip-justify-picker'); if (p) p.remove(); };
        controls.appendChild(confirm);
        controls.appendChild(cancel);
        picker.appendChild(controls);
        panel.appendChild(picker);
    },
    hasMilitaryAccess(game, fromOwner, toOwner) {
        const map = game.militaryAccess || {};
        return !!map[`${fromOwner}:${toOwner}`];
    },
    grantMilitaryAccess(game, fromOwner, toOwner) {
        if (!fromOwner || !toOwner || fromOwner === toOwner) return false;
        if (!game.militaryAccess) game.militaryAccess = {};
        game.militaryAccess[`${fromOwner}:${toOwner}`] = true;
        return true;
    },
    revokeMilitaryAccess(game, fromOwner, toOwner, initiatedBy) {
        if (!fromOwner || !toOwner) return false;
        if (!game.militaryAccess || !game.militaryAccess[`${fromOwner}:${toOwner}`]) return false;
        delete game.militaryAccess[`${fromOwner}:${toOwner}`];
        const units = (game.units || []).filter(u => u.owner === fromOwner).filter(u => {
            const t = game.grid.find(tt => tt.q === u.q && tt.r === u.r);
            return t && t.owner === toOwner;
        });
        units.forEach(u => {
            const base = Economy.computeUnitBaseCost(u);
            const ratio = Units.getHpRatio(u);
            const refund = {};
            Object.entries(base).forEach(([k, v]) => {
                const add = Math.ceil((v || 0) * ratio);
                if (add > 0) refund[k] = add;
            });
            Object.entries(refund).forEach(([k, v]) => { game.res[k] = Math.max(0, Math.floor((game.res[k] || 0) + v)); });
            Units.removeById(game, u.id);
        });
        game.updateResourceUI();
        return true;
    },
    startDefensePact(game, ownerKey) {
        if (!ownerKey) return false;
        const cost = 1;
        if (Math.max(0, Math.floor(game.diplomacyPowerLeft || 0)) < cost) return false;
        if (!game.defensePacts) game.defensePacts = {};
        if (!game.defensePactsBetween) game.defensePactsBetween = {};
        if (game.defensePacts[ownerKey]) return false;
        game.diplomacyPowerLeft = Math.max(0, Math.floor(game.diplomacyPowerLeft || 0) - cost);
        game.defensePacts[ownerKey] = true;
        game.defensePactsBetween[this.pairKey(game.currentOwnerKey, ownerKey)] = true;
        this.grantMilitaryAccess(game, game.currentOwnerKey, ownerKey);
        this.grantMilitaryAccess(game, ownerKey, game.currentOwnerKey);
        game.updateResourceUI();
        return true;
    },
    cancelDefensePact(game, ownerKey) {
        if (!ownerKey) return false;
        if (!game.defensePacts || !game.defensePacts[ownerKey]) return false;
        delete game.defensePacts[ownerKey];
        if (game.defensePactsBetween) delete game.defensePactsBetween[this.pairKey(game.currentOwnerKey, ownerKey)];
        this.revokeMilitaryAccess(game, game.currentOwnerKey, ownerKey, game.currentOwnerKey);
        this.revokeMilitaryAccess(game, ownerKey, game.currentOwnerKey, game.currentOwnerKey);
        const max = Math.max(0, Math.floor(game.diplomacyPowerMax || 0));
        const cur = Math.max(0, Math.floor(game.diplomacyPowerLeft || 0));
        game.diplomacyPowerLeft = Math.min(max, cur + 1);
        game.updateResourceUI();
        return true;
    },
    onWarDeclaredAgainst(game, targetOwnerKey, aggressorKey) {
        if (!targetOwnerKey || !aggressorKey) return;
        const pacts = game.defensePacts || {};
        if (pacts[targetOwnerKey]) {
            this.declareWar(game, aggressorKey, 'none');
        }
        const pairs = game.defensePactsBetween || {};
        Object.keys(pairs).forEach(k => {
            const [a, b] = k.split('|');
            if (a === targetOwnerKey && b !== aggressorKey) {
                if (!this.isAtWarBetween(game, b, aggressorKey)) this.declareWarBetween(game, b, aggressorKey, b, 'none');
            } else if (b === targetOwnerKey && a !== aggressorKey) {
                if (!this.isAtWarBetween(game, a, aggressorKey)) this.declareWarBetween(game, a, aggressorKey, a, 'none');
            }
        });
    },
    pairKey(a, b) {
        if (!a || !b) return '';
        return a < b ? `${a}|${b}` : `${b}|${a}`;
    },
    isAtWarBetween(game, a, b) {
        if (!a || !b) return false;
        const key = this.pairKey(a, b);
        return !!((game.warsBetween || {})[key]);
    },
    declareWarBetween(game, a, b, aggressor, goal) {
        if (!a || !b || a === b) return false;
        if (!game.warsBetween) game.warsBetween = {};
        const key = this.pairKey(a, b);
        if (game.warsBetween[key]) return false;
        game.warsBetween[key] = { a, b, aggressor: aggressor || null, goal: goal || 'none', startTurn: Math.max(1, Math.floor(game.turn || 1)) };
        return true;
    },
    endWarBetween(game, a, b) {
        if (!a || !b) return false;
        const key = this.pairKey(a, b);
        if (!game.warsBetween || !game.warsBetween[key]) return false;
        delete game.warsBetween[key];
        return true;
    },
    openDeclarePicker(game) {
        const panel = document.getElementById('diplomacy-panel');
        if (!panel) return;
        let picker = document.getElementById('dip-picker');
        if (picker) picker.remove();
        picker = document.createElement('div');
        picker.id = 'dip-picker';
        picker.className = "mt-3 glass-card p-3";
        const opts = this.getWarGoalOptions(game, game.dipTargetOwner);
        const list = document.createElement('div');
        list.className = "space-y-2";
        let selected = 'none';
        opts.forEach(o => {
            const row = document.createElement('label');
            row.className = `flex items-center gap-2 text-[10px] ${o.enabled ? 'text-gray-300' : 'text-gray-500'}`;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'dip-wargoal';
            radio.value = o.key;
            radio.disabled = !o.enabled;
            radio.checked = o.key === selected;
            radio.onchange = () => { selected = o.key; };
            const span = document.createElement('span');
            span.innerText = o.label;
            row.appendChild(radio);
            row.appendChild(span);
            list.appendChild(row);
        });
        picker.appendChild(list);
        const controls = document.createElement('div');
        controls.className = "mt-2 flex items-center gap-2";
        const confirm = document.createElement('button');
        confirm.className = "px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold";
        confirm.innerText = "确认宣战";
        confirm.onclick = () => { this.declareWar(game, game.dipTargetOwner, selected); this.closePanel(); };
        const cancel = document.createElement('button');
        cancel.className = "px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold";
        cancel.innerText = "取消";
        cancel.onclick = () => { const p = document.getElementById('dip-picker'); if (p) p.remove(); };
        controls.appendChild(confirm);
        controls.appendChild(cancel);
        picker.appendChild(controls);
        panel.appendChild(picker);
    }
};
