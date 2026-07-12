export type MembershipRole = 'OWNER' | 'ADMIN' | 'LEADER' | 'MUSICIAN' | 'GUEST';

export type MusicianSummary = {
  id: string;
  name: string;
  role: string;
  instrument: string;
  status: string;
};
