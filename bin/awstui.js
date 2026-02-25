#!/usr/bin/env node
import { register } from 'tsx/esm/api'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

register()

await import(resolve(__dirname, '../src/index.tsx'))
