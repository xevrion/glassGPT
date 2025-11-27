console.log("🔥 PRELOAD LOADED: If you see this, preload.js works.");

window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM Ready in preload");

  // Create draggable bar
  const bar = document.createElement("div");
  bar.id = "xevrion-drag-bar";
  document.body.appendChild(bar);

  // Inject CSS for drag bar
  const css = `
    #xevrion-drag-bar {
  position: fixed;
  top: 0;
  left: 190px;
  width: 315px; /* draggable only on left side */
  height: 45px;
  -webkit-app-region: drag;
  z-index: 999999;
  background: white; /* no visual overlay */
  pointer-events: auto;
}
  `;

  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);

  console.log("✅ Drag bar injected");
});
