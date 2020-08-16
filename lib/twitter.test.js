const { GyappTwitter } = require('./twitter');

const puppeteer = require('puppeteer');

describe('GyappTwitter', () => {
  let browser;
  let page;
  let twitter;
  beforeEach(async () => {
    browser = await puppeteer.launch();
    [page] = await browser.pages();
    twitter = new GyappTwitter({
      browser: browser,
      userName: "twitter"
    });
  });
  describe('getTweetsFromResponse()', () => {
    it('should get tweets', async () => {
      jest.setTimeout(20000);
      page.on('response', twitter.getTweetsFromResponse());
      await page.goto('https://twitter.com/twitter', {waitUntil: ['load', 'networkidle2']});
      expect(Object.keys(twitter.tweets).length).toBeGreaterThanOrEqual(0);
    });
  });
});