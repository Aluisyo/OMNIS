// Adds a focus-visible class to elements when focused via keyboard (Tab), not mouse
export function setupFocusVisible() {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      document.body.classList.add('focus-visible');
    }
  }
  function handleMouseDown() {
    document.body.classList.remove('focus-visible');
  }
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mousedown', handleMouseDown);
}

// Usage: Call setupFocusVisible() once in your app entry point (e.g., main.tsx) 