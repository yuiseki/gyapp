#!/usr/bin/env node
var yargs = require("yargs").argv;
var puppeteer = require("puppeteer");
var os = require('os');
var path = require('path')

const gyazo = require('../lib/gyazo');
const { time } = require("console");

const url = yargs._[0];
if(!url || url===""){
  console.log("Usage:")
  console.log("\tgyapp [URL]")
  process.exit(1)
}
const filename = url.replace(/[^a-z0-9]/gi, '_')+'.png'
const tmpdir = os.tmpdir();
const filepath = path.join(tmpdir, filename)

let title

const capture = async () => {
  console.log('capture start: '+url)
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'networkidle2', timeout: 0});
    title = await page.title();
    await page.screenshot({ path: filepath });
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