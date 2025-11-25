// 1. 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// 2. 월드 및 카메라
const world = { width: 3000, height: 3000 };
const camera = { x: 0, y: 0 };

// 3. 플레이어 설정
const player = {
    x: world.width / 2, 
    y: world.height / 2,
    radius: 15,
    color: 'white',
    speed: 3,
    aimAngle: 0,
    rotationSpeed: 0.05
};

// 4. 구조물 배열
let obstacles = []; // 충돌 O (벽, 바위)
let buildings = []; // 렌더링 O, 충돌 X (바닥, 지붕 구역)
let doors = []; // ★★★ 추가: 렌더링 O, 충돌 X (문)

// 5. 키 입력 관리 (변경 없음)
const keys = {
    w: false, a: false, s: false, d: false,
    j: false, l: false
};
window.addEventListener('keydown', (e) => {
    if (keys[e.key] !== undefined) keys[e.key] = true;
    if (e.key.toLowerCase() === 'i') shoot();
});
window.addEventListener('keyup', (e) => {
    if (keys[e.key] !== undefined) keys[e.key] = false;
});

// 6. 총알 및 적 배열 (변경 없음)
let bullets = [];
let enemies = [];
const bulletSpeed = 5;
const enemySpeed = 1;

// 7. 월드 생성 함수
function generateWorld() {
    // ★★★ 변경: 건물 수 줄이고, 바위 수 늘림
    const NUM_BUILDINGS = 10; // (기존 20)
    const NUM_OBSTACLES = 30; // (기존 15)
    
    const WALL_THICKNESS = 10;
    const WALL_COLOR = '#333';
    const ROOF_COLOR = '#8B4513';
    const FLOOR_COLOR = '#CD853F'; 
    const ROCK_COLOR = '#555';
    const DOOR_SIZE = 40;
    const DOOR_COLOR = '#A0522D'; // ★★★ 추가: 문 색상 (Sienna)

    // 건물 생성
    for (let i = 0; i < NUM_BUILDINGS; i++) {
        // ★★★ 변경: 건물 크기 증가
        const w = Math.random() * 150 + 150; // 150~300 (기존: 100~200)
        const h = Math.random() * 150 + 150; // 150~300 (기존: 100~200)
        const x = Math.random() * (world.width - w);
        const y = Math.random() * (world.height - h);

        // 1. 지붕/바닥 구역
        buildings.push({ 
            x, y, width: w, height: h, 
            roofColor: ROOF_COLOR, floorColor: FLOOR_COLOR 
        });

        // 2. 벽 (Obstacles)
        obstacles.push({ x: x, y: y, width: w, height: WALL_THICKNESS, color: WALL_COLOR }); // 위
        obstacles.push({ x: x, y: y + WALL_THICKNESS, width: WALL_THICKNESS, height: h - (WALL_THICKNESS * 2), color: WALL_COLOR }); // 왼쪽
        obstacles.push({ x: x + w - WALL_THICKNESS, y: y + WALL_THICKNESS, width: WALL_THICKNESS, height: h - (WALL_THICKNESS * 2), color: WALL_COLOR }); // 오른쪽
        
        // 3. 아래쪽 벽 + 문 틈
        const doorPosition = x + (w / 2) - (DOOR_SIZE / 2);
        // 아래 벽 - 왼쪽
        obstacles.push({ x: x, y: y + h - WALL_THICKNESS, width: (w / 2) - (DOOR_SIZE / 2), height: WALL_THICKNESS, color: WALL_COLOR });
        // 아래 벽 - 오른쪽
        obstacles.push({ x: doorPosition + DOOR_SIZE, y: y + h - WALL_THICKNESS, width: (w / 2) - (DOOR_SIZE / 2), height: WALL_THICKNESS, color: WALL_COLOR });

        // 4. ★★★ 추가: 시각적인 문 생성 (doors 배열)
        doors.push({
            x: doorPosition,
            y: y + h - WALL_THICKNESS,
            width: DOOR_SIZE,
            height: WALL_THICKNESS,
            color: DOOR_COLOR
        });
    }

    // 바위(장애물) 생성
    for (let i = 0; i < NUM_OBSTACLES; i++) {
        const w = Math.random() * 40 + 20; 
        const h = Math.random() * 40 + 20;
        const x = Math.random() * (world.width - w);
        const y = Math.random() * (world.height - h);
        obstacles.push({ x, y, width: w, height: h, color: ROCK_COLOR });
    }
}

// 8. 게임 로직 함수

// 충돌 감지 헬퍼 (변경 없음)
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// 배경 그리기 (변경 없음)
function drawBackground() {
    ctx.fillStyle = '#a8e6a0'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gridSize = 50; 
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    ctx.strokeStyle = '#98d690'; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        const screenX = x - camera.x; 
        ctx.moveTo(screenX, 0); ctx.lineTo(screenX, canvas.height);
    }
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        const screenY = y - camera.y;
        ctx.moveTo(0, screenY); ctx.lineTo(canvas.width, screenY);
    }
    ctx.stroke();
    ctx.closePath();
}

// 건물 바닥 그리기 (변경 없음)
function drawBuildingFloors() {
    buildings.forEach(bldg => {
        const screenX = bldg.x - camera.x;
        const screenY = bldg.y - camera.y;
        if (screenX + bldg.width > 0 && screenX < canvas.width &&
            screenY + bldg.height > 0 && screenY < canvas.height) 
        {
            ctx.fillStyle = bldg.floorColor;
            ctx.fillRect(screenX, screenY, bldg.width, bldg.height);
        }
    });
}

// ★★★ 추가: 문 그리기 ★★★
function drawDoors() {
    doors.forEach(door => {
        const screenX = door.x - camera.x;
        const screenY = door.y - camera.y;

        // 화면 안에 보이는 문만 그리기
        if (screenX + door.width > 0 && screenX < canvas.width &&
            screenY + door.height > 0 && screenY < canvas.height) 
        {
            ctx.fillStyle = door.color;
            ctx.fillRect(screenX, screenY, door.width, door.height);
        }
    });
}

// 장애물(벽, 바위) 그리기 (변경 없음)
function drawObstacles() {
    obstacles.forEach(obs => {
        const screenX = obs.x - camera.x;
        const screenY = obs.y - camera.y;
        if (screenX + obs.width > 0 && screenX < canvas.width &&
            screenY + obs.height > 0 && screenY < canvas.height) 
        {
            ctx.fillStyle = obs.color;
            ctx.fillRect(screenX, screenY, obs.width, obs.height);
        }
    });
}

// 플레이어 그리기 (변경 없음)
function drawPlayer() {
    const screenX = canvas.width / 2;
    const screenY = canvas.height / 2;
    // 몸체
    ctx.beginPath();
    ctx.arc(screenX, screenY, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
    // 총구
    const aimX = screenX + Math.cos(player.aimAngle) * (player.radius + 10);
    const aimY = screenY + Math.sin(player.aimAngle) * (player.radius + 10);
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(aimX, aimY);
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();
}

// 플레이어 업데이트 (변경 없음)
function updatePlayer() {
    // 1. 조준
    if (keys.j) player.aimAngle -= player.rotationSpeed;
    if (keys.l) player.aimAngle += player.rotationSpeed;
    // 2. 이동
    let nextX = player.x;
    let nextY = player.y;
    if (keys.w) nextY -= player.speed;
    if (keys.s) nextY += player.speed;
    if (keys.a) nextX -= player.speed;
    if (keys.d) nextX += player.speed;
    
    // 3. 충돌 검사 (X, Y 분리)
    const playerRadius = player.radius;
    let playerColliderX = { x: nextX - playerRadius, y: player.y - playerRadius, width: playerRadius * 2, height: playerRadius * 2 };
    let playerColliderY = { x: player.x - playerRadius, y: nextY - playerRadius, width: playerRadius * 2, height: playerRadius * 2 };
    
    let collidedX = false;
    for (const obs of obstacles) {
        if (checkCollision(playerColliderX, obs)) {
            collidedX = true; break;
        }
    }
    if (!collIdedX) {
        player.x = nextX;
    }
    
    let collidedY = false;
    for (const obs of obstacles) {
        if (checkCollision(playerColliderY, obs)) {
            collidedY = true; break;
        }
    }
    if (!collidedY) {
        player.y = nextY;
    }

    // 4. 월드 경계
    player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));
}

// 카메라 업데이트 (변경 없음)
function updateCamera() {
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(world.width - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(world.height - canvas.height, camera.y));
}

// 총알 발사 (변경 없음)
function shoot() {
    const angle = player.aimAngle;
    const velocity = { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed };
    bullets.push({ x: player.x, y: player.y, radius: 5, color: 'cyan', velocity: velocity });
}

// 적 생성 (변경 없음)
function spawnEnemy() {
    const distance = Math.max(canvas.width / 2, canvas.height / 2) + 50;
    const angle = Math.random() * Math.PI * 2;
    let x = player.x + Math.cos(angle) * distance;
    let y = player.y + Math.sin(angle) * distance;
    x = Math.max(10, Math.min(world.width - 10, x));
    y = Math.max(10, Math.min(world.height - 10, y));
    enemies.push({ x: x, y: y, radius: 10, color: 'red' });
}

// 총알 그리기/업데이트 (변경 없음)
function drawAndUpdateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;
        const screenX = bullet.x - camera.x;
        const screenY = bullet.y - camera.y;
        if (bullet.x < 0 || bullet.x > world.width || bullet.y < 0 || bullet.y > world.height) {
            bullets.splice(i, 1); continue;
        }
        if (screenX > 0 && screenX < canvas.width && screenY > 0 && screenY < canvas.height) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = bullet.color; ctx.fill(); ctx.closePath();
        }
    }
}

// 적 그리기/업데이트 (변경 없음)
function drawAndUpdateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemySpeed;
        enemy.y += Math.sin(angle) * enemySpeed;
        const screenX = enemy.x - camera.x;
        const screenY = enemy.y - camera.y;
        if (screenX > -enemy.radius && screenX < canvas.width + enemy.radius && 
            screenY > -enemy.radius && screenY < canvas.height + enemy.radius) 
        {
            ctx.beginPath();
            ctx.arc(screenX, screenY, enemy.radius, 0, Math.PI * 2);
            ctx.fillStyle = enemy.color; ctx.fill(); ctx.closePath();
        }
    }
}

// 충돌 감지 (변경 없음)
function checkCollisions() {
    // 1. 총알 vs 적
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            const distance = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y); 
            if (distance < enemy.radius + bullet.radius) {
                enemies.splice(i, 1); bullets.splice(j, 1); break; 
            }
        }
    }

    // 2. 총알 vs 장애물(벽, 바위)
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const bulletCollider = {
            x: bullet.x - bullet.radius, y: bullet.y - bullet.radius,
            width: bullet.radius * 2, height: bullet.radius * 2
        };
        for (const obs of obstacles) {
            if (checkCollision(bulletCollider, obs)) {
                bullets.splice(i, 1); break; 
            }
        }
    }
}

// 건물 지붕 그리기 (변경 없음)
function drawBuildingRoofs() {
    const playerCollider = {
        x: player.x - player.radius, y: player.y - player.radius,
        width: player.radius * 2, height: player.radius * 2
    };

    buildings.forEach(bldg => {
        const screenX = bldg.x - camera.x;
        const screenY = bldg.y - camera.y;

        if (screenX + bldg.width > 0 && screenX < canvas.width &&
            screenY + bldg.height > 0 && screenY < canvas.height) 
        {
            if (checkCollision(playerCollider, bldg)) {
                ctx.globalAlpha = 0.3; // 30% 투명도
            } else {
                ctx.globalAlpha = 1.0; // 100% 불투명
            }
            
            ctx.fillStyle = bldg.roofColor;
            ctx.fillRect(screenX, screenY, bldg.width, bldg.height);
        }
    });
    ctx.globalAlpha = 1.0; 
}

// 9. 메인 게임 루프 (★★★ 렌더링 순서 변경 ★★★)
function gameLoop() {
    // 1. 로직 업데이트
    updatePlayer();
    updateCamera(); 
    checkCollisions(); 

    // 2. 그리기 (순서 중요)
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 1. 화면 지우기
    drawBackground(); // 2. 배경 (연두색)
    drawBuildingFloors(); // 3. 건물 바닥
    drawDoors(); // 4. ★★★ 문 그리기 (추가)
    drawObstacles(); // 5. 장애물 (벽, 바위)
    
    // (이 사이에 그려지는 것들은 지붕 '아래'에 위치함)
    drawAndUpdateEnemies(); // 6. 적
    drawPlayer(); // 7. 플레이어
    drawAndUpdateBullets(); // 8. 총알

    drawBuildingRoofs(); // 9. 건물 지붕 (맨 위, 투명도 조절)

    // 3. 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 10. 게임 시작
generateWorld(); // 월드 생성
setInterval(spawnEnemy, 1000); 
gameLoop();
