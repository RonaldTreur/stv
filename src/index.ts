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

  // Initialize the candidate set with votes
  const candidateSet = getCandidateMapFromVoteRecords(voteRecords);
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

export function getCandidateMapFromVoteRecords(
  voteRecords: VoteRecord[],
): Map<Candidate, CandidateMapItem> {
  const candidateMap = new Map<Candidate, CandidateMapItem>();

  for (const record of voteRecords) {
    if (record.voteOrder.length === 0) {
      continue; // Skip empty vote orders
    }

    const preferredCandidate = record.voteOrder[0];
    const candidate = candidateMap.get(preferredCandidate);
    if (candidate) {
      candidate.totalVotes += record.voteCount;
      candidate.votes.push(record);
    } else {
      candidateMap.set(preferredCandidate, {
        totalVotes: record.voteCount,
        votes: [record],
      });
    }
  }

  return candidateMap;
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
      // RT: or equal to?
      // console.log(`Final above quota: ${JSON.stringify(aboveQuota, null, 2)}`);
      return {
        ...selectWinnersFromAboveQuota(winners, aboveQuota, seats),
        logs: logger.getLogs(),
      };
    } else if (aboveQuota.length > 0) {
      // console.log(`Above quota: ${JSON.stringify(aboveQuota, null, 2)}`);
      for (const [candidate, candidateData] of aboveQuota) {
        winners.push(candidate);

        const votesToRedistribute = candidateData.totalVotes - quota;
        // console.log(`Redistributing ${votesToRedistribute} votes`);

        distributeVotes(
          candidate,
          candidateData,
          candidateSet,
          votesToRedistribute,
          newQuotaTotalVotes,
        );
        logger.selectWinner(candidate, candidateSet);
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
    quota = calculateQuota(newQuotaTotalVotes.value, seats);
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
  votesToRedistribute: number,
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
    votesToRedistribute,
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
  excessVotes: number,
  newQuotaTotalVotes: { value: number },
): void {
  // Organize votes by the next candidate in line
  const nextInLineCandidates = getCandidateMapFromVoteRecords(
    candidateData.votes,
  );

  // Calculate total votes for proportion by summing the vote counts
  let totalAssignedBackupVotes = 0;
  for (const { totalVotes } of nextInLineCandidates.values()) {
    totalAssignedBackupVotes += totalVotes;
  }

  const unassignedVotes = candidateData.totalVotes - totalAssignedBackupVotes;
  if (unassignedVotes > 0) {
    // console.log(
    //   `Reducing quota by ${candidateData.totalVotes - totalAssignedBackupVotes} votes to account for missing backup candidates`,
    // );
    newQuotaTotalVotes.value -= unassignedVotes;
  }

  if (excessVotes === 0 || totalAssignedBackupVotes === 0) {
    return; // No excess votes to redistribute, or no backup votes assigned
  }

  // Calculate the vote multiplier based on the excess votes
  const voteMultiplier = excessVotes / candidateData.totalVotes;

  // Redistribute the votes proportionally
  redistributeToCandidates(nextInLineCandidates, candidateSet, voteMultiplier);
}

// Redistribute votes to the remaining candidates
export function redistributeToCandidates(
  nextCandidates: Map<Candidate, CandidateMapItem>,
  candidateSet: Map<Candidate, CandidateMapItem>,
  voteMultiplier: number,
): void {
  for (const [nextCandidate, nextCandidateData] of nextCandidates) {
    nextCandidateData.votes.forEach((v) => (v.voteCount *= voteMultiplier));

    const votesToRedistributeForCandidate =
      nextCandidateData.totalVotes * voteMultiplier;
    // console.log(
    //   `Redistributing ${votesToRedistributeForCandidate} votes to ${candidate}`,
    // );
    const candidate = candidateSet.get(nextCandidate);
    if (candidate) {
      candidate.totalVotes += votesToRedistributeForCandidate;
      candidate.votes.push(...nextCandidateData.votes);
      candidate.votes = combineVoteRecords(candidate.votes);
    } else {
      candidateSet.set(nextCandidate, {
        totalVotes: votesToRedistributeForCandidate,
        votes: nextCandidateData.votes,
      });
    }
  }
}

// Eliminate the candidate with the lowest votes
export function eliminateLowestCandidate(
  candidateSet: Map<Candidate, CandidateMapItem>,
  winners: Candidate[],
  seats: number,
  newQuotaTotalVotes: { value: number },
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

  const votesToRedistribute = lowestCandidate[1].totalVotes;
  // console.log(`Redistributing ${votesToRedistribute} votes`);

  // Remove the lowest candidate and redistribute their votes
  distributeVotes(
    lowestCandidate[0],
    lowestCandidate[1],
    candidateSet,
    votesToRedistribute,
    newQuotaTotalVotes,
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
