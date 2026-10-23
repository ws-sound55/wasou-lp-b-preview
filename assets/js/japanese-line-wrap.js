/*
 * Japanese line-wrap helper
 * Keeps a 1–2 character orphan line from being left at the end of a heading or paragraph.
 * It never edits source text: at the current viewport it temporarily groups a short tail
 * with several preceding characters, then rebuilds the grouping after a resize.
 */
(() => {
  'use strict';

  const selector = 'h1,h2,h3,h4,p,li,dd,dt,summary,figcaption,label,.article-related .related-grid > a';
  // Wrapping a direct text node in a flex/grid item turns it into a separate
  // layout item in some browsers.  Leave those elements to their own layout
  // and use explicit .jp-keep groups where a phrase needs protection.
  const skip = (element) => {
    if (element.closest('nav,footer') || element.dataset.jpWrapSkip !== undefined) return true;
    const display = window.getComputedStyle(element).display;
    return display.includes('flex') || display.includes('grid');
  };
  const clean = (value) => value.replace(/\s+/g, '');
  const tailSize = 6;

  const unwrap = () => {
    document.querySelectorAll('[data-jp-orphan-tail]').forEach((span) => {
      span.replaceWith(document.createTextNode(span.textContent || ''));
    });
  };

  const characters = (element) => {
    const lines = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue || '';
      for (let offset = 0; offset < text.length; offset += 1) {
        if (/\s/.test(text[offset])) continue;
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) continue;
        const top = Math.round(rect.top * 2) / 2;
        let line = lines.find((item) => Math.abs(item.top - top) < 1);
        if (!line) {
          line = { top, chars: [] };
          lines.push(line);
        }
        line.chars.push({ node, offset, char: text[offset] });
      }
    }
    return lines.sort((a, b) => a.top - b.top);
  };

  const protectOneTail = (element) => {
    const lines = characters(element).filter((line) => clean(line.chars.map((item) => item.char).join('')).length);
    const target = lines.find((line, index) => index > 0 && clean(line.chars.map((item) => item.char).join('')).length <= 2);
    if (!target || target.chars.length === 0) return false;
    const first = target.chars[0];
    if (first.offset < 1) return false;

    const node = first.node;
    const start = Math.max(0, first.offset - tailSize);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, first.offset + target.chars.length);
    try {
      const span = document.createElement('span');
      span.dataset.jpOrphanTail = '';
      span.className = 'jp-orphan-tail';
      range.surroundContents(span);
      return true;
    } catch (_) {
      return false;
    }
  };

  const arrange = () => {
    unwrap();
    document.querySelectorAll(selector).forEach((element) => {
      if (skip(element) || clean(element.textContent || '').length < 10) return;
      // Two passes cover a trailing "す。" plus a new short line created after the first move.
      protectOneTail(element);
      protectOneTail(element);
    });
  };

  let timer;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => requestAnimationFrame(arrange), 110);
  };

  const start = () => {
    schedule();
    if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});
    window.addEventListener('resize', schedule, { passive: true });
  };

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start, { once: true }) : start();
})();
