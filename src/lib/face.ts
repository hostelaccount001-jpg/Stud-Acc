/**
 * Biometric records and legacy types compatibility module.
 */

export function toBiometricRecords(value: unknown): any[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) => {
    if (!f || typeof f !== "object") return [];
    const rec = f as Partial<{ finger: string; template: string; quality: number; enrolled_at: string; serial?: string }>;
    if (typeof rec.finger !== "string") return [];
    return [
      {
        finger: rec.finger,
        template: typeof rec.template === "string" ? rec.template : "",
        quality: Number(rec.quality ?? 0),
        enrolled_at: String(rec.enrolled_at ?? ""),
        serial: typeof rec.serial === "string" ? rec.serial : undefined,
      },
    ];
  });
}
