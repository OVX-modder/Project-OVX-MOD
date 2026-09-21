Events.on(ClientLoadEvent, () => {
    // 1. Initialize the custom planet entity
    const grayPlanet = new Planet("gray-planet", Planets.sun, 1.2);
    
    // 2. Visual descriptors and localization
    grayPlanet.localizedName = "Gray Planet";
    grayPlanet.description = "A cold, mist-shrouded gray planet with sand banks, stone peaks, and full access to Erekir logistics.";
    grayPlanet.alwaysUnlocked = true;
    grayPlanet.accessible = true;
    grayPlanet.visible = true;

    // 3. Color palettes (Gray shades)
    grayPlanet.sphereColor = Color.valueOf("4f4f4f");
    grayPlanet.iconColor = Color.valueOf("6b6b6b");
    grayPlanet.clearSectorOnLoss = true;

    // 4. Atmosphere and Day/Night configuration
    grayPlanet.hasAtmosphere = true;
    grayPlanet.atmosphereColor = Color.valueOf("8c8c8c");
    grayPlanet.updateLighting = true;
    grayPlanet.darkness = 0.85;

    // 5. Apply the official Erekir planet map generator & clamp sizes to 128x128
    grayPlanet.generator = new ErekirPlanetGenerator();
    grayPlanet.meshLoader = () => new HexMesh(grayPlanet, 4);

    // 6. Restrict gameplay tools and progression to Erekir tech trees
    grayPlanet.techTree = TechTree.all.find(t => t.node.content.name === "erekir");
    grayPlanet.allowLaunchToNumbered = true;
    grayPlanet.allowLaunchSchematics = false;

    // 7. Add rainy weather profiles
    grayPlanet.weather.add(new WeatherEntry(Weathers.rain, 3600, 7200, 0.35));

    // 8. Register your custom gray planet safely into the game's universe map
    grayPlanet.add();
});
