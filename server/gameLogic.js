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
  // 全ての開始位置から試す
  for (let start = 0; start < chars.length; start++) {
    for (let len = 2; len <= Math.min(14, chars.length - start); len++) {
      const word = chars.slice(start, start + len).join('');
      if (WORDS.has(word)) {
        const remaining = [...chars.slice(0, start), ...chars.slice(start + len)];
        if (partition(remaining)) return true;
      }
    }
  }
  return false;
}

const SPECIAL_CHARS = new Set('がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉっゃゅょ')

function calcWordScore(word) {
  const lengthScore = {
    2: 300, 3: 800, 4: 1500, 5: 3000, 6: 5000,
    7: 8000, 8: 9000, 9: 10000, 10: 15000,
    11: 18000, 12: 22000, 13: 26000, 14: 32000
  }
  const base = lengthScore[word.length] || 0
  const specialBonus = [...word].filter(c => SPECIAL_CHARS.has(c)).length * 500
  return base + specialBonus
}

function calcScore(handChars, melds, isMenzen) {
  // 天和チェック
  if (handChars.length === 14 && melds.length === 0) {
    const word = handChars.join('')
    if (WORDS.has(word)) return 32000
  }

  const allWords = []
  const handWords = findPartition(handChars)
  if (!handWords) return 0
  allWords.push(...handWords, ...melds.map(m => m.join('')))

  let score = allWords.reduce((s, w) => s + calcWordScore(w), 0)

  // 組み合わせボーナス
  const lengths = allWords.map(w => w.length).sort((a, b) => a - b)
  const key = lengths.join(',')

  const bonuses = {
    '2,3,3,3,3': 2000,   // へいわ
    '2,3,4,5':   6000,   // かいだん
    '2,4,4,4':   5000,   // さんし
    '2,6,6':     8000,   // むつー
    '6,8':       12000,  // はむ
    '5,9':       12000,  // ごくう
    '4,10':      12000,  // しじゅう
    '3,11':      12000,  // ごくう
  }

  if (bonuses[key]) score += bonuses[key]

  return score
}

function findPartition(chars) {
  if (chars.length === 0) return []
  let bestResult = null
  let bestScore = -1
  for (let start = 0; start < chars.length; start++) {
    for (let len = 2; len <= Math.min(14, chars.length - start); len++) {
      const word = chars.slice(start, start + len).join('')
      if (WORDS.has(word)) {
        const remaining = [...chars.slice(0, start), ...chars.slice(start + len)]
        const rest = findPartition(remaining)
        if (rest !== null) {
          const totalScore = calcWordScore(word) + rest.reduce((s, w) => s + calcWordScore(w), 0)
          if (totalScore > bestScore) {
            bestScore = totalScore
            bestResult = [word, ...rest]
          }
        }
      }
    }
  }
  return bestResult
}

function canRon(hand, discardChar, melds) {
  const handChars = hand.map(t => t.char);
  return canWin([...handChars, discardChar], melds);
}

function calcRonScore(hand, discardChar, melds) {
  const handChars = hand.map(t => t.char);
  const isMenzen = melds.length === 0;
  return calcScore([...handChars, discardChar], melds, isMenzen);
}

function canNaki(hand, discardChar) {
  const combined = [...hand.map(t => t.char), discardChar];
  const results = [];
  const seen = new Set();

  for (let len = 3; len <= 4; len++) {
    for (let i = 0; i <= combined.length - len; i++) {
      const subset = combined.slice(i, i + len);
      if (subset.includes(discardChar)) {
        const word = subset.join('');
        if (WORDS.has(word) && !seen.has(word)) {
          seen.add(word);
          results.push({ word: subset });
        }
      }
    }
  }

  if (results.length === 0) return { possible: false, candidates: [] };
  return { possible: true, candidates: results };
}

module.exports = { buildTiles, shuffle, canWin, calcScore, canNaki, canRon, calcRonScore, findPartition, WORDS };