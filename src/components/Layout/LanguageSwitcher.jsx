import React, { useEffect } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation()

  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]

  useEffect(() => {
    const lang = currentLanguage
    const isRTL = lang === 'fa'

    document.documentElement.lang = lang
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  }, [currentLanguage])

  const handleChange = async (e) => {
    const selectedLanguage = e.target.value
    await i18n.changeLanguage(selectedLanguage)
  }

  return (
    <Form.Select
      size="sm"
      value={currentLanguage}
      onChange={handleChange}
      style={{
        minWidth: '150px',
        backgroundColor: '#ffffff',
        color: '#002366',
        border: '1px solid rgba(255,255,255,0.35)',
        fontWeight: 700,
        fontSize: '0.85rem'
      }}
      aria-label="Language switcher"
    >
      <option value="en">English</option>
      <option value="it">Italiano</option>
      <option value="zh">中文</option>
      <option value="hi">हिन्दी</option>
      {/* <option value="fa">فارسی</option> */}
      <option value="id">Bahasa Indonesia</option>
      <option value="ko">한국어</option>
      <option value="fr">Français</option>
      <option value="vi">Tiếng Việt</option>
      <option value="ru">Русский</option>
      <option value="es">Español</option>
    </Form.Select>
  )
}