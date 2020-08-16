#!/usr/bin/env node
var os = require("os");
var path = require("path");
var fs = require("fs");

const yargs = require("yargs");
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");

const { GyappUtils } = require('../lib/utils');
const { GyappTwitter } = require('../lib/twitter');

const argv = yargs
  .command('user [username]', 'Gyazo all images of specific twitter user.', (yargs) => {
    return yargs.positional('username', {
      describe: 'Twitter username.',
      require: true
    })
    .option('limit', {
      alias: 'l',
      description: 'Load limit of tweets. 0 means no limit.',
      type: 'number',
      default: 0
    })
    .option('include-retweet', {
      alias: 'rt',
      description: 'Include retweet or not.',
      type: 'boolean',
      default: false
    })
  })
  .option('cookie', {
    description: 'cookie file path to set puppeteer.',
    type: 'string'
  })
  .help()
  .argv;

const arg = argv._[0];
if(!arg || arg===""){
  console.log("Usage:");
  console.log("\tgyapp-twitter --help");
  process.exit(1);
}
const query = encodeURIComponent(arg);
//const url = `https://twitter.com/search?q=from%3Ayuiseki%20filter%3Anativeretweets%20filter%3Aimages&src=typed_query&f=live`


const main = async () => {
  const browser = await puppeteer.launch();
  const [page] = await browser.pages();

    // set cookie
    if(argv.cookie){
      let cookieJSON = fs.readFileSync(argv.cookie);
      let cookie = JSON.parse(cookieJSON);
      page.setCookie(...cookie)
    }

  const twitter = new GyappTwitter({
    browser: browser,
    userName: argv.username,
    includeRetweet: argv.includeRetweet
  });
  page.on('response', twitter.getTweetsFromResponse());
  
  const url = `https://twitter.com/${argv.username}`;
  await page.goto(url, {waitUntil: 'networkidle2'});
  await GyappUtils.scrollToLimit(page, (p)=>{
    console.log('collected tweets: '+Object.keys(twitter.tweets).length);
  });
  await twitter.uploadAllTweets(0);
  await browser.close();
}

(async () => {
  try {
    await main()
  } catch (err) {
    console.error(err);
  }
})()
