const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { joinRoom, dealHands, drawTile, discardTile, doNaki, checkWin, calcPlayerScore, getPublicState, getRoom } = require('./roomManager');
const { canNaki } = require('./gameLogic');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('接続:', socket.id);

  socket.on('join_room', ({ roomId, playerName }) => {
    const ok = joinRoom(roomId, socket.id, playerName);
    if (!ok) {
      socket.emit('error', '満室です');
      return;
    }
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerName = playerName;

    const room = getRoom(roomId);
    io.to(roomId).emit('room_updated', getPublicState(roomId, socket.id));

    if (room.players.length === 4) {
      dealHands(roomId);
      for (const player of room.players) {
        const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
        if (ps) ps.emit('game_start', getPublicState(roomId, player.id));
      }

      const firstPlayer = room.players[0];
      const firstTile = drawTile(roomId, firstPlayer.id);
      for (const player of room.players) {
        const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
        if (!ps) continue;
        const st = getPublicState(roomId, player.id);
        if (player.id === firstPlayer.id) {
          ps.emit('drawn', { tile: firstTile, state: st });
        }
      }
    }
  });

  socket.on('discard', ({ tileId }) => {
    const roomId = socket.data.roomId;
    const room = getRoom(roomId);
    if (!room) return;

    const currentPlayer = room.players[room.currentTurn];
    if (currentPlayer.id !== socket.id) return;

    const tile = discardTile(roomId, socket.id, tileId);
    if (!tile) return;

    for (const player of room.players) {
      const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
      if (ps) ps.emit('discarded', { tile, byPlayerId: socket.id, state: getPublicState(roomId, player.id) });
    }

    for (const player of room.players) {
      if (player.id === socket.id) continue;
      const hand = room.hands[player.id];
      const result = canNaki(hand, tile.char);
      if (result.possible) {
        const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
        if (ps) ps.emit('naki_available', { tile, word: result.word });
      }
    }

    setTimeout(() => {
      const updatedRoom = getRoom(roomId);
      if (!updatedRoom) return;
      if (updatedRoom.phase === 'finished') return;
      if (updatedRoom.lastDiscard?.id === tile.id) {
        const nextPlayer = updatedRoom.players[updatedRoom.currentTurn];
        if (!nextPlayer) return;
        if (updatedRoom.wall.length === 0) {
          io.to(roomId).emit('ryukyoku', { state: getPublicState(roomId, socket.id) });
          return;
        }
        const drawn = drawTile(roomId, nextPlayer.id);
        for (const player of updatedRoom.players) {
          const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
          if (!ps) continue;
          const st = getPublicState(roomId, player.id);
          if (player.id === nextPlayer.id) {
            ps.emit('drawn', { tile: drawn, state: st });
          }
        }
      }
    }, 3000);
  });

  socket.on('naki', ({ tileIds }) => {
    const roomId = socket.data.roomId;
    const room = getRoom(roomId);
    if (!room) return;

    const meldTiles = doNaki(roomId, socket.id, tileIds);
    if (!meldTiles) return;

    for (const player of room.players) {
      const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
      if (ps) ps.emit('naki_done', { byPlayerId: socket.id, state: getPublicState(roomId, player.id) });
    }
  });

  socket.on('agari', () => {
    const roomId = socket.data.roomId;
    const room = getRoom(roomId);
    if (!room) return;

    const win = checkWin(roomId, socket.id);
    if (!win) {
      socket.emit('agari_failed', 'アガリ条件を満たしていません');
      return;
    }

    const score = calcPlayerScore(roomId, socket.id);
    room.scores[socket.id] += score;
    room.phase = 'finished';

    for (const player of room.players) {
      const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
      if (ps) ps.emit('game_end', {
        winnerId: socket.id,
        score,
        state: getPublicState(roomId, player.id)
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('切断:', socket.id);
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    room.phase = 'finished';
    io.to(roomId).emit('player_left', {
      playerId: socket.id,
      playerName: socket.data.playerName
    });
  });
});

server.listen(3001, () => {
  console.log('サーバー起動: http://localhost:3001');
});