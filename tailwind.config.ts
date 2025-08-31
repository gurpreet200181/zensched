
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				// Brand wellness colors
				sage: {
					50: 'hsl(134, 30%, 97%)',
					100: 'hsl(134, 30%, 92%)',
					200: 'hsl(134, 30%, 83%)',
					300: 'hsl(134, 30%, 70%)',
					400: 'hsl(134, 30%, 55%)',
					500: 'hsl(134, 30%, 45%)',
					600: 'hsl(134, 30%, 36%)',
					700: 'hsl(134, 30%, 28%)',
					800: 'hsl(134, 30%, 22%)',
					900: 'hsl(134, 30%, 18%)',
				},
				mint: {
					50: 'hsl(154, 35%, 97%)',
					100: 'hsl(154, 35%, 90%)',
					200: 'hsl(154, 35%, 80%)',
					300: 'hsl(154, 35%, 65%)',
					400: 'hsl(154, 35%, 50%)',
					500: 'hsl(154, 35%, 40%)',
				},
				calm: {
					50: 'hsl(210, 60%, 98%)',
					100: 'hsl(210, 60%, 94%)',
					200: 'hsl(210, 60%, 85%)',
					300: 'hsl(210, 60%, 70%)',
					400: 'hsl(210, 60%, 55%)',
					500: 'hsl(210, 60%, 45%)',
				},
				// Busyness level colors
				busyness: {
					calm: 'hsl(134, 45%, 65%)',
					moderate: 'hsl(45, 70%, 65%)',
					busy: 'hsl(25, 70%, 65%)',
					overwhelming: 'hsl(0, 70%, 65%)',
				},
				// Event classification colors
				events: {
					meeting: 'hsl(220, 60%, 60%)',
					focus: 'hsl(270, 55%, 65%)',
					break: 'hsl(134, 50%, 60%)',
					personal: 'hsl(190, 55%, 60%)',
					travel: 'hsl(25, 60%, 60%)',
					buffer: 'hsl(45, 55%, 65%)',
				},
				// System colors
				border: 'hsl(220, 13%, 91%)',
				input: 'hsl(220, 13%, 91%)',
				ring: 'hsl(134, 30%, 45%)',
				background: 'hsl(0, 0%, 100%)',
				foreground: 'hsl(222.2, 84%, 4.9%)',
				primary: {
					DEFAULT: 'hsl(134, 30%, 45%)',
					foreground: 'hsl(0, 0%, 98%)'
				},
				secondary: {
					DEFAULT: 'hsl(134, 30%, 97%)',
					foreground: 'hsl(134, 30%, 28%)'
				},
				muted: {
					DEFAULT: 'hsl(220, 14%, 96%)',
					foreground: 'hsl(220, 9%, 46%)'
				},
				accent: {
					DEFAULT: 'hsl(154, 35%, 97%)',
					foreground: 'hsl(154, 35%, 28%)'
				},
				destructive: {
					DEFAULT: 'hsl(0, 84.2%, 60.2%)',
					foreground: 'hsl(210, 40%, 98%)'
				},
				card: {
					DEFAULT: 'hsl(0, 0%, 100%)',
					foreground: 'hsl(222.2, 84%, 4.9%)'
				},
				popover: {
					DEFAULT: 'hsl(0, 0%, 100%)',
					foreground: 'hsl(222.2, 84%, 4.9%)'
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'breathe': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.02)' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'breathe': 'breathe 4s ease-in-out infinite',
				'float': 'float 6s ease-in-out infinite'
			},
			backgroundImage: {
				'gradient-wellness': 'linear-gradient(135deg, hsl(134, 30%, 97%) 0%, hsl(154, 35%, 97%) 100%)',
				'gradient-calm': 'linear-gradient(135deg, hsl(210, 60%, 98%) 0%, hsl(134, 30%, 97%) 100%)',
				'gradient-hero': 'linear-gradient(135deg, hsl(134, 30%, 50%) 0%, hsl(154, 35%, 45%) 50%, hsl(210, 60%, 55%) 100%)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
