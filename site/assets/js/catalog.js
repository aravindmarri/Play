// The publishing script generates this catalog from games/*/game.json.
const grid = document.querySelector('#game-grid');
const status = document.querySelector('#library-status');
const search = document.querySelector('#game-search');

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function card(game) {
  const article = element('article', 'library-card', '');
  article.append(element('p', 'tag', game.genre), element('h3', '', game.title),
    element('p', 'subtitle', game.subtitle), element('p', 'description', game.description));
  const link = element('a', 'play-button', 'PLAY GAME →');
  link.href = game.url;
  link.setAttribute('aria-label', `Play ${game.title}`);
  article.append(link);
  return article;
}

try {
  const response = await fetch('./games.json');
  if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
  const games = await response.json();
  document.querySelector('#game-count').textContent = String(games.length).padStart(2, '0');
  document.querySelector('#game-count-label').textContent = `${games.length === 1 ? 'GAME' : 'GAMES'} AND COUNTING`;
  let shown = [];
  let limit = 24;
  const more = element('button', 'load-more', 'SHOW MORE GAMES');
  more.type = 'button';
  grid.after(more);
  function render() {
    grid.replaceChildren(...shown.slice(0, limit).map(card));
    status.textContent = shown.length ? `${shown.length} ${shown.length === 1 ? 'game' : 'games'} to explore` : 'No games match your search.';
    more.hidden = shown.length <= limit;
  }
  function filter() {
    const query = search.value.trim().toLocaleLowerCase();
    shown = games.filter(game => `${game.title} ${game.genre} ${game.subtitle}`.toLocaleLowerCase().includes(query));
    limit = 24;
    render();
  }
  search.addEventListener('input', filter);
  more.addEventListener('click', () => { limit += 24; render(); });
  filter();
} catch (error) {
  console.error(error);
  status.textContent = 'The collection could not load. You can still play the featured game above.';
  search.disabled = true;
}
