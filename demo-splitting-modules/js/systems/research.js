const Research = {
    findById(id) {
        for (const [catKey, category] of Object.entries(TECH_TREE)) {
            const found = category.steps.find(s => s.id === id);
            if (found) return found;
        }
        return null;
    },
    getMultiplier(game, buildingKey) {
        if (!TECH_TREE[buildingKey]) return 1;
        const count = TECH_TREE[buildingKey].steps.filter(s => game.researchedTechs.includes(s.id)).length;
        return 1 + (count * 0.25);
    },
    getMultiplierForOwner(game, buildingKey, ownerKey) {
        if (!TECH_TREE[buildingKey]) return 1;
        const o = ownerKey || game.currentOwnerKey || 'Player';
        const list = (game.techByOwner && game.techByOwner[o] && Array.isArray(game.techByOwner[o].researchedTechs)) ? game.techByOwner[o].researchedTechs : (game.researchedTechs || []);
        const count = TECH_TREE[buildingKey].steps.filter(s => list.includes(s.id)).length;
        return 1 + (count * 0.25);
    },
    getLevel(game, categoryKey) {
        if (!TECH_TREE[categoryKey]) return 0;
        return TECH_TREE[categoryKey].steps.filter(s => game.researchedTechs.includes(s.id)).length;
    },
    getLevelForOwner(game, categoryKey, ownerKey) {
        if (!TECH_TREE[categoryKey]) return 0;
        const o = ownerKey || game.currentOwnerKey || 'Player';
        const list = (game.techByOwner && game.techByOwner[o] && Array.isArray(game.techByOwner[o].researchedTechs)) ? game.techByOwner[o].researchedTechs : (game.researchedTechs || []);
        return TECH_TREE[categoryKey].steps.filter(s => list.includes(s.id)).length;
    },
    start(game, id, cost) {
        if (game.researchedTechs.includes(id)) return;
        let prevOk = true;
        let prereqOk = true;
        const techObj = this.findById(id);
        if (techObj && Array.isArray(techObj.prereq)) {
            prereqOk = techObj.prereq.every(pid => game.researchedTechs.includes(pid));
        }
        for (const [catKey, category] of Object.entries(TECH_TREE)) {
            const idx = category.steps.findIndex(s => s.id === id);
            if (idx !== -1) {
                const step = category.steps[idx];
                const chained = !(step && step.chain === false);
                if (chained && idx > 0 && !game.researchedTechs.includes(category.steps[idx-1].id)) prevOk = false;
                break;
            }
        }
        if (!prevOk || !prereqOk) return;
        if (!game.researchProgress[id]) game.researchProgress[id] = 0;
        game.activeTechId = id;
    },
    processTurn(game) {
        if (!game.activeTechId) return;
        const tech = this.findById(game.activeTechId);
        if (!tech) return;
        const id = game.activeTechId;
        const current = game.researchProgress[id] || 0;
        const need = tech.cost - current;
        const invest = Math.max(0, Math.min(game.res.science, need));
        game.researchProgress[id] = current + invest;
        if (game.researchProgress[id] >= tech.cost) {
            game.researchedTechs.push(id);
            delete game.researchProgress[id];
            game.activeTechId = null;
            game.updateDeltas();
        }
    }
};
