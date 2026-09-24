function getModItem(searchName) {
    let found = null;
    Vars.content.items().each(i => {
        if (String(i.name).indexOf(searchName) !== -1) found = i;
    });
    return found;
}

function getModLiquid(searchName) {
    let found = null;
    Vars.content.liquids().each(l => {
        if (String(l.name).indexOf(searchName) !== -1) found = l;
    });
    return found;
}

const arcFurnace = extend(GenericCrafter, "arc-furnace", {
    init() {
        let chromium = getModItem("chromium");
        let stainlessSteel = getModItem("stainless-steel");
        let steam = getModLiquid("steam"); 

        this.steamRef = steam;

        if (chromium != null) {
            this.consumeItems(ItemStack.with(Items.lead, 2, chromium, 1));
        } else {
            this.consumeItem(Items.lead, 2); 
        }

        if (stainlessSteel != null) {
            this.outputItem = new ItemStack(stainlessSteel, 1);
        }
        if (steam != null) {
            this.outputLiquid = new LiquidStack(steam, 23 / 60); 
        }

        this.hasItems = true;
        this.hasLiquids = true;
        this.hasPower = true;
        this.outputsLiquid = true;

        this.super$init();
    }
});

arcFurnace.buildType = prov(() => extend(GenericCrafter.GenericCrafterBuild, arcFurnace, {
    pressure: 0,
    overloadDamage: 0,
    
    updateTile() {
        this.super$updateTile();

        let steam = this.block.steamRef;
        
        if (steam != null) {
            if (this.liquids.get(steam) > 0) {
                this.dumpLiquid(steam);
            }

            let currentSteam = this.liquids.get(steam);
            let maxSteam = this.block.liquidCapacity;
            
            if (currentSteam >= maxSteam - 10) {
                this.pressure = Math.min(this.pressure + 0.005, 1.0);
            } else {
                this.pressure = Math.max(this.pressure - 0.01, 0.0);
                this.overloadDamage = 0;
            }
        }

        if (this.efficiency > 0 && this.liquids.get(Liquids.water) > 0) {
            if (Mathf.chanceDelta(0.05)) {
                Fx.steam.at(this.x + Mathf.range(8), this.y + Mathf.range(8));
            }
        }

        if (this.pressure >= 1.0) {
            if (Mathf.chanceDelta(0.6)) {
                Fx.steam.at(this.x + Mathf.range(12), this.y + Mathf.range(12));
            }
            
            this.overloadDamage += 0.015; 
            this.damage(this.overloadDamage);
        }
    },
    
    onDestroy() {
        if (this.pressure >= 1.0) {
            Damage.damage(this.x, this.y, 64, 1500);
            Fx.massiveExplosion.at(this.x, this.y);
        }
        
        this.super$onDestroy();
    }
}));

arcFurnace.name = "ovx-project-mod-arc-furnace";
arcFurnace.localizedName = "Arc Furnace";
arcFurnace.description = "make stainless steel materials using massive amounts of power. Vent steam carefully to avoid pressure explosions.";
arcFurnace.size = 3;
arcFurnace.craftTime = 45;
arcFurnace.itemCapacity = 10;
arcFurnace.liquidCapacity = 120;

arcFurnace.category = Category.crafting;
arcFurnace.buildVisibility = BuildVisibility.shown;

const glowRegion = new DrawGlowRegion("-ovx");
glowRegion.color = Color.valueOf("FFD37FFF");
glowRegion.alpha = 1.0;
arcFurnace.drawer = new DrawMulti(new DrawDefault(), 
glowRegion
);


arcFurnace.requirements = ItemStack.with(
    Items.copper, 150,
    Items.lead, 100,
    Items.silicon, 50,
    Items.metaglass, 40
);

arcFurnace.consumePower(3.5);
arcFurnace.consumeLiquid(Liquids.water, 23.6 / 60);

Events.on(ClientLoadEvent, () => {
    let parentNode = TechTree.all.find(t => t.content == Blocks.siliconSmelter);
    let lithium = getModItem("lithium");
    
    if (parentNode != null && lithium != null) {
        new TechTree.TechNode(parentNode, arcFurnace, ItemStack.with(
            Items.silicon, 3000,
            Items.lead, 5000,
            lithium, 6000,
            Items.metaglass, 3000
        ));
    }
});
