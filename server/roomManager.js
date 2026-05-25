const { buildTiles, shuffle, canWin, calcScore, canNaki } = require('./gameLogic');

const rooms = {};

function createRoom(roomId) {
  const tiles = shuffle(buildTiles());
  rooms[roomId] = {
    players: [],
    hands: {},
    melds: {},
    scores: {},
    wall: tiles,
    discardPile: [],
    currentTurn: 0,
    phase: 'waiting',
    lastDiscard: null,
    lastDiscardPlayer: null,
  };
  return rooms[roomId];
}

function getRoom(roomId) {
  return rooms[roomId];
}

function joinRoom(roomId, playerId, playerName) {
  if (!rooms[roomId]) createRoom(roomId);
  const room = rooms[roomId];
  if (room.players.length >= 4) return false;
  room.players.push({ id: playerId, name: playerName });
  room.hands[playerId] = [];
  room.melds[playerId] = [];
  room.scores[playerId] = 25000;
  return true;
}

function dealHands(roomId) {
  const room = rooms[roomId];
  for (const player of room.players) {
    room.hands[player.id] = room.wall.splice(0, 13);
  }
  room.phase = 'playing';
}

function drawTile(roomId, playerId) {
  const room = rooms[roomId];
  if (room.wall.length === 0) return null;
  const tile = room.wall.shift();
  room.hands[playerId].push(tile);
  return tile;
}

function discardTile(roomId, playerId, tileId) {
  const room = rooms[roomId];
  const hand = room.hands[playerId];
  const idx = hand.findIndex(t => t.id === tileId);
  if (idx === -1) return false;
  const [tile] = hand.splice(idx, 1);
  room.discardPile.push(tile);
  room.lastDiscard = tile;
  room.lastDiscardPlayer = playerId;
  room.currentTurn = (room.currentTurn + 1) % room.players.length;
  return tile;
}

function doNaki(roomId, playerId, tileIds) {
  const room = rooms[roomId];
  const hand = room.hands[playerId];
  const meldTiles = [];

  for (const tid of tileIds) {
    if (tid === room.lastDiscard.id) {
      meldTiles.push(room.lastDiscard);
    } else {
      const idx = hand.findIndex(t => t.id === tid);
      if (idx === -1) return false;
      meldTiles.push(...hand.splice(idx, 1));
    }
  }

  room.melds[playerId].push(meldTiles.map(t => t.char));
  const turnIdx = room.players.findIndex(p => p.id === playerId);
  room.currentTurn = turnIdx;
  return meldTiles;
}

function checkWin(roomId, playerId) {
  const room = rooms[roomId];
  const hand = room.hands[playerId].map(t => t.char);
  const melds = room.melds[playerId];
  return canWin(hand, melds);
}

function calcPlayerScore(roomId, playerId) {
  const room = rooms[roomId];
  const hand = room.hands[playerId].map(t => t.char);
  const melds = room.melds[playerId];
  const isMenzen = melds.length === 0;
  return calcScore(hand, melds, isMenzen);
}

function getPublicState(roomId, requesterId) {
  const room = rooms[roomId];
  if (!room) return null;
  return {
    players: room.players,
    handCounts: Object.fromEntries(
      room.players.map(p => [p.id, room.hands[p.id]?.length || 0])
    ),
    myHand: room.hands[requesterId] || [],
    melds: room.melds,
    scores: room.scores,
    wallCount: room.wall.length,
    discardPile: room.discardPile,
    currentTurn: room.currentTurn,
    phase: room.phase,
    lastDiscard: room.lastDiscard,
    lastDiscardPlayer: room.lastDiscardPlayer,
  };
}

module.exports = { createRoom, getRoom, joinRoom, dealHands, drawTile, discardTile, doNaki, checkWin, calcPlayerScore, getPublicState };