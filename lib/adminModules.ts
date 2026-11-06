export type AdminModule = {
  key: string
  tag: string
  title: string
  description: string
  roles: string[]
  href?: string // alag page
  view?: 'lectures' | 'members' // dashboard ke andar ka view
}

export const ADMIN_PANEL_ROLES = ['admin', 'manager', 'editor']

// Naya module add karna = yahan ek entry. Card apne aap role ke hisaab se dikhega.
export const ADMIN_MODULES: AdminModule[] = [
  {
    key: 'registrations',
    tag: 'Registrations',
    title: 'Lecture Registrations',
    description:
      'Choose a lecture and review everyone who registered for it. Search and download as CSV.',
    roles: ['admin', 'manager'],
    view: 'lectures',
  },
  {
    key: 'members',
    tag: 'Accounts',
    title: 'Members',
    description:
      'See everyone who has created an account on the website. Search and download as CSV.',
    roles: ['admin', 'manager'],
    view: 'members',
  },
  {
    key: 'podcast',
    tag: 'Content',
    title: 'Manage Podcast',
    description: 'Add, edit and manage CISMA Podcast episodes.',
    roles: ['admin', 'editor'],
    href: '/admin/podcast',
  },
  {
    key: 'users',
    tag: 'Access',
    title: 'Users and Roles',
    description: 'Give members a role such as admin, editor or manager. No code changes needed.',
    roles: ['admin'],
    href: '/admin/users',
  },
  {
    key: 'audit',
    tag: 'Security',
    title: 'Audit Log',
    description: 'See who changed which role and when. Read-only.',
    roles: ['admin'],
    href: '/admin/audit',
  },
  {
    key: 'certificates',
    tag: 'Certificates',
    title: 'Certificates',
    description: 'Open or close applications per lecture, see issued certificates and correct names.',
    roles: ['admin'],
    href: '/admin/certificates',
  },
  {
    key: 'lectures',
    tag: 'Content',
    title: 'Lectures',
    description: 'Add or edit lectures, open or close registration and move them to the Lecture Series.',
    roles: ['admin', 'editor'],
    href: '/admin/lectures',
  },
  {
    key: 'sections',
    tag: 'Content',
    title: 'Homepage Sections',
    description: 'Add, edit, reorder or hide sections on the homepage.',
    roles: ['admin', 'editor'],
    href: '/admin/sections',
  },
  {
    key: 'events',
    tag: 'Content',
    title: 'Slider Events',
    description: 'Add or edit items in the homepage slider, and choose when they appear.',
    roles: ['admin', 'editor'],
    href: '/admin/events',
  },
  {
    key: 'pages',
    tag: 'Content',
    title: 'Pages',
    description: 'Edit About and other pages: text, images, buttons and team lists.',
    roles: ['admin', 'editor'],
    href: '/admin/pages',
  },
  {
    key: 'keynotes',
    tag: 'Content',
    title: 'Keynotes',
    description: 'Add or edit keynote speakers, their talks and photos.',
    roles: ['admin', 'editor'],
    href: '/admin/keynotes',
  },
  {
    key: 'conference',
    tag: 'Content',
    title: 'Conference Setup',
    description: 'Edit conference details, deadlines, tracks, topics and submission types.',
    roles: ['admin', 'editor'],
    href: '/admin/conference',
  },
  {
    key: 'menu',
    tag: 'Content',
    title: 'Menu',
    description: 'Edit the website menu and the Past Events dropdown.',
    roles: ['admin', 'editor'],
    href: '/admin/menu',
  },
]

export function modulesFor(role: string) {
  return ADMIN_MODULES.filter((m) => m.roles.includes(role))
}