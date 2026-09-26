const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;
const MENTION_HTML_REGEX = /<span[^>]*data-mention-id=["']([^"']+)["'][^>]*>(.*?)<\/span>/gi;

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
}

export function renderMentionTokens(content: string) {
  if (!content) return content;

  return content.replace(
    MENTION_TOKEN_REGEX,
    (_match, name: string, userId: string) =>
      `<span data-mention-id="${userId}" data-user-id="${userId}" contenteditable="false" style="display:inline-block;background:rgba(59,130,246,0.12);color:rgb(37,99,235);border-radius:9999px;padding:2px 8px;font-weight:600;">@${name}</span>`
  );
}

export function serializeMentionMarkup(content: string) {
  if (!content) return content;

  return content.replace(MENTION_HTML_REGEX, (_match, userId: string, innerHtml: string) => {
    const name = stripHtml(innerHtml).replace(/^@/, "").trim();
    return `@[${name}](${userId})`;
  });
}

export function replaceMentionLabelsWithTokens(
  content: string,
  mentions: Array<{ id: string; name: string }>
) {
  if (!content || mentions.length === 0) return content;

  return mentions.reduce((nextContent, mention) => {
    const escapedName = mention.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^\\w])@${escapedName}(?=([^\\w]|$))`, "g");

    return nextContent.replace(pattern, (_match, prefix: string) => {
      return `${prefix}@[${mention.name}](${mention.id})`;
    });
  }, content);
}

export function extractMentionTokens(content: string) {
  if (!content) return [];

  return Array.from(content.matchAll(MENTION_TOKEN_REGEX)).map((match) => ({
    name: match[1],
    id: match[2],
  }));
}

export function stripMentionTokens(content: string) {
  if (!content) return content;

  return content.replace(MENTION_TOKEN_REGEX, (_match, name: string) => `@${name}`);
}
