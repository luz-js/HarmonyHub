/**
 * Como llega un valor por JSON: las fechas (Date) se vuelven texto ISO. La API lo usa en sus
 * `*.contract-check.ts` para comparar lo que devuelve un servicio con el tipo de respuesta del contrato.
 */
export type Wire<T> = T extends Date
  ? string
  : T extends (infer Item)[]
    ? Wire<Item>[]
    : T extends readonly (infer Item)[]
      ? readonly Wire<Item>[]
      : T extends object
        ? { [Key in keyof T]: Wire<T[Key]> }
        : T;

/** Falla al compilar si `Actual` no se puede usar donde se espera `Expected`. */
export type AssertAssignable<Actual extends Expected, Expected> = Actual extends Expected ? true : never;
