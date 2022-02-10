[JP README](./README_ja.md)

# VRChat Join Notifier

This is a node.js command line tool that notifies you of the names of users who have joined/leaved to the same instance of VRChat while it is running.
A standalone executable for windows has been released.

## Usage

```
$ ./bin/run -t join
```

### Install

```
git clone git@github.com:kamakiri01/vrchat-join-notifier.git
cd vrchat-join-notifier
$ npm install
$ npm run build
```

To install globally as a `vn` command,

```
$ npm install -g
```

### Run

```
$ ./bin/run
```

When installed globally,

```
$ vn
```

Or, run `vrchat-join-notifier.exe`.

### Options

* `-s --specific-names <name...>`:
  specific notification names(with another notification sound)
* `-se, --specific-exec <command>`:
  exec command when match specific names. Replace %{{names}} in command text with join user names. ex: -s mySpecialFriendName -se "echo %{{names}}"
* `-i, --interval <sec>`
  specify check interval (default: "2")
* `-nt, --no-toast`
  prevent toast notification
* `-nx, --no-xsoverlay`
  prevent xsoverlay notification

and other options. see `-h` option.

### Giving coffee

You can give coffee fee.
[VRChatJoinNotifier - Iwanuki S.P.A. - BOOTH](https://iwanuki.booth.pm/items/2947584)
