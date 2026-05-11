const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Background animation setup
const bgContainer = document.getElementById('backgroundContainer');
const bavisBackgrounds = [];

class BackgroundBavis {
    constructor(index) {
        this.element = document.createElement('img');
        this.element.src = 'snake-head.png';
        this.element.className = 'bavis-bg';
        this.element.style.width = (150 + Math.random() * 200) + 'px';
        this.element.style.height = this.element.style.width;
        bgContainer.appendChild(this.element);

        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        this.time = Math.random() * 1000;
        this.waveAmplitude = 100 + Math.random() * 100;
        this.waveFrequency = 0.005 + Math.random() * 0.01;
        this.update();
    }

    update() {
        this.time += 1;
        this.angle += this.rotationSpeed;

        // Weird wave motion
        this.x += this.vx + Math.sin(this.time * this.waveFrequency) * 0.5;
        this.y += this.vy + Math.cos(this.time * this.waveFrequency * 0.7) * 0.5;

        // Bounce off edges
        if (this.x > window.innerWidth + 200) this.x = -200;
        if (this.x < -200) this.x = window.innerWidth + 200;
        if (this.y > window.innerHeight + 200) this.y = -200;
        if (this.y < -200) this.y = window.innerHeight + 200;

        // Random direction changes
        if (Math.random() < 0.01) {
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = (Math.random() - 0.5) * 3;
        }

        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.style.transform = `rotate(${this.angle}rad)`;
    }
}

// Create background Bavis instances
for (let i = 0; i < 12; i++) {
    bavisBackgrounds.push(new BackgroundBavis(i));
}

// Animate background
function animateBackground() {
    bavisBackgrounds.forEach(b => b.update());
    requestAnimationFrame(animateBackground);
}
animateBackground();

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

let gameRunning = false;
let gamePaused = false;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;

document.getElementById('highScore').textContent = highScore;

// Simple JSON-based leaderboard via Vercel API
async function fetchLeaderboard() {
    try {
        const response = await fetch('/api/scores');
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        return await response.json();
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

async function submitScore(name, scoreValue) {
    try {
        const response = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, score: scoreValue })
        });
        if (!response.ok) throw new Error('Failed to submit score');
        return await response.json();
    } catch (error) {
        console.error('Error submitting score:', error);
        return null;
    }
}

function showLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    modal.classList.add('show');
    
    fetchLeaderboard().then(scores => {
        const list = document.getElementById('leaderboardList');
        if (scores.length === 0) {
            list.innerHTML = '<p style="color: #9dd4ff; text-align: center;">No scores yet. Be the first!</p>';
            return;
        }
        
        list.innerHTML = scores.map((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            return `
                <div class="leaderboard-entry top-${Math.min(index + 1, 3)}">
                    <span class="leaderboard-rank">${medal || index + 1}.</span>
                    <span class="leaderboard-name">${entry.name}</span>
                    <span class="leaderboard-score">${entry.score}</span>
                </div>
            `;
        }).join('');
    });
}

function showSubmitScoreModal(scoreValue) {
    document.getElementById('scoreValue').textContent = `Score: ${scoreValue}`;
    document.getElementById('playerName').value = '';
    document.getElementById('playerName').focus();
    document.getElementById('submitScoreModal').classList.add('show');
}

// Snake configuration
let snake = [
    { x: Math.floor(TILE_COUNT / 2), y: Math.floor(TILE_COUNT / 2) }
];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

// Food configuration
let food = { x: 0, y: 0 };

// Snake head image
let snakeHeadImage = new Image();
snakeHeadImage.src = 'snake-head.png';
let imageLoaded = false;

snakeHeadImage.onload = () => {
    imageLoaded = true;
    console.log('Snake head image loaded successfully');
};

snakeHeadImage.onerror = () => {
    console.warn('Failed to load snake-head.png');
};

// Color palette from the image
const COLORS = {
    darkBg: '#0f1420',
    bodyGreen: '#4dd4ac',
    bodyDarkGreen: '#2d8b7a',
    foodRed: '#ff6b6b',
    gridGreen: '#1a4d3d'
};

function spawnFood() {
    let validSpot = false;
    while (!validSpot) {
        food.x = Math.floor(Math.random() * TILE_COUNT);
        food.y = Math.floor(Math.random() * TILE_COUNT);
        validSpot = !snake.some(segment => segment.x === food.x && segment.y === food.y);
    }
}

function update() {
    if (!gameRunning || gamePaused) return;

    direction = nextDirection;

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Check wall collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        endGame();
        return;
    }

    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endGame();
        return;
    }

    snake.unshift(head);

    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('score').textContent = score;
        spawnFood();
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = COLORS.darkBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = COLORS.gridGreen;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = COLORS.foodRed;
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Draw snake body
    for (let i = 1; i < snake.length; i++) {
        const segment = snake[i];
        if (imageLoaded) {
            ctx.drawImage(snakeHeadImage, segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        } else {
            // Fallback to rectangle if image not loaded
            ctx.fillStyle = COLORS.bodyGreen;
            ctx.fillRect(
                segment.x * GRID_SIZE + 1,
                segment.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2
            );
        }
    }

    // Draw snake head
    const head = snake[0];
    const headX = head.x * GRID_SIZE;
    const headY = head.y * GRID_SIZE;

    // If image is loaded, draw it
    if (imageLoaded) {
        ctx.drawImage(snakeHeadImage, headX, headY, GRID_SIZE, GRID_SIZE);
    } else {
        // Fallback to styled square if image not loaded
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(headX + 1, headY + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(headX + 5, headY + 5, 3, 3);
        ctx.fillRect(headX + 12, headY + 5, 3, 3);
    }
}

function gameLoop() {
    update();
    draw();
}

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        snake = [{ x: Math.floor(TILE_COUNT / 2), y: Math.floor(TILE_COUNT / 2) }];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        document.getElementById('score').textContent = score;
        spawnFood();
        document.getElementById('gameStatus').textContent = 'Game Running...';
        document.getElementById('startBtn').textContent = 'PAUSE';
    } else if (!gamePaused) {
        gamePaused = true;
        document.getElementById('gameStatus').textContent = 'PAUSED';
        document.getElementById('startBtn').textContent = 'RESUME';
    } else {
        gamePaused = false;
        document.getElementById('gameStatus').textContent = 'Game Running...';
        document.getElementById('startBtn').textContent = 'PAUSE';
    }
}

function resetGame() {
    gameRunning = false;
    gamePaused = false;
    snake = [{ x: Math.floor(TILE_COUNT / 2), y: Math.floor(TILE_COUNT / 2) }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('gameStatus').textContent = 'Press SPACE to start';
    document.getElementById('startBtn').textContent = 'START GAME';
    spawnFood();
    draw();
}

function endGame() {
    gameRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
        showSubmitScoreModal(score);
    } else {
        document.getElementById('gameStatus').textContent = `Game Over! Score: ${score}`;
    }
    document.getElementById('startBtn').textContent = 'START GAME';
}

// Input handling
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('keydown', (e) => {
    if (!gameRunning && e.code === 'Space') {
        startGame();
        e.preventDefault();
    }

    const key = e.key.toLowerCase();
    
    // Arrow keys
    if (e.key === 'ArrowUp' || key === 'w') {
        if (direction.y === 0) nextDirection = { x: 0, y: -1 };
        e.preventDefault();
    } else if (e.key === 'ArrowDown' || key === 's') {
        if (direction.y === 0) nextDirection = { x: 0, y: 1 };
        e.preventDefault();
    } else if (e.key === 'ArrowLeft' || key === 'a') {
        if (direction.x === 0) nextDirection = { x: -1, y: 0 };
        e.preventDefault();
    } else if (e.key === 'ArrowRight' || key === 'd') {
        if (direction.x === 0) nextDirection = { x: 1, y: 0 };
        e.preventDefault();
    }
});

// Touch controls for mobile
document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchmove', (e) => {
    if (!gameRunning) return;
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    const minSwipeDistance = 30;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && direction.x === 0) {
                nextDirection = { x: 1, y: 0 };
            } else if (deltaX < 0 && direction.x === 0) {
                nextDirection = { x: -1, y: 0 };
            }
            touchStartX = touchEndX;
        }
    } else {
        // Vertical swipe
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0 && direction.y === 0) {
                nextDirection = { x: 0, y: 1 };
            } else if (deltaY < 0 && direction.y === 0) {
                nextDirection = { x: 0, y: -1 };
            }
            touchStartY = touchEndY;
        }
    }
});

// Button event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);

// Modal controls
document.getElementById('submitScoreBtn').addEventListener('click', async () => {
    const name = document.getElementById('playerName').value.trim();
    if (!name) {
        alert('Please enter a name!');
        return;
    }
    
    const scoreValue = parseInt(document.getElementById('scoreValue').textContent.split(': ')[1]);
    const result = await submitScore(name, scoreValue);
    if (result?.success) {
        document.getElementById('submitScoreModal').classList.remove('show');
        showLeaderboard();
    } else {
        alert('Score submission failed. The leaderboard may not be available in this deployment.');
    }
});

document.getElementById('skipSubmitBtn').addEventListener('click', () => {
    document.getElementById('submitScoreModal').classList.remove('show');
});

// Close modals
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('show');
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

// Allow Enter key to submit score
document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('submitScoreBtn').click();
    }
});

// Initialize
spawnFood();
draw();
setInterval(gameLoop, 100);
