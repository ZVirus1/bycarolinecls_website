/**
 * Locale and path helpers with no framework imports.
 *
 * Separate from index.js because the Node prerender script needs these, and
 * index.js reaches for Vue's `computed` and vue-router's `useRoute` - which a
 * build script has no business loading.
 */
import { DEFAULT_LOCALE, LOCALES, MESSAGES } from './messages.js'

export { DEFAULT_LOCALE, LOCALES }

/** The other language. Two locales, so this is the toggle's whole logic. */
export const otherLocale = (locale) => LOCALES.find((l) => l !== locale) ?? DEFAULT_LOCALE

/**
 * English is unprefixed so the existing URLs keep working and keep whatever
 * authority they have; only the secondary locale takes a path segment.
 */
export function localePath(locale, path) {
  const clean = path === '/' ? '' : path
  return locale === DEFAULT_LOCALE ? clean || '/' : `/${locale}${clean}`
}

/** Reads the locale back out of a path, for the prerenderer and for tests. */
export function localeFromPath(path) {
  const seg = path.split('/').filter(Boolean)[0]
  return LOCALES.includes(seg) && seg !== DEFAULT_LOCALE ? seg : DEFAULT_LOCALE
}

/**
 * A missing key falls through to English rather than rendering the key, so a
 * gap in the Indonesian catalogue degrades to a readable page instead of
 * printing `nav.about` at a visitor.
 */
export function translate(locale, key, vars) {
  const raw = MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m))
}
