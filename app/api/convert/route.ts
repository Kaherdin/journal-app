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
    
    // Create the exporter to store the result in the buffer
    const exporter = new DefaultExporter({
      outputType: 'buffer',
      buffer: buffer
    });
    
    // Create the NotionConverter instance with the exporter
    const n2m = new NotionConverter(notion)
      .withExporter(exporter);
    
    // Convert the Notion page to markdown
    await n2m.convert(pageId);
    
    // Return the markdown content
    return NextResponse.json({ markdown: buffer[pageId] });
  } catch (error) {
    console.error("Error converting Notion page:", error);
    return NextResponse.json(
      { error: "Failed to convert Notion page to markdown" },
      { status: 500 }
    );
  }
}
