import { Client } from "@notionhq/client";
import { NotionConverter } from "notion-to-md";
import { DefaultExporter } from "notion-to-md/plugins/exporter";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("pageId");
  const raw = searchParams.get("raw") === "true"; // Check if raw parameter is set to true
  const docFormat = searchParams.get("docFormat") === "true"; // Check if docFormat parameter is set to true

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
      outputType: "buffer",
      buffer: buffer,
    });

    // Create the NotionConverter instance with the exporter
    const n2m = new NotionConverter(notion).withExporter(exporter);

    // Convert the Notion page to markdown
    await n2m.convert(pageId);

    // Get the raw markdown content
    let markdown = buffer[pageId] || "";

    // Add vertical spacing between sections (moderate spacing)
    markdown = markdown.replace(/\n(#+\s)/g, "\n\n$1");
    markdown = markdown.replace(/\n(>\s)/g, "\n\n$1");

    // Remove any existing database headers first
    markdown = markdown.replace(/> ⭐ \*\*Mes notes\*\*[\s\n>-]*\n\n/g, "");
    markdown = markdown.replace(/⭐ Mes notes\n⭐ Mes notes/g, "Mes notes");

    // Ensure consistent formatting for Mes notes section
    markdown = markdown.replace(/⭐ Mes notes/g, "**Mes notes**:");

    // Check for database references in the format [0](database_id)
    const databaseRegex = /\[0\]\(([a-f0-9-]+)\)/g;
    const databaseMatches = [...markdown.matchAll(databaseRegex)];

    // Process each database reference found
    for (const match of databaseMatches) {
      const databaseId = match[1];
      try {
        // Removed database schema fetch since we're using a simpler approach

        // Query the database to get rows
        const response = await notion.databases.query({
          database_id: databaseId,
          page_size: 100, // Limit results
        });

        // Use a simplified list format instead of a table
        let tableMarkdown = `**Mes notes**:\n`;

        // Collect the data with names and values
        const entries: { name: string; rating: string }[] = [];

        for (const page of response.results) {
          // Type assertion for page.properties
          const pageProperties = (page as any).properties || {};

          // Find the name and number properties
          let name = "";
          let rating = "";

          for (const [propName, prop] of Object.entries(pageProperties)) {
            if (propName.toLowerCase() === "name") {
              // Get the name value
              const titleContent = (prop as any).title;
              if (titleContent && titleContent.length > 0) {
                name = titleContent
                  .map((t: any) => t.plain_text || "")
                  .join("");
              }
            } else if (propName.toLowerCase() === "number") {
              // Get the rating value
              rating = (prop as any).number?.toString() || "";
            }
          }

          if (name && rating) {
            entries.push({ name, rating });
          }
        }

        // Create a simple list format
        entries.forEach((entry) => {
          tableMarkdown += `- ${entry.name} : ${entry.rating}\n`;
        });

        // Replace the database reference with the table markdown
        // Add a newline after the list
        tableMarkdown += "\n";
        markdown = markdown.replace(match[0], tableMarkdown);

        // Clean up formatting issues
        markdown = markdown.replace(
          /\*\*Mes notes\*\*:\n- /g,
          "**Mes notes**:\n- "
        );
      } catch (dbError) {
        console.error(`Error fetching database ${databaseId}:`, dbError);
        // Replace with error message if we can't fetch the database
        markdown = markdown.replace(
          match[0],
          `**Mes notes**:\n*(Error: Could not fetch database content)*\n\n`
        );
      }
    }

    // Clean up any UUIDs/IDs that might be in the markdown
    markdown = markdown.replace(/\b[0-9a-f]{32}\b/g, '');
    markdown = markdown.trim();
    
    // Extract MIT if present
    let mit = "";
    const mitRegex = />\s*⚠️\s*\*\*MIT:\s*([^*]+)\*\*/;
    const mitMatch = markdown.match(mitRegex);
    
    if (mitMatch && mitMatch[1]) {
      mit = mitMatch[1].trim();
    }
    
    // Format for Google Docs if requested
    if (docFormat) {
      // Simple formatting for Google Docs (plain text with basic formatting)
      let docFormatted = markdown;
      
      // Replace markdown headers with plain text equivalents
      docFormatted = docFormatted.replace(/#{1,6}\s+(.+)/g, '$1');
      
      // Replace markdown bold with plain text
      docFormatted = docFormatted.replace(/\*\*(.+?)\*\*/g, '$1');
      
      // Replace markdown italic with plain text
      docFormatted = docFormatted.replace(/\*(.+?)\*/g, '$1');
      
      // Replace markdown links with just the text
      docFormatted = docFormatted.replace(/\[(.+?)\]\(.+?\)/g, '$1');
      
      // Return the formatted plain text for Google Docs
      markdown = docFormatted;
    }
    
    // Return raw markdown if requested, otherwise return JSON
    if (raw) {
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
    } else {
      return NextResponse.json({ markdown, mit });
    }
  } catch (error) {
    console.error("Error converting Notion page:", error);
    return NextResponse.json(
      { error: "Failed to convert Notion page to markdown" },
      { status: 500 }
    );
  }
}
