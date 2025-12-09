// Holds all rows for the current session
// Each row = [left, right, tag]
const allRows = [];

document.addEventListener('DOMContentLoaded', () => {
  const fileInput   = document.getElementById('tsvFile');
  const previewBox  = document.getElementById('preview');

  const clearBtn    = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      loadTsvAndGenerateRows(text, previewBox);
    };
    reader.readAsText(file, 'utf-8');
  });

  clearBtn.addEventListener('click', () => {
    allRows.length = 0;
    previewBox.value = '';
    fileInput.value = '';
  });

  downloadBtn.addEventListener('click', () => {
    if (allRows.length === 0) {
      alert('No rows to download.');
      return;
    }

    const tsv = rowsToTsv(allRows);
    downloadTextFile(tsv, 'sentences.tsv');
  });
});

/**
 * Parse TSV text (Norwegian \t English [\t tag?])
 * and generate cloze rows for each line.
 */
function loadTsvAndGenerateRows(tsvText, previewBox) {
  allRows.length = 0; // reset previous session

  const lines = tsvText.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue; // skip empty lines

    const cols = line.split('\t');
    if (cols.length < 2) continue; // need at least norsk + english

    const norskRaw   = cols[0];
    const englishRaw = cols[1];
    const tagRaw     = cols[2] ?? '';

    // Clean spaces
    const norsk   = String(norskRaw).trim().replace(/\s+/g, ' ');
    const english = String(englishRaw).trim().replace(/\s+/g, ' ');
    const tag     = String(tagRaw).trim();

    const rowsForSentence = genClozeRows(norsk, english, tag);
    for (const r of rowsForSentence) {
      allRows.push(r);
    }
  }

  updatePreview(previewBox);
}

/**
 * Generates rows like your GEN_CLOZE:
 * 1) norsk   -> english  (with tag)
 * 2) english -> norsk    (no tag)
 * 3) each word masked -> norsk (no tag)
 */
function genClozeRows(norsk, english, tag) {
  const rows = [];
  const words = norsk.split(' ');

  // Row 1: full NO -> EN with tag
  rows.push([norsk, english, tag]);

  // Row 2: full EN -> NO, no tag
  rows.push([english, norsk, '']);

  // Cloze rows: each word replaced by "_"
  for (let i = 0; i < words.length; i++) {
    const maskedWords = [];
    for (let j = 0; j < words.length; j++) {
      maskedWords.push(j === i ? '_' : words[j]);
    }
    const masked = maskedWords.join(' ');
    rows.push([masked, norsk, '']);
  }

  return rows;
}

/**
 * Update preview textarea with current TSV.
 */
function updatePreview(previewEl) {
  if (allRows.length === 0) {
    previewEl.value = '';
    return;
  }
  previewEl.value = rowsToTsv(allRows);
}

/**
 * Convert 2D array to TSV string.
 */
function rowsToTsv(rows) {
  return rows
    .map(cols =>
      cols
        .map(c => sanitizeCell(c))
        .join('\t')
    )
    .join('\n');
}

/**
 * Basic sanitizing: remove newlines/tabs inside cells.
 */
function sanitizeCell(value) {
  return String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\t/g, ' ');
}

/**
 * Trigger a download of a text file.
 */
function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/tab-separated-values;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
