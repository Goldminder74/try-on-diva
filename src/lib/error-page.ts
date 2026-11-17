export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#090706" />
    <style>
      body { font: 300 15px/1.6 Manrope, system-ui, -apple-system, sans-serif; background: #090706; color: #EADDC1; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 30rem; width: 100%; text-align: center; padding: 2rem; }
      .mark { font-family: "Bodoni Moda", "Bodoni 72", Didot, Georgia, serif; letter-spacing: 0.2em; text-transform: uppercase; font-size: 1.5rem; margin: 0 0 2.5rem; }
      h1 { font-family: "Bodoni Moda", "Bodoni 72", Didot, Georgia, serif; font-weight: 400; font-size: 2rem; margin: 0 0 0.75rem; }
      p { color: rgba(234, 221, 193, 0.7); margin: 0 0 2rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.9rem 1.6rem; font: 500 11px/1 Manrope, system-ui, sans-serif; letter-spacing: 0.3em; text-transform: uppercase; cursor: pointer; text-decoration: none; border: 1px solid transparent; border-radius: 0; }
      .primary { background: #5E1020; border-color: #5E1020; color: #EADDC1; }
      .secondary { background: transparent; color: #EADDC1; border-color: rgba(234, 221, 193, 0.4); }
    </style>
  </head>
  <body>
    <div class="card">
      <p class="mark">Wigsmi</p>
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
