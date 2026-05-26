import { useState, useEffect, useRef } from 'react'
import './GameScreen.css'

function GameScreen({ socket, initialState, firstDraw, playerName }) {
  const [state, setState] = useState(initialState)
  const [myHand, setMyHand] = useState(() => {
    if (firstDraw) {
      return (firstDraw.state.myHand || []).filter(t => t.id !== firstDraw.tile.id)
    }
    return initialState?.myHand?.filter(t => t !== undefined) || []
  })
  const [drawnTile, setDrawnTile] = useState(firstDraw?.tile || null)
  const [selectedTile, setSelectedTile] = useState(null)
  const [nakiOptions, setNakiOptions] = useState(null)
  const [message, setMessage] = useState('ゲーム開始！')
  const [dragIdx, setDragIdx] = useState(null)
  const [dragArea, setDragArea] = useState(null)
  const [spaces, setSpaces] = useState(new Set())
  const [gameOver, setGameOver] = useState(null)


  const myId = socket?.id
  const handRef = useRef(myHand)
  handRef.current = myHand
  const myIdRef = useRef(myId)
  myIdRef.current = myId

  useEffect(() => {
    if (!socket) return

socket.on('drawn', ({ tile, state }) => {
  console.log('drawn受信:', tile, state.myHand.length)
      setState(state)
      setDrawnTile(tile)
      setMyHand(prev => {
        const handWithoutDrawn = state.myHand.filter(t => t.id !== tile.id)
        if (prev.length === 0) return handWithoutDrawn
        const prevIds = prev.map(t => t.id)
        const ordered = prevIds
          .filter(id => handWithoutDrawn.some(t => t.id === id))
          .map(id => handWithoutDrawn.find(t => t.id === id))
        const newTiles = handWithoutDrawn.filter(t => !prevIds.includes(t.id))
        return [...ordered, ...newTiles]
      })
      if (state.players[state.currentTurn]?.id === myIdRef.current) {
        setMessage('あなたのターン：牌を1枚捨ててください')
      }
    })

    socket.on('discarded', ({ tile, byPlayerId, state }) => {
      setState(state)
      // 自分が打牌した後：ツモ牌を手牌に組み込み済みなので何もしない
      if (byPlayerId !== myId) {
        // 他人が打牌：手牌枚数はそのまま
      }
      const name = state.players.find(p => p.id === byPlayerId)?.name || ''
      setMessage(`${name} が「${tile.char}」を捨てました`)
    })

    socket.on('naki_available', ({ tile, candidates }) => {
      setNakiOptions({ tile, candidates })
      setMessage(`鳴けます！単語を選んでください`)
    })

    socket.on('naki_done', ({ byPlayerId, state }) => {
      setState(state)
      if (byPlayerId === myId) {
        setMyHand(state.myHand)
        setDrawnTile(null)
        setSpaces(new Set())
      }
      setNakiOptions(null)
      const name = state.players.find(p => p.id === byPlayerId)?.name || ''
      setMessage(`${name} が鳴きました`)
    })

    socket.on('agari_failed', (msg) => setMessage(msg))

    socket.on('game_end', ({ winnerId, score, agariWords, state }) => {
      setState(state)
      const name = state.players.find(p => p.id === winnerId)?.name || ''
      setMessage(`🎉 ${name} のアガリ！ +${score}点`)
      setGameOver({ winnerId, score, agariWords: agariWords || [], state })
    })

    socket.on('ryukyoku', () => setMessage('流局！山牌がなくなりました'))
    socket.on('next_round_start', ({ state, firstDraw: fd }) => {
      setState(state)
      setMyHand(fd ? (state.myHand || []).filter(t => t.id !== fd.tile.id) : state.myHand || [])
      setDrawnTile(fd?.tile || null)
      setSpaces(new Set())
      setGameOver(null)
      setMessage(`第${state.round}局 開始！`)
    })

    return () => {
      socket.off('drawn')
      socket.off('discarded')
      socket.off('naki_available')
      socket.off('naki_done')
      socket.off('agari_failed')
      socket.off('game_end')
      socket.off('ryukyoku')
      socket.off('next_round_start')
    }
  }, [socket])

  // ドラッグ並び替え（手牌エリア内）
  const handleDragStart = (idx, area) => {
    setDragIdx(idx)
    setDragArea(area)
  }

const handleDragOver = (e, idx, area) => {
    e.preventDefault()
    if (dragArea === null) return
    if (dragArea === 'drawn' && area === 'hand') {
      if (!drawnTile) return
      const newHand = [...myHand]
      newHand.splice(idx, 0, drawnTile)
      setMyHand(newHand)
      setDrawnTile(null)
      setDragIdx(idx)
      setDragArea('hand')
      return
    }
    if (dragArea !== 'hand' || area !== 'hand') return
    if (dragIdx === idx) return
    const newHand = [...myHand]
    const [moved] = newHand.splice(dragIdx, 1)
    newHand.splice(idx, 0, moved)
    setMyHand(newHand)
    setSpaces(prev => {
      const next = new Set()
      for (const s of prev) {
        if (dragIdx < idx) {
          if (s > dragIdx && s <= idx) {
            next.add(s - 1)
          } else {
            next.add(s)
          }
        } else {
          if (s > idx && s <= dragIdx) {
            next.add(s + 1)
          } else {
            next.add(s)
          }
        }
      }
      return next
    })
    setDragIdx(idx)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDragArea(null)
  }

  // ツモ牌を手牌に組み込む（ドラッグ）
  const handleDropIntoHand = (e, idx) => {
    e.preventDefault()
    if (dragArea !== 'drawn' || !drawnTile) return
    const newHand = [...myHand]
    newHand.splice(idx, 0, drawnTile)
    setMyHand(newHand)
    setDrawnTile(null)
    setDragIdx(null)
    setDragArea(null)
  }

  // スペース追加・削除（牌の右側）
  const toggleSpace = (pos) => {
    setSpaces(prev => {
      const next = new Set(prev)
      if (next.has(pos)) {
        next.delete(pos)
      } else {
        next.add(pos)
      }
      return next
    })
  }

  // 打牌
  const handleDiscard = (tile, fromDrawn = false) => {
    const isMyTurn = state?.players[state.currentTurn]?.id === myId
    if (!isMyTurn) { setMessage('あなたのターンではありません'); return }

    if (fromDrawn) {
      // ツモ切り
      socket.emit('discard', { tileId: tile.id })
      setDrawnTile(null)
} else {
      // 手牌から打牌
      socket.emit('discard', { tileId: tile.id })
      const discardIdx = myHand.findIndex(t => t.id === tile.id)
      setMyHand(prev => prev.filter(t => t.id !== tile.id))
      // ツモ牌を打牌した位置に挿入
      if (drawnTile) {
        setMyHand(prev => {
          const newHand = [...prev]
          const insertIdx = Math.min(discardIdx, newHand.length)
          newHand.splice(insertIdx, 0, drawnTile)
          return newHand
        })
        setDrawnTile(null)
        // 区切り位置を補正（打牌位置より右の区切りはそのまま）
        setSpaces(prev => {
          const next = new Set()
          for (const s of prev) {
            if (s <= discardIdx) next.add(s)
            else next.add(s) // ツモ牌が同じ位置に入るのでずれない
          }
          return next
        })
      } else {
        // ツモ牌なし：打牌位置より右の区切りを1つ左にずらす
        setSpaces(prev => {
          const next = new Set()
          for (const s of prev) {
            if (s <= discardIdx) next.add(s)
            else next.add(s - 1)
          }
          return next
        })
      }
    }
    setSelectedTile(null)
  }

const handleNaki = (word) => {
    const tileIds = []
    const usedIdx = []
    const allHand = drawnTile ? [...myHand, drawnTile] : [...myHand]
    for (const char of word) {
      if (char === nakiOptions.tile.char && !tileIds.includes(nakiOptions.tile.id)) {
        tileIds.push(nakiOptions.tile.id)
      } else {
        const idx = allHand.findIndex((t, i) => t.char === char && !usedIdx.includes(i))
        if (idx !== -1) { usedIdx.push(idx); tileIds.push(allHand[idx].id) }
      }
    }
    socket.emit('naki', { tileIds })
    setNakiOptions(null)
  }

  const isMyTurn = state?.players[state.currentTurn]?.id === myId
  const players = state?.players || []
  const myIndex = players.findIndex(p => p.id === myId)
  const playerCount = players.length

  // 2人：対面に表示
  // 3人：右と対面に表示
  // 4人：左・対面・右に表示
  const topPlayer   = playerCount >= 2 ? players[(myIndex + Math.floor(playerCount / 2)) % playerCount] : null
  const rightPlayer = playerCount >= 3 ? players[(myIndex + 1) % playerCount] : null
  const leftPlayer  = playerCount >= 4 ? players[(myIndex + 3) % playerCount] : null
  
  const TileBack = ({ vertical }) => (
    <div className={`tile-back ${vertical ? 'vertical' : ''}`}>語</div>
  )

  const PlayerPanel = ({ player, position }) => {
    if (!player) return null
    const isActive = state?.players[state.currentTurn]?.id === player.id
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

  const DiscardRiver = ({ playerId, direction }) => {
    const discards = state?.discardsByPlayer?.[playerId] || []
    return (
      <div className={`river river-${direction}`}>
        {discards.map((tile, i) => (
          <div
            key={i}
            className={`river-tile ${tile.id === state?.lastDiscard?.id ? 'river-last' : ''}`}
          >
            {tile.char}
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <>
      {gameOver && (
        <div className="result-overlay">
          <div className="result-box">
            <h2 className="result-title">
              {gameOver.state.players.find(p => p.id === gameOver.winnerId)?.name} のアガリ！
            </h2>

            {/* アガリ単語表示 */}
            {gameOver.agariWords.length > 0 && (
              <div className="agari-words">
                {gameOver.agariWords.map((word, i) => (
                  <div key={i} className="agari-word">
                    {word.split('').map((char, j) => (
                      <div key={j} className="agari-char">
                        {char}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="result-score-big">
              +{gameOver.score}点
            </div>

            {/* 点数一覧 */}
            <div className="result-scores">
              {gameOver.state.players.map(p => (
                <div key={p.id} className={`result-player ${p.id === gameOver.winnerId ? 'winner' : ''}`}>
                  <span className="result-name">{p.id === gameOver.winnerId ? '🏆 ' : ''}{p.name}</span>
                  <span className="result-score">{gameOver.state.scores[p.id]}点</span>
                </div>
              ))}
            </div>

            {/* 次局 or 終了 */}
            <div className="result-buttons">
              {gameOver.state.players[0]?.id === socket?.id &&
                <button className="result-btn next-btn" onClick={() => {
                  socket.emit('next_round')
                }}>
                  次の局へ
                </button>
              }
              <button className="result-btn" onClick={() => {
                setGameOver(null)
                window.location.reload()
              }}>
                ロビーに戻る
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="game-screen">
        <div className="game-layout">

          {/* 上：対面 */}
          <div className="area-top">
            <PlayerPanel player={topPlayer} position="top" />
            <div className="opponent-hand">
              {topPlayer && Array(state?.handCounts[topPlayer.id] || 0).fill(0).map((_, i) => (
                <TileBack key={i} />
              ))}
            </div>
            {topPlayer && <DiscardRiver playerId={topPlayer.id} direction="top" />}
          </div>

          {/* 中段 */}
          <div className="area-middle">
            <div className="area-left">
              <PlayerPanel player={leftPlayer} position="left" />
              <div className="opponent-hand-vertical">
                {leftPlayer && Array(state?.handCounts[leftPlayer.id] || 0).fill(0).map((_, i) => (
                  <TileBack key={i} vertical />
                ))}
              </div>
              {leftPlayer && <DiscardRiver playerId={leftPlayer.id} direction="left" />}
            </div>

            <div className="area-center">
              <div className="table-center">
                <div className="wall-count">{state?.wallCount}<span>枚</span></div>
                <div className="last-discard-area">
                  {state?.lastDiscard
                    ? <>
                        <div className="tile tile-discard">{state.lastDiscard.char}</div>
                        <div className="last-discard-label">
                          {players.find(p => p.id === state.lastDiscardPlayer)?.name}
                        </div>
                      </>
                    : <div className="no-discard">-</div>
                  }
                </div>
              </div>
              <div className={`message-box ${isMyTurn ? 'my-turn' : ''}`}>
                {message}
              </div>
            </div>

            <div className="area-right">
              <PlayerPanel player={rightPlayer} position="right" />
              <div className="opponent-hand-vertical">
                {rightPlayer && Array(state?.handCounts[rightPlayer.id] || 0).fill(0).map((_, i) => (
                  <TileBack key={i} vertical />
                ))}
              </div>
              {rightPlayer && <DiscardRiver playerId={rightPlayer.id} direction="right" />}
            </div>
          </div>

          {/* 下：自分 */}
          <div className="area-bottom">
            <DiscardRiver playerId={myId} direction="bottom" />

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

            <div className="hand-row">
              <div className="my-hand">
                {myHand.map((tile, idx) => (
                  <div key={tile.id} className="tile-slot">
                    <div
                      className={`tile ${selectedTile?.id === tile.id ? 'selected' : ''} ${dragIdx === idx && dragArea === 'hand' ? 'dragging' : ''}`}
                      onClick={() => {
                        if (selectedTile?.id === tile.id) {
                          handleDiscard(tile)
                        } else {
                          setSelectedTile(tile)
                        }
                      }}
                  draggable
                  onDragStart={() => handleDragStart(idx, 'hand')}
                  onDragOver={(e) => handleDragOver(e, idx, 'hand')}
                  onDragEnd={handleDragEnd}
                    >
                      {tile.char}
                    </div>
                    <div
                      className={`gap-zone ${spaces.has(idx + 1) ? 'active' : ''}`}
                      onClick={() => toggleSpace(idx + 1)}
                    />
                  </div>
                ))}
              </div>

              {drawnTile && (
                <div className="drawn-area">
                  <div className="drawn-separator" />
                  <div
                    className={`tile drawn-tile ${selectedTile?.id === drawnTile.id ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedTile?.id === drawnTile.id) {
                        handleDiscard(drawnTile, true)
                      } else {
                        setSelectedTile(drawnTile)
                      }
                    }}
                  draggable
                  onDragStart={() => {
                    setDragIdx('drawn')
                    setDragArea('drawn')
                  }}
                  onDragOver={(e) => handleDragOver(e, 'drawn', 'drawn')}
                  onDragEnd={handleDragEnd}
                  >
                    {drawnTile.char}
                  </div>
                  <div className="drawn-label">ツモ</div>
                </div>
              )}
            </div>

            <div className="my-info">
              <span className="my-name">{playerName}</span>
              <span className="my-score">{state?.scores[myId]}点</span>
              {isMyTurn && <span className="turn-indicator">▶ あなたのターン</span>}
            </div>

            <div className="action-area">
{nakiOptions && (
                <div className="naki-candidates">
                  <span className="naki-label">鳴く単語を選択：</span>
                  {nakiOptions.candidates.map((c, i) => (
                    <button
                      key={i}
                      className="action-btn naki-btn"
                      onClick={() => handleNaki(c.word)}
                    >
                      {c.word.join('')}
                    </button>
                  ))}
                  <button
                    className="action-btn naki-skip-btn"
                    onClick={() => setNakiOptions(null)}
                  >
                    スキップ
                  </button>
                </div>
              )}
              <button
                className="action-btn agari-btn"
                onClick={() => {
                  // 区切り位置からグループを生成
                  const allTiles = drawnTile ? [...myHand, drawnTile] : [...myHand]
                  const groups = []
                  let current = []
                  allTiles.forEach((tile, idx) => {
                    current.push(tile.char)
                    if (spaces.has(idx + 1) || idx === allTiles.length - 1) {
                      if (current.length > 0) groups.push(current.join(''))
                      current = []
                    }
                  })
                  socket.emit('agari', { groups })
                }}
              >
                アガリ宣言
              </button>
            </div>

            <div className="hint-text">
              牌をクリックで選択 → もう一度クリックで打牌　／　牌の右側の縦線でグループ区切り
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default GameScreen