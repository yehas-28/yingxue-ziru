const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data');
const OUT_FILE = path.join(OUT_DIR, 'daily-content.json');

const readingFeeds = [
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { name: 'NPR Business', url: 'https://feeds.npr.org/1006/rss.xml' },
  { name: 'NASA News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' }
];

const newsFeeds = [
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' },
  { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' }
];

const fallbackContent = {
  reading: {
    source: 'Fallback Reading',
    title: 'How small habits improve communication',
    summary: 'Small daily habits help learners understand common words, practice useful expressions, and build confidence in real conversations.',
    link: '',
    keywords: ['habits', 'learners', 'practice', 'confidence', 'communication']
  },
  news: {
    source: 'Fallback News',
    title: 'Global leaders discuss climate priorities at a regional summit',
    summary: 'Leaders discussed climate priorities, energy transition, and international cooperation during a regional summit.',
    subtitleZh: '各国领导人在区域峰会上讨论气候优先事项，并强调能源转型和国际合作的重要性。',
    link: '',
    keywords: ['leaders', 'climate', 'priorities', 'energy', 'cooperation']
  }
};

function decodeEntities(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(text) {
  return decodeEntities(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(re);
  return match ? stripHtml(match[1]) : '';
}

function extractKeywords(text) {
  const stop = new Set([
    'about', 'after', 'again', 'also', 'and', 'are', 'because', 'been', 'but', 'can', 'could',
    'for', 'from', 'has', 'have', 'her', 'his', 'how', 'into', 'its', 'more', 'new', 'not',
    'one', 'our', 'out', 'said', 'say', 'she', 'that', 'the', 'their', 'they', 'this',
    'was', 'will', 'with', 'you', 'your'
  ]);
  const words = String(text || '').toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
  const counts = new Map();
  words.forEach(word => {
    if (!stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function parseItems(xml, sourceName) {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return itemBlocks.map(block => {
    const title = firstMatch(block, 'title');
    const summary = firstMatch(block, 'description') || firstMatch(block, 'summary') || firstMatch(block, 'content');
    const linkTag = firstMatch(block, 'link');
    const hrefMatch = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
    const guid = firstMatch(block, 'guid');
    const pubDate = firstMatch(block, 'pubDate') || firstMatch(block, 'updated') || firstMatch(block, 'published');
    return {
      source: sourceName,
      title,
      summary,
      link: hrefMatch ? hrefMatch[1] : (linkTag || guid),
      pubDate,
      keywords: extractKeywords(`${title} ${summary}`)
    };
  }).filter(item => item.title && item.summary);
}

function pickDaily(items, offset = 0) {
  if (!items.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  return items[(day + offset) % items.length];
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Yingxue-Ziru-GitHub-Pages-Updater/1.0' }
    });
    if (!response.ok) throw new Error(`${feed.name} ${response.status}`);
    const xml = await response.text();
    return parseItems(xml, feed.name);
  } finally {
    clearTimeout(timer);
  }
}

async function aggregate(feeds) {
  const results = await Promise.allSettled(feeds.map(fetchFeed));
  return results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
}

function subtitleForNews(item) {
  const source = item.source || '新闻源';
  return `这条新闻来自 ${source}。建议先听英文标题和摘要，再结合关键词复述主要信息。`;
}

async function main() {
  const [readingItems, newsItems] = await Promise.all([
    aggregate(readingFeeds),
    aggregate(newsFeeds)
  ]);

  const reading = pickDaily(readingItems, 0) || fallbackContent.reading;
  const news = pickDaily(newsItems, 3) || fallbackContent.news;

  const content = {
    generatedAt: new Date().toISOString(),
    reading,
    news: {
      ...news,
      subtitleZh: subtitleForNews(news)
    },
    sources: {
      reading: readingFeeds.map(feed => feed.name),
      news: newsFeeds.map(feed => feed.name)
    }
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(content, null, 2), 'utf8');
  console.log(`已更新 ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
