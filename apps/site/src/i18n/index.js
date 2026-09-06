/**
 * Locale is derived from the URL, never from component state.
 *
 * A toggle that swapped text in place would be invisible to Google: one URL
 * can only rank for one language. So English lives at /portfolio and
 * Indonesian at /id/portfolio, the toggle is an ordinary link between them,
 * and hreflang tells Google they are the same page twice.
 *
 * The pure helpers live in ./paths.js so the build scripts can use them
 * without loading Vue.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  DEFAULT_LOCALE,
  LOCALES,
  localeFromPath,
  localePath,
  otherLocale,
  translate,
} from './paths.js'

export { DEFAULT_LOCALE, LOCALES, localeFromPath, localePath, otherLocale, translate }

export function useI18n() {
  const route = useRoute()
  const locale = computed(() => route.meta?.locale ?? DEFAULT_LOCALE)

  return {
    locale,
    other: computed(() => otherLocale(locale.value)),
    /** Translate. */
    t: (key, vars) => translate(locale.value, key, vars),
    /** Localise an English path for router-link, e.g. lp('/book'). */
    lp: (path) => localePath(locale.value, path),
    /** The current page in the other language, for the header toggle. */
    swap: computed(() => localePath(otherLocale(locale.value), route.meta?.path ?? '/')),
  }
}
