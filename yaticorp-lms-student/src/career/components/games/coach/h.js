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
  'strategic-constraint-lab': {
    steps: [
      'Tap a task, then tap a day to place it (or drag it). Tap the tray to take it back.',
      'Watch the checklist: each rule turns green when met and red when broken.',
      'Check the schedule when every task is placed — on cost levels it must also be cheap enough.'
    ],
    tip: 'Place the most constrained tasks first: fixed days, "same day" pairs and long "before" chains. Then put long tasks on cheap days.'
  },
  'quantitative-arena': {
    steps: [
      'Comparisons: decide whether Quantity A or B is greater, they are equal, or it cannot be determined.',
      'Word problems: work it through and type the number (to 2 decimals).',
      'Each question has its own clock — pause if you need to.'
    ],
    tip: 'Test the condition with awkward values: a fraction between 0 and 1, a negative, zero if allowed, and a big number. Two different results mean "cannot be determined".'
  },
  'numerical-optimization': {
    steps: [
      'Pack the bag, split the budget, or pick a point on the production grid.',
      'Keep within the limits shown — capacity bar, units left, resource checks.',
      'Submit the plan with the highest value you can find.'
    ],
    tip: 'Best value per kilogram is a good start but not always optimal — try swapping one item for two lighter ones. In budgets, compare the next unit\'s extra return.'
  },
  'statistical-inference': {
    steps: [
      'Study the chart: dot plot, histogram, scatter plot or summary.',
      'Answer the question about centre, spread, outliers, skew, correlation or evidence.',
      'Read the computed statistics afterwards to check your reasoning.'
    ],
    tip: 'Outliers move the mean and SD far more than the median. A long right tail puts the mean above the median. The same gap is stronger evidence when the spread is small.'
  },
  'decision-theory-arena': {
    steps: [
      'Read the payoff matrix or decision tree for this quarter.',
      'Pick the plan with the highest expected return — or, in a cautious quarter, the best worst case.',
      'Commit: the outcome is drawn and your bankroll compounds.'
    ],
    tip: 'EV = Σ probability × return. In a tree, roll back from the right: average at chance nodes, take the best branch at each decision.'
  }
};

export const BLURB = {
  'network-logic': 'Shortest routes, tours and spanning trees on weighted networks.',
  'strategic-constraint-lab': 'Schedule tasks under live constraints — then at the lowest cost.',
  'quantitative-arena': 'GRE-style quantity comparisons and multi-step problems.',
  'numerical-optimization': 'Knapsacks, budgets and production plans: find the optimum.',
  'statistical-inference': 'Read data plots and reason about centre, spread and evidence.',
  'decision-theory-arena': 'Payoff matrices and decision trees with a compounding bankroll.'
};
