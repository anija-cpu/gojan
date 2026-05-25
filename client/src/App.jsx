import { useState } from 'react'
import TitleScreen from './components/TitleScreen'
import LobbyScreen from './components/LobbyScreen'
import GameScreen from './components/GameScreen'

function App() {
  const [screen, setScreen] = useState('title')
  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')

  return (
    <>
      {screen === 'title' && (
        <TitleScreen onStart={() => setScreen('lobby')} />
      )}
      {screen === 'lobby' && (
        <LobbyScreen
          onJoin={(sock, state, name, room) => {
            setSocket(sock)
            setGameState(state)
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
          playerName={playerName}
          roomId={roomId}
        />
      )}
    </>
  )
}

export default App