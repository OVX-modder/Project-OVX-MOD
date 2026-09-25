Events.on(EventType.ClientLoadEvent, e => {
    Vars.content.blocks().each(b => {
        if (b && b.name && (b.name.includes("power-conveyor-belt") || b.name.includes("a-p-c-b"))) {
            b.buildType = () => extend(Conveyor.ConveyorBuild, b, {
                drawStatus() {
                }
            });
        }
    });
});
