#!/usr/bin/env node
var os = require("os");
var path = require("path")
var fs = require("fs")

const yargs = require("yargs").argv;
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");

const gyazo = require('../lib/gyazo');

const userName = yargs._[0];
if(!userName || userName===""){
  console.log("Usage:");
  console.log("\tgyapp-twitter [USERNAME]");
  process.exit(1);
}
const url = `https://twitter.com/${userName}`;
const tmpdir = os.tmpdir();

let browser;
let deviceID;
let tweets = {};
let media = [];
(async () => {
  try {
    browser = await puppeteer.launch();
    await openTwitter(userName);
    deviceID = gyazo.getDeviceID();
    console.debug('Gyazo device id :'+deviceID);
    await uploadAllTweetsToGyazo();
    await browser.close();
  } catch (err) {
    console.error(err)
  }
})()

/**
 * tweetオブジェクトから必要な情報を抜き出したり生成したりする処理
 * @param {Tweet} tweet Twitter内部APIのtweetオブジェクト
 */
function getTweetData(tweet){
  return new Promise(async (resolve, reject) => {
    let retweeted = false;
    if(Object.keys(tweet.entities).indexOf('media') === -1){
      reject(null)
    }
    console.debug('----- -----')
    const mediaURL = tweet.entities.media[0].expanded_url;
    const tweetURL = mediaURL.match(/https:\/\/twitter\.com\/.*?\/status\/.*?\//)[0].slice(0, -1);
    const screenName = tweetURL.match(/https:\/\/twitter\.com\/(.*?)\//)[1];
    console.debug('tweet url: '+tweetURL);
    const [page] = await browser.pages();
    await page.goto(tweetURL, {waitUntil: 'networkidle2', timeout: 0});
    const pageTitle = await page.title();
    console.debug('tweet title: '+pageTitle);
    if(userName!==screenName){
      retweeted = true;
    }
    let desc = "#twitter_"+screenName;
    if(retweeted){
      desc += " #twitter_rt_"+userName
    }
    resolve([pageTitle, tweetURL, desc])
  })
}

/**
 * 画像をHTTP GETしてメタデータとセットでGyazoにアップロードする処理
 * @param {Tweet} tweet Twitter内部APIのtweetオブジェクト
 * @param {string} imageURL アップロードしたい画像のURL
 */
function uploadMediaToGyazo(tweet, imageURL){
  return new Promise(async (resolve, reject) => {
    const [pageTitle, tweetURL, desc] = await getTweetData(tweet);
    console.log('twitter image url: '+imageURL)
    const res = await fetch(imageURL);
    console.log('twitter res: '+res.status)
    if(res.ok){
      let timestamp = (new Date().getTime()/1000);
      const lastModified = res.headers.get('Last-Modified');
      timestamp = (new Date(lastModified).getTime()/1000);
      const filename = imageURL.replace(/[^a-z0-9]/gi, '_');
      const filepath = path.join(tmpdir, filename);
      const dest = fs.createWriteStream(filepath);
      dest.on('close', async ()=>{
        await gyazo.uploadWithMetadata(deviceID, filepath, 'gyapp-twitter', pageTitle, tweetURL, desc, timestamp)
        resolve()
      })
      res.body.pipe(dest)
    }else{
      reject()
    }
  })
}

/**
 * 罰
 * @param {Tweet} tweet Twitter内部APIのtweetオブジェクト
 * @param {number} idx tweet.entities.mediaの何番目を処理しているか
 */
async function recursiveMediaPromise(tweet, idx){
  console.debug('media: '+idx);
  const promise = await new Promise( async (resolve) => {
    let m = tweet.entities.media[idx]
    idx += 1
    await uploadMediaToGyazo(tweet, m.media_url_https)
    resolve()
  });
  if(idx < tweet.entities.media.length){
    await recursiveMediaPromise(tweet, idx)
  }else{
    return promise;
  }
}

/**
 * 
 * @param {[string]} keys Twitter内部APIのtweetオブジェクトのキー一覧
 * @param {number} index tweetsの何番目を処理しているか
 */
async function recursiveTweetsPromise(keys, index) {
  console.debug('tweet: '+index)
  const promise = await new Promise( async (resolve) => {
    let tweet = tweets[keys[index]]
    index += 1
    if(Object.keys(tweet.entities).indexOf('media') === -1){
      resolve()
    }else{
      await recursiveMediaPromise(tweet, 0)
      resolve()
    }
  });
  if(index < keys.length){
    await recursiveTweetsPromise(keys, index)
  }else{
    return promise;
  }
}

async function uploadAllTweetsToGyazo() {
  const keys = Object.keys(tweets);
  await recursiveTweetsPromise(keys, 0)
}


/**
 * pageを限界までスクロールする
 * @param {puppeteer page} page 
 */
async function autoScroll(page){
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var count = 0;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        count++;
        console.debug('scrolling: '+count);
        if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
        }
      }, 100);
    });
  });
}

/**
 * responseがtwitterのtimeline apiだったらjsonを横取りする
 * @param {puppeteer response} response 
 */
async function getTweetsFromResponse(response){
  try {
    if (response.url().indexOf("https://api.twitter.com/2/timeline/profile/") >= 0){
      console.debug('getTweetsFromResponse')
      const text = await response.text();
      const json = JSON.parse(text);
      Object.assign(tweets, json.globalObjects.tweets);
    }
  } catch (error) {
  }
}

/**
 * Twitterをpuppeteerで開く
 */
async function openTwitter(){
  console.debug('openTwitter')
  const [page] = await browser.pages();
  page.on('response', getTweetsFromResponse);
  await page.goto(url, {waitUntil: 'networkidle2'});
  await autoScroll(page);
}