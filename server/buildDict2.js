const fs = require('fs');
const path = require('path');

const validChars = new Set(
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょっー'.split('')
);

function isValid(word) {
  if (word.length < 2 || word.length > 14) return false;
  return [...word].every(c => validChars.has(c));
}

function katakanaToHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  ).replace(/ヴ/g, 'ゔ');
}

const wordSet = new Set();

const existing = JSON.parse(fs.readFileSync('./words.json', 'utf8'));
for (const w of existing) {
  if (isValid(w)) wordSet.add(w);
}
console.log(`既存辞書: ${wordSet.size}単語`);

const csvDir = 'C:\\gojan\\server\\node_modules\\mecab-ipadic-seed\\lib\\dict';
console.log('CSVディレクトリ:', csvDir);
console.log('存在確認:', fs.existsSync(csvDir));

const csvFiles = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));
console.log(`CSV: ${csvFiles.length}ファイル`);

for (const file of csvFiles) {
  const lines = fs.readFileSync(path.join(csvDir, file), 'utf8').split('\n');
  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length < 8) continue;
      const surface = cols[0] || '';
      const reading = katakanaToHiragana(cols[11] || '');
      const baseform = cols[10] || '';
      if (isValid(surface)) wordSet.add(surface);
      if (isValid(reading)) wordSet.add(reading);
      if (isValid(baseform)) wordSet.add(baseform);
  }
}

const words = [...wordSet];
fs.writeFileSync('./words.json', JSON.stringify(words, null, 2), 'utf8');
console.log(`辞書完成: ${words.length}単語`);