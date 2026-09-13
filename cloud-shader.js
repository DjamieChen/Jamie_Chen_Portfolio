/* ========================================
   Cloud Shader — WebGL Procedural Clouds
   Ported from Aceternity UI cloud-shader
   ======================================== */

const CloudShader = {
  _canvas: null,
  _gl: null,
  _program: null,
  _frame: 0,
  _running: false,
  _startTime: 0,
  
  // Default params
  speed: 1,
  count: 6,
  cloudColor: [0.984, 0.973, 0.949],    // #fbf8f2
  skyTopColor: [0.220, 0.463, 0.729],    // #3876ba
  skyBottomColor: [0.549, 0.749, 0.910], // #8cbfe8
  
  VERT: `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`,

  FRAG: `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_res;
uniform float u_time;
uniform float u_count;
uniform vec3 u_cloud;
uniform vec3 u_skyTop;
uniform vec3 u_skyBottom;

const mat2 R = mat2(0.80, 0.60, -0.60, 0.80);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 26737.367);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * vnoise(p);
    p = R * p * 2.03 + 19.19;
    amp *= 0.5;
  }
  return sum;
}

float billow(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * (1.0 - abs(2.0 * vnoise(p) - 1.0));
    p = R * p * 2.11 + 13.37;
    amp *= 0.5;
  }
  return sum;
}

float cloudDensity(vec2 p, vec2 c, vec2 r, float seed, float t) {
  vec2 q = p - c;
  float ry = q.y > 0.0 ? r.y : r.y * 0.45;
  float env = 1.0 - length(vec2(q.x / r.x, q.y / ry));
  if (env < -0.3) return 0.0;
  vec2 dp = q * (2.4 / r.x) + seed;
  dp += 0.5 * vec2(
    fbm(dp * 1.3 + t * 0.04),
    fbm(dp * 1.3 + 7.7 - t * 0.03)
  );
  float detail = billow(dp * 1.5);
  return env + (detail - 0.6) * 0.6;
}

vec3 shadeCloud(vec3 color, vec3 sky, vec2 p, vec2 c, vec2 r, float seed, float t, float dist) {
  float d = cloudDensity(p, c, r, seed, t);
  if (d < 0.02) return color;
  float dUp = cloudDensity(p + vec2(0.0, r.y * 0.5), c, r, seed, t);
  float occl = clamp((dUp - d) * 1.1 + d * 0.55, 0.0, 1.0);
  vec3 lit = u_cloud * 1.04;
  vec3 shadow = mix(u_cloud * 0.60, sky, 0.38);
  vec3 cloudCol = mix(lit, shadow, occl * 0.85);
  float alpha = smoothstep(0.02, 0.36, d);
  float rim = smoothstep(0.02, 0.14, d) * (1.0 - smoothstep(0.14, 0.40, d));
  cloudCol += rim * 0.10;
  cloudCol = mix(cloudCol, sky, dist * 0.35);
  alpha *= mix(1.0, 0.8, dist);
  return mix(color, cloudCol, alpha);
}

vec3 cloudPass(vec3 color, vec3 sky, vec2 p, float aspect, float t,
               float spd, float phase, float y, vec2 r, float seed, float dist) {
  float cx = mix(-r.x - 0.25, aspect + r.x + 0.25, fract(t * spd + phase));
  float cy = y + sin(t * 0.05 + phase * 6.2831) * 0.012;
  return shadeCloud(color, sky, p, vec2(cx, cy), r, seed, t, dist);
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  float t = u_time;

  vec3 sky = mix(u_skyBottom, u_skyTop, v_uv.y);
  vec3 color = sky;

  color = mix(color, u_skyBottom * 1.06, smoothstep(0.35, 0.0, v_uv.y) * 0.5);

  vec2 sunPos = vec2(aspect * 0.78, 0.92);
  float sunDist = length(p - sunPos);
  color += vec3(1.0, 0.95, 0.82) * exp(-sunDist * sunDist * 5.0) * 0.28;

  // Cloud layers (optimized passes)
  color = cloudPass(color, sky, p, aspect, t, 0.008, 0.62, 0.73, vec2(0.26, 0.13), 71.3, 0.85);
  color = cloudPass(color, sky, p, aspect, t, 0.012, 0.33, 0.58, vec2(0.36, 0.17), 17.3, 0.55);
  color = cloudPass(color, sky, p, aspect, t, 0.016, 0.05, 0.36, vec2(0.48, 0.22), 91.1, 0.25);
  color = cloudPass(color, sky, p, aspect, t, 0.020, 0.48, 0.20, vec2(0.58, 0.25), 57.2, 0.0);

  gl_FragColor = vec4(color, 1.0);
}
`,
  
  /**
   * Compile a WebGL shader.
   */
  _compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  },
  
  /**
   * Initialize the cloud shader on a canvas element.
   * @param {HTMLCanvasElement} canvas
   */
  init(canvas) {
    this._canvas = canvas;
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) { console.error('WebGL not supported'); return; }
    this._gl = gl;
    
    const vert = this._compile(gl, gl.VERTEX_SHADER, this.VERT);
    const frag = this._compile(gl, gl.FRAGMENT_SHADER, this.FRAG);
    if (!vert || !frag) return;
    
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.bindAttribLocation(program, 0, 'a_pos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error');
      return;
    }
    gl.useProgram(program);
    this._program = program;
    
    // Full-screen triangle
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    
    // Uniform locations
    this._loc = {
      res: gl.getUniformLocation(program, 'u_res'),
      time: gl.getUniformLocation(program, 'u_time'),
      count: gl.getUniformLocation(program, 'u_count'),
      cloud: gl.getUniformLocation(program, 'u_cloud'),
      skyTop: gl.getUniformLocation(program, 'u_skyTop'),
      skyBottom: gl.getUniformLocation(program, 'u_skyBottom'),
    };
    
    this._resize();
    window.addEventListener('resize', () => this._resize());
    
    this._startTime = performance.now();
    this._running = true;
    this._draw();
  },
  
  _lastDrawTime: 0,
  
  _resize() {
    if (!this._canvas || !this._gl || !this._program) return;
    const clientW = this._canvas.clientWidth || window.innerWidth || 800;
    const clientH = this._canvas.clientHeight || window.innerHeight || 600;
    // Scale down internal buffer resolution (clouds look softer and billowy, runs ~10x lighter on GPU)
    const scale = Math.min(0.5, 720 / Math.max(clientW, clientH));
    const w = Math.max(1, Math.floor(clientW * scale));
    const h = Math.max(1, Math.floor(clientH * scale));
    if (this._canvas.width !== w || this._canvas.height !== h) {
      this._canvas.width = w;
      this._canvas.height = h;
    }
    this._gl.viewport(0, 0, w, h);
    this._gl.useProgram(this._program);
    if (this._loc && this._loc.res) {
      this._gl.uniform2f(this._loc.res, w, h);
    }
  },
  
  _draw() {
    if (!this._running || !this._gl || !this._program) return;
    
    this._frame = requestAnimationFrame(() => this._draw());
    
    const now = performance.now();
    // Cap at ~30 FPS for buttery smooth clouds with minimal CPU/GPU usage
    if (now - this._lastDrawTime < 33) {
      return;
    }
    this._lastDrawTime = now;
    
    const gl = this._gl;
    const elapsed = ((now - this._startTime) / 1000) * this.speed;
    
    gl.useProgram(this._program);
    gl.uniform1f(this._loc.time, elapsed);
    gl.uniform1f(this._loc.count, Math.min(6, Math.max(1, this.count)));
    gl.uniform3f(this._loc.cloud, ...this.cloudColor);
    gl.uniform3f(this._loc.skyTop, ...this.skyTopColor);
    gl.uniform3f(this._loc.skyBottom, ...this.skyBottomColor);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },
  
  stop() {
    this._running = false;
    cancelAnimationFrame(this._frame);
  }
};

window.CloudShader = CloudShader;
