

function findNearest(source, searchFor, max_rad) {
    let rad = max_rad;
    let size = source.block.size;

    let centerX = source.tile.x;
    let centerY = source.tile.y;

    let other_block = mindustry.core.byName(searchFor)

    let cornerX = centerX - (size - 1) / 2;
    let cornerY = centerY - (size - 1) / 2;

    let startX = cornerX - rad;
    let startY = cornerY - rad;

    let endX = cornerX + (size - 1) + rad;
    let endY = cornerY + (size - 1) + rad;

    let min = [cornerX,cornerY];
    let min_distance = Math.pow(max_rad,3)

    for (let x = startX; x <= endX; x+=other_block.size) {
        for (let y = startY; y <= endY; y+=other_block.size) {

            let tile = Vars.world.tile(x, y);

            if (tile == null) continue;
            if (!tile.solid()) continue;

            let other = tile.build;

            if (other == null) continue;
            if (other === source) continue;

            if (other.block.name == searchFor) {
                if(Math.pow(x-centerX,2)+Math.pow(y-centerY,2)<min_distance){
                    min_distance = Math.pow(x-centerX,2)+Math.pow(y-centerY,2)
                    min = [other.tile.x, other.tile.y];

                }
            }
        }
    }
    if(min_distance == Math.pow(max_rad,3)){
        return null;
    }else{
        return min;
    }
}

function createBlockSpark(b,max_chance){
    var compareTo = (b.power.status*max_chance)/100
    var random = Math.random()
    if(random<=compareTo){
        spark.create(b.team,
        Color.white,
        12,
        b.x+(Math.random()>0.5?12:-12),
        b.y+(Math.random()>0.5?12:-12),
        Math.random()*360,
        8)

    }
}