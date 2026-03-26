(() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // ── Sizing ──────────────────────────────────────────────────────────────
    function resize() {
        canvas.width  = Math.min(480, window.innerWidth);
        canvas.height = Math.min(800, window.innerHeight);
    }
    resize();
    window.addEventListener('resize', () => { resize(); restartGame(); });

    // ── Assets ───────────────────────────────────────────────────────────────
    const imgs = {};
    let assetsLoaded = 0;
    const assetNames = ['player_sprite', 'platform', 'obstacle'];
    assetNames.forEach(name => {
        const img = new Image();
        img.src = `/images/${name}.png`;
        img.onload = () => { assetsLoaded++; };
        imgs[name] = img;
    });

    const boingAudio = new Audio('/images/boing.wav');
    boingAudio.volume = 0.4;

    // ── Constants ─────────────────────────────────────────────────────────────
    const GRAVITY          = 0.45;
    const PLAYER_W         = 52;
    const PLAYER_H         = 64;
    const PLAT_W           = 96;
    const PLAT_H           = 18;
    const OBS_RADIUS       = 22;
    const PLAYER_SPEED_X   = 5.5;
    const PLAT_SPACING_MIN = 110;
    const PLAT_SPACING_MAX = 170;
    const METERS_PER_PX    = 0.05; // 1 meter = 20px

    // ── State ─────────────────────────────────────────────────────────────────
    let player, platforms, obstacles, clouds;
    let cameraY;          // world Y shown at top of canvas
    let startWorldY;      // player starting world Y (game over if below this)
    let highScore = 0;
    let score = 0;
    let peakWorldY;       // highest world Y the player has reached (lower = higher up)
    let gameState = 'playing'; // 'playing' | 'gameover'
    let keys = {};
    let jumpVy;           // computed from screen height

    // ── Input ─────────────────────────────────────────────────────────────────
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (gameState === 'gameover' && (e.code === 'Space' || e.code === 'Enter')) restartGame();
    });
    window.addEventListener('keyup',   e => { keys[e.code] = false; });

    // Touch / on-screen buttons
    let touchLeft = false, touchRight = false;
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove',  handleTouch, { passive: false });
    canvas.addEventListener('touchend',   e => {
        e.preventDefault();
        touchLeft = touchRight = false;
        if (gameState === 'gameover') restartGame();
    }, { passive: false });

    function handleTouch(e) {
        e.preventDefault();
        touchLeft = touchRight = false;
        for (const t of e.touches) {
            const rect = canvas.getBoundingClientRect();
            const x = t.clientX - rect.left;
            if (x < canvas.width / 2) touchLeft = true;
            else touchRight = true;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

    /** Convert world Y → screen Y */
    function toScreenY(worldY) { return worldY - cameraY; }
    /** Convert world X → screen X (no horizontal camera) */
    function toScreenX(worldX) { return worldX; }

    // ── Cloud ──────────────────────────────────────────────────────────────────
    function makeCloud(worldY) {
        return {
            x:      rand(0, canvas.width),
            worldY: worldY ?? rand(cameraY - canvas.height, cameraY + canvas.height * 2),
            w:      rand(80, 180),
            h:      rand(30, 55),
            speed:  rand(0.2, 0.6),
            alpha:  rand(0.5, 0.85),
        };
    }

    function drawCloud(c) {
        const sx = c.x, sy = toScreenY(c.worldY);
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.fillStyle = '#fff';
        // fluffy blob
        ctx.beginPath();
        ctx.ellipse(sx,          sy,      c.w * 0.4, c.h * 0.5, 0, 0, Math.PI * 2);
        ctx.ellipse(sx + c.w*0.28, sy - c.h*0.15, c.w*0.35, c.h*0.45, 0, 0, Math.PI * 2);
        ctx.ellipse(sx - c.w*0.28, sy - c.h*0.1,  c.w*0.32, c.h*0.4,  0, 0, Math.PI * 2);
        ctx.ellipse(sx + c.w*0.48, sy + c.h*0.1,  c.w*0.28, c.h*0.38, 0, 0, Math.PI * 2);
        ctx.ellipse(sx - c.w*0.48, sy + c.h*0.1,  c.w*0.28, c.h*0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── Platform ───────────────────────────────────────────────────────────────
    function makePlatform(worldY, forcedX) {
        const x = forcedX !== undefined
            ? forcedX
            : rand(10, canvas.width - PLAT_W - 10);
        return { x, worldY, w: PLAT_W, h: PLAT_H };
    }

    function drawPlatform(p) {
        const sx = toScreenX(p.x), sy = toScreenY(p.worldY);
        if (imgs.platform.complete && imgs.platform.naturalWidth > 0) {
            ctx.drawImage(imgs.platform, sx, sy, p.w, p.h);
        } else {
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(sx, sy, p.w, p.h);
        }
    }

    // ── Obstacle ───────────────────────────────────────────────────────────────
    function makeObstacle(worldY) {
        return {
            x:      rand(OBS_RADIUS + 10, canvas.width - OBS_RADIUS - 10),
            worldY,
            r:      OBS_RADIUS,
        };
    }

    function drawObstacle(o) {
        const sx = toScreenX(o.x), sy = toScreenY(o.worldY);
        if (imgs.obstacle.complete && imgs.obstacle.naturalWidth > 0) {
            ctx.drawImage(imgs.obstacle, sx - o.r, sy - o.r, o.r * 2, o.r * 2);
        } else {
            ctx.fillStyle = '#e53935';
            ctx.beginPath();
            ctx.arc(sx, sy, o.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Generate world above a Y threshold ────────────────────────────────────
    // topWorldY: highest world Y already generated
    let genTopY; // tracks how high we've generated
    function generateAbove(untilWorldY) {
        while (genTopY > untilWorldY) {
            genTopY -= rand(PLAT_SPACING_MIN, PLAT_SPACING_MAX);
            platforms.push(makePlatform(genTopY));

            // obstacle: ~40% chance between platforms (not too close to the platform itself)
            if (Math.random() < 0.40) {
                const obsY = genTopY + rand(30, PLAT_SPACING_MIN * 0.6);
                obstacles.push(makeObstacle(obsY));
            }

            // cloud: ~35% chance
            if (Math.random() < 0.35) {
                clouds.push(makeCloud(genTopY + rand(-60, 60)));
            }
        }
    }

    // ── Init / Restart ─────────────────────────────────────────────────────────
    function restartGame() {
        jumpVy = -Math.sqrt(2 * GRAVITY * canvas.height * (2 / 3));

        startWorldY = 0;
        peakWorldY  = startWorldY;
        score       = 0;
        gameState   = 'playing';
        keys        = {};
        touchLeft   = touchRight = false;

        player = {
            x:   canvas.width / 2 - PLAYER_W / 2,
            worldY: startWorldY - PLAYER_H,
            vx: 0,
            vy: 0,
        };

        // Starting platform directly under player
        const startPlatY = startWorldY;
        platforms = [ makePlatform(startPlatY, canvas.width / 2 - PLAT_W / 2) ];
        obstacles = [];
        clouds    = [];

        // Seed initial clouds
        for (let i = 0; i < 6; i++) clouds.push(makeCloud());

        // Generate platforms upward from start
        genTopY = startPlatY;
        generateAbove(startPlatY - canvas.height * 3);

        // Camera: player sits at ~70% from top
        cameraY = player.worldY - canvas.height * 0.65;
    }

    restartGame();

    // ── Draw HUD ───────────────────────────────────────────────────────────────
    function drawHUD() {
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.fillText(`${score}m`, 12, 28);
        ctx.textAlign = 'right';
        ctx.fillText(`Best: ${highScore}m`, canvas.width - 12, 28);

        // On-screen touch buttons hint
        if ('ontouchstart' in window) {
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#333';
            ctx.fillRect(0, canvas.height - 80, canvas.width / 2, 80);
            ctx.fillRect(canvas.width / 2, canvas.height - 80, canvas.width / 2, 80);
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('◀', canvas.width / 4, canvas.height - 28);
            ctx.fillText('▶', canvas.width * 3 / 4, canvas.height - 28);
            ctx.globalAlpha = 1;
        }
    }

    // ── Draw Game Over ─────────────────────────────────────────────────────────
    function drawGameOver() {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2, cy = canvas.height / 2;

        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText('GAME OVER', cx, cy - 70);

        ctx.font = '24px sans-serif';
        ctx.fillText(`You reached ${score}m`, cx, cy - 20);

        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = '#ffd54f';
        ctx.fillText(`Best: ${highScore}m`, cx, cy + 20);

        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#ddd';
        ctx.fillText('Press Space / Enter / Tap to play again', cx, cy + 68);
    }

    // ── Update ─────────────────────────────────────────────────────────────────
    function update() {
        if (gameState !== 'playing') return;

        // ── Horizontal movement ──
        let moving = false;
        if (keys['ArrowLeft']  || keys['KeyA'] || touchLeft)  { player.vx = -PLAYER_SPEED_X; moving = true; }
        if (keys['ArrowRight'] || keys['KeyD'] || touchRight) { player.vx =  PLAYER_SPEED_X; moving = true; }
        if (!moving) player.vx *= 0.75; // friction

        player.x += player.vx;

        // Wrap horizontally
        if (player.x + PLAYER_W < 0) player.x = canvas.width;
        if (player.x > canvas.width)  player.x = -PLAYER_W;

        // ── Gravity ──
        player.vy += GRAVITY;
        player.worldY += player.vy;

        // ── Platform collision (only when falling down: vy > 0) ──
        if (player.vy > 0) {
            for (const p of platforms) {
                const playerFeet = player.worldY + PLAYER_H;
                const prevFeet   = playerFeet - player.vy;
                const onX = player.x + PLAYER_W > p.x && player.x < p.x + p.w;
                const crossedTop = prevFeet <= p.worldY && playerFeet >= p.worldY;
                if (onX && crossedTop) {
                    player.worldY = p.worldY - PLAYER_H;
                    player.vy = jumpVy;
                    // Play boing
                    try {
                        boingAudio.currentTime = 0;
                        boingAudio.play().catch(() => {});
                    } catch (_) {}
                    break;
                }
            }
        }

        // ── Obstacle collision ──
        for (const o of obstacles) {
            const cx = player.x + PLAYER_W / 2;
            const cy = player.worldY + PLAYER_H / 2;
            const dx = cx - o.x, dy = cy - o.worldY;
            if (Math.sqrt(dx * dx + dy * dy) < o.r + Math.min(PLAYER_W, PLAYER_H) * 0.38) {
                triggerGameOver();
                return;
            }
        }

        // ── Track peak (highest world Y = lowest number) ──
        if (player.worldY < peakWorldY) peakWorldY = player.worldY;
        score = Math.max(0, Math.floor((startWorldY - peakWorldY) * METERS_PER_PX));
        if (score > highScore) highScore = score;

        // ── Camera: follow player up; can follow down but not below startCameraY ──
        const targetCamY = player.worldY - canvas.height * 0.65;
        const startCameraY = startWorldY - canvas.height * 0.65;

        if (targetCamY < cameraY) {
            // Player went up – snap camera up
            cameraY = targetCamY;
        } else if (targetCamY > cameraY) {
            // Player falling – follow down, but not past start
            cameraY = Math.min(targetCamY, startCameraY);
        }

        // ── Game over: fell below start ──
        if (player.worldY + PLAYER_H > startWorldY + 60) {
            triggerGameOver();
            return;
        }

        // ── Cull off-screen platforms / obstacles (well below camera) ──
        const cullY = cameraY + canvas.height + 200;
        platforms = platforms.filter(p => p.worldY < cullY);
        obstacles = obstacles.filter(o => o.worldY < cullY);

        // ── Generate more world above ──
        generateAbove(cameraY - canvas.height);

        // ── Drift clouds ──
        for (const c of clouds) {
            c.x += c.speed;
            if (c.x > canvas.width + c.w) c.x = -c.w;
        }

        // Spawn new clouds as camera moves up
        if (clouds.every(c => toScreenY(c.worldY) > -50)) {
            clouds.push(makeCloud(cameraY - 50));
        }
        clouds = clouds.filter(c => toScreenY(c.worldY) < canvas.height + 100);
    }

    function triggerGameOver() {
        gameState = 'gameover';
    }

    // ── Draw ───────────────────────────────────────────────────────────────────
    function draw() {
        // Background gradient: sky blue
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#64b5f6');
        grad.addColorStop(1, '#bbdefb');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clouds
        for (const c of clouds) drawCloud(c);

        // Starting line (thin, subtle)
        const startLineY = toScreenY(startWorldY);
        if (startLineY >= 0 && startLineY <= canvas.height) {
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(0, startLineY);
            ctx.lineTo(canvas.width, startLineY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Platforms
        for (const p of platforms) {
            const sy = toScreenY(p.worldY);
            if (sy > canvas.height + 10 || sy < -PLAT_H - 10) continue;
            drawPlatform(p);
        }

        // Obstacles
        for (const o of obstacles) {
            const sy = toScreenY(o.worldY);
            if (sy > canvas.height + 10 || sy < -OBS_RADIUS * 2 - 10) continue;
            drawObstacle(o);
        }

        // Player
        const px = toScreenX(player.x), py = toScreenY(player.worldY);
        if (imgs.player_sprite.complete && imgs.player_sprite.naturalWidth > 0) {
            ctx.drawImage(imgs.player_sprite, px, py, PLAYER_W, PLAYER_H);
        } else {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(px, py, PLAYER_W, PLAYER_H);
        }

        drawHUD();

        if (gameState === 'gameover') drawGameOver();
    }

    // ── Loop ───────────────────────────────────────────────────────────────────
    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    loop();
})();
