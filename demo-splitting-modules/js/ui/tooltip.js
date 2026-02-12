const UITooltip = {
    update(game, e) {
        const hex = game.pixelToHex(e.clientX, e.clientY);
        const tile = game.grid.find(t => t.q === hex.q && t.r === hex.r);
        const tooltip = document.getElementById('tooltip');
        if (tile) {
            tooltip.classList.remove('hidden');
            tooltip.style.left = e.clientX + 15 + 'px';
            tooltip.style.top = e.clientY + 15 + 'px';
            tooltip.innerHTML = `<div class="font-bold text-white">${TERRAINS[tile.terrain].name}</div><div class="text-gray-400 mt-1">${tile.owner}</div>`;
        } else {
            tooltip.classList.add('hidden');
        }
    }
};
