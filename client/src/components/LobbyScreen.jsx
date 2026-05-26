import { useState } from 'react'
import { io } from 'socket.io-client'
import './LobbyScreen.css'

function LobbyScreen({ onJoin }) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [status, setStatus] = useState('')

  const handleJoin = () => {
    if (!name.trim() || !room.trim()) {
      setStatus('名前とルームIDを入力してください')
      return
    }
    setStatus('接続中...')
    const socket = io('http://localhost:3001')

    let savedState = null
    let savedDraw = null

    socket.on('room_updated', (state) => {
      const count = state.players.length
      setStatus(`待機中... ${count}/4人`)
    })

    socket.on('game_start', (state) => {
      savedState = state
      // 自分が最初のプレイヤーでない場合はdrawnを待たずに開始
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

    socket.on('error', (msg) => {
      setStatus(msg)
    })

    socket.on('connect', () => {
      socket.emit('join_room', { roomId: room, playerName: name })
    })
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-box">
        <h2 className="lobby-title">ルームに参加</h2>
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
        {status && <p className="lobby-status">{status}</p>}
      </div>
    </div>
  )
}

export default LobbyScreen