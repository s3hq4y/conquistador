const Selection = {
    selectUnit(game, unit) {
        game.selectedUnit = unit;
        const info = Movement.computeReachableInfo(game, unit);
        game.reachableTiles = info.tiles;
        game.movementPrev = info.prev;
        game.movementDist = info.dist;
        const isAir = Units.isAir(unit);
        const airRange = Units.getAirRange(unit);
        const range = unit.attackRange || airRange || 0;
        game.attackableTiles = game.grid.filter(t => {
            const enemy = Units.findAt(game, t.q, t.r);
            if (!enemy || enemy.owner === unit.owner) return false;
            const inReach = game.reachableTiles.some(rt => rt && rt.q === t.q && rt.r === t.r);
            const dist = game.getDistance(unit, t);
            const inRange = range > 0 && dist <= range && Units.canUnitAttack(game, unit, enemy, dist);
            return inReach || inRange;
        });
        UIPanels.showUnit(game, unit);
    },
    deselectUnit(game) {
        const prev = game.selectedUnit;
        if (prev && Units.isAir(prev)) {
            const carrier = (game.units || []).find(u => u.owner === prev.owner && (u.isNaval || Units.isNaval(u)) && u.navalRole === 'carrier' && u.q === prev.q && u.r === prev.r);
            if (carrier) {
                const keys = Units.getMainKeys(prev);
                carrier.airComp = (keys || []).slice();
                carrier.airWingMoves = Math.max(0, prev.moves || 0);
                carrier.airWingHasAttacked = !!prev.hasAttacked;
                carrier.airUnitId = null;
                Units.removeById(game, prev.id);
                this.selectUnit(game, carrier);
                return;
            }
        }
        game.selectedUnit = null;
        game.reachableTiles = [];
        game.attackableTiles = [];
        UIPanels.hideUnit();
    },
    selectEnemy(game, unit) {
        game.selectedEnemy = unit;
        UIPanels.showEnemy(game, unit);
    },
    deselectEnemy(game) {
        game.selectedEnemy = null;
        UIPanels.hideEnemy();
    }
};
