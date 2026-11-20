/* How to play, and the card line, for group H (Master Minds: logic and math). */

export const COACH = {
  'network-logic': {
    steps: [
      'Read the task: cheapest route, a route through required hubs under a cap, or the cheapest connection of all hubs.',
      'Tap hubs in order to build a route (or tap links on a connection task); the running cost updates live.',
      'Submit when you are sure it is optimal — any route or tree of the best cost counts.'
    ],
    tip: 'For a connection, keep adding the cheapest link that does not close a loop (Kruskal). For a route, think like Dijkstra: settle the closest hubs first.'
  },
};

export const BLURB = {
  'network-logic': 'Shortest routes, tours and spanning trees on weighted networks.',
};
