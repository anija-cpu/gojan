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

  // BGM
  useEffect(() => {
    const audio = new Audio('/bgm.mp3')
    audio.loop = true
    audio.volume = 0.5
    window._bgm = audio
  }, [])

  const startBgm = () => {
    window._bgm?.play().catch(() => {})
  }

  return (
    <>
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