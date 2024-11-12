import enUS from './en-US.json'
import ptBR from './pt-BR.json'
import { createI18n } from 'vue-i18n'

// define message schema as master message schema
export type MessageSchema = typeof enUS

// define number format schema
export type NumberSchema = {
  currency: {
    style: 'currency'
    currencyDisplay: 'symbol'
    currency: string
  }
}

export const i18n = createI18n<[MessageSchema], 'en-US' | 'pt-BR'>({
  locale: 'en-US',
  messages: {
    'en-US': enUS,
    'pt-BR': ptBR,
  }
})
