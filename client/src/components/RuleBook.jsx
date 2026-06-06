import './RuleBook.css'

const RULES = [
  {
    icon: '📝',
    title: '単語を作る',
    desc: '配られた牌を並べ替えて、辞書に載っている単語を作ります。すべての牌を単語に組み込んだ状態でアガリとなります。',
  },
  {
    icon: '✂️',
    title: '区切り枠で単語を区切る',
    desc: '牌と牌の間にある区切り枠をタップすることで、単語の区切りを設定できます。区切りごとに1つの単語として判定されます。',
  },
  {
    icon: '🀄',
    title: '鳴き（相手の捨て牌を使う）',
    desc: '相手が捨てた牌を使って単語が作れる場合、「鳴き」ができます。鳴いた単語はそのまま確定し、手牌から使った牌が取り除かれます。',
  },
  {
    icon: '⚡',
    title: 'ロン（相手の捨て牌であがる）',
    desc: '相手が捨てた牌を加えてアガリの形が作れる場合、ロンを宣言できます。区切り線を合わせてロンボタンが表示されたら押してください。',
  },
  {
    icon: '🎲',
    title: 'ツモ（山からの牌であがる）',
    desc: '山から引いた牌を加えてアガリの形が作れる場合、ツモアガリです。区切り線を合わせてアガリボタンを押してください。',
  },
  {
    icon: '🏁',
    title: '勝敗',
    desc: '持ち点が0点以下になったプレイヤーが出た時点でゲーム終了。最も持ち点が多いプレイヤーの勝利です。',
  },
]

function RuleBook({ onClose }) {
  return (
    <div className="rulebook-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rulebook-modal">
        <div className="rulebook-header">
          <h2 className="rulebook-title">遊び方</h2>
          <button className="rulebook-close" onClick={onClose}>✕</button>
        </div>
        <div className="rulebook-body">
          {RULES.map((rule, i) => (
            <div key={i} className="rule-card">
              <div className="rule-top">
                <span className="rule-icon">{rule.icon}</span>
                <span className="rule-num">0{i + 1}</span>
                <span className="rule-title">{rule.title}</span>
              </div>
              <p className="rule-desc">{rule.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RuleBook
