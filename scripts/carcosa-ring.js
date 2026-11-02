
 // Carcosa asteroid belt with true per-rock randomized colors and halo rings.
 // JavaScript + Shaders
(function(){
    var PLANET_NAME = "ovx-project-mod-carcosa";
    var ROCK_VERT_PATH = "shaders/carcosa-ring.vert";
    var GLOW_VERT_PATH = "shaders/carcosa-ring-glow.vert";
    var ROCK_FRAG_PATH = "shaders/carcosa-ring.frag";
    var GLOW_FRAG_PATH = "shaders/carcosa-ring-glow.frag";

    var GenericMesh = Packages.mindustry.graphics.g3d.GenericMesh;
    var MultiMesh = Packages.mindustry.graphics.g3d.MultiMesh;
    var Mesh = Packages.arc.graphics.Mesh;
    var VertexAttribute = Packages.arc.graphics.VertexAttribute;
    var Shader = Packages.arc.graphics.gl.Shader;
    var Gl = Packages.arc.graphics.Gl;
    var Mat3D = Packages.arc.math.geom.Mat3D;
    var Vec3 = Packages.arc.math.geom.Vec3;
    var Time = Packages.arc.util.Time;

    function findShaderFiles(){
        var result = null;
        Vars.mods.list().each(function(mod){
            try{
                var rockVert = mod.root.child(ROCK_VERT_PATH);
                var glowVert = mod.root.child(GLOW_VERT_PATH);
                var rockFrag = mod.root.child(ROCK_FRAG_PATH);
                var glowFrag = mod.root.child(GLOW_FRAG_PATH);
                if(rockVert.exists() && glowVert.exists() && rockFrag.exists() && glowFrag.exists()){
                    result = {rockVert:rockVert, glowVert:glowVert, rockFrag:rockFrag, glowFrag:glowFrag};
                }
            }catch(e){}
        });
        return result;
    }

    function createMesh(values, colored){
        var floatsPerVertex = colored ? 6 : 3;
        var vertices = java.lang.reflect.Array.newInstance(java.lang.Float.TYPE, values.length);
        for(var i = 0; i < values.length; i++) vertices[i] = values[i];

        var mesh;
        if(colored){
            var colorAttribute = new VertexAttribute(3, "a_rockColor");
            mesh = new Mesh(true, values.length / floatsPerVertex, 0,
                VertexAttribute.position3, colorAttribute);
        }else{
            mesh = new Mesh(true, values.length / floatsPerVertex, 0,
                VertexAttribute.position3);
        }
        mesh.setVertices(vertices);
        return mesh;
    }

    function createRenderer(mesh, shader, additive, angularSpeed, depthWrite){
        angularSpeed = angularSpeed || 0;
        if(depthWrite === undefined) depthWrite = true;
        return new JavaAdapter(GenericMesh, {
            render: function(params, projection, transform){
                if(mesh.isDisposed() || shader.isDisposed()) return;
                var tilted = new Mat3D();
                tilted.set(transform);
                tilted.rotate(Vec3.X, 58);
                tilted.rotate(Vec3.Z, Time.time * angularSpeed);
                shader.bind();
                shader.setUniformMatrix4("u_proj", projection.val);
                shader.setUniformMatrix4("u_trans", tilted.val);
                try{ shader.setUniformf("u_time", Time.time / 60.0); }catch(e){}
                Gl.enable(Gl.blend);
                var gl = Packages.arc.Core.gl;
                if(!depthWrite) gl.glDepthMask(false);
                try{
                    if(additive){
                        Gl.blendFunc(Gl.srcAlpha, Gl.one);
                    }else{
                        Gl.blendFunc(Gl.srcAlpha, Gl.oneMinusSrcAlpha);
                    }
                    mesh.render(shader, Gl.triangles);
                }finally{
                    if(!depthWrite) gl.glDepthMask(true);
                    Gl.blendFunc(Gl.srcAlpha, Gl.oneMinusSrcAlpha);
                }
            },
            dispose: function(){
                if(!mesh.isDisposed()) mesh.dispose();
                if(!shader.isDisposed()) shader.dispose();
            }
        });
    }

    function makeRockBelt(shader){
        var innerRadius = 1.38;
        var outerRadius = 3.25;
        var zones = [
   // inner rock count
            {count: 840, r0: 1.36, r1: 2.08, s0: 0.010, s1: 0.034, h0: 0.009, h1: 0.034},
   // middle rock count
            {count: 480, r0: 1.82, r1: 2.78, s0: 0.026, s1: 0.073, h0: 0.020, h1: 0.073},
   // outer rock count
            {count: 180, r0: 2.45, r1: 3.25, s0: 0.060, s1: 0.145, h0: 0.050, h1: 0.135}
        ];
        var values = [];

        function tri(a,b,c,color){
            var ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2];
            var vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
            var nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
            var length=Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
            var lx=-0.48, ly=-0.36, lz=0.80;
            var lightLen=Math.sqrt(lx*lx+ly*ly+lz*lz);
            var ndotl=(nx*lx+ny*ly+nz*lz)/(length*lightLen);
            var diffuse=Math.max(0,Math.abs(ndotl));
            var faceVariation=0.78+Math.random()*0.28;
            var shade=(0.38+0.62*diffuse)*faceVariation;
            var r=Math.min(1,color[0]*shade), g=Math.min(1,color[1]*shade), bl=Math.min(1,color[2]*shade);
            var points = [a,b,c];
            for(var p=0;p<3;p++){
                values.push(points[p][0], points[p][1], points[p][2], r, g, bl);
            }
        }
        function triBoth(a,b,c,color){ tri(a,b,c,color); tri(c,b,a,color); }

        function makeRock(cx,cy,size,height,color){
            var sides = 6 + Math.floor(Math.random()*3); // 6-8 vertices for more natural fractured boulders
            var phase = Math.random()*Math.PI*2;
            var layers = [[],[],[],[]];
            var layerZ = [0.010, height*(0.22+Math.random()*0.10), height*(0.52+Math.random()*0.18), height*(0.76+Math.random()*0.16)];
            var layerRadius = [0.62+Math.random()*0.16, 0.88+Math.random()*0.20, 0.58+Math.random()*0.22, 0.30+Math.random()*0.22];
            var driftX = (Math.random()-0.5)*size*0.95;
            var driftY = (Math.random()-0.5)*size*0.95;

            for(var layer=0; layer<4; layer++){
                for(var i=0; i<sides; i++){
                    var angle = phase + Math.PI*2*i/sides + (Math.random()-0.5)*0.28 + layer*0.09;
                    var radial = layerRadius[layer]*(0.56+Math.random()*0.88);
                    var localX = Math.cos(angle)*size*radial;
                    var localY = Math.sin(angle)*size*radial;
                    var shift = layer/3;
                    var z = layerZ[layer] + (Math.random()-0.5)*height*(layer===0 ? 0.06 : 0.16);
                    layers[layer].push([cx+localX+driftX*shift, cy+localY+driftY*shift, Math.max(0.008,z)]);
                }
            }

            var crownCenter=[cx+driftX*1.12+(Math.random()-0.5)*size*0.35,
                             cy+driftY*1.12+(Math.random()-0.5)*size*0.35,
                             height*(0.90+Math.random()*0.10)];
            var bottomCenter=[cx,cy,0.012];

            for(var j=0;j<sides;j++){
                var next=(j+1)%sides;
                var colorA = color;
                if(j%2===0){
                    triBoth(layers[0][j], layers[0][next], layers[1][next], colorA);
                    triBoth(layers[0][j], layers[1][next], layers[1][j], colorA);
                }else{
                    triBoth(layers[0][j], layers[0][next], layers[1][j], colorA);
                    triBoth(layers[0][next], layers[1][next], layers[1][j], colorA);
                }
                triBoth(layers[1][j], layers[1][next], layers[2][next], colorA);
                triBoth(layers[1][j], layers[2][next], layers[2][j], colorA);
                triBoth(layers[2][j], layers[2][next], layers[3][next], colorA);
                triBoth(layers[2][j], layers[3][next], layers[3][j], colorA);
                triBoth(layers[3][j], layers[3][next], crownCenter, colorA);
                triBoth(bottomCenter, layers[0][next], layers[0][j], colorA);
            }
        }

      // rock color, add any new color here ig.
        var palette=[
            [0x46/255,0x46/255,0x46/255], // #464646
            [0x59/255,0x59/255,0x59/255], // #595959
            [0x3A/255,0x3A/255,0x3A/255], // #3A3A3A
            [0x2E/255,0x2E/255,0x2E/255], // #2E2E2E
            [0x65/255,0x64/255,0x65/255], // #656465
            [0x61/255,0x61/255,0x61/255]  // #616161
        ];

        for(var zoneIndex=0; zoneIndex<zones.length; zoneIndex++){
            var zone=zones[zoneIndex];
            for(var n=0; n<zone.count; n++){
                var angle=Math.random()*Math.PI*2;
                var radius=zone.r0+Math.random()*(zone.r1-zone.r0);
                var x=Math.cos(angle)*radius;
                var y=Math.sin(angle)*radius;
                var size=zone.s0+Math.pow(Math.random(),1.35)*(zone.s1-zone.s0);
                var height=zone.h0+Math.pow(Math.random(),1.25)*(zone.h1-zone.h0);
                var chosen=palette[Math.floor(Math.random()*palette.length)];
                makeRock(x,y,size,height,[chosen[0],chosen[1],chosen[2]]);
            }
        }
       // you guess what this does by now
        var dustCount = 9999;
        for(var d=0; d<dustCount; d++){
            var da = Math.random()*Math.PI*2;
            var bandPick = Math.random();
            var dr = bandPick < 0.58 ? 1.42 + Math.random()*1.05 :
                     bandPick < 0.90 ? 2.10 + Math.random()*0.88 :
                                       2.70 + Math.random()*0.55;
            var dx=Math.cos(da)*dr, dy=Math.sin(da)*dr;
            var ds=0.0012+Math.pow(Math.random(),2.0)*0.0065;
            var dz=0.018+Math.random()*0.025;
            var skew=(Math.random()-0.5)*ds*1.8;
            var dustColor;
            if(Math.random()<0.10){
                dustColor=[0.30,0.23,0.17];
            }else{
                var shade=0.10+Math.random()*0.20;
                dustColor=[shade,shade*0.96,shade*0.90];
            }
            var p0=[dx-ds,dy+skew,dz];
            var p1=[dx+ds*(0.65+Math.random()*0.7),dy-ds*0.45,dz];
            var p2=[dx+skew,dy+ds*(0.55+Math.random()*0.8),dz];
            triBoth(p0,p1,p2,dustColor);
        }
        return createRenderer(createMesh(values,true),shader,false,0.055);
    }

    function makeGlowRings(shader){
        var values=[];
        var segments=384;
        var bands=[[1.30,1.82],[1.88,2.24],[2.30,2.78]];
        var z=0.012;
        function tri(a,b,c){ values.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]); }
        function triBoth(a,b,c){ tri(a,b,c); tri(c,b,a); }
        for(var ring=0;ring<bands.length;ring++){
            var inner=bands[ring][0], outer=bands[ring][1];
            for(var s=0;s<segments;s++){
                var a0=Math.PI*2*s/segments, a1=Math.PI*2*(s+1)/segments;
                var i0=[Math.cos(a0)*inner,Math.sin(a0)*inner,z];
                var o0=[Math.cos(a0)*outer,Math.sin(a0)*outer,z];
                var i1=[Math.cos(a1)*inner,Math.sin(a1)*inner,z];
                var o1=[Math.cos(a1)*outer,Math.sin(a1)*outer,z];
                triBoth(i0,o0,o1); triBoth(i0,o1,i1);
            }
        }
        return createRenderer(createMesh(values,false),shader,false,-0.012,false);
    }

    Events.on(ContentInitEvent,function(){
        var planet=Vars.content.planet(PLANET_NAME);
        if(!planet){ print("[Carcosa Rocks] Planet not found: "+PLANET_NAME); return; }
        var oldLoader=planet.cloudMeshLoader;
        var files=findShaderFiles();
        if(!files){
            print("[Carcosa Rocks] Missing shader files: rock vert/frag and glow vert/frag.");
            return;
        }
        planet.cloudMeshLoader=new JavaAdapter(Packages.arc.func.Prov,{
            get:function(){
                var oldClouds=null;
                try{
                    oldClouds=oldLoader.get();
                    var rockShader=new Shader(files.rockVert,files.rockFrag);
                    var glowShader=new Shader(files.glowVert,files.glowFrag);
                    var rocks=makeRockBelt(rockShader);
                    var glow=makeGlowRings(glowShader);
                    if(oldClouds==null) return new MultiMesh(glow,rocks);
                    return new MultiMesh(oldClouds,glow,rocks);
                }catch(e){
                    print("[Carcosa Rocks] Initialization failed: "+e);
                    return oldClouds;
                }
            }
        });
        print ("[Carcosa Rocks] loaded and working");
    });
})();
