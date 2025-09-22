import auth from './auth'
import dropzone from './dropzone'
import landing from './landing'
import propfirm from './propfirm'
import shared from './shared'
import importTranslations from './import'

export default {
  ...auth,
  ...dropzone,
  ...landing,
  ...propfirm,
  ...shared,
  ...importTranslations,
} as const