// WebGL2 Multi-Pass Renderer for Liquid Glass Effect
// Converted from TypeScript GLUtils to vanilla JavaScript

class ShaderProgram {
  constructor(gl, vertexSource, fragmentSource) {
    this.gl = gl;
    this.program = this.createProgram(vertexSource, fragmentSource);
    this.uniforms = {};
    this.attributes = {};
    this.discoverUniforms();
    this.discoverAttributes();
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(vertexSource, fragmentSource) {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  discoverUniforms() {
    const count = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = this.gl.getActiveUniform(this.program, i);
      this.uniforms[info.name] = this.gl.getUniformLocation(this.program, info.name);
    }
  }

  discoverAttributes() {
    const count = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < count; i++) {
      const info = this.gl.getActiveAttrib(this.program, i);
      this.attributes[info.name] = this.gl.getAttribLocation(this.program, info.name);
    }
  }

  use() {
    this.gl.useProgram(this.program);
  }

  setUniform(name, value) {
    const location = this.uniforms[name];
    if (location === undefined) return;

    if (typeof value === 'number') {
      this.gl.uniform1f(location, value);
    } else if (Array.isArray(value)) {
      if (value.length === 2) {
        this.gl.uniform2f(location, value[0], value[1]);
      } else if (value.length === 3) {
        this.gl.uniform3f(location, value[0], value[1], value[2]);
      } else if (value.length === 4) {
        this.gl.uniform4f(location, value[0], value[1], value[2], value[3]);
      }
    }
  }

  setUniformInt(name, value) {
    const location = this.uniforms[name];
    if (location !== undefined) {
      this.gl.uniform1i(location, value);
    }
  }

  setUniformFloatArray(name, value) {
    const location = this.uniforms[name];
    if (location !== undefined) {
      this.gl.uniform1fv(location, value);
    }
  }

  dispose() {
    this.gl.deleteProgram(this.program);
  }
}

class FrameBuffer {
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.framebuffer = gl.createFramebuffer();
    this.texture = this.createTexture();
  }

  createTexture() {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    return texture;
  }

  bind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, this.width, this.height);
  }

  unbind() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.gl.deleteTexture(this.texture);
    this.texture = this.createTexture();
  }

  dispose() {
    this.gl.deleteFramebuffer(this.framebuffer);
    this.gl.deleteTexture(this.texture);
  }
}

class RenderPass {
  constructor(gl, name, vertexShader, fragmentShader, outputToScreen = false) {
    this.gl = gl;
    this.name = name;
    this.program = new ShaderProgram(gl, vertexShader, fragmentShader);
    this.framebuffer = outputToScreen ? null : new FrameBuffer(gl, gl.canvas.width, gl.canvas.height);
    this.outputToScreen = outputToScreen;
  }

  render(inputs = {}, uniforms = {}) {
    this.program.use();

    // Bind input textures
    let textureUnit = 0;
    for (const [uniformName, texture] of Object.entries(inputs)) {
      this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.program.setUniformInt(uniformName, textureUnit);
      textureUnit++;
    }

    // Set uniforms
    for (const [name, value] of Object.entries(uniforms)) {
      if (Array.isArray(value) && value.length > 4) {
        this.program.setUniformFloatArray(name, value);
      } else if (Number.isInteger(value)) {
        this.program.setUniformInt(name, value);
      } else {
        this.program.setUniform(name, value);
      }
    }

    // Bind output
    if (this.outputToScreen) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    } else {
      this.framebuffer.bind();
    }

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width, height) {
    if (this.framebuffer) {
      this.framebuffer.resize(width, height);
    }
  }

  dispose() {
    this.program.dispose();
    if (this.framebuffer) {
      this.framebuffer.dispose();
    }
  }
}

class MultiPassRenderer {
  constructor(canvas, vertexShader, shaders) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });

    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }

    this.passes = {};
    this.globalUniforms = {};

    // Setup quad buffer
    this.setupQuadBuffer();

    // Create render passes
    this.createPasses(vertexShader, shaders);
  }

  setupQuadBuffer() {
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
  }

  createPasses(vertexShader, shaders) {
    this.passes.bg = new RenderPass(this.gl, 'bg', vertexShader, shaders.bg, false);
    this.passes.vBlur = new RenderPass(this.gl, 'vBlur', vertexShader, shaders.vBlur, false);
    this.passes.hBlur = new RenderPass(this.gl, 'hBlur', vertexShader, shaders.hBlur, false);
    this.passes.main = new RenderPass(this.gl, 'main', vertexShader, shaders.main, true);
  }

  setGlobalUniform(name, value) {
    this.globalUniforms[name] = value;
  }

  render() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Enable vertex attribute
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

    // Pass 1: Background
    this.passes.bg.render({}, this.globalUniforms);

    // Pass 2: Vertical Blur
    this.passes.vBlur.render(
      { u_prevPassTexture: this.passes.bg.framebuffer.texture },
      this.globalUniforms
    );

    // Pass 3: Horizontal Blur
    this.passes.hBlur.render(
      { u_prevPassTexture: this.passes.vBlur.framebuffer.texture },
      this.globalUniforms
    );

    // Pass 4: Main (to screen)
    this.passes.main.render(
      {
        u_bg: this.passes.bg.framebuffer.texture,
        u_blurredBg: this.passes.hBlur.framebuffer.texture
      },
      this.globalUniforms
    );
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    Object.values(this.passes).forEach(pass => pass.resize(width, height));
  }

  dispose() {
    Object.values(this.passes).forEach(pass => pass.dispose());
  }
}

// Utility: Gaussian blur weights
function calculateBlurWeights(radius, sigma = null) {
  if (sigma === null) {
    sigma = radius / 3;
  }
  const weights = new Array(radius + 1);
  let sum = 0;
  for (let i = 0; i <= radius; i++) {
    const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
    weights[i] = weight;
    sum += i === 0 ? weight : 2 * weight;
  }
  for (let i = 0; i <= radius; i++) {
    weights[i] /= sum;
  }
  // Pad to 201 (MAX_BLUR_RADIUS + 1)
  while (weights.length < 201) {
    weights.push(0);
  }
  return weights;
}

// Export for use in preload
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MultiPassRenderer, calculateBlurWeights };
}
