<template>
  <div class="page">
    <header class="page__head">
      <div>
        <h1 class="page__title">Import from TimeTree</h1>
        <p class="page__sub">
          TimeTree removed its calendar export and shut its API down in December 2023, so bookings
          come in as a <code>.ics</code> file rather than a live feed.
        </p>
      </div>
      <router-link to="/calendar" class="btn ghost">Back to calendar</router-link>
    </header>

    <details class="how">
      <summary>How to produce the file</summary>
      <ol>
        <li>
          Export any <code>.ics</code> from a calendar app, or use
          <code>scripts/timetree-fetch.mjs</code> in this repo to pull straight from TimeTree.
        </li>
        <li>Upload the file below and review what it found</li>
        <li>Tick the events you want and import</li>
      </ol>
      <p class="how__note">
        Nothing here writes back to TimeTree. It is read only. To keep bookings in step
        automatically instead of by hand, see the scheduled job in
        <code>.github/workflows/timetree-sync.yml</code>.
      </p>
    </details>

    <label class="drop" :class="{ 'is-busy': parsing }">
      <input type="file" accept=".ics,text/calendar" @change="onFile" />
      <i class="fas fa-cloud-arrow-up"></i>
      <span v-if="parsing">Reading…</span>
      <span v-else-if="fileName">{{ fileName }} (choose another)</span>
      <span v-else>Choose a <strong>.ics</strong> file</span>
    </label>

    <p v-if="message" class="banner" :class="ok ? 'banner--ok' : 'banner--bad'">{{ message }}</p>

    <p v-if="recurrenceWarning" class="banner banner--warn">
      This file contains repeating events. Repeats are not expanded. Only the first occurrence of
      each is imported, so recurring bookings need adding by hand.
    </p>

    <template v-if="rows.length">
      <div class="summary">
        <span
          ><strong>{{ newRows.length }}</strong> new</span
        >
        <span
          ><strong>{{ dupeRows.length }}</strong> already imported</span
        >
        <button class="btn" :disabled="importing || !selected.size" @click="runImport">
          {{
            importing ? `Importing ${done}/${selected.size}…` : `Import ${selected.size} selected`
          }}
        </button>
      </div>

      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th class="c-check">
                <input
                  type="checkbox"
                  :checked="allNewSelected"
                  aria-label="Select all new events"
                  @change="toggleAll"
                />
              </th>
              <th>Date</th>
              <th>Time</th>
              <th>Event</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" :class="{ 'is-dupe': row.duplicate }">
              <td class="c-check">
                <input
                  type="checkbox"
                  :checked="selected.has(row.key)"
                  :disabled="row.duplicate"
                  :aria-label="`Import ${row.summary}`"
                  @change="toggle(row.key)"
                />
              </td>
              <td class="nowrap">{{ row.date }}</td>
              <td class="nowrap">{{ row.allDay ? 'All day' : row.time }}</td>
              <td>{{ row.summary || '(no title)' }}</td>
              <td class="nowrap">
                <span v-if="row.duplicate" class="tag">Already imported</span>
                <span v-else class="tag tag--new">New</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="note">
        Imported events are created as calendar entries with no invoice attached. Re-importing the
        same file is safe. Events already brought in are matched on their TimeTree id and skipped.
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { db, collection, addDoc, getDocs } from '../stores/firebase.js'
import { parseEvents, hasRecurrence, localDate, localTime, DEFAULT_TZ } from '../lib/ics.js'

const router = useRouter()
const TZ = DEFAULT_TZ

const rows = ref([])
const selected = ref(new Set())
const fileName = ref('')
const parsing = ref(false)
const importing = ref(false)
const done = ref(0)
const message = ref('')
const ok = ref(true)
const recurrenceWarning = ref(false)

const newRows = computed(() => rows.value.filter((r) => !r.duplicate))
const dupeRows = computed(() => rows.value.filter((r) => r.duplicate))
const allNewSelected = computed(
  () => newRows.value.length > 0 && newRows.value.every((r) => selected.value.has(r.key)),
)

async function onFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  fileName.value = file.name
  parsing.value = true
  message.value = ''
  rows.value = []
  selected.value = new Set()

  try {
    const text = await file.text()
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      throw new Error('That does not look like a calendar file.')
    }
    recurrenceWarning.value = hasRecurrence(text)

    // Wide window: importing history is fine, and past bookings are useful records.
    const from = new Date(Date.UTC(2000, 0, 1))
    const to = new Date(Date.UTC(2100, 0, 1))
    const events = parseEvents(text, { from, to, tz: TZ, includeDetails: true })

    if (!events.length) throw new Error('No events found in that file.')

    // Existing TimeTree ids, so re-importing the same file is a no-op.
    const existing = await getDocs(collection(db, 'appointments'))
    const seen = new Set(existing.docs.map((d) => d.data().timetreeUid).filter(Boolean))

    rows.value = events.map((e, i) => {
      const uid = e.uid || `${e.start.toISOString()}|${e.summary}`
      return {
        key: `${uid}#${i}`,
        uid,
        date: localDate(e.start, TZ),
        time: localTime(e.start, TZ),
        allDay: e.allDay,
        summary: e.summary,
        location: e.location,
        duplicate: seen.has(uid),
      }
    })

    selected.value = new Set(rows.value.filter((r) => !r.duplicate).map((r) => r.key))
    ok.value = true
    message.value = `Found ${events.length} event${events.length === 1 ? '' : 's'}.`
  } catch (err) {
    ok.value = false
    message.value = err.message
  } finally {
    parsing.value = false
    event.target.value = '' // allow re-picking the same file
  }
}

function toggle(key) {
  const next = new Set(selected.value)
  next.has(key) ? next.delete(key) : next.add(key)
  selected.value = next
}

function toggleAll() {
  selected.value = allNewSelected.value ? new Set() : new Set(newRows.value.map((r) => r.key))
}

async function runImport() {
  importing.value = true
  done.value = 0
  message.value = ''
  let failed = 0

  for (const row of rows.value) {
    if (!selected.value.has(row.key) || row.duplicate) continue
    try {
      await addDoc(collection(db, 'appointments'), {
        clientName: row.summary || 'TimeTree event',
        appointmentDate: row.date,
        appointmentTime: row.allDay ? '' : row.time,
        address: row.location || '',
        services: [],
        hasInvoice: false,
        source: 'timetree',
        timetreeUid: row.uid,
        createdAt: new Date(),
      })
      row.duplicate = true
      done.value += 1
    } catch (err) {
      console.error('import failed for', row.uid, err)
      failed += 1
    }
  }

  importing.value = false
  selected.value = new Set()
  ok.value = failed === 0
  message.value = failed
    ? `Imported ${done.value}, but ${failed} failed. See the browser console.`
    : `Imported ${done.value} event${done.value === 1 ? '' : 's'}.`

  if (!failed && done.value) setTimeout(() => router.push('/calendar'), 1800)
}
</script>

<style scoped>
.page {
  max-width: var(--page-w);
  margin: 0 auto;
  padding: clamp(20px, 3vw, 34px);
}
.page__head {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.page__title {
  font-size: 24px;
  margin: 0 0 6px;
  font-weight: 700;
}
.page__sub {
  margin: 0;
  color: #7d786f;
  font-size: 13.5px;
  max-width: 62ch;
  line-height: 1.55;
}
code {
  background: #f0ede7;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.92em;
}
.btn {
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  padding: 9px 16px;
  border: 1px solid var(--btn-border);
  border-radius: 8px;
  background: var(--btn-bg);
  color: var(--btn-fg);
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover:not(:disabled) {
  background: var(--btn-bg-hover);
  border-color: var(--btn-bg-hover);
}
.btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.btn.ghost {
  background: transparent;
  color: #1d1d1d;
}
.how {
  border: 1px solid #e6e3dc;
  border-radius: 10px;
  background: #fff;
  padding: 14px 16px;
  margin-bottom: 18px;
  font-size: 13.5px;
}
.how summary {
  cursor: pointer;
  font-weight: 600;
}
.how ol {
  margin: 12px 0 0;
  padding-left: 20px;
  line-height: 1.9;
}
.how__note {
  color: #7d786f;
  font-size: 12.5px;
  line-height: 1.6;
  margin: 12px 0 0;
}
.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 34px;
  border: 2px dashed #ddd8cf;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  color: #7d786f;
  font-size: 14px;
  margin-bottom: 18px;
}
.drop:hover {
  border-color: #1d1d1d;
  color: #1d1d1d;
}
.drop.is-busy {
  opacity: 0.6;
  cursor: progress;
}
.drop input {
  display: none;
}
.drop i {
  font-size: 24px;
}
.banner {
  padding: 10px 13px;
  border-radius: 8px;
  font-size: 13.5px;
  margin: 0 0 16px;
  line-height: 1.5;
}
.banner--ok {
  background: #edf7ee;
  border: 1px solid #cbe6cd;
  color: #26602c;
}
.banner--bad {
  background: #fdf0ef;
  border: 1px solid #f0cfcb;
  color: #99312a;
}
.banner--warn {
  background: #fdf6e8;
  border: 1px solid #ecdcb4;
  color: #7a5a15;
}
.summary {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-size: 13.5px;
  color: #5c574f;
}
.summary .btn {
  margin-left: auto;
}
.table-wrap {
  overflow-x: auto;
  border: 1px solid #e6e3dc;
  border-radius: 10px;
  background: #fff;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}
.tbl th {
  text-align: left;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a857c;
  padding: 12px 14px;
  border-bottom: 1px solid #eeebe4;
  font-weight: 600;
}
.tbl td {
  padding: 11px 14px;
  border-bottom: 1px solid #f2efe9;
  font-size: 13.5px;
}
.tbl tr:last-child td {
  border-bottom: 0;
}
.tbl tr.is-dupe {
  color: #a09a90;
}
.c-check {
  width: 1%;
}
.c-check input {
  width: 16px;
  height: 16px;
  accent-color: #1d1d1d;
}
.nowrap {
  white-space: nowrap;
}
.tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  background: #f0ede7;
  color: #7d786f;
}
.tag--new {
  background: #e8f2e9;
  color: #26602c;
}
.note {
  font-size: 12.5px;
  color: #8a857c;
  line-height: 1.6;
  margin-top: 16px;
}
</style>
