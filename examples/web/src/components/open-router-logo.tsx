import { type SVGProps } from "react"

const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 512 512"
    stroke="currentColor"
    {...props}
  >
    <g clipPath="url(#clip0_205_3)">
      <path
        strokeWidth={90}
        d="M3 248.945c15 0 73-12.945 103-29.945s30-17 92-61c78.497-55.707 134-37.055 225-37.055"
      />
      <path d="m511 121.5-153.75 88.768V32.732L511 121.5Z" />
      <path
        strokeWidth={90}
        d="M0 249c15 0 73 12.945 103 29.945s30 17 92 61C273.497 395.652 329 377 420 377"
      />
      <path d="m508 376.445-153.75-88.767v177.535L508 376.445Z" />
    </g>
  </svg>
)

export { SvgComponent as OpenRouterLogo }
