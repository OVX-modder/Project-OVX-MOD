
uniform float u_time;
varying vec3 v_pos;

float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float thinLine(float r, float center, float width){
    return 1.0 - smoothstep(width * 0.35, width, abs(r - center));
}

void main(){
    float r = length(v_pos.xy);
    float a = atan(v_pos.y, v_pos.x);
    float lines = 0.0;
    lines = max(lines, thinLine(r, 1.34, 0.018));
    lines = max(lines, thinLine(r, 1.48, 0.010));
    lines = max(lines, thinLine(r, 1.66, 0.014));
    lines = max(lines, thinLine(r, 1.79, 0.009));
    lines = max(lines, thinLine(r, 1.92, 0.012));
    lines = max(lines, thinLine(r, 2.08, 0.008));
    lines = max(lines, thinLine(r, 2.20, 0.014));
    lines = max(lines, thinLine(r, 2.34, 0.010));
    lines = max(lines, thinLine(r, 2.58, 0.015));
    lines = max(lines, thinLine(r, 2.76, 0.009));
    lines = max(lines, thinLine(r, 2.88, 0.012));
    lines = max(lines, thinLine(r, 3.08, 0.010));
    float grain = 0.35 + 0.65 * hash21(vec2(floor(a * 180.0), floor(r * 170.0)));
    float wave = 0.72 + 0.28 * sin(a * 37.0 + r * 31.0 - u_time * 0.8);
    float alpha = lines * grain * wave * 0.42;
    if(alpha < 0.025) discard;
    vec3 charcoal = vec3(0.28, 0.30, 0.31);
    vec3 warm = vec3(0.34, 0.23, 0.15);
    vec3 color = mix(charcoal, warm, 0.16 + 0.10 * sin(r * 10.0 + u_time * 0.15));
    float orange = thinLine(r, 1.36, 0.022);
    float violet = thinLine(r, 2.25, 0.020);
    vec3 accent = vec3(1.0, 0.30, 0.08) * orange
                + vec3(0.40, 0.32, 1.0) * violet
;
    float accentAmount = max(orange, violet) * 0.55;
    color = mix(color, accent, clamp(accentAmount, 0.0, 1.0));
    alpha = max(alpha, accentAmount * 0.55);
    gl_FragColor = vec4(color, alpha);
}
