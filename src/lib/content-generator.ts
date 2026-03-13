import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs/promises';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const METADATA_FILE = path.join(CONTENT_DIR, 'metadata.json');

// Content types supported
export type ContentType = 'html' | 'json' | 'markdown';

export interface GenerateContentRequest {
  prompt: string;
  contentType: ContentType;
  template?: string;
  title?: string;
  additionalContext?: string;
  attachments?: string[];
  links?: { id: string; url: string; title: string }[];
}

export interface ContentItem {
  name: string;
  path: string;
  type: ContentType;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

export interface AttachmentItem {
  name: string;
  path: string;
  type: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  linkedContent?: string[];
}

export interface ContentMetadata {
  [contentFile: string]: {
    attachments: string[];
    links: { id: string; url: string; title: string }[];
    createdAt: string;
    type: ContentType;
  };
}

// Read metadata file
async function readMetadata(): Promise<ContentMetadata> {
  try {
    const data = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Write metadata file
async function writeMetadata(metadata: ContentMetadata): Promise<void> {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
}

// Get available templates for a content type
export async function getTemplates(contentType: ContentType): Promise<string[]> {
  const templateDir = path.join(CONTENT_DIR, contentType);
  const extensions: Record<ContentType, string> = {
    html: 'html',
    json: 'json',
    markdown: 'md'
  };
  const ext = extensions[contentType];
  
  try {
    const files = await fs.readdir(templateDir);
    return files
      .filter(f => f.endsWith(`.template.${ext}`))
      .map(f => f.replace(`.template.${ext}`, ''));
  } catch {
    return [];
  }
}

// Read template content
export async function readTemplate(contentType: ContentType, templateName: string): Promise<string> {
  const extensions: Record<ContentType, string> = {
    html: 'html',
    json: 'json',
    markdown: 'md'
  };
  
  const templatePath = path.join(CONTENT_DIR, contentType, `${templateName}.template.${extensions[contentType]}`);
  return fs.readFile(templatePath, 'utf-8');
}

// Generate content using AI
export async function generateContent(request: GenerateContentRequest): Promise<string> {
  const zai = await ZAI.create();
  
  const { prompt, contentType, template, title, additionalContext, attachments, links } = request;
  
  // Build system prompt based on content type
  const systemPrompts: Record<ContentType, string> = {
    html: `You are an expert web content creator. Generate clean, semantic HTML content that is:
- Well-structured with proper semantic tags (header, main, section, article, footer)
- Accessible with proper ARIA attributes where needed
- SEO-friendly with proper heading hierarchy
- Mobile-responsive in structure
- Free of inline styles (use classes for styling hooks)

IMPORTANT STRUCTURE RULES:
1. ALWAYS place images and videos RIGHT AFTER the title/header section
2. Follow the template structure EXACTLY - maintain all sections in order
3. Use proper <img> tags with src attributes pointing to the provided attachment paths
4. Use proper <video> tags with controls attribute for videos
5. All attachments must be placed in a dedicated media section immediately after the title

Output ONLY the HTML content, no explanations or markdown code blocks.`,
    
    json: `You are an expert at creating structured JSON data for web applications. Generate:
- Valid JSON that follows the specified schema/template
- Clean, normalized data structures
- Proper data types (strings, numbers, booleans, arrays, objects)
- Meaningful key names following camelCase convention
- Include image/video URLs in appropriate fields (like "imageUrl", "videoUrl", "media": [])

IMPORTANT: Place all media URLs in a "media" array field near the top of the object, right after the title.

Output ONLY valid JSON, no explanations or markdown code blocks.`,
    
    markdown: `You are an expert technical writer creating Markdown content. Generate:
- Well-formatted Markdown with proper heading hierarchy
- Clear, readable content with proper spacing
- Code blocks with language identifiers where applicable
- Images using ![alt text](path) syntax
- Videos using HTML <video> tags or markdown links
- Links using [text](url) syntax
- Lists (ordered and unordered) where appropriate

IMPORTANT STRUCTURE RULES:
1. ALWAYS place images and videos RIGHT AFTER the main title (# heading)
2. Follow the template structure EXACTLY - maintain all sections in order
3. All attachments must appear in a dedicated section immediately after the title
4. Use proper Markdown syntax for all elements

Output ONLY the Markdown content, no explanations.`
  };

  // Get template structure if specified
  let templateStructure = '';
  if (template) {
    try {
      templateStructure = await readTemplate(contentType, template);
    } catch {
      // Template not found, continue without it
    }
  }

  // Build the user prompt
  let userPrompt = `Create ${contentType.toUpperCase()} content for: ${prompt}`;
  
  if (title) {
    userPrompt += `\n\nTitle/Topic: ${title}`;
  }
  
  if (templateStructure) {
    userPrompt += `\n\nIMPORTANT: Follow this template structure EXACTLY. Maintain all sections and their order:\n${templateStructure}`;
  }
  
  if (additionalContext) {
    userPrompt += `\n\nAdditional context: ${additionalContext}`;
  }

  // Add attachments info with strict placement rules
  if (attachments && attachments.length > 0) {
    userPrompt += `\n\n*** CRITICAL: MEDIA PLACEMENT RULE ***`;
    userPrompt += `\nPlace ALL these media attachments IMMEDIATELY AFTER the title/header section:`;
    attachments.forEach(att => {
      const fileName = att.split('/').pop() || att;
      userPrompt += `\n- ${att} (filename: ${fileName})`;
      
      // Detect if image or video
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) {
        userPrompt += ` [IMAGE - use <img> or ![]() syntax]`;
      } else if (/\.(mp4|webm|mov|avi)$/i.test(fileName)) {
        userPrompt += ` [VIDEO - use <video controls> tag]`;
      }
    });
    userPrompt += `\n\nDo NOT scatter media throughout the content. ALL media goes in ONE section right after the title.`;
  }

  // Add links info
  if (links && links.length > 0) {
    userPrompt += `\n\nReference these external links in the content:`;
    links.forEach(link => {
      userPrompt += `\n- ${link.title}: ${link.url}`;
    });
  }

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompts[contentType] },
      { role: 'user', content: userPrompt }
    ],
    thinking: { type: 'disabled' }
  });

  return completion.choices[0]?.message?.content || '';
}

// Save generated content and link attachments
export async function saveContent(
  content: string,
  contentType: ContentType,
  filename: string,
  attachments?: string[],
  links?: { id: string; url: string; title: string }[]
): Promise<string> {
  const extensions: Record<ContentType, string> = {
    html: 'html',
    json: 'json',
    markdown: 'md'
  };
  
  const contentDir = path.join(CONTENT_DIR, contentType);
  await fs.mkdir(contentDir, { recursive: true });
  
  const ext = extensions[contentType];
  const finalFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
  const filePath = path.join(contentDir, finalFilename);
  
  await fs.writeFile(filePath, content, 'utf-8');
  
  // Save metadata linking attachments to this content
  if ((attachments && attachments.length > 0) || (links && links.length > 0)) {
    const metadata = await readMetadata();
    metadata[`${contentType}/${finalFilename}`] = {
      attachments: attachments || [],
      links: links || [],
      createdAt: new Date().toISOString(),
      type: contentType
    };
    await writeMetadata(metadata);
  }
  
  return filePath;
}

// List all content files
export async function listContent(contentType?: ContentType): Promise<ContentItem[]> {
  const types: ContentType[] = contentType ? [contentType] : ['html', 'json', 'markdown'];
  const items: ContentItem[] = [];

  for (const type of types) {
    const typeDir = path.join(CONTENT_DIR, type);
    try {
      const files = await fs.readdir(typeDir);
      
      for (const file of files) {
        // Skip template files
        if (file.includes('.template.')) continue;
        
        const filePath = path.join(typeDir, file);
        const stats = await fs.stat(filePath);
        
        items.push({
          name: file,
          path: `/${type}/${file}`,
          type,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }
    } catch {
      // Directory doesn't exist or is empty
    }
  }

  return items.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

// Read content file
export async function readContent(contentType: ContentType, filename: string): Promise<string> {
  const filePath = path.join(CONTENT_DIR, contentType, filename);
  return fs.readFile(filePath, 'utf-8');
}

// Delete content file
export async function deleteContent(contentType: ContentType, filename: string): Promise<void> {
  const filePath = path.join(CONTENT_DIR, contentType, filename);
  await fs.unlink(filePath);
  
  // Update metadata
  const metadata = await readMetadata();
  delete metadata[`${contentType}/${filename}`];
  await writeMetadata(metadata);
}

// Save attachment
export async function saveAttachment(file: File): Promise<{ filename: string; path: string; size: number }> {
  const attachmentsDir = path.join(CONTENT_DIR, 'attachments');
  await fs.mkdir(attachmentsDir, { recursive: true });
  
  const timestamp = Date.now();
  const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}_${originalName}`;
  const filePath = path.join(attachmentsDir, filename);
  
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  
  return {
    filename,
    path: `/api/attachments/${filename}`, // Use /api prefix for correct routing
    size: buffer.length
  };
}

// List attachments with linked content info
export async function listAttachments(): Promise<AttachmentItem[]> {
  const attachmentsDir = path.join(CONTENT_DIR, 'attachments');
  const items: AttachmentItem[] = [];
  const metadata = await readMetadata();
  
  // Build reverse lookup: attachment -> content files
  const attachmentLinks: Record<string, string[]> = {};
  for (const [contentFile, data] of Object.entries(metadata)) {
    if (data.attachments) {
      for (const att of data.attachments) {
        const attName = att.split('/').pop() || att;
        if (!attachmentLinks[attName]) {
          attachmentLinks[attName] = [];
        }
        attachmentLinks[attName].push(contentFile);
      }
    }
  }
  
  try {
    const files = await fs.readdir(attachmentsDir);
    
    for (const file of files) {
      const filePath = path.join(attachmentsDir, file);
      const stats = await fs.stat(filePath);
      
      // Determine type based on extension
      let type = 'file';
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) type = 'image';
      else if (/\.(mp4|webm|mov|avi)$/i.test(file)) type = 'video';
      else if (/\.pdf$/i.test(file)) type = 'pdf';
      
      items.push({
        name: file,
        path: `/api/attachments/${file}`, // Use /api prefix for correct routing
        type,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        linkedContent: attachmentLinks[file] || []
      });
    }
  } catch {
    // Directory doesn't exist
  }
  
  return items.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

// Delete attachment and update metadata
export async function deleteAttachment(filename: string): Promise<void> {
  const filePath = path.join(CONTENT_DIR, 'attachments', filename);
  await fs.unlink(filePath);
  
  // Remove from metadata
  const metadata = await readMetadata();
  for (const [, data] of Object.entries(metadata)) {
    if (data.attachments) {
      data.attachments = data.attachments.filter(
        att => !att.endsWith(filename)
      );
    }
  }
  await writeMetadata(metadata);
}
