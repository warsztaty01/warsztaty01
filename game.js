// ============================================================================
// NIESKOŃCZONY BIEGACZ - HTML5 Canvas + JavaScript
// Endless Runner Game with Double Jump, Crouching, Parallax Background
// ============================================================================

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.6;
const JUMP_STRENGTH = 15;
const GROUND_LEVEL = canvas.height - 80;
const BASE_GAME_SPEED = 6;
const OBSTACLE_SPAWN_RATE = 100; // frames between obstacles
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

// ============================================================================
// PLAYER CLASS
// ============================================================================
class Player {
    constructor() {
        this.x = 50;
        this.y = GROUND_LEVEL;
        this.width = 30;
        this.height = 50;
        this.velocityY = 0;
        this.velocityX = 0;
        
        this.isJumping = false;
        this.jumpCount = 0; // 0 = on ground, 1 = first jump, 2 = double jump
        this.isCrouching = false;
        this.crouchHeight = 30; // Height when crouching
        
        this.jumpHoldTime = 0;
        this.maxJumpHoldTime = 15; // frames to hold for max jump height
    }
    
    // Update player physics - called each frame
    update() {
        // Apply gravity
        this.velocityY += GRAVITY;
        this.y += this.velocityY;
        
        // Ground collision - when player lands
        if (this.y >= GROUND_LEVEL) {
            this.y = GROUND_LEVEL;
            this.velocityY = 0;
            this.isJumping = false;
            this.jumpCount = 0; // Reset jump count when on ground
        }
        
        // Ceiling collision (prevent going above canvas)
        if (this.y < 0) {
            this.y = 0;
            this.velocityY = 0;
        }
    }
    
    // Initiate jump - called when player presses jump key
    startJump() {
        if (!this.isJumping) {
            // First jump from ground
            this.isJumping = true;
            this.jumpCount = 1;
            this.jumpHoldTime = 0;
            playSound(440, 0.1, 'sine'); // Jump sound
        } else if (this.jumpCount < 2) {
            // Double jump in air
            this.jumpCount = 2;
            this.jumpHoldTime = 0;
            this.velocityY = 0; // Reset velocity for second jump
            playSound(600, 0.1, 'sine'); // Double jump sound (higher pitch)
        }
    }
    
    // Called every frame while jump key is held
    holdJump() {
        if (this.isJumping && this.jumpHoldTime < this.maxJumpHoldTime) {
            this.jumpHoldTime++;
            // Jump velocity depends on hold time - longer hold = higher jump
            this.velocityY = -JUMP_STRENGTH * (1 + this.jumpHoldTime / this.maxJumpHoldTime);
        }
    }
    
    // Release jump key
    releaseJump() {
        this.jumpHoldTime = this.maxJumpHoldTime; // Stop accelerating upward
    }
    
    // Crouch mechanics
    setCrouching(crouch) {
        if (!this.isJumping) {
            this.isCrouching = crouch;
        }
    }
    
    // Get current hitbox (adjusted for crouching)
    getHitbox() {
        const h = this.isCrouching ? this.crouchHeight : this.height;
        return {
            x: this.x + 5,
            y: this.y,
            width: this.width - 10,
            height: h
        };
    }
    
    // Draw player on canvas
    draw(ctx) {
        const hb = this.getHitbox();
        
        // Draw player body
        ctx.fillStyle = '#00aa00';
        ctx.fillRect(this.x, this.y, this.width, this.isCrouching ? this.crouchHeight : this.height);
        
        // Draw eyes/face
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 8, this.y + 10, 6, 6);
        ctx.fillRect(this.x + 18, this.y + 10, 6, 6);
        
        // Draw smile when not crouching
        if (!this.isCrouching) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + 15, this.y + 25, 5, 0, Math.PI);
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
// OBSTACLE CLASS
// ============================================================================
class Obstacle {
    constructor(type = 'low') {
        this.x = canvas.width;
        this.type = type; // 'low', 'high', 'bird'
        this.width = 30;
        this.speed = BASE_GAME_SPEED;
        
        // Set Y position and height based on type
        if (type === 'low') {
            this.y = GROUND_LEVEL + 20;
            this.height = 30;
        } else if (type === 'high') {
            this.y = GROUND_LEVEL - 40;
            this.height = 40;
        } else if (type === 'bird') {
            this.y = GROUND_LEVEL - 60;
            this.height = 20;
            this.width = 40;
        }
    }
    
    update() {
        this.x -= this.speed;
    }
    
    // Get hitbox for collision detection
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    // Check if obstacle is off-screen (left side)
    isOffScreen() {
        return this.x + this.width < 0;
    }
    
    draw(ctx) {
        if (this.type === 'low') {
            // Low obstacle (box on ground)
            ctx.fillStyle = '#cc4400';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#882200';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else if (this.type === 'high') {
            // High obstacle (tall structure)
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#cc4400';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            // Add pattern
            ctx.strokeStyle = '#333333';
            for (let i = 0; i < this.height; i += 10) {
                ctx.strokeRect(this.x + 5, this.y + i, this.width - 10, 8);
            }
        } else if (this.type === 'bird') {
            // Bird (flying obstacle)
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x + 10, this.y + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            // Wings
            ctx.fillStyle = '#dd0000';
            ctx.beginPath();
            ctx.ellipse(this.x + 5, this.y + 10, 6, 3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(this.x + 15, this.y + 10, 6, 3, 0.3, 0, Math.PI * 2);
            ctx.fill();
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
    }
    
    update() {
        this.offset -= BASE_GAME_SPEED * this.speedMultiplier;
        
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
        
        // Initialize game entities
        this.player = new Player();
        this.obstacles = [];
        this.obstacleSpawnCounter = 0;
        
        // Parallax layers (speedMultiplier, color)
        this.layers = [
            new ParallaxLayer(0.2, '#87ceeb', false), // Far background (sky)
            new ParallaxLayer(0.4, '#e0d4a8', false), // Mountains/clouds
            new ParallaxLayer(0.7, '#90ee90', false), // Hills
            new ParallaxLayer(1.0, '#228b22', true)   // Ground
        ];
        
        // Input handling
        this.keys = {};
        this.setupKeyBindings();
    }
    
    setupKeyBindings() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Jump keys
            if ([' ', 'w', 'W', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                if (this.state === 'playing') {
                    this.player.startJump();
                }
            }
            
            // Crouch keys
            if (['s', 'S', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                if (this.state === 'playing') {
                    this.player.setCrouching(true);
                }
            }
            
            // Pause
            if (e.key.toLowerCase() === 'p') {
                if (this.state === 'playing') {
                    this.state = 'paused';
                } else if (this.state === 'paused') {
                    this.state = 'playing';
                }
            }
            
            // Restart
            if (e.key.toLowerCase() === 'r') {
                if (this.state === 'gameOver' || this.state === 'menu') {
                    this.reset();
                    this.state = 'playing';
                }
            }
            
            // Mute sound
            if (e.key.toLowerCase() === 'm') {
                isMuted = !isMuted;
            }
            
            // Debug: Speed adjustment
            if (e.key === '[') {
                this.gameSpeed = Math.max(0.2, this.gameSpeed - 0.1);
            }
            if (e.key === ']') {
                this.gameSpeed = Math.min(2.0, this.gameSpeed + 0.1);
            }
            
            // Start game from menu
            if (this.state === 'menu' && e.key === ' ') {
                e.preventDefault();
                this.state = 'playing';
                this.reset();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            
            // Release jump
            if ([' ', 'w', 'W', 'ArrowUp'].includes(e.key)) {
                if (this.state === 'playing') {
                    this.player.releaseJump();
                }
            }
            
            // Crouch release
            if (['s', 'S', 'ArrowDown'].includes(e.key)) {
                if (this.state === 'playing') {
                    this.player.setCrouching(false);
                }
            }
        });
    }
    
    update() {
        if (this.state === 'playing') {
            // Apply game speed multiplier (for debug)
            const speedFactor = this.gameSpeed;
            
            // Update player
            this.player.update();
            
            // Check if jump key is being held
            if (this.keys[' '] || this.keys['w'] || this.keys['W'] || this.keys['arrowup']) {
                this.player.holdJump();
            }
            
            // Update parallax layers
            this.layers.forEach(layer => layer.update());
            
            // Spawn obstacles randomly
            this.obstacleSpawnCounter++;
            if (this.obstacleSpawnCounter > OBSTACLE_SPAWN_RATE) {
                const types = ['low', 'high', 'bird'];
                const randomType = types[Math.floor(Math.random() * types.length)];
                this.obstacles.push(new Obstacle(randomType));
                this.obstacleSpawnCounter = 0;
            }
            
            // Update obstacles
            this.obstacles.forEach(obstacle => obstacle.update());
            
            // Remove off-screen obstacles
            this.obstacles = this.obstacles.filter(obs => !obs.isOffScreen());
            
            // Collision detection
            this.checkCollisions();
            
            // Update score (distance-based)
            this.distance += BASE_GAME_SPEED * speedFactor * 0.01;
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
    }
    
    drawMenu() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NIESKOŃCZONY BIEGACZ', canvas.width / 2, canvas.height / 2 - 60);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Naciśnij SPACE aby grać', canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Skok: Space/W/↑  |  Kucanie: S/↓  |  Pauza: P', canvas.width / 2, canvas.height / 2 + 70);
        
        ctx.textAlign = 'left';
    }
    
    drawPause() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUZA', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Naciśnij P aby wznowić', canvas.width / 2, canvas.height / 2 + 50);
        
        ctx.textAlign = 'left';
    }
    
    drawGameOver() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);
        
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Wynik: ${this.score}m`, canvas.width / 2, canvas.height / 2);
        ctx.fillText(`High Score: ${this.highScore}m`, canvas.width / 2, canvas.height / 2 + 50);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = '#00ff00';
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
