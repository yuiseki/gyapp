var fs = require("fs");
var path = require("path");
var fetch = require("node-fetch");
var FormData = require("form-data");

/**
 * 各プラットフォームでGyazoのDeviceIDを取得する処理
 */
exports.getDeviceID = () => {
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
  filePath = path.join(appDataPath, appDataFileName)
  deviceID = fs.readFileSync(filePath, 'utf-8')
  return deviceID;
}

/**
 * Gyazoにメタデータつきでアップロードする処理
 * @param {string} deviceID 
 * @param {string} filepath 
 * @param {string} app 
 * @param {string} title 
 * @param {string} url 
 * @param {string} desc 
 * @param {number} timestamp 
 */
exports.uploadWithMetadata = async (deviceID, filepath, app, title, url, desc, timestamp) => {
  const metadata = {
    app: app,
    title: title,
    url: url,
    desc: desc
  }
  let formData = new FormData();
  formData.append('id', deviceID);
  formData.append('scale', '1.0');
  formData.append('created_at', timestamp);
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('imagedata', fs.createReadStream(filepath));
  const res = await fetch("https://upload.gyazo.com/upload.cgi", {method: 'POST',body: formData });
  console.debug('gyazo res: '+res.status)
  if(res.ok){
    const gyazoURL = await res.text();
    console.debug('gyazo upload finish: '+gyazoURL);
  }
}