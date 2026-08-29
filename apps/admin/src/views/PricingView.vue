<template>
  <div class="page">
    <header class="page__head">
      <div>
        <h1 class="page__title">Pricing</h1>
        <p class="page__sub">
          Used by the invoice generator and the public pricing page. Changes go live on the public
          site within about 5 minutes.
        </p>
      </div>
      <div v-if="dirty || busy" class="page__actions">
        <button class="btn ghost" :disabled="busy" @click="reset">Revert</button>
        <button class="btn" :disabled="busy" @click="save">
          {{ busy ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </header>

    <p v-if="message" class="banner" :class="ok ? 'banner--ok' : 'banner--bad'">{{ message }}</p>

    <div v-if="loading" class="empty">Loading pricing…</div>

    <template v-else>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th class="c-drag"><span class="sr-only">Reorder</span></th>
              <th>Service</th>
              <th>Category</th>
              <th class="c-price">Price (IDR)</th>
              <th class="c-pub">Public</th>
              <th class="c-del"><span class="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i">
              <td class="c-drag">
                <button
                  class="icon-btn"
                  :disabled="i === 0"
                  aria-label="Move up"
                  @click="move(i, -1)"
                >
                  ↑
                </button>
                <button
                  class="icon-btn"
                  :disabled="i === rows.length - 1"
                  aria-label="Move down"
                  @click="move(i, 1)"
                >
                  ↓
                </button>
              </td>
              <td>
                <input v-model="row.description" class="in" placeholder="Service name" />
              </td>
              <td>
                <input v-model="row.category" class="in" list="cats" placeholder="Category" />
              </td>
              <td class="c-price">
                <input v-model.number="row.price" type="number" min="0" step="50000" class="in in--num" />
                <span class="hint">{{ rupiah(row.price) }}</span>
              </td>
              <td class="c-pub">
                <label class="sw">
                  <input v-model="row.public" type="checkbox" />
                  <span class="sr-only">Show on public pricing page</span>
                </label>
              </td>
              <td class="c-del">
                <button class="icon-btn danger" aria-label="Remove service" @click="remove(i)">
                  ✕
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <datalist id="cats">
          <option v-for="c in categories" :key="c" :value="c" />
        </datalist>
      </div>

      <button class="btn ghost add" @click="add"><i class="fas fa-plus"></i> Add service</button>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { loadPricing, savePricing, blankService } from '../stores/pricing.js'
import { rupiah } from '@bycarolinecls/shared/format'

const rows = ref([])
const original = ref('')
const loading = ref(true)
const busy = ref(false)
const message = ref('')
const ok = ref(true)

const dirty = computed(() => JSON.stringify(rows.value) !== original.value)
const categories = computed(() => [...new Set(rows.value.map((r) => r.category).filter(Boolean))])

function snapshot(list) {
  rows.value = list.map((s) => ({ ...s }))
  original.value = JSON.stringify(rows.value)
}

onMounted(async () => {
  snapshot(await loadPricing())
  loading.value = false
})

const add = () => rows.value.push(blankService())
const remove = (i) => rows.value.splice(i, 1)

function move(i, delta) {
  const j = i + delta
  if (j < 0 || j >= rows.value.length) return
  const [row] = rows.value.splice(i, 1)
  rows.value.splice(j, 0, row)
}

function reset() {
  rows.value = JSON.parse(original.value)
  message.value = ''
}

async function save() {
  busy.value = true
  message.value = ''
  try {
    snapshot(await savePricing(rows.value))
    ok.value = true
    message.value = 'Pricing saved.'
  } catch (err) {
    ok.value = false
    message.value = `Could not save: ${err.message}`
  } finally {
    busy.value = false
    setTimeout(() => (message.value = ''), 5000)
  }
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
  margin-bottom: 22px;
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
  max-width: 56ch;
  line-height: 1.5;
}

.page__actions {
  display: flex;
  gap: 10px;
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
  cursor: pointer;
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
.add {
  margin-top: 14px;
}

.banner {
  padding: 10px 13px;
  border-radius: 8px;
  font-size: 13.5px;
  margin: 0 0 16px;
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

.table-wrap {
  overflow-x: auto;
  border: 1px solid #e6e3dc;
  border-radius: 10px;
  background: #fff;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
}

.tbl th {
  text-align: left;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a857c;
  padding: 12px;
  border-bottom: 1px solid #eeebe4;
  font-weight: 600;
}

.tbl td {
  padding: 8px 12px;
  border-bottom: 1px solid #f2efe9;
  vertical-align: middle;
}

.tbl tr:last-child td {
  border-bottom: 0;
}

.in {
  font-size: 13.5px;
  padding: 8px 10px;
}
.in:focus {
  border-color: var(--ink);
}
.in--num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.c-price {
  width: 190px;
}
.hint {
  display: block;
  font-size: 11px;
  color: #a09a90;
  text-align: right;
  padding-top: 3px;
}

.c-drag,
.c-pub,
.c-del {
  width: 1%;
  white-space: nowrap;
}

.icon-btn {
  font: inherit;
  border: 1px solid #e0dcd4;
  background: #fff;
  border-radius: 6px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  color: #4a463f;
  line-height: 1;
}
.icon-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.icon-btn.danger:hover {
  border-color: #d9a49e;
  color: #99312a;
}

.sw input {
  width: 17px;
  height: 17px;
  accent-color: #1d1d1d;
}

.empty {
  padding: 48px;
  text-align: center;
  color: #8a857c;
}
</style>
