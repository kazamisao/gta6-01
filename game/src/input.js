// Keyboard + mouse input. One object the game loop polls each frame; also exposes
// edge-triggered "pressed" keys so E / F / Enter fire once per keypress.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let anyKey = false;

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
    if (!keys.has(e.key.toLowerCase())) pressed.add(e.key.toLowerCase());
    keys.add(e.key.toLowerCase());
    anyKey = true;
  }
  function onKeyUp(e) { keys.delete(e.key.toLowerCase()); }
  function onMouseMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; }
  function onMouseDown(e) { mouse.down = true; mouse.clicked = true; anyKey = true; }
  function onMouseUp() { mouse.down = false; }

  return {
    keys, mouse,
    get anyKey() { return anyKey; },
    down(...names) { return names.some((n) => keys.has(n)); },
    wasPressed(name) { return pressed.has(name); },
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return { x, y };
    },
    endFrame() { pressed.clear(); mouse.clicked = false; anyKey = false; },
    attach() {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
