import './YakuList.css'

const WORD_SCORES = [
  { len: 2, score: 300 },
  { len: 3, score: 800 },
  { len: 4, score: 1500 },
  { len: 5, score: 3000 },
  { len: 6, score: 5000 },
  { len: 7, score: 8000 },
  { len: 8, score: 9000 },
  { len: 9, score: 10000 },
  { len: 10, score: 15000 },
  { len: 11, score: 18000 },
  { len: 12, score: 22000 },
  { len: 13, score: 26000 },
  { len: 14, score: 32000 },
]

const COMBO_YAKU = [
  { name: 'やくまん', pattern: '14文字1単語', bonus: 32000, desc: '14文字すべて1つの単語でアガリ' },
  { name: 'かいだん', pattern: '2+3+4+5', bonus: 6000, desc: '2・3・4・5文字の単語でアガリ' },
  { name: 'むつー',   pattern: '2+6+6',   bonus: 8000, desc: '2・6・6文字の単語でアガリ' },
  { name: 'さんし',   pattern: '2+4+4+4', bonus: 5000, desc: '2・4・4・4文字の単語でアガリ' },
  { name: 'へいわ',   pattern: '2+3+3+3+3', bonus: 2000, desc: '2・3・3・3・3文字の単語でアガリ' },
  { name: 'ごくう',   pattern: '5+9',     bonus: 12000, desc: '5+9文字の単語でアガリ' },
  { name: 'すごい',   pattern: '3+11',    bonus: 12000, desc: '3+11文字の単語でアガリ' },
  { name: 'しじゅう', pattern: '4+10',    bonus: 12000, desc: '4+10文字の単語でアガリ' },
  { name: 'はむ',     pattern: '6+8',     bonus: 12000, desc: '6+8文字の単語でアガリ' },
]

function YakuList({ onClose, inGame = false }) {
  return (
    <div className={`yaku-overlay ${inGame ? 'in-game' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="yaku-modal">
        <div className="yaku-header">
          <h2 className="yaku-title">役一覧</h2>
          <button className="yaku-close" onClick={onClose}>✕</button>
        </div>

        <div className="yaku-body">
          {/* 単語得点 */}
          <section className="yaku-section">
            <h3 className="yaku-section-title">📝 単語の基本得点</h3>
            <div className="score-grid">
              {WORD_SCORES.map(({ len, score }) => (
                <div key={len} className="score-row">
                  <div className="score-dots-line">{'□'.repeat(Math.min(len, 6))}{len > 6 ? '…' : ''}</div>
                  <div className="score-bottom-line">
                    <span className="score-lennum">{len}文字</span>
                    <span className="score-val">{score.toLocaleString()}<span className="score-unit">点</span></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 特殊文字ボーナス */}
          <section className="yaku-section">
            <h3 className="yaku-section-title">✨ 特殊文字ボーナス</h3>
            <div className="special-bonus-card">
              <div className="special-chars">
                {['が','ぎ','ぐ','げ','ご','ざ','じ','ず','ぜ','ぞ','だ','ぢ','づ','で','ど',
                  'ば','び','ぶ','べ','ぼ','ぱ','ぴ','ぷ','ぺ','ぽ','っ','ゃ','ゅ','ょ'].map(c => (
                  <span key={c} className="special-char-badge">{c}</span>
                ))}
              </div>
              <div className="special-bonus-desc">1文字につき <span className="bonus-num">+500点</span></div>
            </div>
          </section>

          {/* 組み合わせ役 */}
          <section className="yaku-section">
            <h3 className="yaku-section-title">🀄 組み合わせ役</h3>
            <div className="combo-list">
              {COMBO_YAKU.map(y => (
                <div key={y.name} className="combo-card">
                  <div className="combo-top">
                    <span className="combo-name">{y.name}</span>
                    <span className="combo-pattern">{y.pattern}</span>
                    <span className="combo-bonus">+{y.bonus.toLocaleString()}点</span>
                  </div>
                  <div className="combo-desc">{y.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ロン・ツモ説明 */}
          <section className="yaku-section">
            <h3 className="yaku-section-title">🎯 アガリ方</h3>
            <div className="agari-cards">
              <div className="agari-card">
                <span className="agari-label tsumo">ツモ</span>
                <span className="agari-desc">山から引いた牌でアガリ。単語の合計点を全員から受け取る</span>
              </div>
              <div className="agari-card">
                <span className="agari-label ron">ロン</span>
                <span className="agari-desc">相手の捨て牌でアガリ。区切り線を合わせてロンボタンを押す</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default YakuList
