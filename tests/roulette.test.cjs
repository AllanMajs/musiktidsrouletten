const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = new Map();
function element() {
  return { style: { setProperty() {} }, appendChild() {}, addEventListener() {},
    classList: { add() {}, remove() {} } };
}
const context = vm.createContext({
  document: {
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element,
  },
  window: { matchMedia: () => ({ matches: false }) }, console,
});
vm.runInContext(script, context);
const run = code => vm.runInContext(code, context);

test('catalog has 50 unique videos, valid IDs and original years in the correct decades', () => {
  assert.doesNotThrow(() => run('validateCatalog()'));
  assert.equal(run('Object.values(videoDatabase).flat().length'), 50);
  const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/video-metadata.json')));
  const songs = JSON.parse(run('JSON.stringify(Object.values(videoDatabase).flat())'));
  assert.deepEqual(songs.map(s => s.id).sort(), metadata.map(s => s.id).sort());
  for (const video of metadata) {
    const song = songs.find(song => song.id === video.id);
    assert.equal(song.title, video.title);
    assert.equal(song.year, video.year);
    assert.ok(video.youtubeTitle && video.author, video.id);
    assert.equal(video.url, `https://www.youtube.com/watch?v=${video.id}`);
  }
});

test('known mislabelled videos and misplaced decades stay fixed', () => {
  const songs = JSON.parse(run('JSON.stringify(videoDatabase)'));
  function find(fragment) {
    return Object.entries(songs).flatMap(([decade, videos]) => videos.map(v => ({ ...v, decade })))
      .find(v => v.title.includes(fragment));
  }
  assert.equal(find('Waterloo').id, 'Sj_9CiNkkn4');
  assert.equal(find('Africa').id, 'FTQbiNvZqaY');
  assert.equal(find('Hey Ya!').id, 'PWgvGjAhvIw');
  assert.equal(find('Bohemian Rhapsody').decade, "70'erne");
  assert.equal(find('Space Oddity').decade, "60'erne");
  assert.equal(find('Billie Jean').decade, "80'erne");
  assert.equal(find('The Final Countdown').decade, "80'erne");
});

test('pointer agrees with every segment over positive, negative and repeated turns', () => {
  // Independent oracle: rotate each sector into screen coordinates and see which contains 12 o'clock.
  for (let rotation = -3600; rotation <= 3600; rotation += 0.5) {
    const expected = [0, 1, 2, 3, 4].find(index => {
      const start = ((index * 72 + rotation) % 360 + 360) % 360;
      const distanceToPointer = (360 - start) % 360;
      return distanceToPointer < 72;
    });
    assert.equal(run(`getDecadeIndex(${rotation})`), expected, `rotation ${rotation}`);
  }
});

test('each boundary and its two sides use the clockwise half-open sector convention', () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(run(`getDecadeIndex(${-i * 72})`), i);
    assert.equal(run(`getDecadeIndex(${-i * 72 - .001})`), i);
    assert.equal(run(`getDecadeIndex(${-i * 72 + .001})`), (i + 4) % 5);
  }
});

test('catalog validation rejects malformed, duplicate and misplaced entries', () => {
  for (const mutation of ["video.id = 'bad'", 'video.year = 2017', "video.id = videoDatabase[\"60'erne\"][0].id"]) {
    assert.throws(() => run(`(() => {
      const video = videoDatabase["00'erne"][0];
      const backup = { ...video };
      try { ${mutation}; validateCatalog(); } finally { Object.assign(video, backup); }
    })()`));
  }
});
