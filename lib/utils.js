const os = require('os');
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const FormData = require('form-data')

class GyappUtils {
  constructor({
      app = 'gyapp',
      title = null,
      url = null,
      desc = null,
      timestamp = parseInt(new Date().getTime()/1000),
      xpath = null}){
    this.app = app;
    this.title = title;
    this.url = url;
    this.desc = desc;
    this.timestamp = timestamp;
    this.xpath = xpath;
    this.deviceID = GyappUtils.getDeviceID();
  }

  /**
   * 各プラットフォームでGyazoのDeviceIDを取得する処理
   * @returns {string}
  */
  static getDeviceID(){
    let appDataPath = ''
    let appDataFileName = ''
    switch (process.platform) {
      case 'win32':
        appDataFileName = 'id.txt'
        appDataPath = path.join(process.env.APPDATA, 'Gyazo')
        break;
      case 'darwin':
        appDataFileName = 'id'
        appDataPath = path.join(process.env.HOME, 'Library', 'Gyazo')
        break
      case 'linux':
        appDataFileName = '.gyazo.id'
        appDataPath = process.env.HOME
        break
      default:
        break;
    }
    const filePath = path.join(appDataPath, appDataFileName)
    const deviceID = fs.readFileSync(filePath, 'utf-8')
    return deviceID;
  }

  /**
   * PuppeteerのElementHandleの配列を渡すと、
   * すべてクリックする処理
   * @param {ElementHandle[]} elements PuppeteerのElementHandleの配列
   * @param {number} idx 0
   * @returns {Promise} 
   */
  static async clickAllElements(elements, idx){
    console.log('clickAllElements: '+idx);
    const promise = await new Promise( async (resolve) => {
      const e = elements[idx];
      idx += 1;
      await e.click()
      resolve()
    })
    if(idx < elements.length){
      await GyappUtils.clickAllElements(elements, idx)
    }else{
      return promise
    }
  }

  /**
   * 任意の位置までスクロールする処理
   * @param {Page} page PuppeteerのPage
   * @param {*} scrollY スクロールしたいY座標
   * @returns {Promise}
   */
  static async scrollTo(page, scrollY){
    await page.evaluate(async (scrollY) => {
      window.scrollTo(0, scrollY);
    }, scrollY)
  }

  /**
   * 限界までスクロールする処理
   * @param {Page} page PuppeteerのPage
   * @returns {Promise}
   */
  static async scrollToLimit(page, boolFunc){
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        var totalHeight = 0;
        var distance = 300;
        var count = 0;
        var timer = setInterval(() => {
          // document.body.scrollHeightはscrollするたびに変化する可能性があるので毎回ここで取得すべき
          var scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          count++;
          // これ以上スクロールできない状態
          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }



  /**
   * 一時ファイルのpathを得る処理
   * @param {string} otherURL 
   * @param {number} index 
   * @returns {string}
   */
  getTmpFilePath(otherURL = null, index = 0) {
    const tmpdir = os.tmpdir();
    let url = this.url;
    if(otherURL){
      url = otherURL
    }
    let filename = url.replace(/[^a-z0-9]/gi, '_')+'.png';
    if(this.xpath){
      filename = url.replace(/[^a-z0-9]/gi, '_')+this.xpath.replace(/[^a-z0-9]/gi, '_')+'-'+index+'.png'
    }
    const filepath = path.join(tmpdir, filename);
    return filepath
  }


  /**
   * Gyazoにメタデータつきで画像をアップロードする処理
   * @param {string} filepath 
   * @returns {Promise}
   */
  async uploadWithMetadata(filepath) {
    const self = this
    return new Promise( async (resolve, reject) => {
      const metadata = {
        app: self.app,
        title: self.title,
        url: self.url,
        desc: self.desc,
      }
      let formData = new FormData();
      formData.append('id', self.deviceID);
      formData.append('scale', '1.0');
      formData.append('created_at', self.timestamp);
      formData.append('metadata', JSON.stringify(metadata));
      formData.append('imagedata', fs.createReadStream(filepath));
      const res = await fetch("https://upload.gyazo.com/upload.cgi", {method: 'POST',body: formData });
      console.debug('gyazo res: '+res.status)
      if(res.ok){
        const gyazoURL = await res.text();
        console.debug('gyazo upload finish: '+gyazoURL);
        console.debug('');
        resolve()
      }else{
        reject()
      }
    })
  }

  /**
   * PuppeteerのElementHandleの配列を渡すと、
   * すべてスクリーンショットを撮ってGyazoにアップロードする処理
   * @param {ElementHandle[]} elements PuppeteerのElementHandleの配列
   * @param {number} idx 0
   * @returns {Promise} 
   */
  async uploadAllElements(elements, idx) {
    const self = this
    console.log('uploadAllElements: '+idx);
    const promise = await new Promise( async (resolve) => {
      e = elements[idx]
      idx += 1
      const filepath = self.getTmpFilePath(idx);
      await e.screenshot({path:filepath})
      self.timestamp = parseInt(new Date().getTime()/1000)
      await self.uploadWithMetadata(filepath);
      resolve()
    })
    if(idx < elements.length){
      await self.uploadAllElements(elements, idx)
    }else{
      return promise
    }
  }
}
exports.GyappUtils = GyappUtils;


