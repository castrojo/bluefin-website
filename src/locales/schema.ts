import { createI18n } from 'vue-i18n'

const modules = import.meta.glob('./*.json', { eager: true })

const messages = Object.fromEntries(
  Object.entries(modules).map(([key, value]) => {
    const locale = key.match(/\.\/(.*)\.json$/)?.[1]
    return [locale, (value as any).default]
  })
)

export type NumberSchema = {
  currency: {
    style: 'currency'
    currencyDisplay: 'symbol'
    currency: string
  }
}
export type MessageSchema = typeof messages['en-US']

export const i18n = createI18n<[MessageSchema], string>({
  locale: 'en-US',
  messages,
})
