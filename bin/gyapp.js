#!/usr/bin/env node
var yargs = require("yargs").argv;
var puppeteer = require("puppeteer");
var os = require('os');
var path = require('path')


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
    await page.waitForNavigation({waitUntil: ['load', 'networkidle2']});
    await page.goto(url);
    title = await page.title();
    await page.screenshot({ path: filepath });
    await browser.close();
  } catch (err) {
    console.err(err)
  }
}

const upload = async () => {
  console.log('upload start: '+filepath)

}

(async () => {
  try {
    await capture()
  } catch (err) {
    console.error(err);
  } finally {
    console.log('capture finish: '+filepath);
  }
  try {
    await upload()
  } catch (err) {
    console.error(err)
  } finally {
    console.log('upload finish')
  }
})()