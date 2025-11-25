// 1. 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// 2. 월드 및 카메라
const world = { width: 3000, height: 3000 };
const camera = { x: 0, y: 0 };

// 3. 플레이어 설정 (★★★ HP 추가 ★★★)
const player = {
    x: world.width / 2, 
    y: world.height / 2,
    radius: 15,
    color: 'white',
    speed: 3,
    aimAngle: 0,
    rotationSpeed: 0.05,
    hp: 100, // 주인공 체력
    maxHp: 100,
    damageCooldown: 0 // 피격 후 무적 시간
};

// 4. 구조물 배열
let obstacles = []; // 충돌 O (벽, 바위)
let buildings = []; // 렌더링 O, 충돌 X (바닥, 지붕 구역)
let doors = []; // 렌더링 O, 충돌 X (문)

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

// 6. ★★★ 엔티티(개체) 배열 ★★★
let bullets = []; // 플레이어 총알
let enemies = []; // 적
let enemyBullets = []; // ★★★ 적 총알
const bulletSpeed = 5;

// 7. 월드 생성 함수 (★★★ 집에 적 확정 스폰 ★★★)
function generateWorld() {
    const NUM_BUILDINGS = 10; 
    const NUM_OBSTACLES = 30;
    const WALL_THICKNESS = 10;
    const WALL_COLOR = '#333';
    const ROOF_COLOR = '#8B4513';
    const FLOOR_COLOR = '#CD853F'; 
    const ROCK_COLOR = '#555';
    const DOOR_SIZE = 40;
    const DOOR_COLOR = '#A0522D'; 

    // 건물 생성
    for (let i = 0; i < NUM_BUILDINGS; i++) {
        const w = Math.random() * 200 + 200; 
        const h = Math.random() * 200 + 200; 
        const x = Math.random() * (world.width - w);
        const y = Math.random() * (world.height - h);

        buildings.push({ x, y, width: w, height: h, roofColor: ROOF_COLOR, floorColor: FLOOR_COLOR });

        // 벽
        obstacles.push({ x: x, y: y, width: w, height: WALL_THICKNESS, color: WALL_COLOR }); // 위
        obstacles.push({ x: x, y: y + WALL_THICKNESS, width: WALL_THICKNESS, height: h - (WALL_THICKNESS * 2), color: WALL_COLOR }); // 왼쪽
        obstacles.push({ x: x + w - WALL_THICKNESS, y: y + WALL_THICKNESS, width: WALL_THICKNESS, height: h - (WALL_THICKNESS * 2), color: WALL_COLOR }); // 오른쪽
        
        // 아래쪽 벽 + 문 틈
        const doorPosition = x + (w / 2) - (DOOR_SIZE / 2);
        obstacles.push({ x: x, y: y + h - WALL_THICKNESS, width: (w / 2) - (DOOR_SIZE / 2), height: WALL_THICKNESS, color: WALL_COLOR });
        obstacles.push({ x: doorPosition + DOOR_SIZE, y: y + h - WALL_THICKNESS, width: (w / 2) - (DOOR_SIZE / 2), height: WALL_THICKNESS, color: WALL_COLOR });
        doors.push({ x: doorPosition, y: y + h - WALL_THICKNESS, width: DOOR_SIZE, height: WALL_THICKNESS, color: DOOR_COLOR });

        // ★★★ 집에 적(슈터) 1~2명 확정 스폰 ★★★
        const enemyCount = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < enemyCount; j++) {
            const innerX = x + WALL_THICKNESS + 10;
            const innerY = y + WALL_THICKNESS + 10;
            const innerWidth = w - (WALL_THICKNESS * 2) - 20;
            const innerHeight = h - (WALL_THICKNESS * 2) - 20;

            if (innerWidth > 0 && innerHeight > 0) {
                const spawnX = innerX + Math.random() * innerWidth;
                const spawnY = innerY + Math.random() * innerHeight;
                enemies.push({ 
                    x: spawnX, 
                    y: spawnY, 
                    radius: 12, 
                    color: 'purple', // 총 쏘는 적은 보라색
                    hp: 50, 
                    type: 'shooter', // 적 타입: 슈터
                    shootCooldown: 120 // 2초 쿨타임
                });
            }
        }
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

// ★★★ 추가: 시야 확인 (Line of Sight) ★★★
// (적과 플레이어 사이에 벽(Obstacle)이 있는지 확인)
function hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const step = 10; // 10픽셀마다 한 번씩 검사
    const numSteps = dist / step;
    
    const stepX = dx / numSteps;
    const stepY = dy / numSteps;

    let currX = x1;
    let currY = y1;

    for (let i = 0; i < numSteps; i++) {
        currX += stepX;
        currY += stepY;

        // 현재 지점을 1x1 사각형으로 판정
        const pointCollider = { x: currX, y: currY, width: 1, height: 1 };
        
        for (const obs of obstacles) {
            if (checkCollision(pointCollider, obs)) {
                return false; // 시야가 막힘
            }
        }
    }
    return true; // 시야가 깨끗함
}

// (그리기 함수들: drawBackground, drawBuildingFloors, drawDoors, drawObstacles - 변경 없음)
function drawBackground() {
    ctx.fillStyle = '#a8e6a0'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gridSize = 50; const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    ctx.strokeStyle = '#98d690'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        const screenX = x - camera.x; ctx.moveTo(screenX, 0); ctx.lineTo(screenX, canvas.height);
    }
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        const screenY = y - camera.y; ctx.moveTo(0, screenY); ctx.lineTo(canvas.width, screenY);
    }
    ctx.stroke(); ctx.closePath();
}
function drawBuildingFloors() {
    buildings.forEach(bldg => {
        const screenX = bldg.x - camera.x, screenY = bldg.y - camera.y;
        if (screenX + bldg.width > 0 && screenX < canvas.width && screenY + bldg.height > 0 && screenY < canvas.height) {
            ctx.fillStyle = bldg.floorColor; ctx.fillRect(screenX, screenY, bldg.width, bldg.height);
        }
    });
}
function drawDoors() {
    doors.forEach(door => {
        const screenX = door.x - camera.x, screenY = door.y - camera.y;
        if (screenX + door.width > 0 && screenX < canvas.width && screenY + door.height > 0 && screenY < canvas.height) {
            ctx.fillStyle = door.color; ctx.fillRect(screenX, screenY, door.width, door.height);
        }
    });
}
function drawObstacles() {
    obstacles.forEach(obs => {
        const screenX = obs.x - camera.x, screenY = obs.y - camera.y;
        if (screenX + obs.width > 0 && screenX < canvas.width && screenY + obs.height > 0 && screenY < canvas.height) {
            ctx.fillStyle = obs.color; ctx.fillRect(screenX, screenY, obs.width, obs.height);
        }
    });
}

// 플레이어 그리기 (변경 없음 - 버그 수정된 버전)
function drawPlayer() {
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    // 피격 시 무적(깜박임) 효과
    if (player.damageCooldown > 0 && Math.floor(player.damageCooldown / 6) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    // 몸체
    ctx.beginPath();
    ctx.arc(screenX, screenY, player.radius, 0, Math.PI * 2); 
    ctx.fillStyle = player.color; ctx.fill(); ctx.closePath();
    // 총구
    const aimX = screenX + Math.cos(player.aimAngle) * (player.radius + 10);
    const aimY = screenY + Math.sin(player.aimAngle) * (player.radius + 10);
    ctx.beginPath(); ctx.moveTo(screenX, screenY); ctx.lineTo(aimX, aimY);
    ctx.strokeStyle = 'cyan'; ctx.lineWidth = 3; ctx.stroke(); ctx.closePath();

    ctx.globalAlpha = 1.0; // 투명도 복구
}

// ★★★ 추가: HUD 그리기 (HP 바) ★★★
function drawHud() {
    // HP 바 배경
    ctx.fillStyle = 'grey';
    ctx.fillRect(10, 10, 200, 20);
    // HP
    const hpPercent = Math.max(0, player.hp) / player.maxHp;
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 200 * hpPercent, 20);
    // 테두리
    ctx.strokeStyle = 'black';
    ctx.strokeRect(10, 10, 200, 20);
}

// ★★★ 추가: 게임 오버 화면 ★★★
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'red';
    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
}

// ★★★ 변경: 플레이어 업데이트 (무적 시간 감소) ★★★
function updatePlayer() {
    if (player.hp <= 0) return; // 죽으면 멈춤

    // 무적 시간 감소
    if (player.damageCooldown > 0) {
        player.damageCooldown--;
    }

    if (keys.j) player.aimAngle -= player.rotationSpeed;
    if (keys.l) player.aimAngle += player.rotationSpeed;
    
    let nextX = player.x, nextY = player.y;
    if (keys.w) nextY -= player.speed;
    if (keys.s) nextY += player.speed;
    if (keys.a) nextX -= player.speed;
    if (keys.d) nextX += player.speed;
    
    const playerRadius = player.radius;
    let playerColliderX = { x: nextX - playerRadius, y: player.y - playerRadius, width: playerRadius * 2, height: playerRadius * 2 };
    let playerColliderY = { x: player.x - playerRadius, y: nextY - playerRadius, width: playerRadius * 2, height: playerRadius * 2 };
    
    let collidedX = false;
    for (const obs of obstacles) if (checkCollision(playerColliderX, obs)) { collidedX = true; break; }
    if (!collidedX) player.x = nextX;
    
    let collidedY = false;
    for (const obs of obstacles) if (checkCollision(playerColliderY, obs)) { collidedY = true; break; }
    if (!collidedY) player.y = nextY;

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

// 플레이어 총알 발사 (변경 없음)
function shoot() {
    if (player.hp <= 0) return;
    const angle = player.aimAngle;
    const velocity = { x: Math.cos(angle) * bulletSpeed, y: Math.sin(angle) * bulletSpeed };
    bullets.push({ x: player.x, y: player.y, radius: 5, color: 'cyan', velocity: velocity });
}

// ★★★ 추가: 적 총알 발사 ★★★
function enemyShoot(enemy) {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const velocity = { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 }; // 적 총알은 조금 느리게
    enemyBullets.push({ 
        x: enemy.x, 
        y: enemy.y, 
        radius: 4, 
        color: 'orange', // 적 총알은 주황색
        velocity: velocity 
    });
    enemy.shootCooldown = 120; // 2초 (120프레임) 쿨타임
}

// ★★★ 변경: 적 스폰 (야외, 드문드문) ★★★
function spawnEnemy() {
    // 야외(플레이어 주변)에 '추격자' 스폰
    const distance = Math.max(canvas.width / 2, canvas.height / 2) + 50;
    const angle = Math.random() * Math.PI * 2;
    let x = player.x + Math.cos(angle) * distance;
    let y = player.y + Math.sin(angle) * distance;
    x = Math.max(10, Math.min(world.width - 10, x));
    y = Math.max(10, Math.min(world.height - 10, y));

    enemies.push({ 
        x: x, y: y, 
        radius: 10, 
        color: 'red', // 추격자는 빨간색
        hp: 30,
        type: 'chaser', // 적 타입: 추격자
        speed: 1
    });
}

// 플레이어 총알 그리기/업데이트 (변경 없음)
function drawAndUpdateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;
        const screenX = bullet.x - camera.x, screenY = bullet.y - camera.y;
        if (bullet.x < 0 || bullet.x > world.width || bullet.y < 0 || bullet.y > world.height) {
            bullets.splice(i, 1); continue;
        }
        if (screenX > 0 && screenX < canvas.width && screenY > 0 && screenY < canvas.height) {
            ctx.beginPath(); ctx.arc(screenX, screenY, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = bullet.color; ctx.fill(); ctx.closePath();
        }
    }
}

// ★★★ 추가: 적 총알 그리기/업데이트 ★★★
function drawAndUpdateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;
        const screenX = bullet.x - camera.x, screenY = bullet.y - camera.y;
        if (bullet.x < 0 || bullet.x > world.width || bullet.y < 0 || bullet.y > world.height) {
            enemyBullets.splice(i, 1); continue;
        }
        if (screenX > 0 && screenX < canvas.width && screenY > 0 && screenY < canvas.height) {
            ctx.beginPath(); ctx.arc(screenX, screenY, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = bullet.color; ctx.fill(); ctx.closePath();
        }
    }
}

// ★★★ 변경: 적 그리기/업데이트 (AI 추가) ★★★
function drawAndUpdateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // --- 1. AI 로직 (월드 좌표 기준) ---
        if (enemy.type === 'chaser') {
            // '추격자' (빨간색) AI: 그냥 플레이어 따라가기
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed;
            enemy.y += Math.sin(angle) * enemy.speed;
        } 
        else if (enemy.type === 'shooter') {
            // '슈터' (보라색) AI: 시야가 확보되면 총 쏘기
            if (enemy.shootCooldown > 0) {
                enemy.shootCooldown--;
            }
            
            const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            // 400픽셀 이내로 들어오면
            if (dist < 400) { 
                // 벽에 막히지 않았는지 확인
                if (hasLineOfSight(enemy.x, enemy.y, player.x, player.y)) {
                    // 쿨타임이 0이면 발사
                    if (enemy.shootCooldown <= 0) {
                        enemyShoot(enemy);
                    }
                }
            }
            // (슈터는 움직이지 않음)
        }

        // --- 2. 그리기 (화면 좌표 기준) ---
        const screenX = enemy.x - camera.x;
        const screenY = enemy.y - camera.y;
        if (screenX > -enemy.radius && screenX < canvas.width + enemy.radius && 
            screenY > -enemy.radius && screenY < canvas.height + enemy.radius) 
        {
            ctx.beginPath();
            ctx.arc(screenX, screenY, enemy.radius, 0, Math.PI * 2);
            ctx.fillStyle = enemy.color; ctx.fill(); ctx.closePath();
            
            // ★★★ 적 HP 바 그리기 ★★★
            if (enemy.hp < (enemy.type === 'shooter' ? 50 : 30)) {
                const hpPercent = enemy.hp / (enemy.type === 'shooter' ? 50 : 30);
                ctx.fillStyle = 'red';
                ctx.fillRect(screenX - enemy.radius, screenY - enemy.radius - 10, enemy.radius * 2 * hpPercent, 5);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(screenX - enemy.radius, screenY - enemy.radius - 10, enemy.radius * 2, 5);
            }
        }
    }
}

// ★★★ 변경: 충돌 감지 (HP 시스템 적용) ★★★
function checkCollisions() {
    if (player.hp <= 0) return;

    // 1. 플레이어 총알 vs 적
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            const distance = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y); 
            if (distance < enemy.radius + bullet.radius) {
                bullets.splice(j, 1); // 총알 제거
                enemy.hp -= 10; // 적 HP 10 감소
                
                if (enemy.hp <= 0) {
                    enemies.splice(i, 1); // 적 사망
                }
                break; // 다음 적으로
            }
        }
    }

    // 2. 적 총알 vs 플레이어
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        const distance = Math.hypot(bullet.x - player.x, bullet.y - player.y);
        if (distance < player.radius + bullet.radius && player.damageCooldown <= 0) {
            enemyBullets.splice(i, 1); // 적 총알 제거
            player.hp -= 15; // 플레이어 HP 15 감소
            player.damageCooldown = 60; // 1초 무적
            break;
        }
    }

    // 3. '추격자' 적 vs 플레이어 (몸통 박치기)
    for (const enemy of enemies) {
        if (enemy.type === 'chaser') {
            const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (distance < player.radius + enemy.radius && player.damageCooldown <= 0) {
                player.hp -= 10; // 플레이어 HP 10 감소
                player.damageCooldown = 60; // 1초 무적
                break;
            }
        }
    }

    // 4. 플레이어 총알 vs 장애물 (벽, 바위)
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const bulletCollider = { x: bullet.x - bullet.radius, y: bullet.y - bullet.radius, width: bullet.radius * 2, height: bullet.radius * 2 };
        for (const obs of obstacles) {
            if (checkCollision(bulletCollider, obs)) {
                bullets.splice(i, 1); break; 
            }
        }
    }

    // 5. 적 총알 vs 장애물 (벽, 바위)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        const bulletCollider = { x: bullet.x - bullet.radius, y: bullet.y - bullet.radius, width: bullet.radius * 2, height: bullet.radius * 2 };
        for (const obs of obstacles) {
            if (checkCollision(bulletCollider, obs)) {
                enemyBullets.splice(i, 1); break; 
            }
        }
    }
}

// 건물 지붕 그리기 (변경 없음)
function drawBuildingRoofs() {
    const playerCollider = { x: player.x - player.radius, y: player.y - player.radius, width: player.radius * 2, height: player.radius * 2 };
    buildings.forEach(bldg => {
        const screenX = bldg.x - camera.x, screenY = bldg.y - camera.y;
        if (screenX + bldg.width > 0 && screenX < canvas.width && screenY + bldg.height > 0 && screenY < canvas.height) {
            if (checkCollision(playerCollider, bldg)) ctx.globalAlpha = 0.3; 
            else ctx.globalAlpha = 1.0; 
            ctx.fillStyle = bldg.roofColor;
            ctx.fillRect(screenX, screenY, bldg.width, bldg.height);
        }
    });
    ctx.globalAlpha = 1.0; 
}

// 9. 메인 게임 루프 (★★★ 그리기 순서 변경 ★★★)
function gameLoop() {
    // 1. 로직 업데이트
    updatePlayer();
    updateCamera(); 
    checkCollisions(); 

    // 2. 그리기 (순서 중요)
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 1. 화면 지우기
    drawBackground(); // 2. 배경
    drawBuildingFloors(); // 3. 건물 바닥
    drawDoors(); // 4. 문
    drawObstacles(); // 5. 장애물 (벽, 바위)
    
    drawAndUpdateEnemies(); // 6. 적 (AI 업데이트 포함)
    drawPlayer(); // 7. 플레이어
    drawAndUpdateBullets(); // 8. 플레이어 총알
    drawAndUpdateEnemyBullets(); // 9. ★★★ 적 총알

    drawBuildingRoofs(); // 10. 건물 지붕 (맨 위)
    drawHud(); // 11. ★★★ HUD (HP 바 등, 항상 맨 위)

    // 3. ★★★ 게임 오버 확인 ★★★
    if (player.hp <= 0) {
        drawGameOver();
        return; // 게임 루프 중단
    }

    // 4. 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 10. 게임 시작
generateWorld(); // 월드 생성
// ★★★ 변경: 스폰 간격 3초로 (드문드문)
setInterval(spawnEnemy, 3000); 
gameLoop();
