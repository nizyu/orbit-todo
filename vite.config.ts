/// <reference types="vitest" />

import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tailwindcss(),
		TanStackRouterVite({
			routesDirectory: "./app/routes",
			generatedRouteTree: "./app/routeTree.gen.ts",
		}),
		react(),
		tsconfigPaths(),
	],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./test/setup.ts"],
		exclude: ["**/node_modules/**", "**/test/e2e/**"],
	},
});
