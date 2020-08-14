#!/usr/bin/env node
var yargs = require("yargs");
var puppeteer = require("puppeteer");
var os = require('os');
var path = require('path')

const gyazo = require('../lib/gyazo');

const res = {
  'SD':{width:720, height:480},
  'HD':{width:1280, height:720},
  'FHD':{width:1920, height:1080},
  '2K':{width:2560, height:1440},
  '4K':{width:4096, height:2160}
}

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
  .help()
  .argv

const url = argv._[0];
if(!url || url===""){
  console.log("Usage:")
  console.log("\tgyapp [URL] {options}")
  console.log("\tgyapp --help")
  process.exit(1)
}

let filename = url.replace(/[^a-z0-9]/gi, '_')+'.png'
if(argv.xpath){
  filename = url.replace(/[^a-z0-9]/gi, '_')+argv.xpath.replace(/[^a-z0-9]/gi, '_')+'.png'
}
const tmpdir = os.tmpdir();
const filepath = path.join(tmpdir, filename)

let title

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
    if(argv.xpath){
      const elements = await page.$x(argv.xpath);
      if(elements[0]){
        await elements[0].screenshot({ path: filepath })
      }else{
        console.error('Element not found by xpath: '+argv.xpath);
        process.exit(1)
      }
    }else{
      await page.screenshot({ path: filepath });
    }
    await browser.close();
    console.log('capture finish: '+filepath);
    const deviceID = gyazo.getDeviceID();
    const timestamp = (new Date().getTime()/1000);
    gyazo.uploadWithMetadata(deviceID, filepath, 'gyapp', title, url, "", timestamp);
  } catch (err) {
    console.error(err)
  }
}

(async () => {
  try {
    await capture()
  } catch (err) {
    console.error(err);
  }
})()