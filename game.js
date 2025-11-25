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
    speed: 3
};

// 3. 키 입력 관리 (A, D를 J, L로 변경)
const keys = {
    w: false,
    s: false,
    j: false, // 'a' 대신 'j'
    l: false  // 'd' 대신 'l'
};

// 키 눌림 이벤트
window.addEventListener('keydown', (e) => {
    // 이동 키 처리
    if (keys[e.key] !== undefined) {
        keys[e.key] = true;
    }
    
    // ★★★ 변경점: 'i' 키로 총 발사 ★★★
    if (e.key === 'i') {
        shoot(); // 딜레이 없이 발사 함수 호출
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
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
}

// 플레이어 위치 업데이트 (A, D를 J, L로 변경)
function updatePlayer() {
    if (keys.w && player.y - player.radius > 0) {
        player.y -= player.speed;
    }
    if (keys.s && player.y + player.radius < canvas.height) {
        player.y += player.speed;
    }
    if (keys.j && player.x - player.radius > 0) { // 'a' -> 'j'
        player.x -= player.speed;
    }
    if (keys.l && player.x + player.radius < canvas.width) { // 'd' -> 'l'
        player.x += player.speed;
    }
}

// 가장 가까운 적 찾기 (자동 조준을 위해)
function findNearestEnemy() {
    let nearestEnemy = null;
    let minDistance = Infinity;

    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy); // 두 점 사이의 거리

        if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
        }
    });
    return nearestEnemy;
}

// ★★★ 변경점: 함수 이름 변경 (autoShoot -> shoot) ★★★
// 수동 발사를 위한 함수
function shoot() {
    const target = findNearestEnemy();
    if (!target) return; // 적이 없으면 발사 안 함

    // 1. 각도 계산
    const angle = Math.atan2(target.y - player.y, target.x - player.x);

    // 2. 속도 계산
    const velocity = {
        x: Math.cos(angle) * bulletSpeed,
        y: Math.sin(angle) * bulletSpeed
    };

    // 3. 총알 생성
    bullets.push({
        x: player.x,
        y: player.y,
        radius: 5,
        color: 'cyan',
        velocity: velocity
    });
}

// 적 생성
function spawnEnemy() {
    let x, y;
    // 캔버스 가장자리에서 랜덤하게 생성
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

// 총알 그리기 및 업데이트
function drawAndUpdateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 이동
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;

        // 그리기
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        ctx.fill();
        ctx.closePath();

        // 화면 밖으로 나간 총알 제거
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }
}

// 적 그리기 및 업데이트
function drawAndUpdateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // 플레이어 쪽으로 이동
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemySpeed;
        enemy.y += Math.sin(angle) * enemySpeed;

        // 그리기
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        ctx.closePath();
    }
}

// 충돌 감지
function checkCollisions() {
    // 총알 vs 적
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];

            const distance = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);

            // 충돌!
            if (distance < enemy.radius + bullet.radius) {
                // 적과 총알을 배열에서 제거
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                break; // 다음 적으로 넘어감
            }
        }
    }
}


// 6. 메인 게임 루프
function gameLoop() {
    // 1. 화면 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. 업데이트
    updatePlayer();
    drawAndUpdateBullets();
    drawAndUpdateEnemies();
    
    // 3. 충돌 확인
    checkCollisions();

    // 4. 그리기
    drawPlayer();

    // 5. 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 7. 게임 시작
// 1초마다 적 생성
setInterval(spawnEnemy, 1000);

// ★★★ 변경점: 자동 발사 인터벌 제거 ★★★
// setInterval(autoShoot, 500); // 이 줄을 삭제하거나 주석 처리합니다.

// 게임 루프 시작
gameLoop();
