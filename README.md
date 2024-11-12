<p align="center">
  <a href="https://projectbluefin.io/"><img src="/public/meta.png?raw=true" alt="Bluefin"/></a>
</p>

# Website for [Bluefin](https://github.com/ublue-os/bluefin)

<p align="center">
  <img src="/metrics.plugin.pagespeed.svg?raw=true" alt="Google Pagespeed Metrics"/>
</p>

## Contributing

If you want to add another language to this website, add it to the [language schema](src/locales/schema.ts) and start writing!

```typescript
// Add your own language here on a new json file following the naming schemas. e.g.:
// import jaJP from './ja-JP.json'
import enUS from './en-US.json'
import ptBR from './pt-BR.json'
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
    // Add your language here following the style guideline, e.g.:
    // 'ja-JP': jaJP,
  }
})
```

Your new language will follow the schema from `enUS`, so make sure the fields and everything are the same. Some fields may contain markdown support or HTML support, that really depends and there is just no way I can document this here.
