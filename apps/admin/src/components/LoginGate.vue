<template>
  <div class="login-shell">
    <form class="login-card" @submit.prevent="submit">
      <img :src="logo" alt="" class="login-logo" />
      <h1 class="login-title">Bycarolinecls</h1>
      <p class="login-sub">Admin sign in</p>

      <label class="login-label" for="email">Email</label>
      <input
        id="email"
        v-model="email"
        type="email"
        autocomplete="username"
        required
        :disabled="busy"
        class="login-input"
      />

      <label class="login-label" for="password">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        :disabled="busy"
        class="login-input"
      />

      <p v-if="error" class="login-error" role="alert">{{ error }}</p>

      <button type="submit" class="login-btn" :disabled="busy">
        {{ busy ? 'Signing in...' : 'Sign in' }}
      </button>

      <p class="login-note">Accounts are created by the site owner in the Firebase console.</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import logo from '../assets/bycarolinecls.png'
import { signIn, friendlyAuthError } from '../stores/auth.js'

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await signIn(email.value, password.value)
  } catch (e) {
    error.value = friendlyAuthError(e.code)
  } finally {
    busy.value = false
    password.value = ''
  }
}
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f6f6f2;
}
.login-card {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border: 1px solid #e6e3dc;
  border-radius: 14px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
}
.login-logo {
  width: 52px;
  height: 52px;
  object-fit: contain;
  align-self: center;
}
.login-title {
  font-family: Cinzel, Georgia, serif;
  font-size: 22px;
  font-weight: 600;
  text-align: center;
  margin: 14px 0 2px;
  letter-spacing: 0.02em;
}
.login-sub {
  text-align: center;
  color: #8a857c;
  font-size: 13px;
  margin: 0 0 24px;
}
.login-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b665e;
  margin-bottom: 6px;
}
.login-input {
  font: inherit;
  padding: 11px 12px;
  border: 1px solid #ddd8cf;
  border-radius: 8px;
  margin-bottom: 16px;
  background: #fcfcfa;
}
.login-input:focus {
  outline: 2px solid #1d1d1d;
  outline-offset: 1px;
  border-color: transparent;
}
.login-error {
  background: #fdf0ef;
  border: 1px solid #f0cfcb;
  color: #99312a;
  font-size: 13px;
  padding: 9px 11px;
  border-radius: 8px;
  margin: 0 0 14px;
}
.login-btn {
  font: inherit;
  font-weight: 600;
  padding: 12px;
  border: 0;
  border-radius: 8px;
  background: #1d1d1d;
  color: #fff;
  cursor: pointer;
}
.login-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
.login-note {
  font-size: 11.5px;
  color: #a09a90;
  text-align: center;
  margin: 18px 0 0;
  line-height: 1.5;
}
</style>
