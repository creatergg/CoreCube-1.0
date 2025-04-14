    // ========== НАСТРОЙКИ ИГРЫ ==========
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const levelDisplay = document.getElementById("level");
    const ammoDisplay = document.getElementById("ammo");
    const healthDisplay = document.getElementById("health");
    const levelComplete = document.getElementById("levelComplete");
    const bgMusic = document.getElementById("bgMusic");
    const jumpSound = document.getElementById("jumpSound");
    const completeSound = document.getElementById("completeSound");
    const shootSound = document.getElementById("shootSound");
    const trapSound = document.getElementById("trapSound");
    const enemyDeathSound = document.getElementById("enemyDeathSound");
    const musicToggle = document.getElementById("musicToggle");
    const creatorToggle = document.getElementById("creatorToggle");
    const hideIdsToggle = document.getElementById("hideIdsToggle");
    const gunToggle = document.getElementById("gunToggle");
    const creatorPanel = document.getElementById("creatorPanel");
    const levelInput = document.getElementById("levelInput");
    const goToLevelBtn = document.getElementById("goToLevelBtn");

    let lastTime = 0;
    let fps = 0;
    let frameCount = 0;
    let lastFpsUpdate = 0;
    let isMusicOn = true;
    let isCreatorMode = false;
    let showPlatformIds = false;
    let currentLevel = 0;
    let isGameActive = true;
    let isLevelComplete = false;
    let levelCompleteTime = 0;
    const creatorCode = "Karen123";
    let enteredCode = "";

    // ========== ИГРОК ==========
    const player = {
      x: 50,
      y: 300,
      width: 40,
      height: 40,
      xDelta: 0,
      yVelocity: 0,
      gravity: 0.5,
      jumpPower: -12,
      grounded: false,
      face: "right",
      lastFace: "right",
      canJump: true,
      color: "#4169E1",
      hasGun: false,
      bullets: [],
      lastShot: 0,
      shootCooldown: 500,
      ammo: 30,
      health: 3,
      invincible: false,
      invincibleTimer: 0
    };

    // ========== ВРАГИ ==========
    class Enemy {
      constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.health = type === 'shooter' ? 3 : 1;
        this.speed = type === 'flyer' ? 2 : 1;
        this.direction = 1;
        this.shootTimer = 0;
        this.bullets = [];
        this.color = type === 'shooter' ? '#8B0000' : '#FF0000';
        this.originalX = x;
        this.moveRange = 100;
      }

      update() {
        if (this.type === 'walker' || this.type === 'shooter') {
          this.x += this.speed * this.direction;
          
          // Ограничение движения врага в пределах moveRange
          if (Math.abs(this.x - this.originalX) > this.moveRange) {
            this.direction *= -1;
          }
          
          // Проверка столкновений с платформами
          const currentLevelData = levels[currentLevel];
          let onPlatform = false;
          
          for (let platform of currentLevelData.platforms) {
            if (this.x <= platform.x && 
                this.x + this.width >= platform.x && 
                this.y + this.height <= platform.y + 5 && 
                this.y + this.height >= platform.y - 5) {
              this.direction = 1;
            }
            
            if (this.x + this.width >= platform.x + platform.width && 
                this.x <= platform.x + platform.width && 
                this.y + this.height <= platform.y + 5 && 
                this.y + this.height >= platform.y - 5) {
              this.direction = -1;
            }
            
            if (this.y + this.height >= platform.y && 
                this.y <= platform.y + platform.height && 
                ((this.x + this.width >= platform.x && this.x <= platform.x) || 
                 (this.x <= platform.x + platform.width && this.x + this.width >= platform.x + platform.width))) {
              this.direction *= -1;
            }
            
            if (this.x + this.width > platform.x && 
                this.x < platform.x + platform.width && 
                this.y + this.height >= platform.y - 5 && 
                this.y + this.height <= platform.y + 5) {
              onPlatform = true;
              this.y = platform.y - this.height;
            }
          }
          
          if (!onPlatform && this.grounded) {
            this.direction *= -1;
          }
        } 
        else if (this.type === 'flyer') {
          this.x += this.speed * this.direction;
          this.y += Math.sin(Date.now() / 500) * 2;
          
          if (this.x <= 0 || this.x + this.width >= canvas.width) {
            this.direction *= -1;
          }
        }
        
        if (this.type === 'shooter') {
          this.shootTimer++;
          if (this.shootTimer > 120) {
            this.shoot();
            this.shootTimer = 0;
          }
        }
        
        this.bullets.forEach((bullet, index) => {
          bullet.update();
          if (bullet.x < 0 || bullet.x > canvas.width) {
            this.bullets.splice(index, 1);
          }
        });
      }

      shoot() {
        const direction = player.x < this.x ? -1 : 1;
        const bulletX = direction === 1 ? this.x + this.width : this.x;
        this.bullets.push(new Bullet(bulletX, this.y + this.height/2, direction, true));
        shootSound.currentTime = 0;
        shootSound.play();
      }

      draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = "#000";
        if (this.direction === 1) {
          ctx.fillRect(this.x + this.width - 10, this.y + 5, 5, 5);
          ctx.fillRect(this.x + this.width - 20, this.y + 5, 5, 5);
        } else {
          ctx.fillRect(this.x + 5, this.y + 5, 5, 5);
          ctx.fillRect(this.x + 15, this.y + 5, 5, 5);
        }
        
        this.bullets.forEach(bullet => bullet.draw(ctx));
      }
    }

    // ========== ЛОВУШКИ ==========
    class Trap {
      constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.active = true;
        this.timer = 0;
        this.falling = false;
        this.fallSpeed = 0;
      }

      update() {
        if (this.type === 'laser') {
          this.timer = (this.timer + 1) % 100;
          this.active = this.timer < 50;
        }
        else if (this.type === 'falling') {
          if (player.x < this.x + this.width &&
              player.x + player.width > this.x &&
              player.y + player.height >= this.y - 5 &&
              player.y + player.height <= this.y + 5) {
            this.falling = true;
          }
          
          if (this.falling) {
            this.fallSpeed += 0.2;
            this.y += this.fallSpeed;
            
            if (this.y > canvas.height) {
              this.active = false;
            }
          }
        }
      }

      draw(ctx) {
        if (!this.active && (this.type === 'laser' || this.type === 'falling')) return;
        
        switch (this.type) {
          case 'spike':
            ctx.fillStyle = "#999";
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height);
            ctx.lineTo(this.x + this.width/2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.fill();
            break;
          case 'lava':
            ctx.fillStyle = `hsl(${Date.now()/100 % 360}, 100%, 50%)`;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            break;
          case 'laser':
            ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            const gradient = ctx.createRadialGradient(
              this.x + this.width/2, this.y + this.height/2, 5,
              this.x + this.width/2, this.y + this.height/2, 20
            );
            gradient.addColorStop(0, "rgba(255, 100, 100, 0.8)");
            gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
            
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x - 15, this.y - 15, this.width + 30, this.height + 30);
            break;
          case 'falling':
            ctx.fillStyle = this.falling ? "#FF6347" : "#777";
            ctx.fillRect(this.x, this.y, this.width, this.height);
            break;
        }
      }
    }

    // ========== ПУЛИ ==========
    class Bullet {
      constructor(x, y, direction, isEnemyBullet = false) {
        this.x = x;
        this.y = y;
        this.width = isEnemyBullet ? 15 : 10;
        this.height = isEnemyBullet ? 8 : 5;
        this.speed = isEnemyBullet ? 7 : 10;
        this.direction = direction;
        this.color = isEnemyBullet ? "#00FF00" : "#FF0000";
        this.isEnemyBullet = isEnemyBullet;
      }

      update() {
        this.x += this.speed * this.direction;
      }

      draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        const trailWidth = this.isEnemyBullet ? 3 : 2;
        ctx.fillStyle = this.isEnemyBullet ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 0, 0, 0.3)";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(
            this.x - i * this.direction * 3, 
            this.y + (i % 2) * 2, 
            trailWidth, 
            trailWidth
          );
        }
      }
    }

    // ========== УРОВНИ ==========
    const levels = [
      // Уровень 1 (обучающий)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 100, height: 10, color: "#777", id: "p1" },
          { x: 250, y: 250, width: 100, height: 10, color: "#777", id: "p2" },
          { x: 400, y: 200, width: 100, height: 10, color: "#777", id: "p3" }
        ],
        traps: [
          new Trap(150, 370, 20, 10, 'spike'),
          new Trap(300, 370, 20, 10, 'spike')
        ],
        enemies: [],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 160, radius: 20 }
      },
      
      // Уровень 2 (первые враги)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 80, height: 10, color: "#777", id: "p1" },
          { x: 250, y: 250, width: 80, height: 10, color: "#777", id: "p2" },
          { x: 400, y: 200, width: 80, height: 10, color: "#777", id: "p3" }
        ],
        traps: [
          new Trap(200, 370, 20, 10, 'spike'),
          new Trap(300, 370, 20, 10, 'spike')
        ],
        enemies: [
          new Enemy(300, 330, 30, 30, 'walker')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 160, radius: 20 }
      },
      
      // Уровень 3 (летающие враги)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 60, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 250, width: 60, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 200, width: 60, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 150, width: 60, height: 10, color: "#777", id: "p4" }
        ],
        traps: [
          new Trap(150, 370, 20, 10, 'spike'),
          new Trap(250, 370, 20, 10, 'spike'),
          new Trap(350, 370, 20, 10, 'spike')
        ],
        enemies: [
          new Enemy(200, 100, 30, 30, 'flyer'),
          new Enemy(400, 100, 30, 30, 'flyer')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 110, radius: 20 }
      },
      
      // Уровень 4 (лазеры)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 50, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 250, width: 50, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 200, width: 50, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 150, width: 50, height: 10, color: "#777", id: "p4" },
          { x: 500, y: 100, width: 50, height: 10, color: "#777", id: "p5" }
        ],
        traps: [
          new Trap(0, 50, 600, 10, 'laser'),
          new Trap(0, 150, 600, 10, 'laser'),
          new Trap(0, 250, 600, 10, 'laser')
        ],
        enemies: [
          new Enemy(150, 330, 30, 30, 'walker')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 60, radius: 20 }
      },
      
      // Уровень 5 (лава)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 40, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 250, width: 40, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 200, width: 40, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 150, width: 40, height: 10, color: "#777", id: "p4" }
        ],
        traps: [
          new Trap(150, 370, 300, 10, 'lava')
        ],
        enemies: [
          new Enemy(250, 330, 30, 30, 'walker'),
          new Enemy(350, 330, 30, 30, 'walker')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 110, radius: 20 }
      },
      
      // Уровень 6 (падающие платформы)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 30, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 250, width: 30, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 200, width: 30, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 150, width: 30, height: 10, color: "#777", id: "p4" }
        ],
        traps: [
          new Trap(100, 300, 30, 10, 'falling'),
          new Trap(200, 250, 30, 10, 'falling'),
          new Trap(300, 200, 30, 10, 'falling')
        ],
        enemies: [
          new Enemy(150, 100, 30, 30, 'flyer')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 100, radius: 20 }
      },
      
      // Уровень 7 (стреляющие враги)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 30, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 250, width: 30, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 200, width: 30, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 150, width: 30, height: 10, color: "#777", id: "p4" },
          { x: 500, y: 100, width: 30, height: 10, color: "#777", id: "p5" }
        ],
        traps: [
          new Trap(150, 370, 20, 10, 'spike'),
          new Trap(250, 370, 20, 10, 'spike'),
          new Trap(350, 370, 20, 10, 'spike')
        ],
        enemies: [
          new Enemy(200, 330, 40, 40, 'shooter'),
          new Enemy(400, 330, 40, 40, 'shooter')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 60, radius: 20 },
        giveGun: true
      },
      
      // Уровень 8 (комбинация всех ловушек)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 30, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 250, width: 30, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 200, width: 30, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 150, width: 30, height: 10, color: "#777", id: "p4" }
        ],
        traps: [
          new Trap(150, 370, 20, 10, 'spike'),
          new Trap(0, 100, 600, 10, 'laser'),
          new Trap(350, 370, 300, 10, 'lava'),
          new Trap(200, 250, 30, 10, 'falling')
        ],
        enemies: [
          new Enemy(250, 330, 30, 30, 'walker'),
          new Enemy(150, 100, 30, 30, 'flyer')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 100, radius: 20 }
      },
      
      // Уровень 9 (вертикальный)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 320, width: 30, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 270, width: 30, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 220, width: 30, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 170, width: 30, height: 10, color: "#777", id: "p4" },
          { x: 500, y: 120, width: 30, height: 10, color: "#777", id: "p5" },
          { x: 400, y: 70, width: 30, height: 10, color: "#777", id: "p6" },
          { x: 300, y: 20, width: 30, height: 10, color: "#777", id: "p7" }
        ],
        traps: [
          new Trap(150, 370, 20, 10, 'spike'),
          new Trap(250, 370, 20, 10, 'spike'),
          new Trap(350, 370, 20, 10, 'spike'),
          new Trap(450, 370, 20, 10, 'spike')
        ],
        enemies: [
          new Enemy(150, 330, 30, 30, 'walker'),
          new Enemy(350, 330, 30, 30, 'walker'),
          new Enemy(250, 150, 30, 30, 'flyer')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 350, y: 0, radius: 20 }
      },
      
      // Уровень 10 (босс)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 30, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 250, width: 30, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 200, width: 30, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 150, width: 30, height: 10, color: "#777", id: "p4" },
          { x: 500, y: 100, width: 30, height: 10, color: "#777", id: "p5" }
        ],
        traps: [
          new Trap(150, 370, 300, 10, 'lava'),
          new Trap(0, 50, 600, 10, 'laser')
        ],
        enemies: [
          new Enemy(200, 330, 50, 50, 'shooter'),
          new Enemy(400, 330, 50, 50, 'shooter'),
          new Enemy(300, 100, 50, 50, 'shooter')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 60, radius: 20 },
        giveGun: true
      },

      // Уровень 11 (лабиринт)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 0, y: 0, width: 20, height: 380, color: "#777", id: "left-wall" },
          { x: 580, y: 0, width: 20, height: 380, color: "#777", id: "right-wall" },
          { x: 100, y: 300, width: 100, height: 10, color: "#777", id: "p1" },
          { x: 250, y: 250, width: 100, height: 10, color: "#777", id: "p2" },
          { x: 100, y: 200, width: 100, height: 10, color: "#777", id: "p3" },
          { x: 250, y: 150, width: 100, height: 10, color: "#777", id: "p4" },
          { x: 100, y: 100, width: 100, height: 10, color: "#777", id: "p5" }
        ],
        traps: [
          new Trap(200, 370, 20, 10, 'spike'),
          new Trap(300, 370, 20, 10, 'spike'),
          new Trap(400, 370, 20, 10, 'spike'),
          new Trap(500, 370, 20, 10, 'spike')
        ],
        enemies: [
          new Enemy(150, 330, 30, 30, 'walker'),
          new Enemy(350, 330, 30, 30, 'walker'),
          new Enemy(150, 180, 30, 30, 'walker')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 60, radius: 20 }
      },

      // Уровень 12 (узкие платформы)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 50, y: 320, width: 30, height: 10, color: "#777", id: "p1" },
          { x: 150, y: 280, width: 30, height: 10, color: "#777", id: "p2" },
          { x: 250, y: 240, width: 30, height: 10, color: "#777", id: "p3" },
          { x: 350, y: 200, width: 30, height: 10, color: "#777", id: "p4" },
          { x: 450, y: 160, width: 30, height: 10, color: "#777", id: "p5" },
          { x: 300, y: 120, width: 30, height: 10, color: "#777", id: "p6" },
          { x: 200, y: 80, width: 30, height: 10, color: "#777", id: "p7" },
          { x: 100, y: 40, width: 30, height: 10, color: "#777", id: "p8" }
        ],
        traps: [
          new Trap(120, 360, 20, 20, 'spike'),
          new Trap(220, 320, 20, 20, 'spike'),
          new Trap(320, 280, 20, 20, 'spike'),
          new Trap(420, 240, 20, 20, 'spike'),
          new Trap(520, 200, 20, 20, 'spike'),
          new Trap(0, 100, 600, 10, 'laser')
        ],
        enemies: [
          new Enemy(200, 330, 40, 40, 'shooter'),
          new Enemy(400, 330, 40, 40, 'shooter'),
          new Enemy(300, 50, 40, 40, 'flyer')
        ],
        startPos: { x: 80, y: 300 },
        target: { x: 130, y: 20, radius: 20 },
        giveGun: true
      },

      // Уровень 13 (бонусный с пистолетом)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 100, height: 10, color: "#777", id: "p1" },
          { x: 250, y: 250, width: 100, height: 10, color: "#777", id: "p2" },
          { x: 400, y: 200, width: 100, height: 10, color: "#777", id: "p3" },
          { x: 200, y: 150, width: 100, height: 10, color: "#777", id: "p4" },
          { x: 350, y: 100, width: 100, height: 10, color: "#777", id: "p5" }
        ],
        traps: [
          new Trap(150, 370, 400, 10, 'lava'),
          new Trap(50, 200, 20, 20, 'spike'),
          new Trap(550, 150, 20, 20, 'spike')
        ],
        enemies: [
          new Enemy(300, 330, 40, 40, 'shooter'),
          new Enemy(400, 330, 40, 40, 'shooter'),
          new Enemy(200, 330, 40, 40, 'shooter')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 60, radius: 20 },
        giveGun: true
      },

      // Уровень 14 (много летающих врагов)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 80, height: 10, color: "#777", id: "p1" },
          { x: 250, y: 250, width: 80, height: 10, color: "#777", id: "p2" },
          { x: 400, y: 200, width: 80, height: 10, color: "#777", id: "p3" }
        ],
        traps: [
          new Trap(150, 370, 20, 10, 'spike'),
          new Trap(300, 370, 20, 10, 'spike'),
          new Trap(450, 370, 20, 10, 'spike')
        ],
        enemies: [
          new Enemy(100, 100, 30, 30, 'flyer'),
          new Enemy(200, 150, 30, 30, 'flyer'),
          new Enemy(300, 100, 30, 30, 'flyer'),
          new Enemy(400, 150, 30, 30, 'flyer'),
          new Enemy(500, 100, 30, 30, 'flyer')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 160, radius: 20 }
      },

      // Уровень 15 (финальный)
      {
        platforms: [
          { x: 0, y: 380, width: 600, height: 20, color: "#555", id: "ground" },
          { x: 100, y: 300, width: 30, height: 10, color: "#777", id: "p1" },
          { x: 200, y: 250, width: 30, height: 10, color: "#777", id: "p2" },
          { x: 300, y: 200, width: 30, height: 10, color: "#777", id: "p3" },
          { x: 400, y: 150, width: 30, height: 10, color: "#777", id: "p4" },
          { x: 500, y: 100, width: 30, height: 10, color: "#777", id: "p5" }
        ],
        traps: [
          new Trap(0, 50, 600, 10, 'laser'),
          new Trap(0, 150, 600, 10, 'laser'),
          new Trap(0, 250, 600, 10, 'laser'),
          new Trap(150, 370, 300, 10, 'lava'),
          new Trap(450, 370, 150, 10, 'lava')
        ],
        enemies: [
          new Enemy(200, 330, 50, 50, 'shooter'),
          new Enemy(400, 330, 50, 50, 'shooter'),
          new Enemy(300, 100, 50, 50, 'shooter'),
          new Enemy(100, 100, 50, 50, 'shooter'),
          new Enemy(500, 100, 50, 50, 'shooter')
        ],
        startPos: { x: 50, y: 300 },
        target: { x: 550, y: 60, radius: 20 },
        giveGun: true
      }
    ];

    // ========== ИНИЦИАЛИЗАЦИЯ УРОВНЯ ==========
    function initLevel(level) {
      if (level >= levels.length) level = 0;
      if (level < 0) level = levels.length - 1;
      
      player.x = levels[level].startPos.x;
      player.y = levels[level].startPos.y;
      player.yVelocity = 0;
      player.xDelta = 0;
      player.grounded = false;
      player.canJump = true;
      player.bullets = [];
      player.invincible = false;
      player.invincibleTimer = 0;
      player.health = 3;
      healthDisplay.textContent = player.health;
      
      if (levels[level].giveGun) {
        player.hasGun = true;
        player.ammo = 30;
      } else {
        player.hasGun = false;
      }
      
      levelDisplay.textContent = level + 1;
      levelInput.value = level + 1;
      ammoDisplay.textContent = player.hasGun ? player.ammo : "∞";
      isLevelComplete = false;
      currentLevel = level;
    }

    // ========== ОСНОВНОЙ ИГРОВОЙ ЦИКЛ ==========
    function update() {
      if (!isGameActive || isLevelComplete) return;
      
      player.bullets.forEach((bullet, index) => {
        bullet.update();
        
        if (bullet.x < 0 || bullet.x > canvas.width) {
          player.bullets.splice(index, 1);
          return;
        }
        
        if (levels[currentLevel].enemies) {
          for (let enemy of levels[currentLevel].enemies) {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
              enemy.health--;
              if (enemy.health <= 0) {
                levels[currentLevel].enemies.splice(levels[currentLevel].enemies.indexOf(enemy), 1);
                enemyDeathSound.currentTime = 0;
                enemyDeathSound.play();
              }
              player.bullets.splice(index, 1);
              break;
            }
          }
        }
      });
      
      if (levels[currentLevel].traps) {
        levels[currentLevel].traps.forEach(trap => trap.update());
      }
      
      if (levels[currentLevel].enemies) {
        levels[currentLevel].enemies.forEach(enemy => {
          enemy.update();
          
          if (!player.invincible &&
              player.x < enemy.x + enemy.width &&
              player.x + player.width > enemy.x &&
              player.y < enemy.y + enemy.height &&
              player.y + player.height > enemy.y) {
            player.health--;
            healthDisplay.textContent = player.health;
            player.invincible = true;
            player.invincibleTimer = 60;
            trapSound.currentTime = 0;
            trapSound.play();
            
            if (player.health <= 0) {
              initLevel(currentLevel);
              return;
            }
          }
          
          enemy.bullets.forEach((bullet, index) => {
            if (!player.invincible &&
                bullet.x < player.x + player.width &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.height &&
                bullet.y + bullet.height > player.y) {
              player.health--;
              healthDisplay.textContent = player.health;
              player.invincible = true;
              player.invincibleTimer = 60;
              trapSound.currentTime = 0;
              trapSound.play();
              enemy.bullets.splice(index, 1);
              
              if (player.health <= 0) {
                initLevel(currentLevel);
                return;
              }
            }
          });
        });
      }
      
      if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
          player.invincible = false;
        }
      }
      
      const prevX = player.x;
      const prevY = player.y;
      
      player.x += player.xDelta;
      player.y += player.yVelocity;
      
      if (!player.grounded) {
        player.yVelocity += player.gravity;
      }

      player.grounded = false;

      for (let platform of levels[currentLevel].platforms) {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            prevY + player.height <= platform.y &&
            player.y + player.height >= platform.y) {
          player.y = platform.y - player.height;
          player.yVelocity = 0;
          player.grounded = true;
          player.canJump = true;
        }
        
        if (player.y < platform.y + platform.height &&
            player.y + player.height > platform.y) {
          if (prevX + player.width <= platform.x && 
              player.x + player.width > platform.x) {
            player.x = platform.x - player.width;
          }
          else if (prevX >= platform.x + platform.width && 
                  player.x < platform.x + platform.width) {
            player.x = platform.x + platform.width;
          }
        }
        
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            prevY >= platform.y + platform.height &&
            player.y < platform.y + platform.height) {
          player.y = platform.y + platform.height;
          player.yVelocity = 0;
        }
      }

      if (levels[currentLevel].traps) {
        for (let trap of levels[currentLevel].traps) {
          if (!trap.active) continue;
          
          if (player.x < trap.x + trap.width &&
              player.x + player.width > trap.x &&
              player.y < trap.y + trap.height &&
              player.y + player.height > trap.y) {
            trapSound.currentTime = 0;
            trapSound.play();
            initLevel(currentLevel);
            return;
          }
        }
      }

      if (player.x < 0) player.x = 0;
      if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
      
      if (player.y + player.height > canvas.height) {
        initLevel(currentLevel);
      }

      if (player.xDelta > 0) {
        player.face = "right";
        player.lastFace = "right";
      } else if (player.xDelta < 0) {
        player.face = "left";
        player.lastFace = "left";
      } else if (!player.grounded && player.yVelocity < 0) {
        player.face = "up";
      } else {
        player.face = player.lastFace;
      }

      const target = levels[currentLevel].target;
      const dx = (player.x + player.width/2) - target.x;
      const dy = (player.y + player.height/2) - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < target.radius + player.width/2 && !isLevelComplete) {
        completeLevel();
      }
    }

    // ========== ОТРИСОВКА ИГРЫ ==========
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let platform of levels[currentLevel].platforms) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(platform.x, platform.y + platform.height, platform.width, 3);
        
        if (showPlatformIds && platform.id) {
          ctx.fillStyle = "#000";
          ctx.font = "10px 'Press Start 2P'";
          ctx.textBaseline = "top";
          ctx.fillText(platform.id, platform.x + 5, platform.y + 5);
        }
      }

      if (levels[currentLevel].traps) {
        levels[currentLevel].traps.forEach(trap => trap.draw(ctx));
      }

      if (levels[currentLevel].enemies) {
        levels[currentLevel].enemies.forEach(enemy => {
          enemy.draw(ctx);
          enemy.bullets.forEach(bullet => bullet.draw(ctx));
        });
      }

      const target = levels[currentLevel].target;
      ctx.fillStyle = "gold";
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius + 5 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
      ctx.stroke();

      player.bullets.forEach(bullet => bullet.draw(ctx));

      if (!player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        drawFace();
      }

      if (player.hasGun) {
        ctx.fillStyle = "#333";
        const gunX = player.face === "right" ? player.x + player.width : player.x - 15;
        ctx.fillRect(gunX, player.y + 15, 15, 10);
      }

      if (!player.grounded) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.beginPath();
        ctx.ellipse(
          player.x + player.width/2, 
          player.y + player.height + 5, 
          player.width/2 - 5, 
          5, 
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
      
      if (isCreatorMode) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(10, 10, 200, 80);
        ctx.fillStyle = "#fff";
        ctx.font = "14px 'Press Start 2P'";
        ctx.fillText(`Уровень: ${currentLevel + 1}`, 20, 30);
        ctx.fillText(`Патроны: ${player.ammo}`, 20, 50);
        ctx.fillText(`Здоровье: ${player.health}`, 20, 70);
      }
    }

    function drawFace() {
      ctx.fillStyle = "#000";
      const px = player.x;
      const py = player.y;

      if (player.face === "right") {
        ctx.fillRect(px + 25, py + 15, 5, 5);
        ctx.fillRect(px + 15, py + 15, 5, 5);
      } else if (player.face === "left") {
        ctx.fillRect(px + 5, py + 15, 5, 5);
        ctx.fillRect(px + 15, py + 15, 5, 5);
      } else if (player.face === "up") {
        ctx.fillRect(px + 10, py + 8, 5, 5);
        ctx.fillRect(px + 25, py + 8, 5, 5);
      }
    }

    function shoot() {
      if (!player.hasGun || 
          Date.now() - player.lastShot < player.shootCooldown || 
          player.ammo <= 0) return;
      
      const direction = player.lastFace === "right" ? 1 : -1;
      const bulletX = direction === 1 ? player.x + player.width : player.x;
      
      player.bullets.push(new Bullet(bulletX, player.y + 15, direction));
      shootSound.currentTime = 0;
      shootSound.play();
      player.lastShot = Date.now();
      
      if (player.ammo !== Infinity) {
        player.ammo--;
        ammoDisplay.textContent = player.ammo;
      }
    }

    function completeLevel() {
      isLevelComplete = true;
      levelCompleteTime = Date.now();
      levelComplete.style.opacity = 1;
      completeSound.currentTime = 0;
      completeSound.play();
      
      setTimeout(() => {
        levelComplete.style.opacity = 0;
        if (currentLevel < levels.length - 1) {
          currentLevel++;
        } else {
          currentLevel = 0;
        }
        initLevel(currentLevel);
      }, 1500);
    }

    function updateFPS(timestamp) {
      frameCount++;
      if (timestamp - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = timestamp;
      }
    }

    function loop(timestamp) {
      updateFPS(timestamp);
      update();
      draw();
      requestAnimationFrame(loop);
    }

    // ========== УПРАВЛЕНИЕ ==========
    document.addEventListener("keydown", function(e) {
      if (!isGameActive || isLevelComplete) return;
      
      const code = e.code;
      
      if (code === "ArrowRight" || code === "KeyD") {
        player.xDelta = 5;
      }
      if (code === "ArrowLeft" || code === "KeyA") {
        player.xDelta = -5;
      }

      if ((code === "ArrowUp" || code === "KeyW" || code === "Space") && player.grounded && player.canJump) {
        player.yVelocity = player.jumpPower;
        player.grounded = false;
        player.canJump = false;
        setTimeout(() => player.canJump = true, 500);
        jumpSound.currentTime = 0;
        jumpSound.play();
      }
      
      if (code === "KeyF") {
        shoot();
      }
      
      if (code.startsWith("Key")) {
        enteredCode += code[3];
        if (enteredCode.length > creatorCode.length) {
          enteredCode = enteredCode.slice(1);
        }
        
        if (enteredCode === creatorCode) {
          isCreatorMode = !isCreatorMode;
          creatorToggle.style.backgroundColor = isCreatorMode ? "rgba(255, 165, 0, 0.5)" : "rgba(0, 0, 0, 0.3)";
          creatorPanel.style.display = isCreatorMode ? "block" : "none";
          enteredCode = "";
        }
      }
      
      if (isCreatorMode && code >= "Digit1" && code <= "Digit9") {
        const levelNum = parseInt(code[5]) - 1;
        if (levelNum < levels.length) {
          currentLevel = levelNum;
          initLevel(currentLevel);
        }
      }
    });

    document.addEventListener("keyup", function(e) {
      const code = e.code;
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(code)) {
        player.xDelta = 0;
      }
    });

    function move(direction) {
      if (!isGameActive || isLevelComplete) return;
      
      if (direction === "left") {
        player.xDelta = -5;
      } 
      if (direction === "right") {
        player.xDelta = 5;
      }
      if (direction === "up" && player.grounded && player.canJump) {
        player.yVelocity = player.jumpPower;
        player.grounded = false;
        player.canJump = false;
        setTimeout(() => player.canJump = true, 500);
        jumpSound.currentTime = 0;
        jumpSound.play();
      }
    }

    function stopMove() {
      player.xDelta = 0;
    }

    document.getElementById("left").addEventListener("touchstart", () => move("left"));
    document.getElementById("left").addEventListener("touchend", stopMove);
    document.getElementById("left").addEventListener("mousedown", () => move("left"));
    document.getElementById("left").addEventListener("mouseup", stopMove);
    document.getElementById("left").addEventListener("mouseleave", stopMove);

    document.getElementById("right").addEventListener("touchstart", () => move("right"));
    document.getElementById("right").addEventListener("touchend", stopMove);
    document.getElementById("right").addEventListener("mousedown", () => move("right"));
    document.getElementById("right").addEventListener("mouseup", stopMove);
    document.getElementById("right").addEventListener("mouseleave", stopMove);

    document.getElementById("jump").addEventListener("click", () => move("up"));
    document.getElementById("jump").addEventListener("touchstart", () => move("up"));

    document.getElementById("shoot").addEventListener("click", shoot);
    document.getElementById("shoot").addEventListener("touchstart", shoot);

    musicToggle.addEventListener("click", () => {
      isMusicOn = !isMusicOn;
      musicToggle.textContent = isMusicOn ? "🔊" : "🔇";
      if (isMusicOn) bgMusic.play();
      else bgMusic.pause();
    });

    creatorToggle.addEventListener("click", () => {
      isCreatorMode = !isCreatorMode;
      creatorToggle.style.backgroundColor = isCreatorMode ? "rgba(255, 165, 0, 0.5)" : "rgba(0, 0, 0, 0.3)";
      creatorPanel.style.display = isCreatorMode ? "block" : "none";
    });

    hideIdsToggle.addEventListener("click", () => {
      showPlatformIds = !showPlatformIds;
      hideIdsToggle.style.backgroundColor = showPlatformIds ? "rgba(255, 165, 0, 0.5)" : "rgba(0, 0, 0, 0.3)";
    });

    gunToggle.addEventListener("click", () => {
      player.hasGun = !player.hasGun;
      gunToggle.style.backgroundColor = player.hasGun ? "rgba(255, 165, 0, 0.5)" : "rgba(0, 0, 0, 0.3)";
      ammoDisplay.textContent = player.hasGun ? player.ammo : "∞";
    });

    goToLevelBtn.addEventListener("click", () => {
      const levelNum = parseInt(levelInput.value) - 1;
      if (levelNum >= 0 && levelNum < levels.length) {
        currentLevel = levelNum;
        initLevel(currentLevel);
      } else {
        levelInput.value = currentLevel + 1;
      }
    });

    // Запуск игры
    initLevel(0);
    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => {
      document.body.addEventListener("click", () => bgMusic.play(), { once: true });
    });
    requestAnimationFrame(loop);