import votesTerm1A from '../results/1b792551-83e1-4998-99a4-6637caa69df8.json';
import votesTerm1B from '../results/91652743-f916-4566-99af-421a557f7c3d.json';
import { calculateStvWinners, Candidate, VoteRecord } from './index';

describe('calculate 1st Council election winners', () => {
  it('should correctly calculate winners from the first election round', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const voteRecords: VoteRecord[] = Object.values(votesTerm1A).map(
      (vote: any) => {
        return {
          voteCount: Number(vote.votingPower),
          voteOrder: vote.voteResult.split(',') as Candidate[],
        };
      },
    );

    const { winners, tieCount } = calculateStvWinners(voteRecords, 12);

    /*
      Before PR #4, the expected (and actual) winners were:

      expect(winners).toEqual([
        'king_bryan',
        'funcracker',
        'krigs',
        'bodhi_tree',
        'rome_i_emperor',
        'ajota_lrnr',
        'notcatz',
        'jp',
        'jith_blade',
        'drumcarl05',
        'dmark',
        'xalexus',
      ]);

      This test was later updated to reflect the changes made in https://github.com/staratlasmeta/stv/pull/4.
      As such, the following list with expected winners is no longer in sync with reality.
    */
    expect(winners).toEqual([
      'king_bryan',
      'funcracker',
      'krigs',
      'bodhi_tree',
      'rome_i_emperor',
      'ajota_lrnr',
      'notcatz',
      'jp',
      'drumcarl05',
      'jith_blade',
      'sai_kirito',
      'dmark',
    ]);
    expect(tieCount).toBe(0);
  });

  it('should correctly calculate winners from the second election round', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const voteRecords: VoteRecord[] = Object.values(votesTerm1B).map(
      (vote: any) => {
        return {
          voteCount: Number(vote.votingPower),
          voteOrder: vote.voteResult.split(',') as Candidate[],
        };
      },
    );

    const { winners, tieCount } = calculateStvWinners(voteRecords, 5);

    expect(winners).toEqual([
      'jp',
      'funcracker',
      'king_bryan',
      'bodhi_tree',
      'drumcarl05',
    ]);
    expect(tieCount).toBe(0);
  });
});
