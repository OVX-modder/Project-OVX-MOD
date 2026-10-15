var PLANET_NAME = "ovx-project-mod-carcosa";

// ================================================
//   HIDE / BAN / SWAP TABLES
// ================================================

var HIDE_BLOCKS = [
    "core-shard",
    "core-foundation",
    "core-nucleus",
    "core-bastion",
    "core-citadel",
    "core-acropolis"
];

var HIDE_ITEMS = [];
var HIDE_LIQUIDS = [];
var HIDE_UNITS = [];

var BAN_BLOCKS = [
    "shale-wall",
    "snow-boulder",
    "sand-boulder"
];

var BAN_ORES = [];
var BAN_LIQUIDS = [];
var BAN_UNITS = [];

var FLOOR_SWAPS = [
    { from: "shallow-water",           to: "molten-slag" },
    { from: "sand-water",              to: "molten-slag" },
    { from: "darksand-water",          to: "molten-slag" },
    { from: "darksand-tainted-water",  to: "molten-slag" },
    { from: "deep-tainted-water",      to: "molten-slag" },
    { from: "tainted-water",           to: "molten-slag" },
    { from: "deep-water",              to: "molten-slag" },
    { from: "water",                   to: "molten-slag" },
    { from: "molten-slag",             to: "water" },
    { from: "sand-floor",              to: "darksand" },
    { from: "sand",                    to: "darksand" },
    { from: "snow",                    to: "basalt" },
    { from: "ice-snow",                to: "basalt" },
    { from: "ice",                     to: "basalt" },
    { from: "salt",                    to: "basalt" }
];

var WALL_SWAPS = [
    { from: "snow-wall",   to: "stone-wall" },
    { from: "ice-wall",    to: "stone-wall" },
    { from: "sand-wall",   to: "stone-wall" },
    { from: "dune-wall",   to: "stone-wall" },
    { from: "salt-wall",   to: "stone-wall" }
];

var LIQUID_SWAPS = [
    { from: "water",       to: "slag" },
    { from: "deep-water",  to: "slag" },
    { from: "slag",        to: "water" },
    { from: "oil",         to: "water" }
];

var ORE_SWAPS = [];

// =============================================
//   WAVE STAGES --- add any unit in the list
// =============================================

var WAVE_STAGES = [
    { begin: 1,  end: 8,  units: [ "dagger", "mace", "flare", "risso" ],
      amount: 2, scaling: 0.3 },
    { begin: 9,  end: 16, units: [ "mace", "crawler", "atrax", "horizon", "zenith", "minke" ],
      amount: 2, scaling: 0.4 },
    { begin: 17, end: 28, units: [ "fortress", "spiroct", "antumbra", "bryde" ],
      amount: 2, scaling: 0.5 },
    { begin: 29, end: 40, units: [ "scepter", "arkyid", "eclipse", "obviate", "sei" ],
      amount: 3, scaling: 0.7 },
    { begin: 41, end: 49, units: [ "reign", "toxopid", "corvus", "vela", "omura" ],
      amount: 3, scaling: 1.0 },
    { begin: 50, end: 60, isBoss: true,
      units: [
          "reign", "toxopid",
          "corvus", "vela",
          "navanax"
          // "ovx-project-mod-boss", // this is a example for modded units
      ],
      amount: 1, scaling: 1.5 }
];

var DIST_TIERS = [
    { threat: 0.35, waves: 15 },
    { threat: 0.50, waves: 25 },
    { threat: 0.65, waves: 35 },
    { threat: 0.80, waves: 45 },
    { threat: 0.92, waves: 55 },
    { threat: 1.01, waves: 60 }
];

var _distMap = {};

function buildDistMap() {
    var planet = Vars.content.planet(PLANET_NAME);
    if (!planet) return;

    var sectors = Vars.content.sectors();
    var startId = planet.startSector;
    var start = null;
    sectors.each(function(s) {
        if (s.id === startId && s.planet === planet) start = s;
    });
    if (!start) return;

    var sx = start.tileX(), sy = start.tileY();
    var maxDist = 1;

    sectors.each(function(s) {
        if (s.planet !== planet) return;
        var dx = s.tileX() - sx;
        var dy = s.tileY() - sy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxDist) maxDist = d;
    });

    sectors.each(function(s) {
        if (s.planet !== planet) return;
        if (s.id === startId) { _distMap[s.id] = 0; return; }
        var dx = s.tileX() - sx;
        var dy = s.tileY() - sy;
        var d = Math.sqrt(dx * dx + dy * dy);
        _distMap[s.id] = d / maxDist;
    });

    print("[DIST] built " + Object.keys(_distMap).length +
          " entries, maxDist=" + maxDist.toFixed(1));
}

function pickMaxWaves(threat) {
    for (var i = 0; i < DIST_TIERS.length; i++) {
        if (threat < DIST_TIERS[i].threat) return DIST_TIERS[i].waves;
    }
    return 60;
}

function threatName(maxWaves) {
    if (maxWaves <= 15) return "Low";
    if (maxWaves <= 25) return "Medium";
    if (maxWaves <= 35) return "Hard";
    if (maxWaves <= 45) return "Epic";
    if (maxWaves <= 55) return "Ultra";
    return "Impossible";
}

function threatColor(name) {
    if (name === "Low")        return "cccccc";
    if (name === "Medium")     return "55dd55";
    if (name === "Hard")       return "ffaa00";
    if (name === "Epic")       return "ff3333";
    if (name === "Ultra")      return "cc44ff";
    return "7700ff";
}

function setupWaves(maxWaves) {
    Vars.state.rules.spawns.clear();

    for (var s = 0; s < WAVE_STAGES.length; s++) {
        var st = WAVE_STAGES[s];
        if (st.begin > maxWaves) continue;
        var stEnd = Math.min(st.end, maxWaves);

        for (var i = 0; i < st.units.length; i++) {
            var ut = Vars.content.unit(st.units[i]);
            if (!ut) {
                print("[WAVE] unknown unit: " + st.units[i]);
                continue;
            }

            var sg = new SpawnGroup(ut);
            sg.begin = st.begin;
            sg.end = stEnd;
            sg.spacing = 1;
            sg.unitAmount = st.amount;
            sg.unitScaling = st.scaling;
            Vars.state.rules.spawns.add(sg);
        }
    }

    Vars.state.rules.winWave = maxWaves;
    Vars.state.rules.waveSpacing = 6000;

    print("[WAVE] setup complete, max waves = " + maxWaves);
}

var CarcosaGen = extend(SerpuloPlanetGenerator, {
    alt: true,
    allowLanding: function(sector) {
        var planet = Vars.content.planet(PLANET_NAME);
        if (!planet) return true;
        if (sector.id === planet.startSector) return true;
        try {
            var near = sector.near();
            for (var i = 0; i < near.size; i++) {
                if (near.get(i).hasBase()) return true;
            }
        } catch (e) {}
        return false;
    }
});

Events.on(ContentInitEvent, function() {
    var planet = Vars.content.planet(PLANET_NAME);
    if (!planet) return;

    planet.generator = CarcosaGen;

    var ember = Vars.content.block("ovx-project-mod-core-ember");
    if (!ember) ember = Vars.content.block("core-ember");
    if (ember) {
        try { planet.defaultCore = ember; print("[CORE] defaultCore = " + ember.name); }
        catch (e) { print("[CORE] set fail: " + e); }
    } else {
        planet.defaultCore = Vars.content.block("core-shard");
    }

    for (var i = 0; i < HIDE_BLOCKS.length; i++) {
        var b = Vars.content.block(HIDE_BLOCKS[i]);
        if (b) { try { b.hidden = true; } catch (e) {} }
    }
    for (var i = 0; i < HIDE_ITEMS.length; i++) {
        var it = Vars.content.item(HIDE_ITEMS[i]);
        if (it) { try { it.hidden = true; } catch (e) {} }
    }
    for (var i = 0; i < HIDE_LIQUIDS.length; i++) {
        var l = Vars.content.liquid(HIDE_LIQUIDS[i]);
        if (l) { try { l.hidden = true; } catch (e) {} }
    }
    for (var i = 0; i < HIDE_UNITS.length; i++) {
        var u = Vars.content.unit(HIDE_UNITS[i]);
        if (u) { try { u.hidden = true; } catch (e) {} }
    }

    for (var i = 1; i <= 6; i++) {
        Time.run(i * 30, function() { buildDistMap(); });
    }
});

Events.run(Trigger.update, function() {
    if (!Vars.state.isGame()) return;
    if (Vars.state.tick % 60 !== 0) return;

    var sector = Vars.state.rules.sector;
    if (!sector) return;
    var planet = sector.planet;
    if (!planet || planet.name !== PLANET_NAME) return;

    var t = _distMap[sector.id];
    if (t === undefined) t = 0.5;

    var want = pickMaxWaves(t);
    if (Vars.state.rules.winWave !== want) {
        Vars.state.rules.winWave = want;
    }
});

Events.on(WorldLoadEvent, function() {
    var planet = Vars.state.rules.planet;
    if (!planet || planet.name !== PLANET_NAME) return;

    var world = Vars.world;
    var w = world.width();
    var h = world.height();

    function resolve(list) {
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var a = Vars.content.block(list[i].from);
            var b = Vars.content.block(list[i].to);
            if (a && b) out.push({ a: a, b: b, from: list[i].from });
            else print("[SWAP] skip: " + list[i].from + " → " + list[i].to);
        }
        return out;
    }

    var floors  = resolve(FLOOR_SWAPS);
    var walls   = resolve(WALL_SWAPS);
    var liquids = resolve(LIQUID_SWAPS);
    var ores    = resolve(ORE_SWAPS);

    var banBlocks = [];
    for (var i = 0; i < BAN_BLOCKS.length; i++) {
        var b = Vars.content.block(BAN_BLOCKS[i]);
        if (b) banBlocks.push(b);
    }

    var counts = {};
    function bump(key) { counts[key] = (counts[key] || 0) + 1; }

    for (var x = 0; x < w; x++) {
        for (var y = 0; y < h; y++) {
            var t = world.tile(x, y);
            if (!t) continue;

            var f = t.floor();
            if (f) {
                for (var i = 0; i < floors.length; i++) {
                    if (f === floors[i].a) {
                        t.setFloor(floors[i].b);
                        bump("F:" + floors[i].from);
                        break;
                    }
                }
            }

            var b = t.block();
            if (b && b.name !== "air") {
                var handled = false;

                for (var i = 0; i < banBlocks.length; i++) {
                    if (b === banBlocks[i]) {
                        t.setBlock(Vars.content.block("air"));
                        bump("BAN:" + banBlocks[i].name);
                        handled = true;
                        break;
                    }
                }
                if (handled) continue;

                for (var i = 0; i < walls.length; i++) {
                    if (b === walls[i].a) {
                        t.setBlock(walls[i].b);
                        bump("W:" + walls[i].from);
                        handled = true;
                        break;
                    }
                }
                if (handled) continue;

                for (var i = 0; i < liquids.length; i++) {
                    if (b === liquids[i].a) {
                        t.setBlock(liquids[i].b);
                        bump("L:" + liquids[i].from);
                        handled = true;
                        break;
                    }
                }
                if (handled) continue;

                for (var i = 0; i < ores.length; i++) {
                    if (b === ores[i].a) {
                        t.setBlock(ores[i].b);
                        bump("O:" + ores[i].from);
                        break;
                    }
                }
            }
        }
    }

    // Core replace with item preservation
    var ember = Vars.content.block("ovx-project-mod-core-ember");
    if (!ember) ember = Vars.content.block("core-ember");

    if (ember) {
        var replacedCount = 0;
        for (var rx = 0; rx < w; rx++) {
            for (var ry = 0; ry < h; ry++) {
                var rt = world.tile(rx, ry);
                if (!rt) continue;
                var rb = rt.block();
                if (!rb || rb.name === "air") continue;
                if (rb.name.indexOf("core") === -1) continue;
                if (rb === ember) continue;

                var rteam = null;
                try { rteam = rt.team(); } catch (e) {}
                if (!rteam) rteam = Team.sharded;

                try {
                    var savedItems = [];
                    try {
                        var oldBuild = rt.build;
                        if (oldBuild && oldBuild.items) {
                            Vars.content.items().each(function(it) {
                                var amt = oldBuild.items.get(it);
                                if (amt > 0) savedItems.push({ item: it, amount: amt });
                            });
                        }
                    } catch (e2) {}

                    rt.setBlock(Vars.content.block("air"));
                    rt.setBlock(ember, rteam, 0);

                    try {
                        var newBuild = rt.build;
                        if (newBuild && newBuild.items) {
                            for (var si = 0; si < savedItems.length; si++) {
                                newBuild.items.set(savedItems[si].item, savedItems[si].amount);
                            }
                        }
                    } catch (e3) {}
                }
            }
        }
    }

    var threat = 0.5;
    try {
        var sector = Vars.state.rules.sector;
        if (sector) {
            var d = _distMap[sector.id];
            threat = (d !== undefined) ? d : 0.5;
        }
    } catch (e) {}
    threat = Math.max(0, Math.min(1, threat));

    var maxWaves = pickMaxWaves(threat);
    print("[WAVE] threat = " + threat.toFixed(2) + " → " + maxWaves + " waves");

    try {
        setupWaves(maxWaves);
    } catch (e) {
        print("[WAVE] setup failed: " + e);
    }

    var keys = Object.keys(counts).sort();
    for (var i = 0; i < keys.length; i++) {
        print("[SWAP] " + keys[i] + " = " + counts[keys[i]]);
    }

    Time.run(60, function() {
        try {
            var label = threatName(maxWaves);
            var color = threatColor(label);
            var msg = "Threat = [#" + color + "]" + label + "[]";
            Vars.ui.showInfoFade(msg);
            print("[POPUP] Threat = " + label);
        } catch (e) {
            print("[POPUP] failed: " + e);
        }
    });
});
