export function describeInterval(semitones: number) {
  if (semitones === 0) return '0 semitonos';
  return `${semitones > 0 ? '+' : ''}${semitones} semitonos`;
}
