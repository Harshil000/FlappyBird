// Game Configuration
const CONFIG = {
    GRAVITY: 0.2,  // Much slower gravity for gentle falling
    JUMP_FORCE: -4.2,  // Reduced jump height for more control
    BIRD_SIZE: 30,
    PIPE_WIDTH: 60,
    PIPE_GAP: 220,  // Larger gap between top and bottom pipes for easier start
    PIPE_SPEED: 1.5,  // Very slow starting speed
    SPAWN_INTERVAL: 150,  // More distance between pipes at start
    FLOOR_HEIGHT: 100,
    // Difficulty progression
    SPEED_INCREASE_PER_SCORE: 0.2,  // Faster speed increase per point
    MAX_SPEED: 8,  // Maximum pipe speed
    MIN_SPAWN_INTERVAL: 50,  // Minimum time between pipes
    MIN_PIPE_GAP: 160,  // Minimum gap between pipes (gets harder)
    GAP_DECREASE_PER_SCORE: 2  // How much gap decreases per point
};

// Themes
const THEMES = {
    default: {
        sky: ['#4ec0ca', '#87CEEB'],
        ground: '#ded895',
        groundAccent: '#c9c05a',
        pipe: '#5cb85c',
        pipeHighlight: '#6ecf6e',
        pipeShadow: '#4a9d4a',
        pipeOutline: '#4CAF50'
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
    }
};

// Bird Colors
const BIRD_COLORS = {
    yellow: {
        body: '#FFD700',
        wing: '#FFA500',
        belly: '#FFED4E'
    },
    red: {
        body: '#FF6B6B',
        wing: '#FF4757',
        belly: '#FF8E8E'
    },
    blue: {
        body: '#4ECDC4',
        wing: '#45B7D1',
        belly: '#7EDCE2'
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
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

// Bird Class
class Bird {
    constructor() {
        this.x = canvas.width / 4;
        this.y = canvas.height / 2;
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
        const rotation = Math.min(Math.max(this.velocity * 0.05, -0.5), 0.5);
        
        // Use classic pixel art style for classic theme
        if (gameState.currentTheme === 'classic') {
            this.drawClassicBird();
            return;
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(rotation);
        
        // Wing (behind body)
        ctx.fillStyle = colorScheme.wing;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        const wingFlap = Math.sin(frameCount * 0.2) * 5;
        ctx.ellipse(-5, 5 + wingFlap, 15, 10, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Bird body
        ctx.fillStyle = colorScheme.body;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly highlight
        ctx.fillStyle = colorScheme.belly;
        ctx.beginPath();
        ctx.arc(3, 8, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird eye (white)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(10, -5, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye pupil
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(12, -5, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(13, -6, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird beak
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(30, 0);
        ctx.lineTo(25, 5);
        ctx.closePath();
        ctx.fill();
        
        // Beak shadow
        ctx.fillStyle = '#D67500';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(25, 5);
        ctx.lineTo(20, 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    drawClassicBird() {
        // Original Flappy Bird pixel art - exact replica based on original game
        const rotation = Math.min(Math.max(this.velocity * 0.08, -0.5), 0.5);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(rotation);
        
        // Disable image smoothing for sharp pixel art
        ctx.imageSmoothingEnabled = false;
        
        const wingFlap = Math.floor(frameCount / 8) % 3;
        const scale = 1.3; // Scale for visibility
        
        // Main body - yellow
        ctx.fillStyle = '#FFC700';
        ctx.fillRect(-12 * scale, -9 * scale, 24 * scale, 18 * scale);
        
        // Body rounded edges
        ctx.fillRect(-13 * scale, -6 * scale, 1 * scale, 12 * scale);
        ctx.fillRect(12 * scale, -6 * scale, 1 * scale, 12 * scale);
        ctx.fillRect(-10 * scale, -10 * scale, 20 * scale, 1 * scale);
        ctx.fillRect(-10 * scale, 9 * scale, 20 * scale, 1 * scale);
        
        // Belly/chest - lighter yellow/cream
        ctx.fillStyle = '#FFF4CC';
        ctx.fillRect(-8 * scale, -3 * scale, 16 * scale, 12 * scale);
        ctx.fillRect(-7 * scale, 9 * scale, 14 * scale, 1 * scale);
        
        // Wing - orange with animation
        ctx.fillStyle = '#FF8C00';
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
        ctx.fillStyle = 'white';
        ctx.fillRect(6 * scale, -9 * scale, 8 * scale, 8 * scale);
        
        // Eye black pupil
        ctx.fillStyle = 'black';
        ctx.fillRect(9 * scale, -7 * scale, 5 * scale, 6 * scale);
        
        // Eye white shine
        ctx.fillStyle = 'white';
        ctx.fillRect(10 * scale, -6 * scale, 2 * scale, 2 * scale);
        
        // Beak upper part
        ctx.fillStyle = '#FF8800';
        ctx.fillRect(12 * scale, -5 * scale, 8 * scale, 3 * scale);
        ctx.fillRect(20 * scale, -6 * scale, 2 * scale, 1 * scale);
        
        // Beak lower part
        ctx.fillRect(12 * scale, -2 * scale, 6 * scale, 3 * scale);
        ctx.fillRect(18 * scale, -1 * scale, 2 * scale, 1 * scale);
        
        // Beak tip highlight
        ctx.fillStyle = '#FFB84D';
        ctx.fillRect(12 * scale, -4 * scale, 2 * scale, 1 * scale);
        
        // Cheek blush
        ctx.fillStyle = '#FF6B6B';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(4 * scale, 1 * scale, 5 * scale, 4 * scale);
        ctx.globalAlpha = 1;
        
        // Tail feathers
        ctx.fillStyle = '#FFC700';
        ctx.fillRect(-13 * scale, -3 * scale, 2 * scale, 6 * scale);
        ctx.fillRect(-15 * scale, -1 * scale, 2 * scale, 2 * scale);
        
        ctx.restore();
        ctx.imageSmoothingEnabled = true;
    }
    
    checkCollision() {
        // Ground collision
        if (this.y + this.size > canvas.height - CONFIG.FLOOR_HEIGHT) {
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
        this.x = canvas.width;
        this.gap = gameState.currentPipeGap;  // Use dynamic gap
        this.topHeight = Math.random() * (canvas.height - this.gap - CONFIG.FLOOR_HEIGHT - 100) + 50;
        this.scored = false;
    }
    
    update() {
        this.x -= gameState.currentSpeed;
    }
    
    draw() {
        const theme = THEMES[gameState.currentTheme];
        
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
        const bottomHeight = canvas.height - bottomY - CONFIG.FLOOR_HEIGHT;
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
        const bottomHeight = canvas.height - bottomY - CONFIG.FLOOR_HEIGHT;
        
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
    
    // Classic background
    if (gameState.currentTheme === 'classic') {
        drawClassicBackground();
        return;
    }
    
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height - CONFIG.FLOOR_HEIGHT);
    if (Array.isArray(theme.sky)) {
        theme.sky.forEach((color, index) => {
            gradient.addColorStop(index / (theme.sky.length - 1), color);
        });
    } else {
        gradient.addColorStop(0, theme.sky);
        gradient.addColorStop(1, theme.sky);
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height - CONFIG.FLOOR_HEIGHT);
    
    // Clouds (for day theme only)
    if (gameState.currentTheme === 'default') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        drawCloud(100 + (frameCount * 0.3 % 500), 100);
        drawCloud(300 + (frameCount * 0.2 % 600), 150);
        drawCloud(200 + (frameCount * 0.25 % 400), 200);
    }
    
    // Stars and moon (for night theme)
    if (gameState.currentTheme === 'night') {
        // Moon
        ctx.fillStyle = '#f0e68c';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(canvas.width - 80, 80, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Stars with twinkling effect
        ctx.fillStyle = 'white';
        for (let i = 0; i < 60; i++) {
            const x = (i * 37) % canvas.width;
            const y = (i * 53) % (canvas.height - CONFIG.FLOOR_HEIGHT - 50);
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
        ctx.arc(canvas.width / 2, sunY, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Sun reflection on horizon
        ctx.fillStyle = 'rgba(255, 99, 71, 0.3)';
        ctx.fillRect(0, canvas.height - CONFIG.FLOOR_HEIGHT - 50, canvas.width, 50);
        
        // Silhouette birds
        drawBirdSilhouette(150 + Math.sin(frameCount * 0.02) * 20, 100);
        drawBirdSilhouette(200 + Math.cos(frameCount * 0.015) * 15, 120);
    }
    
    // Ground with texture
    const groundGradient = ctx.createLinearGradient(0, canvas.height - CONFIG.FLOOR_HEIGHT, 0, canvas.height);
    groundGradient.addColorStop(0, theme.ground);
    groundGradient.addColorStop(1, theme.groundAccent);
    
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - CONFIG.FLOOR_HEIGHT, canvas.width, CONFIG.FLOOR_HEIGHT);
    
    // Ground pattern (grass-like texture)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 2;
    const offset = (frameCount * 2) % 40;
    for (let i = -offset; i < canvas.width; i += 20) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - CONFIG.FLOOR_HEIGHT);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        
        // Small grass marks
        if (i % 40 === 0) {
            ctx.beginPath();
            ctx.moveTo(i, canvas.height - CONFIG.FLOOR_HEIGHT);
            ctx.lineTo(i + 5, canvas.height - CONFIG.FLOOR_HEIGHT + 10);
            ctx.stroke();
        }
    }
    
    // Ground top border
    ctx.strokeStyle = theme.groundAccent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - CONFIG.FLOOR_HEIGHT);
    ctx.lineTo(canvas.width, canvas.height - CONFIG.FLOOR_HEIGHT);
    ctx.stroke();
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 20, y, 28, 0, Math.PI * 2);
    ctx.arc(x + 40, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 15, y - 10, 20, 0, Math.PI * 2);
    ctx.fill();
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
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - CONFIG.FLOOR_HEIGHT);
    skyGradient.addColorStop(0, '#4EC0CA');
    skyGradient.addColorStop(1, '#4EAFCA');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height - CONFIG.FLOOR_HEIGHT);
    
    // Clouds - moving white pixel clouds
    ctx.fillStyle = 'white';
    const cloudSpeed = 0.3;
    const cloudOffset1 = (frameCount * cloudSpeed) % (canvas.width + 100);
    const cloudOffset2 = (frameCount * cloudSpeed + 250) % (canvas.width + 100);
    const cloudOffset3 = (frameCount * cloudSpeed + 500) % (canvas.width + 100);
    
    drawPixelCloud(-100 + cloudOffset1, 60);
    drawPixelCloud(-100 + cloudOffset2, 110);
    drawPixelCloud(-100 + cloudOffset3, 160);
    
    // Ground base - tan/dirt color
    ctx.fillStyle = '#DED895';
    ctx.fillRect(0, canvas.height - CONFIG.FLOOR_HEIGHT, canvas.width, CONFIG.FLOOR_HEIGHT);
    
    // Ground scrolling texture - vertical stripes
    ctx.fillStyle = '#C0BC71';
    const groundScroll = (frameCount * 2) % 48;
    for (let i = -groundScroll; i < canvas.width + 48; i += 48) {
        ctx.fillRect(i, canvas.height - CONFIG.FLOOR_HEIGHT, 24, CONFIG.FLOOR_HEIGHT);
    }
    
    // Darker ground stripe pattern
    ctx.fillStyle = '#B8B565';
    for (let i = -groundScroll + 12; i < canvas.width + 48; i += 48) {
        ctx.fillRect(i, canvas.height - CONFIG.FLOOR_HEIGHT, 8, CONFIG.FLOOR_HEIGHT);
    }
    
    // Ground top border - green grass strip
    ctx.fillStyle = '#5EBF58';
    ctx.fillRect(0, canvas.height - CONFIG.FLOOR_HEIGHT, canvas.width, 16);
    
    // Grass texture dark lines
    ctx.fillStyle = '#4E9D44';
    for (let i = -groundScroll; i < canvas.width + 48; i += 12) {
        ctx.fillRect(i, canvas.height - CONFIG.FLOOR_HEIGHT + 4, 3, 12);
        ctx.fillRect(i + 6, canvas.height - CONFIG.FLOOR_HEIGHT + 2, 3, 10);
    }
    
    // Grass highlights
    ctx.fillStyle = '#7AD96A';
    for (let i = -groundScroll + 3; i < canvas.width + 48; i += 12) {
        ctx.fillRect(i, canvas.height - CONFIG.FLOOR_HEIGHT + 6, 2, 8);
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

// Game Loop
function gameLoop() {
    if (!gameState.running) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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
canvas.addEventListener('click', () => {
    if (gameState.running && bird) {
        bird.jump();
    }
});

// Jump control - Mouse left click (anywhere on document)
document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gameState.running && bird) {  // 0 = left click
        bird.jump();
    }
});

// Jump control - Touch
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.running && bird) {
        bird.jump();
    }
});

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
