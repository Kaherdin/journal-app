const fs = require('fs');
const path = require('path');

// Configuration
const sourceDir = path.join(__dirname, 'data_journal', 'source_chatgpt');
const outputDir = path.join(__dirname, 'data_journal', 'entries');
const fileExtension = '.md'; // Change to .txt if preferred

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created output directory: ${outputDir}`);
}

// Get all files in the source directory
const files = fs.readdirSync(sourceDir);
console.log(`Found ${files.length} files to process in ${sourceDir}`);

// Track total entries created
let totalEntries = 0;

// Keep track of used filenames to avoid duplicates
const usedFilenames = new Set();

// Process each file
files.forEach(file => {
  const sourceFilePath = path.join(sourceDir, file);
  
  // Skip directories
  if (fs.statSync(sourceFilePath).isDirectory()) {
    console.log(`Skipping directory: ${file}`);
    return;
  }
  
  console.log(`Processing file: ${file}`);
  
  try {
    // Read the file content
    const fileContent = fs.readFileSync(sourceFilePath, 'utf8');
    
    // Split the content by "user" marker
    // We need to consider each user/ChatGPT pair as a conversation entry
    const lines = fileContent.split('\n');
    let entries = [];
    let currentEntry = '';
    let inEntry = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Start of a new entry
      if (line.trim() === 'user') {
        // If we were already in an entry, save it
        if (inEntry && currentEntry.trim().length > 0) {
          entries.push(currentEntry.trim());
        }
        // Start a new entry
        currentEntry = 'user\n';
        inEntry = true;
      } 
      // Continue an existing entry
      else if (inEntry) {
        currentEntry += line + '\n';
      }
    }
    
    // Add the last entry if there is one
    if (inEntry && currentEntry.trim().length > 0) {
      entries.push(currentEntry.trim());
    }
    
    console.log(`Found ${entries.length} entries in ${file}`);
    
    // Process each entry
    entries.forEach((entry, index) => {
      // Try to extract a date from the entry
      let dateMatch = entry.match(/\b(20\d\d[-.\/]\d{1,2}[-.\/]\d{1,2})\b/);
      
      // If no date found in YYYY-MM-DD format, try with DD-MM-YYYY format
      if (!dateMatch) {
        dateMatch = entry.match(/\b(\d{1,2}[-.\/]\d{1,2}[-.\/]20\d\d)\b/);
      }
      
      // Try to find mentions of days like "samedi 14"
      if (!dateMatch) {
        const dayMatch = entry.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\b/i);
        if (dayMatch) {
          // Use current year and format as YYYY-MM-DD for the filename
          const day = dayMatch[2].padStart(2, '0');
          // We don't know the month, so use the current date for now
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          dateMatch = [null, `${year}-${month}-${day}`];
        }
      }
      
      // Generate base filename
      let baseFilename;
      if (dateMatch) {
        // Extract and format the date for the filename
        const datePart = dateMatch[1].replace(/[-.\/]/g, '-');
        baseFilename = `entry_${datePart}`;
      } else {
        // Use source filename if no date found
        const sourceBase = path.basename(file, path.extname(file));
        baseFilename = `entry_${sourceBase}_${String(index + 1).padStart(3, '0')}`;
      }
      
      // Make sure the filename is unique
      let filename = `${baseFilename}${fileExtension}`;
      let counter = 1;
      
      while (usedFilenames.has(filename.toLowerCase())) {
        // Add counter suffix if filename already exists
        filename = `${baseFilename}_${String(counter).padStart(2, '0')}${fileExtension}`;
        counter++;
      }
      
      // Add to used filenames
      usedFilenames.add(filename.toLowerCase());
      
      const filePath = path.join(outputDir, filename);
      
      // Write the entry to a file
      fs.writeFileSync(filePath, entry);
      console.log(`Created file: ${filename}`);
      totalEntries++;
    });
  } catch (error) {
    console.error(`Error processing file ${file}:`, error.message);
  }
});

console.log(`Journal splitting completed! Created ${totalEntries} entry files.`);
