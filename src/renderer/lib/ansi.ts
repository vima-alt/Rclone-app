const ANSI_REGEX = /\x1b\[([0-9;]*)m/g

const COLOR_MAP: Record<string, string> = {
  '30': 'text-black',
  '31': 'text-red-500 dark:text-red-400',
  '32': 'text-green-500',
  '33': 'text-yellow-500',
  '34': 'text-blue-500',
  '35': 'text-purple-500',
  '36': 'text-cyan-500',
  '37': 'text-gray-300',
  '90': 'text-gray-500',
  '91': 'text-red-400',
  '92': 'text-green-400',
  '93': 'text-yellow-400',
  '94': 'text-blue-400',
  '95': 'text-purple-400',
  '96': 'text-cyan-400',
  '97': 'text-white',
  '40': 'bg-black',
  '41': 'bg-red-500 dark:bg-red-400',
  '42': 'bg-green-500',
  '43': 'bg-yellow-500',
  '44': 'bg-blue-500',
  '45': 'bg-purple-500',
  '46': 'bg-cyan-500',
  '47': 'bg-gray-300',
}

const STYLE_MAP: Record<string, string> = {
  '1': 'font-bold',
  '2': 'opacity-50',
  '3': 'italic',
  '4': 'underline',
  '9': 'line-through',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function parseAnsi(text: string): string {
  const parts = text.split(ANSI_REGEX)
  let result = ''
  let activeClasses: string[] = []

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (parts[i]) {
        if (activeClasses.length > 0) {
          result += `<span class="${activeClasses.join(' ')}">${escapeHtml(parts[i])}</span>`
        } else {
          result += escapeHtml(parts[i])
        }
      }
    } else {
      const codes = parts[i].split(';')
      activeClasses = []

      for (const code of codes) {
        if (code === '0' || code === '') {
          activeClasses = []
        } else if (COLOR_MAP[code]) {
          activeClasses.push(COLOR_MAP[code])
        } else if (STYLE_MAP[code]) {
          activeClasses.push(STYLE_MAP[code])
        }
      }
    }
  }

  return result
}
