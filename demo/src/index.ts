import { run } from './_index-or-default';
(async () => {
  const app = document.getElementById('app');
  const content = await run();
  if (!app) throw new Error('Entrypoint not found');
  app.innerHTML = content;
})();
