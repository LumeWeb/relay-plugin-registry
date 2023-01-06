import preset from "@lumeweb/relay-plugin-rollup-preset";
export default preset(
  {
    input: "src/index.ts",
    output: {
      file: "dist/registry.js",
      format: "cjs",
      inlineDynamicImports: true,
    },
  },
  {},
  { ignore: ["bun:ffi"], transformMixedEsModules: true }
);
