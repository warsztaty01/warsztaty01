// ============================================================================
// NIESKOŃCZONY BIEGACZ - HTML5 Canvas + JavaScript
// Endless Runner Game with Double Jump, Crouching, Parallax Background
// ============================================================================

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// Make canvas focusable and focus on click so keyboard controls reliably work
canvas.addEventListener('click', () => canvas.focus());

// Game constants
const GRAVITY = 0.8;
const JUMP_STRENGTH = 12; // reduced so character doesn't jump to the ceiling
const GROUND_LEVEL = canvas.height - 60;
const BASE_GAME_SPEED = 8;
const OBSTACLE_SPAWN_RATE = 80; // frames between obstacles
const DEBUG_MODE = false; // Set to true to see hitboxes and debug info

// Audio Web Audio API (fallback if Web Audio not available)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = false;

// Simple sound generator
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

// Player sprite support: load an image named `player.png` in the project root.
// The loader removes near-white background pixels (simple background removal).
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
                // if pixel is near-white, make it transparent (threshold adjustable)
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0;
                }
            }
            tctx.putImageData(imgData, 0, 0);
        } catch (e) {
            // getImageData can throw if image tainted by CORS; fallback to raw image
            console.warn('Could not process image for background removal:', e);
        }
        playerSprite = new Image();
        playerSprite.onload = () => { playerSpriteLoaded = true; };
        playerSprite.src = tmp.toDataURL();
    };
    img.onerror = () => { console.warn('Player sprite not found at', src); };
    img.src = src;
}
// Try to load `player.png` automatically. Save attached image as `player.png` in project root.
loadPlayerSprite('player.png');

// ============================================================================
// PLAYER CLASS - Dinosaur-like character
// ============================================================================
class Player {
    constructor() {
        this.x = 50;
        this.y = GROUND_LEVEL;
        this.width = 45;
        this.height = 55;
        this.velocityY = 0;
        
        this.isJumping = false;
        this.jumpCount = 0; // 0 = on ground, 1 = first jump, 2 = double jump
        this.isCrouching = false;
        this.crouchHeight = 35;
        
        this.jumpHoldTime = 0;
        this.maxJumpHoldTime = 8; // frames to hold for max jump height (reduced)
        
        // Animation
        this.frameCounter = 0;
        this.animationFrame = 0;
    }
    
    update() {
        // Apply gravity
        this.velocityY += GRAVITY;
        this.y += this.velocityY;
        
        // Ground collision
        if (this.y >= GROUND_LEVEL) {
            this.y = GROUND_LEVEL;
            this.velocityY = 0;
            this.isJumping = false;
            this.jumpCount = 0;
        }
        
        // Ceiling collision
        if (this.y < 0) {
            this.y = 0;
            this.velocityY = 0;
        }
        
        // Animation update
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
            // initial jump impulse
            this.velocityY = -JUMP_STRENGTH;
            playSound(440, 0.1, 'sine');
        } else if (this.jumpCount < 2) {
            this.jumpCount = 2;
            this.jumpHoldTime = 0;
            // double jump impulse
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
        // top of sprite is at (this.y - h)
        const topY = this.y - h;
        return {
            x: this.x + 6,
            y: topY + (this.isCrouching ? 8 : 6),
            width: this.width - 12,
            height: h - (this.isCrouching ? 8 : 6)
        };
    }
    
    draw(ctx) {
        const hb = this.getHitbox();
        // If a player sprite is loaded, draw it (with transparent background)
        if (playerSpriteLoaded && playerSprite) {
            const drawH = this.isCrouching ? this.crouchHeight : this.height;
            // draw so the bottom of sprite touches the ground (this.y represents ground Y)
            ctx.drawImage(playerSprite, this.x, this.y - drawH, this.width, drawH);
            if (DEBUG_MODE) {
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
            }
            return;
        }
        
        if (this.isCrouching) {
            // Crouching dinosaur
            ctx.fillStyle = '#FF6B35';
            ctx.fillRect(this.x, this.y + 20, this.width, this.crouchHeight - 20);
            
            // Head
            ctx.fillStyle = '#FF6B35';
            ctx.fillRect(this.x + 30, this.y + 18, 15, 18);
            
            // Snout
            ctx.fillStyle = '#FF8C42';
            ctx.fillRect(this.x + 45, this.y + 22, 8, 6);
            
            // Eye
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 38, this.y + 20, 4, 4);
        } else {
            // Standing dinosaur with running animation
            ctx.fillStyle = '#FF6B35';
            
            // Body
            ctx.fillRect(this.x + 5, this.y + 15, this.width - 10, 30);
            
            // Neck
            ctx.fillRect(this.x + 20, this.y + 8, 8, 7);
            
            // Head
            ctx.fillStyle = '#FF6B35';
            ctx.fillRect(this.x + 15, this.y, 18, 15);
            
            // Snout
            ctx.fillStyle = '#FF8C42';
            ctx.fillRect(this.x + 33, this.y + 4, 10, 7);
            
            // Eye
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 28, this.y + 2, 4, 4);
            
            // Back leg (animated)
            ctx.fillStyle = '#FF6B35';
            const backLegOffset = this.animationFrame === 0 ? 8 : -4;
            ctx.fillRect(this.x + 12, this.y + 42, 5, 18 + backLegOffset);
            
            // Front leg (animated)
            const frontLegOffset = this.animationFrame === 0 ? -4 : 8;
            ctx.fillRect(this.x + 30, this.y + 42, 5, 18 + frontLegOffset);
            
            // Tail
            ctx.strokeStyle = '#FF6B35';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.quadraticCurveTo(this.x + 40, this.y + 20, this.x + 55, this.y + 10);
            ctx.stroke();
        }
        
        // Draw hitbox if in debug mode
        if (DEBUG_MODE) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
        }
    }
}

// ============================================================================
// OBSTACLE CLASS - Different types of obstacles
// ============================================================================
class Obstacle {
    constructor(type = 'low') {
        this.x = canvas.width;
        this.type = type; // 'cactus_low', 'cactus_high', 'bird'
        this.width = 25;
        this.speed = BASE_GAME_SPEED;
        
        // Set Y position and height based on type
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
        
        // Bird wing animation
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
            // Low cactus
            ctx.fillStyle = '#2d5016';
            ctx.fillRect(this.x + 8, this.y + 20, 4, 25);
            
            // Arms
            ctx.fillRect(this.x + 2, this.y + 25, 6, 3);
            ctx.fillRect(this.x + 16, this.y + 25, 6, 3);
            
            // Spikes
            ctx.fillStyle = '#1a3d0a';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(this.x + 5, this.y + 22 + i * 5, 3, 2);
                ctx.fillRect(this.x + 16, this.y + 22 + i * 5, 3, 2);
            }
        } else if (this.type === 'cactus_high') {
            // Double cactus (high)
            ctx.fillStyle = '#2d5016';
            
            // Left cactus
            ctx.fillRect(this.x + 3, this.y + 10, 4, 55);
            // Right cactus
            ctx.fillRect(this.x + 15, this.y, 4, 65);
            
            // Arms
            ctx.fillRect(this.x - 3, this.y + 25, 8, 3);
            ctx.fillRect(this.x + 11, this.y + 20, 8, 3);
            
            // Spikes
            ctx.fillStyle = '#1a3d0a';
            for (let i = 0; i < 7; i++) {
                ctx.fillRect(this.x + 1, this.y + 12 + i * 7, 3, 2);
                ctx.fillRect(this.x + 13, this.y + 2 + i * 7, 3, 2);
            }
        } else if (this.type === 'bird') {
            // Bird (pterodactyl-like)
            ctx.fillStyle = '#8B4513';
            
            // Body
            ctx.beginPath();
            ctx.ellipse(this.x + 20, this.y + 12, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Head
            ctx.fillStyle = '#A0522D';
            ctx.beginPath();
            ctx.arc(this.x + 32, this.y + 8, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + 34, this.y + 6, 3, 3);
            
            // Beak
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.moveTo(this.x + 38, this.y + 9);
            ctx.lineTo(this.x + 48, this.y + 8);
            ctx.lineTo(this.x + 38, this.y + 10);
            ctx.closePath();
            ctx.fill();
            
            // Wings (animated)
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            
            if (this.wingFrame === 0) {
                // Wings up
                ctx.beginPath();
                ctx.arc(this.x + 20, this.y + 8, 12, Math.PI * 0.3, Math.PI * 0.7);
                ctx.stroke();
            } else {
                // Wings down
                ctx.beginPath();
                ctx.arc(this.x + 20, this.y + 16, 12, Math.PI * 0.3, Math.PI * 0.7);
                ctx.stroke();
            }
        }
        
        // Draw hitbox if in debug mode
        if (DEBUG_MODE) {
            const hb = this.getHitbox();
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
        }
    }
}

// ============================================================================
// PARALLAX LAYER CLASS - Scrolling background
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
        
        // Wrap around for seamless looping
        if (this.offset <= -this.width) {
            this.offset = 0;
        }
    }
    
    draw(ctx) {
        if (this.groundLevel) {
            // Ground/terrain layer
            ctx.fillStyle = this.color;
            ctx.fillRect(this.offset, GROUND_LEVEL, this.width, canvas.height - GROUND_LEVEL);
            ctx.fillRect(this.offset + this.width, GROUND_LEVEL, this.width, canvas.height - GROUND_LEVEL);
            
            // Add detail pattern to ground
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            for (let i = 0; i < 20; i++) {
                ctx.fillRect(
                    this.offset + i * 40,
                    GROUND_LEVEL + 10,
                    20,
                    2
                );
            }
        } else {
            // Sky/background layers
            ctx.fillStyle = this.color;
            ctx.fillRect(this.offset, 0, this.width, GROUND_LEVEL);
            ctx.fillRect(this.offset + this.width, 0, this.width, GROUND_LEVEL);
        }
    }
}

// ============================================================================
// GAME MANAGER - Main game state and logic
// ============================================================================
class GameManager {
    constructor() {
        this.state = 'menu'; // 'menu', 'playing', 'paused', 'gameOver'
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.distance = 0;
        this.gameSpeed = 1.0; // Debug feature
        
            // Difficulty progression
            this.gameTime = 0;
            this.speedMultiplier = 1.0;
        
        // Initialize game entities
        this.player = new Player();
        this.obstacles = [];
        this.obstacleSpawnCounter = 0;
        
        // Parallax layers (speedMultiplier, color)
        this.layers = [
            new ParallaxLayer(0.1, '#e8d5c4', false), // Far background (desert haze)
            new ParallaxLayer(0.3, '#e0d4a8', false), // Dunes
            new ParallaxLayer(0.6, '#d4c896', false), // Sand ripples
            new ParallaxLayer(1.0, '#c2ad7f', true)   // Ground sand
        ];
        
        // Input handling
        this.keys = {};
        this.setupKeyBindings();
    }
    
    setupKeyBindings() {
        document.addEventListener('keydown', (e) => {
            const key = (e.key || '').toLowerCase();
            const code = e.code || '';

            // normalize storage for space key
            if (code === 'Space') {
                this.keys['space'] = true;
            } else {
                this.keys[key] = true;
            }

            // Jump keys (Space, W, ArrowUp)
            if (code === 'Space' || key === 'w' || key === 'arrowup') {
                e.preventDefault();
                if (this.state === 'playing') {
                    this.player.startJump();
                } else if (this.state === 'menu') {
                    // start game from menu with Space
                    this.reset();
                    this.state = 'playing';
                }
            }

            // Crouch keys (S or ArrowDown)
            if (key === 's' || key === 'arrowdown' || code === 'ArrowDown') {
                e.preventDefault();
                if (this.state === 'playing') {
                    this.player.setCrouching(true);
                }
            }

            // Pause
            if (key === 'p') {
                if (this.state === 'playing') this.state = 'paused';
                else if (this.state === 'paused') this.state = 'playing';
            }

            // Restart
            if (key === 'r') {
                if (this.state === 'gameOver' || this.state === 'menu') {
                    this.reset();
                    this.state = 'playing';
                }
            }

            // Mute sound
            if (key === 'm') isMuted = !isMuted;

            // Debug: Speed adjustment
            if (e.key === '[') this.gameSpeed = Math.max(0.2, this.gameSpeed - 0.1);
            if (e.key === ']') this.gameSpeed = Math.min(2.0, this.gameSpeed + 0.1);
        });

        document.addEventListener('keyup', (e) => {
            const key = (e.key || '').toLowerCase();
            const code = e.code || '';

            if (code === 'Space') this.keys['space'] = false;
            else this.keys[key] = false;

            // Release jump
            if (code === 'Space' || key === 'w' || key === 'arrowup') {
                if (this.state === 'playing') this.player.releaseJump();
            }

            // Crouch release
            if (key === 's' || key === 'arrowdown' || code === 'ArrowDown') {
                if (this.state === 'playing') this.player.setCrouching(false);
            }
        });
    }
    
    update() {
        if (this.state === 'playing') {
            // Apply game speed multiplier (for debug)
            const speedFactor = this.gameSpeed;
                        // Increase difficulty over time
                        this.gameTime++;
                        this.speedMultiplier = 1.0 + (this.gameTime * 0.0002); // Slowly increase speed
            
            
            // Update player
            this.player.update();
            
            // Check if jump key is being held (keys map uses normalized 'space')
            if (this.keys['space'] || this.keys['w'] || this.keys['arrowup']) {
                this.player.holdJump();
            }
            
            // Update parallax layers
            this.layers.forEach(layer => layer.update());
            
                        // Update difficulty multiplier for all layers
                        this.layers.forEach(layer => layer.difficultyMultiplier = this.speedMultiplier);
            
            // Spawn obstacles randomly
            this.obstacleSpawnCounter++;
            // Difficulty: spawn obstacles more frequently as game progresses
            const adjustedSpawnRate = Math.max(40, OBSTACLE_SPAWN_RATE - (this.gameTime / 500));
            if (this.obstacleSpawnCounter > adjustedSpawnRate) {
                const types = ['cactus_low', 'cactus_high', 'bird'];
                const randomType = types[Math.floor(Math.random() * types.length)];
                const obstacle = new Obstacle(randomType);
                obstacle.speed = BASE_GAME_SPEED * this.speedMultiplier;
                this.obstacles.push(obstacle);
                this.obstacleSpawnCounter = 0;
            }
            
            // Update obstacles
            this.obstacles.forEach(obstacle => {
                obstacle.speed = BASE_GAME_SPEED * this.speedMultiplier;
                obstacle.update();
            });
            
            // Remove off-screen obstacles
            this.obstacles = this.obstacles.filter(obs => !obs.isOffScreen());
            
            // Collision detection
            this.checkCollisions();
            
            // Update score (distance-based) scaled by difficulty/speedMultiplier
            this.distance += BASE_GAME_SPEED * this.speedMultiplier * speedFactor * 0.01;
            this.score = Math.floor(this.distance);
            
            // Speed increase over time (optional progressive difficulty)
            // BASE_GAME_SPEED is constant, but you could modify it here
        }
    }
    
    // Axis-Aligned Bounding Box (AABB) collision detection
    checkCollisions() {
        const playerHB = this.player.getHitbox();
        
        for (let obstacle of this.obstacles) {
            const obstacleHB = obstacle.getHitbox();
            
            // AABB collision check
            if (playerHB.x < obstacleHB.x + obstacleHB.width &&
                playerHB.x + playerHB.width > obstacleHB.x &&
                playerHB.y < obstacleHB.y + obstacleHB.height &&
                playerHB.y + playerHB.height > obstacleHB.y) {
                
                // Collision detected!
                playSound(200, 0.2, 'sine'); // Collision sound (low frequency)
                this.endGame();
                break; // Exit loop after collision
            }
        }
    }
    
    endGame() {
        if (this.state !== 'gameOver') { // Prevent multiple calls
            this.state = 'gameOver';
            
            // Update high score
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('highScore', this.highScore);
            }
        }
    }
    
    reset() {
            this.gameTime = 0;
            this.speedMultiplier = 1.0;
        this.score = 0;
        this.distance = 0;
        this.player = new Player();
        this.obstacles = [];
        this.obstacleSpawnCounter = 0;
        this.layers.forEach(layer => layer.offset = 0);
    }
    
    draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw sun
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(canvas.width - 80, 50, 40, 0, Math.PI * 2);
            ctx.fill();
        
        
        // Draw parallax layers
        this.layers.forEach(layer => layer.draw(ctx));
        
        // Draw obstacles
        this.obstacles.forEach(obs => obs.draw(ctx));
        
        // Draw player
        this.player.draw(ctx);
        
        // Draw HUD
        this.drawHUD();
        
        // Draw game state UI
        if (this.state === 'menu') {
            this.drawMenu();
        } else if (this.state === 'paused') {
            this.drawPause();
        } else if (this.state === 'gameOver') {
            this.drawGameOver();
        }
        
        // Debug info
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
        
        // Draw speed multiplier in top right
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
        ctx.fillText('🦖 PREHISTORIC RUNNER 🦖', canvas.width / 2, canvas.height / 2 - 80);
        
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

// Start the game
gameLoop();
