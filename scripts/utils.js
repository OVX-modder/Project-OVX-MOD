function findNearest(source, searchFor, max_rad, notThis) {
    let size = source.block.size;

    let centerX = source.tile.x;
    let centerY = source.tile.y;

    let cornerX = centerX - (size - 1) / 2;
    let cornerY = centerY - (size - 1) / 2;

    let startX = Math.floor(cornerX - max_rad);
    let startY = Math.floor(cornerY - max_rad);
    let endX = Math.ceil(cornerX + size - 1 + max_rad);
    let endY = Math.ceil(cornerY + size - 1 + max_rad);

    let nearest = null;
    let minDistance = max_rad * max_rad;

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            let tile = Vars.world.tile(x, y);

            if (tile == null || !tile.solid()) continue;

            let other = tile.build;

            if ((other == null) || (other == source) || (other == notThis) || other.dead) continue;

            if (other.block.name != searchFor) continue;

            let distance = Math.pow(other.tile.y - centerY,2) + Math.pow(other.tile.x - centerX,2);

            if (distance > max_rad * max_rad) continue;

            if (nearest == null || distance < minDistance) {
                minDistance = distance;
                nearest = [other.tile.x, other.tile.y];
            }
        }
    }

    return nearest;
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

exports.findNearest = findNearest;
exports.createBlockSpark = createBlockSpark;