export const songs = [
  { id: 'song-gratitud', title: 'Gratitud', artist: 'Miel San Marcos', key: 'D', bpm: 72, duration: '4:35' },
  { id: 'song-como-en-el-cielo', title: 'Como en el Cielo', artist: 'Elevation Worship', key: 'C', bpm: 68, duration: '6:32' },
  { id: 'song-agradecido', title: 'Agradecido', artist: 'Aarón Rojas', key: 'G', bpm: 70, duration: '5:10' },
  { id: 'song-digno-de-alabar', title: 'Digno de Alabar', artist: 'Marcos Brunet', key: 'A', bpm: 65, duration: '6:15' },
  { id: 'song-eres-fiel', title: 'Eres Fiel', artist: "Christine D'Clario", key: 'E', bpm: 78, duration: '4:20' },
];

export const events = [
  { id: 'event-ensayo-general', name: 'Ensayo General', date: '2026-06-24', time: '7:00 PM', location: 'Sala de Ensayos', status: 'Confirmado' },
  { id: 'event-culto-dominical', name: 'Culto Dominical', date: '2026-06-28', time: '9:00 AM', location: 'Iglesia Central', status: 'Confirmado' },
  { id: 'event-concierto-jovenes', name: 'Concierto Jóvenes', date: '2026-07-03', time: '7:30 PM', location: 'Auditorio Principal', status: 'Pendiente' },
];

export const setlists = [
  { id: 'setlist-culto-19-mayo', name: 'Culto 19 Mayo 2024', date: '2026-06-28', songs: songs.slice(0, 5), duration: '26:52' },
  { id: 'setlist-ensayo', name: 'Ensayo Adoración', date: '2026-06-24', songs: songs.slice(0, 3), duration: '15:17' },
];

export const files = [
  { id: 'file-1', name: 'Gratitud - Letra.pdf', type: 'PDF', size: '130 KB', author: 'María González' },
  { id: 'file-2', name: 'Como en el Cielo.mp3', type: 'Audio', size: '5.2 MB', author: 'Carlos Rodríguez' },
];

export const notifications = [
  { id: 'n1', title: 'Nuevo mensaje', description: 'María González envió notas para el ensayo general.', time: 'Hace 3 min' },
  { id: 'n2', title: 'Archivo cargado', description: 'Carlos subió Como en el Cielo.mp3.', time: 'Hace 2 horas' },
  { id: 'n3', title: 'Confirmación pendiente', description: 'Faltan 3 músicos por confirmar asistencia.', time: 'Hace 3 horas' },
];
