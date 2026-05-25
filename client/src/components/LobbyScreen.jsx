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
    socket.on('connect', () => {
      socket.emit('join_room', { roomId: room, playerName: name })
    })
    socket.on('game_start', (state) => {
      onJoin(socket, state, name, room)
    })
    socket.on('room_updated', (state) => {
      const count = state.players.length
      setStatus(`待機中... ${count}/4人`)
    })
    socket.on('error', (msg) => {
      setStatus(msg)
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