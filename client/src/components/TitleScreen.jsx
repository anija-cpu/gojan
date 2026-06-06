import { useState } from 'react'
import './TitleScreen.css'
import YakuList from './YakuList'
import RuleBook from './RuleBook'

function TitleScreen({ onStart }) {
  const [showYaku, setShowYaku] = useState(false)
  const [showRule, setShowRule] = useState(false)
  return (
    <div className="title-screen">
      <div className="title-overlay">
        <div className="title-logo">
          <h1 className="title-kanji">語雀</h1>
          <p className="title-roman">GOJAN</p>
          <p className="title-sub">ひらがな単語麻雀</p>
        </div>
        <button className="title-btn" onClick={onStart}>
          ゲームを始める
        </button>
        <div className="title-sub-btns">
          <button className="title-yaku-btn" onClick={() => setShowRule(true)}>
            遊び方
          </button>
          <button className="title-yaku-btn" onClick={() => setShowYaku(true)}>
            役一覧
          </button>
        </div>
      </div>
      {showRule && <RuleBook onClose={() => setShowRule(false)} />}
      {showYaku && <YakuList onClose={() => setShowYaku(false)} />}
    </div>
  )
}

export default TitleScreen