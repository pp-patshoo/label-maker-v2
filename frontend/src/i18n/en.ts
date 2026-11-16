export const en = {
  'app.name': 'Label Maker',

  'menu.home': 'Home',
  'menu.sample': 'Sample Module',
  'menu.settings': 'Settings',

  'sidebar.collapse': 'Collapse sidebar',
  'sidebar.expand': 'Expand sidebar',
  'sidebar.language': 'Language',

  'page.empty': 'No content yet',
  'page.loading': 'Loading…',

  'login.title': 'Sign in',
  'login.subtitle': 'Sign in to continue',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.submitting': 'Signing in…',
  'login.error.required': 'Please enter your username and password',
  'login.error.failed': 'Sign in failed. Please try again.',

  'user.signOut': 'Sign out',
  'user.menu': 'Account',
} as const

export type TranslationKey = keyof typeof en
export type Dictionary = Record<TranslationKey, string>
