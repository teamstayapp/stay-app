import { useEffect, useState } from 'react'

const SHOW_AFTER_PX = 420

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function updateVisibility() {
      const nestedScrolled = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-top-target]'))
        .some((element) => element.scrollTop > SHOW_AFTER_PX)
      setVisible(window.scrollY > SHOW_AFTER_PX || nestedScrolled)
    }

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    document.addEventListener('scroll', updateVisibility, true)
    return () => {
      window.removeEventListener('scroll', updateVisibility)
      document.removeEventListener('scroll', updateVisibility, true)
    }
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      className="to-top-button"
      aria-label="Gå til toppen af siden"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        document.querySelectorAll<HTMLElement>('[data-scroll-top-target]').forEach((element) => {
          element.scrollTo({ top: 0, behavior: 'smooth' })
        })
      }}
    >
      <span aria-hidden="true">↑</span>
      Til toppen
    </button>
  )
}
