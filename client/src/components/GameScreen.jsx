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

  useEffect(() => {
    if (myHand.length === 0) return
    const chars = myHand.map(t => t.char)
    const found = []
    for (let i = 0; i < chars.length; i++) {
      for (let len = 2; len <= Math.min(7, chars.length - i); len++) {
        found.push(chars.slice(i, i + len).join(''))
      }
    }
    setCandidates([...new Set(found)].slice(0, 16))
  }, [myHand])

  const handleDiscard = () => {
    if (!selectedTile) return
    const isMyTurn = state?.players[state.currentTurn]?.id === myId
    if (!isMyTurn) { setMessage('あなたのターンではありません'); return }
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
        if (idx !== -1) { usedIdx.push(idx); tileIds.push(myHand[idx].id) }
      }
    }
    socket.emit('naki', { tileIds })
    setNakiOptions(null)
  }

  const isMyTurn = state?.players[state.currentTurn]?.id === myId
  const players = state?.players || []
  const myIndex = players.findIndex(p => p.id === myId)

  // 自分を基準に上・左・右を計算
  const opponent = (offset) => {
    if (players.length === 0) return null
    const idx = (myIndex + offset + players.length) % players.length
    return players[idx]
  }

  const topPlayer    = opponent(2)
  const leftPlayer   = opponent(1)
  const rightPlayer  = opponent(3)

  const TileBack = ({ vertical }) => (
    <div className={`tile-back ${vertical ? 'vertical' : ''}`}>語</div>
  )

  const PlayerPanel = ({ player, position }) => {
    if (!player) return null
    const isActive = state?.players[state.currentTurn]?.id === player.id
    const count = state?.handCounts[player.id] || 0
    return (
      <div className={`player-panel ${position} ${isActive ? 'active' : ''}`}>
        <div className="panel-name">{player.name}</div>
        <div className="panel-score">{state?.scores[player.id]}点</div>
        {state?.melds[player.id]?.length > 0 && (
          <div className="panel-melds">
            {state.melds[player.id].map((meld, i) => (
              <span key={i} className="panel-meld">{meld.join('')}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="game-screen">
      <div className="game-layout">

        {/* 上：対面プレイヤー */}
        <div className="area-top">
          <PlayerPanel player={topPlayer} position="top" />
          <div className="opponent-hand">
            {topPlayer && Array(state?.handCounts[topPlayer.id] || 0).fill(0).map((_, i) => (
              <TileBack key={i} />
            ))}
          </div>
          {topPlayer && state?.melds[topPlayer.id]?.length > 0 && (
            <div className="opponent-melds">
              {state.melds[topPlayer.id].map((meld, i) => (
                <span key={i} className="opponent-meld-word">{meld.join('')}</span>
              ))}
            </div>
          )}
        </div>

        {/* 中段：左・中央卓・右 */}
        <div className="area-middle">

          {/* 左プレイヤー */}
          <div className="area-left">
            <PlayerPanel player={leftPlayer} position="left" />
            <div className="opponent-hand-vertical">
              {leftPlayer && Array(state?.handCounts[leftPlayer.id] || 0).fill(0).map((_, i) => (
                <TileBack key={i} vertical />
              ))}
            </div>
          </div>

          {/* 中央卓 */}
          <div className="area-center">
            <div className="table-info">
              <div className="wall-count">{state?.wallCount}<span>枚</span></div>
              <div className="last-discard">
                {state?.lastDiscard
                  ? <div className="tile tile-discard">{state.lastDiscard.char}</div>
                  : <div className="no-discard">-</div>
                }
                {state?.lastDiscard && (
                  <div className="last-discard-label">
                    {state.players.find(p => p.id === state.lastDiscardPlayer)?.name}の捨て牌
                  </div>
                )}
              </div>
            </div>
            <div className={`message-box ${isMyTurn ? 'my-turn' : ''}`}>
              {message}
            </div>
          </div>

          {/* 右プレイヤー */}
          <div className="area-right">
            <PlayerPanel player={rightPlayer} position="right" />
            <div className="opponent-hand-vertical">
              {rightPlayer && Array(state?.handCounts[rightPlayer.id] || 0).fill(0).map((_, i) => (
                <TileBack key={i} vertical />
              ))}
            </div>
          </div>
        </div>

        {/* 下：自分 */}
        <div className="area-bottom">

          {/* 副露済み */}
          {state?.melds[myId]?.length > 0 && (
            <div className="my-melds">
              {state.melds[myId].map((meld, i) => (
                <div key={i} className="my-meld-word">
                  {meld.map((char, j) => (
                    <div key={j} className="tile meld-tile">{char}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* 手牌 */}
          <div className="my-hand">
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

          {/* 自分のプレイヤー情報 */}
          <div className="my-info">
            <span className="my-name">{playerName}</span>
            <span className="my-score">{state?.scores[myId]}点</span>
            {isMyTurn && <span className="turn-indicator">▶ あなたのターン</span>}
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
            <button
              className="action-btn agari-btn"
              onClick={() => socket.emit('agari')}
            >
              アガリ
            </button>
          </div>

          {/* 単語候補 */}
          <div className="candidates-area">
            <span className="candidates-label">単語候補：</span>
            {candidates.map((w, i) => (
              <span key={i} className="candidate">{w}</span>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

export default GameScreen