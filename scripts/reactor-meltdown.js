var BLOCK_NAME = "ovx-project-mod-nuclear-reactor";

var HEAT_RATE   = 0.00238; 
var SMOKE_AT    = 0.15;
var FLASH_AT    = 0.40;
var ALARM_AT    = 0.10;
var EXPLODE_AT  = 1.0;

var BLAST_RADIUS = 480; 
var BLAST_DAMAGE = 2500;

var FLASH_DURATION = 180;
var NEAR_RADIUS    = 80;
var FLASH_MAX_DIST = 800;
var FLASH_MIN_PEAK = 0.0;

var SHAKE_INTENSITY = 50;
var SHAKE_DURATION  = 4;
var SHOCK_DURATION  = 240;
var SHOCK_MAX_R     = 2800;

var alarmPlaying = {};
var heatMap      = {};
var flashStart   = -1;
var flashPeak    = 0;
var shockStart   = -1;
var shockX       = 0;
var shockY       = 0;
var flashRegion  = null;
var meltdownQueue = [];
var exploding = {}; 

var lastPlayTime = { "reactor-alarm": -9999 };

function playSoundFresh(relativePath) {
    var mod = null;
    try { mod = Vars.mods.getMod("ovx-project-mod"); } catch (e) { return; }
    if (!mod || !mod.root) return;

    try {
        var f = mod.root.child("sounds/" + relativePath + ".ogg");
        if (!f.exists()) return;
        var s = new Sound(f);
        try { s.load(); } catch (e) {}
        try { s.play(); } catch (e) {}
    } catch (e) {}
}

function playSoundOnce(relativePath, x, y, maxTiles, durationTicks) {
    var now = Vars.state.tick;
    var last = lastPlayTime[relativePath] || -9999;
    if (now - last < durationTicks) return;

    var px = 0, py = 0;
    try { px = Vars.player.x; py = Vars.player.y; } catch (e) { return; }

    var dx = x - px;
    var dy = y - py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var maxPx = maxTiles * 8;
    if (dist > maxPx) return;

    var t = dist / maxPx;
    var closeness = 1 - t;
    closeness = closeness * closeness;
    if (Math.random() > closeness) return;

    playSoundFresh(relativePath);
    lastPlayTime[relativePath] = now;
}

Events.on(ContentInitEvent, function() {
    try {
        flashRegion = Core.atlas.find("ovx-meltdown-flash");
        if (flashRegion == null || !flashRegion.found()) flashRegion = null;
    } catch (e) { flashRegion = null; }
});

Events.on(WorldLoadEvent, function() {
    alarmPlaying = {};
    heatMap      = {};
    flashStart   = -1;
    flashPeak    = 0;
    shockStart   = -1;
    meltdownQueue = [];
    exploding = {};
    lastPlayTime = { "reactor-alarm": -9999 };
});

function tryFx(name, x, y) {
    try { var fx = Fx[name]; if (fx) fx.at(x, y); } catch (e) {}
}

function damageAllUnits(x, y, radius, damage) {
    Groups.unit.each(function(u) {
        if (!u || u.dead || u.health <= 0) return;
        var dx = u.x - x;
        var dy = u.y - y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var hitR = radius + (u.hitSize / 2);
        if (dist > hitR) return;
        var falloff = 1 - (dist / hitR);
        if (falloff < 0) falloff = 0;
        u.damagePierce(damage * falloff);
    });
}

Events.run(Trigger.update, function() {
    if (!Vars.state.isGame() || Vars.state.isPaused()) return;

    Groups.build.each(function(b) {
        if (!b.block || b.block.name !== BLOCK_NAME) return;

        var hasFuel = false;
        if (b.items) {
            try { hasFuel = b.items.total() > 0; } catch (e) {}
        }

        if (!hasFuel) {
            heatMap[b.id] = 0;
            alarmPlaying[b.id] = false;
            return;
        }

        var hasWater = false;
        if (b.liquids) {
            try { hasWater = b.liquids.currentAmount() > 0.1; } catch (e) {}
        }

        if (hasWater) {
            heatMap[b.id] = 0;
            alarmPlaying[b.id] = false;
            return;
        }

        var heat = (heatMap[b.id] || 0) + HEAT_RATE;
        if (heat > EXPLODE_AT) heat = EXPLODE_AT;
        heatMap[b.id] = heat;

        if (heat >= ALARM_AT && !alarmPlaying[b.id]) {
            playSoundOnce("reactor-alarm", b.x, b.y, 45, 420);
            alarmPlaying[b.id] = true;
        }

        if (heat >= FLASH_AT) {
            if (Vars.state.tick % 10 === 0) tryFx("explosion", b.x, b.y);
        } else if (heat >= SMOKE_AT) {
            if (Vars.state.tick % 8 === 0) tryFx("smoke", b.x, b.y);
        }

        if (heat >= EXPLODE_AT) {
            meltdownQueue.push(b);
            heatMap[b.id] = 0;
            alarmPlaying[b.id] = false;
        }
    });

    for (var i = 0; i < meltdownQueue.length; i++) {
        var b = meltdownQueue[i];
        if (b && !exploding[b.id]) {
            exploding[b.id] = true;
            triggerExplosion(b.x, b.y, b);
        }
    }
    meltdownQueue = [];
});

Events.on(BlockDestroyEvent, function(e) {
    var b = e.tile.build;
    if (b && b.block && b.block.name === BLOCK_NAME) {
        if (b.health <= 0 && !exploding[b.id]) {
            exploding[b.id] = true;
            triggerExplosion(b.x, b.y, b);
        }
    }
});

function spawnShockwaves(x, y) {
    tryFx("massiveExplosion", x, y);
    tryFx("impactWave", x, y);

    var stages = [ 60, 120, 200, 300, 420, 560, 720, 900, 1100, 1320, 1550, 1800, 2050, 2300, 2550, 2800 ];

    for (var s = 0; s < stages.length; s++) {
        (function (radius, index) {
            Time.run(index * 15, function () {
                var count = 12 + index * 6;
                for (var j = 0; j < count; j++) {
                    var a = (j / count) * Math.PI * 2;
                    tryFx("shockwave", x + Math.cos(a) * radius, y + Math.sin(a) * radius);
                }
            });
        })(stages[s], s);
    }
}

function triggerExplosion(bx, by, b) {
    try { Sounds.explosion.play(); } catch (e) {}

    try {
        Damage.damage(bx, by, BLAST_RADIUS, BLAST_DAMAGE);
        damageAllUnits(bx, by, BLAST_RADIUS, BLAST_DAMAGE);
    } catch (e) {}

    tryFx("massiveExplosion", bx, by);
    spawnShockwaves(bx, by);

    var rings = [
        { radius: 60,  count: 8  }, { radius: 120, count: 12 },
        { radius: 200, count: 16 }, { radius: 300, count: 20 },
        { radius: 450, count: 28 }
    ];

    for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        for (var i = 0; i < ring.count; i++) {
            var angle = (i / ring.count) * Math.PI * 2;
            tryFx("smoke", bx + Math.cos(angle) * ring.radius, by + Math.sin(angle) * ring.radius);
            if (r < 2) tryFx("explosion", bx + Math.cos(angle) * ring.radius, by + Math.sin(angle) * ring.radius);
        }
    }

    try { Effect.shake(SHAKE_INTENSITY, SHAKE_DURATION); } catch (e) {}

    var peak = 1.0;
    try {
        var dist = Math.sqrt(Math.pow(bx - Vars.player.x, 2) + Math.pow(by - Vars.player.y, 2));
        if (dist <= NEAR_RADIUS) peak = 1.0;
        else if (dist >= FLASH_MAX_DIST) peak = FLASH_MIN_PEAK;
        else peak = 1.0 + (FLASH_MIN_PEAK - 1.0) * ((dist - NEAR_RADIUS) / (FLASH_MAX_DIST - NEAR_RADIUS));
    } catch (e) {}

    flashStart = Vars.state.tick;
    flashPeak  = peak;
    shockStart = Vars.state.tick;
    shockX     = bx;
    shockY     = by;

    Groups.build.each(function(other) {
        if (other && !other.dead && other.block && other.block.name === BLOCK_NAME && other.id !== (b ? b.id : -1)) {
            var dx = other.x - bx;
            var dy = other.y - by;
            if (Math.sqrt(dx * dx + dy * dy) <= BLAST_RADIUS) {
                heatMap[other.id] = EXPLODE_AT; 
            }
        }
    });

    if (b && !b.dead) {
        try { b.kill(); } catch (e) {}
    }
}

Events.run(Trigger.draw, function() {
    if (shockStart >= 0) {
        var se = Vars.state.tick - shockStart;
        if (se >= SHOCK_DURATION) {
            shockStart = -1;
        } else {
            var st = se / SHOCK_DURATION;
            var sr = SHOCK_MAX_R * st;
            var sa = (1 - st) * 0.85;
            var sw = 6 * (1 - st) + 2;

            try {
                Draw.draw(Layer.blockOver, function () {
                    Draw.color(1, 1, 1, sa);
                    Lines.stroke(sw);
                    Lines.circle(shockX, shockY, sr);
                    Draw.reset();
                });
            } catch (e) {}
        }
    }

    if (flashStart < 0) return;

    var elapsed = Vars.state.tick - flashStart;
    if (elapsed >= FLASH_DURATION) {
        flashStart = -1;
        return;
    }

    var t = elapsed / FLASH_DURATION;
    var fade = Math.pow(1 - t, 2.5);
    var alpha = flashPeak * fade * 0.85;

    if (alpha > 1) alpha = 1;
    if (alpha < 0.01) return;

    var cx = 0, cy = 0;
    try { cx = Core.camera.position.x; cy = Core.camera.position.y; } catch (e) {
        try { cx = Vars.player.x; cy = Vars.player.y; } catch (e2) {}
    }

    var scale = 1;
    try { scale = Core.camera.zoom; } catch (e) {}
    if (!scale || scale <= 0) scale = 1;

    var w = Core.graphics.getWidth()  / scale;
    var h = Core.graphics.getHeight() / scale;
    var size = Math.max(w, h) * 2.2;

    try {
        Draw.draw(Layer.end, function () {
            Draw.color(1, 1, 1, alpha);
            if (flashRegion != null) {
                Draw.rect(flashRegion, cx, cy, size, size);
            } else {
                Draw.rect(Tex.whiteui, cx, cy, w * 2.5, h * 2.5);
            }
            Draw.reset();
        });
    } catch (e) {}
});
