import plistlib
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import json
from multiprocessing import Pool
import pandas as pd
from typing import Union
import argparse
import json
import os



def get_bookmark_urls(bookmark_path, folder_name):
    with open(bookmark_path, "rb") as f:
        pl = plistlib.load(f, fmt=plistlib.FMT_BINARY)
        folders = pl["Children"]

        blog_urls = []
        for folder in folders:
            if folder.get("Children") != None and folder["Title"] == folder_name:
                for bookmark in folder["Children"]:
                    blog_urls.append(bookmark["URLString"])
    return blog_urls


def find_rss_feeds_at_url(url):
    response = requests.get(url,)
    html_content = response.text

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    # Find all <link> tags with rel="alternate"
    feed_links = []
    for link in soup.find_all('link', rel='alternate'):
        type_attr = link.get('type', '')
        if 'rss' in type_attr or 'atom' in type_attr:
            feed_url = urljoin(url, link.get('href'))
            feed_links.append(feed_url)

    if feed_links:
        return feed_links[0]

    return "None"


def main(args):
    blog_urls = get_bookmark_urls(args.bookmark_path, args.blogs_folder)


    if args.cache and os.path.exists(args.cache):
        if args.verbose: print(f"Reading {args.cache}")
        known_blogs = pd.read_csv(args.cache, header=0)["Blog URL"].tolist()
        blog_urls = [url for url in blog_urls if url not in known_blogs]

    if args.verbose: print(f"Found {len(blog_urls)} new blog URLs.")

    if len(blog_urls) == 0:
        return 0

    with Pool(8) as p:
        if args.verbose: print(f"Retrieving feeds.")
        feeds = p.map(find_rss_feeds_at_url, blog_urls)

    if args.verbose:
        feeds_found = [feed for feed in feeds if feed]
        print(f"Found {len(feeds_found)}/{len(blog_urls)} feeds.")

    if args.cache:
        if args.verbose: print(f"Saving cache to {args.cache}")
        pd.DataFrame({
            "Blog URL": blog_urls,
            "Feed URL": feeds
        }).to_csv(args.cache, index=False, mode='a' if os.path.exists(args.cache) else 'w', header=False if os.path.exists(args.cache) else True)

    if args.verbose: print(f"Updating {args.feeds}")

    with open(args.feeds, "r") as json_file:
        data = json.load(json_file)

    feeds = [feed for feed in feeds if feed!="None"]
    data[args.blogs_folder.lower()] = list(set(feeds) | set(data[args.blogs_folder.lower()])) if args.blogs_folder.lower() in data else feeds


    with open(args.feeds, "w+") as json_file:
        json.dump(data, json_file, indent=4, sort_keys = False)



    return 0




if __name__ == '__main__':

    # run with
    # python3 import_safari_bookmarks_as_feeds.py src/feeds.json -v -c feeds.csv

    parser = argparse.ArgumentParser("Get RSS feeds from Safari bookmarks.")

    parser.add_argument('feeds', help="Path to feeds.json file.")

    parser.add_argument("-c", "--cache", default="feeds.csv", type=str, help="Path to csv file of feed urls to diff against to avoid revisiting sites already known.")
    parser.add_argument("--cpu", help="Number of cores to use for retrieving the urls.", default=None, type=Union[int,None])
    parser.add_argument("--blogs_folder", help="Name of the folder in Safari where the blog bookmarks are stored.", default="Blogs")
    parser.add_argument("--bookmark_path", help="Path to the Safari bookmarks file.", default="/Users/lunalux/Library/Safari/Bookmarks.plist")
    parser.add_argument("-v", "--verbose",action="count", help="Print verbose output.")
    args = parser.parse_args()

    main(args)
