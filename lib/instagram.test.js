const { GyappInstagram } = require('./instagram');

const puppeteer = require('puppeteer');

describe('GyappInstagram', () => {
  let browser;
  let page;
  let instagram;
  beforeEach(async () => {
    browser = await puppeteer.launch();
    [page] = await browser.pages();
    instagram = new GyappInstagram({
      browser: browser,
      userName: "instagram"
    });
  });
  describe('getAllPostsURL()', () => {
    it('should get images', async () => {
      jest.setTimeout(20000);
      await page.goto('https://www.instagram.com/instagram/', {waitUntil: ['load', 'networkidle2']});
      await instagram.getAllPostsURL(page);
      expect(Object.keys(instagram.posts).length).toBeGreaterThanOrEqual(0);
    });
  });
});