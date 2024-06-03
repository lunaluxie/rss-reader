const forEach = (arr, fn, limit) => {
  let str = '';

  if (limit) {
    arr = arr.slice(0, limit);
  }

  arr.forEach(i => str += fn(i) || '');
  return str;
};

const article = (item, dateFormatLocale) => `
  <article class="item">
    <header class="item__header">
      <a href="${item.link}" target='_blank' rel='noopener norefferer nofollow'>
        ${item.title}
      </a>
    </header>

    <small>
      <ul class="article-links">
      <li class="monospace"><span class="">${new Intl.DateTimeFormat(dateFormatLocale).format(new Date(item.timestamp)) || ''}</span></li>
      <li><a href="#${item.groupName}" class="no-a-style" rel='noopener norefferer nofollow'>#${item.groupName}</a></li>
      ${item.comments ? `
      <li><a href="${item.comments}" target='_blank' rel='noopener norefferer nofollow'>comments</a></li>
      ` : ''
      }
      <li><a href="https://txtify.it/${item.link}" target='_blank' rel='noopener norefferer nofollow'>txtify</a></li>
      <li><a href="https://archive.md/${item.link}" target='_blank' rel='noopener norefferer nofollow'>archive.md</a></li>
      ${item.feedUrl ? `<li><span class="item__feed-url no-a-style monospace">${new URL(item.feedUrl).hostname}</span></li>` : `<li><span href="#${item.groupName}" class="item__feed-url monospace">${(new URL(item.link)).hostname}</span></li>`}
      </ul>
    </small>
  </article>
`;

export const template = ({ recentItems, allItems, groups, now, errors, config }) => (`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>🦉 reader</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <div class="app">
    <input type="checkbox" class="menu-btn" id="menu-btn" />
    <label class="menu-label" for="menu-btn"></label>

    <div class="sidebar">
      <header>
        <h1 class="inline" style="user-select: none;">🦉</h1>
        <ul class="group-selector">
          <li><a href="#all-articles">all</a></li>
          <li><a href="#">recent</a></li>
          <br/>
          ${forEach(groups, group => `
            <li><a href="#${group[0]}">${group[0]}</a></li>
          `)}
        </ul>
      </header>

      <footer>
        ${errors.length > 0 ? `
          <h2>Errors</h2>
          <p>There were errors trying to parse these feeds:</p>
          <ul>
          ${forEach(errors, error => `
            <li>${error}</li>
          `)}
          </ul>
        ` : ''
        }

        <p>
          Last updated ${now}. Powered by <a href="https://github.com/lunaluxie/rss-reader">Bubo Reader</a>.
        </p>
      </footer>
    </div>

    <main>
      <section id="all-articles">
        <h2>all articles</h2>
        ${forEach(allItems, item => article(item, config.dateFormatLocale))}
      </section>

      ${forEach(groups, ([groupName, groupContent]) => `
        <section id="${groupName}">
          <h2>${groupName}</h2>

          <h3> recent articles </h3>
          ${
            forEach(
              groupContent['recentArticles'],
              (item => article(item, config.dateFormatLocale)),
              config.numberOfSuggestedPostsInGroup,
            )
          }

          <hr/>

          <h3> feeds </h3>
          ${forEach(groupContent['contents'], feed => `
            <details>
              <summary>
                <span class="feed-title">${feed.title}</span>
                <span class="feed-url">
                  <small>
                    (${feed.feed})
                  </small>
                </span>
                <div class="feed-timestamp">
                  <small>Latest: ${feed.items[0] && new Intl.DateTimeFormat(config.dateFormatLocale).format(new Date(feed.items[0].timestamp))   || ''}</small>
                </div>
              </summary>
              ${forEach(feed.items, item => article(item, config.dateFormatLocale))}
            </details>
          `)}
        </section>
      `)}

        <section class="default-text">
          <h2>new articles</h2>
          <p>Showing articles from the last ${config.numberOfDaysInNewArticles} ${config.numberOfDaysInNewArticles -1 ? "days" : "day"}.</p>
          ${forEach(recentItems, item => article(item, config.dateFormatLocale))}
        </section>
    </main>
  </div>
</body>
</html>
`);