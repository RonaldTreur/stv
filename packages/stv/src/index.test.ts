import {
  calculateQuota,
  calculateStvWinners,
  calculateTotalVotes,
  Candidate,
  CandidateMapItem,
  distributeVotes,
  eliminateLowestCandidate,
  getCandidatesAboveQuota,
  initializeCandidateSet,
  organizeVotesByNextCandidate,
  redistributeExcessVotes,
  redistributeToCandidates,
  removeCandidateFromAllVotes,
  selectWinnersFromAboveQuota,
  VoteRecord,
} from './index';

describe('calculateStvWinners', () => {
  it('should correctly calculate winners in a simple scenario', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 1, voteOrder: ['Alice', 'Bob', 'Charlie'] },
      { voteCount: 1, voteOrder: ['Bob', 'Charlie', 'Alice'] },
      { voteCount: 1, voteOrder: ['Charlie', 'Alice', 'Bob'] },
      { voteCount: 1, voteOrder: ['Alice', 'Bob', 'Charlie'] },
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 1);
    expect(winners).toEqual(['Alice']); // Expect Alice to win as the first preference of one vote
    expect(tieCount).toBe(0);
  });

  it('should correctly calculate winners in a complex scenario with five candidates and three seats', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 2.5, voteOrder: ['Alice', 'Bob'] },
      { voteCount: 3.7, voteOrder: ['Bob', 'Charlie'] },
      { voteCount: 1.5, voteOrder: ['Charlie', 'Dave'] },
      { voteCount: 2.3, voteOrder: ['Dave', 'Eve'] },
      { voteCount: 4, voteOrder: ['Eve', 'Alice'] },
      { voteCount: 1, voteOrder: ['Alice', 'Charlie'] },
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 3);
    expect(winners).toEqual(expect.arrayContaining(['Eve', 'Alice', 'Dave'])); // Eve, Alice, Dave should win
    expect(tieCount).toBe(0); // No tie expected
  });

  it('should correctly calculate winners in a complex scenario with twelve candidates, six seats, and twenty votes', () => {
    const voteRecords: VoteRecord[] = [
      {
        voteCount: 2,
        voteOrder: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank'],
      },
      {
        voteCount: 1.5,
        voteOrder: ['Bob', 'Charlie', 'Alice', 'George', 'Hank', 'Ivy'],
      },
      {
        voteCount: 3,
        voteOrder: ['Charlie', 'Dave', 'Eve', 'Alice', 'Frank', 'George'],
      },
      {
        voteCount: 2.3,
        voteOrder: ['Dave', 'Eve', 'Frank', 'Charlie', 'Ivy', 'Jack'],
      },
      {
        voteCount: 4,
        voteOrder: ['Eve', 'Alice', 'Bob', 'Charlie', 'Dave', 'Hank'],
      },
      {
        voteCount: 1,
        voteOrder: ['Frank', 'George', 'Hank', 'Ivy', 'Jack', 'Kim'],
      },
      {
        voteCount: 2.7,
        voteOrder: ['George', 'Hank', 'Ivy', 'Jack', 'Kim', 'Liam'],
      },
      {
        voteCount: 1.2,
        voteOrder: ['Hank', 'Ivy', 'Jack', 'Kim', 'Liam', 'Alice'],
      },
      {
        voteCount: 3.5,
        voteOrder: ['Ivy', 'Jack', 'Kim', 'Liam', 'Alice', 'Bob'],
      },
      {
        voteCount: 2.5,
        voteOrder: ['Jack', 'Kim', 'Liam', 'Alice', 'Bob', 'Charlie'],
      },
      {
        voteCount: 2,
        voteOrder: ['Kim', 'Liam', 'Alice', 'Bob', 'Charlie', 'Dave'],
      },
      {
        voteCount: 1.8,
        voteOrder: ['Liam', 'Alice', 'Bob', 'Charlie', 'Dave', 'Eve'],
      },
      {
        voteCount: 3.1,
        voteOrder: ['Alice', 'Charlie', 'Eve', 'Frank', 'George', 'Hank'],
      },
      {
        voteCount: 2.4,
        voteOrder: ['Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'George'],
      },
      {
        voteCount: 1.9,
        voteOrder: ['Charlie', 'Dave', 'Eve', 'Frank', 'George', 'Hank'],
      },
      {
        voteCount: 2.2,
        voteOrder: ['Dave', 'Eve', 'Frank', 'George', 'Hank', 'Ivy'],
      },
      {
        voteCount: 2.6,
        voteOrder: ['Eve', 'Frank', 'George', 'Hank', 'Ivy', 'Jack'],
      },
      {
        voteCount: 1.4,
        voteOrder: ['Frank', 'George', 'Hank', 'Ivy', 'Jack', 'Kim'],
      },
      {
        voteCount: 3.3,
        voteOrder: ['George', 'Hank', 'Ivy', 'Jack', 'Kim', 'Liam'],
      },
      {
        voteCount: 2.1,
        voteOrder: ['Hank', 'Ivy', 'Jack', 'Kim', 'Liam', 'Alice'],
      },
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 6);
    expect(winners).toEqual(
      expect.arrayContaining([
        'Alice',
        'Bob',
        'Charlie',
        'Eve',
        'George',
        'Hank',
      ]),
    ); // Expect these candidates to win
    expect(tieCount).toBe(0); // No tie expected
  });

  it('should handle ties correctly', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 1, voteOrder: ['Alice', 'Bob'] },
      { voteCount: 1, voteOrder: ['Bob', 'Alice'] },
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 1);
    expect(winners).toEqual(['Alice', 'Bob']);
    expect(tieCount).toBe(2); // Alice and Bob should tie
  });

  it('should distribute votes when a candidate exceeds the quota', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 3, voteOrder: ['Alice', 'Bob'] },
      { voteCount: 1, voteOrder: ['Bob', 'Charlie'] },
      { voteCount: 1, voteOrder: ['Charlie', 'Alice'] },
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 2);
    expect(winners).toEqual(['Alice', 'Bob']); // Alice should win first, and Bob after redistribution
    expect(tieCount).toBe(0);
  });

  it('should correctly eliminate the candidate with the fewest votes', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 2, voteOrder: ['Alice', 'Bob'] },
      { voteCount: 1, voteOrder: ['Charlie', 'Bob'] },
      { voteCount: 1, voteOrder: ['Bob', 'Charlie'] },
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 1);
    expect(winners).toEqual(['Alice']); // Alice should win after Charlie is eliminated
    expect(tieCount).toBe(0);
  });

  //   it('should handle the case where there are more winners than seats available', () => {
  //     const voteRecords: VoteRecord[] = [
  //       { voteCount: 1, voteOrder: ['Alice', 'Bob'] },
  //       { voteCount: 1, voteOrder: ['Alice', 'Bob'] },
  //       { voteCount: 1, voteOrder: ['Bob', 'Charlie'] },
  //       { voteCount: 1, voteOrder: ['Bob', 'Alice'] },
  //       { voteCount: 1, voteOrder: ['Charlie', 'Alice'] },
  //       { voteCount: 1, voteOrder: ['Dave', 'Eve'] },
  //       { voteCount: 1, voteOrder: ['Eve', 'Dave'] },
  //     ];
  //
  //     const { winners, tieCount } = calculateStvWinners(voteRecords, 3);
  //     console.log(winners);
  //     expect(winners.length).toBe(5);
  //     expect(winners).toEqual(['Alice', 'Bob', 'Charlie', 'Dave', 'Eve']);
  //     expect(tieCount).toBe(0); // No tie expected in this case
  //   });

  it('should correctly handle when maxRounds is reached', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 2.5, voteOrder: ['Alice', 'Bob'] },
      { voteCount: 3.7, voteOrder: ['Bob', 'Charlie'] },
      { voteCount: 1.5, voteOrder: ['Charlie', 'Dave'] },
      { voteCount: 2.3, voteOrder: ['Dave', 'Eve'] },
      { voteCount: 4, voteOrder: ['Eve', 'Alice'] },
      { voteCount: 1, voteOrder: ['Alice', 'Charlie'] },
    ];

    expect(
      () => calculateStvWinners(voteRecords, 1, 1), // Set maxRounds to 1
    ).toThrow('Max rounds exceeded');
  });

  it('should correctly redistribute votes when a candidate is eliminated', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 2, voteOrder: ['Alice', 'Charlie'] },
      { voteCount: 1, voteOrder: ['Bob', 'Alice'] },
      { voteCount: 1, voteOrder: ['Charlie', 'Bob'] },
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 2);
    expect(winners).toEqual(['Alice', 'Charlie']); // Alice wins first, followed by Charlie
    expect(tieCount).toBe(0);
  });

  it('should correctly pick winners in scenario #1A', () => {
    // Quota: 80
    const voteRecords: VoteRecord[] = [
      { voteCount: 70, voteOrder: ['Alice', 'Dave', 'Charlie', 'Bob'] },
      { voteCount: 63, voteOrder: ['Bob', 'Charlie', 'Alice', 'Dave'] },
      { voteCount: 57, voteOrder: ['Charlie', 'Bob', 'Alice', 'Dave'] },
      { voteCount: 50, voteOrder: ['Dave', 'Alice', 'Bob', 'Charlie'] }, // Eliminated
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 2);
    expect(winners).toEqual(['Alice', 'Charlie']); // Alice wins first, followed by Charlie
    expect(tieCount).toBe(0);
  });

  it('should correctly pick winners in scenario #1B', () => {
    // Quota: 80
    const voteRecords: VoteRecord[] = [
      { voteCount: 70, voteOrder: ['Alice', 'Dave', 'Charlie', 'Bob'] },
      { voteCount: 64, voteOrder: ['Bob', 'Charlie', 'Alice', 'Dave'] },
      { voteCount: 56, voteOrder: ['Charlie', 'Bob', 'Alice', 'Dave'] },
      { voteCount: 50, voteOrder: ['Dave', 'Alice', 'Bob', 'Charlie'] }, // Eliminated
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 2);
    expect(winners).toEqual(['Alice', 'Bob']); // Alice wins first, followed by Bob
    expect(tieCount).toBe(0);
  });

  it('should correctly pick winners in scenario #2', () => {
    // Quota: 60
    const voteRecords: VoteRecord[] = [
      { voteCount: 63, voteOrder: ['Alice', 'Dave', 'Charlie', 'Bob'] },
      { voteCount: 57, voteOrder: ['Dave', 'Alice', 'Bob', 'Charlie'] },
      { voteCount: 60, voteOrder: ['Bob', 'Charlie', 'Alice', 'Dave'] },
      { voteCount: 60, voteOrder: ['Charlie', 'Alice', 'Bob', 'Dave'] },
    ];

    const { winners, tieCount } = calculateStvWinners(voteRecords, 3);
    expect(winners).toEqual(['Alice', 'Bob', 'Charlie']); // Alice wins first, followed by Bob and Charlie
    expect(tieCount).toBe(2);
  });
});

describe('calculateTotalVotes', () => {
  it('should return the sum of vote counts for normal cases', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 3, voteOrder: ['A', 'B', 'C'] },
      { voteCount: 5, voteOrder: ['B', 'C', 'A'] },
      { voteCount: 2, voteOrder: ['C', 'A', 'B'] },
    ];
    expect(calculateTotalVotes(voteRecords)).toBe(10);
  });

  it('should return 0 when no vote records are provided', () => {
    const voteRecords: VoteRecord[] = [];
    expect(calculateTotalVotes(voteRecords)).toBe(0);
  });

  it('should handle large numbers correctly', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 1000000000, voteOrder: ['A', 'B', 'C'] },
      { voteCount: 2000000000, voteOrder: ['B', 'C', 'A'] },
    ];
    expect(calculateTotalVotes(voteRecords)).toBe(3000000000);
  });

  it('should handle a single vote record correctly', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 7, voteOrder: ['A', 'B', 'C'] },
    ];
    expect(calculateTotalVotes(voteRecords)).toBe(7);
  });

  it('should handle negative votes if they are allowed', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: -3, voteOrder: ['A', 'B', 'C'] },
      { voteCount: 5, voteOrder: ['B', 'C', 'A'] },
    ];
    expect(calculateTotalVotes(voteRecords)).toBe(2);
  });
});

describe('calculateQuota', () => {
  it('should calculate the correct Droop quota for normal cases', () => {
    expect(calculateQuota(100, 3)).toBe(25);
  });

  it('should handle a case where totalVotes is zero', () => {
    expect(calculateQuota(0, 3)).toBe(0);
  });

  it('should return a floating point value for cases where votes don’t divide evenly', () => {
    expect(calculateQuota(107, 4)).toBeCloseTo(21.4, 1);
  });

  it('should handle a large number of seats correctly', () => {
    expect(calculateQuota(1000, 999)).toBe(1);
  });

  it('should return Infinity if the number of seats is -1 (though such input should be handled beforehand)', () => {
    expect(calculateQuota(100, -1)).toBe(Infinity);
  });
});

describe('initializeCandidateSet', () => {
  it('should initialize a candidate set with correct total votes', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 3, voteOrder: ['A', 'B', 'C'] },
      { voteCount: 5, voteOrder: ['A', 'C', 'B'] },
      { voteCount: 2, voteOrder: ['B', 'A', 'C'] },
    ];
    const candidateSet = initializeCandidateSet(voteRecords);
    expect(candidateSet.get('A')?.totalVotes).toBe(8);
    expect(candidateSet.get('B')?.totalVotes).toBe(2);
  });

  it('should handle empty vote records', () => {
    const voteRecords: VoteRecord[] = [];
    const candidateSet = initializeCandidateSet(voteRecords);
    expect(candidateSet.size).toBe(0);
  });

  it('should handle a single vote record', () => {
    const voteRecords: VoteRecord[] = [{ voteCount: 1, voteOrder: ['A'] }];
    const candidateSet = initializeCandidateSet(voteRecords);
    expect(candidateSet.size).toBe(1);
    expect(candidateSet.get('A')?.totalVotes).toBe(1);
  });

  it('should aggregate votes correctly when there are multiple records for the same candidate', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 3, voteOrder: ['A', 'B'] },
      { voteCount: 4, voteOrder: ['A', 'C'] },
    ];
    const candidateSet = initializeCandidateSet(voteRecords);
    expect(candidateSet.get('A')?.totalVotes).toBe(7);
  });

  it('should ignore records with empty vote orders', () => {
    const voteRecords: VoteRecord[] = [
      { voteCount: 3, voteOrder: [] },
      { voteCount: 4, voteOrder: ['A', 'C'] },
    ];
    const candidateSet = initializeCandidateSet(voteRecords);
    expect(candidateSet.size).toBe(1);
    expect(candidateSet.get('A')?.totalVotes).toBe(4);
  });
});

describe('getCandidatesAboveQuota', () => {
  it('should return candidates above the quota', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 30, votes: [] }],
      ['B', { totalVotes: 25, votes: [] }],
      ['C', { totalVotes: 10, votes: [] }],
    ]);
    const result = getCandidatesAboveQuota(candidateSet, 20);
    expect(result).toHaveLength(2);
    expect(result.map(([c]) => c)).toContain('A');
    expect(result.map(([c]) => c)).toContain('B');
  });

  it('should return an empty array if no candidate is above the quota', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 10, votes: [] }],
      ['B', { totalVotes: 15, votes: [] }],
      ['C', { totalVotes: 5, votes: [] }],
    ]);
    const result = getCandidatesAboveQuota(candidateSet, 20);
    expect(result).toHaveLength(0);
  });

  it('should sort candidates by descending vote count', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 40, votes: [] }],
      ['B', { totalVotes: 30, votes: [] }],
      ['C', { totalVotes: 25, votes: [] }],
    ]);
    const result = getCandidatesAboveQuota(candidateSet, 20);
    expect(result).toHaveLength(3);
    expect(result[0][0]).toBe('A');
    expect(result[1][0]).toBe('B');
    expect(result[2][0]).toBe('C');
  });

  it('should return candidates correctly when all candidates are above the quota', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 40, votes: [] }],
      ['B', { totalVotes: 30, votes: [] }],
      ['C', { totalVotes: 25, votes: [] }],
    ]);
    const result = getCandidatesAboveQuota(candidateSet, 20);
    expect(result).toHaveLength(3);
    expect(result.map(([c]) => c)).toContain('A');
    expect(result.map(([c]) => c)).toContain('B');
    expect(result.map(([c]) => c)).toContain('C');
  });
});

describe('selectWinnersFromAboveQuota', () => {
  it('should select candidates above the quota as winners', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 30, votes: [] }],
      ['B', { totalVotes: 25, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 2);
    expect(result.winners).toHaveLength(2);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.tieCount).toBe(0);
  });

  it('should handle tie cases', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 25, votes: [] }],
      ['B', { totalVotes: 25, votes: [] }],
      ['C', { totalVotes: 20, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 2);
    expect(result.winners).toHaveLength(2);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.tieCount).toBe(2);
  });

  it('should select more winners than there are seats if last few winners are tied', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 25, votes: [] }],
      ['B', { totalVotes: 25, votes: [] }],
      ['C', { totalVotes: 20, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 1);
    expect(result.winners).toHaveLength(2);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.tieCount).toBe(2);
  });

  it('should handle tripe tie cases', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 25, votes: [] }],
      ['B', { totalVotes: 25, votes: [] }],
      ['C', { totalVotes: 25, votes: [] }],
      ['D', { totalVotes: 20, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 2);
    expect(result.winners).toHaveLength(3);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.winners).toContain('C');
    expect(result.tieCount).toBe(3);
  });

  it('should stop selecting when the number of seats is filled', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 40, votes: [] }],
      ['B', { totalVotes: 30, votes: [] }],
      ['C', { totalVotes: 25, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 2);
    expect(result.winners).toHaveLength(2);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.winners).not.toContain('C');
    expect(result.tieCount).toBe(0);
  });

  it('should take previous winners into account when filling seats', () => {
    const winners: Candidate[] = ['A'];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['B', { totalVotes: 40, votes: [] }],
      ['C', { totalVotes: 30, votes: [] }],
      ['D', { totalVotes: 25, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 2);
    expect(result.winners).toHaveLength(2);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.winners).not.toContain('C');
    expect(result.winners).not.toContain('D');
    expect(result.tieCount).toBe(0);
  });

  it('should continue selecting when seats remain available', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 40, votes: [] }],
      ['B', { totalVotes: 30, votes: [] }],
      ['C', { totalVotes: 25, votes: [] }],
      ['D', { totalVotes: 15, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 3);
    expect(result.winners).toHaveLength(3);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.winners).toContain('C');
    expect(result.winners).not.toContain('D');
    expect(result.tieCount).toBe(0);
  });

  it('should correctly handle more seats than candidates', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 30, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 3);
    expect(result.winners).toHaveLength(1);
    expect(result.winners).toContain('A');
    expect(result.tieCount).toBe(0);
  });

  it('should handle a case with no candidates above the quota', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 2);
    expect(result.winners).toHaveLength(0);
    expect(result.tieCount).toBe(0);
  });

  it('should reset the tie count if a candidate has fewer votes than the last', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 30, votes: [] }],
      ['B', { totalVotes: 30, votes: [] }],
      ['C', { totalVotes: 25, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 3);
    expect(result.winners).toHaveLength(3);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.winners).toContain('C');
    expect(result.tieCount).toBe(0); // Reset because C has fewer votes
  });

  it('should correctly handle ties further down the candidate list', () => {
    const winners: Candidate[] = [];
    const aboveQuota: [Candidate, CandidateMapItem][] = [
      ['A', { totalVotes: 35, votes: [] }],
      ['B', { totalVotes: 30, votes: [] }],
      ['C', { totalVotes: 25, votes: [] }],
      ['D', { totalVotes: 25, votes: [] }],
    ];
    const result = selectWinnersFromAboveQuota(winners, aboveQuota, 3);
    expect(result.winners).toHaveLength(4);
    expect(result.winners).toContain('A');
    expect(result.winners).toContain('B');
    expect(result.winners).toContain('C');
    expect(result.winners).toContain('D');
    expect(result.tieCount).toBe(2);
  });
});

describe('distributeVotes', () => {
  it('should remove the candidate from all votes and redistribute excess votes', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      [
        'A',
        {
          totalVotes: 30,
          votes: [{ voteCount: 30, voteOrder: ['A', 'B', 'C'] }],
        },
      ],
      [
        'B',
        {
          totalVotes: 20,
          votes: [{ voteCount: 20, voteOrder: ['B', 'A', 'C'] }],
        },
      ],
      [
        'C',
        {
          totalVotes: 10,
          votes: [{ voteCount: 10, voteOrder: ['C', 'A', 'B'] }],
        },
      ],
    ]);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    distributeVotes('A', candidateSet.get('A')!, candidateSet, 25, {
      value: 60,
    });
    expect(candidateSet.has('A')).toBe(false);
    expect(candidateSet.get('B')?.totalVotes).toBeGreaterThan(20); // B should receive additional votes
  });

  it('should handle the case where no excess votes are present', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      [
        'A',
        {
          totalVotes: 25,
          votes: [{ voteCount: 25, voteOrder: ['A', 'B', 'C'] }],
        },
      ],
      [
        'B',
        {
          totalVotes: 20,
          votes: [{ voteCount: 20, voteOrder: ['B', 'A', 'C'] }],
        },
      ],
    ]);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    distributeVotes('A', candidateSet.get('A')!, candidateSet, 25, {
      value: 45,
    });
    expect(candidateSet.has('A')).toBe(false);
    expect(candidateSet.get('B')?.totalVotes).toBe(20);
  });

  it('should not affect the candidate set if the candidate has no votes', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 0, votes: [] }],
      [
        'B',
        {
          totalVotes: 20,
          votes: [{ voteCount: 20, voteOrder: ['B', 'C', 'A'] }],
        },
      ],
    ]);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    distributeVotes('A', candidateSet.get('A')!, candidateSet, 25, {
      value: 20,
    });
    expect(candidateSet.has('A')).toBe(false);
    expect(candidateSet.get('B')?.totalVotes).toBe(20);
  });

  it('should handle the situation where all votes are exhausted', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 30, votes: [{ voteCount: 30, voteOrder: ['A'] }] }],
    ]);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    distributeVotes('A', candidateSet.get('A')!, candidateSet, 25, {
      value: 30,
    });
    expect(candidateSet.has('A')).toBe(false);
  });
});

describe('removeCandidateFromAllVotes', () => {
  it('should remove the candidate from all vote orders', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      [
        'A',
        {
          totalVotes: 30,
          votes: [{ voteCount: 30, voteOrder: ['A', 'B', 'C'] }],
        },
      ],
      [
        'B',
        {
          totalVotes: 20,
          votes: [{ voteCount: 20, voteOrder: ['B', 'A', 'C'] }],
        },
      ],
    ]);
    removeCandidateFromAllVotes('A', candidateSet);
    expect(candidateSet.has('A')).toBe(false);
    expect(candidateSet.get('B')?.votes[0].voteOrder).toEqual(['B', 'C']);
  });

  it('should handle the case where the candidate is not present in some vote orders', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      [
        'A',
        {
          totalVotes: 30,
          votes: [{ voteCount: 30, voteOrder: ['A', 'B', 'C'] }],
        },
      ],
      [
        'B',
        { totalVotes: 20, votes: [{ voteCount: 20, voteOrder: ['B', 'C'] }] },
      ],
    ]);
    removeCandidateFromAllVotes('A', candidateSet);
    expect(candidateSet.has('A')).toBe(false);
    expect(candidateSet.get('B')?.votes[0].voteOrder).toEqual(['B', 'C']);
  });

  it('should handle the case where the candidate is the only candidate in some vote orders', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 30, votes: [{ voteCount: 30, voteOrder: ['A'] }] }],
      [
        'B',
        { totalVotes: 20, votes: [{ voteCount: 20, voteOrder: ['B', 'A'] }] },
      ],
    ]);
    removeCandidateFromAllVotes('A', candidateSet);
    expect(candidateSet.has('A')).toBe(false);
    expect(candidateSet.get('B')?.votes[0].voteOrder).toEqual(['B']);
  });

  it('should not remove any candidates if the candidate is not in any vote orders', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      [
        'A',
        { totalVotes: 30, votes: [{ voteCount: 30, voteOrder: ['B', 'C'] }] },
      ],
      [
        'B',
        { totalVotes: 20, votes: [{ voteCount: 20, voteOrder: ['B', 'C'] }] },
      ],
    ]);
    removeCandidateFromAllVotes('A', candidateSet);
    expect(candidateSet.has('A')).toBe(false);
    expect(candidateSet.get('B')?.votes[0].voteOrder).toEqual(['B', 'C']);
  });
});

describe('redistributeExcessVotes', () => {
  it('should redistribute excess votes to other candidates', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['B', { totalVotes: 10, votes: [{ voteCount: 10, voteOrder: ['B'] }] }],
      ['C', { totalVotes: 0, votes: [] }],
    ]);
    const candidateData = {
      totalVotes: 30,
      votes: [{ voteCount: 30, voteOrder: ['B', 'C'] }],
    };
    redistributeExcessVotes(candidateData, candidateSet, 25, { value: 60 });
    expect(candidateSet.get('B')?.totalVotes).toBe(10 + (30 - 25));
  });

  it('should not redistribute if totalVotesForProportion is zero', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['B', { totalVotes: 10, votes: [{ voteCount: 10, voteOrder: ['B'] }] }],
      ['C', { totalVotes: 0, votes: [] }],
    ]);
    const candidateData = {
      totalVotes: 30,
      votes: [{ voteCount: 30, voteOrder: ['A'] }],
    };
    redistributeExcessVotes(candidateData, candidateSet, 25, { value: 60 });
    expect(candidateSet.get('B')?.totalVotes).toBe(10);
  });

  it('should handle redistribution when the candidate has exactly the quota', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['B', { totalVotes: 10, votes: [{ voteCount: 10, voteOrder: ['B'] }] }],
    ]);
    const candidateData = {
      totalVotes: 25,
      votes: [{ voteCount: 25, voteOrder: ['A', 'B'] }],
    };
    redistributeExcessVotes(candidateData, candidateSet, 25, { value: 50 });
    expect(candidateSet.get('B')?.totalVotes).toBe(10);
  });

  it('should reduce newQuotaTotalVotes when all votes are exhausted', () => {
    const newQuotaTotalVotes = { value: 100 };
    const candidateSet = new Map<Candidate, CandidateMapItem>();
    const candidateData = {
      totalVotes: 30,
      votes: [{ voteCount: 30, voteOrder: [] }],
    };
    redistributeExcessVotes(
      candidateData,
      candidateSet,
      25,
      newQuotaTotalVotes,
    );
    expect(newQuotaTotalVotes.value).toBeLessThan(100);
  });
});

describe('organizeVotesByNextCandidate', () => {
  it('should organize votes by the next candidate in the preference list', () => {
    const votes: VoteRecord[] = [
      { voteCount: 10, voteOrder: ['B', 'C'] },
      { voteCount: 20, voteOrder: ['B', 'A'] },
    ];
    const organizedVotes = organizeVotesByNextCandidate(votes);
    expect(organizedVotes.size).toBe(1);
    expect(organizedVotes.get('B')?.totalVotes).toBe(30);
  });

  it('should handle the case where votes have different next candidates', () => {
    const votes: VoteRecord[] = [
      { voteCount: 10, voteOrder: ['B', 'C'] },
      { voteCount: 20, voteOrder: ['C', 'A'] },
    ];
    const organizedVotes = organizeVotesByNextCandidate(votes);
    expect(organizedVotes.size).toBe(2);
    expect(organizedVotes.get('B')?.totalVotes).toBe(10);
    expect(organizedVotes.get('C')?.totalVotes).toBe(20);
  });

  it('should ignore votes that have no next candidate', () => {
    const votes: VoteRecord[] = [
      { voteCount: 10, voteOrder: [] },
      { voteCount: 20, voteOrder: ['C', 'A'] },
    ];
    const organizedVotes = organizeVotesByNextCandidate(votes);
    expect(organizedVotes.size).toBe(1);
    expect(organizedVotes.get('C')?.totalVotes).toBe(20);
  });

  it('should aggregate votes for the same next candidate', () => {
    const votes: VoteRecord[] = [
      { voteCount: 10, voteOrder: ['B', 'C'] },
      { voteCount: 5, voteOrder: ['B', 'A'] },
    ];
    const organizedVotes = organizeVotesByNextCandidate(votes);
    expect(organizedVotes.size).toBe(1);
    expect(organizedVotes.get('B')?.totalVotes).toBe(15);
  });

  it('should handle votes with only one candidate', () => {
    const votes: VoteRecord[] = [
      { voteCount: 10, voteOrder: ['B'] },
      { voteCount: 20, voteOrder: ['B'] },
    ];
    const organizedVotes = organizeVotesByNextCandidate(votes);
    expect(organizedVotes.size).toBe(1);
    expect(organizedVotes.get('B')?.totalVotes).toBe(30);
  });

  it('should handle empty vote records gracefully', () => {
    const votes: VoteRecord[] = [];
    const organizedVotes = organizeVotesByNextCandidate(votes);
    expect(organizedVotes.size).toBe(0);
  });
});

describe('redistributeToCandidates', () => {
  it('should correctly redistribute votes to existing candidates', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['B', { totalVotes: 10, votes: [] }],
      ['C', { totalVotes: 20, votes: [] }],
    ]);
    const organizedVotes = new Map<Candidate, CandidateMapItem>([
      [
        'B',
        { totalVotes: 10, votes: [{ voteCount: 10, voteOrder: ['B', 'C'] }] },
      ],
      [
        'C',
        { totalVotes: 20, votes: [{ voteCount: 20, voteOrder: ['C', 'A'] }] },
      ],
    ]);
    redistributeToCandidates(organizedVotes, candidateSet, 1, 10, 30);
    expect(candidateSet.get('B')?.totalVotes).toBeCloseTo(13.33, 2); // B should receive approximately 3.33 additional votes
    expect(candidateSet.get('C')?.totalVotes).toBeCloseTo(26.67, 2); // C should receive approximately 6.67 additional votes
  });

  it('should correctly redistribute votes to a new candidate', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['B', { totalVotes: 10, votes: [] }],
    ]);
    const organizedVotes = new Map<Candidate, CandidateMapItem>([
      [
        'C',
        { totalVotes: 20, votes: [{ voteCount: 20, voteOrder: ['C', 'A'] }] },
      ],
    ]);
    redistributeToCandidates(organizedVotes, candidateSet, 1, 10, 30);
    expect(candidateSet.has('C')).toBe(true);
    expect(candidateSet.get('C')?.totalVotes).toBeCloseTo(6.67, 2); // C should receive approximately 6.67 additional votes
  });

  it('should apply the vote multiplier correctly', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['B', { totalVotes: 10, votes: [] }],
    ]);
    const organizedVotes = new Map<Candidate, CandidateMapItem>([
      [
        'B',
        { totalVotes: 10, votes: [{ voteCount: 10, voteOrder: ['B', 'C'] }] },
      ],
    ]);
    redistributeToCandidates(organizedVotes, candidateSet, 0.5, 10, 20);
    expect(candidateSet.get('B')?.totalVotes).toBe(15); // B should receive 5 additional votes
  });

  it('should handle the case where there are no votes to redistribute', () => {
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['B', { totalVotes: 10, votes: [] }],
    ]);
    const organizedVotes = new Map<Candidate, CandidateMapItem>();
    redistributeToCandidates(organizedVotes, candidateSet, 1, 10, 20);
    expect(candidateSet.get('B')?.totalVotes).toBe(10); // No votes redistributed, B should remain the same
  });
});

describe('eliminateLowestCandidate', () => {
  it('should eliminate the candidate with the lowest votes and redistribute', () => {
    const winners: Candidate[] = [];
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      [
        'A',
        {
          totalVotes: 10,
          votes: [{ voteCount: 10, voteOrder: ['A', 'B', 'C'] }],
        },
      ],
      [
        'B',
        {
          totalVotes: 20,
          votes: [{ voteCount: 20, voteOrder: ['B', 'A', 'C'] }],
        },
      ],
      [
        'C',
        {
          totalVotes: 30,
          votes: [{ voteCount: 30, voteOrder: ['C', 'B', 'A'] }],
        },
      ],
    ]);
    eliminateLowestCandidate(candidateSet, winners, 2, { value: 60 });
    expect(candidateSet.has('A')).toBe(false);
    expect(candidateSet.get('B')?.totalVotes).toBeGreaterThan(20);
  });

  it('should handle the case where all candidates are eliminated', () => {
    const winners: Candidate[] = [];
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 10, votes: [{ voteCount: 10, voteOrder: ['A'] }] }],
    ]);
    eliminateLowestCandidate(candidateSet, winners, 1, { value: 10 });
    expect(candidateSet.size).toBe(0);
    expect(winners).toHaveLength(1);
    expect(winners).toContain('A');
  });

  it('should correctly identify the lowest candidate when multiple candidates exist', () => {
    const winners: Candidate[] = [];
    const candidateSet = new Map<Candidate, CandidateMapItem>([
      ['A', { totalVotes: 10, votes: [{ voteCount: 10, voteOrder: ['A'] }] }],
      ['B', { totalVotes: 5, votes: [{ voteCount: 5, voteOrder: ['B'] }] }],
      ['C', { totalVotes: 20, votes: [{ voteCount: 20, voteOrder: ['C'] }] }],
    ]);
    eliminateLowestCandidate(candidateSet, winners, 2, { value: 35 });
    expect(candidateSet.has('B')).toBe(false);
    expect(candidateSet.has('A')).toBe(true);
    expect(candidateSet.has('C')).toBe(true);
  });

  it('should throw an error if no lowest candidate is found (should not happen)', () => {
    const winners: Candidate[] = [];
    const candidateSet = new Map<Candidate, CandidateMapItem>();
    expect(() =>
      eliminateLowestCandidate(candidateSet, winners, 1, { value: 0 }),
    ).toThrow('No lowest candidate found. Should not happen.');
  });
});
