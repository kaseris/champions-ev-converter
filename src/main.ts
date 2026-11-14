import './style.css'
import { MAX_EV_PER_STAT, MAX_EV_TOTAL, MAX_SP_PER_STAT, MAX_SP_TOTAL, STATS, convert_spread, total, type ConversionResult, type Direction, type Spread, type Stat } from './convert'
import { EXTRA_FIELDS, LANGUAGES, OT_GENDERS, extras_to_lines, is_shiny, merge_extras, validate_extras, type ExtraField, type Extras, type IdFormat } from './extras'
import { enhance_select } from './dropdown'
import { set_sprite, sprite_image } from './sprites'
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
let strip_sprites: HTMLImageElement[] = []
let row_sprites: HTMLImageElement[] = []
let imported_spreads: Spread[] = []
let spread_editors: SpreadEditor[] = []
let mon_rows: HTMLTableRowElement[] = []

interface SpreadEditor {
  inputs: Record<Stat, HTMLInputElement>
  total: HTMLSpanElement
  reset: HTMLButtonElement
}
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
    if (input instanceof HTMLSelectElement) enhance_select(input)
  }
}

function direction(): Direction {
  return (document.querySelector('input[name="direction"]:checked') as HTMLInputElement).value as Direction
}

function units(dir: Direction) {
  return dir === 'champions_to_regular' ? { from: 'SP', to: 'EVs' } : { from: 'EVs', to: 'SP' }
}

function build_sprite_strip() {
  strip_sprites = team.map(set => sprite_image(set.species, 72))
  element('team-sprites').replaceChildren(...strip_sprites)
}

function build_spread_editor(set: PokemonSet, index: number): HTMLDivElement {
  const wrapper = document.createElement('div')
  const grid = document.createElement('div')
  grid.className = 'spread-editor'
  const inputs = {} as Record<Stat, HTMLInputElement>
  for (const stat of STATS) {
    const label = document.createElement('label')
    label.className = 'stat-field'
    const name = document.createElement('span')
    name.textContent = stat
    const input = document.createElement('input')
    input.type = 'number'
    input.min = '0'
    input.step = '1'
    input.inputMode = 'numeric'
    input.value = String(set.spread[stat])
    input.setAttribute('aria-label', `${set.species} ${stat}`)
    input.addEventListener('input', () => {
      const value = Math.floor(Number(input.value))
      set.spread[stat] = Number.isFinite(value) && value > 0 ? value : 0
      render()
    })
    label.append(name, input)
    grid.append(label)
    inputs[stat] = input
  }
  const footer = document.createElement('div')
  footer.className = 'spread-footer'
  const total_label = document.createElement('span')
  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = 'link-button'
  reset.textContent = 'Reset'
  reset.addEventListener('click', () => {
    set.spread = { ...imported_spreads[index] }
    for (const stat of STATS) inputs[stat].value = String(set.spread[stat])
    render()
  })
  footer.append(total_label, reset)
  wrapper.append(grid, footer)
  spread_editors[index] = { inputs, total: total_label, reset }
  return wrapper
}

function build_rows() {
  build_sprite_strip()
  team_rows.replaceChildren()
  if (!team.length) {
    team_rows.innerHTML = '<tr><td colspan="4">No team imported yet.</td></tr>'
    return
  }
  team.forEach((set, index) => {
    const row = team_rows.insertRow()
    row.className = 'mon-row'
    mon_rows[index] = row
    const name_cell = row.insertCell()
    const name = document.createElement('div')
    name.className = 'mon-name'
    row_sprites[index] = sprite_image(set.species, 48)
    name.append(row_sprites[index], set.species)
    name_cell.append(name)
    const details = document.createElement('details')
    const summary = document.createElement('summary')
    summary.textContent = 'Override trainer details'
    summary.style.fontSize = '0.85rem'
    summary.style.fontWeight = 'normal'
    const fields = document.createElement('div')
    fields.className = 'extras'
    build_extras_fields(fields, overrides[index], 'Team default')
    details.append(summary)
    name_cell.append(details)
    row.insertCell().append(build_spread_editor(set, index))
    row.insertCell()
    row.insertCell()
    // Override fields span the whole table width so they lay out horizontally instead of stretching the row
    const override_row = team_rows.insertRow()
    override_row.className = 'override-row'
    override_row.hidden = true
    const override_cell = override_row.insertCell()
    override_cell.colSpan = 4
    override_cell.append(fields)
    details.addEventListener('toggle', () => (override_row.hidden = !details.open))
  })
}

function spread_text(line: string | null, unit: string, amount: number) {
  return `${line?.replace('EVs: ', '') ?? 'none'} (${amount} ${unit})`
}

function update_spread_editor(editor: SpreadEditor, spread: Spread, imported: Spread, dir: Direction) {
  const is_sp = dir === 'champions_to_regular'
  const per_stat = is_sp ? MAX_SP_PER_STAT : MAX_EV_PER_STAT
  const max_total = is_sp ? MAX_SP_TOTAL : MAX_EV_TOTAL
  for (const stat of STATS) {
    editor.inputs[stat].max = String(per_stat)
    editor.inputs[stat].classList.toggle('over', spread[stat] > per_stat)
  }
  const amount = total(spread)
  editor.total.textContent = `${amount} / ${max_total} ${units(dir).from}`
  editor.total.classList.toggle('warning', amount > max_total)
  editor.reset.hidden = STATS.every(stat => spread[stat] === imported[stat])
}

const STATUS_BADGES = {
  ok: { icon: '✓', label: 'OK' },
  warning: { icon: '!', label: 'Adjusted' },
  error: { icon: '✕', label: 'Invalid spread' }
} as const

function render_notes(cell: HTMLTableCellElement, result: ConversionResult) {
  const badge = document.createElement('div')
  badge.className = `status status-${result.status}`
  const icon = document.createElement('span')
  icon.className = 'status-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.textContent = STATUS_BADGES[result.status].icon
  badge.append(icon, STATUS_BADGES[result.status].label)
  const messages = [
    ...result.errors.map(text => ({ text, level: 'error' })),
    ...result.warnings.map(text => ({ text, level: 'warning' }))
  ].map(({ text, level }) => {
    const line = document.createElement('div')
    line.className = `note ${level}`
    line.textContent = text
    return line
  })
  cell.replaceChildren(badge, ...messages)
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
  element('output-unit').textContent = dir === 'champions_to_regular' ? 'Regular EVs' : 'Champions SP'
  const counts = { ok: 0, warning: 0, error: 0 }
  const sets = team.map((set, index) => {
    const result = convert_spread(set.spread, dir)
    const cells = mon_rows[index].cells
    update_spread_editor(spread_editors[index], set.spread, imported_spreads[index], dir)
    cells[2].textContent = spread_text(format_spread_line(result.spread), unit.to, total(result.spread))
    render_notes(cells[3], result)
    counts[result.status]++
    const extras = merge_extras(team_extras, overrides[index])
    const shiny = is_shiny(extras, set.lines)
    set_sprite(strip_sprites[index], set.species, shiny)
    set_sprite(row_sprites[index], set.species, shiny)
    const extra_lines = extras_to_lines(extras)
    return serialize_set(set, result.spread, extra_lines, remove_items)
  })
  output.value = sets.join('\n\n')
  const notes = element('output-notes')
  const parts = [
    counts.error && `${counts.error} invalid`,
    counts.warning && `${counts.warning} adjusted`
  ].filter(Boolean)
  notes.className = counts.error ? 'error' : 'warning'
  notes.textContent = parts.length
    ? `${counts.error ? '✕' : '⚠'} ${parts.join(', ')} of ${team.length} Pokémon. See the notes in the Team table below.`
    : ''
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
  imported_spreads = team.map(set => ({ ...set.spread }))
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
enhance_select(element('id-format'))
element('import').addEventListener('click', import_team)
element('id-format').addEventListener('change', render)
element('remove-items').addEventListener('change', render)
document.querySelectorAll('input[name="direction"]').forEach(radio => radio.addEventListener('change', render))
element('copy').addEventListener('click', async event => {
  const button = event.currentTarget as HTMLButtonElement
  await navigator.clipboard.writeText(output.value)
  button.textContent = 'Copied'
  setTimeout(() => (button.textContent = 'Copy'), 1500)
})
// Pasting a team or URL imports it right away; Cmd/Ctrl+Enter re-imports after edits
source_input.addEventListener('paste', () => setTimeout(import_team))
source_input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) import_team()
})
element('download').addEventListener('click', download)
