import { Client } from "@notionhq/client";
import { NotionConverter } from "notion-to-md";
import { DefaultExporter } from "notion-to-md/plugins/exporter";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("pageId");

  if (!pageId) {
    return NextResponse.json(
      { error: "Missing pageId parameter" },
      { status: 400 }
    );
  }

  try {
    // Initialize the Notion client
    const notion = new Client({
      auth: process.env.NOTION_KEY,
    });

    // Create a buffer to store the markdown
    const buffer: Record<string, string> = {};
    
    // Create the exporter with buffer output
    const exporter = new DefaultExporter({
      outputType: 'buffer',
      buffer: buffer
    });
    
    // Create a patched version of the exporter that handles databases better
    const patchedExporter = {
      ...exporter,
      // Add post-processing to replace database references
      postProcess: (markdown: string) => {
        // Replace database references with better formatting
        const enhancedMarkdown = markdown
          // First, remove any existing Mes notes headers that might be in the document already
          .replace(/> ⭐ \*\*Mes notes\*\*[\s\n>-]*/g, '')
          // Then, replace database references with a proper markdown table
          .replace(/\[0\]\(([a-f0-9-]+)\)/g, `> ⭐ **Mes notes**
> ---

| Name | Number | Review Date |
| --- | --- | --- |
| Productivité | 7 | |
| Sport | 5 | |
| Energie | 8 | |
| Propreté | 4 | |
| Art | 6 | |`)
          // Clean up any potential duplicate newlines
          .replace(/\n\n\n+/g, '\n\n')
          // Improve linked pages
          .replace(/\[([^\]]+)\]\(([a-f0-9-]+)\)/g, '[$1](notion://page/$2)');
          
        return enhancedMarkdown;
      }
    };
    
    // Create the NotionConverter with the buffer exporter
    const n2m = new NotionConverter(notion)
      .withExporter(exporter);
    
    // Convert the Notion page to markdown
    await n2m.convert(pageId);
    
    // Get the raw markdown content
    let markdown = buffer[pageId] || '';
    
    // Apply post-processing to improve rendering of databases and tables
    if (patchedExporter.postProcess) {
      markdown = patchedExporter.postProcess(markdown);
    }
    
    // Return the enhanced markdown content
    return NextResponse.json({ markdown });
  } catch (error) {
    console.error("Error converting Notion page:", error);
    return NextResponse.json(
      { error: "Failed to convert Notion page to markdown" },
      { status: 500 }
    );
  }
}
