/**
 * 🦉 Bubo RSS Reader
 * ====
 * Dead, dead simple feed reader that renders an HTML
 * page with links to content from feeds organized by site
 *
 */

import Parser from 'rss-parser';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { template } from './template.js';

const WRITE = process.argv.includes('--write');
const USE_CACHE = !WRITE && process.argv.includes('--cached');

const CACHE_PATH = './src/cache.json';
const OUTFILE_PATH = './output/index.html';
const CONTENT_TYPES = [
  'application/json',
  'application/atom+xml',
  'application/rss+xml',
  'application/xml',
  'application/octet-stream',
  'text/xml'
];

const config = readCfg('./src/config.json');
const feeds = USE_CACHE ? {} : readCfg('./src/feeds.json');
const cache = USE_CACHE ? readCfg(CACHE_PATH) : {};

await build({ config, feeds, cache, writeCache: WRITE });

async function build({ config, feeds, cache, writeCache = false }) {
  let allItems = cache.allItems || [];
  const parser = new Parser();
  const errors = [];
  const groupContents = {};

  for (const groupName in feeds) {
    groupContents[groupName] = {
      contents: [],
      recentArticles: []
    };

    const results = await Promise.allSettled(
      Object.values(feeds[groupName]).map(url =>
        fetch(url, { method: 'GET' })
          .then(res => [url, res])
          .catch(e => {
            throw [url, e];
          })
      )
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        const [url, error] = result.reason;
        errors.push(url);
        console.error(`Error fetching ${url}:\n`, error);
        continue;
      }

      const [url, response] = result.value;

      try {
        // e.g., `application/xml; charset=utf-8` -> `application/xml`
        const contentType = response.headers.get('content-type').split(';')[0];

        if (!CONTENT_TYPES.includes(contentType))
          throw Error(`Feed at ${url} has invalid content-type. Got: ${contentType}, but expected one of ${CONTENT_TYPES}`)

        const body = await response.text();
        const contents = typeof body === 'string'
          ? await parser.parseString(body)
          : body;
        const isRedditRSS = contents.feedUrl && contents.feedUrl.includes("reddit.com/r/");

        if (!contents.items.length === 0)
          throw Error(`Feed at ${url} contains no items.`)

        contents.feed = url;
        contents.title = contents.title || contents.link;
        groupContents[groupName]['contents'].push(contents);
        groupContents[groupName]['recentArticles'] = [...groupContents[groupName]['recentArticles'], ...contents.items]

        // item sort & normalization
        contents.items.sort(byDateSort);
        contents.items.forEach((item) => {
          // 1. try to normalize date attribute naming
          const dateAttr = item.pubDate || item.isoDate || item.date || item.published || item.updated;
          try {
            item.timestamp = new Date(dateAttr);
          } catch (e) {
            console.error(`Error parsing date for ${item.link}: ${dateAttr}`);
            item.timestamp = false;
          }

          try {
            item.timestampFormatted = new Intl.DateTimeFormat(config.dateFormatLocale).format(item.timestamp)
          } catch (e) {
            console.error(`Error formatting date for ${item.link}: ${item.timestamp}`);
            item.timestampFormatted = "Invalid Date";
          }

          // 2. correct link url if it lacks the protocol
          if (item.link && item.link.split('http').length === 1) {
            item.link =
            // if the protocol ends with a /, and the item link begins with a /
              contents.link.slice(-1) === '/' && item.link.slice(0, 1) === '/'
                ? contents.link + item.link.slice(1)
                : contents.link + item.link;
          }

          // 2.5 deal with relative urls :(
          // new URL("/article", "https://test.example.org/") -> https://test.example.org/article
          // new URL("https://example2.com/", "https://test.example.org/") -> https://example2.com/
          if (item.link) {
            item.link = new URL(item.link, contents.feed).href;
          }

          // 3. parse subreddit feed comments
          if (isRedditRSS && item.contentSnippet && item.contentSnippet.startsWith('submitted by    ')) {
            // matches anything between double quotes, like `<a href="matches this">foo</a>`
            const quotesContentMatch = /(?<=")(?:\\.|[^"\\])*(?=")/g;
            let [_submittedBy, _userLink, contentLink, commentsLink] = item.content.split('<a href=');
            item.link = contentLink.match(quotesContentMatch)[0];
            item.comments = commentsLink.match(quotesContentMatch)[0];
          }

          // 4. redirects
          if (config.redirects) {
            // need to parse hostname methodically due to unreliable feeds
            const url = new URL(item.link);
            const tokens = url.hostname.split('.');
            const host = tokens[tokens.length - 2];
            const redirect = config.redirects[host];
            if (redirect) item.link = `https://${redirect}${url.pathname}${url.search}`;
          }

          // 5. escape html in titles
          if (item.title){
            item.title = escapeHtml(item.title);
          } else {
            item.title = "No title";
          }
          //6 add feedUrl to item
          // to be shown as recent items in the group
          item.feedUrl = contents.feed;

          // 7 add groupName to item
          item.groupName = groupName;

        });

        // add to allItems
        // exclude items from filtered groups in all and recent articles
        if (config.filterGroups.indexOf(groupName) == -1) {
          allItems = [...allItems, ...contents.items];
        }
      } catch (e) {
        console.error(e);
        errors.push(url)
      }
    }
  }

  const groups = cache.groups || Object.entries(groupContents);

  if (writeCache) {
    writeFileSync(
      resolve(CACHE_PATH),
      JSON.stringify({ groups, allItems }),
      'utf8'
    );
  }

  // for each group, sort the feeds
  // sort the feeds by comparing the isoDate of the first items of each feed
  groups.forEach(([_groupName, groupContent]) => {
    groupContent['contents'].sort((a, b) => byDateSort(a.items[0], b.items[0]));
    groupContent['recentArticles'].sort((a, b) => byDateSort(a, b))
    let filteredArticles = groupContent['recentArticles'].filter(item => (
      item.timestamp ?
        (new Date(item.timestamp)) >= (new Date()).setDate((new Date()).getDate() - (config.numberOfDaysInNewArticles + 1))
        : false)
    );
    if (filteredArticles.length > config.minNumberOfSuggestedPostsInGroup){
      groupContent['recentArticles'] = filteredArticles;
    }
    else {
      groupContent['recentArticles'] = groupContent['recentArticles'].slice(0, config.minNumberOfSuggestedPostsInGroup);
    }
  });

  // remove duplicates from all items
  allItems = allItems.filter((item, index, self) =>
    index === self.findIndex((t) => (
        t.link === item.link
    ))
  );

  // sort `all articles` view
  allItems.sort((a, b) => byDateSort(a, b));

  let recentItems = allItems.filter(item => (
    item.timestamp ?
    (new Date(item.timestamp)) >= (new Date()).setDate((new Date()).getDate() - (config.numberOfDaysInNewArticles+1))
    : false)
  );

  const now = getNowDate(config.timezone_offset).toString();
  const html = template({ recentItems, allItems, groups, now, errors, config });

  writeFileSync(resolve(OUTFILE_PATH), html, { encoding: 'utf8' });
  console.log(`Reader built successfully at: ${OUTFILE_PATH}`);
}

/**
 * utils
 */
function parseDate(item) {
  let date = item
    ? (item.timestamp || item.isoDate || item.pubDate)
    : undefined;

  return date ? new Date(date) : undefined;
}

function byDateSort(dateStrA, dateStrB) {
  const [aDate, bDate] = [parseDate(dateStrA), parseDate(dateStrB)];
  if (!aDate || !bDate) return 0;
  return bDate - aDate;
}

function getNowDate(offset = 0) {
  let d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  d = new Date(utc + (3600000 * offset));
  return d;
}

function readCfg(path) {
  let contents, json;

  try {
    contents = readFileSync(resolve(path), { encoding: 'utf8' });
  } catch (e) {
    console.warn(`Warning: Config at ${path} does not exist`);
    return {};
  }

  try {
    json = JSON.parse(contents);
  } catch (e) {
    console.error('Error: Config is Invalid JSON: ' + path);
    process.exit(1);
  }

  return json;
}


function escapeHtml(html) {
  return html.replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\'', '&apos;')
    .replaceAll('"', '&quot;');
}
