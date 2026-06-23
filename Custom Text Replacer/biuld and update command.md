I'll check the package.json in the Custom Text Replacer folder to see what build scripts are available. 

Read [](file:///c%3A/Users/Admin/OneDrive/Desktop/Extensions-By-Bunny/Custom%20Text%20Replacer/package.json)

**To build TypeScript:**

```bash
npm run build
```

This runs `tsc` (TypeScript compiler) and outputs the compiled files to the `dist` folder based on your `tsconfig.json` settings.

**Available scripts:**
- `npm run build` — Compile TypeScript to JavaScript
- `npm run start` — Run the compiled code (`node dist/index.js`)
- `npm run dev` — Run TypeScript directly with ts-node

**To watch for changes and rebuild automatically**, you can either:
1. Add a watch script to package.json:
   ```json
   "watch": "tsc --watch"
   ```
   Then run: `npm run watch`

2. Or run directly: `tsc --watch`