const steam = new Liquid("steam");
steam.gas = true;
steam.coolant = true;
steam.vaporEffect = Fx.vapor;
steam.color = Color.valueOf("cccccc");
steam.gasColor = Color.valueOf("e6e6e6");
steam.name = "Steam";
steam.localizedName = "Steam";
steam.barColor: Color.valueOf("cccccc"),
steam.temperature: 0.8,
steam.viscosity: 0.1,
steam.effect: StatusEffects.corroded,
steam.description = "It is steam, and comes from heated water.";
