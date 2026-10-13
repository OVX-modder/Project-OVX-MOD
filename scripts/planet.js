var PLANET_NAME = "ovx-project-mod-carcosa";

// ================================================
//   HIDE — removed from build menu + planet content
//   BAN  — removed from the world after generation
// ================================================

// ---- HIDE (menu visibility) ----
// Blocks removed from build menu
var HIDE_BLOCKS = [
    // "copper-wall",
    // "titanium-wall"
];

// Items removed from item list
var HIDE_ITEMS = [
    // "copper",
    // "lead"
];

// Liquids removed from liquid list
var HIDE_LIQUIDS = [
    // "water",
    // "oil"
];

// Units removed from unit list
var HIDE_UNITS = [
    // "dagger",
    // "mace"
];

// ---- BAN (remove from map) ----
// Blocks removed from the world (walls, tech trees, etc)
var BAN_BLOCKS = [
    // "snow-wall",
    // "ice-wall"
       "shale-wall",
       "snow-boulder",
       "sand-boulder"
];

// Ores removed from the world
var BAN_ORES = [
    // "ore-copper",
    // "ore-lead",
    // "ore-titanium"
];

// Liquids removed from the world
var BAN_LIQUIDS = [
    // "water",
    // "deep-water"
];

// Units removed from the world
var BAN_UNITS = [
    // "dagger",
    // "mace"
];

// ==============
//   SWAP TABLES
// ==============

var FLOOR_SWAPS = [
//    { from: "floor", to: "floor" },
    { from: "sand-floor", to: "darksand" },
    { from: "sand", to: "darksand" },
    { from: "shallow-water", to: "molten-slag" },
    { from: "sand-water", to: "molten-slag" },
    { from: "darksand-water", to: "molten-slag" },
    { from: "darksand-tainted-water", to: "molten-slag" },
    { from: "deep-water", to: "molten-slag" },
    { from: "snow", to: "basalt" },
    { from: "ice-snow", to: "basalt" },
    { from: "ice", to: "basalt" },
    { from: "salt", to: "basalt" }
];

var WALL_SWAPS = [
//    { from: "wall", to: "wall" },
    { from: "snow-wall", to: "stone-wall" },
    { from: "ice-wall", to: "stone-wall" },
    { from: "sand-wall", to: "stone-wall" },
    { from: "dune-wall", to: "stone-wall" },
    { from: "salt-wall", to: "stone-wall" }
];

var LIQUID_SWAPS = [
    { from: "water", to: "slag" },
    { from: "deep-water", to: "slag" },
    { from: "oil", to: "water" },
];

var ORE_SWAPS = [
    // { from: "ore-copper", to: "ovx-project-mod-chromium-ore" }
];

// ====================
//      PLANET ATTACH
// ====================
//  DO NOT EDIT BELOW
// ====================
var CarcosaGen = extend(SerpuloPlanetGenerator, { alt: true });

Events.on(ContentInitEvent, function() {
    var p = Vars.content.planet(PLANET_NAME);
    if (p) p.generator = CarcosaGen;

    var hidden = 0;
    for (var i = 0; i < HIDE_BLOCKS.length; i++) {
        var b = Vars.content.block(HIDE_BLOCKS[i]);
        if (b) { try { b.hidden = true; hidden++; } catch (e) {} }
    }
    for (var i = 0; i < HIDE_ITEMS.length; i++) {
        var it = Vars.content.item(HIDE_ITEMS[i]);
        if (it) { try { it.hidden = true; hidden++; } catch (e) {} }
    }
    for (var i = 0; i < HIDE_LIQUIDS.length; i++) {
        var l = Vars.content.liquid(HIDE_LIQUIDS[i]);
        if (l) { try { l.hidden = true; hidden++; } catch (e) {} }
    }
    for (var i = 0; i < HIDE_UNITS.length; i++) {
        var u = Vars.content.unit(HIDE_UNITS[i]);
        if (u) { try { u.hidden = true; hidden++; } catch (e) {} }
    }
    print("[HIDE] total hidden: " + hidden);
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
            if (a && b) out.push({ a: a, b: b, from: list[i].from, to: list[i].to });
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
    var banOres = [];
    for (var i = 0; i < BAN_ORES.length; i++) {
        var b = Vars.content.block(BAN_ORES[i]);
        if (b) banOres.push(b);
    }
    var banLiquids = [];
    for (var i = 0; i < BAN_LIQUIDS.length; i++) {
        var b = Vars.content.block(BAN_LIQUIDS[i]);
        if (b) banLiquids.push(b);
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

                for (var i = 0; i < banOres.length; i++) {
                    if (b === banOres[i]) {
                        t.setBlock(Vars.content.block("air"));
                        bump("BAN:" + banOres[i].name);
                        handled = true;
                        break;
                    }
                }
                if (handled) continue;

                for (var i = 0; i < banLiquids.length; i++) {
                    if (b === banLiquids[i]) {
                        t.setBlock(Vars.content.block("air"));
                        bump("BAN:" + banLiquids[i].name);
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

    if (BAN_UNITS.length > 0 && Vars.world.unitCount() > 0) {
        var toKill = [];
        Vars.world.units.each(function(u) {
            for (var i = 0; i < BAN_UNITS.length; i++) {
                if (u.type && u.type.name === BAN_UNITS[i]) {
                    toKill.push(u);
                    break;
                }
            }
        });
        for (var i = 0; i < toKill.length; i++) {
            try { toKill[i].kill(); bump("BAN:" + BAN_UNITS[i]); } catch (e) {}
        }
    }

    var keys = Object.keys(counts).sort();
    for (var i = 0; i < keys.length; i++) {
        print("[SWAP] " + keys[i] + " = " + counts[keys[i]]);
    }
});