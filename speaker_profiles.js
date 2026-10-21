const fs = require('fs');
const path = require('path');

/**
 * Speaker Profile Pop-Out Builder
 * -------------------------------
 * Single source of truth for speaker content lives in `agenda.template.html`
 * (the full `.speaker-card-full` articles). This module extracts those
 * articles at BUILD TIME and injects them into the home page so the mini
 * speaker grid can open a full-profile pop-out card.
 *
 * Benefits:
 *  - No duplicated speaker copy across templates (no content drift).
 *  - Works in every artifact: index.html, standalone.html,
 *    website_standalone.html, congreso_turismo_medico_completo.html.
 */

const ROOT = __dirname;

const AGENDA_TEMPLATE_PATH = path.join(ROOT, 'agenda.template.html');
const POPOUT_PLACEHOLDER = '<!-- SPEAKER_POPOUTS -->';
const ARTICLES_PLACEHOLDER = '<!-- SPEAKER_ARTICLES -->';

// Matches a <article class="speaker-card-full" ...> ... </article> block.
// These articles never contain nested <article> elements, so a non-greedy
// match on the closing tag is safe.
const SPEAKER_ARTICLE_REGEX = /<article\b[^>]*\bclass="[^"]*\bspeaker-card-full\b[^"]*"[^>]*>[\s\S]*?<\/article>/gi;
const SPEAKER_ID_REGEX = /\sid="speaker-([a-z0-9-]+)"/i;

/**
 * Extract every full speaker card from an agenda HTML string.
 * @param {string} html
 * @returns {Array<{slug: string, html: string}>}
 */
function extractSpeakerCards(html) {
  if (!html) return [];
  const cards = [];
  const regex = new RegExp(SPEAKER_ARTICLE_REGEX.source, 'gi');
  let match;
  while ((match = regex.exec(html)) !== null) {
    const idMatch = match[0].match(SPEAKER_ID_REGEX);
    if (!idMatch) continue;
    cards.push({ slug: idMatch[1], html: match[0] });
  }
  return cards;
}

/**
 * Build the pop-out article markup for every speaker.
 * IDs are rewritten (`speaker-x` -> `popout-speaker-x`) so the injected
 * copies never collide with the originals that live in the agenda view of
 * the unified single-file build.
 * @param {string} agendaHtml
 * @returns {string}
 */
function buildSpeakerPopouts(agendaHtml) {
  return extractSpeakerCards(agendaHtml)
    .map(({ slug, html }) => {
      let out = html.replace(SPEAKER_ID_REGEX, 'id="popout-speaker-$1"');
      out = out.replace(
        /<article\b([^>]*)\bclass="([^"]*)"/i,
        (full, attrs, cls) => `<article${attrs}class="${cls} speaker-popout-card" data-popout-slug="${slug}"`
      );
      return out;
    })
    .join('\n\n');
}

/**
 * Build the plain speaker articles for a dedicated page (e.g. Facilitadores).
 * Uses the exact same `.speaker-card-full` markup/format as the agenda page.
 * @param {string} agendaHtml
 * @param {string} [idPrefix] Optional prefix for the article ids, so the
 *   injected copies never collide with the agenda view in the unified build.
 * @returns {string}
 */
function buildSpeakerArticles(agendaHtml, idPrefix = '') {
  return extractSpeakerCards(agendaHtml)
    .map(({ slug, html }) => {
      if (!idPrefix) return html;
      return html.replace(SPEAKER_ID_REGEX, `id="${idPrefix}$1"`);
    })
    .join('\n\n');
}

/**
 * Replace the `<!-- SPEAKER_POPOUTS -->` placeholder inside a template.
 * @param {string} templateHtml
 * @param {string} agendaHtml
 * @returns {string}
 */
function injectSpeakerPopouts(templateHtml, agendaHtml) {
  if (!templateHtml || !templateHtml.includes(POPOUT_PLACEHOLDER)) return templateHtml;
  const popouts = buildSpeakerPopouts(agendaHtml);
  return templateHtml.replace(POPOUT_PLACEHOLDER, () => popouts);
}

/**
 * Replace the `<!-- SPEAKER_ARTICLES -->` placeholder inside a template.
 * @param {string} templateHtml
 * @param {string} agendaHtml
 * @param {string} [idPrefix]
 * @returns {string}
 */
function injectSpeakerArticles(templateHtml, agendaHtml, idPrefix = '') {
  if (!templateHtml || !templateHtml.includes(ARTICLES_PLACEHOLDER)) return templateHtml;
  const articles = buildSpeakerArticles(agendaHtml, idPrefix);
  return templateHtml.replace(ARTICLES_PLACEHOLDER, () => articles);
}

/**
 * Convenience wrapper: load agenda.template.html from disk and inject.
 * @param {string} templateHtml
 * @returns {string}
 */
function injectSpeakerPopoutsFromDisk(templateHtml) {
  if (!fs.existsSync(AGENDA_TEMPLATE_PATH)) return templateHtml;
  return injectSpeakerPopouts(templateHtml, fs.readFileSync(AGENDA_TEMPLATE_PATH, 'utf8'));
}

module.exports = {
  POPOUT_PLACEHOLDER,
  ARTICLES_PLACEHOLDER,
  extractSpeakerCards,
  buildSpeakerPopouts,
  buildSpeakerArticles,
  injectSpeakerPopouts,
  injectSpeakerArticles,
  injectSpeakerPopoutsFromDisk,
};
