/**
 * Lightweight Zero-Dependency XML & RSS 2.0 Parser for Cloudflare Workers Edge Isolates
 */

export interface ParsedRssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
  author?: string;
  category?: string;
}

export function parseRssXml(xmlString: string): ParsedRssItem[] {
  const items: ParsedRssItem[] = [];

  // Match all <item>...</item> or <entry>...</entry> tags
  const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
  const itemMatches = xmlString.match(itemRegex);

  if (!itemMatches) return items;

  for (const itemBlock of itemMatches) {
    const titleMatch = itemBlock.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemBlock.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) ||
                      itemBlock.match(/<link[^>]*href=["']([^"']+)["']/i);
    const descMatch = itemBlock.match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/i);
    const pubDateMatch = itemBlock.match(/<(?:pubDate|updated|published)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:pubDate|updated|published)>/i);
    const guidMatch = itemBlock.match(/<(?:guid|id)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:guid|id)>/i);
    const authorMatch = itemBlock.match(/<(?:author|dc:creator|name)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:author|dc:creator|name)>/i);

    const clean = (str?: string) => {
      if (!str) return '';
      return str
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .trim();
    };

    const title = clean(titleMatch ? titleMatch[1] : '');
    const link = (linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    const description = clean(descMatch ? descMatch[1] : '');
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
    const guid = clean(guidMatch ? guidMatch[1] : link);
    const author = clean(authorMatch ? authorMatch[1] : '');

    if (title) {
      items.push({
        title,
        link,
        description,
        pubDate,
        guid,
        author,
      });
    }
  }

  return items;
}
