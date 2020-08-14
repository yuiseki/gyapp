# gyapp

## Install
```bash
npm install gyapp
```


## Install (Under development)
```bash
npm link
```


## Usage
```bash
#
# gyapp
#
# See full options
gyapp --help

# Take screenshot of web page and upload it to Gyazo
gyapp https://google.com/

# Set browser resolution
gyapp https://google.com/ --res FHD
gyapp https://google.com/ --width 500 --height 500

# Specify XPath
gyapp https://twitter.com/yuiseki -xpath //*[article]
gyapp https://twitter.com/yuiseki -xpath "//a[@href='/yuiseki/header_photo']/parent::node()"
gyapp https://google.com/search?q=JAL123 -xpath "//*[@id='rso']/div"
# Capture web page from the beginning to the last
gyapp https://www.yahoo.co.jp/ -xpath "/html/body"

#
# gyapp-twitter
#
# Get All images of specific Twitter user and upload it to Gyazo
gyapp-twitter yuiseki

```


## Development
```
yarn
npm link
```

## ToDo
- 限界までスクロールしてからキャプチャを実行するオプションをつける
- Instagram全部保存に対応する
- はてなブックマーク全部保存に対応する
- Pocket全部保存に対応する
