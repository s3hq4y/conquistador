const Camera = {
    attach(game) {
        let isDragging = false, startX = 0, startY = 0;
        game.canvas.onmousedown = (e) => { isDragging = true; startX = e.clientX; startY = e.clientY; };
        window.onmousemove = (e) => {
            if (isDragging) {
                game.offset.x += e.clientX - startX; game.offset.y += e.clientY - startY;
                startX = e.clientX; startY = e.clientY;
            }
            game.handleHover(e);
        };
        window.onmouseup = () => { isDragging = false; };
        game.canvas.onwheel = (e) => {
            game.zoom = Math.max(25, Math.min(150, game.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
        };
        window.addEventListener('resize', () => {
            game.width = window.innerWidth; game.height = window.innerHeight;
            game.canvas.width = game.width; game.canvas.height = game.height;
        });
    }
};
