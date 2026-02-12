const Renderer = {
    roundRect(ctx, x, y, w, h, r) {
        const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    },
    getHexPoints(x, y, r) {
        const pts = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 180 * (60 * i + 30);
            // Canvas 坐标系 y 轴向下为正，因此这里的“视觉方向”与数学坐标系会翻转。
            // 后续如果要用 (dq,dr) → “哪一条共享边” 的映射，务必以这个点序为准做映射。
            pts.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        return pts;
    },
    hexPath(ctx, x, y, r) {
        ctx.beginPath();
        const pts = this.getHexPoints(x, y, r);
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
    },
    drawBuildingIcon(ctx, x, y, zoom, type) {
        if (type !== 'industry') return null;
        const s = zoom;
        const k = (s * 0.6) / 24;
        const ox = x - 12 * k;
        const oy = y - 12 * k;
        ctx.fillStyle = "#22c55e";
        this.roundRect(ctx, ox + 3 * k, oy + 11 * k, 18 * k, 8 * k, 2 * k);
        ctx.fill();
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(ox + 6 * k, oy + 7 * k, 4 * k, 4 * k);
        ctx.fillRect(ox + 12 * k, oy + 5 * k, 3 * k, 6 * k);
        ctx.fillRect(ox + 17 * k, oy + 8 * k, 2 * k, 3 * k);
        ctx.fillStyle = "#121214";
        ctx.fillRect(ox + 5 * k, oy + 14 * k, 3 * k, 3 * k);
        ctx.fillRect(ox + 10 * k, oy + 14 * k, 3 * k, 3 * k);
        ctx.fillRect(ox + 15 * k, oy + 14 * k, 3 * k, 3 * k);
        return true;
    },
    drawHexFill(game, x, y, r, color, isReachable, isAttackable) {
        const ctx = game.ctx;
        this.hexPath(ctx, x, y, r);
        ctx.fillStyle = color; ctx.fill();
        if (isReachable) {
            let overlay = "rgba(59, 130, 246, 0.2)";
            const hex = game.pixelToHex(x, y);
            const occ = (game.units || []).find(u => u.q === hex.q && u.r === hex.r);
            if (occ && (occ.isNaval || Units.isNaval(occ)) && occ.navalRole === 'carrier') {
                overlay = "rgba(34, 211, 238, 0.3)";
            }
            ctx.fillStyle = overlay; ctx.fill();
        }
        if (isAttackable) { ctx.fillStyle = "rgba(255, 0, 0, 0.6)"; ctx.fill(); }
    },
    drawHex(game, x, y, r, color, isSelected, isReachable, isAttackable) {
        this.drawHexFill(game, x, y, r, color, isReachable, isAttackable);
        if (isSelected) {
            const ctx = game.ctx;
            ctx.save();
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            this.drawHexOutline(game, x, y, r, "#fff", 3);
            ctx.restore();
        } else {
            this.drawHexEdgeStroke(game, x, y, r, "rgba(255,255,255,0.05)", 1);
        }
    },
    drawHexEdgeStroke(game, x, y, r, strokeStyle, lineWidth) {
        const ctx = game.ctx;
        const pts = this.getHexPoints(x, y, r);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % 6];
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
    },
    drawHexOutline(game, x, y, r, strokeStyle, lineWidth) {
        const ctx = game.ctx;
        this.hexPath(ctx, x, y, r);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    },
    dirIndexToEdgeIndex(dirIndex) {
        // dirs（轴坐标邻居方向）索引与六边形顶点序号的对应关系：
        // dirIndex: 0  1   2   3   4   5
        // (dq,dr): (1,0) (1,-1) (0,-1) (-1,0) (-1,1) (0,1)
        // edgeIndex: 5  4   3   2   1   0
        // 这组映射是为 Canvas y 轴向下的坐标系调过的；改动 hex 顶点生成顺序时必须同步改这里。
        const map = [5, 4, 3, 2, 1, 0];
        return typeof dirIndex === 'number' && dirIndex >= 0 && dirIndex < map.length ? map[dirIndex] : -1;
    },
    drawBorderBetween(game, a, b, color, width) {
        if (!a || !b) return;
        const dq = b.q - a.q;
        const dr = b.r - a.r;
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        const dirIndex = dirs.findIndex(d => d[0] === dq && d[1] === dr);
        const edgeIndex = this.dirIndexToEdgeIndex(dirIndex);
        if (edgeIndex < 0) return;
        const pos = game.hexToPixel(a.q, a.r);
        const pts = this.getHexPoints(pos.x, pos.y, game.zoom);
        const p0 = pts[edgeIndex];
        const p1 = pts[(edgeIndex + 1) % 6];
        const ctx = game.ctx;
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.restore();
    },
    drawBorderTrapezoid(game, a, b, color, height, alpha) {
        if (!a || !b) return;
        const posB = game.hexToPixel(b.q, b.r);
        const ptsB = this.getHexPoints(posB.x, posB.y, game.zoom);
        const dq2 = a.q - b.q;
        const dr2 = a.r - b.r;
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        const dirIndex2 = dirs.findIndex(d => d[0] === dq2 && d[1] === dr2);
        const edgeIndexB = this.dirIndexToEdgeIndex(dirIndex2);
        if (edgeIndexB < 0) return;
        const p0b = ptsB[edgeIndexB];
        const p1b = ptsB[(edgeIndexB + 1) % 6];
        const ex = p1b.x - p0b.x;
        const ey = p1b.y - p0b.y;
        const el = Math.max(1e-6, Math.hypot(ex, ey));
        let nx = -ey / el, ny = ex / el;
        const mx = (p0b.x + p1b.x) / 2, my = (p0b.y + p1b.y) / 2;
        const dot = nx * (posB.x - mx) + ny * (posB.y - my);
        if (dot < 0) { nx = -nx; ny = -ny; }
        const h = typeof height === 'number' ? height : game.zoom * 0.18;
        const aFill = typeof alpha === 'number' ? alpha : 0.28;
        const tx = ex / el, ty = ey / el;
        const prev = ptsB[(edgeIndexB + 5) % 6];
        const next = ptsB[(edgeIndexB + 2) % 6];
        const a0x = p0b.x + nx * h, a0y = p0b.y + ny * h;
        const d0x = p0b.x - prev.x, d0y = p0b.y - prev.y;
        const d1x = next.x - p1b.x, d1y = next.y - p1b.y;
        const cross = (ax, ay, bx, by) => ax * by - ay * bx;
        const denom0 = cross(tx, ty, d0x, d0y);
        const denom1 = cross(tx, ty, d1x, d1y);
        let u0 = denom0 !== 0 ? cross(p0b.x - a0x, p0b.y - a0y, d0x, d0y) / denom0 : 0;
        let u1 = denom1 !== 0 ? cross(p1b.x - a0x, p1b.y - a0y, d1x, d1y) / denom1 : 0;
        let q0x = a0x + tx * u0, q0y = a0y + ty * u0;
        let q1x = a0x + tx * u1, q1y = a0y + ty * u1;
        if (!isFinite(u0)) { q0x = p0b.x + nx * h; q0y = p0b.y + ny * h; }
        if (!isFinite(u1)) { q1x = p1b.x + nx * h; q1y = p1b.y + ny * h; }
        const ctx = game.ctx;
        ctx.save();
        ctx.fillStyle = this.colorWithAlpha(color, aFill);
        ctx.beginPath();
        ctx.moveTo(p0b.x, p0b.y);
        ctx.lineTo(p1b.x, p1b.y);
        ctx.lineTo(q1x, q1y);
        ctx.lineTo(q0x, q0y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },
    colorWithAlpha(color, alpha) {
        if (typeof color !== 'string') return `rgba(255,255,255,${Math.max(0, Math.min(1, alpha || 1))})`;
        const a = Math.max(0, Math.min(1, alpha || 1));
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r},${g},${b},${a})`;
        }
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `,${a})`);
        }
        if (color.startsWith('rgba(')) {
            const parts = color.slice(5, -1).split(',').map(s => s.trim());
            const r = parts[0] || '255', g = parts[1] || '255', b = parts[2] || '255';
            return `rgba(${r},${g},${b},${a})`;
        }
        return `rgba(255,255,255,${a})`;
    },
    drawOwnerSoftEdge(game, owner, style) {
        if (!owner) return;
        const tiles = (game.grid || []).filter(t => t && t.owner === owner);
        if (!tiles.length) return;
        const tileMap = new Map((game.grid || []).map(t => [`${t.q},${t.r}`, t]));
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        const dirToEdge = [5, 4, 3, 2, 1, 0];
        const edgeToDir = (() => { const inv = []; dirToEdge.forEach((e, d) => inv[e] = d); return inv; })();
        const baseColor = typeof style?.color === 'string' ? style.color : (OWNER_COLORS && OWNER_COLORS[owner] ? OWNER_COLORS[owner] : "#fff");
        const layers = typeof style?.layers === 'number' ? Math.max(1, Math.floor(style.layers)) : 8;
        const step = typeof style?.step === 'number' ? style.step : game.zoom * 0.06;
        const lineWidth = typeof style?.width === 'number' ? style.width : 2;
        const alphaStart = typeof style?.alphaStart === 'number' ? style.alphaStart : 0.35;
        const ctx = game.ctx;
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        tiles.forEach(t => {
            const pos = game.hexToPixel(t.q, t.r);
            const pts = this.getHexPoints(pos.x, pos.y, game.zoom);
            const cx = pos.x, cy = pos.y;
            const edgeFlags = new Array(6).fill(false);
            const normals = new Array(6).fill(null);
            const tangents = new Array(6).fill(null);
            for (let i = 0; i < dirs.length; i++) {
                const dq = dirs[i][0], dr = dirs[i][1];
                const nk = `${t.q + dq},${t.r + dr}`;
                const n = tileMap.get(nk);
                if (!n || n.owner !== owner) {
                    const edgeIndex = this.dirIndexToEdgeIndex(i);
                    const p0 = pts[edgeIndex];
                    const p1 = pts[(edgeIndex + 1) % 6];
                    const ex = p1.x - p0.x;
                    const ey = p1.y - p0.y;
                    const el = Math.max(1e-6, Math.hypot(ex, ey));
                    let nx = -ey / el, ny = ex / el;
                    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
                    const dot = nx * (cx - mx) + ny * (cy - my);
                    if (dot < 0) { nx = -nx; ny = -ny; }
                    edgeFlags[edgeIndex] = true;
                    normals[edgeIndex] = { nx, ny };
                    tangents[edgeIndex] = { tx: ex / el, ty: ey / el };
                }
            }
            const cornerInfo = new Array(6).fill(null);
            for (let v = 0; v < 6; v++) {
                const prev = (v + 5) % 6;
                const hasPrev = !!edgeFlags[prev];
                const hasNext = !!edgeFlags[v];
                if (hasPrev && hasNext) {
                    const dPrev = edgeToDir[prev];
                    const dNext = edgeToDir[v];
                    const diagQ = t.q + dirs[dPrev][0] + dirs[dNext][0];
                    const diagR = t.r + dirs[dPrev][1] + dirs[dNext][1];
                    const diag = tileMap.get(`${diagQ},${diagR}`);
                    const isConvex = !!(diag && diag.owner === owner);
                    cornerInfo[v] = { type: isConvex ? 'convex' : 'concave' };
                }
            }
            for (let i = 0; i < dirs.length; i++) {
                const dq = dirs[i][0];
                const dr = dirs[i][1];
                const nk = `${t.q + dq},${t.r + dr}`;
                const n = tileMap.get(nk);
                if (!n || n.owner !== owner) {
                    const edgeIndex = this.dirIndexToEdgeIndex(i);
                    const p0 = pts[edgeIndex];
                    const p1 = pts[(edgeIndex + 1) % 6];
                    const { nx, ny } = normals[edgeIndex] || { nx: 0, ny: 0 };
                    const { tx, ty } = tangents[edgeIndex] || { tx: 0, ty: 0 };
                    const startCorner = cornerInfo[edgeIndex];
                    const endCorner = cornerInfo[(edgeIndex + 1) % 6];
                    for (let k = 1; k <= layers; k++) {
                        const off = k * step;
                        const a0x = p0.x + nx * off, a0y = p0.y + ny * off;
                        const prev = pts[(edgeIndex + 5) % 6];
                        const next = pts[(edgeIndex + 2) % 6];
                        const d0x = p0.x - prev.x, d0y = p0.y - prev.y;
                        const d1x = next.x - p1.x, d1y = next.y - p1.y;
                        const cross = (ax, ay, bx, by) => ax * by - ay * bx;
                        const denom0 = cross(tx, ty, d0x, d0y);
                        const denom1 = cross(tx, ty, d1x, d1y);
                        let u0 = denom0 !== 0 ? cross(p0.x - a0x, p0.y - a0y, d0x, d0y) / denom0 : 0;
                        let u1 = denom1 !== 0 ? cross(p1.x - a0x, p1.y - a0y, d1x, d1y) / denom1 : 0;
                        let q0x = a0x + tx * u0, q0y = a0y + ty * u0;
                        let q1x = a0x + tx * u1, q1y = a0y + ty * u1;
                        if (!isFinite(u0)) { q0x = p0.x + nx * off; q0y = p0.y + ny * off; }
                        if (!isFinite(u1)) { q1x = p1.x + nx * off; q1y = p1.y + ny * off; }
                        const a = alphaStart * (1 - (k - 1) / layers);
                        ctx.fillStyle = this.colorWithAlpha(baseColor, a);
                        ctx.beginPath();
                        ctx.moveTo(p0.x, p0.y);
                        ctx.lineTo(p1.x, p1.y);
                        ctx.lineTo(q1x, q1y);
                        ctx.lineTo(q0x, q0y);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
            for (let v = 0; v < 6; v++) {
                const info = cornerInfo[v];
                if (!info || info.type !== 'concave') continue;
                const prev = (v + 5) % 6;
                const nPrev = normals[prev];
                const nNext = normals[v];
                if (!nPrev || !nNext) continue;
                const pv = pts[v];
                for (let k = 1; k <= layers; k++) {
                    const off = k * step;
                    const a = alphaStart * (1 - (k - 1) / layers);
                    const pp = { x: pv.x + nPrev.nx * off, y: pv.y + nPrev.ny * off };
                    const pn = { x: pv.x + nNext.nx * off, y: pv.y + nNext.ny * off };
                    const bi = { x: (nPrev.nx + nNext.nx), y: (nPrev.ny + nNext.ny) };
                    const bl = Math.max(1e-6, Math.hypot(bi.x, bi.y));
                    const pa = { x: pv.x + (bi.x / bl) * off, y: pv.y + (bi.y / bl) * off };
                    ctx.fillStyle = this.colorWithAlpha(baseColor, a);
                    ctx.beginPath();
                    ctx.moveTo(pp.x, pp.y);
                    ctx.lineTo(pn.x, pn.y);
                    ctx.lineTo(pa.x, pa.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        });
        ctx.restore();
    },
    drawDistrictOutline(game, districtKey, style, tileMapOverride) {
        if (!districtKey) return;
        // 辖区外轮廓：对辖区内每个 tile，检查 6 个方向邻居是否还在同辖区；
        // 若不在，则该方向对应的共享边属于“外轮廓边”，需要绘制。
        // 注意：这里调用 drawBorderBetween 时，把 t 与“虚拟邻居坐标”传进去，
        // 只用到 (dq,dr) 来定位边，不依赖邻居 tile 是否真实存在。
        const tiles = (game.grid || []).filter(t => t && t.districtKey === districtKey);
        if (!tiles.length) return;
        const tileMap = tileMapOverride || new Map((game.grid || []).map(t => [`${t.q},${t.r}`, t]));
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        let owner = null;
        try {
            const parts = String(districtKey).split(',');
            const cq = parseInt(parts[0], 10), cr = parseInt(parts[1], 10);
            const center = tileMap.get(`${cq},${cr}`) || (game.grid || []).find(t => t && t.q === cq && t.r === cr);
            owner = center?.owner || (tiles[0]?.owner) || null;
        } catch (_) { owner = tiles[0]?.owner || null; }
        const color = typeof style?.color === 'string' ? style.color : ((OWNER_COLORS && owner && OWNER_COLORS[owner]) ? OWNER_COLORS[owner] : "rgba(34, 211, 238, 0.95)");
        const width = typeof style?.width === 'number' ? style.width : 5;
        tiles.forEach(t => {
            for (let i = 0; i < dirs.length; i++) {
                const dq = dirs[i][0];
                const dr = dirs[i][1];
                const nk = `${t.q + dq},${t.r + dr}`;
                const n = tileMap.get(nk);
                if (!n || n.districtKey !== districtKey) {
                    this.drawBorderBetween(game, { q: t.q, r: t.r }, { q: t.q + dq, r: t.r + dr }, color, width);
                }
            }
        });
    },
    drawOwnerOutline(game, owner, style) {
        if (!owner) return;
        const tiles = (game.grid || []).filter(t => t && t.owner === owner);
        if (!tiles.length) return;
        const tileMap = new Map((game.grid || []).map(t => [`${t.q},${t.r}`, t]));
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        const color = typeof style?.color === 'string' ? style.color : (OWNER_COLORS && OWNER_COLORS[owner] ? OWNER_COLORS[owner] : "#fff");
        const width = typeof style?.width === 'number' ? style.width : 2;
        const dash = Array.isArray(style?.dash) ? style.dash : [5, 3];
        const ctx = game.ctx;
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.setLineDash(dash);
        tiles.forEach(t => {
            for (let i = 0; i < dirs.length; i++) {
                const dq = dirs[i][0];
                const dr = dirs[i][1];
                const nk = `${t.q + dq},${t.r + dr}`;
                const n = tileMap.get(nk);
                if (!n || n.owner !== owner) {
                    this.drawBorderBetween(game, { q: t.q, r: t.r }, { q: t.q + dq, r: t.r + dr }, color, width);
                }
            }
        });
        ctx.restore();
    },
    render(game) {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const dt = game._lastTick ? (now - game._lastTick) : 16;
        game._lastTick = now;
        if (Array.isArray(game.animations) && game.animations.length) {
            const remain = [];
            game.animations.forEach(anim => {
                const unit = game.units.find(u => u.id === anim.unitId);
                if (!unit) return;
                anim.t += dt / (anim.duration || 200);
                const toStep = anim.path[anim.stepIndex];
                const toTile = game.grid.find(t => t.q === toStep.q && t.r === toStep.r);
                if (!toTile) return;
                if (anim.t >= 1) {
                    unit.q = toTile.q; unit.r = toTile.r;
                    const c = anim.costs[anim.stepIndex] || 0;
                    unit.moves = Math.max(0, unit.moves - c);
                    const fuelPerAP = Units.getFuelReqPerAP(unit);
                    if (fuelPerAP > 0) { game.res.fuel = Math.max(0, (game.res.fuel || 0) - fuelPerAP * c); }
                    if (toTile && toTile.owner !== unit.owner) {
                        const isNeutral = toTile.owner === 'Neutral';
                        const atWar = (typeof Diplomacy !== 'undefined' && typeof Diplomacy.isAtWarWith === 'function') ? Diplomacy.isAtWarWith(game, toTile.owner) : !!((game.atWarWith || {})[toTile.owner]);
                        if (isNeutral || atWar) {
                            toTile.owner = unit.owner || game.currentOwnerKey;
                        }
                    }
                    game.updateDeltas();
                    // embark removed
                    anim.stepIndex++;
                    anim.t = 0;
                    anim.from = { q: unit.q, r: unit.r };
                    if (anim.stepIndex < anim.path.length && unit.moves > 0) {
                        remain.push(anim);
                    } else {
                        if (game.selectedUnit && game.selectedUnit.id === unit.id) {
                            Selection.selectUnit(game, unit);
                            game.updateTilePanel();
                        }
                    }
                } else {
                    remain.push(anim);
                }
            });
            game.animations = remain;
        }
        const ctx = game.ctx;
        ctx.clearRect(0, 0, game.width, game.height);
        game.grid.forEach(t => {
            const pos = game.hexToPixel(t.q, t.r);
            const isReachableBase = game.reachableTiles.some(rt => rt && rt.q === t.q && rt.r === t.r);
            const isAttackable = Array.isArray(game.attackableTiles) && game.attackableTiles.some(rt => rt && rt.q === t.q && rt.r === t.r);
            let isReachable = isReachableBase;
            if (!isReachableBase && game.selectedUnit) {
                const occ = (game.units || []).find(u => u.q === t.q && u.r === t.r);
                if (occ && Units.canEmbarkOnCarrier(game, game.selectedUnit, occ) && Movement.canMoveTo(game, game.selectedUnit, t)) {
                    isReachable = true;
                }
            }
            this.drawHexFill(game, pos.x, pos.y, game.zoom, TERRAINS[t.terrain].color, isReachable, isAttackable);
            if (t.building) {
                const drawn = this.drawBuildingIcon(ctx, pos.x, pos.y, game.zoom, t.building);
                if (!drawn) { ctx.font = `${game.zoom * 0.4}px serif`; ctx.textAlign = "center"; ctx.fillText(BUILDINGS[t.building].icon, pos.x, pos.y); }
            } else {
                const inProgress = (game.buildQueue || []).find(it => it.q === t.q && it.r === t.r);
                if (inProgress) {
                    ctx.save();
                    const ratio = Math.max(0, Math.min(1, (inProgress.progress || 0) / Math.max(1, inProgress.requirement || 1)));
                    ctx.globalAlpha = 0.5;
                    const drawn2 = this.drawBuildingIcon(ctx, pos.x, pos.y, game.zoom, inProgress.type);
                    if (!drawn2) { ctx.font = `${game.zoom * 0.4}px serif`; ctx.textAlign = "center"; ctx.fillText(BUILDINGS[inProgress.type].icon, pos.x, pos.y); }
                    ctx.globalAlpha = 1;
                    const bw = game.zoom * 0.7;
                    const bh = Math.max(3, game.zoom * 0.10);
                    const bx = pos.x - bw / 2;
                    const by = pos.y - game.zoom * 0.55;
                    ctx.fillStyle = "rgba(255,255,255,0.15)";
                    ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = "#f59e0b";
                    ctx.fillRect(bx, by, bw * ratio, bh);
                    ctx.strokeStyle = "rgba(255,255,255,0.3)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, bw, bh);
                    ctx.restore();
                }
                const privProgress = (game.privateBuildQueue || []).find(it => it.q === t.q && it.r === t.r);
                if (privProgress) {
                    ctx.save();
                    const ratio = Math.max(0, Math.min(1, (privProgress.progress || 0) / Math.max(1, privProgress.requirement || 1)));
                    ctx.globalAlpha = 0.5;
                    const drawn3 = this.drawBuildingIcon(ctx, pos.x, pos.y, game.zoom, privProgress.type);
                    if (!drawn3) { ctx.font = `${game.zoom * 0.4}px serif`; ctx.textAlign = "center"; ctx.fillText(BUILDINGS[privProgress.type].icon, pos.x, pos.y); }
                    ctx.globalAlpha = 1;
                    const bw = game.zoom * 0.7;
                    const bh = Math.max(3, game.zoom * 0.10);
                    const bx = pos.x - bw / 2;
                    const by = pos.y - game.zoom * 0.55;
                    ctx.fillStyle = "rgba(255,255,255,0.15)";
                    ctx.fillRect(bx, by, bw, bh);
                    ctx.fillStyle = "#f59e0b";
                    ctx.fillRect(bx, by, bw * ratio, bh);
                    ctx.strokeStyle = "rgba(255,255,255,0.3)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, bw, bh);
                    ctx.font = `${game.zoom * 0.30}px serif`;
                    ctx.textAlign = "right";
                    ctx.textBaseline = "bottom";
                    const rx = pos.x + game.zoom * 0.55;
                    const ry = pos.y + game.zoom * 0.50;
                    ctx.fillText(YIELD_ICONS.money || '💰', rx, ry);
                    ctx.restore();
                }
            }
        });
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        game.grid.forEach(t => {
            const pos = game.hexToPixel(t.q, t.r);
            this.drawHexEdgeStroke(game, pos.x, pos.y, game.zoom, "rgba(255,255,255,0.05)", 1);
        });
        ctx.restore();
        if (game.rivers && typeof game.rivers.forEach === 'function') {
            game.rivers.forEach(seg => {
                const a = seg?.a, b = seg?.b;
                if (!a || !b) return;
                const seaColor = (typeof TERRAINS === 'object' && TERRAINS.SHALLOW_SEA) ? TERRAINS.SHALLOW_SEA.color : (typeof seg.color === 'string' ? seg.color : "#1e3a5f");
                const width = Math.max(8, game.zoom * 0.35);
                this.drawBorderBetween(game, a, b, seaColor, width);
            });
        }
        this.drawOwnerOutline(game, 'Player', { color: OWNER_COLORS['Player'], width: 2, dash: [5, 3] });
        this.drawOwnerOutline(game, 'Enemy', { color: OWNER_COLORS['Enemy'], width: 2, dash: [5, 3] });
        this.drawOwnerSoftEdge(game, 'Player', { color: OWNER_COLORS['Player'], width: 2, layers: 8, alphaStart: 0.35 });
        this.drawOwnerSoftEdge(game, 'Enemy', { color: OWNER_COLORS['Enemy'], width: 2, layers: 8, alphaStart: 0.35 });
        this.drawOwnerSoftEdge(game, 'Neutral', { color: OWNER_COLORS['Neutral'], width: 2, layers: 6, alphaStart: 0.25 });
        const tileMap = new Map((game.grid || []).map(t => [`${t.q},${t.r}`, t]));
        const districtKeys = new Set();
        (game.grid || []).forEach(t => { if (t && t.districtKey) districtKeys.add(t.districtKey); });
        districtKeys.forEach(k => this.drawDistrictOutline(game, k, { width: 5 }, tileMap));
        if (game.cityEditMode) this.drawDistrictOutline(game, game.cityEditMode, { width: 7 }, tileMap);
        if (game.borders && typeof game.borders.forEach === 'function') {
            // 手工边界（Shift 点选两格切换）是“共享边”级别的渲染，和辖区描边互不冲突。
            game.borders.forEach(b => {
                const a = b?.a;
                const bb = b?.b;
                if (!a || !bb) return;
                const aKey = `${a.q},${a.r}`;
                const bKey = `${bb.q},${bb.r}`;
                const from = aKey < bKey ? a : bb;
                const to = aKey < bKey ? bb : a;
                this.drawBorderBetween(game, from, to, typeof b.color === 'string' ? b.color : "#eab308", typeof b.width === 'number' ? b.width : 4);
                this.drawBorderTrapezoid(game, a, bb, typeof b.color === 'string' ? b.color : "#eab308", game.zoom * 0.14, 0.28);
            });
        }
        if (game.selectedTile) {
            const pos = game.hexToPixel(game.selectedTile.q, game.selectedTile.r);
            ctx.save();
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            this.drawHexOutline(game, pos.x, pos.y, game.zoom, "#fff", 3);
            ctx.restore();
        }
        game.units.forEach(u => {
            let pos = game.hexToPixel(u.q, u.r);
            const anim = (game.animations || []).find(a => a.unitId === u.id);
            if (anim) {
                const fromPos = game.hexToPixel(anim.from.q, anim.from.r);
                const step = anim.path[anim.stepIndex] || anim.path[anim.path.length - 1];
                const toPos = game.hexToPixel(step.q, step.r);
                const p = Math.max(0, Math.min(1, anim.t));
                pos = { x: fromPos.x + (toPos.x - fromPos.x) * p, y: fromPos.y + (toPos.y - fromPos.y) * p };
            }
            ctx.beginPath(); ctx.arc(pos.x, pos.y, game.zoom * 0.45, 0, Math.PI * 2);
            const inactive = (u.moves || 0) <= 0;
            let minStep = Infinity;
            if (!inactive) {
                const neighbors = game.getNeighbors(u.q, u.r) || [];
                neighbors.forEach(n => {
                    const c = Movement.getMoveCost(game, u, n);
                    if (typeof c === 'number' && c > 0) { minStep = Math.min(minStep, c); }
                });
            }
            const lowAP = !inactive && isFinite(minStep) && (u.moves || 0) < minStep;
            const ownerColor = (OWNER_COLORS && OWNER_COLORS[u.owner]) ? OWNER_COLORS[u.owner] : '#dc2626';
            const colorInactive = '#64748b';
            const colorLowAP = '#1e3a8a';
            ctx.fillStyle = inactive ? colorInactive : (lowAP ? colorLowAP : ownerColor); ctx.fill();
            if (game.selectedUnit === u) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
            ctx.fillStyle = "#fff"; ctx.font = `bold ${game.zoom * 0.4}px sans-serif`; ctx.textAlign = "center";
            const centerIcon = Units.getArmorIcon(u);
            ctx.fillText(centerIcon, pos.x, pos.y + 6);
            const subTxt = Units.getSubBadgeText(u);
            ctx.font = `bold ${game.zoom * 0.18}px sans-serif`;
            const bw2 = game.zoom * 0.38;
            const bh2 = Math.max(3, game.zoom * 0.20);
            const bx2 = pos.x + game.zoom * 0.06;
            const by2 = pos.y + game.zoom * 0.12;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(bx2, by2, bw2, bh2);
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText(subTxt, bx2 + bw2 / 2, by2 + bh2 - game.zoom * 0.03);
            const bw = game.zoom * 0.9;
            const bh = Math.max(3, game.zoom * 0.12);
            const bx = pos.x - bw / 2;
            const by = pos.y - game.zoom * 0.75;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(bx, by, bw, bh);
            const ratio = Math.max(0, Math.min(1, (u.hp || 0) / (u.maxHp || 1)));
            const fr = Math.round(255 * (1 - ratio));
            const fg = Math.round(255 * ratio);
            ctx.fillStyle = `rgb(${fr},${fg},60)`;
            ctx.fillRect(bx, by, bw * ratio, bh);
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, bh);
        });
        if (game.combatPopups.length) {
            const remain = [];
            ctx.textAlign = "center";
            game.combatPopups.forEach(p => {
                p.ttl--;
                if (p.ttl > 0) {
                    const alpha = p.ttl / p.maxTtl;
                    const rs = (game.combatPopupConfig && game.combatPopupConfig.riseSpeed) || 0.5;
                    const dy = (p.maxTtl - p.ttl) * rs;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = p.color;
                    const fs = (game.combatPopupConfig && game.combatPopupConfig.fontScale) || 0.22;
                    ctx.font = `bold ${game.zoom * fs}px sans-serif`;
                    ctx.fillText(p.text, p.x, p.y - dy);
                    ctx.globalAlpha = 1;
                    remain.push(p);
                }
            });
            game.combatPopups = remain;
        }
        if (game.debugCorner) {
            const info = game.debugCorner;
            ctx.save();
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(info.x, info.y, Math.max(2, game.zoom * 0.12), 0, Math.PI * 2);
            ctx.fillStyle = "rgba(34,197,94,0.75)";
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
            const lines = [];
            if (info.up) lines.push(`上方 [${info.up.q},${info.up.r}]`);
            if (info.leftUp) lines.push(`左上 [${info.leftUp.q},${info.leftUp.r}]`);
            if (info.rightUp) lines.push(`右上 [${info.rightUp.q},${info.rightUp.r}]`);
            if (info.leftDown) lines.push(`左下 [${info.leftDown.q},${info.leftDown.r}]`);
            if (info.rightDown) lines.push(`右下 [${info.rightDown.q},${info.rightDown.r}]`);
            if (info.down && !(info.leftDown || info.rightDown)) lines.push(`下方 [${info.down.q},${info.down.r}]`);
            if (lines.length) {
                const fs = Math.max(10, game.zoom * 0.22);
                ctx.font = `bold ${fs}px sans-serif`;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                const pad = Math.max(6, game.zoom * 0.10);
                const lh = fs + Math.max(2, game.zoom * 0.04);
                const w = Math.max(...lines.map(s => ctx.measureText(s).width)) + pad * 2;
                const h = lh * lines.length + pad * 2;
                const bx = info.x + game.zoom * 0.25;
                const by = info.y - h / 2;
                ctx.fillStyle = "rgba(0,0,0,0.6)";
                ctx.fillRect(bx, by, w, h);
                ctx.strokeStyle = "rgba(255,255,255,0.3)";
                ctx.lineWidth = 1;
                ctx.strokeRect(bx, by, w, h);
                ctx.fillStyle = "#fff";
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i], bx + pad, by + pad + i * lh);
                }
            }
            ctx.restore();
        }
    }
};
