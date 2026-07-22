async function scrapeCharacter(charName, pageId) {
  const BASE = 'https://w.atwiki.jp/bulletaction/pages';
  const cache = new Map();
  function clean(text) {
    return (text || '')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\n[ \t]*/g, '\n')
      .replace(/[ \t]*\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }
  function isSkip(title) { return ['更新履歴', '修正履歴', 'Menu'].includes(title); }

  function normalizeUrl(href) {
    if (!href) return null;
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) return 'https://w.atwiki.jp' + href;
    return 'https://w.atwiki.jp/bulletaction/' + href;
  }

  async function fetchHtml(url) {
    if (cache.has(url)) return cache.get(url);
    if (typeof window !== 'undefined' && window.__htmlCache?.[url]) {
      cache.set(url, window.__htmlCache[url]);
      return window.__htmlCache[url];
    }
    if (typeof window !== 'undefined' && window.__htmlCacheOnly) {
      throw new Error('Missing cached HTML: ' + url);
    }
    const res = await fetch(url, { credentials: 'include' });
    const html = await res.text();
    cache.set(url, html);
    await new Promise(r => setTimeout(r, 200));
    return html;
  }
  function extractCellText(cell) {
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeName === 'IMG') {
        const src = node.getAttribute('src') || '';
        const m = src.match(/arrow(\d+)\.png/);
        if (m) return m[1];
        return '';
      }
      if (node.nodeName === 'BR') return '\n';
      let s = '';
      node.childNodes.forEach(ch => { s += walk(ch); });
      return s;
    }
    return clean(walk(cell));
  }

  function joinCellLines(text) {
    if (!text) return text;
    return text.split('\n').map(s => s.trim()).filter(Boolean).join('。');
  }

  function splitConcatenatedMoveName(name) {
    if (!name || typeof name !== 'string') return [name];
    if (name.includes('\n')) return name.split('\n').map(s => s.trim()).filter(Boolean);
    const patterns = [
      /^((?:近|遠)(?:屈)?A)(\d*[ABC].*)$/,
      /^(近屈A)(\d*[ABC].*)$/,
      /^(遠屈A)(\d*[ABC].*)$/,
    ];
    for (const re of patterns) {
      const m = name.match(re);
      if (m?.[2]) return [m[1], m[2]];
    }
    return [name];
  }

  function splitMultilineMoveNameObject(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const keys = splitConcatenatedMoveName(k);
      const vals = typeof v === 'string' ? splitConcatenatedMoveName(v) : [v];
      keys.forEach((key, i) => {
        out[normalizeMoveName(key)] = typeof v === 'string'
          ? normalizeMoveName(vals[Math.min(i, vals.length - 1)])
          : normalizeMoveNameField(v);
      });
    }
    return out;
  }

  function joinMultilineFields(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === '技名') continue;
      if (typeof v === 'string') obj[k] = joinCellLines(v);
      else if (v && typeof v === 'object') joinMultilineFields(v);
    }
  }

  function splitMultilineMoveRows(rows) {
    const out = [];
    for (const row of rows) {
      if (row['技名'] != null && typeof row['技名'] === 'object' && !Array.isArray(row['技名'])) {
        joinMultilineFields(row);
        row['技名'] = splitMultilineMoveNameObject(row['技名']);
        out.push(row);
        continue;
      }
      const names = typeof row['技名'] === 'string'
        ? splitConcatenatedMoveName(row['技名'])
        : [row['技名']];
      if (names.length <= 1) {
        if (typeof row['技名'] === 'string') row['技名'] = names[0];
        joinMultilineFields(row);
        out.push(row);
        continue;
      }
      for (const n of names) {
        const copy = { ...row };
        copy['技名'] = n;
        joinMultilineFields(copy);
        out.push(copy);
      }
    }
    return out;
  }

  function normalizeMoveName(name) {
    if (!name) return name;
    // 屈A → 2A など（矢印画像なしのしゃがみ入力）
    if (/^屈(?=[A-Za-z])/.test(name)) return normalizeMoveName('2' + name.slice(1));
    if (/^H屈(?=[A-Za-z])/.test(name)) return normalizeMoveName('H2' + name.slice(2));
    // DhA → DA（しゃがみ入力の h 表記を除去）
    name = name.replace(/Dh(?=[ABC])/g, 'D');
    // 6+A → 6A（テンキー方向とボタンの + を除去）
    name = name.replace(/(\d)\+([ABC])/g, '$1$2');
    // Jp2A → J2A（ジャンプ入力の p 表記を除去）
    name = name.replace(/Jp/g, 'J');
    return name;
  }

  function expandDanmokuRows(rows) {
    let i = 0;
    while (i < rows.length) {
      const name = rows[i]?.['技名'];
      if (typeof name !== 'string') { i++; continue; }
      let prefix = null;
      if (/^(.+?)(\d+)～(\d+)段目$/.test(name)) {
        prefix = name.replace(/(\d+)～(\d+)段目$/, '');
      } else if (/^(.+?)(\d+)段目～(\d+)段目$/.test(name)) {
        prefix = name.replace(/(\d+)段目～(\d+)段目$/, '');
      }
      if (!prefix) { i++; continue; }
      let j = i;
      while (j < rows.length && rows[j]?.['技名'] === name) j++;
      const count = j - i;
      for (let k = 0; k < count; k++) rows[i + k]['技名'] = prefix + (k + 1) + '段目';
      i = j;
    }
  }

  function normalizeMoveNameField(value) {
    if (typeof value === 'string') return normalizeMoveName(value);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[normalizeMoveName(k)] = normalizeMoveNameField(v);
      }
      return out;
    }
    return value;
  }

  function resolveDittoValue(value, prevValue) {
    if (value === '〃') return prevValue !== undefined ? prevValue : value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const out = {};
      const prevObj = prevValue && typeof prevValue === 'object' ? prevValue : {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = resolveDittoValue(v, prevObj[k]);
      }
      return out;
    }
    return value;
  }

  function resolveDittoInRow(row, prevRow) {
    for (const k of Object.keys(row)) {
      if (k === '技名') continue;
      row[k] = resolveDittoValue(row[k], prevRow[k]);
    }
  }

  function sameMoveName(a, b) {
    if (a == null || b == null) return false;
    if (typeof a === 'string' && typeof b === 'string') return a === b;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function resolveDittoRows(rows) {
    let prev = null;
    for (const row of rows) {
      if (prev && sameMoveName(row['技名'], prev['技名'])) {
        resolveDittoInRow(row, prev);
      }
      prev = row;
    }
  }

  function combineMoveNames(values) {
    const parts = [];
    for (const v of values) {
      const n = normalizeMoveName(v);
      if (n && parts[parts.length - 1] !== n) parts.push(n);
    }
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return parts[0] + '-' + parts.slice(1).join('-');
  }

  function parseTable(table) {
    const grid = [];
    const gridCells = []; // keep cell elements for extractCellText
    table.querySelectorAll('tr').forEach((tr, rowIdx) => {
      if (!grid[rowIdx]) grid[rowIdx] = [];
      if (!gridCells[rowIdx]) gridCells[rowIdx] = [];
      let colIdx = 0;
      tr.querySelectorAll('th, td').forEach(cell => {
        while (grid[rowIdx][colIdx] !== undefined) colIdx++;
        const text = extractCellText(cell);
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
        for (let r = 0; r < rowspan; r++) for (let c = 0; c < colspan; c++) {
          const tr_ = rowIdx + r, tc = colIdx + c;
          if (!grid[tr_]) grid[tr_] = [];
          if (!gridCells[tr_]) gridCells[tr_] = [];
          grid[tr_][tc] = text;
          gridCells[tr_][tc] = cell;
        }
        colIdx += colspan;
      });
    });
    if (!grid.length) return { headers: [], rows: [] };
    let headerRowCount = 1;
    if (grid.length > 1) {
      const r0 = grid[0], r1 = grid[1];
      if (r1.some((c, i) => c && r0[i] && c !== r0[i]) || r0.filter(c => !c).length > 0) headerRowCount = 2;
    }
    function buildHeaders(headerRows) {
      const maxCols = Math.max(...headerRows.map(r => r.length));
      const cols = [];
      for (let col = 0; col < maxCols; col++) {
        const parts = [];
        for (const row of headerRows) {
          const val = row[col] || '';
          if (val && parts[parts.length - 1] !== val) parts.push(val);
        }
        if (parts.length <= 1) cols.push(parts[0] || '');
        else {
          let node = {}, cur = node;
          for (let i = 0; i < parts.length - 1; i++) { cur[parts[i]] = {}; cur = cur[parts[i]]; }
          cur[parts[parts.length - 1]] = null;
          cols.push(node);
        }
      }
      return cols;
    }
    const headers = buildHeaders(grid.slice(0, headerRowCount));

    // 技名が複数列ある場合のインデックス
    const wazaIndices = headers.map((h, i) => (typeof h === 'string' && h === '技名') ? i : -1).filter(i => i >= 0);

    function headerKey(header) {
      if (typeof header === 'string') return header || '_empty';
      return JSON.stringify(header);
    }

    function setNested(obj, header, value) {
      if (!value) return;
      if (typeof header === 'string') {
        if (header) obj[header] = value;
        else obj['_col' + Object.keys(obj).length] = value;
      } else {
        const k = Object.keys(header)[0];
        if (!obj[k] || typeof obj[k] !== 'object') obj[k] = {};
        if (header[k] === null) obj[k] = value;
        else setNested(obj[k], header[k], value);
      }
    }

    function merge(a, b) {
      for (const [k, v] of Object.entries(b)) {
        if (k === '技名') continue; // 技名は merge しない
        if (v && typeof v === 'object' && a[k] && typeof a[k] === 'object') merge(a[k], v);
        else if (v) a[k] = v;
      }
    }

    const rows = [];
    const carry = {};
    for (let r = headerRowCount; r < grid.length; r++) {
      const row = grid[r], obj = {};
      let has = false;

      // 技名複数列の処理
      const wazaValues = wazaIndices.map(i => {
        const val = row[i] || '';
        if (val) { carry[i] = val; return val; }
        return carry[i] || '';
      }).filter(Boolean);

      row.forEach((cell, i) => {
        if (wazaIndices.includes(i)) return; // 技名列は後でまとめる
        const header = headers[i];
        const val = cell || '';
        if (val) { has = true; setNested(obj, header, joinCellLines(val)); carry[headerKey(header)] = val; }
        else if (carry[headerKey(header)]) setNested(obj, header, joinCellLines(carry[headerKey(header)]));
      });

      if (wazaIndices.length > 0) {
        const combined = combineMoveNames(wazaValues);
        if (combined) { obj['技名'] = combined; has = true; }
      }

      if (!has) continue;

      // 技名以外の continuation row（多段ヒット等）
      const prev = rows[rows.length - 1];
      const isContinuation = prev && !row[wazaIndices[0]] && !obj['技名'] &&
        Object.keys(obj).some(k => k !== '備考' && !k.startsWith('_col'));
      if (isContinuation) merge(prev, obj);
      else rows.push(obj);
    }
    const expanded = splitMultilineMoveRows(rows);
    rows.splice(0, rows.length, ...expanded);
    for (const row of rows) {
      if (row['技名'] != null) row['技名'] = normalizeMoveNameField(row['技名']);
    }
    expandDanmokuRows(rows);
    resolveDittoRows(rows);
    return { headers, rows };
  }
  function parseHtml(html, url) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const main = doc.querySelector('#wikibody');
    const result = { title: clean(doc.querySelector('h1')?.textContent), url, sections: [], footnotes: {}, subpageLinks: [] };
    let h2 = null, h3 = null, h4 = null;
    if (!main) return result;
    main.querySelectorAll('h2,h3,h4,h5,table,ul,p').forEach(node => {
      const tag = node.tagName.toLowerCase();
      if (tag === 'h2') {
        const t = clean(node.textContent);
        if (isSkip(t)) { h2 = h3 = h4 = null; return; }
        h2 = { title: t, subsections: [], notes: [] };
        result.sections.push(h2); h3 = h4 = null;
      } else if (tag === 'h3' && h2) {
        h3 = { title: clean(node.textContent), subsections: [], tables: [], notes: [] };
        h2.subsections.push(h3); h4 = null;
      } else if (tag === 'h4' && h3) {
        h4 = { title: clean(node.textContent), tables: [], notes: [] };
        h3.subsections.push(h4);
      } else if (tag === 'h5' && h4) {
        h4.subsections = h4.subsections || [];
        h4.subsections.push({ title: clean(node.textContent), tables: [], notes: [] });
      } else if (tag === 'table') {
        const t = parseTable(node);
        const target = (h4?.subsections?.length ? h4.subsections[h4.subsections.length - 1] : h4) || h3 || h2;
        if (target) (target.tables = target.tables || []).push(t);
      } else if (tag === 'ul') {
        const items = [...node.querySelectorAll(':scope > li')].map(li => clean(li.textContent)).filter(Boolean);
        if (!items.length) return;
        const target = h4 || h3 || h2;
        if (target) (target.notes = target.notes || []).push({ type: 'list', items });
      } else if (tag === 'p') {
        const text = clean(node.textContent);
        if (!text) return;
        const target = h4 || h3 || h2;
        if (target) (target.notes = target.notes || []).push({ type: 'paragraph', text });
      }
    });
    main.querySelectorAll('h3').forEach(el => {
      if (clean(el.textContent) !== '必殺技') return;
      let sib = el.nextElementSibling;
      while (sib && !['H2','H3'].includes(sib.tagName)) {
        sib.querySelectorAll('a[href*="/pages/"]').forEach(a => {
          const text = clean(a.textContent);
          const href = a.getAttribute('href');
          if (text && !text.startsWith('*') && href) {
            result.subpageLinks.push({ text, url: normalizeUrl(href) });
          }
        });
        sib = sib.nextElementSibling;
      }
    });
    const fnText = doc.body?.innerText?.split('注釈').pop() || '';
    fnText.split('\n').forEach(line => {
      const m = line.trim().match(/^(\*\d+)\s*(.*)/);
      if (m) result.footnotes[m[1]] = m[2];
    });
    return result;
  }
  function sectionToObj(section) {
    const obj = {};
    if (section.tables?.length) obj.tables = section.tables;
    if (section.notes?.length) obj.notes = section.notes;
    if (section.subsections?.length) {
      obj.subsections = {};
      for (const sub of section.subsections) obj.subsections[sub.title] = sectionToObj(sub);
    }
    return obj;
  }
  const url = BASE + '/' + pageId + '.html';
  const html = await fetchHtml(url);
  const parsed = parseHtml(html, url);
  const charData = { name: charName, pageUrl: url, title: parsed.title, frameData: {}, footnotes: parsed.footnotes };
  for (const sec of parsed.sections) {
    if (!sec.subsections?.length) continue;
    const key = sec.title.includes('フレームデータ') ? 'フレームデータ' : sec.title;
    charData.frameData[key] = charData.frameData[key] || {};
    for (const h3 of sec.subsections) {
      charData.frameData[key][h3.title] = sectionToObj(h3);
      if (h3.title === '必殺技' && parsed.subpageLinks.length) {
        charData.frameData[key][h3.title].pages = {};
        for (const link of parsed.subpageLinks) {
          try {
            const subHtml = await fetchHtml(link.url);
            const subParsed = parseHtml(subHtml, link.url);
            const content = {};
            for (const s of subParsed.sections) {
              if (isSkip(s.title)) continue;
              content[s.title] = {};
              for (const sub of s.subsections || []) content[s.title][sub.title] = sectionToObj(sub);
            }
            charData.frameData[key][h3.title].pages[link.text] = {
              url: link.url, title: subParsed.title, content, footnotes: subParsed.footnotes,
            };
          } catch (e) {
            charData.frameData[key][h3.title].pages[link.text] = {
              url: link.url, title: '', content: {}, footnotes: {}, error: String(e),
            };
          }
        }
      }
    }
  }
  return charData;
}

// expose globally for subsequent CDP calls
if (typeof window !== 'undefined') window.scrapeCharacter = scrapeCharacter;
