/**
 * Lightweight HTML sanitizer for previewing admin-authored HTML content.
 *
 * Strips dangerous elements (script, iframe, object, embed, form, etc.)
 * and event handler attributes (onclick, onerror, onload, etc.) to prevent
 * stored XSS even if an admin account is compromised.
 *
 * For full-featured sanitization, consider using DOMPurify.
 */

/** Tags that are never safe to render in a preview context. */
const DANGEROUS_TAGS =
  /(<\s*\/?\s*(script|iframe|object|embed|form|link|meta|base|applet|svg\s+[^>]*on\w+)[^>]*>)/gi;

/** Event handler attributes (onclick, onerror, onload, etc.). */
const EVENT_HANDLERS = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

/** javascript: / data: / vbscript: protocol in href/src/action attributes. */
const DANGEROUS_PROTOCOLS =
  /(href|src|action)\s*=\s*["']?\s*(javascript|data|vbscript)\s*:/gi;

export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, "")
    .replace(EVENT_HANDLERS, "")
    .replace(DANGEROUS_PROTOCOLS, '$1=""');
}
