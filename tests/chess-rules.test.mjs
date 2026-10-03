import test from 'node:test';
import assert from 'node:assert/strict';
import { fromFen, legalMoves, makeMove, undoMove, result, san, squareIndex, toFen } from '../games/Chess/source/rules.js';

function perft(state, depth) {
  if (!depth) return 1;
  let nodes = 0;
  for (const move of legalMoves(state)) {
    makeMove(state, move);
    nodes += perft(state, depth - 1);
    undoMove(state);
  }
  return nodes;
}
function play(state, from, to, promotion) {
  const a = squareIndex(from), b = squareIndex(to);
  const move = legalMoves(state, a).find(candidate => candidate.to === b);
  assert.ok(move, `${from}-${to} is legal`);
  return makeMove(state, { ...move, promotion });
}

test('legal move generation matches standard perft positions', () => {
  assert.deepEqual([1, 2, 3].map(depth => perft(fromFen(), depth)), [20, 400, 8902]);
  const kiwipete = fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assert.deepEqual([1, 2, 3].map(depth => perft(kiwipete, depth)), [48, 2039, 97862]);
});

test('castling moves the rook and consumes both king-side rights', () => {
  const state = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const move = legalMoves(state, squareIndex('e1')).find(candidate => candidate.to === squareIndex('g1'));
  assert.equal(san(state, move), 'O-O');
  makeMove(state, move);
  assert.equal(state.board[squareIndex('g1')], 'wK');
  assert.equal(state.board[squareIndex('f1')], 'wR');
  assert.equal(toFen(state).split(' ')[2], 'kq');
  undoMove(state);
  assert.equal(state.board[squareIndex('e1')], 'wK');
});

test('en passant removes the bypassed pawn and can be undone', () => {
  const state = fromFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  const move = legalMoves(state, squareIndex('e5')).find(candidate => candidate.to === squareIndex('d6'));
  assert.equal(move.flags, 'e');
  makeMove(state, move);
  assert.equal(state.board[squareIndex('d6')], 'wP');
  assert.equal(state.board[squareIndex('d5')], null);
  undoMove(state);
  assert.equal(state.board[squareIndex('d5')], 'bP');
  const pinned = fromFen('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  assert.equal(legalMoves(pinned, squareIndex('e5')).some(move => move.to === squareIndex('d6')), false);
});

test('promotion accepts a chosen piece and checkmate is detected', () => {
  const state = fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  play(state, 'a7', 'a8', 'Q');
  assert.equal(state.board[squareIndex('a8')], 'wQ');
  const mate = fromFen();
  for (const [from, to] of [['f2','f3'],['e7','e5'],['g2','g4']]) play(mate, from, to);
  const queen = legalMoves(mate, squareIndex('d8')).find(move => move.to === squareIndex('h4'));
  assert.equal(san(mate, queen), 'Qh4#');
  play(mate, 'd8', 'h4');
  assert.deepEqual(result(mate), { over: true, reason: 'checkmate', winner: 'b' });
});

test('stalemate, threefold repetition, fifty-move, and insufficient-material draws', () => {
  assert.equal(result(fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).reason, 'stalemate');
  const repeated = fromFen();
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const [from, to] of [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']]) play(repeated, from, to);
  }
  assert.equal(result(repeated).reason, 'threefold repetition');
  assert.equal(result(fromFen('4k3/8/8/8/8/8/8/4K3 w - - 100 51')).reason, 'fifty-move rule');
  assert.equal(result(fromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).reason, 'insufficient material');
});
