// Keys written exactly as PKHeX Auto-Legality Mod reads them from a Showdown set
export const EXTRA_FIELDS = ['OT', 'OTGender', 'TID', 'SID', 'Language', 'Ball', 'Shiny'] as const
export type ExtraField = typeof EXTRA_FIELDS[number]
export type Extras = Partial<Record<ExtraField, string>>

export const LANGUAGES = ['English', 'Japanese', 'French', 'Italian', 'German', 'Spanish', 'Korean', 'ChineseS', 'ChineseT']
export const OT_GENDERS = ['Male', 'Female']

export function merge_extras(team: Extras, override: Extras): Extras {
  const merged: Extras = { ...team }
  for (const field of EXTRA_FIELDS) {
    const value = override[field]?.trim()
    if (value) merged[field] = value
  }
  return merged
}

export function extras_to_lines(extras: Extras): string[] {
  return EXTRA_FIELDS
    .map(field => [field, extras[field]?.trim()] as const)
    .filter(([, value]) => value)
    .map(([field, value]) => `${field}: ${value}`)
}

export function validate_extras(extras: Extras): string[] {
  const errors: string[] = []
  for (const field of ['TID', 'SID'] as const) {
    const value = extras[field]?.trim()
    if (value && !(/^\d+$/.test(value) && Number(value) <= 65535)) {
      errors.push(`${field} must be a whole number from 0 to 65535.`)
    }
  }
  if ((extras.OT?.trim().length ?? 0) > 12) errors.push('OT is longer than 12 characters.')
  return errors
}
