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
    discardsByPlayer: {},
    currentTurn: 0,
    phase: 'waiting',
    lastDiscard: null,
    lastDiscardPlayer: null,
    round: 1,
    maxRounds: 4,
  };
  return rooms[roomId];
}

function getRoom(roomId) {
  return rooms[roomId];
}

function joinRoom(roomId, playerId, playerName) {
  const room = rooms[roomId];

  if (!room || room.phase === 'finished' || room.phase === 'gameover') {
    createRoom(roomId);
  }

  const updatedRoom = rooms[roomId];
  if (updatedRoom.players.length >= 4) return false;
  if (updatedRoom.players.some(p => p.id === playerId)) return true;
  updatedRoom.players.push({ id: playerId, name: playerName });
  updatedRoom.hands[playerId] = [];
  updatedRoom.melds[playerId] = [];
  updatedRoom.scores[playerId] = 25000;
  updatedRoom.discardsByPlayer[playerId] = [];
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
  if (!room.discardsByPlayer[playerId]) room.discardsByPlayer[playerId] = [];
  room.discardsByPlayer[playerId].push(tile);
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
    discardsByPlayer: room.discardsByPlayer,
    currentTurn: room.currentTurn,
    phase: room.phase,
    lastDiscard: room.lastDiscard,
    lastDiscardPlayer: room.lastDiscardPlayer,
    round: room.round,
    maxRounds: room.maxRounds,
  };
}

function nextRound(roomId) {
  const room = rooms[roomId];
  if (!room) return null;

  const isGameOver = Object.values(room.scores).some(s => s <= 0);
  if (isGameOver) {
    room.phase = 'gameover';
    return { gameover: true };
  }

  const scores = { ...room.scores };
  const players = room.players.map(p => ({ ...p }));
  const tiles = shuffle(buildTiles());

  rooms[roomId] = {
    players,
    hands: Object.fromEntries(players.map(p => [p.id, []])),
    melds: Object.fromEntries(players.map(p => [p.id, []])),
    scores,
    wall: tiles,
    discardPile: [],
    discardsByPlayer: Object.fromEntries(players.map(p => [p.id, []])),
    currentTurn: 0,
    phase: 'playing',
    lastDiscard: null,
    lastDiscardPlayer: null,
    round: room.round + 1,
    maxRounds: room.maxRounds,
  };
  return { gameover: false };
}

module.exports = {
  createRoom, getRoom, joinRoom, dealHands, drawTile,
  discardTile, doNaki, checkWin, calcPlayerScore, getPublicState, nextRound
};