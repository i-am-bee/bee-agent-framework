import { string, z } from "zod";
import * as fs from 'fs';
import * as path from 'path';

function generateTreeAndContent(dir: string, prefix: string = ''): [string, string] {
    let tree = '';
    let content = '';
    const files = fs.readdirSync(dir);

    files.forEach((file, index) => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const isLast = index === files.length - 1;

        if (stats.isDirectory()) {
            tree += `${prefix}${isLast ? '└── ' : '├── '}${file}/\n`;
            const [subTree, subContent] = generateTreeAndContent(filePath, `${prefix}${isLast ? '    ' : '│   '}`);
            tree += subTree;
            content += subContent;
        } else {
            tree += `${prefix}${isLast ? '└── ' : '├── '}${file}\n`;
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            content += `// File: ${filePath}\n${fileContent}\n\n`;
        }
    });
    return [tree, content];
}

export class CodeExtractionTool {
  name = "code tree extraction ";
  description =
    "Extract the tree and code from a folder/path";

  inputSchema() {
    return z
      .object({
        path: z.string(),
      })
      .partial();
  }

   async run(
    input: string,
  ) {
    const [tree, content] = generateTreeAndContent(input);
    return tree + '\n\nFiles content: \n\n'+ content
  }
}
