const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { joinRoom, dealHands, drawTile, discardTile, doNaki, checkWin, calcPlayerScore, getPublicState, getRoom, nextRound } = require('./roomManager');
const { canNaki, WORDS } = require('./gameLogic');

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
    console.log('join_room players:', room.players.map(p => p.name));
    for (const player of room.players) {
      const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
      if (ps) ps.emit('room_updated', getPublicState(roomId, player.id));
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

    let nakiPossible = false;
    for (const player of room.players) {
      if (player.id === socket.id) continue;
      const hand = room.hands[player.id];
      const result = canNaki(hand, tile.char);
      if (result.possible) {
        nakiPossible = true;
        const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
        if (ps) ps.emit('naki_available', { tile, candidates: result.candidates });
      }
    }

    const discardedTileId = tile.id;
    const waitTime = nakiPossible ? 15000 : 1000;
    setTimeout(() => {
      const updatedRoom = getRoom(roomId);
      if (!updatedRoom) return;
      if (updatedRoom.phase === 'finished') return;
      if (updatedRoom.lastDiscard?.id !== discardedTileId) return;
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
    }, waitTime);
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

  socket.on('agari', ({ groups } = {}) => {
    const roomId = socket.data.roomId;
    const room = getRoom(roomId);
    if (!room) return;

    let win = false;

    if (groups && groups.length > 0) {
      win = groups.every(w => w.length >= 2 && WORDS.has(w));
      if (!win) {
        const invalid = groups.filter(w => !WORDS.has(w) || w.length < 2);
        socket.emit('agari_failed', `辞書にない単語: ${invalid.join('、')}`);
        return;
      }
    } else {
      win = checkWin(roomId, socket.id);
      if (!win) {
        socket.emit('agari_failed', 'アガリ条件を満たしていません');
        return;
      }
    }

    const score = calcPlayerScore(roomId, socket.id);
    const playerCount = room.players.length;
    const pointsEach = Math.floor(score / (playerCount - 1));

    room.scores[socket.id] += score;
    for (const player of room.players) {
      if (player.id !== socket.id) {
        room.scores[player.id] -= pointsEach;
      }
    }
    room.phase = 'finished';

    const handChars = room.hands[socket.id].map(t => t.char);
    const meldWords = room.melds[socket.id].map(m => m.join(''));
    let agariWords = groups && groups.length > 0 ? groups : [];
    if (agariWords.length === 0) {
      const { findPartition } = require('./gameLogic');
      agariWords = findPartition(handChars) || [];
    }
    agariWords = [...agariWords, ...meldWords];

    for (const player of room.players) {
      const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
      if (ps) ps.emit('game_end', {
        winnerId: socket.id,
        score,
        agariWords,
        state: getPublicState(roomId, player.id)
      });
    }
  });

  socket.on('start_game', () => {
    const roomId = socket.data.roomId;
    const room = getRoom(roomId);
    if (!room) return;
    if (room.players.length < 2) {
      socket.emit('error', '2人以上必要です');
      return;
    }
    if (room.players[0].id !== socket.id) {
      socket.emit('error', '部屋主だけ開始できます');
      return;
    }

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
      if (player.id === firstPlayer.id) {
        ps.emit('drawn', { tile: firstTile, state: getPublicState(roomId, player.id) });
      }
    }
  });

  socket.on('next_round', () => {
    const roomId = socket.data.roomId;
    const room = getRoom(roomId);
    if (!room) return;
    if (room.players[0].id !== socket.id) return;
    console.log('next_round players:', room.players.map(p => p.name));

    const result = nextRound(roomId);
    if (!result) return;

    if (result.gameover) {
      io.to(roomId).emit('game_over_final', {
        state: getPublicState(roomId, socket.id)
      });
      return;
    }

    const updatedRoom = getRoom(roomId);
    dealHands(roomId);

    for (const player of updatedRoom.players) {
      const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
      if (ps) ps.emit('game_start', getPublicState(roomId, player.id));
    }

    const firstPlayer = updatedRoom.players[0];
    const firstTile = drawTile(roomId, firstPlayer.id);
    for (const player of updatedRoom.players) {
      const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
      if (!ps) continue;
      const st = getPublicState(roomId, player.id);
      if (player.id === firstPlayer.id) {
        ps.emit('next_round_start', { state: st, firstDraw: { tile: firstTile, state: st } });
      } else {
        ps.emit('next_round_start', { state: st, firstDraw: null });
      }
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