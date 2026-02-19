/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#EB008B',
                secondary: '#ffffff',
                dark: '#141414',
            },
        },
        colors: {
            // 기본 색상 유지
            transparent: 'transparent',
            current: 'currentColor',
            white: '#ffffff',
            black: '#000000',
            // 커스텀 색상
            primary: '#EB008B',
            secondary: '#ffffff',
            dark: '#141414',
            // 중립적인 회색 (배경과 구분되도록 밝기 조정)
            gray: {
                50: '#fafafa',
                100: '#f5f5f5',
                200: '#e5e5e5',
                300: '#d4d4d4',
                400: '#a3a3a3',
                500: '#737373',
                600: '#525252',
                700: '#3a3a3a',   // 배경보다 밝게
                800: '#2a2a2a',   // 배경보다 밝게
                900: '#1f1f1f',   // 배경보다 밝게
                950: '#0a0a0a',
            },
            // 다른 색상들 (필요시)
            red: {
                500: '#ef4444',
                600: '#dc2626',
                700: '#b91c1c',
            },
            blue: {
                500: '#3b82f6',
                600: '#2563eb',
            },
            green: {
                500: '#22c55e',
            },
            yellow: {
                400: '#facc15',
            },
        },
    },
    plugins: [],
}
