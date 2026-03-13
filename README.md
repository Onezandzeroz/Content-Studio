# Content Studio

A powerful AI-powered content generation platform for creating structured web content. Build with Next.js 16, featuring a modern UI with dark mode support, multiple content formats, and seamless file attachment integration.

![Content Studio](https://z-cdn.chatglm.cn/z-ai/static/logo.svg)

## Features

### 🤖 AI-Powered Content Generation
- Generate high-quality HTML, JSON, and Markdown content using advanced AI
- Customizable prompts with optional titles and additional context
- Template-based generation for consistent content structure

### 📁 Multi-Format Support
- **HTML** - Semantic, accessible, SEO-friendly markup
- **JSON** - Structured data for web applications
- **Markdown** - Documentation, blog posts, and articles

### 📎 Attachment Integration
- Upload images, videos, and documents
- AI automatically incorporates attachments into generated content
- Visual linking between attachments and content files

### 🔗 External Link References
- Add external URLs to be referenced in generated content
- AI intelligently incorporates links into the appropriate context

### 🎨 Modern UI/UX
- Clean, responsive interface built with shadcn/ui
- Dark/Light mode toggle
- Dual preview modes: Code view and Layout preview
- Real-time content preview with syntax highlighting

### 💾 Content Management
- All content stored in `/content` folder for easy access
- Metadata tracking for content-attachment relationships
- File operations: view, copy, download, delete

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd content-studio

# Install dependencies
bun install

# Start development server
bun run dev
```

The application will be available at `http://localhost:3000`

### Environment Setup

Create a `.env` file in the root directory (if required for AI API configuration).

## Usage Guide

### Generate Content

1. Navigate to the **Generate** tab
2. Select your desired content type:
   - **Markdown (.md)** - Best for documentation and blog posts
   - **HTML (.html)** - Best for web pages and components
   - **JSON (.json)** - Best for structured data

3. Optionally select a **Template** for structured output
4. Enter a **Title** (optional but recommended)
5. Write a detailed **Prompt** describing what content you want
6. Add **Additional Context** if needed (optional)

### Working with Attachments

#### Quick Upload
- Click **Add Image** or **Add Video** to upload media files
- Files are automatically uploaded and ready for use

#### Select from Library
- Browse existing attachments in the attachment section
- Check the files you want to include
- AI will incorporate them naturally into your content

#### External Links
1. Enter a URL in the link input field
2. Optionally add a title for the link
3. Click the **+** button to add
4. Links will be referenced in the generated content

### Preview Modes

After content generation, switch between:

- **Code View** (< /> icon) - See the raw code/markup
- **Layout Preview** (grid icon) - See rendered content
  - HTML renders in an iframe
  - Markdown renders with full formatting
  - JSON shows a message (no visual preview available)

### Managing Content

Navigate to the **Content** tab to:
- View all generated files
- Preview content with dual view modes
- Copy content to clipboard
- Download files
- Delete unwanted content

### Managing Attachments

Navigate to the **Attachments** tab to:
- Upload new files (images, videos, PDFs, documents)
- Preview image thumbnails
- See which content files use each attachment
- View files in browser
- Delete attachments

### Using Templates

Navigate to the **Templates** tab to:
- View available templates for each content type
- Learn about template structure

Templates define the structure for generated content:

| Content Type | Templates Available |
|--------------|---------------------|
| HTML | `article`, `landing`, `card` |
| JSON | `article`, `product`, `list` |
| Markdown | `article`, `documentation`, `blog-post` |

## Project Structure

```
content-studio/
├── content/                    # Content storage directory
│   ├── html/                   # HTML content files
│   │   ├── *.html              # Generated HTML files
│   │   └── *.template.html     # HTML templates
│   ├── json/                   # JSON content files
│   │   ├── *.json              # Generated JSON files
│   │   └── *.template.json     # JSON templates
│   ├── markdown/               # Markdown content files
│   │   ├── *.md                # Generated Markdown files
│   │   └── *.template.md       # Markdown templates
│   ├── attachments/            # Uploaded media files
│   └── metadata.json           # Content-attachment relationships
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── content/        # Content CRUD API
│   │   │   ├── templates/      # Templates API
│   │   │   ├── upload/         # File upload API
│   │   │   └── attachments/    # Attachment serving API
│   │   └── page.tsx            # Main application
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── theme-toggle.tsx    # Dark mode toggle
│   └── lib/
│       └── content-generator.ts # Core content generation logic
├── public/                     # Static assets
└── package.json
```

## API Reference

### Content API

```http
GET /api/content?type={type}
```
List all content files, optionally filtered by type.

```http
POST /api/content
```
Generate new content.

**Body:**
```json
{
  "prompt": "string (required)",
  "contentType": "html|json|markdown (required)",
  "template": "string (optional)",
  "title": "string (optional)",
  "filename": "string (optional)",
  "additionalContext": "string (optional)",
  "attachments": ["string"] (optional),
  "links": [{ "id": "string", "url": "string", "title": "string" }] (optional)
}
```

```http
GET /api/content/{type}/{filename}
```
Retrieve specific content file.

```http
DELETE /api/content/{type}/{filename}
```
Delete a content file.

### Templates API

```http
GET /api/templates
```
List all available templates by content type.

### Upload API

```http
GET /api/upload
```
List all uploaded attachments.

```http
POST /api/upload
```
Upload a new file (multipart form-data).

```http
DELETE /api/upload?filename={filename}
```
Delete an attachment.

### Attachments API

```http
GET /api/attachments/{filename}
```
Serve an attachment file.

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style)
- **Icons**: Lucide React
- **AI Integration**: z-ai-web-dev-sdk
- **Markdown Rendering**: react-markdown
- **Theme**: next-themes (dark mode support)

## Content Storage

All generated content is stored in the `/content` directory at the project root:

- **Access from other apps**: The content folder can be accessed by other applications in the same root directory
- **File naming**: Auto-generated timestamps or custom filenames
- **Metadata**: `metadata.json` tracks attachment-content relationships

## Best Practices

### Writing Effective Prompts

1. **Be specific** - Describe exactly what content you need
2. **Include context** - Add relevant background information
3. **Use templates** - Leverage templates for consistent structure
4. **Attach media** - Include images/videos for richer content

### File Organization

1. **Use meaningful filenames** - Makes content easier to find
2. **Choose the right format**:
   - HTML for web pages and components
   - Markdown for documentation and blogs
   - JSON for data structures and APIs

### Working with Attachments

1. **Upload first** - Add attachments before generating content
2. **Select relevant media** - Only include attachments that enhance your content
3. **Check links** - Verify external URLs before adding them

## Troubleshooting

### Content Not Displaying
- Check that the content was saved successfully
- Verify the file exists in the appropriate content folder
- Try refreshing the page

### Images Not Loading
- Ensure attachments were uploaded correctly
- Check that the file path in content matches `/api/attachments/{filename}`
- Verify the file exists in `/content/attachments/`

### Generation Takes Too Long
- AI generation typically takes 15-40 seconds
- Complex content with multiple attachments may take longer
- Check server logs for any errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues and feature requests, please open an issue on the repository.

---

Built with ❤️ using Next.js and AI
