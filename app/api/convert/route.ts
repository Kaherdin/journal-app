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
    
    // Get the raw markdown content
    let markdown = buffer[pageId] || '';
    
    // Remove any existing database headers first
    markdown = markdown.replace(/> ⭐ \*\*Mes notes\*\*[\s\n>-]*\n\n/g, '');
    
    // Check for database references in the format [0](database_id)
    const databaseRegex = /\[0\]\(([a-f0-9-]+)\)/g;
    const databaseMatches = [...markdown.matchAll(databaseRegex)];
    
    // Process each database reference found
    for (const match of databaseMatches) {
      const databaseId = match[1];
      try {
        // Fetch the database schema to get column names
        const databaseInfo = await notion.databases.retrieve({ database_id: databaseId });
        
        // Extract column properties - handle type safely
        const properties = databaseInfo.properties || {};
        const columnNames = Object.entries(properties).map(([name, prop]: [string, any]) => ({ 
          name, 
          type: prop.type as string 
        }));
        
        // Query the database to get rows
        const response = await notion.databases.query({
          database_id: databaseId,
          page_size: 100, // Limit results
        });
        
        // Generate the markdown table header
        // Use 'Mes notes' as default title as we know that's what it's called
        let tableMarkdown = `> ⭐ **Mes notes**\n> ---\n\n`;
        
        // Create table header row
        tableMarkdown += '| ' + columnNames.map(col => col.name).join(' | ') + ' |\n';
        tableMarkdown += '| ' + columnNames.map(() => '---').join(' | ') + ' |\n';
        
        // Add table rows
        for (const page of response.results) {
          const row = [];
          for (const { name, type } of columnNames) {
            // Type assertion for page.properties
            const pageProperties = (page as any).properties || {};
            const property = pageProperties[name];
            let cellValue = '';
            
            // Extract values based on property type
            if (property && property[type]) {
              if (type === 'number') {
                cellValue = property.number?.toString() || '';
              } else if (type === 'title' || type === 'rich_text') {
                const textContent = property[type];
                if (textContent && textContent.length > 0) {
                  cellValue = textContent.map((t: any) => t.plain_text || '').join('');
                }
              }
            }
            
            row.push(cellValue);
          }
          
          tableMarkdown += '| ' + row.join(' | ') + ' |\n';
        }
        
        // Replace the database reference with the table markdown
        markdown = markdown.replace(match[0], tableMarkdown);
      } catch (dbError) {
        console.error(`Error fetching database ${databaseId}:`, dbError);
        // Replace with error message if we can't fetch the database
        markdown = markdown.replace(
          match[0], 
          `> ⭐ **Database**\n> ---\n\n*(Error: Could not fetch database content)*\n\n`
        );
      }
    }
    
    // Return the processed markdown content
    return NextResponse.json({ markdown });
  } catch (error) {
    console.error("Error converting Notion page:", error);
    return NextResponse.json(
      { error: "Failed to convert Notion page to markdown" },
      { status: 500 }
    );
  }
}
