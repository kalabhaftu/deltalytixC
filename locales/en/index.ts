import auth from './auth'
import chat from './chat'
import dropzone from './dropzone'
import landing from './landing'
import mindset from './mindset'
import propfirm from './propfirm'
import shared from './shared'
import importTranslations from './import'

export default {
  ...auth,
  ...chat,
  ...dropzone,
  ...landing,
  ...mindset,
  ...propfirm,
  ...shared,
  ...importTranslations,
} as const