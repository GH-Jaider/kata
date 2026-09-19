import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// BASE_PATH lets the same build live at the root of a domain or under a project path such as /kata/ on GitHub Pages.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [svelte()],
})
