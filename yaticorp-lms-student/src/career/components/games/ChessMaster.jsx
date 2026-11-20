import ChessChallenge from './ChessChallenge';

/** ♛ Chess Master (2026-11-17, the user): Master Minds · Logic's chess — the same game as Rising Brains' Chess, on its own ladder. */
export default function ChessMaster({ onExit }) {
  return <ChessChallenge onExit={onExit} gameId="chess-master" section="master" />;
}
