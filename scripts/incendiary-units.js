

const flamemortarBomb = new BombBulletType();
flamemortarBomb.incendAmount = 10
flamemortarBomb.incendSpread = 20
flamemortarBomb.incendChance = 1
flamemortarBomb.speed = 0
flamemortarBomb.lifetime = 40
flamemortarBomb.spin = 5
flamemortarBomb.width = 24
flamemortarBomb.height = 24
flamemortarBomb.shrinkX = 0.8;
flamemortarBomb.shrinkY = 0.8;
flamemortarBomb.sprite = "ovx-project-mod-firebomb";


const flamemortar = extend(Weapon, "flamemortar", {
    shoot(unit, mount, x, y, rotation){
        let radius = Mathf.random(unit.range())
        let angle = Math.random()*360
        flamemortarBomb.create(unit,unit.team,x+Mathf.cosDeg(angle)*radius,y+Mathf.sinDeg(angle)*radius,angle)
        radius = Mathf.random(unit.range())
        angle = Math.random()*360
        flamemortarBomb.create(unit,unit.team,x+Mathf.cosDeg(angle)*radius,y+Mathf.sinDeg(angle)*radius,angle)
    }
})

flamemortar.bullet = flamemortarBomb;
flamemortar.x=4,
flamemortar.y=-1,
flamemortar.rotate=true
flamemortar.reload=20
flamemortar.recoil=0
flamemortar.mirror=true
flamemortar.alternate=false

const incinerate = extend(UnitType,"incinerate",{});
incinerate.weapons.add(flamemortar)
incinerate.flying=true;


const flameRad = 32
const flameLines = 128
const flameOrbStreams = 6

const FlameStream = new ContinuousFlameBulletType();
FlameStream.speed = 6;
FlameStream.lifetime = 48;
FlameStream.length = 32
FlameStream.drawFlare = false
FlameStream.width = 8
FlameStream.colors = [Color(0.5,0,0),Color(0.5,0.125,0),Color(0.5,0.25,0),Color(0.5,0.375,0),Color(0.5,0.5,0)]

const FlameOrb = extend(BasicBulletType,{
    draw(b){
        Lines.stroke(3)
        for (let i = 0; i < flameLines; i++) {
            let radius = (1-(i/flameLines))*flameRad
            let angle = Mathf.random(360)
            Draw.color(0.5, 0.5-radius/(flameRad*2) ,0)
            Lines.line(
                b.x,
                b.y,
                b.x+Mathf.cosDeg(angle)*radius,
                b.y+Mathf.sinDeg(angle)*radius
            ) 
        }
        Draw.reset()
    },
    update(b){
        let angle = b.time*4
        for(let i = 0;i<360;i+=360/flameOrbStreams){
            FlameStream.create(b,b.x,b.y,i+angle)
        }
    }

});

FlameOrb.lifetime = 600
FlameOrb.speed = 1
FlameOrb.spin = 3
FlameOrb.width = 48
FlameOrb.height = 48

const megablaster = extend(Weapon, "megablaster", {
    load(){
        this.super$load();
        this.region = Core.atlas.find("ovx-project-mod-megablaster");
    }
})
megablaster.bullet = FlameOrb;
megablaster.x=0,
megablaster.y=-1,
megablaster.rotate=true
megablaster.reload=480
megablaster.recoil= 15
megablaster.recoilTime = 60
megablaster.recoilPow=3
megablaster.mirror=false

const immolate = extend(UnitType,"immolate",{});
immolate.weapons.add(megablaster)
immolate.flying=true;