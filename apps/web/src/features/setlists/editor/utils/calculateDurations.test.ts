import { describe, expect, it } from 'vitest';
import { makeSetlistItem } from '../test-utils/makeSetlistItem';
import { calculateMusicDuration, calculateSpeakingDuration, calculateTotalDuration } from './calculateDurations';

describe('calculateDurations', () => {
  const items = [
    makeSetlistItem({ id: 'song1', type: 'SONG', effective: { key: null, bpm: null, durationSec: 200, capo: null } }),
    makeSetlistItem({ id: 'prayer', type: 'PRAYER', effective: { key: null, bpm: null, durationSec: 60, capo: null } }),
    makeSetlistItem({ id: 'song2', type: 'SONG', effective: { key: null, bpm: null, durationSec: 180, capo: null } }),
    makeSetlistItem({ id: 'hiddenSong', type: 'SONG', isHidden: true, effective: { key: null, bpm: null, durationSec: 999, capo: null } }),
  ];

  it('calculateMusicDuration suma solo SONG visibles', () => {
    expect(calculateMusicDuration(items)).toBe(380);
  });

  it('calculateSpeakingDuration suma solo no-SONG visibles', () => {
    expect(calculateSpeakingDuration(items)).toBe(60);
  });

  it('calculateTotalDuration es la suma de musica + hablado', () => {
    expect(calculateTotalDuration(items)).toBe(440);
  });
});
