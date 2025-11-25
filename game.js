// 1. 캔버스 설정 설정
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

// ★★★ 추가: 지형지물(Obstacles) 배열 ★★★
// { x, y, width, height, color }
const obstacles = [
    // 큰 바위 (어두운 회색)
    { x: world.width / 2 + 200, y: world.height / 2 + 100, width: 80, height: 80, color: '#555' },
    { x: world.width / 2 - 300, y: world.height / 2 - 150, width: 100, height: 60, color: '#555' },
    
    // 컨테이너 (파란색)
    { x: world.width / 2 - 400, y: world.height / 2 + 200, width: 200, height: 60, color: 'blue' },
    
    // 건물 (갈색, 우선 단단한 블록으로)
    { x: world.width / 2 + 100, y: world.height / 2 - 400, width: 150, height: 200, color: '#8B4513' }
];

// 4. 키 입력 관리 (변경 없음)
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

// 5. 총알 및 적 배열 (변경 없음)
let bullets = [];
let enemies = [];
const bulletSpeed = 5;
const enemySpeed = 1;

// 6. 게임 로직 함수

// ★★★ 변경: 배경 그리기 (연두색)
function drawBackground() {
    // 1. 연두색 배경 칠하기
    ctx.fillStyle = '#a8e6a0'; // 연두색
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 그리드 그리기 (조금 더 연한 색으로)
    const gridSize = 50; 
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;

    ctx.strokeStyle = '#98d690'; // 연두색보다 살짝 진한 그리드
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        const screenX = x - camera.x; 
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
    }
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        const screenY = y - camera.y;
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
    }
    ctx.stroke();
    ctx.closePath();
}

// ★★★ 추가: 지형지물 그리기 ★★★
function drawObstacles() {
    obstacles.forEach(obs => {
        const screenX = obs.x - camera.x;
        const screenY = obs.y - camera.y;

        // 화면 안에 보이는 지형지물만 그리기
        if (screenX + obs.width > 0 && screenX < canvas.width &&
            screenY + obs.height > 0 && screenY < canvas.height) 
        {
            ctx.fillStyle = obs.color;
            ctx.fillRect(screenX, screenY, obs.width, obs.height);
        }
    });
}

// ★★★ 추가: 충돌 감지 헬퍼 함수 (사각형 vs 사각형) ★★★
// (플레이어와 총알은 편의상 사각형으로 판정합니다)
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// 플레이어 그리기 (변경 없음 - 항상 중앙)
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

// ★★★ 변경: 플레이어 업데이트 (지형지물 충돌 처리)
function updatePlayer() {
    // 1. 조준 (변경 없음)
    if (keys.j) player.aimAngle -= player.rotationSpeed;
    if (keys.l) player.aimAngle += player.rotationSpeed;

    // 2. 이동 (충돌 감지 추가)
    
    // 2-1. 다음 예상 위치 계산
    let nextX = player.x;
    let nextY = player.y;
    if (keys.w) nextY -= player.speed;
    if (keys.s) nextY += player.speed;
    if (keys.a) nextX -= player.speed;
    if (keys.d) nextX += player.speed;

    // 2-2. 플레이어의 충돌 박스 (단순화된 사각형)
    const playerRadius = player.radius; // 편의용
    let playerColliderX = { 
        x: nextX - playerRadius, y: player.y - playerRadius, 
        width: playerRadius * 2, height: playerRadius * 2 
    };
    let playerColliderY = { 
        x: player.x - playerRadius, y: nextY - playerRadius, 
        width: playerRadius * 2, height: playerRadius * 2 
    };

    // 2-3. X축 이동 충돌 검사
    let collidedX = false;
    for (const obs of obstacles) {
        if (checkCollision(playerColliderX, obs)) {
            collidedX = true;
            break;
        }
    }
    // X축 충돌 안 했으면 X 이동
    if (!collidedX) {
        player.x = nextX;
    }

    // 2-4. Y축 이동 충돌 검사
    let collidedY = false;
    for (const obs of obstacles) {
        if (checkCollision(playerColliderY, obs)) {
            collidedY = true;
            break;
        }
    }
    // Y축 충돌 안 했으면 Y 이동
    if (!collidedY) {
        player.y = nextY;
    }

    // (X, Y를 따로 검사하면 벽을 따라 미끄러지듯 이동이 가능해집니다)

    // 3. 월드 경계 체크 (변경 없음)
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
    const velocity = {
        x: Math.cos(angle) * bulletSpeed,
        y: Math.sin(angle) * bulletSpeed
    };
    bullets.push({
        x: player.x, y: player.y, radius: 5,
        color: 'cyan', velocity: velocity
    });
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

// 총알 그리기 및 업데이트 (변경 없음)
function drawAndUpdateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;
        const screenX = bullet.x - camera.x;
        const screenY = bullet.y - camera.y;
        if (bullet.x < 0 || bullet.x > world.width || bullet.y < 0 || bullet.y > world.height) {
            bullets.splice(i, 1);
            continue;
        }
        if (screenX > 0 && screenX < canvas.width && screenY > 0 && screenY < canvas.height) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = bullet.color;
            ctx.fill();
            ctx.closePath();
        }
    }
}

// 적 그리기 및 업데이트 (변경 없음 - 지형지물 통과)
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
            ctx.fillStyle = enemy.color;
            ctx.fill();
            ctx.closePath();
        }
    }
}

// ★★★ 변경: 충돌 감지 (총알-지형지물 추가)
function checkCollisions() {
    // 1. 총알 vs 적
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            const distance = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y); 
            if (distance < enemy.radius + bullet.radius) {
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                break; 
            }
        }
    }

    // 2. ★★★ 총알 vs 지형지물 ★★★
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        // 총알 충돌 박스 (단순화된 사각형)
        const bulletCollider = {
            x: bullet.x - bullet.radius, y: bullet.y - bullet.radius,
            width: bullet.radius * 2, height: bullet.radius * 2
        };
        
        for (const obs of obstacles) {
            if (checkCollision(bulletCollider, obs)) {
                bullets.splice(i, 1); // 총알 제거
                break; // 다음 총알로
            }
        }
    }
}

// 7. 메인 게임 루프
function gameLoop() {
    // 1. 로직 업데이트
    updatePlayer();
    updateCamera(); 
    checkCollisions(); // 충돌 확인

    // 2. 그리기 (순서 중요)
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 1. 화면 지우기
    drawBackground(); // 2. 배경 그리기
    drawObstacles(); // 3. ★★★ 지형지물 그리기
    drawAndUpdateEnemies(); // 4. 적 그리기 (지형지물 '위'에)
    drawAndUpdateBullets(); // 5. 총알 그리기 (지형지물 '위'에)
    drawPlayer(); // 6. 플레이어 그리기 (항상 맨 위)

    // 3. 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 8. 게임 시작
setInterval(spawnEnemy, 1000); 
gameLoop();
