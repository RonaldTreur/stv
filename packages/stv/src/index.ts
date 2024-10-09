import { Logger, LogMessage } from './logger';

export type Candidate = string;
export type VoteRecord = {
  voteCount: number;
  voteOrder: Candidate[];
};

export type CandidateMapItem = {
  totalVotes: number;
  votes: VoteRecord[];
};

let logger: Logger;

export function calculateStvWinners(
  voteRecords: VoteRecord[],
  seats: number,
  maxRounds: number | null = 1000,
): { winners: Candidate[]; tieCount: number; logs: LogMessage[] } {
  logger = new Logger();
  voteRecords = combineVoteRecords(voteRecords);
  const totalVotes = calculateTotalVotes(voteRecords);
  const quota = calculateQuota(totalVotes, seats);
  const candidateSet = initializeCandidateSet(voteRecords);
  logger.updateQuota(quota);
  logger.updateVoteDistribution(candidateSet);
  return processElection(candidateSet, seats, quota, totalVotes, maxRounds);
}

// Calculate the total votes from vote records
export function calculateTotalVotes(voteRecords: VoteRecord[]): number {
  return voteRecords.reduce((acc, { voteCount }) => acc + voteCount, 0);
}

// Calculate the Droop quota
export function calculateQuota(totalVotes: number, seats: number): number {
  return totalVotes / (seats + 1);
}

// Initialize the candidate set with votes
export function initializeCandidateSet(
  voteRecords: VoteRecord[],
): Map<Candidate, CandidateMapItem> {
  const candidateSet = new Map<Candidate, CandidateMapItem>();

  for (const record of voteRecords) {
    if (record.voteOrder.length === 0) {
      // Skip empty vote orders
      continue;
    }
    const candidate = candidateSet.get(record.voteOrder[0]);
    if (candidate) {
      candidate.totalVotes += record.voteCount;
      candidate.votes.push(record);
    } else {
      candidateSet.set(record.voteOrder[0], {
        totalVotes: record.voteCount,
        votes: [record],
      });
    }
  }

  return candidateSet;
}

// Main election processing logic
export function processElection(
  candidateSet: Map<Candidate, CandidateMapItem>,
  seats: number,
  initialQuota: number,
  totalVotes: number,
  maxRounds: number | null,
): { winners: Candidate[]; tieCount: number; logs: LogMessage[] } {
  const winners: Candidate[] = [];
  let rounds = 0;
  let quota = initialQuota;
  const newQuotaTotalVotes = { value: totalVotes };

  while (winners.length < seats) {
    // console.log(
    //   JSON.stringify(
    //     {
    //       round: rounds + 1,
    //       quota,
    //       candidateSet: Array.from(candidateSet.entries()),
    //     },
    //     null,
    //     2,
    //   ),
    // );
    if (maxRounds !== null && rounds >= maxRounds) {
      throw new Error('Max rounds exceeded');
    }

    if (candidateSet.size === 0) {
      throw new Error('No candidates left. Should not happen.');
    }

    const aboveQuota = getCandidatesAboveQuota(candidateSet, quota);
    logger.markAboveQuota(aboveQuota.map(([candidate]) => candidate));

    if (aboveQuota.length > seats - winners.length) {
      // console.log(`Final above quota: ${JSON.stringify(aboveQuota, null, 2)}`);
      return {
        ...selectWinnersFromAboveQuota(winners, aboveQuota, seats),
        logs: logger.getLogs(),
      };
    } else if (aboveQuota.length > 0) {
      // console.log(`Above quota: ${JSON.stringify(aboveQuota, null, 2)}`);
      for (const candidate of aboveQuota) {
        winners.push(candidate[0]);
        distributeVotes(
          candidate[0],
          candidate[1],
          candidateSet,
          quota,
          newQuotaTotalVotes,
        );
        logger.selectWinner(candidate[0], candidateSet);
      }
    } else {
      // console.log('No candidates above quota');
      eliminateLowestCandidate(
        candidateSet,
        winners,
        seats,
        newQuotaTotalVotes,
      );
    }

    const oldQuota = quota;
    quota = newQuotaTotalVotes.value / (seats + 1);
    if (oldQuota !== quota) {
      logger.updateQuota(quota);
    }
    rounds += 1;
  }

  return { winners, tieCount: 0, logs: logger.getLogs() };
}

// Get candidates who are above the quota
export function getCandidatesAboveQuota(
  candidateSet: Map<Candidate, CandidateMapItem>,
  quota: number,
): [Candidate, CandidateMapItem][] {
  return Array.from(candidateSet.entries())
    .filter(([, candidateItem]) => candidateItem.totalVotes >= quota)
    .sort((a, b) => b[1].totalVotes - a[1].totalVotes);
}

// Select winners from the candidates who are above the quota
export function selectWinnersFromAboveQuota(
  winners: Candidate[],
  aboveQuota: [Candidate, CandidateMapItem][],
  seats: number,
): { winners: Candidate[]; tieCount: number } {
  if (aboveQuota.length === 0) {
    // console.log('No candidates above quota');
    return { winners, tieCount: 0 };
  }

  let tieCount = 0;
  // Length checked above
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const firstCandidate = aboveQuota.shift()!;
  let lastVotes = firstCandidate?.[1].totalVotes;

  winners.push(firstCandidate[0]);
  logger.selectWinner(firstCandidate[0]);

  for (const [candidate, { totalVotes }] of aboveQuota) {
    // console.log(`Evaluating ${candidate} with ${totalVotes} votes`);
    if (totalVotes === lastVotes) {
      tieCount += 1;
      winners.push(candidate);
      logger.selectWinner(candidate);
    } else if (winners.length >= seats) {
      break;
    } else {
      tieCount = 0;
      winners.push(candidate);
      lastVotes = totalVotes;
      logger.selectWinner(candidate);
    }
  }

  return { winners, tieCount: tieCount > 0 ? tieCount + 1 : 0 };
}

// Distribute votes from a candidate
export function distributeVotes(
  candidate: Candidate,
  candidateData: CandidateMapItem,
  candidateSet: Map<Candidate, CandidateMapItem>,
  quota: number,
  newQuotaTotalVotes: { value: number },
): void {
  removeCandidateFromAllVotes(candidate, candidateSet);

  // console.log(
  //   `Distributing ${candidateData.totalVotes} votes for ${candidate}`,
  // );

  if (candidateData.votes.length === 0) {
    newQuotaTotalVotes.value -= candidateData.totalVotes;
    return;
  }

  // Redistribute excess votes to remaining candidates
  redistributeExcessVotes(
    candidateData,
    candidateSet,
    quota,
    newQuotaTotalVotes,
  );
}

// Remove the eliminated candidate from all votes
export function removeCandidateFromAllVotes(
  candidate: Candidate,
  candidateSet: Map<Candidate, CandidateMapItem>,
): void {
  for (const cVotes of candidateSet.values()) {
    cVotes.votes = combineVoteRecords(
      cVotes.votes.filter((vote) => {
        vote.voteOrder = vote.voteOrder.filter((c) => c !== candidate);
        return vote.voteOrder.length > 0;
      }),
    );
  }
  candidateSet.delete(candidate);
}

// Redistribute the excess votes from a candidate
export function redistributeExcessVotes(
  candidateData: CandidateMapItem,
  candidateSet: Map<Candidate, CandidateMapItem>,
  quota: number,
  newQuotaTotalVotes: { value: number },
): void {
  // Calculate total votes for proportion by summing the vote counts
  let totalVotesForProportion = 0;

  // Organize votes by the next candidate in line
  const organizedVotes = organizeVotesByNextCandidate(candidateData.votes);

  // Calculate totalVotesForProportion
  for (const { totalVotes } of organizedVotes.values()) {
    totalVotesForProportion += totalVotes;
  }

  if (totalVotesForProportion === 0) {
    // console.log(
    //   `No votes to redistribute, reducing quota by ${candidateData.totalVotes} votes`,
    // );
    newQuotaTotalVotes.value -= candidateData.totalVotes;
    return;
  }

  // Calculate the vote multiplier based on the excess votes
  const votesToRedistribute = candidateData.totalVotes - quota;
  const voteMultiplier = votesToRedistribute / totalVotesForProportion;
  // console.log(`Redistributing ${votesToRedistribute} votes`);

  // Redistribute the votes proportionally
  redistributeToCandidates(
    organizedVotes,
    candidateSet,
    voteMultiplier,
    votesToRedistribute,
    totalVotesForProportion,
  );
}

// Organize votes by the next candidate in the preference list
export function organizeVotesByNextCandidate(
  votes: VoteRecord[],
): Map<Candidate, CandidateMapItem> {
  const organizedVotes = new Map<Candidate, CandidateMapItem>();

  for (const vote of votes) {
    const nextCandidate = vote.voteOrder[0];
    if (nextCandidate === undefined) continue;

    const candidate = organizedVotes.get(nextCandidate);
    if (candidate) {
      candidate.totalVotes += vote.voteCount;
      candidate.votes.push(vote);
    } else {
      organizedVotes.set(nextCandidate, {
        totalVotes: vote.voteCount,
        votes: [vote],
      });
    }
  }

  return organizedVotes;
}

// Redistribute votes to the remaining candidates
export function redistributeToCandidates(
  organizedVotes: Map<Candidate, CandidateMapItem>,
  candidateSet: Map<Candidate, CandidateMapItem>,
  voteMultiplier: number,
  votesToRedistribute: number,
  totalVotesForProportion: number,
): void {
  for (const [candidate, vote] of organizedVotes) {
    vote.votes = combineVoteRecords(vote.votes);
    vote.votes.forEach((v) => (v.voteCount *= voteMultiplier));

    const votesToRedistributeForCandidate =
      votesToRedistribute * (vote.totalVotes / totalVotesForProportion);
    // console.log(
    //   `Redistributing ${votesToRedistributeForCandidate} votes to ${candidate}`,
    // );
    const newCandidate = candidateSet.get(candidate);
    if (newCandidate) {
      newCandidate.totalVotes += votesToRedistributeForCandidate;
      newCandidate.votes.push(...vote.votes);
      newCandidate.votes = combineVoteRecords(newCandidate.votes);
    } else {
      candidateSet.set(candidate, {
        totalVotes: votesToRedistributeForCandidate,
        votes: vote.votes,
      });
    }
  }
}

// Eliminate the candidate with the lowest votes
export function eliminateLowestCandidate(
  candidateSet: Map<Candidate, CandidateMapItem>,
  winners: Candidate[],
  seats: number,
  totalVotes: { value: number },
): void {
  let lowestVotes = Number.MAX_VALUE;
  let lowestCandidate: [Candidate, CandidateMapItem] | null = null;

  // Identify the candidate with the lowest votes
  for (const candidate of candidateSet) {
    if (candidate[1].totalVotes < lowestVotes) {
      lowestVotes = candidate[1].totalVotes;
      lowestCandidate = candidate;
    }
  }

  if (lowestCandidate === null) {
    throw new Error('No lowest candidate found. Should not happen.');
  }
  // console.log(
  //   `Eliminating ${lowestCandidate[0]} with ${lowestCandidate[1].totalVotes} votes.\nStats: ${JSON.stringify(lowestCandidate, null, 2)}`,
  // );

  // Remove the lowest candidate and redistribute their votes
  distributeVotes(
    lowestCandidate[0],
    lowestCandidate[1],
    candidateSet,
    0,
    totalVotes,
  );
  logger.eliminateLowestCandidate(lowestCandidate[0], candidateSet);

  // If all candidates are eliminated and no more seats to fill, add remaining candidates to winners
  if (candidateSet.size === 0 && winners.length < seats) {
    winners.push(lowestCandidate[0]);
    logger.selectWinner(lowestCandidate[0]);
  }
}

// Combine vote records with identical vote orders
export function combineVoteRecords(voteRecords: VoteRecord[]): VoteRecord[] {
  const out: VoteRecord[] = [];
  for (const record of voteRecords) {
    const existing = out.find((r) => arrayEqual(r.voteOrder, record.voteOrder));
    if (existing) {
      existing.voteCount += record.voteCount;
    } else if (record.voteCount > 0) {
      out.push(record);
    }
  }
  return out;
}

// Utility function to check if two arrays are equal
export function arrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
