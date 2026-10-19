
const blackHoleShader = new Shaders.LoadShader("hastur", "hastur");

const hastur = extend(Planet,"hastur", Planets.sun, 5, 1,{
})

hastur.localizedName = "Hastur";

hastur.meshLoader = () =>
    new ShaderSphereMesh(hastur, blackHoleShader, 5);

hastur.accessible= false
hastur.alwaysUnlocked= false
hastur.visible= true
hastur.hasAtmosphere= false
hastur.lightColor= Color.valueOf("333300");
hastur.bloom= true
hastur.orbitSpacing= 0.5
hastur.solarSystem = hastur
hastur.radius= 5
hastur.drawOrbit = false;
hastur.orbitRadius= 120
