

var BLOCK_NAME = "ovx-project-mod-nuclear-reactor";
var FUEL_NAME  = "ovx-project-mod-fuel-capsule";

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

var SHOCK_DURATION = 240;
var SHOCK_MAX_R    = 2800;

var RANGE_ALARM    = 45;
var DURATION_ALARM = 420;

var alarmPlaying = {};
var heatMap      = {};
var flashStart   = -1;
var flashPeak    = 0;
var shockStart   = -1;
var shockX       = 0;
var shockY       = 0;
var flashRegion  = null;

var lastPlayTime = {
    "reactor-alarm": -9999
};

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
    try {
        px = Vars.player.x;
        py = Vars.player.y;
    } catch (e) { return; }

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
        if (flashRegion == null || !flashRegion.found()) {
            flashRegion = null;
        }
    } catch (e) {
        flashRegion = null;
    }
});

Events.on(WorldLoadEvent, function() {
    alarmPlaying = {};
    heatMap      = {};
    flashStart   = -1;
    flashPeak    = 0;
    shockStart   = -1;
    lastPlayTime = {
        "reactor-alarm": -9999
    };
});

function tryFx(name, x, y) {
    try {
        var fx = Fx[name];
        if (fx) fx.at(x, y);
    } catch (e) {}
}

function damageAllUnits(x, y, radius, damage) {
    Groups.unit.each(function(u) {
        if (u == null) return;
        if (u.dead) return;
        if (u.health <= 0) return;
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
    if (!Vars.state.isGame()) return;
    if (Vars.state.isPaused()) return;

    var fuelItem = Vars.content.getByName(ContentType.item, FUEL_NAME);

    Groups.build.each(function(b) {
        if (!b.block) return;
        if (b.block.name !== BLOCK_NAME) return;
        if (!b.liquids) return;

        // Fuel check
        var fuelCount = 0;
        if (fuelItem && b.items) {
            try { fuelCount = b.items.get(fuelItem); } catch (e) { fuelCount = 0; }
        }

        if (fuelCount <= 0) {
            heatMap[b.id] = 0;
            alarmPlaying[b.id] = false;
            return;
        }

        // Water check
        var water = b.liquids.get(Liquids.water);
        if (water > 0.1) {
            heatMap[b.id] = 0;
            alarmPlaying[b.id] = false;
            return;
        }

        // Heat rises
        var heat = (heatMap[b.id] || 0) + HEAT_RATE;
        if (heat > EXPLODE_AT) heat = EXPLODE_AT;
        heatMap[b.id] = heat;

        // Alarm — plays once when heating starts
        if (heat >= ALARM_AT && !alarmPlaying[b.id]) {
            playSoundOnce("reactor-alarm", b.x, b.y, RANGE_ALARM, DURATION_ALARM);
            alarmPlaying[b.id] = true;
        }

        if (heat >= FLASH_AT) {
            if (Vars.state.tick % 10 === 0) tryFx("explosion", b.x, b.y);
        } else if (heat >= SMOKE_AT) {
            if (Vars.state.tick % 8 === 0) tryFx("smoke", b.x, b.y);
        }

        // Meltdown
        if (heat >= EXPLODE_AT) {
            doMeltdown(b);
            heatMap[b.id] = 0;
            alarmPlaying[b.id] = false;
        }
    });
});

function spawnShockwaves(x, y) {
    tryFx("nuclearShockwave", x, y);
    tryFx("impactWave", x, y);

    var stages = [
        60, 120, 200, 300, 420, 560, 720, 900,
        1100, 1320, 1550, 1800, 2050, 2300, 2550, 2800
    ];

    for (var s = 0; s < stages.length; s++) {
        (function (radius, index) {
            Time.run(index * 15, function () {
                var count = 12 + index * 6;
                for (var j = 0; j < count; j++) {
                    var a = (j / count) * Math.PI * 2;
                    var ox = x + Math.cos(a) * radius;
                    var oy = y + Math.sin(a) * radius;
                    tryFx("shockwave", ox, oy);
                }
            });
        })(stages[s], s);
    }
}

function doMeltdown(b) {
    b.damage(9999);
    Damage.damage(b.x, b.y, BLAST_RADIUS, BLAST_DAMAGE);
    damageAllUnits(b.x, b.y, BLAST_RADIUS, BLAST_DAMAGE);

    tryFx("nuclearSmoke",     b.x, b.y);
    tryFx("reactorExplosion", b.x, b.y);

    spawnShockwaves(b.x, b.y);

    var rings = [
        { radius: 60,  count: 8  },
        { radius: 120, count: 12 },
        { radius: 200, count: 16 },
        { radius: 300, count: 20 },
        { radius: 450, count: 28 }
    ];

    for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        for (var i = 0; i < ring.count; i++) {
            var angle = (i / ring.count) * Math.PI * 2;
            var ox = b.x + Math.cos(angle) * ring.radius;
            var oy = b.y + Math.sin(angle) * ring.radius;
            tryFx("nuclearSmoke", ox, oy);
            if (r < 2) tryFx("explosion", ox, oy);
        }
    }

    for (var k = 0; k < 15; k++) {
        var a2 = Math.random() * Math.PI * 2;
        var r2 = Math.random() * 180;
        tryFx("explosion", b.x + Math.cos(a2) * r2, b.y + Math.sin(a2) * r2);
    }

    try { Effect.shake(SHAKE_INTENSITY, SHAKE_DURATION); } catch (e) {}

    var peak = 1.0;
    try {
        var px = Vars.player.x;
        var py = Vars.player.y;
        var dx = b.x - px;
        var dy = b.y - py;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= NEAR_RADIUS) {
            peak = 1.0;
        } else if (dist >= FLASH_MAX_DIST) {
            peak = FLASH_MIN_PEAK;
        } else {
            var t = (dist - NEAR_RADIUS) / (FLASH_MAX_DIST - NEAR_RADIUS);
            peak = 1.0 + (FLASH_MIN_PEAK - 1.0) * t;
        }
    } catch (e) {
        peak = 1.0;
    }

    flashStart = Vars.state.tick;
    flashPeak  = peak;

    shockStart = Vars.state.tick;
    shockX     = b.x;
    shockY     = b.y;
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
    if (alpha < 0) alpha = 0;
    if (alpha < 0.01) return;

    var cx = 0;
    var cy = 0;
    try {
        cx = Core.camera.position.x;
        cy = Core.camera.position.y;
    } catch (e) {
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
