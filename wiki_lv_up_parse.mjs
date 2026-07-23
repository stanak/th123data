/** Browser-side parser for 必殺技レベルアップ効果 tables (passed to page.evaluate). */
export const PARSE_LV_UP_EFFECTS_JS = `(() => {
  function trimCell(text) {
    return (text || '')
      .replace(/[ \\t\\f\\v]+/g, ' ')
      .replace(/\\n[ \\t]*/g, '\\n')
      .replace(/[ \\t]*\\n/g, '\\n')
      .replace(/\\n{2,}/g, '\\n')
      .trim();
  }
  function extractCellText(cell) {
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeName === 'BR') return '\\n';
      let s = '';
      node.childNodes.forEach((ch) => { s += walk(ch); });
      return s;
    }
    return trimCell(walk(cell));
  }
  function joinCellLines(text) {
    if (!text) return '';
    return text.split('\\n').map((s) => s.trim()).filter(Boolean).join('。');
  }
  function headerLabel(header) {
    if (typeof header === 'string') return header;
    return JSON.stringify(header);
  }
  function isNameHeader(header) {
    return header === '技名' || header === 'コマンド';
  }
  function parseTable(table) {
    const grid = [];
    table.querySelectorAll('tr').forEach((tr, rowIdx) => {
      if (!grid[rowIdx]) grid[rowIdx] = [];
      let colIdx = 0;
      tr.querySelectorAll('th, td').forEach((cell) => {
        while (grid[rowIdx][colIdx] !== undefined) colIdx++;
        const text = extractCellText(cell);
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
        for (let r = 0; r < rowspan; r++) {
          for (let c = 0; c < colspan; c++) {
            const tr_ = rowIdx + r;
            const tc = colIdx + c;
            if (!grid[tr_]) grid[tr_] = [];
            grid[tr_][tc] = text;
          }
        }
        colIdx += colspan;
      });
    });
    if (!grid.length) return { headers: [], rows: [] };
    let headerRowCount = 1;
    if (grid.length > 1) {
      const r0 = grid[0];
      const r1 = grid[1];
      if (r1.some((c, i) => c && r0[i] && c !== r0[i]) || r0.filter((c) => !c).length > 0) headerRowCount = 2;
    }
    function buildHeaders(headerRows) {
      const maxCols = Math.max(...headerRows.map((r) => r.length));
      const cols = [];
      for (let col = 0; col < maxCols; col++) {
        const parts = [];
        for (const row of headerRows) {
          const val = row[col] || '';
          if (val && parts[parts.length - 1] !== val) parts.push(val);
        }
        if (parts.length <= 1) cols.push(parts[0] || '');
        else {
          let node = {};
          let cur = node;
          for (let i = 0; i < parts.length - 1; i++) {
            cur[parts[i]] = {};
            cur = cur[parts[i]];
          }
          cur[parts[parts.length - 1]] = null;
          cols.push(node);
        }
      }
      return cols;
    }
    const headers = buildHeaders(grid.slice(0, headerRowCount));
    function setNested(obj, header, value) {
      if (!value) return;
      if (typeof header === 'string') {
        if (header) obj[header] = value;
      } else {
        const keys = Object.keys(header);
        if (keys.length === 1) {
          const k = keys[0];
          if (!obj[k] || typeof obj[k] !== 'object') obj[k] = {};
          const sub = header[k];
          if (sub === null) obj[k] = value;
          else setNested(obj[k], sub, value);
        }
      }
    }
    function getNested(obj, header) {
      if (typeof header === 'string') return obj[header];
      const keys = Object.keys(header);
      if (keys.length !== 1) return undefined;
      const k = keys[0];
      const sub = header[k];
      if (sub === null) return obj[k];
      if (obj[k] && typeof obj[k] === 'object') return getNested(obj[k], sub);
      return undefined;
    }
    const rows = [];
    let carry = {};
    for (let r = headerRowCount; r < grid.length; r++) {
      const row = grid[r];
      const obj = {};
      let has = false;
      row.forEach((cell, colIdx) => {
        const header = headers[colIdx];
        const value = cell || '';
        if (value) {
          has = true;
          setNested(obj, header, value);
          if (isNameHeader(header) || (typeof header === 'string' && ['Lv1', 'Lv2', 'Lv3', 'LvMAX'].includes(header))) {
            carry[colIdx] = value;
          }
        } else if (carry[colIdx] && isNameHeader(header)) {
          setNested(obj, header, carry[colIdx]);
        }
      });
      if (obj['技名']) {
        for (const key of Object.keys(carry)) {
          const header = headers[Number(key)];
          if (!isNameHeader(header)) delete carry[key];
        }
      }
      if (has) rows.push(obj);
    }
    return { headers, rows };
  }
  const main = document.querySelector('#wikibody');
  if (!main) return { error: 'no wikibody' };
  let targetTable = null;
  for (const h of main.querySelectorAll('h2,h3,h4')) {
    const title = (h.textContent || '').replace(/\\s+/g, ' ').trim();
    if (title !== '必殺技レベルアップ効果') continue;
    let el = h.nextElementSibling;
    while (el && !/^H[234]$/.test(el.tagName)) {
      if (el.tagName === 'TABLE') {
        targetTable = el;
        break;
      }
      el = el.nextElementSibling;
    }
    break;
  }
  if (!targetTable) return { error: 'table not found' };
  const parsed = parseTable(targetTable);
  const LV_KEYS = { Lv1: '1', Lv2: '2', Lv3: '3', LvMAX: '4' };
  const moves = {};
  for (const row of parsed.rows) {
    const name = row['技名'];
    if (!name) continue;
    const normalizedName = trimCell(name).replace(/\\n/g, '').replace(/\\(\\*\\d+\\)/g, '').replace(/-+$/g, '').trim();
    const levels = {};
    for (const [src, dst] of Object.entries(LV_KEYS)) {
      let raw = row[src];
      if (raw == null && row['レベル毎追加効果'] && typeof row['レベル毎追加効果'] === 'object') {
        raw = row['レベル毎追加効果'][src];
      }
      if (!raw || raw === '-') continue;
      levels[dst] = joinCellLines(raw);
    }
    if (Object.keys(levels).length) moves[normalizedName] = levels;
  }
  return { moves, rowCount: parsed.rows.length };
})()`;
