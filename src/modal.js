// Shared keyboard and focus behavior for dialogs, including conditionally rendered forms.
export const modal = {
  mounted(el, binding) {
    const previous = document.activeElement
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true')
    el.tabIndex = -1
    const focusable = () => [...el.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(node => node.getClientRects().length)
    const focus = () => (focusable()[0] || el).focus()
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); el._closeModal?.() }
      if (event.key === 'Tab') {
        const nodes = focusable(), first = nodes[0], last = nodes.at(-1)
        if (!first) { event.preventDefault(); el.focus() }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === el)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    el._closeModal = binding.value; el.addEventListener('keydown', keydown)
    const timer = setTimeout(focus, 0)
    el._cleanupModal = () => { clearTimeout(timer); el.removeEventListener('keydown', keydown); document.body.style.overflow = previousOverflow; previous?.focus?.() }
  },
  updated(el, binding) { el._closeModal = binding.value },
  unmounted(el) { el._cleanupModal?.() },
}
