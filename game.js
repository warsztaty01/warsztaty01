// ============================================================================
// ENDLESS RUNNER - HTML5 Canvas + JavaScript
// Endless Runner Game with Double Jump, Crouching, Parallax Background
// ============================================================================

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.addEventListener('click', () => canvas.focus());

// Game constants
const GRAVITY = 0.8;
const JUMP_STRENGTH = 12;
const GROUND_LEVEL = canvas.height - 60;
const BASE_GAME_SPEED = 8;
const OBSTACLE_SPAWN_RATE = 80;
const DEBUG_MODE = false;

// Audio Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = false;

const playSound = (frequency, duration, type = 'sine') => {
    if (isMuted) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Audio not available:', e);
    }
};

// Player sprite support
let playerSprite = null;
let playerSpriteLoaded = false;
function loadPlayerSprite(src) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const tmp = document.createElement('canvas');
        tmp.width = img.width;
        tmp.height = img.height;
        const tctx = tmp.getContext('2d');
        tctx.drawImage(img, 0, 0);
        try {
            const imgData = tctx.getImageData(0, 0, tmp.width, tmp.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0;
                }
            }
            tctx.putImageData(imgData, 0, 0);
        } catch (e) {
            console.warn('Could not process image for background removal:', e);
        }
        playerSprite = new Image();
        playerSprite.onload = () => { playerSpriteLoaded = true; };
        playerSprite.src = tmp.toDataURL();
    };
    img.onerror = () => { console.warn('Player sprite not found at', src); };
    img.src = src;
}
loadPlayerSprite('player.png');

// File upload handler
function setupSpriteUpload() {
    const input = document.getElementById('spriteUpload');
    if (!input) return;
    input.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            loadPlayerSprite(reader.result);
        };
        reader.readAsDataURL(f);
    });
}
window.addEventListener('load', setupSpriteUpload);

// ============================================================================
// PLAYER CLASS
// ============================================================================
class Player {
    constructor() {
        this.x = 50;
        this.y = GROUND_LEVEL;
        this.width = 45;
        this.height = 55;
        this.velocityY = 0;
        this.isJumping = false;
        this.jumpCount = 0;
        this.isCrouching = false;
        this.crouchHeight = 35;
        this.jumpHoldTime = 0;
        this.maxJumpHoldTime = 8;
        this.frameCounter = 0;
        this.animationFrame = 0;
    }
    
    update() {
        this.velocityY += GRAVITY;
        this.y += this.velocityY;
        
        if (this.y >= GROUND_LEVEL) {
            this.y = GROUND_LEVEL;
            this.velocityY = 0;
            this.isJumping = false;
            this.jumpCount = 0;
        }
        
        if (this.y < 0) {
            this.y = 0;
            this.velocityY = 0;
        }
        
        if (!this.isJumping && !this.isCrouching) {
            this.frameCounter++;
            if (this.frameCounter > 4) {
                this.animationFrame = (this.animationFrame + 1) % 2;
                this.frameCounter = 0;
            }
        } else {
            this.animationFrame = 0;
        }
    }
    
    startJump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpCount = 1;
            this.jumpHoldTime = 0;
            this.velocityY = -JUMP_STRENGTH;
            playSound(440, 0.1, 'sine');
        } else if (this.jumpCount < 2) {
            this.jumpCount = 2;
            this.jumpHoldTime = 0;
            this.velocityY = -JUMP_STRENGTH;
            playSound(600, 0.1, 'sine');
        }
    }
    
    holdJump() {
        if (this.isJumping && this.jumpHoldTime < this.maxJumpHoldTime) {
            this.jumpHoldTime++;
            this.velocityY = -JUMP_STRENGTH * (1 + this.jumpHoldTime / this.maxJumpHoldTime);
        }
    }
    
    releaseJump() {
        this.jumpHoldTime = this.maxJumpHoldTime;
    }
    
    setCrouching(crouch) {
        if (!this.isJumping) {
            this.isCrouching = crouch;
        }
    }
    
    getHitbox() {
        const h = this.isCrouching ? this.crouchHeight : this.height;
        return {
            x: this.x + 8,
            y: this.y + (this.isCrouching ? 20 : 0),
            width: this.width - 16,
            height: h - (this.isCrouching ? 20 : 0)
        };
    }
    
    draw(ctx) {
        const hb = this.getHitbox();
        
        // If sprite loaded, draw it
        if (playerSpriteLoaded && playerSprite) {
            const drawH = this.isCrouching ? this.crouchHeight : this.height;
            ctx.drawImage(playerSprite, this.x, this.y - drawH, this.width, drawH);
            if (DEBUG_MODE) {
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
            }
            return;
        }
        
        // Fallback: simple dinosaur vector drawing
        if (this.isCrouching) {
            ctx.fillStyle = '#FF6B35';
            ctx.fillRect(this.x, this.y + 20, this.width, this.crouchHeight - 20);
            ctx.fillStyle = '#FF6B35';
            ctx.fillRect(this.x + 30, this.y + 18, 15, 18);
            ctx.fillStyle = '#FF8C42';
            ctx.fillRect(this.x + 45, this.y + 22, 8, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 38, this.y + 20, 4, 4);
        } else {
            ctx.fillStyle = '#FF6B35';
            ctx.fillRect(this.x + 5, this.y - 30, this.width - 10, 30);
            ctx.fillRect(this.x + 20, this.y - 37, 8, 7);
            ctx.fillStyle = '#FF6B35';
            ctx.fillRect(this.x + 15, this.y - 45, 18, 15);
            ctx.fillStyle = '#FF8C42';
            ctx.fillRect(this.x + 33, this.y - 41, 10, 7);
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 28, this.y - 43, 4, 4);
            
            ctx.fillStyle = '#FF6B35';
            const backLegOffset = this.animationFrame === 0 ? 8 : -4;
            ctx.fillRect(this.x + 12, this.y - 8, 5, 18 + backLegOffset);
            const frontLegOffset = this.animationFrame === 0 ? -4 : 8;
            ctx.fillRect(this.x + 30, this.y - 8, 5, 18 + frontLegOffset);
            
            ctx.strokeStyle = '#FF6B35';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.quadraticCurveTo(this.x + 40, this.y - 25, this.x + 55, this.y - 35);
            ctx.stroke();
        }
        
        if (DEBUG_MODE) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
        }
    }
}

// ============================================================================
// OBSTACLE CLASS
// ============================================================================
class Obstacle {
    constructor(type = 'low') {
        this.x = canvas.width;
        this.type = type;
        this.width = 25;
        this.speed = BASE_GAME_SPEED;
        
        if (type === 'cactus_low') {
            this.y = GROUND_LEVEL + 10;
            this.height = 45;
            this.width = 20;
        } else if (type === 'cactus_high') {
            this.y = GROUND_LEVEL - 20;
            this.height = 70;
            this.width = 22;
        } else if (type === 'bird') {
            this.y = GROUND_LEVEL - 40;
            this.height = 25;
            this.width = 50;
            this.wingFrame = 0;
            this.wingCounter = 0;
        }
    }
    
    update() {
        this.x -= this.speed;
        
        if (this.type === 'bird') {
            this.wingCounter++;
            if (this.wingCounter > 3) {
                this.wingFrame = (this.wingFrame + 1) % 2;
                this.wingCounter = 0;
            }
        }
    }
    
    getHitbox() {
        return {
            x: this.x + 2,
            y: this.y,
            width: this.width - 4,
            height: this.height
        };
    }
    
    isOffScreen() {
        return this.x + this.width < 0;
    }
    
    draw(ctx) {
        if (this.type === 'cactus_low') {
            ctx.fillStyle = '#2d5016';
            ctx.fillRect(this.x + 8, this.y + 20, 4, 25);
            ctx.fillRect(this.x + 2, this.y + 25, 6, 3);
            ctx.fillRect(this.x + 16, this.y + 25, 6, 3);
        } else if (this.type === 'cactus_high') {
            ctx.fillStyle = '#2d5016';
            ctx.fillRect(this.x + 3, this.y + 10, 4, 55);
            ctx.fillRect(this.x + 15, this.y, 4, 65);
            ctx.fillRect(this.x - 3, this.y + 25, 8, 3);
            ctx.fillRect(this.x + 11, this.y + 20, 8, 3);
        } else if (this.type === 'bird') {
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(this.x + 20, this.y + 12, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#A0522D';
            ctx.beginPath();
            ctx.arc(this.x + 32, this.y + 8, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 34, this.y + 6, 3, 3);
        }
        
        if (DEBUG_MODE) {
            const hb = this.getHitbox();
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
        }
    }
}

// ============================================================================
// PARALLAX LAYER CLASS
// ============================================================================
class ParallaxLayer {
    constructor(speedMultiplier, color, groundLevel = true) {
        this.speedMultiplier = speedMultiplier;
        this.color = color;
        this.groundLevel = groundLevel;
        this.offset = 0;
        this.width = canvas.width;
        this.difficultyMultiplier = 1.0;
    }
    
    update() {
        this.offset -= BASE_GAME_SPEED * this.speedMultiplier * this.difficultyMultiplier;
        
        if (this.offset <= -this.width) {
            this.offset = 0;
        }
    }
    
    draw(ctx) {
        if (this.groundLevel) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.offset, GROUND_LEVEL, this.width, canvas.height - GROUND_LEVEL);
            ctx.fillRect(this.offset + this.width, GROUND_LEVEL, this.width, canvas.height - GROUND_LEVEL);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.offset, 0, this.width, GROUND_LEVEL);
            ctx.fillRect(this.offset + this.width, 0, this.width, GROUND_LEVEL);
        }
    }
}

// ============================================================================
// GAME MANAGER
// ============================================================================
class GameManager {
    constructor() {
        this.state = 'menu';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.distance = 0;
        this.gameSpeed = 1.0;
        this.gameTime = 0;
        this.speedMultiplier = 1.0;
        
        this.player = new Player();
        this.obstacles = [];
        this.obstacleSpawnCounter = 0;
        
        this.layers = [
            new ParallaxLayer(0.1, '#e8d5c4', false),
            new ParallaxLayer(0.3, '#e0d4a8', false),
            new ParallaxLayer(0.6, '#d4c896', false),
            new ParallaxLayer(1.0, '#c2ad7f', true)
        ];
        
        this.keys = {};
        this.setupKeyBindings();
    }
    
    setupKeyBindings() {
        document.addEventListener('keydown', (e) => {
            const key = (e.key || '').toLowerCase();
            const code = e.code || '';

            if (code === 'Space') {
                this.keys['space'] = true;
            } else {
                this.keys[key] = true;
            }

            if (code === 'Space' || key === 'w' || key === 'arrowup') {
                e.preventDefault();
                if (this.state === 'playing') {
                    this.player.startJump();
                } else if (this.state === 'menu') {
                    this.reset();
                    this.state = 'playing';
                }
            }

            if (key === 's' || key === 'arrowdown' || code === 'ArrowDown') {
                e.preventDefault();
                if (this.state === 'playing') {
                    this.player.setCrouching(true);
                }
            }

            if (key === 'p') {
                if (this.state === 'playing') this.state = 'paused';
                else if (this.state === 'paused') this.state = 'playing';
            }

            if (key === 'r') {
                if (this.state === 'gameOver' || this.state === 'menu') {
                    this.reset();
                    this.state = 'playing';
                }
            }

            if (key === 'm') isMuted = !isMuted;

            if (e.key === '[') this.gameSpeed = Math.max(0.2, this.gameSpeed - 0.1);
            if (e.key === ']') this.gameSpeed = Math.min(2.0, this.gameSpeed + 0.1);
        });

        document.addEventListener('keyup', (e) => {
            const key = (e.key || '').toLowerCase();
            const code = e.code || '';

            if (code === 'Space') this.keys['space'] = false;
            else this.keys[key] = false;

            if (code === 'Space' || key === 'w' || key === 'arrowup') {
                if (this.state === 'playing') this.player.releaseJump();
            }

            if (key === 's' || key === 'arrowdown' || code === 'ArrowDown') {
                if (this.state === 'playing') this.player.setCrouching(false);
            }
        });
    }
    
    update() {
        if (this.state === 'playing') {
            const speedFactor = this.gameSpeed;
            
            this.gameTime++;
            this.speedMultiplier = 1.0 + (this.gameTime * 0.0002);
            
            this.player.update();
            
            if (this.keys['space'] || this.keys['w'] || this.keys['arrowup']) {
                this.player.holdJump();
            }
            
            this.layers.forEach(layer => layer.update());
            this.layers.forEach(layer => layer.difficultyMultiplier = this.speedMultiplier);
            
            this.obstacleSpawnCounter++;
            const adjustedSpawnRate = Math.max(40, OBSTACLE_SPAWN_RATE - (this.gameTime / 500));
            if (this.obstacleSpawnCounter > adjustedSpawnRate) {
                const types = ['cactus_low', 'cactus_high', 'bird'];
                const randomType = types[Math.floor(Math.random() * types.length)];
                const obstacle = new Obstacle(randomType);
                obstacle.speed = BASE_GAME_SPEED * this.speedMultiplier;
                this.obstacles.push(obstacle);
                this.obstacleSpawnCounter = 0;
            }
            
            this.obstacles.forEach(obstacle => {
                obstacle.speed = BASE_GAME_SPEED * this.speedMultiplier;
                obstacle.update();
            });
            
            this.obstacles = this.obstacles.filter(obs => !obs.isOffScreen());
            
            this.checkCollisions();
            
            this.distance += BASE_GAME_SPEED * this.speedMultiplier * speedFactor * 0.01;
            this.score = Math.floor(this.distance);
        }
    }
    
    checkCollisions() {
        const playerHB = this.player.getHitbox();
        
        for (let obstacle of this.obstacles) {
            const obstacleHB = obstacle.getHitbox();
            
            if (playerHB.x < obstacleHB.x + obstacleHB.width &&
                playerHB.x + playerHB.width > obstacleHB.x &&
                playerHB.y < obstacleHB.y + obstacleHB.height &&
                playerHB.y + playerHB.height > obstacleHB.y) {
                
                playSound(200, 0.2, 'sine');
                this.endGame();
                break;
            }
        }
    }
    
    endGame() {
        if (this.state !== 'gameOver') {
            this.state = 'gameOver';
            
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('highScore', this.highScore);
            }
        }
    }
    
    reset() {
        this.score = 0;
        this.distance = 0;
        this.gameTime = 0;
        this.speedMultiplier = 1.0;
        this.player = new Player();
        this.obstacles = [];
        this.obstacleSpawnCounter = 0;
        this.layers.forEach(layer => layer.offset = 0);
    }
    
    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(canvas.width - 80, 50, 40, 0, Math.PI * 2);
        ctx.fill();
        
        this.layers.forEach(layer => layer.draw(ctx));
        
        this.obstacles.forEach(obs => obs.draw(ctx));
        
        this.player.draw(ctx);
        
        this.drawHUD();
        
        if (this.state === 'menu') {
            this.drawMenu();
        } else if (this.state === 'paused') {
            this.drawPause();
        } else if (this.state === 'gameOver') {
            this.drawGameOver();
        }
        
        if (DEBUG_MODE) {
            this.drawDebugInfo();
        }
    }
    
    drawHUD() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 250, 80);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Distance: ${this.score}m`, 20, 35);
        ctx.fillText(`High Score: ${this.highScore}m`, 20, 60);
        ctx.fillText(`Muted: ${isMuted ? 'Yes' : 'No'}`, 20, 85);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(canvas.width - 200, 10, 190, 50);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`Speed: ${this.speedMultiplier.toFixed(2)}x`, canvas.width - 190, 35);
        ctx.fillText(`Difficulty: ${Math.floor(this.gameTime / 1000)}`, canvas.width - 190, 55);
    }
    
    drawMenu() {
        ctx.fillStyle = 'rgba(200, 180, 150, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#8B4513';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🦖 ENDLESS RUNNER 🦖', canvas.width / 2, canvas.height / 2 - 80);
        
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#5a3a1a';
        ctx.fillText('Naciśnij SPACE aby grać', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#333';
        ctx.fillText('Skok: Space/W/↑  |  Kucanie: S/↓  |  Pauza: P', canvas.width / 2, canvas.height / 2 + 60);
        
        ctx.textAlign = 'left';
    }
    
    drawPause() {
        ctx.fillStyle = 'rgba(200, 180, 150, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⏸ PAUZA ⏸', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#5a3a1a';
        ctx.fillText('Naciśnij P aby wznowić', canvas.width / 2, canvas.height / 2 + 60);
        
        ctx.textAlign = 'left';
    }
    
    drawGameOver() {
        ctx.fillStyle = 'rgba(100, 50, 50, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 52px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💀 GAME OVER 💀', canvas.width / 2, canvas.height / 2 - 60);
        
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Wynik: ${this.score}m`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText(`High Score: ${this.highScore}m`, canvas.width / 2, canvas.height / 2 + 50);
        
        ctx.font = '18px Arial';
        ctx.fillStyle = '#90EE90';
        ctx.fillText('Naciśnij R aby zagrać ponownie', canvas.width / 2, canvas.height / 2 + 110);
        
        ctx.textAlign = 'left';
    }
    
    drawDebugInfo() {
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        let y = 150;
        ctx.fillText(`Player Y: ${this.player.y.toFixed(2)}`, 10, y);
        y += 15;
        ctx.fillText(`Player VY: ${this.player.velocityY.toFixed(2)}`, 10, y);
        y += 15;
        ctx.fillText(`Jump Count: ${this.player.jumpCount}`, 10, y);
        y += 15;
        ctx.fillText(`Crouching: ${this.player.isCrouching}`, 10, y);
        y += 15;
        ctx.fillText(`Obstacles: ${this.obstacles.length}`, 10, y);
        y += 15;
        ctx.fillText(`Game Speed: ${this.gameSpeed.toFixed(1)}x`, 10, y);
    }
}

// ============================================================================
// MAIN GAME LOOP
// ============================================================================
const game = new GameManager();

function gameLoop() {
    game.update();
    game.draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
