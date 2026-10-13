try {

const { findNearest } = require("utils");

const BasicBulletType = Packages.mindustry.entities.bullet.BasicBulletType;
const PowerTurret = Packages.mindustry.world.blocks.defense.turrets.PowerTurret;

const amp = 8




const outGate = extend(PowerTurret, "gate-EX", {
    init(){
		this.super$init();
	},
	load(){
		this.super$load();
	},
});

const inGate = extend(Wall, "gate-IM", {
    
});


const gateShot = extend(BasicBulletType,{
   draw(b){
        let rotation = b.time*12;
        Draw.color(0.6,0.6,1,0.5)

        Lines.stroke(2)
        for(let a=0;a<360;a+=45){
            var rot = rotation+a
            Lines.line(
                b.x+amp*Mathf.cosDeg(rot),
                b.y+amp*Mathf.sinDeg(rot),
                b.x+amp*Mathf.cosDeg(rot+90),
                b.y+amp*Mathf.sinDeg(rot+90),
            )
        }
        Draw.reset();
    },
    update(b) {
    let tile = Vars.world.tile(
        Math.round(b.x / Vars.tilesize),
        Math.round(b.y / Vars.tilesize)
    );

    if (tile != null && tile.build != null) {
        if (tile.build.block == inGate) {
            b.remove();
        }
    }
}


})

gateShot.lifetime = 160
gateShot.speed = 1

outGate.buildType = () => extend(PowerTurret.PowerTurretBuild, outGate, {
    updateGate(notThis){
        var targetBuilding = findNearest(this,inGate.name,20,notThis)
        if(targetBuilding!=null){
            this.enabled = true;
            this.targetPos.set(new Vec2(targetBuilding[0],targetBuilding[1]));
            this.rotation = Math.atan2(targetBuilding[1]-this.tile.y,targetBuilding[0]-this.tile.x)*180/Math.PI;
        }else{
            this.enabled = false;
        }
    },
    placed(){
       this.updateGate(null) 
    }
})
outGate.enabled = false

inGate.buildType = () => {return extend(Wall.WallBuild, inGate, {
    placed() {
        this.super$placed();

        let rad = 20;
        let centerX = this.tile.x;
        let centerY = this.tile.y;

        for (let x = centerX - rad; x <= centerX + rad + 1; x++) {
            for (let y = centerY - rad; y <= centerY + rad + 1; y++) {
                let tile = Vars.world.tile(x, y);
                if (tile == null) continue;

                let other = tile.build;
                if (other == null) continue;

                if (other.block == outGate) {
                    other.updateGate(null);
                }
            }
        }
    },
    onRemoved() {
    let centerX = this.tile.x;
    let centerY = this.tile.y;
    let rad = 20;
    for (let x = centerX - rad; x <= centerX + rad; x++) {
        for (let y = centerY - rad; y <= centerY + rad; y++) {
            let tile = Vars.world.tile(x, y);
            if (tile == null) continue;
            let other = tile.build;
            if (other == null) continue;
            if (other.block.name == outGate.name) {
                other.updateGate(this.tile.build);
            }
        }
    }
    
    this.super$onRemoved();
    },
    onDestroyed() {
    let centerX = this.tile.x;
    let centerY = this.tile.y;
    let rad = 20;
    for (let x = centerX - rad; x <= centerX + rad; x++) {
        for (let y = centerY - rad; y <= centerY + rad; y++) {
            let tile = Vars.world.tile(x, y);
            if (tile == null) continue;
            let other = tile.build;
            if (other == null) continue;
            if (other.block.name == outGate.name) {
                other.updateGate(this.tile.build);
            }
        }
    }
    
    this.super$onDestroyed();
    }
    
    

})};

    

outGate.shootType = gateShot

outGate.powerUse = 80;
outGate.targetAir = true;
outGate.targetGround = true;
outGate.alwaysShooting = true;
outGate.shootCone = 360;

} catch (error) {
    print(error);
}


    
    

