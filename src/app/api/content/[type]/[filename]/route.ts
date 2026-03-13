import { NextRequest, NextResponse } from 'next/server';
import { 
  readContent, 
  deleteContent, 
  type ContentType 
} from '@/lib/content-generator';

// GET - Read specific content file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; filename: string }> }
) {
  try {
    const { type, filename } = await params;
    const contentType = type as ContentType;
    
    if (!['html', 'json', 'markdown'].includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      );
    }
    
    const content = await readContent(contentType, filename);
    
    // Return appropriate content type header
    const contentTypeHeader = {
      html: 'text/html',
      json: 'application/json',
      markdown: 'text/markdown'
    }[contentType];
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentTypeHeader || 'text/plain'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Content not found' },
      { status: 404 }
    );
  }
}

// DELETE - Delete specific content file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; filename: string }> }
) {
  try {
    const { type, filename } = await params;
    const contentType = type as ContentType;
    
    if (!['html', 'json', 'markdown'].includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      );
    }
    
    await deleteContent(contentType, filename);
    
    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
