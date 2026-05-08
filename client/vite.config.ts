import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure a single graphql instance across all imports (prevents
    // "Cannot use GraphQLSchema from another module or realm" in tests).
    dedupe: ["graphql"],
  },
  optimizeDeps: {
    // Pre-bundle graphql and related tools so all imports share one instance.
    include: [
      "graphql",
      "@graphql-tools/schema",
      "@graphql-tools/mock",
      "@graphql-tools/utils",
    ],
  },
  server: {
    port: 3000,
    proxy: {
      "/graphql": "http://localhost:4000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor chunks so the browser can cache them
        // independently and parallelize their download.
        manualChunks: {
          apollo: ["@apollo/client", "rxjs"],
          clerk: ["@clerk/clerk-react"],
          chart: ["chart.js", "chartjs-plugin-annotation", "chartjs-plugin-zoom", "react-chartjs-2"],
        },
      },
    },
  },
});
