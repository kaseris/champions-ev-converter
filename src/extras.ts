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

export type IdFormat = 'gen7' | 'gen3'

// Gen 7+ (SM onward, incl. Scarlet/Violet) shows a 6-digit TID and 4-digit SID derived from the 32-bit ID;
// Gen 3–6 show the raw 16-bit TID and SID
export const ID_LIMITS: Record<IdFormat, Record<'TID' | 'SID', number>> = {
  gen7: { TID: 999999, SID: 4294 },
  gen3: { TID: 65535, SID: 65535 }
}

export function validate_extras(extras: Extras, id_format: IdFormat = 'gen7'): string[] {
  const errors: string[] = []
  for (const field of ['TID', 'SID'] as const) {
    const value = extras[field]?.trim()
    const max = ID_LIMITS[id_format][field]
    if (value && !(/^\d+$/.test(value) && Number(value) <= max)) {
      errors.push(`${field} must be a whole number from 0 to ${max}.`)
    }
  }
  if ((extras.OT?.trim().length ?? 0) > 12) errors.push('OT is longer than 12 characters.')
  return errors
}

// Shiny can come from the trainer details or from a 'Shiny: Yes' line already in the paste
export function is_shiny(extras: Extras, set_lines: string[]): boolean {
  return extras.Shiny?.trim().toLowerCase() === 'yes' || set_lines.some(line => /^shiny:\s*yes$/i.test(line))
}

const FIELD_CHOICES: Partial<Record<ExtraField, string[]>> = {
  OTGender: OT_GENDERS,
  Language: LANGUAGES,
  Shiny: ['Yes']
}

// Pulls trainer-detail lines (OT, TID, Shiny, ...) out of a set so the fields own them from then on
export function extract_extras(lines: string[]): { extras: Extras; rest: string[] } {
  const extras: Extras = {}
  const rest: string[] = []
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/)
    const field = match && EXTRA_FIELDS.find(name => name.toLowerCase() === match[1].trim().toLowerCase())
    if (!field) {
      rest.push(line)
      continue
    }
    const value = match[2].trim()
    const choice = FIELD_CHOICES[field]?.find(option => option.toLowerCase() === value.toLowerCase())
    // "Shiny: No" means not shiny, which is the default, so it's dropped
    if (field === 'Shiny' && !choice) continue
    if (value) extras[field] = choice ?? value
  }
  return { extras, rest }
}

// Values every Pokémon shares go to the team-wide fields; the rest stay as per-Pokémon overrides
export function split_common(per_mon: Extras[]): { team: Extras; overrides: Extras[] } {
  const team: Extras = {}
  const overrides = per_mon.map(extras => ({ ...extras }))
  for (const field of EXTRA_FIELDS) {
    const first = per_mon[0]?.[field]
    if (first && per_mon.every(extras => extras[field] === first)) {
      team[field] = first
      for (const override of overrides) delete override[field]
    }
  }
  return { team, overrides }
}
