import { useState, useEffect } from 'react'
import TitleScreen from './components/TitleScreen'
import LobbyScreen from './components/LobbyScreen'
import GameScreen from './components/GameScreen'

function App() {
  const [screen, setScreen] = useState('title')
  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [firstDraw, setFirstDraw] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [bgmVolume, setBgmVolume] = useState(50)
  const [showVolume, setShowVolume] = useState(false)

  useEffect(() => {
    const audio = new Audio('/bgm.mp3')
    audio.loop = true
    audio.volume = 0.5
    window._bgm = audio
  }, [])

  useEffect(() => {
    if (window._bgm) window._bgm.volume = bgmVolume / 100
  }, [bgmVolume])

  const startBgm = () => {
    window._bgm?.play().catch(() => {})
  }

  return (
    <>
      {/* 音量ボタン */}
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 999 }}>
        <button
          onClick={() => setShowVolume(v => !v)}
          style={{
            background: 'rgba(10,26,15,0.85)',
            border: '1px solid rgba(201,168,76,0.5)',
            borderRadius: '50%',
            width: 40, height: 40,
            cursor: 'pointer',
            fontSize: 18,
            color: '#f0d080',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          🔊
        </button>
        {showVolume && (
          <div style={{
            position: 'absolute', top: 48, right: 0,
            background: 'rgba(10,26,15,0.95)',
            border: '1px solid rgba(201,168,76,0.4)',
            borderRadius: 12, padding: '14px 18px',
            minWidth: 200, display: 'flex', flexDirection: 'column', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#f0d080', fontSize: 13, width: 40 }}>🎵 BGM</span>
              <input
                type="range" min={0} max={100} value={bgmVolume}
                onChange={e => setBgmVolume(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: '#c9a84c', fontSize: 12, width: 36 }}>{bgmVolume}%</span>
            </div>
          </div>
        )}
      </div>

      {screen === 'title' && (
        <TitleScreen onStart={() => { startBgm(); setScreen('lobby') }} />
      )}
      {screen === 'lobby' && (
        <LobbyScreen
          onJoin={(sock, state, name, room, draw) => {
            setSocket(sock)
            setGameState(state)
            setFirstDraw(draw)
            setPlayerName(name)
            setRoomId(room)
            setScreen('game')
          }}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          socket={socket}
          initialState={gameState}
          firstDraw={firstDraw}
          playerName={playerName}
          roomId={roomId}
        />
      )}
    </>
  )
}

export default App