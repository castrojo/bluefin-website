import enUS from './en-US.json'
import ptBR from './pt-BR.json'
import deDE from './de-DE.json'
import { createI18n } from 'vue-i18n'

export type MessageSchema = typeof enUS

export type NumberSchema = {
  currency: {
    style: 'currency'
    currencyDisplay: 'symbol'
    currency: string
  }
}

export const i18n = createI18n<[MessageSchema], string>({
  locale: 'en-US',
  messages: {
    'en-US': enUS,
    'pt-BR': ptBR,
    'de-DE': deDE,
  },
})
