/**
 * Un perfil esta completo cuando tiene telefono y al menos un instrumento: lo mismo que pide la tarjeta
 * "Completar mi perfil" del Inicio ("Agrega tu telefono y lo que tocas"). Regla unica para toda la web.
 */
export function isProfileComplete(profile: { phone?: string | null; instruments?: ReadonlyArray<unknown> | null } | null | undefined) {
  return Boolean(profile?.phone?.trim()) && (profile?.instruments?.length ?? 0) > 0;
}
