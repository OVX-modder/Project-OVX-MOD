varying vec3 v_pos;
varying vec3 v_rockColor;
void main(){
    float heightShade = clamp(v_pos.z / 0.20, 0.0, 1.0);
    float facetShade = 0.78 + heightShade * 0.28;
    vec3 color = v_rockColor * facetShade;
    gl_FragColor = vec4(color, 1.0);
}
