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
      <li class="monospace"><span class="">${item.timestampFormatted}</span></li>
      <li><a href="#${item.groupName}" class="no-a-style" rel='noopener norefferer nofollow'>#${item.groupName}</a></li>
      ${item.comments ? `
      <li><a href="${item.comments}" target='_blank' rel='noopener norefferer nofollow'>comments</a></li>
      ` : ''
      }
      <li><a href="https://txtify.it/${item.link}" target='_blank' rel='noopener norefferer nofollow'>txtify</a></li>
      <li><a href="https://archive.md/${item.link}" target='_blank' rel='noopener norefferer nofollow'>archive.md</a></li>
      ${item.feedUrl ? `<li><a class="feed-link" href="#feed""><span class="item__feed-url no-a-style monospace" data-textFragment="${new URL(item.feedUrl)}">${new URL(item.feedUrl).hostname}</span></a></li>` : `<li><span href="#${item.groupName}" class="item__feed-url monospace">${(new URL(item.link)).hostname}</span></li>`}
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
          Last updated ${new Intl.DateTimeFormat(config['dateFormatLocale'], {
            dateStyle: 'full',
            timeStyle: 'long',
          }).format(new Date(now)) || ''}.
          <br>Find the code on <a href="https://github.com/lunaluxie/rss-reader">Github</a>.
        </p>
      </footer>
    </div>

    <main>
      <section id="all-articles">
        <h2>all articles</h2>
        ${forEach(allItems.slice(0, config["numberOfArticlesInAllArticles"]), item => article(item, config.dateFormatLocale))}
      </section>

      ${forEach(groups, ([groupName, groupContent]) => `
        <section id="${groupName}">
          <h2>${groupName}</h2>

          <h3> recent articles </h3>
          ${
            forEach(
              groupContent['recentArticles'],
              (item => article(item, config.dateFormatLocale)),
              config.maxNumberOfSuggestedPostsInGroup,
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
                  <small>Latest: ${feed.items.length > 0 ? feed.items[0].timestampFormatted : "N/A"}</small>
                </div>
              </summary>
              ${forEach(feed.items, item => article(item, config.dateFormatLocale))}
            </details>
          `)}
        </section>
      `)}

      <section class="default-text">
        <h2>new articles</h2>
        <p>showing articles from the last ${config.numberOfDaysInNewArticles} ${config.numberOfDaysInNewArticles - 1 ? "days" : "day"}.</p>
        ${forEach(recentItems, item => article(item, config.dateFormatLocale))}

        <h3> feeds </h3>
        ${forEach(groups, ([groupName, groupContent]) => `
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
                  <small>Latest: ${feed.items.length > 0 ? feed.items[0].timestampFormatted : "N/A"}</small>
                </div>
              </summary>
              ${forEach(feed.items, item => article(item, config.dateFormatLocale))}
            </details>
          `)}
        `)}
      </section>


      <script>
        const feedLinks = document.querySelectorAll('.feed-link');
        feedLinks.forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const textFragment = e.target.getAttribute('data-textFragment');
            console.log(textFragment);
            console.log(e.target);
            if (textFragment) {
              console.log(window.location.hash+":~:text="+textFragment);
              window.location.hash = "#:~:text="+textFragment;
              console.log(window.location.hash);
            }
          });
        });
      </script>
    </main>
  </div>
</body>
</html>
`);