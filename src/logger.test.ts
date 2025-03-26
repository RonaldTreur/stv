import {
  calculateStvWinners,
  Candidate,
  CandidateMapItem,
  VoteRecord,
} from './index';
import {
  LogAboveQuotaMessage,
  LogCandidateActionMessage,
  LogDistributionMessage,
  Logger,
  LogMessage,
  LogQuotaUpdateMessage,
  LogType,
} from './logger';

describe('Logger', () => {
  it('should instantiate with a clean log', () => {
    const logger = new Logger();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('should record winner selection without distribution', () => {
    const logger = new Logger();
    logger.selectWinner('Alice');

    const logMessages = logger.getLogs();
    expect(logMessages).toHaveLength(1);

    const logMessage = logMessages[0] as LogCandidateActionMessage;
    expect(logMessage.type).toBe(LogType.SELECT_WINNER);
    expect(logMessage.candidate).toBe('Alice');
    expect(logMessage.voteDistribution).toBeUndefined();
  });

  it('should record winner selection with distribution', () => {
    const logger = new Logger();
    const candidateMap = new Map<Candidate, CandidateMapItem>();
    candidateMap.set('Alice', {
      totalVotes: 20,
      votes: [
        { voteCount: 5, voteOrder: ['Alice', 'Bob', 'Charlie'] },
        { voteCount: 15, voteOrder: ['Alice', 'Charlie'] },
      ],
    });
    logger.selectWinner('Alice', candidateMap);

    const logMessages = logger.getLogs();
    expect(logMessages).toHaveLength(1);

    const logMessage = logMessages[0] as LogCandidateActionMessage;
    expect(logMessage.type).toBe(LogType.SELECT_WINNER);
    expect(logMessage.candidate).toBe('Alice');
    expect(logMessage.voteDistribution).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const voteDistro = logMessage.voteDistribution![0];
    expect(voteDistro.candidate).toBe('Alice');
    expect(voteDistro.totalVotes).toBe(20);
    expect(voteDistro.totalWallets).toBe(2);
  });
});

describe('calculateStvWinners', () => {
  let logMessages: LogMessage[];

  describe('in scenario #1', () => {
    beforeAll(() => {
      const voteRecords: VoteRecord[] = [
        { voteCount: 1, voteOrder: ['Alice', 'Bob', 'Charlie'] },
        { voteCount: 1, voteOrder: ['Bob', 'Charlie', 'Alice'] },
        { voteCount: 1, voteOrder: ['Charlie', 'Alice', 'Bob'] },
        { voteCount: 1, voteOrder: ['Alice', 'Bob', 'Charlie'] },
      ];

      const { logs } = calculateStvWinners(voteRecords, 1);
      logMessages = logs;
    });

    it('should correctly log initial calulated quota', () => {
      const logMessage = logMessages[0] as LogQuotaUpdateMessage;
      expect(logMessage.type).toEqual(LogType.UPDATE_QUOTA);
      expect(logMessage.quota).toEqual(2);
    });

    it('should correctly log initial vote distribution', () => {
      const logMessage = logMessages[1] as LogDistributionMessage;
      expect(logMessage.type).toEqual(LogType.UPDATE_DISTRIBUTION);
      expect(logMessage.voteDistribution).toEqual([
        { candidate: 'Alice', totalVotes: 2, totalWallets: 1 },
        { candidate: 'Bob', totalVotes: 1, totalWallets: 1 },
        { candidate: 'Charlie', totalVotes: 1, totalWallets: 1 },
      ]);
    });

    it('should correctly log one candidate above quota', () => {
      const logMessage = logMessages[2] as LogAboveQuotaMessage;
      expect(
        logMessages.filter(({ type }) => type === LogType.ABOVE_QUOTA),
      ).toHaveLength(1);
      expect(logMessage.type).toEqual(LogType.ABOVE_QUOTA);
      expect(logMessage.candidate).toEqual('Alice');
    });

    it('should correctly log the selection of the sole winner', () => {
      const logMessage = logMessages[3] as LogCandidateActionMessage;
      expect(
        logMessages.filter(({ type }) => type === LogType.SELECT_WINNER),
      ).toHaveLength(1);
      expect(logMessage.type).toEqual(LogType.SELECT_WINNER);
      expect(logMessage.candidate).toEqual('Alice');
    });
  });

  describe('in scenario #2', () => {
    beforeAll(() => {
      const voteRecords: VoteRecord[] = [
        { voteCount: 2.5, voteOrder: ['Alice', 'Bob'] },
        { voteCount: 3.7, voteOrder: ['Bob', 'Charlie'] },
        { voteCount: 1.5, voteOrder: ['Charlie', 'Dave'] },
        { voteCount: 2.3, voteOrder: ['Dave', 'Eve'] },
        { voteCount: 4, voteOrder: ['Eve', 'Alice'] },
        { voteCount: 1, voteOrder: ['Alice', 'Charlie'] },
      ];

      const { logs } = calculateStvWinners(voteRecords, 3);
      logMessages = logs;
    });

    it('should correctly log initial calulated quota', () => {
      const logMessage = logMessages[0] as LogQuotaUpdateMessage;
      expect(logMessage.type).toEqual(LogType.UPDATE_QUOTA);
      expect(logMessage.quota).toEqual(3.75);
    });

    it('should correctly log initial vote distribution', () => {
      const logMessage = logMessages[1] as LogDistributionMessage;
      expect(logMessage.type).toEqual(LogType.UPDATE_DISTRIBUTION);
      expect(logMessage.voteDistribution).toEqual([
        { candidate: 'Alice', totalVotes: 3.5, totalWallets: 2 },
        { candidate: 'Bob', totalVotes: 3.7, totalWallets: 1 },
        { candidate: 'Charlie', totalVotes: 1.5, totalWallets: 1 },
        { candidate: 'Dave', totalVotes: 2.3, totalWallets: 1 },
        { candidate: 'Eve', totalVotes: 4, totalWallets: 1 },
      ]);
    });

    it('should correctly log the first candidate above quota', () => {
      const logMessage = logMessages[2] as LogAboveQuotaMessage;
      expect(logMessage.type).toEqual(LogType.ABOVE_QUOTA);
      expect(logMessage.candidate).toEqual('Eve');
    });

    it('should correctly log the first winner selection', () => {
      const logMessage = logMessages[3] as LogCandidateActionMessage;
      expect(logMessage.type).toEqual(LogType.SELECT_WINNER);
      expect(logMessage.candidate).toEqual('Eve');
    });

    it('should correctly log the updated vote distribution', () => {
      const logMessage = logMessages[3] as LogCandidateActionMessage;
      expect(logMessage.voteDistribution).toEqual([
        { candidate: 'Alice', totalVotes: 3.75, totalWallets: 3 },
        { candidate: 'Bob', totalVotes: 3.7, totalWallets: 1 },
        { candidate: 'Charlie', totalVotes: 1.5, totalWallets: 1 },
        { candidate: 'Dave', totalVotes: 2.3, totalWallets: 1 },
      ]);
    });

    it('should correctly log the second candidate above quota', () => {
      const logMessage = logMessages[4] as LogAboveQuotaMessage;
      expect(logMessage.type).toEqual(LogType.ABOVE_QUOTA);
      expect(logMessage.candidate).toEqual('Alice');
    });

    it('should correctly log the second winner selection', () => {
      const logMessage = logMessages[5] as LogCandidateActionMessage;
      expect(logMessage.type).toEqual(LogType.SELECT_WINNER);
      expect(logMessage.candidate).toEqual('Alice');
    });

    it('should correctly log the updated vote distribution', () => {
      const logMessage = logMessages[5] as LogCandidateActionMessage;
      expect(logMessage.voteDistribution).toEqual([
        { candidate: 'Bob', totalVotes: 3.7, totalWallets: 1 },
        { candidate: 'Charlie', totalVotes: 1.5, totalWallets: 1 },
        { candidate: 'Dave', totalVotes: 2.3, totalWallets: 1 },
      ]);
    });

    it('should correctly log the candidate elimination', () => {
      const logMessage = logMessages[6] as LogCandidateActionMessage;
      expect(logMessage.type).toEqual(LogType.ELIMINATE_CANDIDATE);
      expect(logMessage.candidate).toEqual('Charlie');
    });

    it('should correctly log the updated vote distribution', () => {
      const logMessage = logMessages[6] as LogCandidateActionMessage;
      expect(logMessage.voteDistribution).toEqual([
        { candidate: 'Bob', totalVotes: 3.7, totalWallets: 1 },
        { candidate: 'Dave', totalVotes: 3.8, totalWallets: 1 },
      ]);
    });

    it('should correctly log the third candidate above quota', () => {
      const logMessage = logMessages[7] as LogAboveQuotaMessage;
      expect(logMessage.type).toEqual(LogType.ABOVE_QUOTA);
      expect(logMessage.candidate).toEqual('Dave');
    });

    it('should correctly log the third winner selection', () => {
      const logMessage = logMessages[8] as LogCandidateActionMessage;
      expect(logMessage.type).toEqual(LogType.SELECT_WINNER);
      expect(logMessage.candidate).toEqual('Dave');
    });
  });

  describe('in scenario #3', () => {
    beforeAll(() => {
      const voteRecords: VoteRecord[] = [
        { voteCount: 1, voteOrder: ['Alice', 'Bob'] },
        { voteCount: 1, voteOrder: ['Bob', 'Alice'] },
      ];

      const { logs } = calculateStvWinners(voteRecords, 1);
      logMessages = logs;
    });

    it('should correctly log initial calulated quota', () => {
      const logMessage = logMessages[0] as LogQuotaUpdateMessage;
      expect(logMessage.type).toEqual(LogType.UPDATE_QUOTA);
      expect(logMessage.quota).toEqual(1);
    });

    it('should correctly log initial vote distribution', () => {
      const logMessage = logMessages[1] as LogDistributionMessage;
      expect(logMessage.type).toEqual(LogType.UPDATE_DISTRIBUTION);
      expect(logMessage.voteDistribution).toEqual([
        { candidate: 'Alice', totalVotes: 1, totalWallets: 1 },
        { candidate: 'Bob', totalVotes: 1, totalWallets: 1 },
      ]);
    });

    it('should correctly log the first candidate above quota', () => {
      const logMessage = logMessages[2] as LogAboveQuotaMessage;
      expect(logMessage.type).toEqual(LogType.ABOVE_QUOTA);
      expect(logMessage.candidate).toEqual('Alice');
    });

    it('should correctly log the second candidate above quota', () => {
      const logMessage = logMessages[3] as LogAboveQuotaMessage;
      expect(logMessage.type).toEqual(LogType.ABOVE_QUOTA);
      expect(logMessage.candidate).toEqual('Bob');
    });

    it('should correctly log the first tied winner selection', () => {
      const logMessage = logMessages[4] as LogCandidateActionMessage;
      expect(logMessage.type).toEqual(LogType.SELECT_WINNER);
      expect(logMessage.candidate).toEqual('Alice');
    });

    it('should correctly log the second tied winner selection', () => {
      const logMessage = logMessages[5] as LogCandidateActionMessage;
      expect(logMessage.type).toEqual(LogType.SELECT_WINNER);
      expect(logMessage.candidate).toEqual('Bob');
    });
  });
});
