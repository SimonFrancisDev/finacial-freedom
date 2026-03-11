import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import itCommon from './locales/it/common.json'
import zhCommon from './locales/zh/common.json'
import hiCommon from './locales/hi/common.json'
import faCommon from './locales/fa/common.json'
import idCommon from './locales/id/common.json'
import koCommon from './locales/ko/common.json'
import frCommon from './locales/fr/common.json'
import viCommon from './locales/vi/common.json'
import ruCommon from './locales/ru/common.json'
import esCommon from './locales/es/common.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      it: { common: itCommon },
      zh: { common: zhCommon },
      hi: { common: hiCommon },
      fa: { common: faCommon },
      id: { common: idCommon },
      ko: { common: koCommon },
      fr: { common: frCommon },
      vi: { common: viCommon },
      ru: { common: ruCommon },
      es: { common: esCommon }
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  })

export default i18n