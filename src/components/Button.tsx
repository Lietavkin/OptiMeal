import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from '../utils/classNames'

type ButtonVariant = 'primary' | 'secondary' | 'solid' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant
	children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
	primary: 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-700',
	secondary: 'bg-slate-950 text-white hover:bg-slate-800',
	solid: 'bg-slate-950 text-white hover:bg-slate-800',
	ghost: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-100',
}

export default function Button({ variant = 'primary', className, type = 'button', children, ...props }: ButtonProps) {
	return (
		<button
			type={type}
			className={classNames(
				'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
				variantStyles[variant],
				className,
			)}
			{...props}
		>
			{children}
		</button>
	)
}