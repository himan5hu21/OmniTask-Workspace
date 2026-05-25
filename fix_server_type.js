const fs = require('fs');
const path = require('path');

const serverFilePath = path.join(__dirname, 'backend/src/server.ts');
let content = fs.readFileSync(serverFilePath, 'utf8');

// Replace file_type with mime_type
const target = "return await streamStoredFile(reply, attachment.file_url, attachment.file_type);";
const replacement = "return await streamStoredFile(reply, attachment.file_url, attachment.mime_type);";

if (content.includes(target)) {
  // Replace all occurrences
  content = content.split(target).join(replacement);
  fs.writeFileSync(serverFilePath, content);
  console.log('✅ Successfully updated server.ts file type references!');
} else {
  console.log('❌ Target string not found in server.ts!');
}
