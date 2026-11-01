attribute vec3 a_position;
attribute vec3 a_rockColor;
uniform mat4 u_proj;
uniform mat4 u_trans;
varying vec3 v_pos;
varying vec3 v_rockColor;
void main(){
    v_pos = a_position;
    v_rockColor = a_rockColor;
    gl_Position = u_proj * u_trans * vec4(a_position, 1.0);
}
