#!/usr/bin/env node
var os = require("os");
var path = require("path");
var fs = require("fs");

const yargs = require("yargs");
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");

const { GyappUtils } = require('../lib/utils');
const { GyappTwitter } = require('../lib/twitter');
const { resolve } = require("path");

const argv = yargs
  .command('user [username]', 'Gyazo all images of tweets of specific twitter user.', (yargs) => {
    return yargs.positional('username', {
      describe: 'Twitter username.',
      require: true
    })
  })
  .command('like [username]', 'Gyazo all images of liked tweets of specific twitter user. cookie required.', (yargs) => {
    return yargs.positional('username', {
      describe: 'Twitter username.',
      require: true
    })
  })
  .command('search [query]', 'Gyazo all images of liked tweets of specific twitter search query.', (yargs) => {
    return yargs.positional('query', {
      describe: 'Twitter search query.',
      require: true
    })
  })
  .option('include-retweets', {
    alias: 'r',
    description: 'Include retweets or not.',
    type: 'boolean',
    default: false
  })
  .option('limit', {
    alias: 'l',
    description: 'Load limit of tweets. 0 means no limit.',
    type: 'number',
    default: 0
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
  console.log('command: '+argv._[0])
  console.log('include retweets: '+argv.includeRetweets)

  const browser = await puppeteer.launch();
  const [page] = await browser.pages();

  // set cookie
  if(argv.cookie){
    let cookieJSON = fs.readFileSync(argv.cookie);
    let cookie = JSON.parse(cookieJSON);
    page.setCookie(...cookie)
  }

  let url;
  switch (argv._[0]) {
    case 'user':
      url = `https://twitter.com/${argv.username}`;
      break;
    case 'like':
      url = `https://twitter.com/${argv.username}/likes`;
      break;
    case 'search':
      url = `https://twitter.com/search?q=${encodeURIComponent(argv.query)}`;
      break;
    default:
      break;
  }
  console.log('goto: '+url);

  const twitter = new GyappTwitter({
    browser: browser,
    userName: argv.username,
    command: argv._[0],
    includeRetweet: argv.includeRetweets
  });
  page.on('response', twitter.getTweetsFromResponse());
  
  await page.goto(url, {waitUntil: 'networkidle2'});
  await GyappUtils.scrollToLimit(page, async (page)=>{
    console.log('collected tweets: '+Object.keys(twitter.tweets).length);
    return new Promise((resolve)=>{
      if(Object.keys(twitter.tweets).length < argv.limit){
        resolve(true);
      }else{
        console.log(argv.limit);
        console.log('collect tweets finish');
        resolve(false);
      }
    });
  });
  await twitter.uploadAllTweets(0);
  await browser.close();
}

(async () => {
  try {
    await main();
  } catch (err) {
    console.error(err);
  }
})()
