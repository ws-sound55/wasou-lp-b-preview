#!/usr/bin/env python3
"""Verify shared navigation without rewriting any HTML (Python stdlib only)."""
import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlsplit

VERSION = '20261125-common-ui1'
NAV = [
    ('なぜファミリー企業', '/family/'),
    ('私たちの想い', '/philosophy/'),
    ('サービス', '/service/'),
    ('ファミリーガバナンス', '/family-governance/'),
    ('セミナー', '/seminar11/'),
    ('コラム', '/column/'),
    ('会社概要', '/company/'),
    ('ご相談・お問い合わせ', '/contact/'),
]
PAGES = [
    'index.html', 'family/index.html', 'philosophy/index.html',
    'service/index.html', 'family-governance/index.html', 'seminar11/index.html',
    'column/index.html', 'column/category/recruitment/index.html',
    'column/family-business-recruiting-concept/index.html',
    'column/family-business-recruiting-message/index.html',
    'column/job-posting-who-persona/index.html',
    'column/recruiting-before-job-posting/index.html',
    'column/why-no-applicants/index.html', 'company/index.html',
    'contact/index.html', 'contact/thanks/index.html', 'consultation.html',
    'privacy.html', 'tokutei.html', 'sitemap/index.html',
]
REDIRECT_HASHES = {
    'ad-a/index.html': '886e30a5270dc7b6f57c701084a837be5247ba68da546aef8dd6826ca1ead05b',
    'ad-b/index.html': '886e30a5270dc7b6f57c701084a837be5247ba68da546aef8dd6826ca1ead05b',
    'seminar6/index.html': '886e30a5270dc7b6f57c701084a837be5247ba68da546aef8dd6826ca1ead05b',
    'governancesaiyouseminar/index.html': 'b7b648608e0502fac685c0f3d30eb98518dacbecef03416592de617117c13423',
    'home/index.html': '017aba7a8e1ed2374727e83dc8e75596842af6b51f48cf0161df85555f318f1f',
}
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
DESKTOP_CLASSES = set('site-desktop-nav desktop-nav family-desktop-nav corporate-desktop-nav column-desktop-nav sitemap-nav'.split())


class Node:
    def __init__(self, tag, attrs=None, parent=None, start=0, open_end=0):
        self.tag, self.attrs, self.parent = tag, dict(attrs or []), parent
        self.start, self.open_end, self.end = start, open_end, open_end
        self.children = []

    def has_class(self, value):
        return value in self.attrs.get('class', '').split()

    def nodes(self, tag=None):
        for child in self.children:
            if isinstance(child, Node):
                if tag is None or child.tag == tag:
                    yield child
                yield from child.nodes(tag)

    def text(self):
        return ''.join(child.text() if isinstance(child, Node) else child for child in self.children)

    def ancestors(self):
        parent = self.parent
        while parent:
            yield parent
            parent = parent.parent


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.root = Node('document')
        self.stack = [self.root]
        self.feed(source)
        self.close()

    def source_offset(self):
        line, col = self.getpos()
        return self.offsets[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self.source_offset()
        node = Node(tag, attrs, self.stack[-1], start, start + len(self.get_starttag_text()))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        end = self.source.find('>', self.source_offset()) + 1
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack[index].end = end
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    def nodes(self, tag=None):
        return list(self.root.nodes(tag))

    def select_class(self, value):
        return [node for node in self.nodes() if node.has_class(value)]


def page_url(file):
    path = '/' + str(file)
    return path[:-10] if path.endswith('index.html') else path


def resolved_path(value, file):
    return urlsplit(urljoin('https://wasou-jinji.jp' + page_url(file), value)).path


def links(node):
    return [(''.join(a.text().split()), a.attrs.get('href')) for a in node.nodes('a')]


def verify_page(root, file):
    errors = []
    def check(condition, message):
        if not condition:
            errors.append(message)
    path = root / file
    if not path.is_file():
        return ['HTML file missing']
    doc = Document(path.read_text(encoding='utf-8'))
    check(not any(m.attrs.get('http-equiv', '').lower() == 'refresh' for m in doc.nodes('meta')), 'normal page became a redirect')
    body = doc.nodes('body')
    check(len(body) == 1 and body[0].has_class('site-menu-enabled'), 'body.site-menu-enabled must exist once')
    desktop = [n for n in doc.nodes('nav') if DESKTOP_CLASSES.intersection(n.attrs.get('class', '').split())]
    check(len(desktop) == 1, 'desktop global navigation must exist once')
    for nav in desktop:
        check(links(nav) == NAV, 'desktop navigation labels/URLs/order differ from TOP')
        check(any(a.tag == 'header' for a in nav.ancestors()), 'desktop navigation must be inside a header')
    mobile = doc.select_class('site-mobile-nav')
    triggers = doc.select_class('site-menu-trigger')
    check(len(mobile) == 1 and mobile[0].tag == 'nav', 'mobile navigation must exist once')
    check(len(triggers) == 1 and triggers[0].tag == 'button', 'menu trigger must exist once')
    for nav in mobile:
        check(links(nav) == [('TOPページ', '/')] + NAV, 'mobile navigation labels/URLs/order differ from TOP')
        check('hidden' in nav.attrs, 'mobile navigation must initially be hidden')
        closes = [n for n in nav.nodes('button') if n.has_class('site-mobile-nav-close')]
        check(len(closes) == 1, 'mobile close button must exist once')
        if len(triggers) == 1:
            check(bool(nav.attrs.get('id')) and triggers[0].attrs.get('aria-controls') == nav.attrs.get('id'), 'menu trigger aria-controls mismatch')
            check(triggers[0].attrs.get('aria-expanded') == 'false', 'menu must initially be collapsed')
    check(not doc.select_class('mobile-nav') and not doc.select_class('menu-button'), 'obsolete duplicate menu remains')
    check(not doc.select_class('sitemap-header'), 'obsolete sitemap site header remains')
    headers = [n for n in doc.nodes('header') if any(i for i in n.nodes('img') if resolved_path(i.attrs.get('src', ''), file) == '/assets/images/logo.png')]
    check(len(headers) == 1, 'one formal-logo site header is required; article/page headers are excluded')
    header_logos = []
    for image in doc.nodes('img'):
        if resolved_path(image.attrs.get('src', ''), file) != '/assets/images/logo.png':
            continue
        ancestors = list(image.ancestors())
        in_header = any(a.tag == 'header' for a in ancestors)
        in_footer = any(a.tag == 'footer' for a in ancestors)
        if not (in_header or in_footer):
            continue
        anchors = [a for a in ancestors if a.tag == 'a']
        check(len(anchors) == 1 and anchors[0].attrs.get('href') == '/', 'formal header/footer logo must link to / without nested anchors')
        if in_header:
            header_logos.append(image)
    check(len(header_logos) == 1, 'header formal logo must exist once')
    tops = doc.select_class('site-page-top')
    check(len(tops) == 1 and tops[0].tag == 'button', 'page-top button must exist once')
    for button in tops:
        check(button.attrs.get('type') == 'button' and bool(button.attrs.get('aria-label')), 'page-top button needs type and accessible label')
    assets = [('link', 'href', '/assets/css/site-menu.css'), ('script', 'src', '/assets/js/site-menu.js'), ('link', 'href', '/assets/css/page-top.css'), ('script', 'src', '/assets/js/page-top.js')]
    for tag, attr, expected in assets:
        found = [n for n in doc.nodes(tag) if resolved_path(n.attrs.get(attr, ''), file) == expected]
        check(len(found) == 1, expected + ' must be loaded once')
        for node in found:
            check(urlsplit(node.attrs[attr]).query == 'v=' + VERSION, expected + ' version mismatch')
            check((root / expected.lstrip('/')).is_file(), expected + ' file missing')
            if tag == 'link':
                check(node.attrs.get('rel') == 'stylesheet', expected + ' must be a stylesheet')
    footer_assets = [n for n in doc.nodes('link') if resolved_path(n.attrs.get('href', ''), file) == '/assets/css/site-footer-nav.css']
    check(len(footer_assets) <= 1, 'footer nav stylesheet duplicated')
    for node in footer_assets:
        check(urlsplit(node.attrs['href']).query == 'v=' + VERSION, 'footer nav stylesheet version mismatch')
    for anchor in doc.nodes('a'):
        if anchor.attrs.get('aria-current') == 'page':
            check(resolved_path(anchor.attrs.get('href', ''), file) == page_url(file), 'aria-current=page points to a different page')
    if file.startswith('column/') and file != 'column/index.html':
        for nav in desktop + mobile:
            column = [a for a in nav.nodes('a') if a.attrs.get('href') == '/column/']
            check(len(column) == 1 and column[0].attrs.get('aria-current') == 'location', 'column child page must mark its section as location, not page')
    for script in doc.nodes('script'):
        if script.attrs.get('type') == 'application/ld+json':
            try:
                data = script.text()
                json.loads(data)
                check('<span' not in data.lower(), 'span markup contaminated JSON-LD')
            except json.JSONDecodeError as error:
                errors.append('invalid JSON-LD: ' + str(error))
    return errors


def run(root):
    failures = {}
    for file in PAGES:
        errors = verify_page(root, file)
        if errors:
            failures[file] = errors
    for file, expected_hash in REDIRECT_HASHES.items():
        path = root / file
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected_hash:
            failures[file] = ['redirect-only HTML differs from approved 2026-11-25 baseline']
        elif not any(n.attrs.get('http-equiv', '').lower() == 'refresh' for n in Document(path.read_text(encoding='utf-8')).nodes('meta')):
            failures[file] = ['redirect meta refresh missing']
    if (root / 'coming-soon').exists():
        failures['coming-soon'] = ['coming-soon must remain absent (404); do not add a normal page']
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--json', action='store_true', help='print a machine-readable result')
    args = parser.parse_args()
    failures = run(args.root.resolve())
    result = {'ok': not failures, 'normal_pages': len(PAGES), 'redirect_pages': len(REDIRECT_HASHES), 'asset_version': VERSION, 'errors': failures}
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        for file, errors in failures.items():
            for error in errors:
                print(f'FAIL {file}: {error}')
        if not failures:
            print(f'PASS: {len(PAGES)} normal pages, {len(REDIRECT_HASHES)} unchanged redirects; assets {VERSION}; coming-soon absent (404).')
    raise SystemExit(bool(failures))


if __name__ == '__main__':
    main()
