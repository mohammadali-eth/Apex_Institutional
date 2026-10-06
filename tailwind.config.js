/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#82c341',
          'primary-hover': '#71ac36',
          'primary-light': '#f2f9eb',
          secondary: '#45525b',
          'secondary-dark': '#343f46',
          'secondary-light': '#566671',
          bg: '#f3f3f3',
          font: '#838383',
          title: '#44535b',
          paragraph: '#676767',
          'bg-text': '#dcdcdc',
          'bg-title': '#f6f6f7',
          footer: '#eeeeee',
        }
      }
    },
  },
  plugins: [],
}
