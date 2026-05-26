import { useState } from 'react'
import { io } from 'socket.io-client'
import './LobbyScreen.css'

function LobbyScreen({ onJoin }) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [status, setStatus] = useState('')
  const [players, setPlayers] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [joined, setJoined] = useState(false)
  const [socketRef, setSocketRef] = useState(null)

  const handleJoin = () => {
    if (joined) return
    if (!name.trim() || !room.trim()) {
      setStatus('名前とルームIDを入力してください')
      return
    }
    setStatus('接続中...')
    const socket = io('http://localhost:3001')

    let savedState = null
    let savedDraw = null

    socket.on('room_updated', (state) => {
      setPlayers(state.players)
      setStatus(`待機中... ${state.players.length}人`)
      if (state.players[0]?.id === socket.id) {
        setIsOwner(true)
      }
    })

    socket.on('game_start', (state) => {
      savedState = state
      const myId = socket.id
      const firstPlayerId = state.players[state.currentTurn]?.id
      if (firstPlayerId !== myId) {
        onJoin(socket, state, name, room, null)
      } else if (savedDraw) {
        onJoin(socket, savedState, name, room, savedDraw)
      }
    })

    socket.on('drawn', ({ tile, state }) => {
      savedDraw = { tile, state }
      if (savedState) {
        onJoin(socket, savedState, name, room, savedDraw)
      }
    })

    socket.on('player_left', ({ playerName }) => {
      setStatus(`${playerName} が退出しました`)
    })

    socket.on('error', (msg) => {
      setStatus(msg)
    })

    socket.on('connect', () => {
      socket.emit('join_room', { roomId: room, playerName: name })
      setJoined(true)
      setSocketRef(socket)
    })
  }

  const handleStart = () => {
    if (socketRef) {
      socketRef.emit('start_game')
    }
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-box">
        <h2 className="lobby-title">ルームに参加</h2>

        {!joined ? (
          <>
            <input
              className="lobby-input"
              placeholder="プレイヤー名"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              className="lobby-input"
              placeholder="ルームID（例: room1）"
              value={room}
              onChange={e => setRoom(e.target.value)}
            />
            <button className="lobby-btn" onClick={handleJoin}>
              参加する
            </button>
          </>
        ) : (
          <>
            <div className="lobby-players">
              {players.map((p, i) => (
                <div key={p.id} className="lobby-player">
                  {i === 0 ? '👑 ' : '　'}{p.name}
                </div>
              ))}
            </div>
            {isOwner && players.length >= 2 && (
              <button className="lobby-btn start-btn" onClick={handleStart}>
                ゲーム開始（{players.length}人）
              </button>
            )}
            {isOwner && players.length < 2 && (
              <p className="lobby-status">あと{2 - players.length}人待っています</p>
            )}
            {!isOwner && (
              <p className="lobby-status">部屋主がゲームを開始するまで待ってください</p>
            )}
          </>
        )}

        {status && <p className="lobby-status">{status}</p>}
      </div>
    </div>
  )
}

export default LobbyScreen