const VHUtils = {
    hexToPixel(game, q, r) {
        return { x: game.zoom * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r) + game.offset.x, y: game.zoom * (1.5 * r) + game.offset.y };
    },
    pixelToHex(game, x, y) {
        const px = (x - game.offset.x) / game.zoom, py = (y - game.offset.y) / game.zoom;
        let q = (Math.sqrt(3)/3 * px - 1/3 * py), r = (2/3 * py), s = -q - r;
        let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
        if (Math.abs(rq - q) > Math.abs(rr - r) && Math.abs(rq - q) > Math.abs(rs - s)) rq = -rr - rs;
        else if (Math.abs(rr - r) > Math.abs(rs - s)) rr = -rq - rs;
        return { q: rq, r: rr };
    },
    getDistance(a, b) {
        return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    },
    getNeighbors(game, q, r) {
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        return dirs.map(d => game.grid.find(t => t.q === q + d[0] && t.r === r + d[1])).filter(t => t);
    }
};
