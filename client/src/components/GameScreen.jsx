import { useState, useEffect } from 'react'
import './GameScreen.css'

function GameScreen({ socket, initialState, playerName }) {
  const [state, setState] = useState(initialState)
  const [myHand, setMyHand] = useState(initialState?.myHand || [])
  const [selectedTile, setSelectedTile] = useState(null)
  const [nakiOptions, setNakiOptions] = useState(null)
  const [message, setMessage] = useState('ゲーム開始！')
  const [candidates, setCandidates] = useState([])

  const myId = socket?.id

  useEffect(() => {
    if (!socket) return

    socket.on('drawn', ({ tile, state }) => {
      setState(state)
      setMyHand(state.myHand)
      if (state.players[state.currentTurn]?.id === myId) {
        setMessage('あなたのターン：牌を1枚捨ててください')
      }
    })

    socket.on('discarded', ({ tile, byPlayerId, state }) => {
      setState(state)
      setMyHand(state.myHand)
      const name = state.players.find(p => p.id === byPlayerId)?.name || ''
      setMessage(`${name} が「${tile.char}」を捨てました`)
    })

    socket.on('naki_available', ({ tile, word }) => {
      setNakiOptions({ tile, word })
      setMessage(`「${word.join('')}」で鳴けます！`)
    })

    socket.on('naki_done', ({ byPlayerId, state }) => {
      setState(state)
      setMyHand(state.myHand)
      setNakiOptions(null)
      const name = state.players.find(p => p.id === byPlayerId)?.name || ''
      setMessage(`${name} が鳴きました`)
    })

    socket.on('agari_failed', (msg) => setMessage(msg))

    socket.on('game_end', ({ winnerId, score, state }) => {
      setState(state)
      const name = state.players.find(p => p.id === winnerId)?.name || ''
      setMessage(`🎉 ${name} のアガリ！ +${score}点`)
    })

    socket.on('ryukyoku', () => setMessage('流局！山牌がなくなりました'))

    return () => {
      socket.off('drawn')
      socket.off('discarded')
      socket.off('naki_available')
      socket.off('naki_done')
      socket.off('agari_failed')
      socket.off('game_end')
      socket.off('ryukyoku')
    }
  }, [socket])

  // 単語候補をリアルタイム計算
  useEffect(() => {
    if (myHand.length === 0) return
    const chars = myHand.map(t => t.char)
    const found = []
    for (let i = 0; i < chars.length; i++) {
      for (let len = 2; len <= Math.min(7, chars.length - i); len++) {
        const word = chars.slice(i, i + len).join('')
        found.push(word)
      }
    }
    setCandidates([...new Set(found)].slice(0, 12))
  }, [myHand])

  const handleDiscard = () => {
    if (!selectedTile) return
    const isMyTurn = state?.players[state.currentTurn]?.id === myId
    if (!isMyTurn) {
      setMessage('あなたのターンではありません')
      return
    }
    socket.emit('discard', { tileId: selectedTile.id })
    setSelectedTile(null)
  }

  const handleNaki = () => {
    if (!nakiOptions) return
    const word = nakiOptions.word
    const tileIds = []
    const usedIdx = []
    for (const char of word) {
      if (char === nakiOptions.tile.char && !tileIds.includes(nakiOptions.tile.id)) {
        tileIds.push(nakiOptions.tile.id)
      } else {
        const idx = myHand.findIndex((t, i) => t.char === char && !usedIdx.includes(i))
        if (idx !== -1) {
          usedIdx.push(idx)
          tileIds.push(myHand[idx].id)
        }
      }
    }
    socket.emit('naki', { tileIds })
    setNakiOptions(null)
  }

  const handleAgari = () => {
    socket.emit('agari')
  }

  const isMyTurn = state?.players[state.currentTurn]?.id === myId

  return (
    <div className="game-screen">
      <div className="game-overlay">

        {/* 上部：プレイヤー情報 */}
        <div className="players-bar">
          {state?.players.map((p, i) => (
            <div key={p.id} className={`player-info ${p.id === myId ? 'me' : ''} ${state.currentTurn === i ? 'active' : ''}`}>
              <span className="player-name">{p.name}</span>
              <span className="player-score">{state.scores[p.id]}点</span>
              <span className="player-tiles">手牌:{state.handCounts[p.id]}</span>
            </div>
          ))}
        </div>

        {/* 中央：メッセージ */}
        <div className="message-area">
          <p className={`message ${isMyTurn ? 'my-turn' : ''}`}>{message}</p>
        </div>

        {/* 副露済み単語 */}
        {state?.melds[myId]?.length > 0 && (
          <div className="melds-area">
            {state.melds[myId].map((meld, i) => (
              <div key={i} className="meld-word">
                {meld.map((char, j) => (
                  <div key={j} className="tile meld-tile">{char}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 手牌 */}
        <div className="hand-area">
          <div className="hand-tiles">
            {myHand.map((tile) => (
              <div
                key={tile.id}
                className={`tile ${selectedTile?.id === tile.id ? 'selected' : ''}`}
                onClick={() => setSelectedTile(tile)}
              >
                {tile.char}
              </div>
            ))}
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="action-area">
          <button
            className="action-btn discard-btn"
            onClick={handleDiscard}
            disabled={!selectedTile || !isMyTurn}
          >
            打牌
          </button>
          {nakiOptions && (
            <button className="action-btn naki-btn" onClick={handleNaki}>
              鳴く「{nakiOptions.word.join('')}」
            </button>
          )}
          <button className="action-btn agari-btn" onClick={handleAgari}>
            アガリ宣言
          </button>
        </div>

        {/* 候補単語 */}
        <div className="candidates-area">
          <p className="candidates-label">単語候補</p>
          <div className="candidates-list">
            {candidates.map((w, i) => (
              <span key={i} className="candidate">{w}</span>
            ))}
          </div>
        </div>

        {/* 山牌残数・捨て牌 */}
        <div className="info-bar">
          <span>残り山牌: {state?.wallCount}枚</span>
          <span>
            最後の捨て牌: {state?.lastDiscard ? `「${state.lastDiscard.char}」` : 'なし'}
          </span>
        </div>

      </div>
    </div>
  )
}

export default GameScreen