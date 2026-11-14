let next_id = 0

function label_text(select: HTMLSelectElement): string {
  // select.labels is empty while the element is still detached, so also check for a wrapping label
  const label = select.labels?.[0] ?? select.closest('label')
  if (!label) return ''
  // Wrapping labels also contain the options' text, so only use the label's own text nodes
  return [...label.childNodes]
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent)
    .join('')
    .trim()
}

// Replaces a native <select> with a styled listbox. The native select stays in the DOM (hidden) as the
// source of truth and still fires 'input'/'change', so existing listeners keep working.
export function enhance_select(select: HTMLSelectElement): void {
  const id = `dropdown-${next_id++}`
  const wrapper = document.createElement('div')
  wrapper.className = 'dropdown'
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'dropdown-button'
  button.setAttribute('aria-haspopup', 'listbox')
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-controls', `${id}-list`)
  button.setAttribute('aria-label', label_text(select))
  const list = document.createElement('ul')
  list.className = 'dropdown-list'
  list.id = `${id}-list`
  list.setAttribute('role', 'listbox')
  list.hidden = true

  select.classList.add('dropdown-native')
  select.tabIndex = -1
  select.setAttribute('aria-hidden', 'true')
  select.after(wrapper)
  wrapper.append(select, button, list)

  const options = [...select.options].map((option, index) => {
    const item = document.createElement('li')
    item.id = `${id}-${index}`
    item.setAttribute('role', 'option')
    item.textContent = option.text
    item.addEventListener('mousemove', () => highlight(index))
    item.addEventListener('click', event => {
      // Stops a wrapping <label> from forwarding the click to the hidden select
      event.preventDefault()
      choose(index)
    })
    list.append(item)
    return item
  })

  let active = select.selectedIndex

  function sync() {
    button.textContent = select.options[select.selectedIndex]?.text ?? ''
    options.forEach((item, index) => item.setAttribute('aria-selected', String(index === select.selectedIndex)))
  }

  function highlight(index: number) {
    active = Math.max(0, Math.min(options.length - 1, index))
    options.forEach((item, i) => item.classList.toggle('active', i === active))
    button.setAttribute('aria-activedescendant', options[active].id)
    options[active].scrollIntoView({ block: 'nearest' })
  }

  // Fixed positioning so the list is never clipped by scrolling containers like the team table
  function position() {
    const rect = button.getBoundingClientRect()
    list.style.minWidth = `${rect.width}px`
    list.style.left = `${rect.left}px`
    const below = window.innerHeight - rect.bottom
    if (below < list.offsetHeight + 8 && rect.top > below) {
      list.style.top = `${rect.top - list.offsetHeight - 4}px`
    } else {
      list.style.top = `${rect.bottom + 4}px`
    }
  }

  function on_outside(event: Event) {
    if (!wrapper.contains(event.target as Node)) close()
  }

  function open() {
    if (!list.hidden) return
    list.hidden = false
    button.setAttribute('aria-expanded', 'true')
    position()
    highlight(select.selectedIndex)
    document.addEventListener('pointerdown', on_outside)
    window.addEventListener('scroll', close, { capture: true, once: true })
    window.addEventListener('resize', close, { once: true })
  }

  function close() {
    if (list.hidden) return
    list.hidden = true
    button.setAttribute('aria-expanded', 'false')
    button.removeAttribute('aria-activedescendant')
    document.removeEventListener('pointerdown', on_outside)
    window.removeEventListener('scroll', close, { capture: true })
    window.removeEventListener('resize', close)
  }

  function choose(index: number) {
    const changed = index !== select.selectedIndex
    select.selectedIndex = index
    sync()
    close()
    button.focus()
    if (changed) {
      select.dispatchEvent(new Event('input', { bubbles: true }))
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  button.addEventListener('click', event => {
    event.preventDefault()
    if (list.hidden) open()
    else close()
  })

  button.addEventListener('keydown', event => {
    const is_open = !list.hidden
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault()
        if (!is_open) open()
        else highlight(active + (event.key === 'ArrowDown' ? 1 : -1))
        break
      case 'Home':
      case 'End':
        if (!is_open) return
        event.preventDefault()
        highlight(event.key === 'Home' ? 0 : options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (is_open) choose(active)
        else open()
        break
      case 'Escape':
        if (is_open) {
          event.preventDefault()
          close()
        }
        break
      case 'Tab':
        close()
        break
    }
  })

  // Keeps the button text right when the value is changed in code (e.g. when the app is cleared)
  select.addEventListener('change', sync)

  sync()
}
