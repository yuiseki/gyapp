const { GyappUtils } = require('../lib/utils');
const fetch = require('node-fetch');
const fs = require('fs');

class GyappInstagram {
  constructor({
    browser = null,
    userName = null
  }){
    this.posts = {};
    this.browser = browser;
    this.userName = userName;
  }

  async uploadImage(postData, imageURL){
    const self = this;
    return new Promise(async (resolve, reject) => {
      console.log('GyappInstagram.uploadImage: fetch image '+imageURL);
      const imageRes = await fetch(imageURL);
      if(!imageRes.ok){
        reject()
        return
      }
      let timestamp = parseInt(new Date().getTime()/1000);
      const lastModified = imageRes.headers.get('Last-Modified');
      timestamp = parseInt(new Date(lastModified).getTime()/1000);
      const utils = new GyappUtils({
        app: 'gyapp-instagram',
        title: postData.title,
        url: postData.url,
        desc: postData.desc,
        timestamp: timestamp
      });
      const filepath = utils.getTmpFilePath(imageURL);
      const stream = fs.createWriteStream(filepath);
      stream.on('close', async () => {
        await utils.uploadWithMetadata(filepath)
        resolve()
      });
      imageRes.body.pipe(stream);
    });
  }

  async uploadAllImageElements(imgElements, postData, idx){
    const self = this;
    const promise = await new Promise( async (resolve) => {
      const img = imgElements[idx];
      idx += 1;
      const imageURLProp = await img.getProperty('src');
      const imageURL = await imageURLProp.jsonValue();
      const imageAltProp = await img.getProperty('alt');
      const imageAlt = await imageAltProp.jsonValue();
      postData.desc = "#instagram_"+self.userName+" "+imageAlt;
      await self.uploadImage(postData, imageURL);
      resolve()
    });
    if(idx < imgElements.length){
      await self.uploadAllImageElements(imgElements, postData, idx);
    }else{
      return promise;
    }
  }

  async uploadPostFromURL(url){
    const self = this;
    console.log('GyappInstagram.uploadPostFromURL: '+url);
    return new Promise(async(resolve, reject)=>{
      const [page] = await self.browser.pages();
      await page.goto(url, {waitUntil: 'networkidle2'});
      const pageTitle = await page.title();
      const imgElements = await page.$x('//img[not(@alt = "Instagram") and not(@data-testid = "user-avatar")]');
      const postData = {
        title: pageTitle,
        url: url
      }
      await self.uploadAllImageElements(imgElements, postData, 0);
      resolve();
    })
  }

  async uploadAllPosts(idx){
    const self = this;
    self.keys = Object.keys(self.posts);
    console.log('GyappInstagram.uploadAllPosts: '+idx+' / '+self.keys.length);
    const promise = await new Promise( async (resolve) => {
      const key = self.keys[idx];
      idx += 1;
      const postURL = self.posts[key];
      await self.uploadPostFromURL(postURL);
      resolve()
    });
    if(idx < self.keys.length){
      await self.uploadAllPosts(idx);
    }else{
      return promise;
    }
  }

  async getAllAnchor(elements, idx){
    const self = this;
    const promise = await new Promise( async (resolve) => {
      const e = elements[idx];
      idx += 1;
      const href = await e.getProperty('href');
      const url = await href.jsonValue();
      const id = url.replace('https://www.instagram.com/p/', '').slice(0, -1);
      self.posts[id] = "https://instagram.com/p/"+id+"/";
      resolve();
    })
    if(idx < elements.length){
      await self.getAllAnchor(elements, idx);
    }else{
      return promise;
    }
  }

  async getAllPostsURL(page){
    const anchorElements = await page.$x("//a[contains(@href, '/p/')]");
    await this.getAllAnchor(anchorElements, 0)
    console.log('GyappInstagram.getAllPostsURL: collected posts '+Object.keys(this.posts).length);
  }
}
exports.GyappInstagram = GyappInstagram;