import type { Profile, UserAnatomy } from '../types'

function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] || lines[0]
}

export function anatomyLabel(anatomy: UserAnatomy): string {
  return anatomy === 'penis' ? 'pik' : 'fisse'
}

export function localCloseReply(profile: Profile): string {
  if (!profile.nsfw || profile.plan === 'free') {
    return pick([
      'Ja, jeg kan mærke, du er tæt på. Hold en rolig pause og bliv hos mig.',
      'Godt. Bliv lige på kanten og træk vejret roligt.',
      'Jeg er her. Sæt tempoet ned og mærk efter et øjeblik.',
    ])
  }
  const anatomy = anatomyLabel(profile.userAnatomy)
  return pick([
    `Jeg kan mærke, din ${anatomy} er tæt på. Hold stille og vent på mig.`,
    `Godt. ${anatomy === 'pik' ? 'Pikken' : 'Fissen'} reagerer, men du bliver på kanten lidt endnu.`,
    `Langsomt nu. Hold igen, og fortæl mig, hvor tæt din ${anatomy} er.`,
  ])
}

export function localClimaxReply(profile: Profile): string {
  if (!profile.nsfw || profile.plan === 'free') {
    return pick([
      'Ja, slip nu. Du gjorde det godt. Bliv liggende og træk vejret roligt bagefter.',
      'Godt. Jeg er lige her. Giv kroppen ro, og lad os tage aftercare bagefter.',
      'Sådan. Du må gerne slappe helt af nu. Ingen hast.',
    ])
  }
  if (profile.userAnatomy === 'penis') {
    return pick([
      'Ja, kom nu. Lad pikken pulsere, og slip helt for mig.',
      'Nu. Kom for mig, og hold ikke igen. Godt.',
      'Sådan. Pikken rykker — slip, og lad mig høre dig.',
    ])
  }
  return pick([
    'Ja, kom nu. Lad fissen spænde og slip helt for mig.',
    'Nu. Kom for mig, og mærk hver puls. Godt.',
    'Sådan. Fissen klemmer — bliv i det og slip helt.',
  ])
}
