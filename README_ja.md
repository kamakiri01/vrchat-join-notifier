# VRChat Join Notifier

VRChat を起動中、同じインスタンスへの join/leave を通知する node.js コマンドラインツールです。
windows 向け単体実行ファイルを Release しています。

## Usage

```
$ ./bin/run -t join
```

### Install

コマンドライン上で利用する場合、Node.js が必要です。

```
git clone git@github.com:kamakiri01/vrchat-join-notifier.git
cd vrchat-join-notifier
$ npm install
$ npm run build
```

`vn` コマンドとしてグローバルにインストールする場合、

```
$ npm install -g
```

### Run

```
$ ./bin/run
```

または、グローバルにインストールした場合、

```
$ vn
```

または、`vrchat-join-notifier.exe` を実行します。

### Options

* `-s --specific-names <name...>`:
  特別扱いするユーザ名を指定します（別の通知音が鳴ります）
* `-se, --specific-exec <command>`:
  特別扱いするユーザがjoinしたとき、実行するコマンドを指定します。(ex: -s friendname1 friendname2 -se "echo %{{names}}")
* `-i, --interval <sec>`
  通知チェックする時間間隔を秒単位で指定します (default: "2")
* `-nt, --no-toast`
  Windowsのトースト通知を停止します
* `-nx, --no-xsoverlay`
  XSOverlayのVR内通知を停止します

その他のオプションは `-h` オプションを確認してください。

### Giving coffee

コーヒー代を受け付けています。
[VRChatJoinNotifier - Iwanuki S.P.A. - BOOTH](https://iwanuki.booth.pm/items/2947584)
