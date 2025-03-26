import type { Candidate, CandidateMapItem } from '.';

type CandidateMap = Map<Candidate, CandidateMapItem>;

export interface CandidateVoteSummary {
  candidate: Candidate;
  totalVotes: number;
  totalWallets: number;
}

export enum LogType {
  ABOVE_QUOTA,
  SELECT_WINNER,
  ELIMINATE_CANDIDATE,
  UPDATE_DISTRIBUTION,
  UPDATE_QUOTA,
}

export interface LogDistributionMessage {
  type: LogType.UPDATE_DISTRIBUTION;
  voteDistribution: CandidateVoteSummary[];
}

export interface LogAboveQuotaMessage {
  type: LogType.ABOVE_QUOTA;
  candidate: Candidate;
}

export interface LogCandidateActionMessage {
  type: LogType.SELECT_WINNER | LogType.ELIMINATE_CANDIDATE;
  candidate: Candidate;
  voteDistribution?: CandidateVoteSummary[];
}

export interface LogQuotaUpdateMessage {
  type: LogType.UPDATE_QUOTA;
  quota: number;
}

export type LogMessage =
  | LogDistributionMessage
  | LogAboveQuotaMessage
  | LogCandidateActionMessage
  | LogQuotaUpdateMessage;

export class Logger {
  #logs: LogMessage[] = [];

  markAboveQuota(candidates: Candidate[]) {
    candidates.forEach((candidate) => {
      this.#logs.push({
        type: LogType.ABOVE_QUOTA,
        candidate,
      });
    });
  }

  selectWinner(candidate: Candidate, candidateMap?: CandidateMap) {
    let voteDistribution: CandidateVoteSummary[] | undefined = undefined;
    if (candidateMap) {
      voteDistribution = this.#getVoteDistribution(candidateMap);
    }
    this.#logs.push({
      type: LogType.SELECT_WINNER,
      candidate,
      voteDistribution,
    });
  }

  eliminateLowestCandidate(candidate: Candidate, candidateMap: CandidateMap) {
    const voteDistribution = this.#getVoteDistribution(candidateMap);
    this.#logs.push({
      type: LogType.ELIMINATE_CANDIDATE,
      candidate,
      voteDistribution,
    });
  }

  updateVoteDistribution(candidateMap: CandidateMap) {
    const voteDistribution = this.#getVoteDistribution(candidateMap);
    this.#logs.push({
      type: LogType.UPDATE_DISTRIBUTION,
      voteDistribution,
    });
  }

  updateQuota(quota: number) {
    this.#logs.push({
      type: LogType.UPDATE_QUOTA,
      quota,
    });
  }

  getLogs() {
    return this.#logs;
  }

  #getVoteDistribution(candidateMap: CandidateMap): CandidateVoteSummary[] {
    return Array.from(candidateMap.entries()).map(([candidate, data]) => ({
      candidate,
      totalVotes: data.totalVotes,
      totalWallets: data.votes.length,
    }));
  }
}
