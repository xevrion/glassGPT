# GlassGPT

A high-performance, aesthetically pleasing Electron wrapper for ChatGPT featuring real-time WebGL2 liquid glass effects. GlassGPT transforms the standard AI interface into a modern, transparent desktop experience with sophisticated refraction, chromatic dispersion, and multi-pass Gaussian blurring.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Electron](https://img.shields.io/badge/Electron-39.2.4-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![WebGL2](https://img.shields.io/badge/Graphics-WebGL2-red?logo=opengl)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)

## 🌟 Overview

GlassGPT is not just another browser wrapper. It utilizes a custom-built WebGL2 rendering pipeline injected via Electron's preload scripts to override the standard ChatGPT interface. By stripping away native CSS backgrounds and replacing them with a dynamic, shader-based "Liquid Glass" engine, it provides a premium desktop utility that feels integrated into your workspace.

### Key Value Propositions
*   **Immersive Aesthetics**: Real-time glass refraction and glare effects that react to movement.
*   **Desktop Integration**: Frameless, transparent window that stays out of your way while remaining accessible.
*   **Performance Optimized**: Multi-pass rendering pipeline ensures smooth 60 FPS animations even with complex blur kernels.

## ✨ Features

-   **Liquid Glass Engine**: A custom WebGL2 renderer providing realistic glass simulation.
-   **Multi-Pass Shader Pipeline**: 
    -   **Pass 1**: Dynamic background generation.
    -   **Pass 2 & 3**: Separable Gaussian Blur (Vertical & Horizontal) for high-performance depth-of-field.
    -   **Pass 4**: Composite shader handling refraction, dispersion, and Fresnel effects.
-   **Frameless UI**: A minimalist, borderless window with a custom-injected drag region for window management.
-   **Dynamic Theming**: Automatic CSS injection to convert ChatGPT elements to high-contrast, readable white text with soft shadows.
-   **Interactive Physics**: Mouse-responsive "spring" physics for glass highlights and glare.

## 🛠 Tech Stack

-   **Runtime**: [Electron](https://www.electronjs.org/)
-   **Graphics**: WebGL2 & GLSL (Custom Shaders)
-   **Language**: Vanilla JavaScript (ES6+)
-   **Backend**: Node.js (for file system shader loading)

## 🏗 Architecture

The project follows a standard Electron architecture with a heavy emphasis on the **Renderer/Preload** layer for graphics injection.

```text
├── main.js                 # Electron main process (Window & Lifecycle)
├── preload.js              # The "Engine" - Injects CSS and initializes WebGL
├── liquid-glass/           # Core Graphics Module
│   ├── gl-renderer.js      # WebGL2 Multi-Pass Framework
│   └── shaders/            # GLSL Shader Source Files
│       ├── vertex.glsl     # Standard Quad Vertex Shader
│       ├── fragment-bg.glsl# Background Generation
│       ├── fragment-main.glsl # Final Composite (Refraction/Glare)
│       └── fragment-bg-[h/v]blur.glsl # Gaussian Blur Passes
└── package.json            # Dependencies and Scripts
```

### The Rendering Pipeline
1.  **CSS Injection**: `preload.js` forces all ChatGPT containers to `background: transparent`.
2.  **Canvas Setup**: A full-screen `<canvas>` is injected behind the web content.
3.  **Shader Compilation**: Shaders are read from disk using `fs` and compiled into four distinct programs.
4.  **Frame Buffering**: The renderer uses `FrameBuffer` objects to pass textures between blur stages to minimize GPU overhead.

## 🚀 Getting Started

### Prerequisites
-   [Node.js](https://nodejs.org/) (v16.x or higher recommended)
-   [npm](https://www.npmjs.com/)

### Installation
1.  **Clone the repository**
    ```bash
    git clone https://github.com/xevrion/glassGPT.git
    cd glassGPT
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the application**
    ```bash
    npm start
    ```

## 📖 Usage

### Window Management
Since the window is frameless, a custom drag bar is injected at the top of the interface.
-   **Drag**: Click and hold the top area (near the center-left) to move the window.
-   **Interact**: Use ChatGPT as you normally would; the glass effect remains static in the background.

### Customizing Shaders
You can modify the glass appearance in `preload.js` by adjusting the `commonUniforms` object:
```javascript
const commonUniforms = {
  u_tint: [0.55, 0.75, 1.0, 0.25],  // Change glass color (RGBA)
  u_refFactor: 1.09,               // Adjust refraction intensity
  u_blurRadius: 50,                // Adjust background blur depth
  u_glareFactor: 0.75              // Adjust light reflection intensity
};
```

## 💻 Development

### Running Tests
Currently, the project uses manual verification. To debug shader issues:
1.  The DevTools window opens automatically on launch (`main.js`).
2.  Check the console for `[RENDERER]` prefixed logs.
3.  Shader compilation errors will be logged with full GLSL source context.

### Code Style
-   **GLSL**: Shaders are modularized into separate files for maintainability.
-   **WebGL**: The `MultiPassRenderer` class in `gl-renderer.js` abstracts the boilerplate of texture binding and framebuffer switching.

## 🚀 Deployment

To package the application for production:
```bash
# Install electron-builder if not present
npm install --save-dev electron-builder

# Build for your current OS
npx electron-builder
```

## 🛠 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **Black Background** | Ensure your GPU supports WebGL2. Check `chrome://gpu` in a standard browser. |
| **Cannot Move Window** | The drag region is defined in `preload.js` CSS. Ensure you are clicking the area defined by `#xevrion-drag-bar`. |
| **White Text Unreadable** | The app injects a `text-shadow` by default. If the background is too light, adjust `u_tint` in `preload.js`. |

## 📜 License

This project is licensed under the **ISC License**. See the `package.json` for details.

---

**Disclaimer**: *This project is an unofficial wrapper and is not affiliated with, authorized, maintained, sponsored, or endorsed by OpenAI.*