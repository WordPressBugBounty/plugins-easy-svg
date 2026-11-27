// The media library and the code editor arrive as text (includes/panel.php) and run here, in order, the first time one is needed.
let running = null

export function runHeld() {
  if (running) {
    return running
  }
  running = (async () => {
    const box = document.createElement('template')
    box.innerHTML = [...document.querySelectorAll('script[data-easy-svg-held]')].map((el) => JSON.parse(el.textContent || '""')).join('')
    for (const old of box.content.querySelectorAll('script')) {
      const run = document.createElement('script')
      for (const { name, value } of [...old.attributes]) {
        run.setAttribute(name, value)
      }
      if (old.src) {
        await new Promise((done) => {
          run.async = false
          run.onload = done
          // A script that fails leaves the next ones to fail on their own: the caller falls back.
          run.onerror = done
          document.body.appendChild(run)
        })
      } else {
        run.textContent = old.textContent
        document.body.appendChild(run)
      }
    }
  })()
  return running
}
