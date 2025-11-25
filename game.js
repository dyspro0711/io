// 1. 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// 2. 플레이어 설정
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    color: 'white',
    speed: 3,
    aimAngle: 0, // ★★★ 추가: 플레이어 조준 각도 (0 = 오른쪽)
    rotationSpeed: 0.05 // ★★★ 추가: 회전 속도
};

// 3. 키 입력 관리
const keys = {
    w: false,
    a: false, // ★★★ 변경: 'j' -> 'a'
    s: false,
    d: false, // ★★★ 변경: 'l' -> 'd'
    j: false, // ★★★ 추가: 조준 (좌회전)
    l: false  // ★★★ 추가: 조준 (우회전)
};

// 키 눌림 이벤트
window.addEventListener('keydown', (e) => {
    // 이동 및 조준 키
    if (keys[e.key] !== undefined) {
        keys[e.key] = true;
    }
    
    // 발사 키
    if (e.key === 'i') {
        shoot(); // 'i' 키로 발사
    }
});

// 키 떼짐 이벤트
window.addEventListener('keyup', (e) => {
    if (keys[e.key] !== undefined) {
        keys[e.key] = false;
    }
});

// 4. 총알 및 적 배열
let bullets = [];
let enemies = [];

const bulletSpeed = 5;
const enemySpeed = 1;

// 5. 게임 로직 함수

// 플레이어 그리기
function drawPlayer() {
    // 1. 몸체 그리기
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();

    // ★★★ 추가: 조준 방향 '총구' 그리기 ★★★
    const aimX = player.x + Math.cos(player.aimAngle) * (player.radius + 10);
    const aimY = player.y + Math.sin(player.aimAngle) * (player.radius + 10);

    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(aimX, aimY);
    ctx.strokeStyle = 'cyan'; // 총알 색과 동일하게
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();
}

// 플레이어 위치 업데이트
function updatePlayer() {
    // 이동 (W, A, S, D)
    if (keys.w && player.y - player.radius > 0) {
        player.y -= player.speed;
    }
    if (keys.s && player.y + player.radius < canvas.height) {
        player.y += player.speed;
    }
    if (keys.a && player.x - player.radius > 0) { // ★★★ 변경: 'j' -> 'a'
        player.x -= player.speed;
    }
    if (keys.d && player.x + player.radius < canvas.width) { // ★★★ 변경: 'l' -> 'd'
        player.x += player.speed;
    }

    // ★★★ 추가: 조준 회전 (J, L) ★★★
    if (keys.j) {
        player.aimAngle -= player.rotationSpeed;
    }
    if (keys.l) {
        player.aimAngle += player.rotationSpeed;
    }
}

// ★★★ 삭제: findNearestEnemy() 함수는 더 이상 필요 없습니다. ★★★
// (자동 조준을 하지 않으므로 삭제)

// 수동 총알 발사
function shoot() {
    // ★★★ 변경: 가장 가까운 적을 찾는 대신, 플레이어의 조준 각도를 사용 ★★★
    const angle = player.aimAngle; 

    // 1. 속도 계산
    const velocity = {
        x: Math.cos(angle) * bulletSpeed,
        y: Math.sin(angle) * bulletSpeed
    };

    // 2. 총알 생성
    bullets.push({
        x: player.x,
        y: player.y,
        radius: 5,
        color: 'cyan',
        velocity: velocity
    });
}

// 적 생성 (변경 없음)
function spawnEnemy() {
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - 10 : canvas.width + 10;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - 10 : canvas.height + 10;
    }
    enemies.push({
        x: x,
        y: y,
        radius: 10,
        color: 'red'
    });
}

// 총알 그리기 및 업데이트 (변경 없음)
function drawAndUpdateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;

        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        ctx.fill();
        ctx.closePath();

        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }
}

// 적 그리기 및 업데이트 (변경 없음)
function drawAndUpdateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemySpeed;
        enemy.y += Math.sin(angle) * enemySpeed;

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        ctx.closePath();
    }
}

// 충돌 감지 (변경 없음)
function checkCollisions() {
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
}


// 6. 메인 게임 루프
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    drawAndUpdateBullets();
    drawAndUpdateEnemies();
    checkCollisions();
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

// 7. 게임 시작
setInterval(spawnEnemy, 1000); // 1초마다 적 생성
gameLoop(); // 게임 루프 시작
