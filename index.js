// Mobile Detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 window.innerWidth <= 768 || 
                 ('ontouchstart' in window);

// Game Configuration
const CONFIG = {
    GRAVITY: isMobile ? 0.35 : 0.2,  // Faster gravity on mobile for snappier feel
    JUMP_FORCE: isMobile ? -6.5 : -4.2,  // Stronger jump on mobile
    BIRD_SIZE: 30,
    PIPE_WIDTH: 60,
    PIPE_GAP: isMobile ? 240 : 220,  // Slightly larger gap on mobile
    PIPE_SPEED: isMobile ? 2.5 : 1.5,  // Faster starting speed on mobile
    SPAWN_INTERVAL: 150,  // More distance between pipes at start
    FLOOR_HEIGHT: 100,
    // Difficulty progression
    SPEED_INCREASE_PER_SCORE: isMobile ? 0.25 : 0.2,  // Slightly faster progression on mobile
    MAX_SPEED: isMobile ? 9 : 8,  // Higher max speed on mobile
    MIN_SPAWN_INTERVAL: 50,  // Minimum time between pipes
    MIN_PIPE_GAP: isMobile ? 180 : 160,  // Larger minimum gap on mobile
    GAP_DECREASE_PER_SCORE: 2  // How much gap decreases per point
};

// Themes
const THEMES = {
    default: {
        sky: ['#87CEEB', '#B0E0E6', '#ADD8E6', '#E0F6FF'],
        ground: '#8B4513',
        groundAccent: '#654321',
        grassColor: '#228B22',
        grassLight: '#32CD32',
        grassDark: '#006400',
        pipe: '#FF6347',
        pipeHighlight: '#FF7F50',
        pipeShadow: '#DC143C',
        pipeOutline: '#B22222',
        flowerColors: ['#FFD700', '#FF69B4', '#FF1493', '#FFA500', '#9370DB']
    },
    night: {
        sky: ['#0a1128', '#1a1f3a', '#2e3856'],
        ground: '#1a1a2e',
        groundAccent: '#16213e',
        pipe: '#16213E',
        pipeHighlight: '#1e2d5f',
        pipeShadow: '#0f1729',
        pipeOutline: '#0F3460',
        glow: true  // Enable glow effect
    },
    sunset: {
        sky: ['#FF6B9D', '#FFA07A', '#FFD700', '#87CEEB'],
        ground: '#E67E22',
        groundAccent: '#D35400',
        pipe: '#E74C3C',
        pipeHighlight: '#ff6b6b',
        pipeShadow: '#c0392b',
        pipeOutline: '#C0392B'
    },
    classic: {
        sky: ['#4ec0ca', '#4ec0ca'],
        ground: '#ded895',
        groundAccent: '#c9c05a',
        pipe: '#5cb85c',
        pipeHighlight: '#6ecf6e',
        pipeShadow: '#4a9d4a',
        pipeOutline: '#4CAF50',
        pixelated: true  // Enable pixelated classic look
    },
    tron: {
        sky: ['#000814', '#001d3d', '#000814'],
        ground: '#0a1128',
        groundAccent: '#001845',
        pipe: '#003566',
        pipeHighlight: '#00d9ff',
        pipeShadow: '#001233',
        pipeOutline: '#00d9ff',
        gridColor: '#00d9ff',
        accentColor: '#ffd60a',
        isGrid: true,
        particles: true,
        glow: true,
        tronMode: true  // Special Tron rendering mode
    }
};

// Bird Colors
const BIRD_COLORS = {
    yellow: {
        body: '#FFC700',
        belly: '#FFF4CC',
        wing: '#FF8C00',
        beak: '#FF8800',
        beakHighlight: '#FFB84D',
        eye: 'white',
        pupil: 'black',
        cheek: '#FF6B6B'
    },
    red: {
        body: '#FF4444',
        belly: '#FF8888',
        wing: '#CC0000',
        beak: '#FF6600',
        beakHighlight: '#FF9944',
        eye: 'white',
        pupil: 'black',
        cheek: '#FF99CC'
    },
    blue: {
        body: '#4A90E2',
        belly: '#87CEEB',
        wing: '#2E5C8A',
        beak: '#FFA500',
        beakHighlight: '#FFD700',
        eye: 'white',
        pupil: 'black',
        cheek: '#FF99CC'
    },
    green: {
        body: '#5EBF58',
        belly: '#A8E6A1',
        wing: '#3F8C3A',
        beak: '#FF8800',
        beakHighlight: '#FFB84D',
        eye: 'white',
        pupil: 'black',
        cheek: '#90EE90'
    }
};

// Game State
let gameState = {
    running: false,
    score: 0,
    bestScore: 0,
    currentTheme: 'default',
    currentBird: 'yellow',
    muted: false,
    currentSpeed: CONFIG.PIPE_SPEED,
    currentSpawnInterval: CONFIG.SPAWN_INTERVAL,
    currentPipeGap: CONFIG.PIPE_GAP
};

// Game Objects
let bird = null;
let pipes = [];
let frameCount = 0;

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Sound Effects (using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine') {
    if (gameState.muted) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playJumpSound() {
    // Pleasant whoosh sound
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    osc1.frequency.value = 523;  // C note
    osc2.frequency.value = 659;  // E note
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    osc1.start(audioContext.currentTime);
    osc2.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.15);
    osc2.stop(audioContext.currentTime + 0.15);
}

function playScoreSound() {
    // Pleasant success chime
    const notes = [523, 659, 784];  // C, E, G chord
    notes.forEach((freq, index) => {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0.08, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.3);
        }, index * 50);
    });
}

function playGameOverSound() {
    // Gentle game over sound
    const notes = [392, 349, 330, 294];  // Descending notes
    notes.forEach((freq, index) => {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'triangle';
            
            gain.gain.setValueAtTime(0.1, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.4);
        }, index * 100);
    });
}

// Initialize Canvas Size
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const dpr = window.devicePixelRatio || 1;
    
    // Set display size (css pixels)
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;
    
    // Store display dimensions for game logic first
    canvas.displayWidth = displayWidth;
    canvas.displayHeight = displayHeight;
    
    // Set actual size in memory (scaled for retina displays)
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Normalize coordinate system to use css pixels
    // This resets the transform, so no accumulation on resize
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    // Update canvas style to match container
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
}

// Helper functions for canvas dimensions
function getCanvasWidth() {
    return canvas.displayWidth || getCanvasWidth();
}

function getCanvasHeight() {
    return canvas.displayHeight || getCanvasHeight();
}

// Bird Class
class Bird {
    constructor() {
        this.x = getCanvasWidth() / 4;
        this.y = getCanvasHeight() / 2;
        this.velocity = 0;
        this.size = CONFIG.BIRD_SIZE;
    }
    
    update() {
        this.velocity += CONFIG.GRAVITY;
        this.y += this.velocity;
        
        // Limit fall speed to prevent too fast falling
        if (this.velocity > 5) this.velocity = 5;
    }
    
    jump() {
        this.velocity = CONFIG.JUMP_FORCE;
        playJumpSound();
    }
    
    draw() {
        const colorScheme = BIRD_COLORS[gameState.currentBird];
        
        // Use Tron style bird for tron theme
        if (gameState.currentTheme === 'tron') {
            drawTronBird(this.x, this.y);
            return;
        }
        
        // Use pixel art style for all other birds
        this.drawPixelBird(colorScheme);
    }
    
    drawPixelBird(colorScheme) {
        // Animated pixel art bird (works for all themes)
        const rotation = Math.min(Math.max(this.velocity * 0.08, -0.5), 0.5);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(rotation);
        
        // Disable image smoothing for sharp pixel art
        ctx.imageSmoothingEnabled = false;
        
        const wingFlap = Math.floor(frameCount / 8) % 3;
        const scale = 1.3; // Scale for visibility
        
        // Main body
        ctx.fillStyle = colorScheme.body;
        ctx.fillRect(-12 * scale, -9 * scale, 24 * scale, 18 * scale);
        
        // Body rounded edges
        ctx.fillRect(-13 * scale, -6 * scale, 1 * scale, 12 * scale);
        ctx.fillRect(12 * scale, -6 * scale, 1 * scale, 12 * scale);
        ctx.fillRect(-10 * scale, -10 * scale, 20 * scale, 1 * scale);
        ctx.fillRect(-10 * scale, 9 * scale, 20 * scale, 1 * scale);
        
        // Belly/chest - lighter color
        ctx.fillStyle = colorScheme.belly;
        ctx.fillRect(-8 * scale, -3 * scale, 16 * scale, 12 * scale);
        ctx.fillRect(-7 * scale, 9 * scale, 14 * scale, 1 * scale);
        
        // Wing with animation
        ctx.fillStyle = colorScheme.wing;
        if (wingFlap === 0) {
            // Wing up position
            ctx.fillRect(-10 * scale, -6 * scale, 10 * scale, 8 * scale);
            ctx.fillRect(-11 * scale, -4 * scale, 1 * scale, 4 * scale);
        } else if (wingFlap === 1) {
            // Wing middle position
            ctx.fillRect(-10 * scale, 0 * scale, 10 * scale, 8 * scale);
            ctx.fillRect(-11 * scale, 2 * scale, 1 * scale, 4 * scale);
        } else {
            // Wing down position
            ctx.fillRect(-10 * scale, 4 * scale, 10 * scale, 8 * scale);
            ctx.fillRect(-11 * scale, 6 * scale, 1 * scale, 4 * scale);
        }
        
        // Eye white background
        ctx.fillStyle = colorScheme.eye;
        ctx.fillRect(6 * scale, -9 * scale, 8 * scale, 8 * scale);
        
        // Eye black pupil
        ctx.fillStyle = colorScheme.pupil;
        ctx.fillRect(9 * scale, -7 * scale, 5 * scale, 6 * scale);
        
        // Eye white shine
        ctx.fillStyle = 'white';
        ctx.fillRect(10 * scale, -6 * scale, 2 * scale, 2 * scale);
        
        // Beak upper part
        ctx.fillStyle = colorScheme.beak;
        ctx.fillRect(12 * scale, -5 * scale, 8 * scale, 3 * scale);
        ctx.fillRect(20 * scale, -6 * scale, 2 * scale, 1 * scale);
        
        // Beak lower part
        ctx.fillRect(12 * scale, -2 * scale, 6 * scale, 3 * scale);
        ctx.fillRect(18 * scale, -1 * scale, 2 * scale, 1 * scale);
        
        // Beak tip highlight
        ctx.fillStyle = colorScheme.beakHighlight;
        ctx.fillRect(12 * scale, -4 * scale, 2 * scale, 1 * scale);
        
        // Cheek blush
        ctx.fillStyle = colorScheme.cheek;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(4 * scale, 1 * scale, 5 * scale, 4 * scale);
        ctx.globalAlpha = 1;
        
        // Tail feathers with animation
        ctx.fillStyle = colorScheme.body;
        ctx.fillRect(-13 * scale, -3 * scale, 2 * scale, 6 * scale);
        ctx.fillRect(-15 * scale, -1 * scale, 2 * scale, 2 * scale);
        
        // Tail feather detail
        ctx.fillStyle = colorScheme.wing;
        ctx.fillRect(-14 * scale, -2 * scale, 1 * scale, 4 * scale);
        
        ctx.restore();
        ctx.imageSmoothingEnabled = true;
    }
    
    checkCollision() {
        // Ground collision
        if (this.y + this.size > getCanvasHeight() - CONFIG.FLOOR_HEIGHT) {
            return true;
        }
        
        // Ceiling collision
        if (this.y - this.size < 0) {
            return true;
        }
        
        // Pipe collision - use pipe's collision check method
        for (let pipe of pipes) {
            if (pipe.checkBirdCollision(this)) {
                return true;
            }
        }
        
        return false;
    }
}

// Pipe Class
class Pipe {
    constructor() {
        this.x = getCanvasWidth();
        this.gap = gameState.currentPipeGap;  // Use dynamic gap
        this.topHeight = Math.random() * (getCanvasHeight() - this.gap - CONFIG.FLOOR_HEIGHT - 100) + 50;
        this.scored = false;
    }
    
    update() {
        this.x -= gameState.currentSpeed;
    }
    
    draw() {
        const theme = THEMES[gameState.currentTheme];
        
        // Use Tron style for tron theme
        if (gameState.currentTheme === 'tron') {
            // Top pipe
            drawTronPipe(this.x, 0, CONFIG.PIPE_WIDTH, this.topHeight);
            // Bottom pipe
            const bottomY = this.topHeight + this.gap;
            const bottomHeight = getCanvasHeight() - bottomY - CONFIG.FLOOR_HEIGHT;
            drawTronPipe(this.x, bottomY, CONFIG.PIPE_WIDTH, bottomHeight);
            return;
        }
        
        // Use classic pixel art pipes for classic theme
        if (gameState.currentTheme === 'classic') {
            this.drawClassicPipe();
            return;
        }
        
        // Add glow effect for night theme
        if (theme.glow) {
            ctx.shadowColor = '#4a9eff';
            ctx.shadowBlur = 20;
        }
        
        // Draw top pipe with 3D effect
        this.drawPipe(this.x, 0, CONFIG.PIPE_WIDTH, this.topHeight, theme);
        
        // Draw bottom pipe with 3D effect
        const bottomY = this.topHeight + this.gap;
        const bottomHeight = getCanvasHeight() - bottomY - CONFIG.FLOOR_HEIGHT;
        this.drawPipe(this.x, bottomY, CONFIG.PIPE_WIDTH, bottomHeight, theme);
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    drawClassicPipe() {
        // Original Flappy Bird pipe - exact pixel-perfect replica
        ctx.imageSmoothingEnabled = false;
        
        const pipeWidth = 52;
        const pipeBodyWidth = 52;
        const capHeight = 26;
        const capWidth = 64;
        const capOffset = 6;
        
        // Top pipe body - main green
        ctx.fillStyle = '#65BD58';
        ctx.fillRect(this.x, 0, pipeBodyWidth, this.topHeight - capHeight);
        
        // Pipe body dark border (left edge)
        ctx.fillStyle = '#4E9D44';
        ctx.fillRect(this.x, 0, 6, this.topHeight - capHeight);
        
        // Pipe body light highlight (right edge)
        ctx.fillStyle = '#7AD96A';
        ctx.fillRect(this.x + pipeBodyWidth - 6, 0, 6, this.topHeight - capHeight);
        
        // Top pipe cap
        ctx.fillStyle = '#65BD58';
        ctx.fillRect(this.x - capOffset, this.topHeight - capHeight, capWidth, capHeight);
        
        // Cap border dark (left)
        ctx.fillStyle = '#4E9D44';
        ctx.fillRect(this.x - capOffset, this.topHeight - capHeight, 6, capHeight);
        
        // Cap border light (right)
        ctx.fillStyle = '#7AD96A';
        ctx.fillRect(this.x - capOffset + capWidth - 6, this.topHeight - capHeight, 6, capHeight);
        
        // Cap top black border line
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - capOffset, this.topHeight - capHeight, capWidth, 2);
        
        // Cap bottom black border line
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - capOffset, this.topHeight - 2, capWidth, 2);
        
        // Bottom pipe
        const bottomY = this.topHeight + this.gap;
        const bottomHeight = getCanvasHeight() - bottomY - CONFIG.FLOOR_HEIGHT;
        
        // Bottom pipe cap
        ctx.fillStyle = '#65BD58';
        ctx.fillRect(this.x - capOffset, bottomY, capWidth, capHeight);
        
        // Cap border dark (left)
        ctx.fillStyle = '#4E9D44';
        ctx.fillRect(this.x - capOffset, bottomY, 6, capHeight);
        
        // Cap border light (right)
        ctx.fillStyle = '#7AD96A';
        ctx.fillRect(this.x - capOffset + capWidth - 6, bottomY, 6, capHeight);
        
        // Cap top black border line
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - capOffset, bottomY, capWidth, 2);
        
        // Cap bottom black border line
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - capOffset, bottomY + capHeight - 2, capWidth, 2);
        
        // Bottom pipe body - main green
        ctx.fillStyle = '#65BD58';
        ctx.fillRect(this.x, bottomY + capHeight, pipeBodyWidth, bottomHeight - capHeight);
        
        // Pipe body dark border (left edge)
        ctx.fillStyle = '#4E9D44';
        ctx.fillRect(this.x, bottomY + capHeight, 6, bottomHeight - capHeight);
        
        // Pipe body light highlight (right edge)
        ctx.fillStyle = '#7AD96A';
        ctx.fillRect(this.x + pipeBodyWidth - 6, bottomY + capHeight, 6, bottomHeight - capHeight);
        
        ctx.imageSmoothingEnabled = true;
    }
    
    drawPipe(x, y, width, height, theme) {
        const capHeight = 25;
        const capOverhang = 5;
        
        // Pipe body with gradient
        const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
        gradient.addColorStop(0, theme.pipeShadow);
        gradient.addColorStop(0.4, theme.pipe);
        gradient.addColorStop(0.6, theme.pipeHighlight);
        gradient.addColorStop(1, theme.pipeShadow);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);
        
        // Pipe outline
        ctx.strokeStyle = theme.pipeOutline;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Pipe cap
        const capY = (y === 0) ? height - capHeight : y;
        
        // Cap gradient
        const capGradient = ctx.createLinearGradient(x - capOverhang, 0, x + width + capOverhang, 0);
        capGradient.addColorStop(0, theme.pipeShadow);
        capGradient.addColorStop(0.5, theme.pipeHighlight);
        capGradient.addColorStop(1, theme.pipeShadow);
        
        ctx.fillStyle = capGradient;
        ctx.fillRect(x - capOverhang, capY, width + (capOverhang * 2), capHeight);
        ctx.strokeRect(x - capOverhang, capY, width + (capOverhang * 2), capHeight);
        
        // Pipe highlights (3D effect)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x + 5, y, 3, height);
    }
    
    isOffScreen() {
        return this.x + CONFIG.PIPE_WIDTH < 0;
    }
    
    checkScore() {
        if (!this.scored && this.x + CONFIG.PIPE_WIDTH < bird.x) {
            this.scored = true;
            gameState.score++;
            updateScore();
            updateDifficulty();
            playScoreSound();
        }
    }
    
    // Check collision with dynamic gap
    checkBirdCollision(birdObj) {
        if (birdObj.x + birdObj.size > this.x && 
            birdObj.x - birdObj.size < this.x + CONFIG.PIPE_WIDTH) {
            if (birdObj.y - birdObj.size < this.topHeight || 
                birdObj.y + birdObj.size > this.topHeight + this.gap) {
                return true;
            }
        }
        return false;
    }
}

// Draw Background
function drawBackground() {
    const theme = THEMES[gameState.currentTheme];
    
    // Tron background
    if (gameState.currentTheme === 'tron') {
        drawTronBackground();
        return;
    }
    
    // Classic background
    if (gameState.currentTheme === 'classic') {
        drawClassicBackground();
        return;
    }
    
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, getCanvasHeight() - CONFIG.FLOOR_HEIGHT);
    if (Array.isArray(theme.sky)) {
        theme.sky.forEach((color, index) => {
            gradient.addColorStop(index / (theme.sky.length - 1), color);
        });
    } else {
        gradient.addColorStop(0, theme.sky);
        gradient.addColorStop(1, theme.sky);
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, getCanvasWidth(), getCanvasHeight() - CONFIG.FLOOR_HEIGHT);
    
    // Clouds and butterflies (for day theme only)
    if (gameState.currentTheme === 'default') {
        // Fluffy clouds with better shapes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 5;
        drawFluffyCloud(100 + (frameCount * 0.3 % 600), 80);
        drawFluffyCloud(300 + (frameCount * 0.2 % 700), 140);
        drawFluffyCloud(200 + (frameCount * 0.25 % 500), 200);
        ctx.shadowBlur = 0;
        
        // Sun with rays
        drawSunWithRays(getCanvasWidth() - 100, 80);
        
        // Flying butterflies
        drawButterfly(150 + Math.sin(frameCount * 0.03) * 30, 150 + Math.cos(frameCount * 0.02) * 20);
        drawButterfly(250 + Math.cos(frameCount * 0.025) * 25, 180 + Math.sin(frameCount * 0.03) * 15);
    }
    
    // Stars and moon (for night theme)
    if (gameState.currentTheme === 'night') {
        // Moon
        ctx.fillStyle = '#f0e68c';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(getCanvasWidth() - 80, 80, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Stars with twinkling effect
        ctx.fillStyle = 'white';
        for (let i = 0; i < 60; i++) {
            const x = (i * 37) % getCanvasWidth();
            const y = (i * 53) % (getCanvasHeight() - CONFIG.FLOOR_HEIGHT - 50);
            const twinkle = Math.abs(Math.sin(frameCount * 0.05 + i));
            const size = twinkle * 2 + 1;
            
            ctx.globalAlpha = twinkle * 0.8 + 0.2;
            ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
    }
    
    // Sun and birds (for sunset theme)
    if (gameState.currentTheme === 'sunset') {
        // Setting sun
        const sunY = 120;
        ctx.fillStyle = '#FF6347';
        ctx.shadowColor = '#FF4500';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(getCanvasWidth() / 2, sunY, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Sun reflection on horizon
        ctx.fillStyle = 'rgba(255, 99, 71, 0.3)';
        ctx.fillRect(0, getCanvasHeight() - CONFIG.FLOOR_HEIGHT - 50, getCanvasWidth(), 50);
        
        // Silhouette birds
        drawBirdSilhouette(150 + Math.sin(frameCount * 0.02) * 20, 100);
        drawBirdSilhouette(200 + Math.cos(frameCount * 0.015) * 15, 120);
    }
    
    // Ground with texture
    if (gameState.currentTheme === 'default') {
        // Creative day theme ground with grass and flowers
        drawCreativeDayGround(theme);
    } else {
        // Standard ground for other themes
        const groundGradient = ctx.createLinearGradient(0, getCanvasHeight() - CONFIG.FLOOR_HEIGHT, 0, getCanvasHeight());
        groundGradient.addColorStop(0, theme.ground);
        groundGradient.addColorStop(1, theme.groundAccent);
        
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, getCanvasHeight() - CONFIG.FLOOR_HEIGHT, getCanvasWidth(), CONFIG.FLOOR_HEIGHT);
        
        // Ground pattern (grass-like texture)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 2;
        const offset = (frameCount * 2) % 40;
        for (let i = -offset; i < getCanvasWidth(); i += 20) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(i, getCanvasHeight() - CONFIG.FLOOR_HEIGHT);
            ctx.lineTo(i, getCanvasHeight());
            ctx.stroke();
            
            // Small grass marks
            if (i % 40 === 0) {
                ctx.beginPath();
                ctx.moveTo(i, getCanvasHeight() - CONFIG.FLOOR_HEIGHT);
                ctx.lineTo(i + 5, getCanvasHeight() - CONFIG.FLOOR_HEIGHT + 10);
                ctx.stroke();
            }
        }
        
        // Ground top border
        ctx.strokeStyle = theme.groundAccent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, getCanvasHeight() - CONFIG.FLOOR_HEIGHT);
        ctx.lineTo(getCanvasWidth(), getCanvasHeight() - CONFIG.FLOOR_HEIGHT);
        ctx.stroke();
    }
}

function drawFluffyCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 20, y - 8, 30, 0, Math.PI * 2);
    ctx.arc(x + 45, y - 5, 28, 0, Math.PI * 2);
    ctx.arc(x + 65, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 30, y + 10, 32, 0, Math.PI * 2);
    ctx.fill();
}

function drawSunWithRays(x, y) {
    // Sun circle
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFA500';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Sun rays
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30 + frameCount * 0.5) * Math.PI / 180;
        const rayLength = 55 + Math.sin(frameCount * 0.1 + i) * 5;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * 45, y + Math.sin(angle) * 45);
        ctx.lineTo(x + Math.cos(angle) * rayLength, y + Math.sin(angle) * rayLength);
        ctx.stroke();
    }
}

function drawButterfly(x, y) {
    const wingFlap = Math.sin(frameCount * 0.2) * 0.3;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Left wing
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.ellipse(-5, 0, 8, 12 + wingFlap * 5, -0.3 - wingFlap, 0, Math.PI * 2);
    ctx.fill();
    
    // Right wing
    ctx.fillStyle = '#FF1493';
    ctx.beginPath();
    ctx.ellipse(5, 0, 8, 12 + wingFlap * 5, 0.3 + wingFlap, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = '#000';
    ctx.fillRect(-1, -8, 2, 16);
    
    // Antennae
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-3, -12);
    ctx.moveTo(0, -8);
    ctx.lineTo(3, -12);
    ctx.stroke();
    
    ctx.restore();
}

function drawTronBackground() {
    const theme = THEMES.tron;
    
    // Deep dark gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, getCanvasHeight());
    bgGradient.addColorStop(0, theme.sky[0]);
    bgGradient.addColorStop(0.5, theme.sky[1]);
    bgGradient.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, getCanvasWidth(), getCanvasHeight());
    
    // Animated 3D Grid Floor
    ctx.save();
    const gridY = getCanvasHeight() - CONFIG.FLOOR_HEIGHT;
    const time = frameCount * 0.02;
    
    // Perspective grid lines - receding into distance
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1;
    ctx.shadowColor = theme.gridColor;
    ctx.shadowBlur = 8;
    
    // Horizontal grid lines with perspective
    for (let i = 0; i < 8; i++) {
        const yOffset = i * 15;
        const y = gridY + yOffset;
        if (y > getCanvasHeight()) continue;
        
        const alpha = 1 - (i / 8) * 0.7;
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(getCanvasWidth(), y);
        ctx.stroke();
    }
    
    // Vertical grid lines with animated movement
    const gridSpacing = 30;
    const offset = (time * 50) % gridSpacing;
    for (let i = -1; i < getCanvasWidth() / gridSpacing + 2; i++) {
        const x = i * gridSpacing - offset;
        const alpha = 0.6;
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        ctx.moveTo(x, gridY);
        ctx.lineTo(x + gridSpacing * 0.3, getCanvasHeight());
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    
    // Floating digital particles
    ctx.fillStyle = theme.accentColor;
    ctx.shadowColor = theme.accentColor;
    ctx.shadowBlur = 10;
    for (let i = 0; i < 15; i++) {
        const x = ((i * 73 + frameCount * 2) % getCanvasWidth());
        const y = ((i * 97 + frameCount * 0.5) % (getCanvasHeight() - CONFIG.FLOOR_HEIGHT));
        const size = Math.sin(frameCount * 0.1 + i) * 2 + 3;
        const alpha = Math.abs(Math.sin(frameCount * 0.05 + i * 0.5)) * 0.8;
        
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, y, size, size);
    }
    
    // Scanning lines effect
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = theme.gridColor;
    const scanY = (frameCount * 3) % getCanvasHeight();
    ctx.fillRect(0, scanY, getCanvasWidth(), 2);
    ctx.fillRect(0, (scanY + getCanvasHeight() / 2) % getCanvasHeight(), getCanvasWidth(), 2);
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
    
    // Data streams in background
    drawDataStreams();
}

function drawDataStreams() {
    const theme = THEMES.tron;
    ctx.save();
    
    for (let i = 0; i < 3; i++) {
        const x = (i * 150 + frameCount * 1.5) % (getCanvasWidth() + 100) - 50;
        const startY = 50;
        const endY = getCanvasHeight() - CONFIG.FLOOR_HEIGHT - 50;
        
        // Digital code stream
        const gradient = ctx.createLinearGradient(0, startY, 0, endY);
        gradient.addColorStop(0, 'rgba(0, 217, 255, 0)');
        gradient.addColorStop(0.3, 'rgba(0, 217, 255, 0.8)');
        gradient.addColorStop(0.7, 'rgba(0, 217, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.shadowColor = theme.gridColor;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(x, startY);
        for (let y = startY; y < endY; y += 10) {
            ctx.lineTo(x + Math.sin(y * 0.1 + frameCount * 0.1) * 5, y);
        }
        ctx.stroke();
        
        // Binary digits
        ctx.font = '10px monospace';
        ctx.fillStyle = theme.gridColor;
        ctx.shadowBlur = 5;
        for (let j = 0; j < 5; j++) {
            const digitY = startY + (frameCount * 2 + j * 50) % (endY - startY);
            const digit = Math.random() > 0.5 ? '1' : '0';
            ctx.globalAlpha = 0.7;
            ctx.fillText(digit, x + Math.sin(digitY * 0.1) * 5, digitY);
        }
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawTronPipe(x, y, width, height) {
    const theme = THEMES.tron;
    
    ctx.save();
    ctx.shadowColor = theme.pipeOutline;
    ctx.shadowBlur = 15;
    
    // Main pipe body - dark with grid pattern
    ctx.fillStyle = theme.pipe;
    ctx.fillRect(x, y, width, height);
    
    // Glowing edges
    ctx.strokeStyle = theme.pipeOutline;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Internal circuit patterns
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    
    // Vertical lines
    for (let i = 1; i < 4; i++) {
        const lineX = x + (width / 4) * i;
        ctx.beginPath();
        ctx.moveTo(lineX, y);
        ctx.lineTo(lineX, y + height);
        ctx.stroke();
    }
    
    // Horizontal segments with animation
    const segmentHeight = 30;
    const offset = (frameCount * 2) % segmentHeight;
    for (let yPos = y - offset; yPos < y + height; yPos += segmentHeight) {
        ctx.beginPath();
        ctx.moveTo(x, yPos);
        ctx.lineTo(x + width, yPos);
        ctx.stroke();
    }
    
    // Pulsing energy core
    const pulseAlpha = Math.abs(Math.sin(frameCount * 0.05)) * 0.5 + 0.3;
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = theme.accentColor;
    ctx.shadowColor = theme.accentColor;
    ctx.shadowBlur = 20;
    
    const coreWidth = width * 0.3;
    const coreHeight = 40;
    const coreX = x + (width - coreWidth) / 2;
    const coreY = y + height / 2 - coreHeight / 2;
    ctx.fillRect(coreX, coreY, coreWidth, coreHeight);
    
    ctx.restore();
}

function drawTronBird(x, y) {
    const theme = THEMES.tron;
    const wingPhase = Math.sin(frameCount * 0.2);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = theme.gridColor;
    ctx.shadowBlur = 20;
    
    // Main body - diamond/angular shape
    ctx.fillStyle = theme.gridColor;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    
    // Energy core
    ctx.fillStyle = theme.accentColor;
    ctx.shadowColor = theme.accentColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Glowing outline
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.stroke();
    
    // Digital wings - light trails
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = theme.accentColor;
    ctx.shadowBlur = 15;
    
    const wingLength = 15 + wingPhase * 5;
    
    // Top wing trail
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(-8 - wingLength, -10 - wingPhase * 3);
    ctx.stroke();
    
    // Bottom wing trail
    ctx.beginPath();
    ctx.moveTo(-8, 5);
    ctx.lineTo(-8 - wingLength, 10 + wingPhase * 3);
    ctx.stroke();
    
    // Circuit lines on body
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, 0);
    ctx.moveTo(-4, 4);
    ctx.lineTo(4, 0);
    ctx.stroke();
    
    ctx.restore();
}

function drawCreativeDayGround(theme) {
    const groundY = getCanvasHeight() - CONFIG.FLOOR_HEIGHT;
    
    // Dirt base
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, getCanvasHeight());
    groundGradient.addColorStop(0, theme.ground);
    groundGradient.addColorStop(1, theme.groundAccent);
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, getCanvasWidth(), CONFIG.FLOOR_HEIGHT);
    
    // Grass layer
    ctx.fillStyle = theme.grassColor;
    ctx.fillRect(0, groundY, getCanvasWidth(), 25);
    
    // Animated grass blades
    const grassOffset = (frameCount * 2) % 15;
    for (let i = -grassOffset; i < getCanvasWidth() + 15; i += 8) {
        // Tall grass blade
        ctx.fillStyle = theme.grassDark;
        ctx.beginPath();
        ctx.moveTo(i, groundY + 25);
        ctx.lineTo(i - 1, groundY + 5);
        ctx.lineTo(i + 1, groundY + 25);
        ctx.fill();
        
        // Medium grass blade
        ctx.fillStyle = theme.grassColor;
        ctx.beginPath();
        ctx.moveTo(i + 4, groundY + 25);
        ctx.lineTo(i + 3, groundY + 12);
        ctx.lineTo(i + 5, groundY + 25);
        ctx.fill();
        
        // Light grass blade
        if (i % 16 === 0) {
            ctx.fillStyle = theme.grassLight;
            ctx.beginPath();
            ctx.moveTo(i + 2, groundY + 25);
            ctx.lineTo(i + 1, groundY + 8);
            ctx.lineTo(i + 3, groundY + 25);
            ctx.fill();
        }
    }
    
    // Flowers
    const flowerOffset = (frameCount * 2) % 80;
    for (let i = -flowerOffset + 20; i < getCanvasWidth() + 80; i += 80) {
        const flowerColor = theme.flowerColors[Math.floor(i / 80) % theme.flowerColors.length];
        drawFlower(i, groundY + 15, flowerColor);
    }
}

function drawBirdSilhouette(x, y) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    // Simple bird V shape
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8, y + 5);
    ctx.lineTo(x + 10, y + 3);
    ctx.lineTo(x + 18, y + 8);
    ctx.stroke();
}

function drawClassicBackground() {
    // Original Flappy Bird background - pixel-perfect recreation
    ctx.imageSmoothingEnabled = false;
    
    // Sky - day gradient (light blue to slightly darker blue)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, getCanvasHeight() - CONFIG.FLOOR_HEIGHT);
    skyGradient.addColorStop(0, '#4EC0CA');
    skyGradient.addColorStop(1, '#4EAFCA');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, getCanvasWidth(), getCanvasHeight() - CONFIG.FLOOR_HEIGHT);
    
    // Clouds - moving white pixel clouds
    ctx.fillStyle = 'white';
    const cloudSpeed = 0.3;
    const cloudOffset1 = (frameCount * cloudSpeed) % (getCanvasWidth() + 100);
    const cloudOffset2 = (frameCount * cloudSpeed + 250) % (getCanvasWidth() + 100);
    const cloudOffset3 = (frameCount * cloudSpeed + 500) % (getCanvasWidth() + 100);
    
    drawPixelCloud(-100 + cloudOffset1, 60);
    drawPixelCloud(-100 + cloudOffset2, 110);
    drawPixelCloud(-100 + cloudOffset3, 160);
    
    // Ground base - tan/dirt color
    ctx.fillStyle = '#DED895';
    ctx.fillRect(0, getCanvasHeight() - CONFIG.FLOOR_HEIGHT, getCanvasWidth(), CONFIG.FLOOR_HEIGHT);
    
    // Ground scrolling texture - vertical stripes
    ctx.fillStyle = '#C0BC71';
    const groundScroll = (frameCount * 2) % 48;
    for (let i = -groundScroll; i < getCanvasWidth() + 48; i += 48) {
        ctx.fillRect(i, getCanvasHeight() - CONFIG.FLOOR_HEIGHT, 24, CONFIG.FLOOR_HEIGHT);
    }
    
    // Darker ground stripe pattern
    ctx.fillStyle = '#B8B565';
    for (let i = -groundScroll + 12; i < getCanvasWidth() + 48; i += 48) {
        ctx.fillRect(i, getCanvasHeight() - CONFIG.FLOOR_HEIGHT, 8, CONFIG.FLOOR_HEIGHT);
    }
    
    // Ground top border - green grass strip
    ctx.fillStyle = '#5EBF58';
    ctx.fillRect(0, getCanvasHeight() - CONFIG.FLOOR_HEIGHT, getCanvasWidth(), 16);
    
    // Grass texture dark lines
    ctx.fillStyle = '#4E9D44';
    for (let i = -groundScroll; i < getCanvasWidth() + 48; i += 12) {
        ctx.fillRect(i, getCanvasHeight() - CONFIG.FLOOR_HEIGHT + 4, 3, 12);
        ctx.fillRect(i + 6, getCanvasHeight() - CONFIG.FLOOR_HEIGHT + 2, 3, 10);
    }
    
    // Grass highlights
    ctx.fillStyle = '#7AD96A';
    for (let i = -groundScroll + 3; i < getCanvasWidth() + 48; i += 12) {
        ctx.fillRect(i, getCanvasHeight() - CONFIG.FLOOR_HEIGHT + 6, 2, 8);
    }
    
    ctx.imageSmoothingEnabled = true;
}

function drawPixelCloud(x, y) {
    // Original Flappy Bird cloud shape - pixel perfect
    // Cloud is made of pixel blocks
    ctx.fillRect(x + 16, y, 16, 8);
    ctx.fillRect(x + 8, y + 8, 32, 8);
    ctx.fillRect(x, y + 16, 48, 8);
    ctx.fillRect(x + 8, y + 24, 32, 8);
    ctx.fillRect(x + 16, y + 32, 16, 8);
}

function drawFlower(x, y, color) {
    // Stem
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(x, y, 2, 15);
    
    // Petals
    ctx.fillStyle = color;
    const petalRadius = 4;
    for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const petalX = x + 1 + Math.cos(angle) * 5;
        const petalY = y + Math.sin(angle) * 5;
        ctx.beginPath();
        ctx.arc(petalX, petalY, petalRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Center
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x + 1, y, 3, 0, Math.PI * 2);
    ctx.fill();
}

// Game Loop
function gameLoop() {
    if (!gameState.running) return;
    
    ctx.clearRect(0, 0, getCanvasWidth(), getCanvasHeight());
    
    drawBackground();
    
    // Update and draw bird
    bird.update();
    bird.draw();
    
    // Update and draw pipes
    pipes.forEach(pipe => {
        pipe.update();
        pipe.draw();
        pipe.checkScore();
    });
    
    // Remove off-screen pipes
    pipes = pipes.filter(pipe => !pipe.isOffScreen());
    
    // Spawn new pipes (using dynamic spawn interval)
    if (frameCount % Math.floor(gameState.currentSpawnInterval) === 0) {
        pipes.push(new Pipe());
    }
    
    // Check collision
    if (bird.checkCollision()) {
        gameOver();
        return;
    }
    
    frameCount++;
    requestAnimationFrame(gameLoop);
}

// Start Game
function startGame() {
    gameState.running = true;
    gameState.score = 0;
    frameCount = 0;
    pipes = [];
    
    // Reset difficulty
    gameState.currentSpeed = CONFIG.PIPE_SPEED;
    gameState.currentSpawnInterval = CONFIG.SPAWN_INTERVAL;
    gameState.currentPipeGap = CONFIG.PIPE_GAP;
    
    bird = new Bird();
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    
    updateScore();
    gameLoop();
}

// Game Over
function gameOver() {
    gameState.running = false;
    playGameOverSound();
    
    // Update best score
    if (gameState.score > gameState.bestScore) {
        gameState.bestScore = gameState.score;
        localStorage.setItem('bestScore', gameState.bestScore);
    }
    
    // Update leaderboard
    updateLeaderboard(gameState.score);
    
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('best-score').textContent = gameState.bestScore;
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
}

// Update Score Display
function updateScore() {
    document.getElementById('score').textContent = gameState.score;
}

// Update Difficulty Based on Score
function updateDifficulty() {
    // Increase speed with score (more aggressive progression)
    gameState.currentSpeed = Math.min(
        CONFIG.PIPE_SPEED + (gameState.score * CONFIG.SPEED_INCREASE_PER_SCORE),
        CONFIG.MAX_SPEED
    );
    
    // Decrease spawn interval (spawn pipes faster)
    gameState.currentSpawnInterval = Math.max(
        CONFIG.SPAWN_INTERVAL - (gameState.score * 3),  // Faster spawn rate increase
        CONFIG.MIN_SPAWN_INTERVAL
    );
    
    // Decrease pipe gap (make it harder to pass through)
    gameState.currentPipeGap = Math.max(
        CONFIG.PIPE_GAP - (gameState.score * CONFIG.GAP_DECREASE_PER_SCORE),
        CONFIG.MIN_PIPE_GAP
    );
}

// Update Leaderboard
function updateLeaderboard(score) {
    let scores = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    scores.push(score);
    scores.sort((a, b) => b - a);
    scores = scores.slice(0, 5); // Keep top 5
    localStorage.setItem('leaderboard', JSON.stringify(scores));
    
    displayLeaderboard(scores);
}

function displayLeaderboard(scores = null) {
    if (!scores) {
        scores = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    }
    
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    scores.forEach(score => {
        const li = document.createElement('li');
        li.textContent = score;
        list.appendChild(li);
    });
}

// Event Listeners
window.addEventListener('load', () => {
    resizeCanvas();
    
    // Prevent scrolling on mobile
    if (isMobile) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        // Prevent pull-to-refresh on mobile
        document.body.addEventListener('touchmove', (e) => {
            if (e.target === canvas || e.target === document.body) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Lock orientation to portrait if possible
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait').catch(() => {
                // Orientation lock not supported or failed
            });
        }
    }
    
    // Load best score
    gameState.bestScore = parseInt(localStorage.getItem('bestScore') || '0');
    
    // Display leaderboard
    displayLeaderboard();
    
    // Set default theme and bird
    document.querySelector('[data-theme="default"]').classList.add('active');
    document.querySelector('[data-bird="yellow"]').classList.add('active');
});

window.addEventListener('resize', resizeCanvas);

// Start button
document.getElementById('start-btn').addEventListener('click', startGame);

// Restart button
document.getElementById('restart-btn').addEventListener('click', startGame);

// Menu button
document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
});

// Jump control - Canvas click
// Jump control - Touch (optimized for mobile)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.running && bird) {
        bird.jump();
    }
}, { passive: false });

// Prevent double-tap zoom on mobile
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
}, { passive: false });

// Jump control - Click
canvas.addEventListener('click', () => {
    if (gameState.running && bird) {
        bird.jump();
    }
});

// Jump control - Mouse left click (anywhere on document) - Desktop only
if (!isMobile) {
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && gameState.running && bird) {  // 0 = left click
            bird.jump();
        }
    });
}

// Jump control - Keyboard (Space or Arrow Up)
document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && gameState.running && bird) {
        e.preventDefault();
        bird.jump();
    }
});

// Theme selection
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.currentTheme = btn.dataset.theme;
    });
});

// Bird selection
document.querySelectorAll('.bird-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.bird-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.currentBird = btn.dataset.bird;
    });
});

// Mute button
document.getElementById('mute-btn').addEventListener('click', function() {
    gameState.muted = !gameState.muted;
    this.textContent = gameState.muted ? '🔇' : '🔊';
});
