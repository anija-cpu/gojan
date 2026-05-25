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

  // ルーム参加
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

    // 4人揃ったらゲーム開始
    if (room.players.length === 4) {
      dealHands(roomId);
      for (const player of room.players) {
        const playerSocket = [...io.sockets.sockets.values()]
          .find(s => s.id === player.id);
        if (playerSocket) {
          playerSocket.emit('game_start', getPublicState(roomId, player.id));
        }
      }
      // 最初のプレイヤーにツモ
      const firstPlayer = room.players[0];
      const tile = drawTile(roomId, firstPlayer.id);
      const firstSocket = [...io.sockets.sockets.values()]
        .find(s => s.id === firstPlayer.id);
      if (firstSocket) {
        firstSocket.emit('drawn', { tile, state: getPublicState(roomId, firstPlayer.id) });
      }
    }
  });

  // 打牌
  socket.on('discard', ({ tileId }) => {
    const roomId = socket.data.roomId;
    const room = getRoom(roomId);
    if (!room) return;

    const currentPlayer = room.players[room.currentTurn];
    if (currentPlayer.id !== socket.id) return;

    const tile = discardTile(roomId, socket.id, tileId);
    if (!tile) return;

    // 全員に捨て牌を通知
    for (const player of room.players) {
      const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
      if (ps) ps.emit('discarded', { tile, byPlayerId: socket.id, state: getPublicState(roomId, player.id) });
    }

    // 鳴き可能プレイヤーに通知
    for (const player of room.players) {
      if (player.id === socket.id) continue;
      const hand = room.hands[player.id];
      const result = canNaki(hand, tile.char);
      if (result.possible) {
        const ps = [...io.sockets.sockets.values()].find(s => s.id === player.id);
        if (ps) ps.emit('naki_available', { tile, word: result.word });
      }
    }

    // 鳴きなければ次のプレイヤーにツモ
    setTimeout(() => {
      const updatedRoom = getRoom(roomId);
      if (updatedRoom.lastDiscard?.id === tile.id) {
        const nextPlayer = updatedRoom.players[updatedRoom.currentTurn];
        if (!nextPlayer) return;
        if (updatedRoom.wall.length === 0) {
          io.to(roomId).emit('ryukyoku', { state: getPublicState(roomId, socket.id) });
          return;
        }
        const drawn = drawTile(roomId, nextPlayer.id);
        const nextSocket = [...io.sockets.sockets.values()].find(s => s.id === nextPlayer.id);
        if (nextSocket) nextSocket.emit('drawn', { tile: drawn, state: getPublicState(roomId, nextPlayer.id) });
      }
    }, 3000);
  });

  // 鳴き
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

  // アガリ宣言
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

  // 切断
  socket.on('disconnect', () => {
    console.log('切断:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('サーバー起動: http://localhost:3001');
});