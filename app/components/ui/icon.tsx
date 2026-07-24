type IconProps = {
  name: string
  class?: string
}

export function Icon({ name, class: className }: IconProps) {
  return <span class={className ? `icon ${className}` : 'icon'} data-icon={name} aria-hidden="true" />
}
