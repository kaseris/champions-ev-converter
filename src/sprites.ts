const SPRITE_HOST = 'https://play.pokemonshowdown.com/sprites'

// Species whose hyphen belongs to the base name, not a forme (Showdown drops it entirely)
const HYPHENATED_BASES = ['ho-oh', 'porygon-z', 'jangmo-o', 'hakamo-o', 'kommo-o', 'ting-lu', 'chien-pao', 'wo-chien', 'chi-yu', 'nidoran-f', 'nidoran-m']

function to_id(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Showdown sprite id: base and forme each stripped to [a-z0-9], joined by one hyphen (e.g. urshifu-rapidstrike)
export function sprite_id(species: string): string {
  const lower = species.trim().toLowerCase()
  const base = HYPHENATED_BASES.find(name => lower === name || lower.startsWith(`${name}-`))
  const [head, ...forme] = base ? [base, lower.slice(base.length + 1)].filter(Boolean) : lower.split('-')
  const rest = to_id(forme.join(''))
  return rest ? `${to_id(head)}-${rest}` : to_id(head)
}

// Pokémon HOME 2D renders first (closest to the Champions art style), gen5 pixel sprites as fallback
export function sprite_urls(species: string, shiny = false): string[] {
  const id = sprite_id(species)
  const suffix = shiny ? '-shiny' : ''
  return [`${SPRITE_HOST}/home${suffix}/${id}.png`, `${SPRITE_HOST}/gen5${suffix}/${id}.png`]
}

const pending_fallbacks = new WeakMap<HTMLImageElement, string[]>()

export function set_sprite(image: HTMLImageElement, species: string, shiny = false): void {
  const [primary, ...fallbacks] = sprite_urls(species, shiny)
  if (image.dataset.primary === primary) return
  image.dataset.primary = primary
  pending_fallbacks.set(image, fallbacks)
  image.style.visibility = ''
  image.src = primary
  image.alt = shiny ? `Shiny ${species}` : species
  image.title = image.alt
  image.classList.toggle('shiny', shiny)
}

export function sprite_image(species: string, size: number, shiny = false): HTMLImageElement {
  const image = new Image(size, size)
  image.loading = 'lazy'
  image.className = 'sprite'
  image.addEventListener('error', () => {
    const next = pending_fallbacks.get(image)?.shift()
    if (next) image.src = next
    else image.style.visibility = 'hidden'
  })
  set_sprite(image, species, shiny)
  return image
}
