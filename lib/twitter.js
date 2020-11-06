const { GyappUtils } = require('../lib/utils');
const fetch = require('node-fetch');
const fs = require('fs');

class GyappTwitter {
  constructor({
    browser = null,
    userName = null,
    command = null,
    includeRetweet = false
  }){
    this.tweets = {};
    this.browser = browser;
    this.userName = userName;
    this.command = command;
    this.includeRetweet = includeRetweet;
  }

  /**
   * responseがtwitterのtimeline apiだったらjsonを横取りしてthis.tweetsに集める処理
   * @param {Response} response puppeteerのResponseオブジェクト
   */
  getTweetsFromResponse(){
    const self = this;
    return async function(response){
      try {
        if ( 
             // profile
             response.url().indexOf("https://twitter.com/i/api/2/timeline/profile/") >= 0
          || response.url().indexOf("https://api.twitter.com/2/timeline/profile/") >= 0
             // like
          || response.url().indexOf("https://twitter.com/i/api/2/timeline/favorites/") >= 0
          || response.url().indexOf("https://api.twitter.com/2/timeline/favorites/") >= 0
             // search
          || response.url().indexOf("https://twitter.com/i/api/2/search/adaptive.json") >= 0
          || response.url().indexOf("https://api.twitter.com/2/search/adaptive.json") >= 0
          ){
          console.debug('getTweetsFromResponse');
          const text = await response.text();
          const json = JSON.parse(text);
          if(json && json.globalObjects){
            Object.assign(self.tweets, json.globalObjects.tweets);
          }
          console.debug('collected tweets: '+Object.keys(self.tweets).length)
        }
      } catch (err) {
        //console.error(err)
      }
    }
  }

  /**
   * tweetオブジェクトから必要な情報を抜き出したり生成したりする処理
   * @param {*} tweet Twitter内部APIのtweetオブジェクト
   * @returns {Promise}
   */
  getTweetData(tweet){
    const self = this
    return new Promise(async (resolve, reject) => {
      let retweeted = false;
      // mediaのURLからツイートURLやScreenNameを得る
      const mediaURL = tweet.entities.media[0].expanded_url;
      console.log('media url: '+mediaURL)
      const tweetURL = mediaURL.match(/https?:\/\/twitter\.com\/.*?\/status\/.*?\//)[0].slice(0, -1);
      const screenName = tweetURL.match(/https?:\/\/twitter\.com\/(.*?)\//)[1];
      console.debug('tweet url: '+tweetURL);
      // リツイートされたツイートかどうかの判定
      if(self.userName!==screenName){
        retweeted = true;
      }
      // gyazoのdescription欄で使う文字列の生成
      let desc = "#twitter_"+screenName;
      switch (self.command) {
        case 'user':
          if(retweeted){
            desc += " #twitter_rt_"+self.userName;
          }
          break;
        case 'like':
          desc += " #twitter_like_"+self.userName;
          break;
        default:
          break;
      }
      // ツイート個別ページを開いてタイトルを得る
      const [page] = await self.browser.pages();
      await page.goto(tweetURL, {waitUntil: ['load', 'networkidle2'], timeout: 0});
      let pageTitle = await page.title();
      if (pageTitle === "ツイートする / Twitter"){
        await page.waitFor(2000)
        pageTitle = await page.title()
      }
      console.debug('tweet title: '+pageTitle);
      resolve({
        screenName: screenName,
        retweeted: retweeted,
        url: tweetURL,
        title: pageTitle,
        desc: desc
      })
    })
  }


  /**
   * Twitterの画像をHTTP GETしてメタデータとセットでGyazoにアップロードする処理
   * @param {tweetData} tweetData getTweetDataで得られるObject
   * @param {string} mediaURL アップロードしたい画像のURL
   * @returns {Promise}
   */
  async uploadMedia(tweetData, mediaURL, retry){
    return new Promise(async(resolve, reject)=>{
      console.log('fetch media: '+mediaURL);
      console.log('retry: '+retry);
      try{
        const mediaRes = await fetch(mediaURL);
        let timestamp = parseInt(new Date().getTime()/1000);
        const lastModified = mediaRes.headers.get('Last-Modified');
        timestamp = parseInt(new Date(lastModified).getTime()/1000);
        const utils = new GyappUtils({
          app: 'gyapp-twitter',
          title: tweetData.title,
          url: tweetData.url,
          desc: tweetData.desc,
          timestamp: timestamp
        })
        const filepath = utils.getTmpFilePath(mediaURL);
        const stream = fs.createWriteStream(filepath);
        stream.on('close', async () => {
          await utils.uploadWithMetadata(filepath)
          resolve();
        });
        mediaRes.body.pipe(stream);
      }catch(err){
        if(retry<5){
          this.uploadAllMedia(tweetData, mediaURL, retry+1);
        }
      }
    });
  }

  /**
   * 再帰を使ってtweetに含まれる全ての画像をアップロードする処理
   * @param {tweet} tweet 
   * @param {tweetData} tweetData 
   * @param {number} idx 
   * @returns {Promise}
   */
  async uploadAllMedia(tweet, tweetData, idx){
    const self = this;
    const promise = await new Promise(async(resolve) => {
      try{
        let mediaURL = tweet.entities.media[idx].media_url_https;
        idx += 1;
        await self.uploadMedia(tweetData, mediaURL, 0);
      }catch(err){
        console.log(err)
      }
      resolve();
    })
    if(idx < tweet.entities.media.length){
      await self.uploadAllMedia(tweet, tweetData, idx);
    }else{
      return promise;
    }
  }

  /**
   * tweetに画像が含まれるかチェックして、
   * 含まれる場合には全ての画像をアップロードする処理
   * @param {Object} tweet 
   * @returns {Promise}
   */
  async uploadTweet(tweet){
    const self = this
    return new Promise(async (resolve) => {
      if(tweet === undefined){
        console.log('tweet is undefined, skip');
        console.debug('');
        resolve()
        return;
      }
      if(Object.keys(tweet.entities).indexOf('media') === -1){
        console.log('no media, skip');
        console.debug('');
        resolve()
        return;
      }
      if(!tweet || !tweet.entities || !tweet.entities.media){
        resolve()
        return
      }
      if(self.command == "user"
        && !self.includeRetweet
        && tweet.entities.media[0].expanded_url.indexOf(self.userName) === -1){
        console.log('retweeted, skip');
        console.debug('');
        resolve()
        return
      }
      const tweetData = await self.getTweetData(tweet)
      await self.uploadAllMedia(tweet, tweetData, 0)
      resolve()
    })
  }

  /**
   * 再帰を使ってすべてのツイートの画像をGyazoにアップロードする処理
   * @param {number} idx 何番目のtweetsを処理しているか
   * @returns {Promise}
   */
  async uploadAllTweets(idx){
    const self = this;
    self.keys = Object.keys(self.tweets);
    console.log('uploadAllTweets: '+idx+' / '+self.keys.length);
    const promise = await new Promise( async (resolve) => {
      const key = self.keys[idx];
      idx += 1;
      const tweet = self.tweets[key];
      await self.uploadTweet(tweet)
      resolve()
    });
    if(idx < self.keys.length){
      await self.uploadAllTweets(idx);
    }else{
      return promise;
    }
  }

}
exports.GyappTwitter = GyappTwitter;