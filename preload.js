console.log("🔥 PRELOAD LOADED: WebGL Liquid Glass Edition");

// Load shader helper
async function loadShader(path) {
  const fs = require('fs');
  const pathModule = require('path');
  const fullPath = pathModule.join(__dirname, path);
  return fs.readFileSync(fullPath, 'utf8');
}

window.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ DOM Ready - Initializing WebGL Liquid Glass");

  // ============================================================================
  // STEP 1: REMOVE CHATGPT BACKGROUNDS + CREATE DRAG BAR
  // ============================================================================
  const css = `
    /* Remove all ChatGPT backgrounds */
    body, html, #__next, main, div, nav, aside {
      background: transparent !important;
      background-color: transparent !important;
    }

    #xevrion-drag-bar {
      position: fixed;
      top: 0;
      left: 190px;
      width: 315px;
      height: 45px;
      -webkit-app-region: drag;
      z-index: 999999;
      background: transparent;
      pointer-events: auto;
    }

    .glass-canvas {
      position: fixed;
      pointer-events: none;
    }

    /* Keep text readable */
    * {
      color: white !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;
    }
  `;

  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);

  const dragBar = document.createElement("div");
  dragBar.id = "xevrion-drag-bar";
  document.body.appendChild(dragBar);

  // ============================================================================
  // STEP 2: CREATE SINGLE FULLSCREEN GLASS CANVAS
  // ============================================================================
  const canvas = document.createElement("canvas");
  canvas.className = "glass-canvas";
  canvas.style.cssText = `top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1;`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);

  // ============================================================================
  // STEP 3: LOAD SHADERS
  // ============================================================================
  console.log("📦 Loading shaders...");
  const vertexShader = await loadShader('liquid-glass/shaders/vertex.glsl');
  const fragmentBg = await loadShader('liquid-glass/shaders/fragment-bg.glsl');
  const fragmentHBlur = await loadShader('liquid-glass/shaders/fragment-bg-hblur.glsl');
  const fragmentVBlur = await loadShader('liquid-glass/shaders/fragment-bg-vblur.glsl');
  const fragmentMain = await loadShader('liquid-glass/shaders/fragment-main.glsl');
  console.log("✅ Shaders loaded");

  // ============================================================================
  // STEP 4: WEBGL SETUP WITH PROPER UNIFORM HANDLING
  // ============================================================================

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  });

  if (!gl) {
    console.error("❌ WebGL2 not supported");
    return;
  }

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function createProgram(vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  const bgProgram = createProgram(vertexShader, fragmentBg);
  const vBlurProgram = createProgram(vertexShader, fragmentVBlur);
  const hBlurProgram = createProgram(vertexShader, fragmentHBlur);
  const mainProgram = createProgram(vertexShader, fragmentMain);

  // Quad buffer
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  // Framebuffers
  function createFramebuffer(w, h) {
    const fb = gl.createFramebuffer();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex };
  }

  const bgPass = createFramebuffer(canvas.width, canvas.height);
  const vBlurPass = createFramebuffer(canvas.width, canvas.height);
  const hBlurPass = createFramebuffer(canvas.width, canvas.height);

  // Blur weights
  function calcBlurWeights(radius) {
    const sigma = radius / 3;
    const weights = [];
    let sum = 0;
    for (let i = 0; i <= radius; i++) {
      const w = Math.exp(-(i*i)/(2*sigma*sigma));
      weights.push(w);
      sum += i === 0 ? w : 2*w;
    }
    for (let i = 0; i <= radius; i++) weights[i] /= sum;
    while (weights.length < 201) weights.push(0);
    return weights;
  }

  const blurWeights = calcBlurWeights(50);

  // FIXED: Proper uniform setter that handles int vs float correctly
  function setUniforms(program, uniforms) {
    const intUniforms = ['u_bgType', 'u_bgTextureReady', 'u_showShape1', 'u_blurRadius', 'STEP'];

    for (const [name, value] of Object.entries(uniforms)) {
      const loc = gl.getUniformLocation(program, name);
      if (!loc) continue;

      if (typeof value === 'number') {
        if (intUniforms.includes(name)) {
          gl.uniform1i(loc, Math.floor(value));
        } else {
          gl.uniform1f(loc, value);
        }
      } else if (Array.isArray(value)) {
        if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
        else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
        else if (value.length === 4) gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
        else if (value.length > 4) gl.uniform1fv(loc, value);
      }
    }
  }

  function renderPass(program, uniforms, textures, targetFb) {
    gl.useProgram(program);

    // CRITICAL: Unbind framebuffer first to prevent feedback loops
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Unbind all texture units first
    for (let i = 0; i < 8; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Now bind our input textures
    let unit = 0;
    for (const [name, tex] of Object.entries(textures || {})) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform1i(loc, unit);
      unit++;
    }

    setUniforms(program, uniforms);

    // Now bind the target framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFb);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Unbind everything after drawing
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ============================================================================
  // STEP 5: ANIMATION LOOP
  // ============================================================================

  let mouseX = canvas.width / 2;
  let mouseY = canvas.height / 2;
  let mouseSpringX = canvas.width / 2;
  let mouseSpringY = canvas.height / 2;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX * dpr;
    mouseY = e.clientY * dpr;
  });

  const commonUniforms = {
    u_resolution: [canvas.width, canvas.height],
    u_dpr: dpr,
    u_mouse: [0, 0],
    u_mergeRate: 0.0,
    u_shapeWidth: canvas.width / dpr,
    u_shapeHeight: canvas.height / dpr,
    u_shapeRadius: 0,
    u_shapeRoundness: 2.0,
    u_bgType: 2,  // Gradient background
    u_bgTextureReady: 0,
    u_showShape1: 0,
    u_shadowExpand: 60,
    u_shadowFactor: 0.2,
    u_shadowPosition: [0, 0],
    u_blurRadius: 50,
    u_blurWeights: blurWeights,
    u_tint: [0.55, 0.75, 1.0, 0.25],  // Soft blue tint
    u_refThickness: 110,
    u_refFactor: 1.09,
    u_refDispersion: 0.9,
    u_refFresnelRange: 320,
    u_refFresnelFactor: 0.55,
    u_refFresnelHardness: -0.82,
    u_glareRange: 220,
    u_glareConvergence: 0.65,
    u_glareOppositeFactor: 0.65,
    u_glareFactor: 0.75,
    u_glareHardness: -0.68,
    u_glareAngle: 0.7,
    STEP: 9
  };

  function animate() {
    mouseSpringX += (mouseX - mouseSpringX) * 0.05;
    mouseSpringY += (mouseY - mouseSpringY) * 0.05;

    const uniforms = {
      ...commonUniforms,
      u_mouseSpring: [mouseSpringX, canvas.height - mouseSpringY]
    };

    renderPass(bgProgram, uniforms, {}, bgPass.fb);
    renderPass(vBlurProgram, uniforms, { u_prevPassTexture: bgPass.tex }, vBlurPass.fb);
    renderPass(hBlurProgram, uniforms, { u_prevPassTexture: vBlurPass.tex }, hBlurPass.fb);
    renderPass(mainProgram, uniforms, { u_bg: bgPass.tex, u_blurredBg: hBlurPass.tex }, null);

    requestAnimationFrame(animate);
  }

  animate();
  console.log("✅ Liquid Glass WebGL initialized successfully!");
  console.log("🌊 Real WebGL liquid glass with refraction, dispersion, and glare");
});
