import './style.css'
import { convert_spread, total, type Direction } from './convert'
import { EXTRA_FIELDS, LANGUAGES, OT_GENDERS, extras_to_lines, merge_extras, validate_extras, type ExtraField, type Extras, type IdFormat } from './extras'
import { format_spread_line, parse_team, pokepaste_raw_url, serialize_set, type PokemonSet } from './paste'

declare global {
  interface Window {
    api?: { fetch_text: (url: string) => Promise<string> }
  }
}

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const source_input = element<HTMLTextAreaElement>('source')
const import_status = element<HTMLParagraphElement>('import-status')
const team_rows = element<HTMLTableSectionElement>('team-rows')
const output = element<HTMLTextAreaElement>('output')
const extras_errors = element<HTMLParagraphElement>('extras-errors')

let team: PokemonSet[] = []
let overrides: Extras[] = []
const team_extras: Extras = {}

const FIELD_OPTIONS: Partial<Record<ExtraField, string[]>> = {
  OTGender: OT_GENDERS,
  Language: LANGUAGES,
  Shiny: ['Yes']
}

const FIELD_PLACEHOLDERS: Partial<Record<ExtraField, string>> = {
  OT: 'Trainer name',
  TID: 'Trainer ID',
  SID: 'Secret ID',
  Ball: 'e.g. Poke Ball'
}

function build_extras_fields(container: HTMLElement, target: Extras, placeholder_prefix = '') {
  container.replaceChildren()
  for (const field of EXTRA_FIELDS) {
    const label = document.createElement('label')
    label.textContent = field
    const options = FIELD_OPTIONS[field]
    const input = options ? document.createElement('select') : document.createElement('input')
    if (input instanceof HTMLSelectElement) {
      input.append(new Option(placeholder_prefix ? 'Team default' : '—', ''), ...options!.map(value => new Option(value)))
    } else {
      input.type = 'text'
      input.placeholder = placeholder_prefix || FIELD_PLACEHOLDERS[field] || ''
    }
    input.value = target[field] ?? ''
    input.addEventListener('input', () => {
      target[field] = input.value
      render()
    })
    label.append(input)
    container.append(label)
  }
}

function direction(): Direction {
  return (document.querySelector('input[name="direction"]:checked') as HTMLInputElement).value as Direction
}

function units(dir: Direction) {
  return dir === 'champions_to_regular' ? { from: 'SP', to: 'EVs' } : { from: 'EVs', to: 'SP' }
}

function build_rows() {
  team_rows.replaceChildren()
  if (!team.length) {
    team_rows.innerHTML = '<tr><td colspan="4">No team imported yet.</td></tr>'
    return
  }
  team.forEach((set, index) => {
    const row = team_rows.insertRow()
    const name_cell = row.insertCell()
    name_cell.textContent = set.species
    const details = document.createElement('details')
    const summary = document.createElement('summary')
    summary.textContent = 'Override trainer details'
    summary.style.fontSize = '0.85rem'
    summary.style.fontWeight = 'normal'
    const fields = document.createElement('div')
    fields.className = 'extras'
    build_extras_fields(fields, overrides[index], 'Team default')
    details.append(summary, fields)
    name_cell.append(details)
    row.insertCell()
    row.insertCell()
    row.insertCell()
  })
}

function spread_text(line: string | null, unit: string, amount: number) {
  return `${line?.replace('EVs: ', '') ?? 'none'} (${amount} ${unit})`
}

function render() {
  const id_format = element<HTMLSelectElement>('id-format').value as IdFormat
  const errors = validate_extras(team_extras, id_format)
  overrides.forEach((override, index) => {
    validate_extras(override, id_format).forEach(error => errors.push(`${team[index].species}: ${error}`))
  })
  extras_errors.textContent = errors.join(' ')

  const dir = direction()
  const unit = units(dir)
  const remove_items = element<HTMLInputElement>('remove-items').checked
  const sets = team.map((set, index) => {
    const result = convert_spread(set.spread, dir)
    const cells = team_rows.rows[index].cells
    cells[1].textContent = spread_text(format_spread_line(set.spread), unit.from, total(set.spread))
    cells[2].textContent = spread_text(format_spread_line(result.spread), unit.to, total(result.spread))
    cells[3].replaceChildren(...result.warnings.map(warning => {
      const line = document.createElement('div')
      line.className = 'warning'
      line.textContent = `⚠ ${warning}`
      return line
    }))
    if (!result.warnings.length) cells[3].textContent = 'OK'
    const extra_lines = extras_to_lines(merge_extras(team_extras, overrides[index]))
    return serialize_set(set, result.spread, extra_lines, remove_items)
  })
  output.value = sets.join('\n\n')
}

async function fetch_text(url: string): Promise<string> {
  if (window.api) return window.api.fetch_text(url)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

async function import_team() {
  const input = source_input.value.trim()
  const raw_url = pokepaste_raw_url(input)
  let text = input
  if (raw_url) {
    import_status.textContent = 'Fetching paste…'
    try {
      text = await fetch_text(raw_url)
    } catch (error) {
      import_status.textContent = `Could not fetch the paste (${(error as Error).message}). The browser may block it; open the paste, copy the text and paste it here instead.`
      return
    }
  }
  team = parse_team(text)
  overrides = team.map(() => ({}))
  import_status.textContent = team.length ? `Imported ${team.length} Pokémon.` : 'No Pokémon found in the input.'
  build_rows()
  render()
}

function download() {
  const blob = new Blob([output.value], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = direction() === 'champions_to_regular' ? 'team-regular.txt' : 'team-champions.txt'
  link.click()
  URL.revokeObjectURL(link.href)
}

build_extras_fields(element('team-extras'), team_extras)
element('import').addEventListener('click', import_team)
element('id-format').addEventListener('change', render)
element('remove-items').addEventListener('change', render)
document.querySelectorAll('input[name="direction"]').forEach(radio => radio.addEventListener('change', render))
element('copy').addEventListener('click', () => navigator.clipboard.writeText(output.value))
element('download').addEventListener('click', download)
