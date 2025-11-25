// 1. 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// ★★★ 추가: 월드(맵) 크기 설정
const world = {
    width: 30000,
    height: 40000
};

// ★★★ 추가: 카메라 설정
// 카메라는 캔버스(화면)가 월드 맵의 어느 부분을 비추고 있는지 그 좌상단 좌표를 저장합니다.
const camera = {
    x: 0,
    y: 0
};

// 2. 플레이어 설정
const player = {
    // ★★★ 변경: 플레이어 시작 위치를 월드 중앙으로
    x: world.width / 2, 
    y: world.height / 2,
    radius: 15,
    color: 'white',
    speed: 3,
    aimAngle: 0,
    rotationSpeed: 0.05
};

// 3. 키 입력 관리 (변경 없음)
const keys = {
    w: false, a: false, s: false, d: false,
    j: false, l: false
};

window.addEventListener('keydown', (e) => {
    if (keys[e.key] !== undefined) keys[e.key] = true;
    if (e.key === 'i') shoot();
});
window.addEventListener('keyup', (e) => {
    if (keys[e.key] !== undefined) keys[e.key] = false;
});

// 4. 총알 및 적 배열 (변경 없음)
let bullets = [];
let enemies = [];
const bulletSpeed = 5;
const enemySpeed = 1;

// 5. 게임 로직 함수

// ★★★ 추가: 배경(그리드) 그리기 함수
function drawBackground() {
    const gridSize = 50; // 그리드 한 칸의 크기
    
    // 카메라가 비추는 영역의 그리드만 그립니다.
    // 1. 그리기 시작할 x 좌표 (카메라 왼쪽 경계에 맞춤)
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    // 2. 그리기 시작할 y 좌표 (카메라 상단 경계에 맞춤)
    const startY = Math.floor(camera.y / gridSize) * gridSize;

    ctx.strokeStyle = '#222'; // 그리드 색상
    ctx.lineWidth = 1;
    ctx.beginPath();

    // 세로선 그리기
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        // 월드 좌표 x를 화면 좌표로 변환
        const screenX = x - camera.x; 
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
    }
    
    // 가로선 그리기
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        // 월드 좌표 y를 화면 좌표로 변환
        const screenY = y - camera.y;
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
    }
    
    ctx.stroke();
    ctx.closePath();
}

// ★★★ 변경: 플레이어 그리기 (항상 화면 중앙에 고정)
function drawPlayer() {
    // 플레이어는 항상 캔버스 중앙에 그립니다.
    const screenX = canvas.width / 2;
    const screenY = canvas.height / 2;

    // 1. 몸체 그리기
    ctx.beginPath();
    ctx.arc(screenX, screenY, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();

    // 2. 총구 그리기
    // 조준 각도에 따라 총구의 끝점을 계산
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

// ★★★ 변경: 플레이어 위치 업데이트 (월드 경계 체크)
function updatePlayer() {
    // 1. 이동
    if (keys.w) player.y -= player.speed;
    if (keys.s) player.y += player.speed;
    if (keys.a) player.x -= player.speed;
    if (keys.d) player.x += player.speed;

    // 2. 조준
    if (keys.j) player.aimAngle -= player.rotationSpeed;
    if (keys.l) player.aimAngle += player.rotationSpeed;

    // 3. ★★★ 월드 맵 경계 체크 ★★★
    // 플레이어가 월드 밖으로 나가지 못하게 함
    player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));
}

// ★★★ 추가: 카메라 업데이트 함수
// 플레이어의 위치에 따라 카메라 위치를 조정 (플레이어를 중앙에 두도록)
function updateCamera() {
    // 카메라의 x, y는 플레이어 위치에서 화면 크기의 절반을 뺀 값
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // 카메라가 월드 맵 밖을 비추지 않도록 고정
    camera.x = Math.max(0, Math.min(world.width - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(world.height - canvas.height, camera.y));
}

// 수동 총알 발사 (변경 없음)
// (총알은 플레이어의 '월드 좌표'에서 발사됩니다)
function shoot() {
    const angle = player.aimAngle;
    const velocity = {
        x: Math.cos(angle) * bulletSpeed,
        y: Math.sin(angle) * bulletSpeed
    };
    bullets.push({
        x: player.x, // 월드 좌표
        y: player.y, // 월드 좌표
        radius: 5,
        color: 'cyan',
        velocity: velocity
    });
}

// ★★★ 변경: 적 생성 (화면 밖, 플레이어 주변에 생성)
function spawnEnemy() {
    // 플레이어 위치를 기준으로 화면 밖(약간의 여유 포함)에 생성
    const distance = Math.max(canvas.width / 2, canvas.height / 2) + 50;
    const angle = Math.random() * Math.PI * 2;

    let x = player.x + Math.cos(angle) * distance;
    let y = player.y + Math.sin(angle) * distance;

    // 월드 밖으로 나가지 않게 좌표 보정
    x = Math.max(10, Math.min(world.width - 10, x));
    y = Math.max(10, Math.min(world.height - 10, y));

    enemies.push({
        x: x, // 월드 좌표
        y: y, // 월드 좌표
        radius: 10,
        color: 'red'
    });
}

// ★★★ 변경: 총알 그리기 및 업데이트
function drawAndUpdateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 1. 월드 좌표 업데이트
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;

        // 2. ★★★ 화면 좌표로 변환 ★★★
        const screenX = bullet.x - camera.x;
        const screenY = bullet.y - camera.y;

        // 3. 화면 밖으로 나간 총알 제거 (월드 기준)
        if (bullet.x < 0 || bullet.x > world.width || bullet.y < 0 || bullet.y > world.height) {
            bullets.splice(i, 1);
            continue; // 다음 총알로
        }
        
        // 4. ★★★ 화면 안에 있는 총알만 그리기 (성능 최적화) ★★★
        if (screenX > 0 && screenX < canvas.width && screenY > 0 && screenY < canvas.height) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = bullet.color;
            ctx.fill();
            ctx.closePath();
        }
    }
}

// ★★★ 변경: 적 그리기 및 업데이트
function drawAndUpdateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // 1. 월드 좌표 업데이트 (플레이어를 향해 이동)
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemySpeed;
        enemy.y += Math.sin(angle) * enemySpeed;

        // 2. ★★★ 화면 좌표로 변환 ★★★
        const screenX = enemy.x - camera.x;
        const screenY = enemy.y - camera.y;
        
        // 3. ★★★ 화면 안에 있는 적만 그리기 (성능 최적화) ★★★
        // (적 크기만큼 여유를 둬서 화면 가장자리에서도 보이게 함)
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

// 충돌 감지 (변경 없음)
// (모든 충돌 계산은 '월드 좌표' 기준으로 하므로 수정할 필요가 없습니다)
function checkCollisions() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            
            // 월드 좌표 기준 거리 계산
            const distance = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y); 

            if (distance < enemy.radius + bullet.radius) {
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                break; 
            }
        }
    }
}


// 6. 메인 게임 루프
function gameLoop() {
    // 1. 업데이트 (모든 월드 좌표 계산)
    updatePlayer();
    updateCamera(); // ★★★ 플레이어 이동 후 카메라가 따라감
    drawAndUpdateBullets(); // 총알 이동
    drawAndUpdateEnemies(); // 적 이동
    checkCollisions(); // 충돌 확인

    // 2. 그리기 (모든 것을 화면 좌표로 변환하여 그리기)
    // 2-1. 화면 지우기 (항상 맨 먼저)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2-2. ★★★ 배경 그리기 (카메라 위치 기준)
    drawBackground();

    // 2-3. 총알/적 그리기 (이미 drawAndUpdate 함수 내에서 처리됨)
    // (이 순서를 바꾸면 플레이어가 적/총알 뒤에 가려질 수 있습니다)

    // 2-4. 플레이어 그리기 (항상 화면 중앙, 맨 위에)
    drawPlayer();

    // 3. 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 7. 게임 시작
setInterval(spawnEnemy, 1000); // 1초마다 적 생성
gameLoop(); // 게임 루프 시작
