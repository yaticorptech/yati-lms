/**
 * The games, by id. Each engine follows ./contract.js. Loaded on first use, so
 * one game's file failing to load cannot take the others down with it.
 */
const IDS = ['chess', 'ludo', 'carrom', 'uno'];

const cache = {};
const engine = (id) => {
    if (!IDS.includes(id)) return null;
    if (!cache[id]) cache[id] = require(`./${id}`);
    return cache[id];
};

/** What the lobby and the forms need to know about each game. */
const catalogue = () => IDS.map((id) => {
    const e = engine(id);
    return { id, label: e.label, emoji: e.emoji, summary: e.summary || '', minSeats: e.minSeats, maxSeats: e.maxSeats, seatsPerSide: e.seatsPerSide };
});

/**
 * Tests only: stand a simple engine in for a game, so the competition flow
 * can be exercised without playing real chess. Pass null to restore.
 */
const override = (id, fake) => { if (fake) cache[id] = fake; else delete cache[id]; };

module.exports = { IDS, engine, catalogue, override };
