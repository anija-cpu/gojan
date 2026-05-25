import './TitleScreen.css'

function TitleScreen({ onStart }) {
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
      </div>
    </div>
  )
}

export default TitleScreen