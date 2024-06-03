# 🦉 Bubo Reader (Fork)

[![screenshot](./demo.png)](https://reader.lunalux.io)

This is a **personal** fork of [Kevinfiol's](https://github.com/kevinfiol/rss-reader) fork of the excellent [Bubo Reader](https://github.com/georgemandis/bubo-rss) by George Mandis. 

The code, and the [deployment](https://reader.lunalux.io) are both available, but this is not intended to be useful to you. Sorry. 

I intend to adapt the repository to fit my needs. If you want to host your own, you're probably better off forking one of the original repositories.

Some of the changes I have made
- `All articles` exclude articles from feeds. 
- Import my safari bookmarks as a feeds. 
- Add hostname to more articles. 

todo:
- [ ] Add RSS feeds. 
- [x] `all articles` in group
- [ ] Fix mobile navigation doesn't close the menu. 
- [ ] Fix issue with jumping to top when hovering link.
- [ ] Home feed should be full width on mobile. 
- [ ] subgroups? 
- [x] today view: show new articles today. (it should pull articles from today and yesterday due to when it's being run.)
- [ ] filters.
    - [ ] Filter out articles with certain words during build
    - [ ] Filter feeds in group. 

## How to build

Node `>=22.x` required.

```shell
npm install
npm run build
```

## How to host on Github Pages

1. Fork this repo!
2. Enable [Github Pages](https://pages.github.com/) for your repo (either as a project site, or user site)
3. Configure `.github/workflows/build.yml` to your liking
    * Uncomment the `schedule` section to enable scheduled builds
