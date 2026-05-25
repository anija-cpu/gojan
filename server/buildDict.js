const fs = require('fs');

const text = fs.readFileSync('./ja_50k.txt', 'utf8');
const lines = text.trim().split('\n');

const validChars = new Set([
  'あいうえおかきくけこさしすせそたちつてとなにぬねの',
  'はひふへほまみむめもやゆよらりるれろわん',
  'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ',
  'ゃゅょっー'
].join('').split(''));

const words = [];

for (const line of lines) {
  const word = line.split(' ')[0].trim();
  if (!word) continue;
  if (word.length < 2 || word.length > 14) continue;
  if ([...word].every(c => validChars.has(c))) {
    words.push(word);
  }
}

const unique = [...new Set(words)];
fs.writeFileSync('./words.json', JSON.stringify(unique, null, 2), 'utf8');
console.log(`辞書完成: ${unique.length}単語`);