# gyapp

## Install
```bash
npm install gyapp -g
```


## Install (Under development)
```bash
npm link
```


## Usage

### gyapp

#### See full options
```bash
gyapp --help
```

#### Take screenshot of web page and upload it to Gyazo
```bash
gyapp https://google.com/
```
[![Image from Gyazo](https://i.gyazo.com/3fc4e71f5512e2348c043eb14e027364.png)](https://gyazo.com/3fc4e71f5512e2348c043eb14e027364)


#### Set browser resolution

##### Preset resolution
```bash
gyapp https://google.com/ --res FHD
```
[![Image from Gyazo](https://i.gyazo.com/6451ed1f395fb8386a8ca984d3ee8b4b.png)](https://gyazo.com/6451ed1f395fb8386a8ca984d3ee8b4b)


##### Custom resolution
```bash
gyapp https://google.com/ --width 500 --height 500
```
[![Image from Gyazo](https://i.gyazo.com/8e35578d27a75c68003a601bff8f64f5.png)](https://gyazo.com/8e35578d27a75c68003a601bff8f64f5)


#### Specify XPath

##### Capture newest tweet
```bash
gyapp https://twitter.com/yuiseki --xpath "//*[article]" --click "//span[text() = '表示']" --height 1200
```
[![Image from Gyazo](https://i.gyazo.com/ac4be8c1eb39a4d5dc445f5edd414777.png)](https://gyazo.com/ac4be8c1eb39a4d5dc445f5edd414777)


##### Capture twitter profile
```bash
gyapp https://twitter.com/yuiseki --xpath "//a[@href='/yuiseki/header_photo']/parent::node()"
```
[![Image from Gyazo](https://i.gyazo.com/56089f691ab7011fd3b57d4ef02aa4ec.png)](https://gyazo.com/56089f691ab7011fd3b57d4ef02aa4ec)


##### Capture Google search result
```bash
gyapp https://google.com/search?q=JAL123 --xpath "//*[@id='rso']/div"
```
[![Image from Gyazo](https://i.gyazo.com/b4d6b49677c8b1e40aa19b247621e54d.png)](https://gyazo.com/b4d6b49677c8b1e40aa19b247621e54d)


##### Capture web page from the beginning to the last
```bash
gyapp https://www.yahoo.co.jp/ --xpath "/html/body"
```
[![Image from Gyazo](https://i.gyazo.com/9141b83ed024e5ee4c5d75e06bda94db.png)](https://gyazo.com/9141b83ed024e5ee4c5d75e06bda94db)


### gyapp-twitter

##### Get All images of specific Twitter user and upload it to Gyazo
```bash
gyapp-twitter yuiseki
```


## Development
```
yarn
npm link
```

## ToDo
- xpathで複数マッチしたやつ順番にキャプチャしてアップロードしたい
- 限界までスクロールしてからキャプチャを実行するオプションをつける
- cookie読み込みに対応する
- Twitter検索からの画像ぶっこぬきにも対応する
- Instagram全部保存に対応する
- はてなブックマーク全部保存に対応する
- Pocket全部保存に対応する
