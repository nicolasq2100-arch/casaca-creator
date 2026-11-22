// Íconos propios: trazo de 1,75 px, puntas redondas, 20 × 20. Un solo estilo para toda la app.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 5 3.5 9l4 4" />
    <path d="M4 9h8.25a4.25 4.25 0 0 1 0 8.5H10" />
  </Icon>
);

export const RedoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12.5 5 4 4-4 4" />
    <path d="M16 9H7.75a4.25 4.25 0 0 0 0 8.5H10" />
  </Icon>
);

/** Cinta métrica: guías en cm. */
export const RulerIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6.5" width="15" height="7" rx="1" />
    <path d="M5.5 6.5v2.5M8.5 6.5v3.5M11.5 6.5v2.5M14.5 6.5v3.5" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12.5 4.5 7 10l5.5 5.5" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 4.5 13 10l-5.5 5.5" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
  </Icon>
);
