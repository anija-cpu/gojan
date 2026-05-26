const fs = require('fs');
let code = fs.readFileSync('./gameLogic.js', 'utf8');

const oldFindPartition = `function findPartition(chars) {
  if (chars.length === 0) return [];
  for (let start = 0; start < chars.length; start++) {
    for (let len = 2; len <= Math.min(14, chars.length - start); len++) {
      const word = chars.slice(start, start + len).join('');
      if (WORDS.has(word)) {
        const remaining = [...chars.slice(0, start), ...chars.slice(start + len)];
        const rest = findPartition(remaining);
        if (rest !== null) return [word, ...rest];
      }
    }
  }
  return null;
}`;

const newFindPartition = `function calcWordScore(word) {
  const len = word.length;
  if (len >= 7) return 2500;
  const scores = { 2: 300, 3: 500, 4: 800, 5: 1200, 6: 1700 };
  return scores[len] || 0;
}

function findPartition(chars) {
  if (chars.length === 0) return [];
  let bestResult = null;
  let bestScore = -1;
  for (let start = 0; start < chars.length; start++) {
    for (let len = 2; len <= Math.min(14, chars.length - start); len++) {
      const word = chars.slice(start, start + len).join('');
      if (WORDS.has(word)) {
        const remaining = [...chars.slice(0, start), ...chars.slice(start + len)];
        const rest = findPartition(remaining);
        if (rest !== null) {
          const totalScore = calcWordScore(word) + rest.reduce((s, w) => s + calcWordScore(w), 0);
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestResult = [word, ...rest];
          }
        }
      }
    }
  }
  return bestResult;
}`;

if (code.includes('function findPartition')) {
  code = code.replace(oldFindPartition, newFindPartition);
  fs.writeFileSync('./gameLogic.js', code);
  console.log('完了');
} else {
  console.log('findPartitionが見つかりません');
}