#!/usr/bin/env node
var yargs = require("yargs");
var puppeteer = require("puppeteer");
var os = require('os');
var path = require('path');

const gyazo = require('../lib/gyazo');

const res = {
  'SD':{width:720, height:480},
  'HD':{width:1280, height:720},
  'FHD':{width:1920, height:1080},
  '2K':{width:2560, height:1440},
  '4K':{width:4096, height:2160}
};

const argv = yargs
  .option('res', {
    alias: 'r',
    description: 'Browser Resolution. [SD, HD, FHD, 2K, 4K]',
    default: 'HD'
  })
  .option('width', {
    alias: 'w',
    description: 'Browser Width. It override resolution option.',
  })
  .option('height', {
    alias: 'h',
    description: 'Browser Height. It override resolution option.',
  })
  .option('xpath', {
    alias: 'x',
    description: 'Specify XPath for capture element. It ignore resolution options.',
  })
  .option('number', {
    alias: 'n',
    description: 'Specify capture element index if XPath match multiple elements. 0 means capture and upload all.'
  })
  .option('click', {
    alias: 'c',
    description: 'Click app elements that match XPath before capture'
  })
  .help()
  .argv;

const url = argv._[0];
if(!url || url===""){
  console.log("Usage:");
  console.log("\tgyapp [URL] {options}");
  console.log("\tgyapp --help");
  process.exit(1);
};

let filename = url.replace(/[^a-z0-9]/gi, '_')+'.png';
if(argv.xpath){
  filename = url.replace(/[^a-z0-9]/gi, '_')+argv.xpath.replace(/[^a-z0-9]/gi, '_')+'.png'
}
const tmpdir = os.tmpdir();
let filepath = path.join(tmpdir, filename);
const deviceID = gyazo.getDeviceID();

let title;

const capture = async () => {
  console.log('capture start: '+url)
  const browserRes = res[argv.res];
  if(argv.width){
    browserRes.width = argv.width;
  }
  if(argv.height){
    browserRes.height = argv.height;
  }
  console.log('resolution: '+JSON.stringify(browserRes))
  if(url.indexOf('http') !== 0){
    console.log('first arg is not URL!');
    process.exit(1);
  }
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setViewport(browserRes)
    await page.goto(url, {waitUntil: ['load', 'networkidle2'], timeout: 0});
    title = await page.title();
    if(argv.click){
      try{
        console.log('click xpath: '+argv.click);
        await page.waitForXPath(argv.click, {timeout:5000})
        const clickElements = await page.$x(argv.click)
        await clickAllElements(clickElements, 0)
      }catch{}
    }
    if(argv.xpath){
      console.log('capture xpath: '+argv.xpath)
      try {
        await page.waitForXPath(argv.xpath, {timeout:5000})
        const elements = await page.$x(argv.xpath);
        if(!elements || !elements[0]){
          console.error('Element not found by xpath: '+argv.xpath);
          process.exit(1)
        }
        if(argv.number === undefined){
          await elements[0].screenshot({ path: filepath })
          upload(filepath)
        }else{
          if(argv.number == 0){
            await uploadAllElements(elements, 0);
          }else{
            await elements[argv.number].screenshot({ path: filepath })
            upload(filepath)
          }
        }
      } catch (error) {
        console.error('Element not found by xpath: '+argv.xpath);
        process.exit(1)
      }
    }else{
      await page.screenshot({ path: filepath });
      upload(filepath)
    }
    await browser.close();
  } catch (err) {
    console.error(err)
  }
}

async function clickAllElements(elements, idx){
  console.log('clickAllElements: '+idx);
  const promise = await new Promise( async (resolve) => {
    e = elements[idx];
    idx += 1;
    await e.click()
    resolve()
  })
  if(idx < elements.length){
    await clickAllElements(elements, idx)
  }else{
    promise
  }
}

async function uploadAllElements(elements, idx){
  console.log('uploadAllElements: '+idx);
  const promise = await new Promise( async (resolve) => {
    e = elements[idx]
    idx += 1
    filename = url.replace(/[^a-z0-9]/gi, '_')+argv.xpath.replace(/[^a-z0-9]/gi, '_')+'_'+idx+'.png';
    filepath = path.join(tmpdir, filename);
    await e.screenshot({path:filepath})
    upload(filepath)
    resolve()
  })
  if(idx < elements.length){
    await uploadAllElements(elements, idx)
  }else{
    return promise
  }
}

function upload(capturePath){
  console.log('capture finish: '+capturePath);
  const timestamp = (new Date().getTime()/1000);
  gyazo.uploadWithMetadata(deviceID, capturePath, 'gyapp', title, url, "", timestamp);
}

(async () => {
  try {
    await capture()
  } catch (err) {
    console.error(err);
  }
})()