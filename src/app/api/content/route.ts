import { NextRequest, NextResponse } from 'next/server';
import { 
  listContent, 
  generateContent, 
  saveContent, 
  type ContentType 
} from '@/lib/content-generator';

// GET - List all content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ContentType | null;
    
    const content = await listContent(type || undefined);
    
    return NextResponse.json({
      success: true,
      data: content
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to list content' },
      { status: 500 }
    );
  }
}

// POST - Generate new content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      contentType, 
      template, 
      title, 
      filename, 
      additionalContext,
      attachments,
      links
    } = body;
    
    if (!prompt || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: prompt, contentType' },
        { status: 400 }
      );
    }
    
    // Validate content type
    const validTypes: ContentType[] = ['html', 'json', 'markdown'];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type. Must be: html, json, or markdown' },
        { status: 400 }
      );
    }
    
    // Generate content using AI
    const generatedContent = await generateContent({
      prompt,
      contentType,
      template,
      title,
      additionalContext,
      attachments,
      links
    });
    
    // Generate filename if not provided
    const timestamp = Date.now();
    const finalFilename = filename || `content_${timestamp}`;
    
    // Save the content with attachment links
    const savedPath = await saveContent(
      generatedContent, 
      contentType, 
      finalFilename,
      attachments,
      links
    );
    
    // Build the extension
    const extensions: Record<ContentType, string> = {
      html: 'html',
      json: 'json',
      markdown: 'md'
    };
    
    return NextResponse.json({
      success: true,
      data: {
        content: generatedContent,
        filename: `${finalFilename}.${extensions[contentType]}`,
        path: savedPath,
        type: contentType,
        attachmentCount: attachments?.length || 0,
        linkCount: links?.length || 0
      }
    });
  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
