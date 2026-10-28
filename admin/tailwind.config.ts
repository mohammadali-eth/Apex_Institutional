import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary-color)",
          hover: "#72b034",
          light: "#eaf5de",
        },
        secondary: {
          DEFAULT: "var(--secondary-color)",
          hover: "#39444c",
          dark: "#2c353b",
        },
        appbg: "var(--background-color)",
        surface: {
          DEFAULT: "var(--surface-color)",
          muted: "var(--bg-title-color)",
        },
        border: {
          DEFAULT: "var(--border-color)",
          subtle: "var(--bg-text-color)",
        },
        title: "var(--title-color)",
        paragraph: "var(--paragraph-color)",
        fontmuted: "var(--font-color)",
        footerbg: "var(--footer-bg)",
        sidebarmuted: "var(--sidebar-muted)",
        brand: {
          50: "#f4f9ed",
          100: "#eaf5de",
          200: "#d5ebbd",
          300: "#b5df8f",
          400: "#9ad365",
          500: "#82c341",
          600: "#6aa332",
          700: "#527e28",
          800: "#446524",
          900: "#3a5421",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      maxWidth: {
        content: "var(--content-max-width)",
      },
    },
  },
  plugins: [],
};

export default config;
