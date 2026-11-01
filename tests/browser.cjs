const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {}) });
  try {
    for (const width of [320, 375, 390, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // External playback is tested separately; deterministic UI tests do not depend on YouTube.
      await page.route('https://www.youtube.com/**', route => route.fulfill({ body: '<html>Player stub</html>', contentType: 'text/html' }));
      await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
      assert.equal(await page.locator('.wheel-label').count(), 5);
      const wheelBox = await page.locator('#wheel').boundingBox();
      const buttonBox = await page.locator('#spinBtn').boundingBox();
      assert.ok(Math.abs(wheelBox.x + wheelBox.width / 2 - buttonBox.x - buttonBox.width / 2) < 1);
      assert.ok(Math.abs(wheelBox.y + wheelBox.height / 2 - buttonBox.y - buttonBox.height / 2) < 1);
      assert.ok(buttonBox.width >= 44);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      // Every sector, repeated spins, locking, frame/link/title consistency and cleanup.
      for (let index = 0; index < 5; index++) {
        const expected = ["60'erne", "70'erne", "80'erne", "90'erne", "00'erne"][index];
        await page.evaluate(index => {
          const values = [(index + .5) / 5, .5, .1, .2];
          Math.random = () => values.shift() ?? .2;
          spinWheel();
          spinWheel(); // Must be ignored while spinning.
        }, index);
        await page.locator('#video-screen').waitFor({ state: 'visible' });
        assert.ok((await page.locator('#videoTitle').textContent()).includes(expected));
        const result = await page.evaluate(() => ({
          index: getDecadeIndex(currentRotation),
          video: selectedVideo,
          href: document.getElementById('youtubeLink').href,
          src: document.getElementById('videoFrame').src,
          frameTitle: document.getElementById('videoFrame').title,
          name: document.getElementById('videoName').textContent,
          active: document.activeElement.id,
        }));
        assert.equal(result.index, index);
        assert.equal(result.href, `https://www.youtube.com/watch?v=${result.video.id}`);
        assert.ok(result.src.includes(`/embed/${result.video.id}?playsinline=1`));
        assert.equal(result.frameTitle, result.video.title);
        assert.equal(result.name, `${result.video.title} (${result.video.year})`);
        assert.equal(result.active, 'videoTitle');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.locator('#resetBtn').click();
        assert.equal(await page.locator('#videoFrame').getAttribute('src'), null);
        assert.equal(await page.locator('#spinBtn').isEnabled(), true);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'spinBtn');
      }
      assert.deepEqual(errors, []);
      if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `wheel-${width}.png`) });
      await page.close();
      console.log(`PASS ${width}px: geometry, five decades, repeat spin, cleanup and no overflow`);
    }
    const page = await browser.newPage({ reducedMotion: 'no-preference' });
    await page.route('https://www.youtube.com/**', route => route.fulfill({ body: '' }));
    await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
    // Let a real CSS transition finish before reading the visual rotation.
    await page.evaluate(() => wheel.addEventListener('transitionend', event => {
      if (event.target !== wheel || event.propertyName !== 'transform') return;
      const matrix = new DOMMatrix(getComputedStyle(wheel).transform);
      window.finishedVisualRotation = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    }, { capture: true, once: true }));
    await page.locator('#spinBtn').click();
    await page.locator('#video-screen').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => {
      if (!Number.isFinite(window.finishedVisualRotation)) return false;
      return decades[getDecadeIndex(window.finishedVisualRotation)].name ===
        document.getElementById('videoTitle').textContent.match(/fra (.+)!/)[1];
    }), true);
    await page.locator('#resetBtn').click();
    // Exercise fallback when the transition produces no end event.
    await page.evaluate(() => { wheel.style.transition = 'none'; spinWheel(); });
    await page.locator('#video-screen').waitFor({ state: 'visible' });
    console.log('PASS normal motion: actual final transform and missing-transitionend fallback');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
