const fs = require('fs');
const path = require('path');

const WORDS = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8')));

function buildTiles() {
  const tiles = [];
  let id = 0;
  const basic = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん'.split('');
  for (const c of basic) {
    tiles.push({ id: id++, char: c });
    tiles.push({ id: id++, char: c });
  }
  const voiced = 'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'.split('');
  for (const c of voiced) {
    tiles.push({ id: id++, char: c });
  }
  for (const c of ['ゃ','ゅ','ょ','っ']) {
    tiles.push({ id: id++, char: c });
  }
  tiles.push({ id: id++, char: 'ー' });
  return tiles;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canWin(handChars, melds) {
  const meldWords = melds.map(m => m.join(''));
  for (const w of meldWords) {
    if (!WORDS.has(w)) return false;
  }
  return partition(handChars);
}

function partition(chars) {
  if (chars.length === 0) return true;
  for (let len = 2; len <= Math.min(14, chars.length); len++) {
    const word = chars.slice(0, len).join('');
    if (WORDS.has(word)) {
      if (partition(chars.slice(len))) return true;
    }
  }
  return false;
}

function calcScore(handChars, melds, isMenzen) {
  const allWords = [];
  const handWords = findPartition(handChars);
  if (!handWords) return 0;
  allWords.push(...handWords, ...melds.map(m => m.join('')));

  let score = 0;
  const lengthScore = { 2: 300, 3: 500, 4: 800, 5: 1200, 6: 1700 };
  for (const w of allWords) {
    score += w.length >= 7 ? 2500 : (lengthScore[w.length] || 0);
  }

  if (isMenzen) score += 500;
  if (allWords.some(w => w.length >= 7)) score += 1000;
  if (allWords.length === 2) score += 1500;
  if (allWords.length === 3) score += 800;

  const allChars = allWords.join('').split('');
  if (allWords.length === 7 && allWords.every(w => w.length === 2)) score += 2000;
  if (new Set(allChars).size === allChars.length) score += 3000;
  if (allWords.length === 1 && allWords[0].length === 14) score = 32000;

  return score;
}

function findPartition(chars) {
  if (chars.length === 0) return [];
  for (let len = 2; len <= Math.min(14, chars.length); len++) {
    const word = chars.slice(0, len).join('');
    if (WORDS.has(word)) {
      const rest = findPartition(chars.slice(len));
      if (rest !== null) return [word, ...rest];
    }
  }
  return null;
}

function canNaki(hand, discardChar) {
  const combined = [...hand.map(t => t.char), discardChar];
  for (let len = 3; len <= 4; len++) {
    for (let i = 0; i <= combined.length - len; i++) {
      const subset = combined.slice(i, i + len);
      if (subset.includes(discardChar)) {
        const word = subset.join('');
        if (WORDS.has(word)) return { possible: true, word: subset };
      }
    }
  }
  return { possible: false };
}

module.exports = { buildTiles, shuffle, canWin, calcScore, canNaki, findPartition, WORDS };