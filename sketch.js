/*
  Week 6 — Example 4: Adding HUD (Score/Health), Enemies, and Interactive Objects

  Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
  Date: Feb. 26, 2026

  Controls:
    A or D (Left / Right Arrow)   Horizontal movement
    W (Up Arrow)                  Jump
    Space Bar                     Attack
    R                             Restart (only when dead)

  Tile key:
    g = groundTile.png       (surface ground)
    d = groundTileDeep.png   (deep ground, below surface)
    L = platformLC.png       (platform left cap)  -> boars turn
    R = platformRC.png       (platform right cap) -> boars turn
    [ = wallL.png            (wall left side)     -> boars turn
    ] = wallR.png            (wall right side)    -> boars turn
    b = boar spawn
    x = leaf collectible (boars pass through)
    f = fire hazard (player takes damage, boars turn around if they "see" it ahead)
      = empty (no sprite)
*/

let player, sensor;
let playerImg;

// --- NEW: player animation map for kinghuman_sprites.png (78x58 per frame) ---
let playerAnis = {
  idle: { row: 0, frames: 11, frameDelay: 6 },
  run: { row: 1, frames: 8, frameDelay: 4 },
  jump: { row: 2, frames: 1, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 3, frameDelay: 5 },
  hurtPose: { row: 4, frames: 2, frameDelay: Infinity, frame: 0 },
  death: { row: 5, frames: 4, frameDelay: 16 },
};

let boar;
let boarImg;
let boarSpawns = [];

// --- NEW: enemy animation map for boar_sprites.png (34x28 per frame) ---
let boarAnis = {
  run: { row: 1, frames: 5, frameDelay: 4 }, // use run for patrol
  throwPose: { row: 4, frames: 2, frameDelay: Infinity, frame: 0 }, // hit row used as hurt pose
  death: { row: 5, frames: 4, frameDelay: 16 },
};

let attacking = false;
let attackFrameCounter = 0;
let attackHitThisSwing = false;

let invulnTimer = 0;
const INVULN_FRAMES = 45;

let knockTimer = 0;
const KNOCK_FRAMES = 30;

let won = false;

let ground, groundDeep, platformsL, platformsR, wallsL, wallsR, ceiling;
let groundTileImg, groundTileDeepImg, platformLCImg, platformRCImg, wallLImg, wallRImg;

let bgLayers = [];
let bgForeImg, bgMidImg, bgFarImg;

let leaf;
let leafImg;
let leafSpawns = [];
let leafHasCollectRow = false;

let fire;
let fireImg;

let fontImg;
let hudGfx;
let lastScore = null;
let lastHealth = null;
let lastMaxHealth = null;

let score = 0;
let maxHealth = 5; // easier: more hits before death
let health = maxHealth;

let dead = false;
let pendingDeath = false;
let deathStarted = false;
let deathFrameTimer = 0;
let gameOverPlayed = false;
let levelAdvancePending = false;

// --- NEW: audio assets/state ---
let jumpSfx, attackSfx, hurtSfx, collectSfx, gameOverSfx;
let bgMusic2;
let audioUnlocked = false;
let bgMusicStarted = false;
let currentBgTrack = null;

// --- TILE MAP ---
/*
  Tile key:
    g = groundTile.png       (surface ground)
    d = groundTileDeep.png   (deep ground, below surface)
    L = platformLC.png       (platform left cap)  -> boars turn
    R = platformRC.png       (platform right cap) -> boars turn
    [ = wallL.png            (wall left side)     -> boars turn
    ] = wallR.png            (wall right side)    -> boars turn
    b = boar spawn
    x = leaf collectible (boars pass through)
    f = fire hazard (player takes damage, boars turn around if they "see" it ahead)
      = empty (no sprite)
*/
const level1 = [
  "                 g        x             ", // row  0 (lightly redesigned)
  "                                        ", // row  1
  "           b            b    x          ", // row  2
  "     LR   LgR      x   LgR              ", // row  3
  "             b     b                    ", // row  4
  "         xb  LR   LgR   x     xf        ", // row  5
  "         LggR   bx     LggR  LggggR      ", // row  6
  "  fxb        x  LgR                 fx  ", // row  71
  "  LR      b                    b x LggR ", // row  8
  "        LgR         bx   LR   LgR  [dd] ", // row  9
  "   x    [d]         LggR      ff   [dd] ", // row 10
  "LgggRffLggggggRfffLgggg]fffgfLgggggggggg", // row 11
  "dddddddddddddddddddddddddddddddddddddddd", // row 12
];

const level2 = [
  "                                                            ", // row  0
  "                                         x                  ", // row  1
  "                                       LgggR                ", // row  2
  "            f x            x b    LggR                       ", // row  3
  "           LgggR          LgggR                   x         ", // row  4
  "    b                 LR                         LgggR       ", // row  5
  "  LgggR           x f      b       x                        ", // row  6
  "         xb      LgggR    LgR      LggR                  x  ", // row  7
  " x      LgR                       x              b      LgggR", // row  8
  "LgR           LR       LgR       LR              LgR          ", // row  9
  "  x      LgR     x     x  b       x   b f  x  LgR      b  x ", // row 10
  "LggRffggf[d]fRffLgggRffLgggggRffLggggggggggRff[d]ffffLggggggR", // row 11
  "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", // row 12
];

function normalizeLevelRows(tileMap) {
  const width = Math.max(...tileMap.map((row) => row.length));
  return tileMap.map((row) => row.padEnd(width, " "));
}

const levels = [normalizeLevelRows(level1), normalizeLevelRows(level2)];
let currentLevelIndex = 0;
let level = levels[currentLevelIndex];
let levelTarget = 0;
let selectingLevel = true;

// --- LEVEL CONSTANTS ---
const TILE_W = 24;
const TILE_H = 24;

// --- NEW: keep world tile size; split visual frame sizes per sprite sheet ---
const FRAME_W = 32;
const FRAME_H = 32;
const PLAYER_FRAME_W = 78;
const PLAYER_FRAME_H = 58;
const BOAR_FRAME_W = 34;
const BOAR_FRAME_H = 28;
const COLLECT_FRAME_W = 18; // diamond.png: 180x28 => 10 cols
const COLLECT_FRAME_H = 14; // two rows (blue on row 0, white on row 1)
const COLLECT_FRAMES = 10;
const COLLECT_IDLE_ROW = 0;
const COLLECT_PICKUP_ROW = 1;

const VIEWTILE_W = 10;
const VIEWTILE_H = 8;
const VIEWW = TILE_W * VIEWTILE_W;
const VIEWH = TILE_H * VIEWTILE_H;
const CEILING_Y = -VIEWH / 2;

// player damage knockback tuning
const PLAYER_KNOCKBACK_X = 2.0;
const PLAYER_KNOCKBACK_Y = 3.2;
const PLAYER_JUMP = 5.2; // easier jumps

// combat tuning
const ATTACK_RANGE_X = 26; // easier to hit enemies
const ATTACK_RANGE_Y = 18;

// boar tuning
const BOAR_W = 18;
const BOAR_H = 12;
const BOAR_SPEED = 0.45; // easier enemies
const BOAR_HP = 2;

const BOAR_KNOCK_FRAMES = 7;
const BOAR_KNOCK_X = 1.2;
const BOAR_KNOCK_Y = 1.6;
const BOAR_FLASH_FRAMES = 5;

// boar turning tuning
const BOAR_TURN_COOLDOWN = 12; // frames

// boar probe positioning (relative to boar)
const PROBE_FORWARD = 10; // how far ahead (smaller = closer to boar)
const PROBE_FRONT_Y = 10; // how far down from boar center to sample "ahead at feet"
const PROBE_HEAD_Y = 0; // how far UP from boar center to sample "ahead above"
const PROBE_SIZE = 4; // for debugging purposes

// HUD constants
const FONT_COLS = 19;
const FONT_ROWS = 5;
const CELL = 30;

const FONT_SCALE = 1 / 3;
const GLYPH_W = CELL * FONT_SCALE;
const GLYPH_H = CELL * FONT_SCALE;

const FONT_CHARS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`" + "abcdefghijklmnopqrstuvwxyz{|}~";

// gravity
const GRAVITY = 10;
const MOON_GRAVITY = 1.6;

const debugState = {
  enabled: false,
  moonGravity: false,
  invincible: false,
  showProbes: false,
};

// --- TILE HELPERS (only what we actually need) ---
function tileAt(col, row) {
  if (row < 0 || row >= level.length) return " ";
  if (col < 0 || col >= level[0].length) return " ";
  return level[row][col];
}

function levelWidth() {
  return TILE_W * level[0].length;
}

function levelHeight() {
  return TILE_H * level.length;
}

function playerStartY() {
  return levelHeight() - TILE_H * 4;
}

function countTiles(tileMap, key) {
  let total = 0;
  for (const row of tileMap) {
    for (let i = 0; i < row.length; i++) if (row[i] === key) total++;
  }
  return total;
}

function tileAtWorld(x, y) {
  const col = Math.floor(x / TILE_W);
  const row = Math.floor(y / TILE_H);
  return tileAt(col, row);
}

function preload() {
  // --- NEW ASSET FILENAMES ---
  playerImg = loadImage("assets/kinghuman_sprites.png");
  boarImg = loadImage("assets/boar_sprites.png");
  leafImg = loadImage("assets/diamond.png");
  fireImg = loadImage("assets/fireSpriteSheet.png");

  bgFarImg = loadImage("assets/bg-1.png");
  bgMidImg = loadImage("assets/bg-2.png");
  bgForeImg = loadImage("assets/bg-3.png");

  groundTileImg = loadImage("assets/groundTile.png");
  groundTileDeepImg = loadImage("assets/groundTileDeep.png");
  platformLCImg = loadImage("assets/platformLC.png");
  platformRCImg = loadImage("assets/platformRC.png");
  wallLImg = loadImage("assets/wallL.png");
  wallRImg = loadImage("assets/wallR.png");

  fontImg = loadImage("assets/bitmapFont.png");

  // --- NEW: sound effects + looping background tracks ---
  jumpSfx = loadSound("assets/jump sound.mp3");
  attackSfx = loadSound("assets/attacking.mp3");
  hurtSfx = loadSound("assets/hurt.mp3");
  collectSfx = loadSound("assets/coin.mp3");
  gameOverSfx = loadSound("assets/gameover.mp3");
  bgMusic2 = loadSound("assets/bgmusic2.mp3");
}

function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  noSmooth();

  applyIntegerScale();
  window.addEventListener("resize", applyIntegerScale);

  allSprites.pixelPerfect = true;

  // Manual physics stepping for stable pixel rendering
  world.autoStep = false;

  // --- NEW: browser audio unlock hook (first user interaction) ---
  const unlockAudio = () => {
    if (audioUnlocked) return;
    userStartAudio();
    audioUnlocked = true;
    startBackgroundMusic();
  };
  window.addEventListener("keydown", unlockAudio, { once: true });
  window.addEventListener("mousedown", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });

  // HUD buffer
  hudGfx = createGraphics(VIEWW, VIEWH);
  hudGfx.noSmooth();
  hudGfx.pixelDensity(1);

  // wait for player to choose a starting level (1 or 2)
  selectingLevel = true;
}

function draw() {
  background(69, 61, 79);
  handleDebugInput();

  // level select screen (before world is built)
  if (selectingLevel) {
    drawLevelSelect();
    drawDebugOverlay();
    if (kb.presses("1")) beginSelectedLevel(0);
    if (kb.presses("2") && levels.length >= 2) beginSelectedLevel(1);
    return;
  }

  // defer level transition out of overlap callbacks for stability
  if (levelAdvancePending) {
    levelAdvancePending = false;
    advanceToNextLevel();
    return;
  }

  // 1) decide boar vel/turns using probes
  updateBoars();

  // 2) then let physics apply vel.x / gravity
  world.step();

  // collectible post-pickup animation window, then hide
  for (const s of leaf) {
    if (!s.collected) continue;
    if (s.collectTimer > 0) {
      s.collectTimer--;
      if (s.collectTimer === 0) s.visible = false;
    }
  }

  // --- CAMERA ---
  const curLevelW = levelWidth();
  const curLevelH = levelHeight();

  camera.width = VIEWW;
  camera.height = VIEWH;
  camera.zoom = 1;

  let targetX = constrain(player.x, VIEWW / 2, curLevelW - VIEWW / 2 - TILE_W / 2);
  let targetY = constrain(player.y, VIEWH / 2 - TILE_H * 2, curLevelH - VIEWH / 2 - TILE_H);

  camera.x = Math.round(lerp(camera.x || targetX, targetX, 0.1));
  camera.y = Math.round(lerp(camera.y || targetY, targetY, 0.1));

  // --- PLAYER GROUNDED CHECK ---
  const grounded = isPlayerGrounded();

  // --- PLAYER INPUT (disabled during knockback / death) ---
  // ATTACK
  if (!dead && !won && knockTimer === 0 && !pendingDeath && grounded && !attacking && kb.presses("space")) {
    attacking = true;
    attackHitThisSwing = false;
    attackFrameCounter = 0;
    player.vel.x = 0;
    player.ani.frame = 0;
    player.ani = "attack";
    player.ani.play();
    playSfx(attackSfx); // NEW: one-shot attack sound
  }

  // JUMP
  if (!dead && !won && knockTimer === 0 && !pendingDeath && grounded && kb.presses("up")) {
    player.vel.y = -1 * PLAYER_JUMP;
    playSfx(jumpSfx); // NEW: one-shot jump sound
  }

  // --- PLAYER STATE / ANIMATION ---
  if (!dead && knockTimer > 0) {
    player.ani = "hurtPose";
    player.ani.frame = 1;
  } else if (!dead && pendingDeath) {
    player.ani = "hurtPose";
    player.ani.frame = 1;
  } else if (!dead && attacking) {
    attackFrameCounter++;

    if (!attackHitThisSwing && attackFrameCounter >= 4 && attackFrameCounter <= 8) {
      tryHitBoar();
    }

    if (attackFrameCounter > 12) {
      attacking = false;
      attackFrameCounter = 0;
      attackHitThisSwing = false;
    }
  } else if (!dead && !grounded) {
    player.ani = "jump";
    player.ani.frame = 0; // single-frame jump row in kinghuman sheet
  } else if (!dead) {
    player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle";
  }

  // --- PLAYER MOVEMENT ---
  if (dead || won) {
    player.vel.x = 0;
  } else if (knockTimer > 0) {
    // no control during knockback
  } else if (pendingDeath) {
    player.vel.x = 0;
  } else if (!attacking) {
    player.vel.x = 0;
    if (kb.pressing("left")) {
      player.vel.x = -1.5;
      player.mirror.x = true;
    } else if (kb.pressing("right")) {
      player.vel.x = 1.5;
      player.mirror.x = false;
    }
  }

  // keep player in world bounds
  player.x = constrain(player.x, FRAME_W / 2, curLevelW - FRAME_W / 2);

  // --- PARALLAX BACKGROUNDS (screen space) ---
  camera.off();
  imageMode(CORNER);
  drawingContext.imageSmoothingEnabled = false;

  for (const layer of bgLayers) {
    const img = layer.img;
    const w = img.width;

    let x = Math.round((-camera.x * layer.speed) % w);
    if (x > 0) x -= w;

    for (let tx = x; tx < VIEWW + w; tx += w) image(img, tx, 0);
  }

  camera.on();

  // --- FALL RESET (alive only) ---
  if (!dead && player.y > curLevelH + TILE_H * 3) {
    player.x = FRAME_W;
    player.y = playerStartY();
    player.vel.x = 0;
    player.vel.y = 0;
  }

  // --- TIMERS ---
  if (invulnTimer > 0) invulnTimer--;
  if (knockTimer > 0) knockTimer--;

  // --- ENTER DEAD (only once, after landing) ---
  if (!dead && pendingDeath && knockTimer === 0 && grounded) {
    dead = true;
    pendingDeath = false;
    deathStarted = false;
  }

  // start death animation once
  if (dead && !deathStarted) {
    deathStarted = true;
    if (!gameOverPlayed) {
      playSfx(gameOverSfx); // NEW: one-shot game over sound
      gameOverPlayed = true;
    }

    player.tint = "#ffffff";
    player.vel.x = 0;
    player.vel.y = 0;

    player.ani = "death";
    player.ani.frame = 0;

    deathFrameTimer = 0;
  }

  // advance death frames manually (non-looping)
  if (dead) {
    const frames = playerAnis.death.frames;
    const delayFrames = playerAnis.death.frameDelay;
    const msPerFrame = (delayFrames * 1000) / 60;

    deathFrameTimer += deltaTime;
    const f = Math.floor(deathFrameTimer / msPerFrame);
    player.ani.frame = Math.min(frames - 1, f);
  }

  // --- RENDER PIXEL SNAP (render-only, restores after draw) ---
  const px = player.x,
    py = player.y;
  const sx = sensor.x,
    sy = sensor.y;

  player.x = Math.round(player.x);
  player.y = Math.round(player.y);
  sensor.x = Math.round(sensor.x);
  sensor.y = Math.round(sensor.y);

  // hurt blink
  if (!dead && invulnTimer > 0) {
    player.tint = Math.floor(invulnTimer / 4) % 2 === 0 ? "#ff5050" : "#ffffff";
  } else {
    player.tint = "#ffffff";
  }

  allSprites.draw();

  player.x = px;
  player.y = py;
  sensor.x = sx;
  sensor.y = sy;

  // --- HUD ---
  if (score !== lastScore || health !== lastHealth || maxHealth !== lastMaxHealth) {
    redrawHUD();
    lastScore = score;
    lastHealth = health;
    lastMaxHealth = maxHealth;
  }

  camera.off();
  imageMode(CORNER);
  drawingContext.imageSmoothingEnabled = false;
  image(hudGfx, 0, 0);
  camera.on();

  // display a death or win overlay if those events happen
  if (dead) drawDeathOverlay();
  if (won) drawWinOverlay();

  drawDebugOverlay();

  // accept R to restart the game if player wins or dies
  if ((dead || won) && kb.presses("r")) restartGame();
}

function applyIntegerScale() {
  const c = document.querySelector("canvas");
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEWW, window.innerHeight / VIEWH)));
  c.style.width = VIEWW * scale + "px";
  c.style.height = VIEWH * scale + "px";
}

// --- BITMAP FONT HUD ---
function drawBitmapTextToGfx(g, str, x, y, scale = FONT_SCALE) {
  str = String(str);

  const dw = CELL * scale;
  const dh = CELL * scale;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const idx = FONT_CHARS.indexOf(ch);
    if (idx === -1) continue;

    const col = idx % FONT_COLS;
    const row = Math.floor(idx / FONT_COLS);

    const sx = col * CELL;
    const sy = row * CELL;

    g.image(fontImg, Math.round(x + i * dw), Math.round(y), dw, dh, sx, sy, CELL, CELL);
  }
}

function drawOutlinedTextToGfx(g, str, x, y, fillHex) {
  g.tint("#000000");
  drawBitmapTextToGfx(g, str, x - 1, y);
  drawBitmapTextToGfx(g, str, x + 1, y);
  drawBitmapTextToGfx(g, str, x, y - 1);
  drawBitmapTextToGfx(g, str, x, y + 1);

  g.tint(fillHex);
  drawBitmapTextToGfx(g, str, x, y);

  g.noTint();
}

function redrawHUD() {
  hudGfx.clear();
  hudGfx.drawingContext.imageSmoothingEnabled = false;
  hudGfx.imageMode(CORNER);

  drawOutlinedTextToGfx(hudGfx, `RESCUED ${score}/${levelTarget}`, 6, 6, "#ffdc00");
  drawOutlinedTextToGfx(hudGfx, `LEVEL ${currentLevelIndex + 1}/${levels.length}`, 6, 18, "#8bf5ff");

  const heartChar = "~";
  const heartX = 172;
  const heartY = 6;
  const spacing = GLYPH_W + 2;

  for (let i = 0; i < maxHealth; i++) {
    const x = heartX + i * spacing;
    const col = i < health ? "#ff5050" : "#783030";
    drawOutlinedTextToGfx(hudGfx, heartChar, x, heartY, col);
  }
}

function handleDebugInput() {
  if (kb.presses("`")) debugState.enabled = !debugState.enabled;

  if (kb.presses("g")) {
    debugState.moonGravity = !debugState.moonGravity;
    applyGravityMode();
  }

  if (kb.presses("i")) debugState.invincible = !debugState.invincible;

  if (kb.presses("p")) {
    debugState.showProbes = !debugState.showProbes;
    applyDebugVisibility();
  }
}

function applyGravityMode() {
  world.gravity.y = debugState.moonGravity ? MOON_GRAVITY : GRAVITY;
}

function applyDebugVisibility() {
  if (sensor) sensor.visible = debugState.showProbes;
  if (!boar) return;

  for (const e of boar) {
    if (e.footProbe) e.footProbe.visible = debugState.showProbes;
    if (e.frontProbe) e.frontProbe.visible = debugState.showProbes;
    if (e.groundProbe) e.groundProbe.visible = debugState.showProbes;
  }
}

function drawDebugOverlay() {
  if (!debugState.enabled) return;

  camera.off();
  drawingContext.imageSmoothingEnabled = false;

  push();
  noStroke();
  fill(0, 160);
  rect(4, 132, 232, 56);
  pop();

  drawOutlinedTextToGfx(window, "DEBUG", 10, 136, "#ffffff");
  drawOutlinedTextToGfx(
    window,
    `G GRAVITY ${debugState.moonGravity ? "MOON" : "EARTH"}`,
    10,
    148,
    debugState.moonGravity ? "#8bf5ff" : "#ffdc00",
  );
  drawOutlinedTextToGfx(
    window,
    `I INVINCIBLE ${debugState.invincible ? "ON" : "OFF"}`,
    10,
    160,
    debugState.invincible ? "#7dff8a" : "#ffffff",
  );
  drawOutlinedTextToGfx(
    window,
    `P PROBES ${debugState.showProbes ? "ON" : "OFF"}`,
    10,
    172,
    debugState.showProbes ? "#ff7bf1" : "#ffffff",
  );

  camera.on();
}

// is player grounded
function isPlayerGrounded() {
  return (
    sensor.overlapping(ground) ||
    sensor.overlapping(groundDeep) ||
    sensor.overlapping(platformsL) ||
    sensor.overlapping(platformsR)
  );
}

// --- LEAF COLLECT ---
function rescueLeaf(player, leaf) {
  if (!leaf.active) return;
  leaf.active = false;
  leaf.removeColliders();
  score++;
  playSfx(collectSfx); // NEW: collectible pickup sound

  // collect state: row 1 when available, then disappear
  leaf.collected = true;
  leaf.collectTimer = 10;
  leaf.visible = true;
  leaf.ani = "collect";
  leaf.ani.frame = 0;

  // level clear / final win
  if (score >= levelTarget) {
    player.vel.x = 0;
    player.vel.y = 0;
    if (currentLevelIndex < levels.length - 1) {
      levelAdvancePending = true;
    } else {
      won = true;
    }
  }
}

// --- DAMAGE FROM FIRE ---
function takeDamageFromFire(player, fire) {
  if (debugState.invincible || invulnTimer > 0 || dead) return;

  health = max(0, health - 1);
  if (health <= 0) pendingDeath = true;

  invulnTimer = INVULN_FRAMES;
  knockTimer = KNOCK_FRAMES;

  const dir = player.x < fire.x ? -1 : 1;
  player.vel.x = dir * PLAYER_KNOCKBACK_X;
  player.vel.y = -PLAYER_KNOCKBACK_Y;

  attacking = false;
  attackFrameCounter = 0;
  playSfx(hurtSfx); // NEW: one-shot hurt sound
}

// --- BOAR: HIT PLAYER ---
function playerHitByBoar(player, e) {
  if (e.dying || e.dead) return;
  if (debugState.invincible || invulnTimer > 0 || dead) return;

  health = max(0, health - 1);
  if (health <= 0) pendingDeath = true;

  invulnTimer = INVULN_FRAMES;
  knockTimer = KNOCK_FRAMES;

  const dir = player.x < e.x ? -1 : 1;
  player.vel.x = dir * PLAYER_KNOCKBACK_X;
  player.vel.y = -PLAYER_KNOCKBACK_Y;

  attacking = false;
  attackFrameCounter = 0;
  playSfx(hurtSfx); // NEW: one-shot hurt sound
}

// --- PLAYER ATTACK -> BOAR ---
function tryHitBoar() {
  const grounded = sensor.overlapping(ground) || sensor.overlapping(platformsL) || sensor.overlapping(platformsR);
  if (!grounded) return;

  const facingDir = player.mirror.x ? -1 : 1;
  const playerFeetY = player.y + player.h / 2;

  for (const e of boar) {
    if (e.dead || e.dying) continue;

    const dx = e.x - player.x;
    if (Math.sign(dx) !== facingDir) continue;
    if (abs(dx) > ATTACK_RANGE_X + e.w / 2) continue;

    const boarFeetY = e.y + e.h / 2;
    if (abs(boarFeetY - playerFeetY) > ATTACK_RANGE_Y + 10) continue;

    damageBoar(e, facingDir);
    attackHitThisSwing = true;
    return;
  }
}

// --- BOAR TURN HELPER ---
function turnBoar(e, newDir) {
  if (e.turnTimer > 0) return; // cooldown prevents jitter / double-turns
  e.dir = newDir;
  e.turnTimer = BOAR_TURN_COOLDOWN;

  // small nudge so it separates from the thing it hit
  e.x += e.dir * 6;
  e.vel.x = 0; // kill sideways bounce/jitter impulse
}

function groundAheadForDir(e, dir) {
  const old = e.dir;
  e.dir = dir;
  updateBoarProbes(e);

  const ok =
    e.frontProbe.overlapping(ground) ||
    e.frontProbe.overlapping(groundDeep) ||
    e.frontProbe.overlapping(platformsL) ||
    e.frontProbe.overlapping(platformsR);

  e.dir = old;
  return ok;
}

function fixSpawnEdgeCase(e) {
  // requires probes already attached
  // choose a direction that has ground ahead (if possible)
  const leftOk = groundAheadForDir(e, -1);
  const rightOk = groundAheadForDir(e, 1);

  if (leftOk && !rightOk) e.dir = -1;
  else if (rightOk && !leftOk) e.dir = 1;
  // else keep whatever it already had (both ok or both bad)

  // IMPORTANT: after choosing dir, re-place probes and "freeze" for this frame
  updateBoarProbes(e);
  e.vel.x = 0; // don't let it take a step this frame
  e.turnTimer = 0; // allow turning immediately if your danger logic wants to
  e.wasDanger = false; // ensure rising-edge logic can trigger
}

function hookBoarSolids() {
  boar.collides(ground);
  boar.collides(groundDeep);
  boar.collides(platformsL);
  boar.collides(platformsR);
  boar.collides(wallsL);
  boar.collides(wallsR);
}

function damageBoar(e, facingDir) {
  if (e.dead || e.dying) return;

  e.hp = max(0, e.hp - 1);
  e.flashTimer = BOAR_FLASH_FRAMES;

  if (e.hp <= 0) {
    e.dying = true;
    e.vel.x = 0;
    e.collider = "none";
    e.removeColliders();
    e.ani = "throwPose";
    e.ani.frame = 0;
    return;
  }

  e.knockTimer = BOAR_KNOCK_FRAMES;
  e.vel.x = facingDir * BOAR_KNOCK_X;
  e.vel.y = -BOAR_KNOCK_Y;

  e.ani = "throwPose";
  e.ani.frame = 0;
}

function boarDiesInFire(e, f) {
  if (e.dead || e.dying) return;
  e.hp = 0;
  e.dying = true;
  e.knockTimer = 0;
  e.vel.x = 0;
}

function drawWinOverlay() {
  camera.off();
  drawingContext.imageSmoothingEnabled = false;

  push();
  noStroke();
  // slightly lighter overlay than death
  fill(0, 120);
  rect(0, 0, VIEWW, VIEWH);
  pop();

  const msg1 = "YOU WIN!";
  const msg2 = "Press R to restart";

  const x1 = Math.round((VIEWW - msg1.length * GLYPH_W) / 2);
  const x2 = Math.round((VIEWW - msg2.length * GLYPH_W) / 2);

  const y1 = Math.round(VIEWH / 2 - 18);
  const y2 = Math.round(VIEWH / 2 + 2);

  // colourful headline + white prompt
  drawOutlinedTextToGfx(window, msg1, x1, y1, "#00e5ff");
  drawOutlinedTextToGfx(window, msg2, x2, y2, "#ffffff");

  camera.on();
}

function drawDeathOverlay() {
  camera.off();
  drawingContext.imageSmoothingEnabled = false;

  push();
  noStroke();
  fill(0, 160);
  rect(0, 0, VIEWW, VIEWH);
  pop();

  const msg1 = "YOU DIED";
  const msg2 = "Press R to restart";

  const x1 = Math.round((VIEWW - msg1.length * GLYPH_W) / 2);
  const x2 = Math.round((VIEWW - msg2.length * GLYPH_W) / 2);

  const y1 = Math.round(VIEWH / 2 - 18);
  const y2 = Math.round(VIEWH / 2 + 2);

  // draw to screen (window) using same outlined font
  drawOutlinedTextToGfx(window, msg1, x1, y1, "#ffffff");
  drawOutlinedTextToGfx(window, msg2, x2, y2, "#ffffff");

  camera.on();
}

function drawLevelSelect() {
  camera.off();
  drawingContext.imageSmoothingEnabled = false;

  push();
  noStroke();
  fill(0, 150);
  rect(0, 0, VIEWW, VIEWH);
  pop();

  drawOutlinedTextToGfx(window, "Choose Level", 52, 62, "#ffffff");
  drawOutlinedTextToGfx(window, "Press 1 for Level 1", 30, 82, "#ffdc00");
  drawOutlinedTextToGfx(window, "Press 2 for Level 2", 30, 96, "#8bf5ff");
  drawOutlinedTextToGfx(window, "Press ` for Debug", 36, 116, "#7dff8a");

  camera.on();
}

function placeProbe(probe, x, y) {
  probe.x = x;
  probe.y = y;
}

function attachBoarProbes(e) {
  e.footProbe = new Sprite(-9999, -9999, PROBE_SIZE, PROBE_SIZE);
  e.footProbe.color = "magenta";
  e.footProbe.stroke = "black";
  e.footProbe.collider = "none";
  e.footProbe.sensor = true;

  e.frontProbe = new Sprite(-9999, -9999, PROBE_SIZE, PROBE_SIZE);
  e.frontProbe.color = "cyan";
  e.frontProbe.stroke = "black";
  e.frontProbe.collider = "none";
  e.frontProbe.sensor = true;

  e.groundProbe = new Sprite(-9999, -9999, PROBE_SIZE, PROBE_SIZE);
  e.groundProbe.color = "yellow";
  e.groundProbe.stroke = "black";
  e.groundProbe.collider = "none";
  e.groundProbe.sensor = true;

  // keep them on/off consistently
  e.footProbe.visible = false;
  e.frontProbe.visible = false;
  e.groundProbe.visible = false;

  // make sure probes always render on top of tiles
  e.footProbe.layer = 999;
  e.frontProbe.layer = 999;
  e.groundProbe.layer = 999;
}

function updateBoarProbes(e) {
  const forwardX = e.x + e.dir * PROBE_FORWARD;

  // "front" probe: ahead + lower (near feet)
  placeProbe(e.frontProbe, forwardX, e.y + PROBE_FRONT_Y);

  // "foot probe" (your "above" probe): ahead + higher
  placeProbe(e.footProbe, forwardX, e.y - PROBE_HEAD_Y);
}

function updateGroundProbe(e) {
  if (!e.groundProbe) return;
  placeProbe(e.groundProbe, e.x, e.y + e.h / 2 + 4);
}

function frontProbeHasGroundAhead(e) {
  const p = e.frontProbe;
  return p.overlapping(ground) || p.overlapping(groundDeep) || p.overlapping(platformsL) || p.overlapping(platformsR);
}

function frontProbeHitsWall(e) {
  const p = e.frontProbe;
  return p.overlapping(wallsL) || p.overlapping(wallsR);
}

function shouldTurnNow(e, dangerNow) {
  // only turn on the rising edge: false -> true
  const risingEdge = dangerNow && !e.wasDanger;
  e.wasDanger = dangerNow;
  return risingEdge;
}

function boarGrounded(e) {
  const p = e.groundProbe;
  return p.overlapping(ground) || p.overlapping(groundDeep) || p.overlapping(platformsL) || p.overlapping(platformsR);
}

// --- BOAR AI (simple + reliable) ---
// Rules:
// 1) If boar collides with L/R/[ /], it turns (handled by collides callbacks)
// 2) If boar "sees" fire ahead (tile probe), it turns
// 3) Leaves do not affect boars (no colliders; no boar/leaf collisions)
function updateBoars() {
  // freeze boars if player wins
  if (won) {
    for (const e of boar) e.vel.x = 0;
    return;
  }

  for (const e of boar) {
    updateBoarProbes(e);
    updateGroundProbe(e);

    if (e.spawnFreeze > 0) {
      e.spawnFreeze--;
      e.vel.x = 0;
      e.ani = "run"; // or "throwPose" if you want a “wake up” pose
      continue;
    }

    // timers
    if (e.flashTimer > 0) e.flashTimer--;
    if (e.knockTimer > 0) e.knockTimer--;
    if (e.turnTimer > 0) e.turnTimer--;

    // tint flash when hit
    e.tint = e.flashTimer > 0 ? "#ff5050" : "#ffffff";

    // determine if the boar is on the ground
    const grounded = boarGrounded(e);

    // dying behavior (wait until grounded to start death)
    if (!e.dead && e.dying && grounded) {
      e.dead = true;
      e.deathStarted = false;
    }

    if (e.dying && !e.dead) {
      e.vel.x = 0;
      e.ani = "throwPose";
      e.ani.frame = 0;
      continue;
    }

    // start death once, then freeze + animate + remove
    if (e.dead && !e.deathStarted) {
      e.deathStarted = true;

      e.holdX = e.x;
      e.holdY = e.y;

      e.vel.x = 0;
      e.vel.y = 0;

      e.collider = "none";
      e.removeColliders();

      e.x = e.holdX;
      e.y = e.holdY;

      e.ani = "death";
      e.ani.frame = 0;

      e.deathFrameTimer = 0;
      e.vanishTimer = 24;
      e.visible = true;
    }

    if (e.dead) {
      e.x = e.holdX;
      e.y = e.holdY;

      const frames = boarAnis.death.frames;
      const delayFrames = boarAnis.death.frameDelay;
      const msPerFrame = (delayFrames * 1000) / 60;

      e.deathFrameTimer += deltaTime;
      const f = Math.floor(e.deathFrameTimer / msPerFrame);
      e.ani.frame = Math.min(frames - 1, f);

      if (f >= frames - 1) {
        if (e.vanishTimer > 0) {
          e.visible = Math.floor(e.vanishTimer / 3) % 2 === 0;
          e.vanishTimer--;
        } else {
          e.footProbe?.remove();
          e.frontProbe?.remove();
          e.groundProbe?.remove();
          e.remove();
        }
      }
      continue;
    }

    // knockback overrides patrol
    if (e.knockTimer > 0) {
      e.ani = "throwPose";
      e.ani.frame = 0;
      continue;
    }

    // if not grounded, don’t patrol
    if (!grounded) {
      e.ani = "throwPose";
      e.ani.frame = 0;
      continue;
    }

    // default direction if missing
    if (e.dir !== 1 && e.dir !== -1) e.dir = random([-1, 1]);

    // world bounds safety (optional, but prevents escaping if a cap is missing)
    if (e.x < e.w / 2) turnBoar(e, 1);
    if (e.x > levelWidth() - e.w / 2) turnBoar(e, -1);

    // --- PROBE-BASED TURNING RULES ---
    // 1) turn if front probe is over "space" (no ground ahead)
    const noGroundAhead = !frontProbeHasGroundAhead(e);

    // 2) turn if front probe hits leaf or fire
    const frontHitsLeaf = e.frontProbe.overlapping(leaf);
    const frontHitsFire = e.frontProbe.overlapping(fire);
    const frontHitsWall = frontProbeHitsWall(e);

    // 3) extra: turn if the "above" probe sees fire (early warning)
    const headSeesFire = e.footProbe.overlapping(fire);

    const dangerNow = noGroundAhead || frontHitsLeaf || frontHitsFire || frontHitsWall || headSeesFire;

    if (e.turnTimer === 0 && shouldTurnNow(e, dangerNow)) {
      turnBoar(e, -e.dir); // already nudges + vel.x=0
      updateBoarProbes(e); // probes match new direction immediately
      continue; // skip patrol velocity this frame
    }

    // patrol
    e.vel.x = e.dir * BOAR_SPEED;
    e.mirror.x = e.dir === -1;
    e.ani = "run";
  }
}

function restartGame() {
  // Hard reset: guarantees no duplicated enemies/groups after restart.
  window.location.reload();
}

function beginSelectedLevel(levelIndex) {
  currentLevelIndex = constrain(levelIndex, 0, levels.length - 1);
  level = levels[currentLevelIndex];

  score = 0;
  health = maxHealth;
  won = false;
  dead = false;
  pendingDeath = false;
  deathStarted = false;
  deathFrameTimer = 0;
  gameOverPlayed = false;
  levelAdvancePending = false;
  invulnTimer = 0;
  knockTimer = 0;
  attacking = false;
  attackFrameCounter = 0;
  attackHitThisSwing = false;

  selectingLevel = false;

  camera.x = undefined;
  camera.y = undefined;

  rebuildWorldFromLevel();
  applyGravityMode();
  applyDebugVisibility();
  lastScore = lastHealth = lastMaxHealth = null;
}

function advanceToNextLevel() {
  if (currentLevelIndex >= levels.length - 1) return;

  currentLevelIndex++;
  level = levels[currentLevelIndex];
  levelTarget = countTiles(level, "x");

  score = 0;
  health = maxHealth;
  won = false;
  dead = false;
  pendingDeath = false;
  deathStarted = false;
  deathFrameTimer = 0;
  gameOverPlayed = false;
  levelAdvancePending = false;
  invulnTimer = 0;
  knockTimer = 0;
  attacking = false;
  attackFrameCounter = 0;
  attackHitThisSwing = false;

  camera.x = undefined;
  camera.y = undefined;

  rebuildWorldFromLevel();
  applyGravityMode();
  applyDebugVisibility();
  lastScore = lastHealth = lastMaxHealth = null;
}

function rebuildWorldFromLevel() {
  // remove all sprites first so restart is a true reset
  const toRemove = [];
  for (const s of allSprites) toRemove.push(s);
  for (const s of toRemove) s.remove();

  makeWorld();

  levelTarget = countTiles(level, "x");

  // Leaves should be overlap-only (boars pass through, player collects)
  leafSpawns = [];
  for (const s of leaf) {
    s.removeColliders();
    s.active = true;
    s.collected = false;
    s.collectTimer = 0;
    s.visible = true;
    s.ani = "idle";
    leafSpawns.push({ s, x: s.x, y: s.y });
  }

  boarSpawns = [];
  for (const e of boar) boarSpawns.push({ x: e.x, y: e.y, dir: e.dir });
}

function makeWorld() {
  applyGravityMode();

  // --- ENEMIES (boar spawned from 'b') ---
  boar = new Group();
  boar.spriteSheet = boarImg;
  boar.anis.w = BOAR_FRAME_W;
  boar.anis.h = BOAR_FRAME_H;
  boar.anis.offset.y = -2;
  boar.addAnis(boarAnis);
  boar.physics = "dynamic";
  boar.tile = "b";

  // --- INTERACTIVES ---
  leaf = new Group();
  leaf.physics = "static";
  leaf.spriteSheet = leafImg;
  // diamond states: row 0 idle, row 1 collected (single-frame states)
  leafHasCollectRow = Math.floor(leafImg.height / COLLECT_FRAME_H) > 1;
  const leafAnis = {
    idle: { w: COLLECT_FRAME_W, h: COLLECT_FRAME_H, row: COLLECT_IDLE_ROW, frames: 1, frameDelay: Infinity, frame: 0 },
    collect: leafHasCollectRow
      ? { w: COLLECT_FRAME_W, h: COLLECT_FRAME_H, row: COLLECT_PICKUP_ROW, frames: 1, frameDelay: Infinity, frame: 0 }
      : { w: COLLECT_FRAME_W, h: COLLECT_FRAME_H, row: COLLECT_IDLE_ROW, frames: 1, frameDelay: Infinity, frame: 0 },
  };
  leaf.addAnis(leafAnis);
  leaf.w = 10;
  leaf.h = 6;
  leaf.anis.offset.x = 0;
  leaf.anis.offset.y = -2;
  leaf.tile = "x";

  fire = new Group();
  fire.physics = "static";
  fire.spriteSheet = fireImg;
  fire.addAnis({ burn: { w: 32, h: 32, row: 0, frames: 16 } });
  fire.w = 8; // even smaller fire hitbox
  fire.h = 7;
  fire.tile = "f";

  boar.overlaps(fire, boarDiesInFire); // make sure boars die in the fire

  // --- LEVEL TILES ---
  ground = new Group();
  ground.physics = "static";
  ground.img = groundTileImg;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundTileDeepImg;
  groundDeep.tile = "d";

  platformsL = new Group();
  platformsL.physics = "static";
  platformsL.img = platformLCImg;
  platformsL.tile = "L";

  platformsR = new Group();
  platformsR.physics = "static";
  platformsR.img = platformRCImg;
  platformsR.tile = "R";

  wallsL = new Group();
  wallsL.physics = "static";
  wallsL.img = wallLImg;
  wallsL.tile = "[";

  wallsR = new Group();
  wallsR.physics = "static";
  wallsR.img = wallRImg;
  wallsR.tile = "]";

  // build world from tilemap
  new Tiles(level, 0, 0, TILE_W, TILE_H);

  // Invisible ceiling keeps jump tests and moon gravity from letting actors leave the map.
  ceiling = new Sprite(levelWidth() / 2, CEILING_Y, levelWidth(), TILE_H);
  ceiling.collider = "static";
  ceiling.visible = false;

  // --- PLAYER ---
  player = new Sprite(FRAME_W, playerStartY(), FRAME_W, FRAME_H);
  player.spriteSheet = playerImg;
  player.rotationLock = true;

  // NEW: kinghuman frame geometry + offset to align larger art with original collider
  player.anis.w = PLAYER_FRAME_W;
  player.anis.h = PLAYER_FRAME_H;
  player.anis.offset.y = -9;
  player.addAnis(playerAnis);
  player.scale = 0.75; // make king visually smaller while preserving collider/gameplay logic

  player.ani = "idle";
  player.w = 18;
  player.h = 12;
  player.friction = 0;
  player.bounciness = 0;

  // player interactions
  player.overlaps(fire, takeDamageFromFire);
  player.overlaps(leaf, rescueLeaf);
  player.collides(boar, playerHitByBoar);
  player.collides(ceiling);

  // --- GROUND SENSOR (query-only) ---
  sensor = new Sprite();
  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;

  const sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;

  // make fire overlap-only (hazard, not solid)
  for (const s of fire) {
    s.collider = "static";
    s.sensor = true; // if supported by your p5play build
    s.scale = 0.5; // even smaller fire visuals
  }

  // --- BOAR SETUP ---
  for (const e of boar) {
    e.physics = "dynamic";
    e.rotationLock = true;

    e.w = BOAR_W;
    e.h = BOAR_H;
    e.anis.offset.y = -2;

    e.friction = 0;
    e.bounciness = 0;

    e.hp = BOAR_HP;

    attachBoarProbes(e);

    // choose a safe direction BEFORE the first frame of movement
    e.dir = random([-1, 1]);
    fixSpawnEdgeCase(e);

    e.wasDanger = false;

    e.flashTimer = 0;
    e.knockTimer = 0;
    e.turnTimer = 0;

    e.dead = false;
    e.dying = false;
    e.deathStarted = false;
    e.deathFrameTimer = 0;

    e.vanishTimer = 0;
    e.holdX = e.x;
    e.holdY = e.y;

    e.mirror.x = e.dir === -1;
    e.ani = "run";
    e.collides(ceiling);
  }

  // attach turning rules (L/R/[ ])
  hookBoarSolids();

  // --- BACKGROUND PARALLAX ---
  bgLayers = [
    { img: bgFarImg, speed: 0.2 },
    { img: bgMidImg, speed: 0.4 },
    { img: bgForeImg, speed: 0.6 },
  ];

  applyDebugVisibility();
}

// --- NEW: audio helpers ---
function playSfx(snd) {
  if (!audioUnlocked || !snd || !snd.isLoaded()) return;
  snd.stop(); // retrigger cleanly, still once per event call site
  snd.play();
}

function startBackgroundMusic() {
  if (bgMusicStarted || !audioUnlocked) return;
  if (!bgMusic2 || !bgMusic2.isLoaded()) return;

  bgMusicStarted = true;
  currentBgTrack = bgMusic2;
  currentBgTrack.setVolume(0.4);
  currentBgTrack.loop();
}
